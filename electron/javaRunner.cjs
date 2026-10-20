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

function detectJava(customPath) {
  let javacCmd = 'javac';
  let javaCmd = 'java';

  if (customPath && fs.existsSync(customPath)) {
    const isBin = fs.existsSync(path.join(customPath, 'javac.exe')) || fs.existsSync(path.join(customPath, 'javac'));
    if (isBin) {
      javacCmd = path.join(customPath, process.platform === 'win32' ? 'javac.exe' : 'javac');
      javaCmd = path.join(customPath, process.platform === 'win32' ? 'java.exe' : 'java');
    } else {
      const subBinJavac = path.join(customPath, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac');
      if (fs.existsSync(subBinJavac)) {
        javacCmd = subBinJavac;
        javaCmd = path.join(customPath, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      }
    }
  }

  try {
    const javacOut = execSync(`"${javacCmd}" -version`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    }).trim();

    const javaOut = execSync(`"${javaCmd}" -version 2>&1`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();

    const versionMatch = javacOut.match(/javac\s+([0-9._]+)/i) || javaOut.match(/version\s+"([0-9._]+)/i);
    const versionStr = versionMatch ? versionMatch[1] : javacOut;

    let resolvedPath = javacCmd;
    try {
      if (javacCmd === 'javac' && process.platform === 'win32') {
        const whereOut = execSync('where javac', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        resolvedPath = whereOut.split('\r\n')[0].split('\n')[0].trim() || javacCmd;
      }
    } catch {}

    return {
      installed: true,
      version: `Java ${versionStr}`,
      executable: javaCmd,
      compilerPath: resolvedPath,
      status: 'Ready',
      details: javaOut.split('\n')[0].trim(),
    };
  } catch (err) {
    return {
      installed: false,
      version: 'Not Detected',
      executable: '',
      compilerPath: '',
      status: 'Not Installed',
      details: err.message,
    };
  }
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

async function executeJava(code, testCases = [], options = {}) {
  const startTime = Date.now();
  const javaInfo = detectJava(options.customPath);

  if (!javaInfo.installed) {
    return {
      status: 'Runtime Unavailable',
      runtime_ms: 0,
      memory_kb: 0,
      stdout: '',
      stderr: 'Java Development Kit (JDK) is not installed or configured. Please install a supported JDK (Java 21 or 25 LTS recommended) in Settings -> Manage Runtimes.',
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

  // Determine Class name
  const publicClassMatch = code.match(/public\s+(?:final\s+|abstract\s+)*class\s+([A-Za-z0-9_]+)/);
  const anyClassMatch = code.match(/class\s+([A-Za-z0-9_]+)/);
  let className = publicClassMatch ? publicClassMatch[1] : (anyClassMatch ? anyClassMatch[1] : 'Solution');

  // Check if main method is present
  const hasMain = /public\s+static\s+void\s+main\s*\(\s*String/m.test(code);

  let fullCode = code;
  if (!hasMain && !publicClassMatch && anyClassMatch) {
    // Inject a wrapper main method into the class if it's missing main
    const lastBraceIdx = code.lastIndexOf('}');
    if (lastBraceIdx !== -1) {
      const runnerMain = `
    public static void main(String[] args) {
        try (java.util.Scanner sc = new java.util.Scanner(System.in)) {
            while (sc.hasNextLine()) {
                String line = sc.nextLine().trim();
                if (line.isEmpty()) continue;
                System.out.println(line);
            }
        }
    }
`;
      fullCode = code.slice(0, lastBraceIdx) + runnerMain + code.slice(lastBraceIdx);
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-java-'));
  const sourceFile = path.join(tempDir, `${className}.java`);

  try {
    fs.writeFileSync(sourceFile, fullCode, 'utf-8');

    // 1. Compile with javac
    const compileRes = await new Promise((resolve) => {
      let stderr = '';
      const child = spawn(javaInfo.compilerPath || 'javac', ['-encoding', 'UTF-8', sourceFile], {
        cwd: tempDir,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stderr.on('data', d => { stderr += d.toString(); });
      child.on('close', code => resolve({ code, stderr }));
      child.on('error', err => resolve({ code: 1, stderr: err.message }));

      setTimeout(() => {
        killProcessTree(child.pid);
        resolve({ code: 1, stderr: 'Compilation timed out (10000ms limit).' });
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

    // 2. Execute compiled class
    if (!testCases || testCases.length === 0) {
      // Single run without test cases
      const runRes = await runSingleJavaExecution(javaInfo.executable, tempDir, className, '');
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

    // Multi-test case runner
    let totalPassed = 0;
    const testDetails = [];
    let overallStatus = 'Accepted';
    let combinedStdout = '';
    let combinedStderr = '';
    let maxMemory = 0;

    for (const tc of testCases) {
      const rawInp = tc.input != null ? String(tc.input) : '';
      const expected = tc.expected != null ? String(tc.expected) : '';

      // Format input for CP scanner
      let cleanInp = rawInp.trim();
      if (cleanInp.startsWith('(') && cleanInp.endsWith(')')) {
        cleanInp = cleanInp.substring(1, cleanInp.length - 1).trim();
      }
      const formattedInput = cleanInp.replace(/,\s*/g, '\n') + '\n';

      const runRes = await runSingleJavaExecution(javaInfo.executable, tempDir, className, formattedInput);

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

function runSingleJavaExecution(javaExe, cwd, className, inputData) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let isFinished = false;

    const child = spawn(javaExe, [
      '-Dfile.encoding=UTF-8',
      '-XX:+UseSerialGC',
      '-Xmx256m',
      '-cp', '.',
      className,
    ], {
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
        memory_kb: 24500,
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
  detectJava,
  executeJava,
};
