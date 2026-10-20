import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { APP_VERSION } from '../src/config/version';

// Import CommonJS updateManager module
const {
  GITHUB_OWNER,
  GITHUB_REPO,
  parseSemver,
  compareSemver,
  checkForUpdates,
  downloadUpdate,
  launchInstallerAndRestart,
  computeFileSha256,
} = require('../electron/updateManager.cjs');

describe('Ap Workspace Update Engine Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ap-updater-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('1. Semantic Version Parsing and Comparison', () => {
    it('should parse standard semver strings correctly', () => {
      expect(parseSemver('1.0.0')).toEqual([1, 0, 0]);
      expect(parseSemver('v1.0.1')).toEqual([1, 0, 1]);
      expect(parseSemver('V2.4.15-beta.1')).toEqual([2, 4, 15]);
      expect(parseSemver('0.9')).toEqual([0, 9, 0]);
      expect(parseSemver('')).toEqual([0, 0, 0]);
    });

    it('should correctly compare version precedence', () => {
      // Newer versions
      expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
      expect(compareSemver('1.1.0', '1.0.9')).toBe(1);
      expect(compareSemver('2.0.0', '1.99.99')).toBe(1);
      expect(compareSemver('v1.0.1', '1.0.0')).toBe(1);

      // Equal versions
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0-beta', '1.0.0')).toBe(0);

      // Older versions
      expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
      expect(compareSemver('1.0.9', '1.1.0')).toBe(-1);
      expect(compareSemver('0.9.5', '1.0.0')).toBe(-1);
    });
  });

  describe('2. GitHub Repository Configuration & Live Check', () => {
    it('should use the real repository owner and name', () => {
      expect(GITHUB_OWNER).toBe('arun-pandian-p');
      expect(GITHUB_REPO).toBe('Ap-Desktop');
    });

    it('should gracefully handle current state when no releases are published (404)', async () => {
      // In current repository before initial GitHub release publication, 404 is returned
      const result = await checkForUpdates('1.0.0');
      expect(result).toBeDefined();
      expect(result.currentVersion).toBe('1.0.0');
      // When 404 occurs, isUpdateAvailable must be false and not throw
      expect(result.isUpdateAvailable).toBe(false);
      expect(typeof result.message).toBe('string');
    });
  });

  describe('3. Checksum Computation and Mismatch Protection', () => {
    it('should compute exact SHA-256 for local files', () => {
      const sampleFile = path.join(tempDir, 'dummy_installer.exe');
      const content = 'AP_DESKTOP_INSTALLER_PAYLOAD_TEST';
      fs.writeFileSync(sampleFile, content);

      const expectedHash = crypto.createHash('sha256').update(content).digest('hex').toLowerCase();
      const actualHash = computeFileSha256(sampleFile);

      expect(actualHash).toBe(expectedHash);
    });

    it('should reject invalid / non-https URLs for security', async () => {
      await expect(
        downloadUpdate('javascript:alert(1)', { targetPath: path.join(tempDir, 'out.exe') })
      ).rejects.toThrow(/Updates must be downloaded securely over HTTPS/);

      await expect(
        downloadUpdate('file:///C:/malicious.exe', { targetPath: path.join(tempDir, 'out.exe') })
      ).rejects.toThrow(/Updates must be downloaded securely over HTTPS/);
    });

    it('should reject file and delete it if SHA-256 checksum mismatches', async () => {
      const http = require('http');
      const testPayload = 'TEST_INSTALLER_BINARY_DATA_CORRUPT_OR_MODIFIED';
      const expectedCorrectHash = crypto.createHash('sha256').update(testPayload).digest('hex');
      const intentionalWrongHash = '0000000000000000000000000000000000000000000000000000000000000000';

      const server = http.createServer((req: any, res: any) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': Buffer.byteLength(testPayload) });
        res.end(testPayload);
      });

      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const port = (server.address() as any).port;
      const downloadUrl = `http://127.0.0.1:${port}/test-installer.exe`;
      const targetExe = path.join(tempDir, 'downloaded_installer.exe');

      try {
        await expect(
          downloadUpdate(downloadUrl, {
            targetPath: targetExe,
            expectedHash: intentionalWrongHash,
          })
        ).rejects.toThrow(/SHA-256 signature verification failed/);

        // Security check: partial / corrupted file MUST have been unlinked
        expect(fs.existsSync(targetExe)).toBe(false);
      } finally {
        server.close();
      }
    });

    it('should successfully download and verify file if SHA-256 matches', async () => {
      const http = require('http');
      const testPayload = 'TEST_GENUINE_AP_WORKSPACE_INSTALLER';
      const genuineHash = crypto.createHash('sha256').update(testPayload).digest('hex');

      const server = http.createServer((req: any, res: any) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': Buffer.byteLength(testPayload) });
        res.end(testPayload);
      });

      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const port = (server.address() as any).port;
      const downloadUrl = `http://127.0.0.1:${port}/test-installer.exe`;
      const targetExe = path.join(tempDir, 'genuine_installer.exe');

      try {
        const result = await downloadUpdate(downloadUrl, {
          targetPath: targetExe,
          expectedHash: genuineHash,
        });

        expect(result.success).toBe(true);
        expect(result.isVerified).toBe(true);
        expect(result.sha256).toBe(genuineHash.toLowerCase());
        expect(fs.existsSync(targetExe)).toBe(true);
      } finally {
        server.close();
      }
    });
  });

  describe('4. Installer Security and Argument Safety', () => {
    it('should refuse to launch non-existent or non-exe installer files', () => {
      expect(() => {
        launchInstallerAndRestart(path.join(tempDir, 'missing.exe'));
      }).toThrow(/Installer executable not found at/);

      const fakeBat = path.join(tempDir, 'script.bat');
      fs.writeFileSync(fakeBat, 'echo dangerous');
      expect(() => {
        launchInstallerAndRestart(fakeBat);
      }).toThrow(/Only verified Windows .exe installers can be executed/);
    });
  });

  describe('5. Inno Setup Configuration Consistency', () => {
    const issPath = fs.existsSync(path.resolve(__dirname, '../installer/windows/installer.iss'))
      ? path.resolve(__dirname, '../installer/windows/installer.iss')
      : path.resolve(__dirname, '../installer/ap_installer.iss');
    const pkgPath = path.resolve(__dirname, '../package.json');

    it('should have consistent version across package.json and ap_installer.iss', () => {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const iss = fs.readFileSync(issPath, 'utf8');

      expect(pkg.version).toBe(APP_VERSION);
      expect(iss).toContain(`#define MyAppVersion "${pkg.version}"`);
      expect(iss).toContain('#define MyAppId "{{C2819894-399F-4D2A-98C1-02E09B1F54B0}}"');
      expect(iss).toContain('OutputBaseFilename=Ap_Desktop_Setup_v{#MyAppVersion}_x64');
      expect(iss).toContain('ArchitecturesAllowed=x64');
    });
  });
});
