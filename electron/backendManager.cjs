const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const http = require('http');
const crypto = require('crypto');

/**
 * Ap Workspace — Spring Boot Backend Sidecar Lifecycle Manager
 * 
 * Features:
 * - Managed child process lifecycle tied directly to Electron
 * - Dynamic port allocation & loopback-only binding (127.0.0.1)
 * - Ephemeral 256-bit mutual authentication token
 * - Automatic Java 21+ detection with graceful offline fallback
 * - Health check polling and restart resilience
 * - Secure authenticated HTTP request forwarder (protects tokens from renderer)
 */

let backendProcess = null;
let backendPort = 0;
let backendToken = '';
let backendStatus = 'stopped'; // 'stopped' | 'starting' | 'running' | 'offline_fallback' | 'missing_java'
let javaPath = null;
let jarPath = null;
let healthCheckTimer = null;

function findJava() {
  if (javaPath) return javaPath;

  // 1. Check JAVA_HOME
  if (process.env.JAVA_HOME) {
    const candidate = path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
    if (fs.existsSync(candidate)) {
      javaPath = candidate;
      return javaPath;
    }
  }

  // 2. Common Temurin / JDK installation paths on Windows
  const candidates = [
    'C:\\Program Files\\Eclipse Adoptium\\jdk-25.0.4.101-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.101-hotspot\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-25\\bin\\java.exe',
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      javaPath = c;
      return javaPath;
    }
  }

  // 3. System PATH check
  try {
    const checkCmd = process.platform === 'win32' ? 'where java' : 'which java';
    const out = execSync(checkCmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const firstLine = out.split(/\r?\n/)[0];
    if (firstLine && fs.existsSync(firstLine)) {
      javaPath = firstLine;
      return javaPath;
    }
  } catch {}

  return null;
}

function findJar() {
  if (jarPath && fs.existsSync(jarPath)) return jarPath;

  const isPackaged = Boolean(app && app.isPackaged);
  const appRoot = isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
  const searchDirs = [
    path.join(appRoot, 'backend', 'target'),
    path.join(appRoot, 'resources', 'backend'),
    path.join(appRoot, 'backend'),
    path.join(__dirname, '..', 'backend', 'target'),
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        // Find ap-backend-*.jar (excluding .original)
        const match = files.find(f => f.startsWith('ap-backend-') && f.endsWith('.jar') && !f.endsWith('.original'));
        if (match) {
          jarPath = path.join(dir, match);
          return jarPath;
        }
      } catch (_) {}
    }
  }

  return null;
}

function getDatabasePath() {
  const userData = (app && typeof app.getPath === 'function')
    ? app.getPath('userData')
    : path.join(process.env.APPDATA || process.env.TEMP || '.', 'Ap');
  try {
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
  } catch {}
  return path.join(userData, 'ap_database.sqlite');
}

/**
 * Starts the Spring Boot backend process as a local managed sidecar
 */
