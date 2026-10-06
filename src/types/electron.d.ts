import type { PythonInterpreterInfo, PythonRunResult, PostgresConfig, PostgresTestResult, PostgresTableInfo, PostgresQueryResult } from '../services/runner';

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
  pythonInfo: () => Promise<PythonInterpreterInfo>;
  executePython: (code: string, testCases?: Array<{ input: string; expected: string }>) => Promise<PythonRunResult>;
  postgresTest: (config: PostgresConfig) => Promise<PostgresTestResult>;
  postgresTables: (config: PostgresConfig) => Promise<{ success: boolean; tables?: PostgresTableInfo[]; error?: string }>;
  postgresQuery: (config: PostgresConfig, query: string) => Promise<PostgresQueryResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
