import { describe, it, expect } from 'vitest';
import { getConnectedServices } from '../src/services/notifications';

describe('Connected Services & Secrets Vault', () => {
  it('should detect configured services from secret.json', () => {
    const services = getConnectedServices();
    expect(services.length).toBeGreaterThanOrEqual(4);

    const telegram = services.find(s => s.id === 'telegram');
    expect(telegram).toBeDefined();
    expect(telegram?.status).toBe('connected');

    const google = services.find(s => s.id === 'google');
    expect(google).toBeDefined();
    expect(google?.status).toBe('connected');
  });

  it('should mask sensitive credential details and never expose raw tokens', () => {
    const services = getConnectedServices();
    const telegram = services.find(s => s.id === 'telegram');
    expect(telegram?.details).not.toContain('8711937903:AAGzTyaP1lmwMEWyXbGSLyqdrp0WZO0v54I');

    const google = services.find(s => s.id === 'google');
    expect(google?.details).toContain('Sheet ID:');
    expect(google?.details).toContain('...');
  });
});
