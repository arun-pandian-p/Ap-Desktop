/**
 * Validation rules and utilities for Ap Platform
 */

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());
}

export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const clean = username.trim();
  return clean.length >= 3 && clean.length <= 32 && /^[a-zA-Z0-9_-]+$/.test(clean);
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input.replace(/[<>]/g, '');
}
