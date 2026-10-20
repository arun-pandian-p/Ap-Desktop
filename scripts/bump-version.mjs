import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function parseSemver(str) {
  const clean = str.replace(/^[vV]/, '').trim();
  const parts = clean.split('.').map(p => parseInt(p, 10));
  return [
    isNaN(parts[0]) ? 1 : parts[0],
    isNaN(parts[1]) ? 0 : parts[1],
    isNaN(parts[2]) ? 0 : parts[2],
  ];
}

function getNextVersion(currentVersion, bumpType = 'patch') {
  const [major, minor, patch] = parseSemver(currentVersion);
  const type = bumpType.toLowerCase().trim();

  if (type === 'sync') {
    return currentVersion;
  }

  if (/^\d+\.\d+\.\d+$/.test(type)) {
    return type;
  }

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    case 'next':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

export function bumpVersion(targetBump = 'minor') {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkgLockPath = path.join(projectRoot, 'package-lock.json');
  const versionTsPath = path.join(projectRoot, 'src', 'config', 'version.ts');
  const issPath = path.join(projectRoot, 'installer', 'ap_installer.iss');
  const designIssPath = path.join(projectRoot, 'design', 'Ap_Secure_Installer.iss');

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVersion = pkg.version || '1.1.0';
  const newVersion = getNextVersion(oldVersion, targetBump);
  const today = new Date().toISOString().split('T')[0];

  console.log(`\n======================================================`);
  console.log(`  Ap Workspace -- Semantic Version Synchronizer      `);
  console.log(`======================================================`);
  if (targetBump === 'sync') {
    console.log(`[Version Sync] Keeping v${oldVersion} synchronized across all manifests`);
  } else {
    console.log(`[Version Bump] ${oldVersion}  -->  ${newVersion} (Bump Type: ${targetBump})`);
  }

  // 1. Update package.json
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`  [OK] package.json -> v${newVersion}`);

  // 2. Update package-lock.json
  if (fs.existsSync(pkgLockPath)) {
    try {
      const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
      pkgLock.version = newVersion;
      if (pkgLock.packages && pkgLock.packages['']) {
        pkgLock.packages[''].version = newVersion;
      }
      fs.writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + '\n', 'utf8');
      console.log(`  [OK] package-lock.json -> v${newVersion}`);
    } catch (e) {
      console.warn(`  [WARN] Failed to parse package-lock.json: ${e.message}`);
    }
  }

  // 3. Update src/config/version.ts
  const versionTsContent = `/**
 * Centralized Application Version Constants
 * Automatically synchronizes current version across UI, notifications, updates, and telemetry.
 * Updated automatically by scripts/bump-version.mjs
 */
export const APP_VERSION = '${newVersion}';
export const APP_BUILD_DATE = '${today}';
export const APP_RUNTIME_ARCHITECTURE = 'Electron 44 • React 18 • Java 21 Spring Boot • PostgreSQL / SQLite 3';
`;
  fs.writeFileSync(versionTsPath, versionTsContent, 'utf8');
  console.log(`  [OK] src/config/version.ts -> v${newVersion}`);

  // 4. Update installer/ap_installer.iss
  if (fs.existsSync(issPath)) {
    let issContent = fs.readFileSync(issPath, 'utf8');
    issContent = issContent.replace(
      /#define MyAppVersion\s+"[^"]+"/g,
      `#define MyAppVersion "${newVersion}"`
    );
    fs.writeFileSync(issPath, issContent, 'utf8');
    console.log(`  [OK] installer/ap_installer.iss -> v${newVersion}`);
  }

  // 5. Update design/Ap_Secure_Installer.iss
  if (fs.existsSync(designIssPath)) {
    let designIssContent = fs.readFileSync(designIssPath, 'utf8');
    designIssContent = designIssContent.replace(
      /#define MyAppVersion\s+"[^"]+"/g,
      `#define MyAppVersion "${newVersion}"`
    );
    fs.writeFileSync(designIssPath, designIssContent, 'utf8');
    console.log(`  [OK] design/Ap_Secure_Installer.iss -> v${newVersion}`);
  }

  console.log(`\n[SUCCESS] Ap Workspace version v${newVersion} synchronized across all targets!\n`);
  return { oldVersion, newVersion };
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith('bump-version.mjs')) {
  const bumpArg = process.argv[2] || 'patch';
  bumpVersion(bumpArg);
}
