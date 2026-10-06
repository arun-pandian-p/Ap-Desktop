const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Prevent Chromium disk cache file locking conflicts on Windows
try {
  app.commandLine.appendSwitch('disable-gpu-cache');
  app.commandLine.appendSwitch('no-sandbox');
  if (isDev) {
    app.setPath('userData', path.join(app.getPath('appData'), 'Ap_Dev_Workspace'));
  }
} catch (e) {}

function getResourcePath(...segments) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }
  return path.join(__dirname, '..', ...segments);
}

function findPythonExecutable() {
  // 1. Check bundled python in packaged resources
  const bundledPy = getResourcePath('python', 'python.exe');
  if (fs.existsSync(bundledPy)) {
    return bundledPy;
  }

  // 2. Check standard system python
  try {
    const whereOut = execSync('where python', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const firstPath = whereOut.split('\r\n')[0].split('\n')[0].trim();
    if (firstPath && fs.existsSync(firstPath)) {
      return firstPath;
    }
  } catch {
    // ignore
  }

  // 3. Fallback to 'python' in PATH
  return 'python';
}

function getAppIcon() {
  const possiblePaths = [
    getResourcePath('public', 'favicon.ico'),
    getResourcePath('public', 'icon.ico'),
    getResourcePath('public', 'assets', 'icon.png'),
    path.join(__dirname, '..', 'public', 'favicon.ico'),
    path.join(__dirname, '..', 'public', 'assets', 'icon.png'),
    path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.ico'),
    path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.png'),
    path.join(__dirname, '..', 'build', 'icon.ico'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  const iconPath = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1586,
    height: 992,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#F8FAFC',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Safe external link handling
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevUrl = url.startsWith('http://localhost:5173') || url.startsWith('http://127.0.0.1:5173');
    const isFileUrl = url.startsWith('file://');
    if (!isDevUrl && !isFileUrl) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    }
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (isDev) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:5173');
        }
      }, 800);
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev && !process.env.ELECTRON_PROD_TEST) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// -------------------------------------------------------------
// IPC Handlers
// -------------------------------------------------------------

// Window controls
ipcMain.handle('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.handle('window:is-maximized', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isMaximized();
  }
  return false;
});

ipcMain.handle('window:set-always-on-top', (_event, flag) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(Boolean(flag));
    return mainWindow.isAlwaysOnTop();
  }
  return false;
});

ipcMain.handle('window:is-always-on-top', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow.isAlwaysOnTop();
  }
  return false;
});

// App & Python info
ipcMain.handle('app:info', () => {
  return {
    name: 'Ap Workspace',
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    appData: app.getPath('userData'),
    isPackaged: app.isPackaged,
    runtime: 'Electron',
  };
});

ipcMain.handle('python:info', async () => {
  const pyExe = findPythonExecutable();
  try {
    const versionOut = execSync(`"${pyExe}" -c "import sys, platform; print(platform.python_version()); print(sys.executable)"`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
    const lines = versionOut.split('\r\n')[0].split('\n');
    return {
      installed: true,
      version: `Python ${lines[0]}`,
      executable: lines[1] || pyExe,
      status: 'Ready',
    };
  } catch (err) {
    return {
      installed: false,
      version: 'Not Detected',
      executable: '',
      status: 'Unavailable',
    };
  }
});

// Python execution engine
ipcMain.handle('python:execute', async (_event, { code, testCases }) => {
  const startTime = Date.now();
  const pyExe = findPythonExecutable();
  const workerScript = getResourcePath('workers', 'python', 'worker.py');

  if (!fs.existsSync(workerScript)) {
    return {
      status: 'Runtime Error',
      runtime_ms: 0,
      memory_kb: 0,
      stdout: '',
      stderr: `Worker script not found at ${workerScript}`,
      test_cases_passed: 0,
      total_test_cases: testCases ? testCases.length : 0,
      test_details: [],
    };
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isFinished = false;

    const child = spawn(pyExe, ['-I', '-S', '-B', workerScript], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timeoutTimer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
          } else {
            child.kill('SIGKILL');
          }
        } catch {}
        resolve({
          status: 'Time Limit Exceeded',
          runtime_ms: Date.now() - startTime,
          memory_kb: 0,
          stdout,
          stderr: 'Execution timed out (10000ms limit exceeded).',
          test_cases_passed: 0,
          total_test_cases: testCases ? testCases.length : 1,
          test_details: (testCases || []).map((tc) => ({
            input: tc.input || '',
            expected: tc.expected || '',
            actual: 'Time Limit Exceeded',
            passed: false,
          })),
        });
      }
    }, 10000);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (stdout.length > 5 * 1024 * 1024) {
        child.kill();
      }
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', () => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutTimer);

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch {
        resolve({
          status: stderr ? 'Runtime Error' : 'Accepted',
          runtime_ms: Date.now() - startTime,
          memory_kb: 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          test_cases_passed: 0,
          total_test_cases: testCases ? testCases.length : 0,
          test_details: [],
        });
      }
    });

    child.on('error', (err) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutTimer);
      resolve({
        status: 'Compilation Error',
        runtime_ms: Date.now() - startTime,
        memory_kb: 0,
        stdout: '',
        stderr: `Failed to spawn Python process: ${err.message}`,
        test_cases_passed: 0,
        total_test_cases: testCases ? testCases.length : 0,
        test_details: [],
      });
    });

    try {
      const payload = JSON.stringify({ code, test_cases: testCases || [] });
      child.stdin.write(payload);
      child.stdin.end();
    } catch (e) {
      // stdin error
    }
  });
});

// PostgreSQL Lab handlers
ipcMain.handle('postgres:test', async (_event, { config }) => {
  return runPostgresBridge('test', config);
});

ipcMain.handle('postgres:tables', async (_event, { config }) => {
  return runPostgresBridge('tables', config);
});

ipcMain.handle('postgres:query', async (_event, { config, query }) => {
  return runPostgresBridge('query', { config, query });
});

function runPostgresBridge(action, payload) {
  const pyExe = findPythonExecutable();
  const bridgeScript = getResourcePath('workers', 'postgres', 'bridge.py');

  if (!fs.existsSync(bridgeScript)) {
    return Promise.resolve({
      success: false,
      error: `Postgres bridge script not found at ${bridgeScript}`,
    });
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isFinished = false;

    const child = spawn(pyExe, [bridgeScript, action], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timeoutTimer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
          } else {
            child.kill('SIGKILL');
          }
        } catch {}
        resolve({ success: false, error: 'Connection/Query timed out (10s limit).' });
      }
    }, 10000);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', () => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutTimer);

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch {
        resolve({ success: false, error: stderr.trim() || 'Postgres bridge execution failed.' });
      }
    });

    child.on('error', (err) => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutTimer);
      resolve({ success: false, error: `Failed to spawn Postgres bridge: ${err.message}` });
    });

    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch {}
  });
}

// -------------------------------------------------------------
// App Lifecycle
// -------------------------------------------------------------

app.whenReady().then(() => {
  // Set Permissive Desktop CSP for local assets, fonts, icons, images, and workers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: http://localhost:* ws://localhost:*; img-src 'self' data: blob: file: https: http:; font-src 'self' data: https: file:; style-src 'self' 'unsafe-inline' https: file:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; connect-src 'self' data: blob: https: http: ws: wss: file:;",
        ],
      },
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
