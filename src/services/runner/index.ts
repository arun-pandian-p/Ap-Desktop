import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import sqlExercisesData from '@/data/sqlExercises.json';

export interface PythonInterpreterInfo {
  installed: boolean;
  version: string;
  executable: string;
  status: string;
}

export interface RuntimeInfo {
  installed: boolean;
  name: string;
  version: string;
  executable: string;
  compilerPath?: string;
  type?: string;
  status: 'Ready' | 'Not Installed' | 'Checking' | 'Unavailable' | 'Verification Failed' | 'Unsupported Version';
  details?: string;
}

export interface AllRuntimesInfo {
  python: RuntimeInfo;
  java: RuntimeInfo;
  cpp: RuntimeInfo;
  postgres: RuntimeInfo & { serviceActive?: boolean; psqlInstalled?: boolean };
}

export interface ExecutionResult {
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' | 'Runtime Unavailable';
  runtime_ms: number;
  memory_kb: number;
  stdout: string;
  stderr: string;
  test_cases_passed: number;
  total_test_cases: number;
  test_details: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }>;
}

export type PythonRunResult = ExecutionResult;
export type UnifiedRunResult = ExecutionResult;
export type UnifiedRuntimeStatus = RuntimeInfo;

export interface ManagedAudioFile {
  filename: string;
  title: string;
  src: string;
  sizeBytes: number;
  modified?: string;
}

export interface ImportedAudioResult {
  id: string;
  title: string;
  artist: string;
  category: string;
  playlist: string;
  filename: string;
  src: string;
  sizeBytes: number;
  duration: number;
  isCustom: boolean;
  addedAt: string;
  error?: string;
}

export interface SqlQueryResult {
  columns: string[];
  values: any[][];
  execution_ms: number;
  rows_count: number;
  error?: string;
  passed?: boolean;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  sslmode?: string;
}

export interface PostgresTestResult {
  success: boolean;
  version?: string;
  database?: string;
  user?: string;
  error?: string;
}

export interface PostgresTableInfo {
  name: string;
  count: string;
  type: string;
}

export interface PostgresQueryResult {
  success: boolean;
  columns?: string[];
  values?: any[][];
  row_count?: number;
  execution_ms?: number;
  error?: string;
}

// Check if running inside Electron desktop app
function isElectronEnv(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}

async function runNodePython(code: string, testCases: any[]): Promise<PythonRunResult | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const cp = await import(/* @vite-ignore */ 'child_process');
    const path = await import(/* @vite-ignore */ 'path');
    const workerPath = path.resolve(process.cwd(), 'workers/python/worker.py');
    const res = cp.spawnSync('python', ['-I', '-S', '-B', workerPath], {
      input: JSON.stringify({ code, test_cases: testCases }),
      encoding: 'utf-8',
      timeout: 10000,
    });
    if (res.stdout) {
      return JSON.parse(res.stdout.trim());
    }
  } catch {
    // fallback
  }
  return null;
}

async function runNodePostgres(action: string, payload: any): Promise<any | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const cp = await import(/* @vite-ignore */ 'child_process');
    const path = await import(/* @vite-ignore */ 'path');
    const bridgePath = path.resolve(process.cwd(), 'workers/postgres/bridge.py');
    const res = cp.spawnSync('python', [bridgePath, action], {
      input: JSON.stringify(payload),
      encoding: 'utf-8',
      timeout: 10000,
    });
    if (res.stdout) {
      return JSON.parse(res.stdout.trim());
    }
  } catch {
    // fallback
  }
  return null;
}

// -------------------------------------------------------------
// 1. Python Execution Service
// -------------------------------------------------------------

export async function getPythonInterpreterInfo(): Promise<PythonInterpreterInfo> {
  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.pythonInfo();
    } catch (e) {
      console.warn('Electron pythonInfo failed, falling back to HTTP:', e);
    }
  }

  if (typeof window === 'undefined') {
    try {
      const cp = await import(/* @vite-ignore */ 'child_process');
      const v = cp.execSync('python --version', { encoding: 'utf-8' }).trim();
      const p = cp.execSync('where python', { encoding: 'utf-8' }).trim().split('\n')[0].trim();
      return {
        installed: true,
        version: v,
        executable: p,
        status: 'Ready'
      };
    } catch {
      return { installed: false, version: 'Not Found', executable: '', status: 'Unavailable' };
    }
  }

  try {
    const res = await fetch('/api/python/info');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('HTTP python/info failed:', e);
  }

  return {
    installed: false,
    version: 'Python Not Detected',
    executable: '',
    status: 'Unavailable',
  };
}

