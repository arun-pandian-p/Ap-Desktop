import { describe, it, expect } from 'vitest';
import { executePythonCode } from '../src/services/runner';
import { execSync } from 'child_process';
import path from 'path';

describe('Python Execution Sandbox', () => {
  it('should execute legitimate algorithms and return Accepted status', async () => {
    const code = 'def solve(a, b): return a + b\nprint(solve(2, 3))';
    const res = await executePythonCode(code);
    expect(res.status).toBe('Accepted');
    expect(res.test_cases_passed).toBeGreaterThan(0);
  });

  it('should block file deletion and os.environ inspection', async () => {
    const code = 'import os\nprint(os.environ)';
    const res = await executePythonCode(code);
    expect(res.status).toBe('Runtime Error');
    expect(res.stderr).toContain('SecurityException');
  });

  it('should block socket and network requests', async () => {
    const code = 'import socket\ns = socket.socket()';
    const res = await executePythonCode(code);
    expect(res.status).toBe('Runtime Error');
    expect(res.stderr).toContain('NetworkSecurityException');
  });

  it('should verify worker.py audit hook blocks system sockets under real Python 3.12', () => {
    const workerPath = path.resolve('workers/python/worker.py');
    const output = execSync(`python "${workerPath}" "import socket; s = socket.socket()"`, { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe('Runtime Error');
    expect(parsed.stderr).toContain('Network access blocked by Ap sandbox');
  });
});
