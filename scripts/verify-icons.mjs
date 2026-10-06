import fs from 'fs';
import path from 'path';

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, size: buffer.length };
  }
  return null;
}

function parseIco(filePath) {
  const buffer = fs.readFileSync(filePath);
  const type = buffer.readUInt16LE(2);
  const count = buffer.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    let width = buffer.readUInt8(offset);
    let height = buffer.readUInt8(offset + 1);
    if (width === 0) width = 256;
    if (height === 0) height = 256;
    const bpp = buffer.readUInt16LE(offset + 6);
    const size = buffer.readUInt32LE(offset + 8);
    entries.push({ width, height, bpp, size });
  }
  return { type, count, entries, totalSize: buffer.length };
}

console.log('--- Checking src-tauri/icons ---');
const tauriIcons = fs.readdirSync('src-tauri/icons');
for (const file of tauriIcons) {
  const full = path.join('src-tauri/icons', file);
  if (file.endsWith('.png')) {
    const info = readPngDimensions(full);
    console.log(`  ${file}: ${info.width}x${info.height} (${info.size} bytes)`);
  } else if (file.endsWith('.ico')) {
    const ico = parseIco(full);
    console.log(`  ${file}: totalSize=${ico.totalSize} bytes, count=${ico.count} entries:`, ico.entries);
  }
}

console.log('\n--- Checking public/assets ---');
const publicAssets = fs.readdirSync('public/assets');
for (const file of publicAssets) {
  const full = path.join('public/assets', file);
  if (file.endsWith('.png')) {
    const info = readPngDimensions(full);
    if (info) console.log(`  ${file}: ${info.width}x${info.height} (${info.size} bytes)`);
  }
}

console.log('\n--- Checking public/favicon.ico ---');
const fav = parseIco('public/favicon.ico');
console.log(`  favicon.ico: totalSize=${fav.totalSize} bytes, count=${fav.count} entries:`, fav.entries);
