const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const ALLOWED_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getAudioDir() {
  const baseDir = app.getPath('userData');
  const audioDir = path.join(baseDir, 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  return audioDir;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function importLocalAudioFile(sourcePath, category = 'Custom') {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source audio file does not exist: ${sourcePath}`);
  }

  const stat = fs.statSync(sourcePath);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`Audio file exceeds 100MB limit: ${(stat.size / (1024 * 1024)).toFixed(1)}MB`);
  }

  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    throw new Error(`Unsupported audio format: ${ext}. Allowed formats: MP3, WAV, OGG, M4A, FLAC`);
  }

  const originalName = path.basename(sourcePath, ext);
  const safeBase = sanitizeFilename(originalName);
  const targetName = `${safeBase}-${Date.now()}${ext}`;
  const audioDir = getAudioDir();
  const targetPath = path.join(audioDir, targetName);

  // Copy to user data directory (safely outside installation dir)
  fs.copyFileSync(sourcePath, targetPath);

  const fileUrl = `file:///${targetPath.replace(/\\/g, '/')}`;

  return {
    id: `custom-track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: originalName.replace(/_/g, ' '),
    artist: 'User Library',
    category: category,
    playlist: 'imported',
    filename: targetName,
    src: fileUrl,
    sizeBytes: stat.size,
    duration: 180, // estimated default
    isCustom: true,
    addedAt: new Date().toISOString(),
  };
}

function listManagedAudioFiles() {
  const audioDir = getAudioDir();
  const files = fs.readdirSync(audioDir);
  return files.filter(f => ALLOWED_EXTS.has(path.extname(f).toLowerCase())).map(f => {
    const fullPath = path.join(audioDir, f);
    const stat = fs.statSync(fullPath);
    const ext = path.extname(f);
    const rawTitle = path.basename(f, ext).replace(/-[0-9]{13}$/, '').replace(/_/g, ' ');
    return {
      filename: f,
      title: rawTitle,
      src: `file:///${fullPath.replace(/\\/g, '/')}`,
      sizeBytes: stat.size,
      modified: stat.mtime.toISOString(),
    };
  });
}

function deleteManagedAudioFile(filename) {
  // Prevent path traversal
  const safeName = path.basename(filename);
  const audioDir = getAudioDir();
  const targetPath = path.join(audioDir, safeName);

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
    return { success: true };
  }
  return { success: false, error: 'File not found' };
}

module.exports = {
  getAudioDir,
  importLocalAudioFile,
  listManagedAudioFiles,
  deleteManagedAudioFile,
};
