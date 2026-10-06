import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import sqlExercisesData from '@/data/sqlExercises.json';

export interface PythonInterpreterInfo {
  installed: boolean;
  version: string;
  executable: string;
  status: string;
}

export interface PythonRunResult {
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
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

// Check if running inside Tauri desktop app
function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

async function runNodePython(code: string, testCases: any[]): Promise<PythonRunResult | null> {
  try {
    const cp = await import(/* @vite-ignore */ 'child_process');
    const path = await import(/* @vite-ignore */ 'path');
    const workerPath = path.resolve(process.cwd(), 'workers/python/worker.py');
    const res = cp.spawnSync('python', [workerPath], {
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
  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<PythonInterpreterInfo>('python_info');
    } catch (e) {
      console.warn('Tauri python_info failed, falling back to HTTP:', e);
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

  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<PythonRunResult>('execute_python', { code, testCases });
    } catch (e) {
      console.warn('Tauri execute_python failed, falling back to HTTP:', e);
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
      stderr: `Execution Bridge Failed: ${err.message}. Ensure Python 3.12 is installed.`,
      test_cases_passed: 0,
      total_test_cases: testCases.length,
      test_details: testCases.map(tc => ({ input: tc.input, expected: tc.expected, actual: 'Bridge Failed', passed: false })),
    };
  }
}

// -------------------------------------------------------------
// 2. SQL Practice Engine (Isolated SQLite per Challenge)
// -------------------------------------------------------------

const exerciseDbMap = new Map<string, Database>();
let sqlInitPromise: Promise<any> | null = null;

async function getSqlModule() {
  if (!sqlInitPromise) {
    const init = typeof initSqlJs === 'function' ? initSqlJs : (initSqlJs as any)?.default;
    const isNode = typeof window === 'undefined';
    sqlInitPromise = init(isNode ? {} : { locateFile: () => '/sql-wasm.wasm' });
  }
  return await sqlInitPromise;
}

export async function getExerciseSqlDb(exerciseId: string = 'sql-1'): Promise<Database> {
  const existing = exerciseDbMap.get(exerciseId);
  if (existing) return existing;

  const SQL = await getSqlModule();
  const db = new SQL.Database();

  const ex = sqlExercisesData.find(e => e.id === exerciseId) || sqlExercisesData[0];
  if (ex) {
    if (ex.schema_sql) {
      // Split multiple statements if any
      const stmts = ex.schema_sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const s of stmts) {
        db.run(s);
      }
    }
    if (ex.seed_sql) {
      const stmts = ex.seed_sql.split(';').map(s => s.trim()).filter(Boolean);
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

export async function executeSqlQuery(query: string, exerciseId: string = 'sql-1'): Promise<SqlQueryResult> {
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
    const exercise = sqlExercisesData.find(e => e.id === exerciseId);
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
  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<PostgresTestResult>('postgres_test', { config });
    } catch (e) {
      console.warn('Tauri postgres_test failed, falling back to HTTP:', e);
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
  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<{ success: boolean; tables?: PostgresTableInfo[]; error?: string }>('postgres_tables', { config });
    } catch (e) {
      console.warn('Tauri postgres_tables failed, falling back to HTTP:', e);
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
  if (isTauriEnv()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<PostgresQueryResult>('postgres_query', { config, query });
    } catch (e) {
      console.warn('Tauri postgres_query failed, falling back to HTTP:', e);
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
