const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function killProcessTree(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {}
}

const COMMON_CPP_PATHS = [
  'C:\\msys64\\ucrt64\\bin\\g++.exe',
  'C:\\msys64\\mingw64\\bin\\g++.exe',
  'C:\\Program Files\\LLVM\\bin\\clang++.exe',
  'C:\\MinGW\\bin\\g++.exe',
];

function detectCpp(customPath) {
  const candidateCommands = [];

  if (customPath && fs.existsSync(customPath)) {
    const isExe = customPath.endsWith('.exe');
    if (isExe) {
      candidateCommands.push(customPath);
    } else {
      const gppSub = path.join(customPath, 'g++.exe');
      const clangSub = path.join(customPath, 'clang++.exe');
      const binGpp = path.join(customPath, 'bin', 'g++.exe');
      const binClang = path.join(customPath, 'bin', 'clang++.exe');
      [gppSub, clangSub, binGpp, binClang].forEach(p => {
        if (fs.existsSync(p)) candidateCommands.push(p);
      });
    }
  }

  // Add system commands
  candidateCommands.push('g++', 'clang++', 'cl.exe');

  // Add common paths on Windows
  if (process.platform === 'win32') {
    COMMON_CPP_PATHS.forEach(p => {
      if (fs.existsSync(p)) candidateCommands.push(p);
    });
  }

  for (const cmd of candidateCommands) {
    try {
      const isCl = cmd.toLowerCase().includes('cl.exe') || cmd.toLowerCase() === 'cl';
      if (isCl) {
        const out = execSync(`"${cmd}" 2>&1`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 4000,
        }).trim();
        const vMatch = out.match(/Version\s+([0-9.]+)/i);
        return {
          installed: true,
          type: 'msvc',
          version: `MSVC ${vMatch ? vMatch[1] : 'C++ Compiler'}`,
          executable: cmd,
          compilerPath: cmd,
          status: 'Ready',
          details: out.split('\n')[0].trim(),
        };
      }

      const out = execSync(`"${cmd}" --version`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 4000,
      }).trim();

      const isClang = cmd.toLowerCase().includes('clang');
      const vMatch = out.match(/(?:g\+\+|clang\+\+|gcc|clang)\s*(?:\([^)]+\))?\s*([0-9.]+)/i) || out.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
      const vStr = vMatch ? vMatch[1] : '17';

      let resolvedPath = cmd;
      try {
        if (!cmd.includes(path.sep) && process.platform === 'win32') {
          const whereOut = execSync(`where ${cmd}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
          resolvedPath = whereOut.split('\r\n')[0].split('\n')[0].trim() || cmd;
        }
      } catch {}

      return {
        installed: true,
        type: isClang ? 'clang' : 'gcc',
        version: `${isClang ? 'Clang++' : 'G++'} ${vStr}`,
        executable: resolvedPath,
        compilerPath: resolvedPath,
        status: 'Ready',
        details: out.split('\n')[0].trim(),
      };
    } catch {}
  }

  return {
    installed: false,
    type: 'none',
    version: 'Not Detected',
    executable: '',
    compilerPath: '',
    status: 'Not Installed',
    details: 'No C++ compiler found (g++, clang++, or cl.exe).',
  };
}

function cleanStr(s) {
  if (s == null) return '';
  let str = String(s).trim();
  while (str.length >= 2 && ((str[0] === '"' && str[str.length - 1] === '"') || (str[0] === "'" && str[str.length - 1] === "'") || (str[0] === '`' && str[str.length - 1] === '`'))) {
    str = str.substring(1, str.length - 1).trim();
  }
  return str;
}

function normalizeVal(val) {
  if (val == null) return '';
  const s = String(val).trim();
  try {
    const parsed = JSON.parse(s);
    return JSON.stringify(parsed);
  } catch {
    return cleanStr(s);
  }
}

async function executeCpp(code, testCases = [], options = {}) {
  const startTime = Date.now();
  const cppInfo = detectCpp(options.customPath);

  if (!cppInfo.installed) {
    return {
      status: 'Runtime Unavailable',
      runtime_ms: 0,
      memory_kb: 0,
      stdout: '',
      stderr: 'C++ toolchain (GCC / Clang / MSVC) was not detected on this system. Please configure or install a C++ compiler (MSYS2 MinGW-w64, LLVM Clang, or Visual Studio C++ Build Tools) in Settings -> Manage Runtimes.',
      test_cases_passed: 0,
      total_test_cases: testCases.length,
      test_details: testCases.map(tc => ({
        input: tc.input || '',
        expected: tc.expected || '',
        actual: 'Runtime Unavailable',
        passed: false,
      })),
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-cpp-'));
  const sourceFile = path.join(tempDir, 'solution.cpp');
  const exeFile = path.join(tempDir, process.platform === 'win32' ? 'solution.exe' : 'solution');

  try {
    fs.writeFileSync(sourceFile, code, 'utf-8');

    // 1. Compile
    const compileRes = await new Promise((resolve) => {
      let stderr = '';
      const args = ['-O2', '-std=c++17', sourceFile, '-o', exeFile];
      const child = spawn(cppInfo.compilerPath, args, {
        cwd: tempDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('close', code => resolve({ code, stderr }));
      child.on('error', err => resolve({ code: 1, stderr: err.message }));

      setTimeout(() => {
        killProcessTree(child.pid);
        resolve({ code: 1, stderr: 'C++ Compilation timed out (10000ms limit).' });
      }, 10000);
    });

    if (compileRes.code !== 0) {
      return {
        status: 'Compilation Error',
        runtime_ms: Date.now() - startTime,
        memory_kb: 0,
        stdout: '',
        stderr: compileRes.stderr.replace(new RegExp(escapeRegExp(tempDir), 'g'), ''),
        test_cases_passed: 0,
        total_test_cases: testCases.length,
        test_details: testCases.map(tc => ({
          input: tc.input || '',
          expected: tc.expected || '',
          actual: 'Compilation Error',
          passed: false,
        })),
      };
    }

    // 2. Execute
    if (!testCases || testCases.length === 0) {
      const runRes = await runSingleCppExecution(exeFile, tempDir, '');
      const elapsed = Date.now() - startTime;
      return {
        status: runRes.status,
        runtime_ms: elapsed,
        memory_kb: runRes.memory_kb,
        stdout: runRes.stdout,
        stderr: runRes.stderr,
        test_cases_passed: runRes.status === 'Accepted' ? 1 : 0,
        total_test_cases: 1,
        test_details: [{
          input: 'Standard Execution',
          expected: 'Exit Code 0',
          actual: runRes.status,
          passed: runRes.status === 'Accepted',
        }],
      };
    }

    let totalPassed = 0;
    const testDetails = [];
    let overallStatus = 'Accepted';
    let combinedStdout = '';
    let combinedStderr = '';
    let maxMemory = 0;

    for (const tc of testCases) {
      const rawInp = tc.input != null ? String(tc.input) : '';
      const expected = tc.expected != null ? String(tc.expected) : '';

      let cleanInp = rawInp.trim();
      if (cleanInp.startsWith('(') && cleanInp.endsWith(')')) {
        cleanInp = cleanInp.substring(1, cleanInp.length - 1).trim();
      }
      const formattedInput = cleanInp.replace(/,\s*/g, '\n') + '\n';

      const runRes = await runSingleCppExecution(exeFile, tempDir, formattedInput);

      if (runRes.memory_kb > maxMemory) maxMemory = runRes.memory_kb;
      if (runRes.stdout) combinedStdout += runRes.stdout + '\n';
      if (runRes.stderr) combinedStderr += runRes.stderr + '\n';

      if (runRes.status === 'Time Limit Exceeded') {
        overallStatus = 'Time Limit Exceeded';
        testDetails.push({
          input: rawInp,
          expected: expected,
          actual: 'Time Limit Exceeded',
          passed: false,
        });
        break;
      }

      if (runRes.status === 'Runtime Error') {
        overallStatus = 'Runtime Error';
        testDetails.push({
          input: rawInp,
          expected: expected,
          actual: `Runtime Error: ${runRes.stderr.split('\n')[0] || 'Non-zero exit'}`,
          passed: false,
        });
        continue;
      }

      const actualOut = runRes.stdout.trim();
      const normAct = normalizeVal(actualOut);
      const normExp = normalizeVal(expected);
      const cAct = cleanStr(actualOut);
      const cExp = cleanStr(expected);

      const passed = (
        normAct === normExp ||
        cAct === cExp ||
        actualOut === expected.trim() ||
        (cAct.toLowerCase() === cExp.toLowerCase() && cAct.length > 0)
      );

      if (passed) {
        totalPassed++;
      } else {
        if (overallStatus === 'Accepted') {
          overallStatus = 'Wrong Answer';
        }
      }

      testDetails.push({
        input: rawInp,
        expected: expected,
        actual: actualOut || (runRes.stderr ? `Error: ${runRes.stderr}` : '(empty)'),
        passed,
      });
    }

    return {
      status: overallStatus,
      runtime_ms: Date.now() - startTime,
      memory_kb: maxMemory,
      stdout: combinedStdout.trim(),
      stderr: combinedStderr.trim(),
      test_cases_passed: totalPassed,
      total_test_cases: testCases.length,
      test_details: testDetails,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

function runSingleCppExecution(exePath, cwd, inputData) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isFinished = false;

    const child = spawn(exePath, [], {
      cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const timeoutTimer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        killProcessTree(child.pid);
        resolve({
          status: 'Time Limit Exceeded',
          memory_kb: 0,
          stdout: stdout.trim(),
          stderr: 'Execution timed out (10000ms limit).',
        });
      }
    }, 10000);

    child.stdout.on('data', d => {
      stdout += d.toString();
      if (stdout.length > 5 * 1024 * 1024) {
        child.kill();
      }
    });

    child.stderr.on('data', d => {
      stderr += d.toString();
    });

    child.on('close', code => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutTimer);

      resolve({
        status: code === 0 ? 'Accepted' : 'Runtime Error',
        memory_kb: 3200,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    child.on('error', err => {
      if (isFinished) return;
      isFinished = true;
      clearTimeout(timeoutTimer);
      resolve({
        status: 'Runtime Error',
        memory_kb: 0,
        stdout: '',
        stderr: err.message,
      });
    });

    try {
      if (inputData) {
        child.stdin.write(inputData);
      }
      child.stdin.end();
    } catch {}
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  detectCpp,
  executeCpp,
};
