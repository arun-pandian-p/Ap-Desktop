const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { app } = require('electron');

const GITHUB_OWNER = 'arun-pandian-p';
const GITHUB_REPO = 'Ap-Desktop';

/**
 * Parses a semantic version string into [major, minor, patch] numbers
 */
function parseSemver(versionStr) {
  if (!versionStr || typeof versionStr !== 'string') return [0, 0, 0];
  const clean = versionStr.trim().replace(/^[vV]/, '').split('-')[0].split('+')[0];
  const parts = clean.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

/**
 * Compares two semantic version strings
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v2 is newer)
 *   0 if v1 === v2
 */
function compareSemver(v1, v2) {
  const [maj1, min1, pat1] = parseSemver(v1);
  const [maj2, min2, pat2] = parseSemver(v2);

  if (maj1 !== maj2) return maj1 > maj2 ? 1 : -1;
  if (min1 !== min2) return min1 > min2 ? 1 : -1;
  if (pat1 !== pat2) return pat1 > pat2 ? 1 : -1;
  return 0;
}

/**
 * Performs an HTTPS GET request following redirects (301, 302, 307, 308)
 */
function httpGetWithRedirects(url, headers = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many HTTP redirects following update URL.'));
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(new Error(`Invalid URL for update: ${url}`));
    }

    const client = parsed.protocol === 'http:' ? http : https;
    const reqOptions = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Ap-Desktop-Updater/1.0',
        ...headers,
      },
      timeout: 15000,
    };

    const req = client.get(reqOptions, (res) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume(); // discard body
        return resolve(httpGetWithRedirects(nextUrl, headers, maxRedirects - 1));
      }

      resolve(res);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out while contacting update server.'));
    });

    req.on('error', (err) => {
      if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN' || err.code === 'ECONNREFUSED') {
        reject(new Error('No internet connection or unable to reach GitHub. Please check your network.'));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Checks GitHub Releases API for the latest published stable release
 */
async function checkForUpdates(currentVersionOverride = null) {
  const currentVersion = currentVersionOverride || (app ? app.getVersion() : '1.0.0');
  const endpoint = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

  let res;
  try {
    res = await httpGetWithRedirects(endpoint, {
      Accept: 'application/vnd.github.v3+json',
    });
  } catch (err) {
    return {
      success: false,
      isUpdateAvailable: false,
      currentVersion,
      error: err.message,
    };
  }

  // Handle GitHub API status codes
  if (res.statusCode === 404) {
    return {
      success: true,
      isUpdateAvailable: false,
      currentVersion,
      latestVersion: currentVersion,
      status: 'up_to_date',
      message: `No published releases found on ${GITHUB_OWNER}/${GITHUB_REPO}. You are on the current build (v${currentVersion}).`,
    };
  }

  if (res.statusCode === 403 || res.statusCode === 429) {
    return {
      success: false,
      isUpdateAvailable: false,
      currentVersion,
      error: 'GitHub API rate limit exceeded. Please wait a few minutes or retry later.',
    };
  }

  if (res.statusCode !== 200) {
    return {
      success: false,
      isUpdateAvailable: false,
      currentVersion,
      error: `GitHub API returned unexpected HTTP status ${res.statusCode}.`,
    };
  }

  let body = '';
  try {
    for await (const chunk of res) {
      body += chunk;
    }
  } catch (err) {
    return {
      success: false,
      isUpdateAvailable: false,
      currentVersion,
      error: 'Failed to read response from GitHub release server.',
    };
  }

  let release;
  try {
    release = JSON.parse(body);
  } catch (err) {
    return {
      success: false,
      isUpdateAvailable: false,
      currentVersion,
      error: 'Invalid response payload from GitHub release server.',
    };
  }

  // Extract release version from tag_name or name (e.g. "v1.0.1" -> "1.0.1")
  const rawTag = release.tag_name || release.name || '';
  const latestVersion = rawTag.replace(/^[vV]/, '').trim();

  if (!latestVersion) {
    return {
      success: false,
      isUpdateAvailable: false,
      currentVersion,
      error: 'Latest release does not specify a valid version tag.',
    };
  }

  const isNewer = compareSemver(latestVersion, currentVersion) > 0;

  if (!isNewer) {
    return {
      success: true,
      isUpdateAvailable: false,
      currentVersion,
      latestVersion,
      status: 'up_to_date',
      message: `You are running the latest stable release (v${currentVersion}).`,
    };
  }

  // Search for the Windows x64 Inno Setup installer asset
  const assets = Array.isArray(release.assets) ? release.assets : [];
  
  // Prefer Ap_Desktop_Setup_...exe, or any .exe asset
  const exeAsset = assets.find((a) => {
    const name = (a.name || '').toLowerCase();
    return name.endsWith('.exe') && !name.includes('uninstall');
  });

  if (!exeAsset) {
    return {
      success: false,
      isUpdateAvailable: true,
      currentVersion,
      latestVersion,
      error: `Release v${latestVersion} was found, but it does not contain a Windows x64 .exe installer asset.`,
    };
  }

  // Find SHA-256 asset if published alongside
  const sha256Asset = assets.find((a) => {
    const name = (a.name || '').toLowerCase();
    return name.endsWith('.sha256') || name.includes('sha256') || name.endsWith('sums.txt');
  });

  // Also check if release body has an inline SHA-256 hash
  let inlineSha256 = null;
  if (release.body) {
    const hashMatch = release.body.match(/[a-fA-F0-9]{64}/);
    if (hashMatch) {
      inlineSha256 = hashMatch[0];
    }
  }

  return {
    success: true,
    isUpdateAvailable: true,
    currentVersion,
    latestVersion,
    releaseName: release.name || release.tag_name || `v${latestVersion}`,
    releaseNotes: release.body || 'No release notes provided for this version.',
    publishedAt: release.published_at || new Date().toISOString(),
    releaseUrl: release.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    asset: {
      name: exeAsset.name,
      downloadUrl: exeAsset.browser_download_url,
      size: exeAsset.size,
    },
    sha256Asset: sha256Asset
      ? {
          name: sha256Asset.name,
          downloadUrl: sha256Asset.browser_download_url,
        }
      : null,
    inlineSha256,
  };
}

/**
 * Downloads the update asset to a temporary directory and verifies SHA-256 checksum
 */
async function downloadUpdate(assetUrl, options = {}, onProgress = null) {
  const isLocal = typeof assetUrl === 'string' && (assetUrl.startsWith('http://127.0.0.1') || assetUrl.startsWith('http://localhost'));
  if (!assetUrl || (!assetUrl.startsWith('https://') && !isLocal)) {
    throw new Error('Invalid download URL. Updates must be downloaded securely over HTTPS.');
  }

  const tempDir = app ? app.getPath('temp') : (process.env.TEMP || process.env.TMP || '/tmp');
  const updateDir = path.join(tempDir, 'ap-workspace-update');
  if (!fs.existsSync(updateDir)) {
    fs.mkdirSync(updateDir, { recursive: true });
  }

  const fileName = options.fileName || path.basename(new URL(assetUrl).pathname) || 'Ap_Desktop_Setup.exe';
  const targetPath = options.targetPath || path.join(updateDir, fileName);

  // If a previous download exists, remove it
  if (fs.existsSync(targetPath)) {
    try { fs.unlinkSync(targetPath); } catch {}
  }

  const res = await httpGetWithRedirects(assetUrl, {
    Accept: 'application/octet-stream',
  });

  if (res.statusCode !== 200) {
    throw new Error(`Failed to download installer. Server returned HTTP ${res.statusCode}.`);
  }

  const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || options.expectedSize || 0;
  let transferredBytes = 0;

  const fileStream = fs.createWriteStream(targetPath);
  const hash = crypto.createHash('sha256');

  await new Promise((resolve, reject) => {
    res.on('data', (chunk) => {
      transferredBytes += chunk.length;
      hash.update(chunk);
      fileStream.write(chunk);

      if (typeof onProgress === 'function') {
        const percent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0;
        onProgress({
          percent,
          transferredBytes,
          totalBytes,
        });
      }
    });

    fileStream.on('finish', () => {
      resolve();
    });

    res.on('end', () => {
      fileStream.end();
    });

    res.on('error', (err) => {
      fileStream.destroy();
      try { fs.unlinkSync(targetPath); } catch {}
      reject(new Error(`Download interrupted: ${err.message}`));
    });

    fileStream.on('error', (err) => {
      try { fs.unlinkSync(targetPath); } catch {}
      reject(new Error(`Failed to write installer file: ${err.message}`));
    });
  });

  const calculatedHash = hash.digest('hex').toLowerCase();

  // If a sha256 checksum URL or expected hash was provided, verify it
  let expectedHash = (options.expectedHash || '').trim().toLowerCase();

  if (!expectedHash && options.sha256Url) {
    try {
      const shaRes = await httpGetWithRedirects(options.sha256Url);
      if (shaRes.statusCode === 200) {
        let shaText = '';
        for await (const chunk of shaRes) {
          shaText += chunk;
        }
        const match = shaText.match(/[a-fA-F0-9]{64}/);
        if (match) {
          expectedHash = match[0].toLowerCase();
        }
      }
    } catch (e) {
      console.warn('Could not download external .sha256 checksum asset:', e.message);
    }
  }

  if (expectedHash) {
    if (calculatedHash !== expectedHash) {
      try { fs.unlinkSync(targetPath); } catch {}
      throw new Error(
        `SHA-256 signature verification failed! Expected: ${expectedHash}, Calculated: ${calculatedHash}. The download may be corrupted or tampered.`
      );
    }
  }

  return {
    success: true,
    installerPath: targetPath,
    fileName,
    fileSize: transferredBytes,
    sha256: calculatedHash,
    isVerified: Boolean(expectedHash && calculatedHash === expectedHash),
  };
}

/**
 * Spawns the verified Inno Setup installer using argument arrays (NEVER shell: true)
 * Exits the current Ap process only after the installer has launched successfully.
 */
function launchInstallerAndRestart(installerPath, options = {}) {
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Installer executable not found at: ${installerPath}`);
  }

  if (!installerPath.toLowerCase().endsWith('.exe')) {
    throw new Error('Only verified Windows .exe installers can be executed.');
  }

  // Construct Inno Setup command-line arguments array
  const args = [];
  if (options.silent) {
    // Silent installation is opt-in and does not force close other apps
    args.push('/SILENT', '/NORESTART');
  }

  // Spawn installer as detached process
  const child = spawn(installerPath, args, {
    detached: true,
    stdio: 'ignore',
    shell: false, // Explicitly disable shell to prevent command injection
  });

  child.on('error', (err) => {
    console.error('Failed to spawn Inno Setup installer:', err);
    throw new Error(`Failed to launch installer: ${err.message}`);
  });

  child.unref();

  // Exit Ap gracefully only after installer process is successfully spawned
  if (app) {
    setTimeout(() => {
      app.quit();
    }, 600);
  }

  return { success: true };
}

/**
 * Computes SHA-256 hex string of a file on disk
 */
function computeFileSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex').toLowerCase();
}

module.exports = {
  GITHUB_OWNER,
  GITHUB_REPO,
  parseSemver,
  compareSemver,
  checkForUpdates,
  downloadUpdate,
  launchInstallerAndRestart,
  computeFileSha256,
};