export async function executePythonCode(
  code: string,
  testCases: Array<{ input: string; expected: string }> = []
): Promise<PythonRunResult> {
  const startTime = performance.now();

  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.executePython(code, testCases);
    } catch (e) {
      console.warn('Electron executePython failed, falling back to HTTP:', e);
    }
  }

  if (typeof window === 'undefined') {
    const nodeRes = await runNodePython(code, testCases);
    if (nodeRes) return nodeRes;
  }

  try {
    const res = await fetch('/api/python/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, test_cases: testCases }),
    });

    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    return {
      status: 'Runtime Error',
      runtime_ms: Math.round(performance.now() - startTime),
      memory_kb: 0,
      stdout: '',
      stderr: `Runner Server Error: ${errText}`,
      test_cases_passed: 0,
      total_test_cases: testCases.length,
      test_details: testCases.map(tc => ({ input: tc.input, expected: tc.expected, actual: 'Server Error', passed: false })),
    };
  } catch (err: any) {
    return {
      status: 'Compilation Error',
      runtime_ms: Math.round(performance.now() - startTime),
      memory_kb: 0,
      stdout: '',
      stderr: `Execution Bridge Failed: ${err.message}. Ensure Python is installed.`,
      test_cases_passed: 0,
      total_test_cases: testCases.length,
      test_details: testCases.map(tc => ({ input: tc.input, expected: tc.expected, actual: 'Bridge Failed', passed: false })),
    };
  }
}

// -------------------------------------------------------------
// 1.5 Multi-Language Code Execution & Runtime Management
// -------------------------------------------------------------

export async function executeCode(
  language: string,
  code: string,
  testCases: Array<{ input: string; expected: string }> = [],
  options: any = {}
): Promise<ExecutionResult> {
  const lang = (language || 'python').toLowerCase();

  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.executeCode(lang, code, testCases, options);
    } catch (e: any) {
      console.warn(`Electron executeCode (${lang}) error:`, e);
    }
  }

  if (lang === 'python') {
    return await executePythonCode(code, testCases);
  }

  // Node environment fallback (useful for tests)
  if (typeof window === 'undefined') {
    try {
      if (lang === 'java') {
        // @ts-ignore
        const { executeJava } = await import(/* @vite-ignore */ '../../../electron/javaRunner.cjs');
        return await executeJava(code, testCases, options);
      }
      if (lang === 'cpp' || lang === 'c++') {
        // @ts-ignore
        const { executeCpp } = await import(/* @vite-ignore */ '../../../electron/cppRunner.cjs');
        return await executeCpp(code, testCases, options);
      }
    } catch (e: any) {
      return {
        status: 'Runtime Error',
        runtime_ms: 0,
        memory_kb: 0,
        stdout: '',
        stderr: `Failed to load execution worker: ${e.message}`,
        test_cases_passed: 0,
        total_test_cases: testCases.length,
        test_details: [],
      };
    }
  }

  return {
    status: 'Runtime Unavailable',
    runtime_ms: 0,
    memory_kb: 0,
    stdout: '',
    stderr: `Language ${language} execution requires the native desktop runtime. Please open Ap Desktop or configure in Settings -> Manage Runtimes.`,
    test_cases_passed: 0,
    total_test_cases: testCases.length,
    test_details: testCases.map(tc => ({
      input: tc.input,
      expected: tc.expected,
      actual: 'Runtime Unavailable',
      passed: false,
    })),
  };
}

export async function executeJavaCode(
  code: string,
  testCases: Array<{ input: string; expected: string }> = [],
  options: any = {}
): Promise<ExecutionResult> {
  return executeCode('java', code, testCases, options);
}

export async function executeCppCode(
  code: string,
  testCases: Array<{ input: string; expected: string }> = [],
  options: any = {}
): Promise<ExecutionResult> {
  return executeCode('cpp', code, testCases, options);
}

export async function getAllRuntimesInfo(
  customPaths?: { python?: string; java?: string; cpp?: string }
): Promise<AllRuntimesInfo> {
  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.runtimesInfo(customPaths);
    } catch (e) {
      console.warn('Electron runtimesInfo failed:', e);
    }
  }

  const py = await getPythonInterpreterInfo();
  return {
    python: {
      installed: py.installed,
      name: 'Python 3',
      version: py.version,
      executable: py.executable,
      status: py.installed ? 'Ready' : 'Not Installed',
      details: py.status,
    },
    java: {
      installed: false,
      name: 'Java (JDK)',
      version: 'Browser WASM / Desktop Required',
      executable: '',
      status: 'Not Installed',
      details: 'Install Java 21 or 25 LTS JDK to compile & run Java solutions locally',
    },
    cpp: {
      installed: false,
      name: 'C++ Toolchain',
      version: 'Not Detected',
      executable: '',
      status: 'Not Installed',
      details: 'Install MSYS2 MinGW-w64 or Clang to compile & run C++ solutions locally',
    },
    postgres: {
      installed: false,
      name: 'PostgreSQL Server',
      version: 'Port 5432 Check',
      executable: '',
      status: 'Unavailable',
      details: 'PostgreSQL 16 native TCP server connection',
    },
  };
}

