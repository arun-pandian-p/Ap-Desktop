import type {
  PythonInterpreterInfo,
  PythonRunResult,
  PostgresConfig,
  PostgresTestResult,
  PostgresTableInfo,
  PostgresQueryResult,
  RuntimeInfo,
  AllRuntimesInfo,
  ExecutionResult,
  ManagedAudioFile,
  ImportedAudioResult
} from '../services/runner';

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  appData: string;
  isPackaged: boolean;
  runtime: string;
}

export interface ElectronAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  setAlwaysOnTop?: (flag: boolean) => Promise<boolean>;
  isAlwaysOnTop?: () => Promise<boolean>;
  appInfo: () => Promise<AppInfo>;

  // Runtimes
  pythonInfo: () => Promise<PythonInterpreterInfo>;
  javaInfo: (customPath?: string) => Promise<RuntimeInfo>;
  cppInfo: (customPath?: string) => Promise<RuntimeInfo>;
  runtimesInfo: (customPaths?: { python?: string; java?: string; cpp?: string }) => Promise<AllRuntimesInfo>;
  runtimeVerify: (language: string, options?: { customPath?: string }) => Promise<{ success: boolean; message: string }>;

  // Multi-Language Execution
  executePython: (code: string, testCases?: Array<{ input: string; expected: string }>, options?: any) => Promise<PythonRunResult>;
  executeJava: (code: string, testCases?: Array<{ input: string; expected: string }>, options?: any) => Promise<ExecutionResult>;
  executeCpp: (code: string, testCases?: Array<{ input: string; expected: string }>, options?: any) => Promise<ExecutionResult>;
  executeCode: (language: string, code: string, testCases?: Array<{ input: string; expected: string }>, options?: any) => Promise<ExecutionResult>;

  // PostgreSQL
  postgresTest: (config: PostgresConfig) => Promise<PostgresTestResult>;
  postgresTables: (config: PostgresConfig) => Promise<{ success: boolean; tables?: PostgresTableInfo[]; error?: string }>;
  postgresQuery: (config: PostgresConfig, query: string) => Promise<PostgresQueryResult>;

  // Music & Audio
  importAudioFile: (sourcePath: string, category?: string) => Promise<ImportedAudioResult>;
  listManagedAudio: () => Promise<ManagedAudioFile[]>;
  deleteManagedAudio: (filename: string) => Promise<{ success: boolean; error?: string }>;
  openAudioFileDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;

  // Reports & Automation
  getAutomationServices: () => Promise<Array<{
    id: 'telegram' | 'twilio' | 'google' | 'n8n' | 'local';
    name: string;
    status: 'connected' | 'not_configured' | 'offline';
    description: string;
    details: string;
    isConfigured: boolean;
    configuredAt?: string | null;
  }>>;
  saveAutomationCredentials: (serviceId: string, config: any) => Promise<{ success: boolean; message: string }>;
  deleteAutomationCredentials: (serviceId: string) => Promise<{ success: boolean; message: string }>;
  testAutomationConnection: (serviceId: string, config?: any) => Promise<{ success: boolean; message: string; details?: any }>;
  sendAutomationNotification: (serviceId: string, payload: { text?: string; body?: string }) => Promise<{ success: boolean; message: string }>;

  // Real-Time Analytics & WebSocket Synchronizer
  getAnalyticsConnectionInfo?: () => Promise<{ wsPort: number; wsUrl: string; authToken: string; clientCount: number }>;
  publishAnalyticsEvent?: (type: string, payload: any) => Promise<{ success: boolean; error?: string }>;
  onAnalyticsEvent?: (callback: (msg: { id: string; type: string; payload: any; timestamp: string }) => void) => () => void;

  // Software Updates (GitHub Releases + Inno Setup)
  getAppVersion?: () => Promise<string>;
  checkForUpdates?: () => Promise<{
    success: boolean;
    isUpdateAvailable: boolean;
    currentVersion: string;
    latestVersion?: string;
    releaseName?: string;
    releaseNotes?: string;
    publishedAt?: string;
    releaseUrl?: string;
    asset?: { name: string; downloadUrl: string; size: number };
    sha256Asset?: { name: string; downloadUrl: string } | null;
    inlineSha256?: string | null;
    status?: string;
    message?: string;
    error?: string;
  }>;
  downloadUpdate?: (options: {
    assetUrl: string;
    sha256Url?: string | null;
    expectedHash?: string | null;
    fileName?: string;
    expectedSize?: number;
  }) => Promise<{
    success: boolean;
    installerPath?: string;
    fileName?: string;
    fileSize?: number;
    sha256?: string;
    isVerified?: boolean;
    error?: string;
  }>;
  installUpdate?: (options: { installerPath: string; silent?: boolean }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onUpdateDownloadProgress?: (callback: (progress: { percent: number; transferredBytes: number; totalBytes: number }) => void) => () => void;
  onUpdateAvailableNotification?: (callback: (info: any) => void) => () => void;

  // Backup & Restore and Dataset Import
  openBackupFileDialog?: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveBackupFileDialog?: (options?: { defaultName?: string }) => Promise<{ canceled: boolean; filePath: string }>;
  readBackupFile?: (filePath: string) => Promise<{ success: boolean; content?: string; size?: number; fileName?: string; error?: string }>;
  writeBackupFile?: (filePath: string, content: string) => Promise<{ success: boolean; filePath?: string; size?: number; error?: string }>;
  openImportFileDialog?: (options?: { fileType?: 'json' | 'csv' | 'all' }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  readImportFile?: (filePath: string) => Promise<{ success: boolean; content?: string; size?: number; fileName?: string; error?: string }>;

  // Java Spring Boot Sidecar Backend
  backendGetStatus?: () => Promise<{
    status: 'stopped' | 'starting' | 'running' | 'offline_fallback' | 'missing_java';
    isRunning: boolean;
    port: number;
    url: string | null;
    wsUrl: string | null;
    isOfflineFallback: boolean;
    hasJava: boolean;
    hasJar: boolean;
  }>;
  backendRestart?: () => Promise<any>;
  backendRequest?: (path: string, options?: { method?: string; headers?: Record<string, string>; body?: any; timeout?: number }) => Promise<{ status: number; data: any }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
