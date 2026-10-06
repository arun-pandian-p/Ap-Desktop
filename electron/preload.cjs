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

  // Code & Query Execution Engines
  executePython: (code, testCases) => ipcRenderer.invoke('python:execute', { code, testCases }),
  postgresTest: (config) => ipcRenderer.invoke('postgres:test', { config }),
  postgresTables: (config) => ipcRenderer.invoke('postgres:tables', { config }),
  postgresQuery: (config, query) => ipcRenderer.invoke('postgres:query', { config, query }),
});