export async function getRuntimeInfo(language: string, customPath?: string): Promise<RuntimeInfo> {
  const all = await getAllRuntimesInfo({ [language]: customPath });
  const key = language.toLowerCase() as keyof AllRuntimesInfo;
  return all[key] || {
    installed: false,
    name: language,
    version: 'Not Detected',
    executable: '',
    status: 'Not Installed',
  };
}

export interface RuntimeVerifyResult {
  success: boolean;
  message: string;
  output?: string;
  runtimeMs?: number;
  error?: string;
}

export async function verifyRuntime(
  language: string,
  options?: { customPath?: string }
): Promise<RuntimeVerifyResult> {
  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.runtimeVerify(language, options);
    } catch (e: any) {
      return { success: false, message: e.message || 'Verification call failed', error: e.message };
    }
  }
  return { success: false, message: 'Native runtime verification requires Ap Desktop.', error: 'Browser environment' };
}

// Music & Audio Library API helpers
export async function importAudioFile(sourcePath: string, category: string = 'Custom'): Promise<ImportedAudioResult> {
  if (isElectronEnv() && window.electronAPI) {
    return await window.electronAPI.importAudioFile(sourcePath, category);
  }
  throw new Error('Local audio file import requires Ap Desktop.');
}

export async function listManagedAudio(): Promise<ManagedAudioFile[]> {
  if (isElectronEnv() && window.electronAPI) {
    return await window.electronAPI.listManagedAudio();
  }
  return [];
}

export async function deleteManagedAudio(filename: string): Promise<{ success: boolean; error?: string }> {
  if (isElectronEnv() && window.electronAPI) {
    return await window.electronAPI.deleteManagedAudio(filename);
  }
  return { success: false, error: 'Desktop environment required' };
}

export async function openAudioFileDialog(): Promise<{ canceled: boolean; filePaths: string[] }> {
  if (isElectronEnv() && window.electronAPI) {
    return await window.electronAPI.openAudioFileDialog();
  }
  return { canceled: true, filePaths: [] };
}

// -------------------------------------------------------------
// 2. SQL Practice Engine (Isolated SQLite per Challenge)
// -------------------------------------------------------------

import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
const exerciseDbMap = new Map<string, Database>();
let sqlInitPromise: Promise<any> | null = null;

async function getSqlModule() {
  if (!sqlInitPromise) {
    sqlInitPromise = (async () => {
      const init = typeof initSqlJs === 'function' ? initSqlJs : (initSqlJs as any)?.default;
      if (typeof window === 'undefined') {
        return await init({});
      }

      // 1. Try locateFile with sqlWasmUrl
      try {
        const SQL = await init({
          locateFile: (file: string) => (file.endsWith('.wasm') ? (sqlWasmUrl || '/sql-wasm.wasm') : file)
        });
        if (SQL && SQL.Database) return SQL;
      } catch {}

      // 2. Try candidate direct URLs
      const candidateUrls = [
        sqlWasmUrl,
        '/sql-wasm.wasm',
        './sql-wasm.wasm',
        'sql-wasm.wasm',
        new URL('/sql-wasm.wasm', window.location.href).href,
      ].filter(Boolean);

      for (const url of candidateUrls) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const wasmBinary = await resp.arrayBuffer();
            const SQL = await init({ wasmBinary });
            if (SQL && SQL.Database) return SQL;
          }
        } catch {}
      }

      return await init({ locateFile: () => 'sql-wasm.wasm' });
    })();
  }
  return await sqlInitPromise;
}

