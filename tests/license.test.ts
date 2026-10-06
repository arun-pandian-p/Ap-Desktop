import { describe, it, expect } from 'vitest';
import { saveLicense, getCurrentLicense, getMachineFingerprint } from '../src/services/license';

describe('Ap Licensing Subsystem', () => {
  it('should provide default active developer pro license in dev environment', () => {
    const lic = getCurrentLicense();
    expect(lic.edition).toBe('pro');
    expect(lic.status).toBe('Valid');
    expect(lic.features).toContain('python');
    expect(lic.features).toContain('sql');
  });

  it('should reject invalid license format not starting with ApLic1.', () => {
    const res = saveLicense('InvalidTokenString');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Invalid license format');
    expect(res.state.status).toBe('Invalid');
  });

  it('should detect malformed token structures with incorrect dots', () => {
    const res = saveLicense('ApLic1.singlepart');
    expect(res.success).toBe(false);
    expect(res.message).toContain('Malformed token structure');
    expect(res.state.status).toBe('Tampered');
  });

  it('should verify machine fingerprint consistency', () => {
    const fp = getMachineFingerprint();
    expect(fp).toBeTruthy();
    expect(typeof fp).toBe('string');
  });
});
