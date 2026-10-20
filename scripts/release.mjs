#!/usr/bin/env node
/**
 * Simple, human-friendly release packaging script for Ap Desktop.
 * Usage:
 *   node scripts/release.mjs
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'out');

function run(command, cwd = rootDir) {
  console.log(`\n▶ ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

console.log('📦 [Release] Starting release packaging for Ap Desktop...\n');

try {
  // 1. Run build script to ensure fresh frontend & backend
  console.log('🔨 Step 1: Building assets...');
  run('node scripts/build.mjs', rootDir);

  // 2. Ensure out directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 3. Package Windows installer using electron-builder
  console.log('\n🖥️  Step 2: Packaging Electron Windows installer...');
  run('npx electron-builder --win nsis', rootDir);

  // 4. Locate generated installer in release/ or out/
  const candidateDirs = [path.join(rootDir, 'release'), outDir];
  let installerFile = null;

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const exe = files.find(f => f.endsWith('.exe') && !f.includes('unpacked'));
      if (exe) {
        installerFile = path.join(dir, exe);
        // Copy to out/ if in release/
        if (dir !== outDir) {
          const target = path.join(outDir, exe);
          fs.copyFileSync(installerFile, target);
          installerFile = target;
        }
        break;
      }
    }
  }

  if (installerFile && fs.existsSync(installerFile)) {
    const stats = fs.statSync(installerFile);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    // Compute SHA-256
    const fileBuffer = fs.readFileSync(installerFile);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const checksumFile = path.join(outDir, 'SHA256SUMS.txt');
    fs.writeFileSync(checksumFile, `${hash}  ${path.basename(installerFile)}\n`, 'utf8');

    console.log('\n🎉 [Release] Packaging successful!');
    console.log(`   📁 Installer: ${installerFile} (${sizeMb} MB)`);
    console.log(`   🔒 SHA-256:   ${hash}`);
    console.log(`   📄 Checksum:  ${checksumFile}\n`);
  } else {
    console.log('\n✅ [Release] Electron package created.');
  }
} catch (error) {
  console.error('\n❌ [Release] Packaging failed:', error.message);
  process.exit(1);
}
