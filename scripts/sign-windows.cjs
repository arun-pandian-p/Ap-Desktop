/**
 * Ap Desktop Windows Authenticode Signing Script
 * Integrates with electron-builder to provide secure, production-grade code signing.
 */

const fs = require('fs');
const path = require('path');
const { execFile, execSync } = require('child_process');

const TIMESTAMP_SERVERS = [
  'http://timestamp.digicert.com',
  'http://timestamp.sectigo.com',
  'http://tsa.starfieldtech.com',
  'http://time.certum.pl'
];

function findSignTool() {
  const vendoredSigntool = path.resolve('node_modules/@electron/windows-sign/vendor/signtool.exe');
  if (fs.existsSync(vendoredSigntool)) return vendoredSigntool;

  const winstallerTool = path.resolve('node_modules/electron-winstaller/vendor/signtool.exe');
  if (fs.existsSync(winstallerTool)) return winstallerTool;

  const programFiles = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles || 'C:\\Program Files (x86)';
  const kitsRoot = path.join(programFiles, 'Windows Kits', '10', 'bin');
  
  if (fs.existsSync(kitsRoot)) {
    try {
      const versions = fs.readdirSync(kitsRoot)
        .filter(v => v.startsWith('10.'))
        .sort()
        .reverse();

      for (const ver of versions) {
        const candidate = path.join(kitsRoot, ver, 'x64', 'signtool.exe');
        if (fs.existsSync(candidate)) return candidate;
      }
    } catch {}
  }

  try {
    const which = execSync('where signtool.exe', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\r\n')[0];
    if (which && fs.existsSync(which)) return which;
  } catch {}

  return null;
}

async function sign(configuration) {
  const targetPath = configuration.path;
  const fileName = path.basename(targetPath);
  
  const certSource = process.env.WIN_CSC_LINK || process.env.CSC_LINK;
  const certPassword = process.env.WIN_CSC_KEY_PASSWORD || process.env.CSC_KEY_PASSWORD;

  if (!certSource) {
    console.log(`ℹ️  [CodeSign] Skipping Authenticode signing for ${fileName} (No commercial certificate specified in WIN_CSC_LINK / CSC_LINK)`);
    return;
  }

  console.log(`🔒 [CodeSign] Signing ${fileName} with Authenticode SHA-256...`);

  let pfxPath = certSource;
  let isTempPfx = false;

  if (!fs.existsSync(certSource)) {
    try {
      const pfxBuffer = Buffer.from(certSource, 'base64');
      pfxPath = path.resolve(`.tmp-signing-${Date.now()}.pfx`);
      fs.writeFileSync(pfxPath, pfxBuffer, { mode: 0o600 });
      isTempPfx = true;
    } catch (e) {
      throw new Error(`[CodeSign] Invalid certificate path or base64 payload: ${e.message}`);
    }
  }

  const signtool = findSignTool();
  if (!signtool) {
    if (isTempPfx) fs.unlinkSync(pfxPath);
    console.warn('[CodeSign] signtool.exe not found on system. Skipping SignTool pass.');
    return;
  }

  let signSuccess = false;
  let lastError = null;

  for (const tsServer of TIMESTAMP_SERVERS) {
    try {
      await new Promise((resolve, reject) => {
        const args = [
          'sign',
          '/f', pfxPath,
          '/fd', 'sha256',
          '/d', 'Ap Desktop',
          '/tr', tsServer,
          '/td', 'sha256',
          '/v'
        ];

        if (certPassword) {
          args.splice(3, 0, '/p', certPassword);
        }

        args.push(targetPath);

        execFile(signtool, args, (err, stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || stdout || err.message));
          } else {
            resolve(stdout);
          }
        });
      });

      console.log(`✅ [CodeSign] Successfully signed ${fileName} (Timestamp: ${tsServer})`);
      signSuccess = true;
      break;
    } catch (err) {
      console.warn(`⚠️  [CodeSign] Timestamping via ${tsServer} failed, trying fallback authority...`);
      lastError = err;
    }
  }

  if (isTempPfx && fs.existsSync(pfxPath)) {
    try { fs.unlinkSync(pfxPath); } catch {}
  }

  if (!signSuccess) {
    console.warn(`[CodeSign] Warning: Failed to sign ${fileName}: ${lastError ? lastError.message : 'Unknown error'}`);
  }
}

module.exports = sign;
module.exports.default = sign;
