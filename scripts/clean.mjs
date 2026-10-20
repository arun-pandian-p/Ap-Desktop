#!/usr/bin/env node
/**
 * Simple, cross-platform cleanup script for Ap Desktop.
 * Removes build artifacts, caches, and temporary test databases.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dirsToRemove = [
  'dist',
  'out',
  'release',
  path.join('backend', 'target'),
  path.join('build', 'dist'),
  path.join('build', 'out'),
  path.join('build', 'win-unpacked'),
];

console.log('🧹 [Clean] Starting workspace cleanup...');

let removedCount = 0;

for (const relDir of dirsToRemove) {
  const target = path.join(rootDir, relDir);
  if (fs.existsSync(target)) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`   ✓ Removed: ${relDir}`);
      removedCount++;
    } catch (err) {
      console.warn(`   ⚠️ Could not remove ${relDir}: ${err.message}`);
    }
  }
}

// Clean up temporary test sqlite files in backend and tests
function cleanTempFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && (entry.name.endsWith('.sqlite-wal') || entry.name.endsWith('.sqlite-shm') || entry.name.startsWith('test_'))) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`   ✓ Removed temp file: ${path.relative(rootDir, fullPath)}`);
        removedCount++;
      } catch (_) {}
    }
  }
}

cleanTempFiles(path.join(rootDir, 'backend'));
cleanTempFiles(path.join(rootDir, 'tests'));

console.log(`✨ [Clean] Cleanup complete! (${removedCount} items removed)\n`);
