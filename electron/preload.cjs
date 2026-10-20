const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, typed Electron API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:set-always-on-top', flag),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:is-always-on-top'),

  // App & System info
  appInfo: () => ipcRenderer.invoke('app:info'),
  pythonInfo: () => ipcRenderer.invoke('python:info'),
  javaInfo: (customPath) => ipcRenderer.invoke('java:info', { customPath }),
  cppInfo: (customPath) => ipcRenderer.invoke('cpp:info', { customPath }),
  runtimesInfo: (customPaths) => ipcRenderer.invoke('runtimes:info', { customPaths }),
  runtimeVerify: (language, options) => ipcRenderer.invoke('runtime:verify', { language, options }),

  // Multi-Language Code & Query Execution Engines
  executePython: (code, testCases) => ipcRenderer.invoke('python:execute', { code, testCases }),
  executeJava: (code, testCases, options) => ipcRenderer.invoke('java:execute', { code, testCases, options }),
  executeCpp: (code, testCases, options) => ipcRenderer.invoke('cpp:execute', { code, testCases, options }),
  executeCode: (language, code, testCases, options) => ipcRenderer.invoke('code:execute', { language, code, testCases, options }),

  // PostgreSQL Lab
  postgresTest: (config) => ipcRenderer.invoke('postgres:test', { config }),
  postgresTables: (config) => ipcRenderer.invoke('postgres:tables', { config }),
  postgresQuery: (config, query) => ipcRenderer.invoke('postgres:query', { config, query }),

  // Music & Focus Audio Library
  importAudioFile: (sourcePath, category) => ipcRenderer.invoke('music:import-file', { sourcePath, category }),
  listManagedAudio: () => ipcRenderer.invoke('music:list-managed'),
  deleteManagedAudio: (filename) => ipcRenderer.invoke('music:delete-managed', { filename }),
  openAudioFileDialog: () => ipcRenderer.invoke('music:open-file-dialog'),

  // Reports & Automation Integrations
  getAutomationServices: () => ipcRenderer.invoke('automation:get-services'),
  saveAutomationCredentials: (serviceId, config) => ipcRenderer.invoke('automation:save-credentials', { serviceId, config }),
  deleteAutomationCredentials: (serviceId) => ipcRenderer.invoke('automation:delete-credentials', { serviceId }),
  testAutomationConnection: (serviceId, config) => ipcRenderer.invoke('automation:test-connection', { serviceId, config }),
  sendAutomationNotification: (serviceId, payload) => ipcRenderer.invoke('automation:send-notification', { serviceId, payload }),

  // Real-Time Analytics & WebSocket Synchronizer
  getAnalyticsConnectionInfo: () => ipcRenderer.invoke('analytics:get-connection-info'),
  publishAnalyticsEvent: (type, payload) => ipcRenderer.invoke('analytics:publish-event', { type, payload }),
  onAnalyticsEvent: (callback) => {
    const handler = (_event, msg) => callback(msg);
    ipcRenderer.on('analytics:event', handler);
    return () => {
      try { ipcRenderer.removeListener('analytics:event', handler); } catch {}
    };
  },

  // Software Updates (GitHub Releases + Inno Setup)
  getAppVersion: () => ipcRenderer.invoke('updater:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: (options) => ipcRenderer.invoke('updater:download', options),
  installUpdate: (options) => ipcRenderer.invoke('updater:install', options),
  onUpdateDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('updater:download-progress', handler);
    return () => {
      try { ipcRenderer.removeListener('updater:download-progress', handler); } catch {}
    };
  },
  onUpdateAvailableNotification: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('updater:update-available', handler);
    return () => {
      try { ipcRenderer.removeListener('updater:update-available', handler); } catch {}
    };
  },

  // Backup & Restore and Dataset Import
  openBackupFileDialog: () => ipcRenderer.invoke('backup:open-file-dialog'),
  saveBackupFileDialog: (options) => ipcRenderer.invoke('backup:save-file-dialog', options),
  readBackupFile: (filePath) => ipcRenderer.invoke('backup:read-file', { filePath }),
  writeBackupFile: (filePath, content) => ipcRenderer.invoke('backup:write-file', { filePath, content }),
  openImportFileDialog: (options) => ipcRenderer.invoke('import:open-file-dialog', options),
  readImportFile: (filePath) => ipcRenderer.invoke('import:read-file', { filePath }),

  // Java Spring Boot Sidecar Backend
  backendGetStatus: () => ipcRenderer.invoke('backend:get-status'),
  backendRestart: () => ipcRenderer.invoke('backend:restart'),
  backendRequest: (path, options) => ipcRenderer.invoke('backend:request', { path, options }),
});
