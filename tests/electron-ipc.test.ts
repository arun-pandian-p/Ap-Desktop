import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';
import fs from 'fs';

describe('Electron Integration & IPC Engine Verification', () => {
  const pythonWorkerPath = path.resolve(__dirname, '../workers/python/worker.py');
  const postgresBridgePath = path.resolve(__dirname, '../workers/postgres/bridge.py');

  it('1. should verify Python worker file exists and is executable', () => {
    expect(fs.existsSync(pythonWorkerPath)).toBe(true);
    const res = spawnSync('python', ['-I', '-S', '-B', pythonWorkerPath], {
      input: JSON.stringify({ code: 'print("Hello from Ap Electron")', test_cases: [] }),
      encoding: 'utf-8',
      timeout: 5000,
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.status).toBe('Accepted');
    expect(parsed.stdout.trim()).toBe('Hello from Ap Electron');
  });

  it('2. should verify Python execution handles test cases and returns structured result', () => {
    const code = `def twoSum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        diff = target - n
        if diff in seen:
            return [seen[diff], i]
        seen[n] = i
    return []`;

    const testCases = [
      { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
      { input: '[3, 2, 4], 6', expected: '[1, 2]' }
    ];

    const res = spawnSync('python', ['-I', '-S', '-B', pythonWorkerPath], {
      input: JSON.stringify({ code, test_cases: testCases }),
      encoding: 'utf-8',
      timeout: 5000,
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.status).toBe('Accepted');
    expect(parsed.test_cases_passed).toBe(2);
    expect(parsed.total_test_cases).toBe(2);
  });

  it('3. should verify Python sandbox blocks forbidden network calls', () => {
    const code = `import socket\ns = socket.socket()`;
    const res = spawnSync('python', ['-I', '-S', '-B', pythonWorkerPath], {
      input: JSON.stringify({ code, test_cases: [] }),
      encoding: 'utf-8',
      timeout: 5000,
    });
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.status).toBe('Runtime Error');
    expect(parsed.stderr).toContain('NetworkSecurityException');
  });

  it('4. should verify PostgreSQL bridge worker handles connection tests', () => {
    expect(fs.existsSync(postgresBridgePath)).toBe(true);
    const res = spawnSync('python', [postgresBridgePath, 'test'], {
      input: JSON.stringify({ host: '127.0.0.1', port: 5432, user: 'postgres', password: 'wrongpassword', timeout: 2 }),
      encoding: 'utf-8',
      timeout: 5000,
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout.trim());
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  it('5. should verify packaged production files and assets exist in dist', () => {
    const distHtml = path.resolve(__dirname, '../dist/index.html');
    const wasmPath = path.resolve(__dirname, '../public/sql-wasm.wasm');
    const distWasm = path.resolve(__dirname, '../dist/sql-wasm.wasm');
    expect(fs.existsSync(distHtml)).toBe(true);
    expect(fs.existsSync(wasmPath)).toBe(true);
    expect(fs.existsSync(distWasm)).toBe(true);
  });
});
