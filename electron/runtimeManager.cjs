const { execSync } = require('child_process');
const fs = require('fs');
const { detectJava, executeJava } = require('./javaRunner.cjs');
const { detectCpp, executeCpp } = require('./cppRunner.cjs');

function detectPython(customPath, findPythonFunc) {
  let pyExe = customPath && fs.existsSync(customPath) ? customPath : (findPythonFunc ? findPythonFunc() : 'python');
  try {
    const versionOut = execSync(`"${pyExe}" -c "import sys, platform; print(platform.python_version()); print(sys.executable)"`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
    const lines = versionOut.split('\r\n')[0].split('\n');
    return {
      installed: true,
      name: 'Python 3',
      version: `Python ${lines[0]}`,
      executable: lines[1] || pyExe,
      status: 'Ready',
      details: `Interpreter active at ${lines[1] || pyExe}`,
    };
  } catch (err) {
    return {
      installed: false,
      name: 'Python 3',
      version: 'Not Detected',
      executable: '',
      status: 'Not Installed',
      details: err.message,
    };
  }
}

function detectPostgres() {
  let psqlInstalled = false;
  let psqlVersion = 'Not Detected';
  try {
    const out = execSync('psql --version', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
    psqlInstalled = true;
    psqlVersion = out.split('\n')[0].trim();
  } catch {}

  let serviceActive = false;
  try {
    // Check if port 5432 is listening on Windows
    const netstatOut = execSync('netstat -an', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 });
    if (netstatOut.includes(':5432') && netstatOut.includes('LISTENING')) {
      serviceActive = true;
    }
  } catch {}

  return {
    installed: psqlInstalled || serviceActive,
    name: 'PostgreSQL Database Engine',
    version: psqlInstalled ? psqlVersion : (serviceActive ? 'PostgreSQL Server (Port 5432)' : 'Not Running'),
    serviceActive,
    psqlInstalled,
    status: serviceActive ? 'Ready' : (psqlInstalled ? 'Client Ready (Server stopped)' : 'Not Running'),
    details: serviceActive ? 'PostgreSQL service is active and listening on port 5432' : 'PostgreSQL server not detected on port 5432',
  };
}

function detectAllRuntimes(customPaths = {}, findPythonFunc) {
  const python = detectPython(customPaths.python, findPythonFunc);
  const java = detectJava(customPaths.java);
  const cpp = detectCpp(customPaths.cpp);
  const postgres = detectPostgres();

  return {
    python,
    java,
    cpp,
    postgres,
  };
}

async function verifyRuntimeSnippet(language, options = {}) {
  if (language === 'python') {
    const pyExe = options.customPath || 'python';
    try {
      const out = execSync(`"${pyExe}" -c "print('Python OK')"`, { encoding: 'utf-8', timeout: 5000 }).trim();
      return { success: out.includes('Python OK'), message: 'Python execution verified successfully.' };
    } catch (e) {
      return { success: false, message: `Python verification failed: ${e.message}` };
    }
  }

  if (language === 'java') {
    const snippet = `
public class ApVerifyJava {
    public static void main(String[] args) {
        System.out.println("Java OK");
    }
}
`;
    const res = await executeJava(snippet, [{ input: '', expected: 'Java OK' }], options);
    return {
      success: res.status === 'Accepted',
      message: res.status === 'Accepted' ? 'Java JDK compilation and execution verified.' : `Java verification failed: ${res.stderr || res.status}`,
    };
  }

  if (language === 'cpp') {
    const snippet = `
#include <iostream>
int main() {
    std::cout << "CPP OK" << std::endl;
    return 0;
}
`;
    const res = await executeCpp(snippet, [{ input: '', expected: 'CPP OK' }], options);
    return {
      success: res.status === 'Accepted',
      message: res.status === 'Accepted' ? 'C++ compilation and execution verified.' : `C++ verification failed: ${res.stderr || res.status}`,
    };
  }

  return { success: false, message: `Unknown runtime: ${language}` };
}

module.exports = {
  detectPython,
  detectPostgres,
  detectAllRuntimes,
  verifyRuntimeSnippet,
};
