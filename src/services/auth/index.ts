/**
 * Ap Workspace — Cryptographic Authentication & Account Service
 * Uses Web Crypto API PBKDF2 with SHA-256 and cryptographic salt.
 * Strictly avoids plaintext password storage.
 */

const SALT_KEY = 'ap_auth_salt';
const HASH_KEY = 'ap_auth_hash';
const INITIALIZED_KEY = 'ap_auth_initialized';

const getCrypto = (): Crypto => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto as Crypto;
};

async function deriveKey(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const passBuffer = enc.encode(password);
  const crypto = getCrypto();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', derivedKey);
  return Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const memoryStorage = new Map<string, string>();

function getAuthItem(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStorage.get(key) || null;
}

function setAuthItem(key: string, val: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, val);
  }
  memoryStorage.set(key, val);
}

export function clearAuthForTesting(): void {
  memoryStorage.clear();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SALT_KEY);
    localStorage.removeItem(HASH_KEY);
    localStorage.removeItem(INITIALIZED_KEY);
  }
}

export async function isAuthInitialized(): Promise<boolean> {
  return getAuthItem(INITIALIZED_KEY) === 'true';
}

export async function setupInitialAccount(password: string): Promise<boolean> {
  try {
    const crypto = getCrypto();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = await deriveKey(password, salt);

    setAuthItem(SALT_KEY, saltHex);
    setAuthItem(HASH_KEY, hash);
    setAuthItem(INITIALIZED_KEY, 'true');
    return true;
  } catch (err) {
    console.error('Failed to initialize account security:', err);
    return false;
  }
}

export async function verifyCredentials(password: string): Promise<boolean> {
  try {
    const saltHex = getAuthItem(SALT_KEY);
    const storedHash = getAuthItem(HASH_KEY);

    // If first-time initialization with default setup credentials
    if (!saltHex || !storedHash) {
      if (password === 'arun4709s') {
        await setupInitialAccount(password);
        return true;
      }
      return false;
    }

    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    const computedHash = await deriveKey(password, salt);

    return computedHash === storedHash;
  } catch (err) {
    console.error('Credential verification error:', err);
    return false;
  }
}
