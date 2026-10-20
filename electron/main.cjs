const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

const { detectJava, executeJava } = require('./javaRunner.cjs');
const { detectCpp, executeCpp } = require('./cppRunner.cjs');
const { detectAllRuntimes, verifyRuntimeSnippet } = require('./runtimeManager.cjs');
const { importLocalAudioFile, listManagedAudioFiles, deleteManagedAudioFile } = require('./audioManager.cjs');
const {
  getMaskedServicesStatus,
  saveServiceCredentials,
  deleteServiceCredentials,
  testServiceConnection,
  sendLiveNotification,
} = require('./automationManager.cjs');
const {
  startWebSocketServer,
  broadcastEvent,
  getConnectionInfo,
  stopWebSocketServer,
} = require('./websocketServer.cjs');
const {
  checkForUpdates,
  downloadUpdate,
  launchInstallerAndRestart,
} = require('./updateManager.cjs');

// Lifecycle stage tracking for diagnostics
let appLifecycleStage = 'initialization';

function setStage(stage) {
  appLifecycleStage = stage;
}

function sanitizeData(data) {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  try {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'cred'];
    const copy = Array.isArray(data) ? [...data] : { ...data };
    for (const k of Object.keys(copy)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        copy[k] = '[REDACTED]';
      } else if (typeof copy[k] === 'object' && copy[k] !== null) {
        copy[k] = sanitizeData(copy[k]);
      }
    }
    return copy;
  } catch {
    return '[UNSERIALIZABLE]';
  }
}

function logDiagnostic(level, stage, message, err = null, context = null) {
  try {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      stage,
      message: String(message || ''),
      errorName: err && err.name ? err.name : null,
      errorMessage: err && err.message ? err.message : null,
      stack: err && err.stack ? err.stack : null,
      context: context ? sanitizeData(context) : null,
    };
    const logLine = `[${timestamp}] [MAIN:${level.toUpperCase()}] [${stage}] ${entry.message}${
      entry.errorMessage ? ` | ${entry.errorMessage}` : ''
    }${entry.stack ? `\n${entry.stack}` : ''}`;

    if (level === 'error') {
      console.error(logLine);
    } else if (level === 'warn') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  } catch {
    // Diagnostic logging must never throw
  }
}

process.on('uncaughtException', (err) => {
  logDiagnostic('error', appLifecycleStage, 'Uncaught Exception in Main Process', err);
  try {
    dialog.showErrorBox(
      'Ap Workspace - Unexpected Error',
      `An unexpected error occurred in the main process (${appLifecycleStage}):\n\n${err && err.message ? err.message : err}\n\nStack:\n${err && err.stack ? err.stack : 'No stack trace available'}`
    );
  } catch {}
  try {
    stopWebSocketServer();
  } catch {}
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logDiagnostic('error', appLifecycleStage, 'Unhandled Promise Rejection in Main Process', err);
});

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
      backgroundThrottling: false, // Ensures study timer and audio playback never pause when window is minimized or inactive
    },
  });

  mainWindow.once('ready-to-show', () => {
    setStage('ready');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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

function getAppVersionSafe() {
  try {
    const v = app.getVersion();
    if (v && v !== '0.0.0') return v;
  } catch {}
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) return pkg.version;
    }
  } catch {}
  return '1.2.0';
}

// App & Python info
ipcMain.handle('app:info', () => {
  return {
    name: 'Ap Workspace',
    version: getAppVersionSafe(),
    platform: process.platform,
    arch: process.arch,
    appData: app.getPath('userData'),
    isPackaged: app.isPackaged,
    runtime: 'Electron',
  };
});

