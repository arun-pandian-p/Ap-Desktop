import { describe, it, expect } from 'vitest';
import { isValidSlug, isValidUsername, isValidEmail, sanitizeInput } from '../../packages/validation/index';

describe('Unit Tests — Validation Package (@ap/validation)', () => {
  it('should validate URL-friendly slugs correctly', () => {
    expect(isValidSlug('two-sum')).toBe(true);
    expect(isValidSlug('valid-anagram-2')).toBe(true);
    expect(isValidSlug('Invalid Slug')).toBe(false);
    expect(isValidSlug('slug_with_underscores')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });

  it('should validate user names according to policy', () => {
    expect(isValidUsername('coder_42')).toBe(true);
    expect(isValidUsername('dev-rishi')).toBe(true);
    expect(isValidUsername('ab')).toBe(false); // too short
    expect(isValidUsername('a'.repeat(33))).toBe(false); // too long
    expect(isValidUsername('user@name')).toBe(false); // invalid symbol
  });

  it('should validate email addresses accurately', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('developer@ap.io')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('should sanitize raw input strings to prevent markup injection', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeInput('Clean input 123')).toBe('Clean input 123');
  });
});
