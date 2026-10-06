import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Generate multiple PNG sizes using PowerShell Drawing API
const sizes = [16, 24, 32, 48, 64, 128, 256];
const tempDir = 'scratch/ico_temp';
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const srcImgPath = path.resolve('screens/Glossy Red Ap Monogram Icon.png');

for (const s of sizes) {
  const outPng = path.resolve(tempDir, `icon_${s}.png`);
  const psCmd = `
    Add-Type -AssemblyName System.Drawing;
    $src = [System.Drawing.Image]::FromFile('${srcImgPath.replace(/'/g, "''")}');
    $bmp = New-Object System.Drawing.Bitmap(${s}, ${s});
    $g = [System.Drawing.Graphics]::FromImage($bmp);
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality;
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality;
    $g.DrawImage($src, 0, 0, ${s}, ${s});
    $bmp.Save('${outPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png);
    $g.Dispose();
    $bmp.Dispose();
    $src.Dispose();
  `;
  execSync(`powershell -NoProfile -Command "${psCmd.replace(/\n/g, ' ')}"`);
}

// Pack all PNG images into a standard Windows multi-image ICO binary
function createMultiSizeIco(sizeList) {
  const images = sizeList.map(s => {
    const pngBuffer = fs.readFileSync(path.join(tempDir, `icon_${s}.png`));
    return { size: s, buffer: pngBuffer };
  });

  const headerSize = 6;
  const dirEntrySize = 16;
  const totalEntries = images.length;
  let currentOffset = headerSize + (dirEntrySize * totalEntries);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(totalEntries, 4); // Number of images

  const dirEntries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    const w = img.size >= 256 ? 0 : img.size;
    const h = img.size >= 256 ? 0 : img.size;
    entry.writeUInt8(w, 0); // Width
    entry.writeUInt8(h, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data

    dirEntries.push(entry);
    imageBuffers.push(img.buffer);
    currentOffset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

const icoBuffer = createMultiSizeIco(sizes);
fs.writeFileSync('src-tauri/icons/icon.ico', icoBuffer);
fs.writeFileSync('public/favicon.ico', icoBuffer);

console.log(`Generated true multi-size ICO (${icoBuffer.length} bytes) containing 7 sizes: [16, 24, 32, 48, 64, 128, 256]`);