function executePythonInternal(code, testCases, options = {}) {
  const startTime = Date.now();
  const pyExe = (options && options.customPath) || findPythonExecutable();
  const workerScript = getResourcePath('workers', 'python', 'worker.py');

  if (!fs.existsSync(workerScript)) {
    return Promise.resolve({
      status: 'Runtime Error',
      runtime_ms: 0,
      memory_kb: 0,
      stdout: '',
      stderr: `Worker script not found at ${workerScript}`,
      test_cases_passed: 0,
      total_test_cases: testCases ? testCases.length : 0,
      test_details: [],
    });
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
}

// Runtime info handlers
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

ipcMain.handle('java:info', async (_event, { customPath } = {}) => {
  return detectJava(customPath);
});

ipcMain.handle('cpp:info', async (_event, { customPath } = {}) => {
  return detectCpp(customPath);
});

ipcMain.handle('runtimes:info', async (_event, { customPaths } = {}) => {
  return detectAllRuntimes(customPaths, findPythonExecutable);
});

ipcMain.handle('runtime:verify', async (_event, { language, options } = {}) => {
  return verifyRuntimeSnippet(language, options);
});

// Multi-language execution handlers
ipcMain.handle('python:execute', async (_event, { code, testCases, options } = {}) => {
  return executePythonInternal(code, testCases, options);
});

ipcMain.handle('java:execute', async (_event, { code, testCases, options } = {}) => {
  return executeJava(code, testCases, options);
});

ipcMain.handle('cpp:execute', async (_event, { code, testCases, options } = {}) => {
  return executeCpp(code, testCases, options);
});

ipcMain.handle('code:execute', async (_event, { language, code, testCases, options } = {}) => {
  const lang = (language || 'python').toLowerCase();
  if (lang === 'java') {
    return executeJava(code, testCases, options);
  }
  if (lang === 'cpp' || lang === 'c++') {
    return executeCpp(code, testCases, options);
  }
  return executePythonInternal(code, testCases, options);
});

// Music Library IPC handlers
ipcMain.handle('music:open-file-dialog', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, {
    title: 'Select Focus Music Audio Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
});

ipcMain.handle('music:import-file', async (_event, { sourcePath, category } = {}) => {
  try {
    return importLocalAudioFile(sourcePath, category);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('music:list-managed', async () => {
  try {
    return listManagedAudioFiles();
  } catch (err) {
    return [];
  }
});

ipcMain.handle('music:delete-managed', async (_event, { filename } = {}) => {
  try {
    return deleteManagedAudioFile(filename);
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// PostgreSQL Lab handlers
ipcMain.handle('postgres:test', async (_event, { config } = {}) => {
  return runPostgresBridge('test', config);
});

ipcMain.handle('postgres:tables', async (_event, { config } = {}) => {
  return runPostgresBridge('tables', config);
});

ipcMain.handle('postgres:query', async (_event, { config, query } = {}) => {
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
// Reports & Automation IPC Handlers
// -------------------------------------------------------------
ipcMain.handle('automation:get-services', async () => {
  try {
    return getMaskedServicesStatus();
  } catch (err) {
    return [];
  }
});

ipcMain.handle('automation:save-credentials', async (_event, { serviceId, config } = {}) => {
  try {
    return saveServiceCredentials(serviceId, config);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('automation:delete-credentials', async (_event, { serviceId } = {}) => {
  try {
    return deleteServiceCredentials(serviceId);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('automation:test-connection', async (_event, { serviceId, config } = {}) => {
  try {
    return await testServiceConnection(serviceId, config);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle('automation:send-notification', async (_event, { serviceId, payload } = {}) => {
  try {
    return await sendLiveNotification(serviceId, payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
});

// -------------------------------------------------------------
// Real-Time Analytics & WebSocket IPC Handlers
// -------------------------------------------------------------
ipcMain.handle('analytics:get-connection-info', async () => {
  try {
    return getConnectionInfo();
  } catch (err) {
    return { wsPort: 52140, wsUrl: 'ws://127.0.0.1:52140', authToken: '', clientCount: 0 };
  }
});

ipcMain.handle('analytics:publish-event', async (_event, { type, payload } = {}) => {
  try {
    const timestamp = new Date().toISOString();
    const eventMessage = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp,
    };

    // 1. Send to local WebSocket clients
    broadcastEvent(type, payload);

    // 2. Send to renderer via Electron IPC
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('analytics:event', eventMessage);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// -------------------------------------------------------------
// Software Updates (GitHub Releases + Inno Setup)
// -------------------------------------------------------------
ipcMain.handle('updater:get-version', async () => {
  return getAppVersionSafe();
});

ipcMain.handle('updater:check', async () => {
  try {
    const currentVersion = getAppVersionSafe();
    return await checkForUpdates(currentVersion);
  } catch (err) {
    return {
      success: false,
      isUpdateAvailable: false,
      error: err.message,
    };
  }
});

ipcMain.handle('updater:download', async (_event, { assetUrl, sha256Url, expectedHash, fileName, expectedSize } = {}) => {
  try {
    return await downloadUpdate(
      assetUrl,
      { sha256Url, expectedHash, fileName, expectedSize },
      (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:download-progress', progress);
        }
      }
    );
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
});

ipcMain.handle('updater:install', async (_event, { installerPath, silent } = {}) => {
  try {
    return launchInstallerAndRestart(installerPath, { silent });
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
});
// -------------------------------------------------------------
// Backup & Restore and Dataset Import IPC Handlers
// -------------------------------------------------------------

ipcMain.handle('backup:open-file-dialog', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, {
    title: 'Select Ap Workspace Backup File',
    properties: ['openFile'],
    filters: [
      { name: 'Ap Backup Files (*.apdb, *.json)', extensions: ['apdb', 'json', 'sqlite', 'db'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });
});

ipcMain.handle('backup:save-file-dialog', async (_event, { defaultName } = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true, filePath: '' };
  return dialog.showSaveDialog(mainWindow, {
    title: 'Save Ap Workspace Backup Snapshot',
    defaultPath: defaultName || `ap_backup_${new Date().toISOString().slice(0, 10)}.apdb`,
    filters: [
      { name: 'Ap Backup Files (*.apdb)', extensions: ['apdb'] },
      { name: 'JSON Backup Files (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  });
});

ipcMain.handle('backup:read-file', async (_event, { filePath } = {}) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist or path is invalid.' };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    return { success: true, content, size: stat.size, fileName: path.basename(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup:write-file', async (_event, { filePath, content } = {}) => {
  try {
    if (!filePath) {
      return { success: false, error: 'Destination path cannot be empty.' };
    }
    fs.writeFileSync(filePath, content, 'utf8');
    const stat = fs.statSync(filePath);
    return { success: true, filePath, size: stat.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('import:open-file-dialog', async (_event, { fileType } = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true, filePaths: [] };
  const filters = fileType === 'json'
    ? [{ name: 'JSON Datasets (*.json)', extensions: ['json'] }]
    : fileType === 'csv'
    ? [{ name: 'CSV Datasets (*.csv)', extensions: ['csv', 'txt'] }]
    : [
        { name: 'Datasets (*.json, *.csv)', extensions: ['json', 'csv', 'txt'] },
        { name: 'All Files (*.*)', extensions: ['*'] }
      ];
  return dialog.showOpenDialog(mainWindow, {
    title: 'Select Dataset File to Import',
    properties: ['openFile'],
    filters
  });
});

ipcMain.handle('import:read-file', async (_event, { filePath } = {}) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist or path is invalid.' };
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    return { success: true, content, size: stat.size, fileName: path.basename(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// -------------------------------------------------------------
// App Lifecycle
// -------------------------------------------------------------

app.whenReady().then(() => {
  setStage('window-creation');

  // Start local authenticated WebSocket Server for real-time progress broadcast
  try {
    startWebSocketServer();
  } catch (err) {
    console.error('Failed to start WebSocket server:', err);
  }

  // Set Permissive Desktop CSP for local assets, fonts, icons, images, and workers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: http://localhost:* ws://localhost:*; worker-src 'self' blob: data:; img-src 'self' data: blob: file: https: http:; font-src 'self' data: https: file:; style-src 'self' 'unsafe-inline' https: file:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; connect-src 'self' data: blob: https: http: ws: wss: file:;",
        ],
      },
    });
  });

  createWindow();

  // Non-blocking background check for updates after launch
  setTimeout(async () => {
    try {
      const currentVer = getAppVersionSafe();
      const updateRes = await checkForUpdates(currentVer);
      if (updateRes && updateRes.isUpdateAvailable && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:update-available', updateRes);
      }
    } catch {}
  }, 5000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  setStage('shutdown');
  stopWebSocketServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