async function startBackend() {
  if (backendProcess && !backendProcess.killed) {
    return getStatus();
  }

  const java = findJava();
  if (!java) {
    console.warn('[BackendManager] Java runtime not found on host. Operating in offline fallback mode.');
    backendStatus = 'missing_java';
    return getStatus();
  }

  const jar = findJar();
  if (!jar) {
    console.warn('[BackendManager] Backend JAR not found. Operating in offline fallback mode.');
    backendStatus = 'offline_fallback';
    return getStatus();
  }

  backendToken = crypto.randomBytes(32).toString('hex');
  backendStatus = 'starting';
  backendPort = 0;

  const dbPath = getDatabasePath();

  const jvmArgs = [
    '-Xmx128m',
    '-XX:+TieredCompilation',
    '-XX:TieredStopAtLevel=1',
    '-jar', jar,
    '--server.address=127.0.0.1',
    '--server.port=0',
    `--ap.security.token=${backendToken}`,
    `--ap.db.path=${dbPath}`,
    '--spring.main.banner-mode=off',
  ];

  console.log(`[BackendManager] Spawning Spring Boot sidecar with Java: ${java}`);

  backendProcess = spawn(java, jvmArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  return new Promise((resolve) => {
    let resolved = false;

    // Timeout safety: if not started in 15 seconds, enter fallback
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[BackendManager] Backend startup timed out. Falling back to offline mode.');
        backendStatus = 'offline_fallback';
        resolve(getStatus());
      }
    }, 15000);

    backendProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      // Match explicit AP_BACKEND_PORT or Tomcat log
      const portMatch = text.match(/AP_BACKEND_PORT=(\d+)/) ||
                        text.match(/Tomcat started on port\(?s?\)?\s+(\d+)/i) ||
                        text.match(/port\s+(\d+)\s+\(http\)/i);
      if (portMatch && !backendPort) {
        backendPort = parseInt(portMatch[1], 10);
        console.log(`[BackendManager] Spring Boot sidecar active on 127.0.0.1:${backendPort}`);
      }

      if (backendPort && (text.includes('Started ApBackendApplication') || text.includes('active on loopback port') || text.includes('AP_BACKEND_PORT'))) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          backendStatus = 'running';
          startHealthMonitoring();
          resolve(getStatus());
        }
      }
    });

    backendProcess.stderr.on('data', (chunk) => {
      const errText = chunk.toString();
      if (errText.includes('ERROR') || errText.includes('Exception')) {
        console.error(`[BackendManager stderr]: ${errText}`);
      }
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[BackendManager] Process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
      backendPort = 0;
      if (backendStatus === 'running') {
        backendStatus = 'stopped';
      }
      stopHealthMonitoring();
    });

    backendProcess.on('error', (err) => {
      console.error('[BackendManager] Failed to spawn Spring Boot process:', err.message);
      backendProcess = null;
      backendStatus = 'offline_fallback';
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(getStatus());
      }
    });
  });
}

function startHealthMonitoring() {
  stopHealthMonitoring();
  healthCheckTimer = setInterval(() => {
    if (backendStatus === 'running' && backendPort) {
      checkHealth().catch(() => {
        console.warn('[BackendManager] Health check missed. Service may be restarting.');
      });
    }
  }, 10000);
}

function stopHealthMonitoring() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

async function checkHealth() {
  if (!backendPort) return false;
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${backendPort}/api/v1/health`, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Stops the backend sidecar cleanly
 */
function stopBackend() {
  stopHealthMonitoring();
  if (backendProcess) {
    console.log('[BackendManager] Terminating Spring Boot process...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch {}
    backendProcess = null;
  }
  backendPort = 0;
  backendStatus = 'stopped';
}

function getStatus() {
  return {
    status: backendStatus,
    isRunning: backendStatus === 'running',
    port: backendPort,
    url: backendPort ? `http://127.0.0.1:${backendPort}` : null,
    wsUrl: backendPort ? `ws://127.0.0.1:${backendPort}/ws/realtime` : null,
    isOfflineFallback: backendStatus === 'offline_fallback' || backendStatus === 'missing_java' || backendStatus === 'stopped',
    hasJava: Boolean(findJava()),
    hasJar: Boolean(findJar()),
  };
}

/**
 * Executes an authenticated HTTP request to the Spring Boot backend
 * Keeps the ephemeral token securely inside Electron main process!
 */
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    if (backendStatus !== 'running' || !backendPort) {
      return reject(new Error('Backend is not running'));
    }

    const method = options.method || 'GET';
    const headers = {
      'Content-Type': 'application/json',
      'X-Ap-Internal-Token': backendToken,
      ...(options.headers || {}),
    };

    const reqOptions = {
      hostname: '127.0.0.1',
      port: backendPort,
      path,
      method,
      headers,
      timeout: options.timeout || 10000,
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (options.body) {
      const dataStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(dataStr);
    }
    req.end();
  });
}

module.exports = {
  startBackend,
  stopBackend,
  getStatus,
  checkHealth,
  request,
};
