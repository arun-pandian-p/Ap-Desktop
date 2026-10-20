#!/usr/bin/env node
/**
 * Simple, human-friendly build runner for Ap Desktop.
 * Usage:
 *   node scripts/build.mjs            # Builds full project (frontend + backend JAR check)
 *   node scripts/build.mjs --frontend # Builds TypeScript & Vite bundle
 *   node scripts/build.mjs --backend  # Packages Spring Boot executable JAR
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

const args = process.argv.slice(2);
const buildFrontendOnly = args.includes('--frontend');
const buildBackendOnly = args.includes('--backend');

function run(command, cwd = rootDir) {
  console.log(`\n▶ Running: ${command} in ${path.relative(rootDir, cwd) || '.'}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

console.log('🚀 [Build] Starting Ap Desktop build pipeline...\n');

try {
  // 1. Build Backend JAR if requested or missing
  if (buildBackendOnly || (!buildFrontendOnly)) {
    const jarPattern = /ap-backend-.*\.jar$/;
    const targetDir = path.join(backendDir, 'target');
    let hasJar = false;

    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      hasJar = files.some(f => jarPattern.test(f) && !f.endsWith('.original'));
    }

    if (buildBackendOnly || !hasJar) {
      console.log('☕ [1/2] Building Spring Boot backend fat JAR...');
      const mvnCmd = process.platform === 'win32' ? 'mvnw.cmd package -DskipTests' : './mvnw package -DskipTests';
      run(mvnCmd, backendDir);
      console.log('   ✓ Spring Boot backend packaged successfully.');
    } else {
      console.log('☕ [1/2] Spring Boot backend JAR already present in target/ (skipping recompilation).');
    }
  }

  // 2. Build Frontend
  if (!buildBackendOnly) {
    console.log('\n⚛️  [2/2] Compiling TypeScript & building Vite bundle...');
    run('npx tsc && npx vite build', rootDir);
    console.log('   ✓ Frontend bundle built in dist/');
  }

  console.log('\n✨ [Build] All build steps completed successfully!\n');
} catch (error) {
  console.error('\n❌ [Build] Build failed:', error.message);
  process.exit(1);
}