export async function getExerciseSqlDb(exerciseId: string = 'sql-175'): Promise<Database> {
  const existing = exerciseDbMap.get(exerciseId);
  if (existing) return existing;

  const SQL = await getSqlModule();
  const db = new SQL.Database();

  let ex: any = (sqlExercisesData as any[]).find(e => e.id === exerciseId);
  if (!ex) {
    try {
      const { fetchSqlExercises } = await import('@/services/db');
      const list = await fetchSqlExercises();
      ex = list.find(e => e.id === exerciseId);
    } catch {}
  }
  if (!ex) {
    ex = sqlExercisesData[0];
  }
  if (ex) {
    if (ex.schema_sql) {
      // Split multiple statements if any
      const stmts = ex.schema_sql.split(';').map((s: string) => s.trim()).filter(Boolean);
      for (const s of stmts) {
        db.run(s);
      }
    }
    if (ex.seed_sql) {
      const stmts = ex.seed_sql.split(';').map((s: string) => s.trim()).filter(Boolean);
      for (const s of stmts) {
        db.run(s);
      }
    }
  }

  exerciseDbMap.set(exerciseId, db);
  return db;
}

export function resetExerciseSqlDb(exerciseId: string): void {
  const existing = exerciseDbMap.get(exerciseId);
  if (existing) {
    try {
      existing.close();
    } catch {}
    exerciseDbMap.delete(exerciseId);
  }
}

export async function executeSqlQuery(query: string, exerciseId: string = 'sql-175'): Promise<SqlQueryResult> {
  const start = performance.now();

  const trimmed = query.trim().toUpperCase();
  if (trimmed.startsWith('ATTACH') || trimmed.startsWith('DETACH') || trimmed.includes('LOAD_EXTENSION')) {
    return {
      columns: [],
      values: [],
      execution_ms: 0,
      rows_count: 0,
      error: 'Security Violation: ATTACH, DETACH, and LOAD_EXTENSION are blocked in the SQL practice engine.',
    };
  }

  try {
    const db = await getExerciseSqlDb(exerciseId);
    const res = db.exec(query);
    const execution_ms = Math.round(performance.now() - start);

    if (!res.length) {
      return {
        columns: [],
        values: [],
        execution_ms,
        rows_count: 0,
        passed: true,
      };
    }

    const columns = res[0].columns;
    const values = res[0].values;
    const rows_count = values.length;

    // Validate against exercise expected output
    let passed = true;
    let exercise: any = (sqlExercisesData as any[]).find(e => e.id === exerciseId);
    if (!exercise) {
      try {
        const { fetchSqlExercises } = await import('@/services/db');
        const list = await fetchSqlExercises();
        exercise = list.find(e => e.id === exerciseId);
      } catch {}
    }
    if (exercise && exercise.expected_output_json) {
      try {
        const expected = JSON.parse(exercise.expected_output_json);
        passed = rows_count === expected.length;
      } catch {
        passed = true;
      }
    }

    return {
      columns,
      values,
      execution_ms,
      rows_count,
      passed,
    };
  } catch (err: any) {
    const execution_ms = Math.round(performance.now() - start);
    return {
      columns: [],
      values: [],
      execution_ms,
      rows_count: 0,
      error: err.message || 'SQL execution failed',
      passed: false,
    };
  }
}

// -------------------------------------------------------------
// 3. PostgreSQL Lab Genuine Connection Service
// -------------------------------------------------------------

export async function postgresTestConnection(config: PostgresConfig): Promise<PostgresTestResult> {
  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.postgresTest(config);
    } catch (e) {
      console.warn('Electron postgresTest failed, falling back to HTTP:', e);
    }
  }

  if (typeof window === 'undefined') {
    const nodeRes = await runNodePostgres('test', config);
    if (nodeRes) return nodeRes;
  }

  try {
    const res = await fetch('/api/postgres/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return await res.json();
    }
    const errText = await res.text();
    return { success: false, error: `Connection service failed: ${errText}` };
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

export async function postgresGetTables(config: PostgresConfig): Promise<{ success: boolean; tables?: PostgresTableInfo[]; error?: string }> {
  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.postgresTables(config);
    } catch (e) {
      console.warn('Electron postgresTables failed, falling back to HTTP:', e);
    }
  }

  if (typeof window === 'undefined') {
    const nodeRes = await runNodePostgres('tables', config);
    if (nodeRes) return nodeRes;
  }

  try {
    const res = await fetch('/api/postgres/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: await res.text() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function postgresExecuteQuery(config: PostgresConfig, query: string): Promise<PostgresQueryResult> {
  if (isElectronEnv() && window.electronAPI) {
    try {
      return await window.electronAPI.postgresQuery(config, query);
    } catch (e) {
      console.warn('Electron postgresQuery failed, falling back to HTTP:', e);
    }
  }

  if (typeof window === 'undefined') {
    const nodeRes = await runNodePostgres('query', { config, query });
    if (nodeRes) return nodeRes;
  }

  try {
    const res = await fetch('/api/postgres/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, query }),
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: await res.text() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
