import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('E2E & Application Structure Smoke Tests', () => {
  it('should verify Electron desktop shell entry points exist', () => {
    const desktopMain = path.resolve(process.cwd(), 'apps/desktop/main/index.cjs');
    const desktopPreload = path.resolve(process.cwd(), 'apps/desktop/preload/index.cjs');
    const desktopRenderer = path.resolve(process.cwd(), 'apps/desktop/renderer/index.tsx');

    expect(fs.existsSync(desktopMain)).toBe(true);
    expect(fs.existsSync(desktopPreload)).toBe(true);
    expect(fs.existsSync(desktopRenderer)).toBe(true);
  });

  it('should verify Windows installer configuration and assets are present', () => {
    const issPath = path.resolve(process.cwd(), 'installer/windows/installer.iss');
    const licensePath = path.resolve(process.cwd(), 'installer/licenses/LICENSE.txt');
    const icoPath = path.resolve(process.cwd(), 'assets/icons/icon.ico');

    expect(fs.existsSync(issPath)).toBe(true);
    expect(fs.existsSync(licensePath)).toBe(true);
    expect(fs.existsSync(icoPath)).toBe(true);
  });

  it('should verify release and CI workflows are properly configured', () => {
    const ciPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');
    const releasePath = path.resolve(process.cwd(), '.github/workflows/release.yml');
    const prTemplatePath = path.resolve(process.cwd(), '.github/pull_request_template.md');

    expect(fs.existsSync(ciPath)).toBe(true);
    expect(fs.existsSync(releasePath)).toBe(true);
    expect(fs.existsSync(prTemplatePath)).toBe(true);
  });
});
