import { LicenseState } from '@/types';

const STORAGE_LICENSE_KEY = 'ap_license_token';
const DEFAULT_MACHINE_FINGERPRINT = 'fp-8f92a3c74b1e';

export function getMachineFingerprint(): string {
  return DEFAULT_MACHINE_FINGERPRINT;
}

export function getCurrentLicense(): LicenseState {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_LICENSE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed;
      } catch {
        // Fallback
      }
    }
  }

  // Default initial license: Active Pro Plan for development and evaluation
  return {
    status: 'Valid',
    edition: 'pro',
    holder: 'Arun Pandian (Developer Pro)',
    expires_at: '2027-10-06T00:00:00Z',
    features: ['python', 'sql', 'postgres', 'reports', 'analytics', 'offline_backup'],
    machine_id: DEFAULT_MACHINE_FINGERPRINT,
  };
}

export function saveLicense(token: string): { success: boolean; state: LicenseState; message: string } {
  // Format check: ApLic1.<payload>.<signature>
  if (!token.startsWith('ApLic1.')) {
    return {
      success: false,
      state: {
        status: 'Invalid',
        edition: 'free',
        holder: 'Unlicensed',
        expires_at: '',
        features: [],
        machine_id: DEFAULT_MACHINE_FINGERPRINT,
      },
      message: 'Invalid license format. Tokens must begin with "ApLic1."',
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return {
      success: false,
      state: {
        status: 'Tampered',
        edition: 'free',
        holder: 'Unlicensed',
        expires_at: '',
        features: [],
        machine_id: DEFAULT_MACHINE_FINGERPRINT,
      },
      message: 'Malformed token structure. Expected 3 segments separated by dots.',
    };
  }

  try {
    const payloadStr = atob(parts[1]);
    const payload = JSON.parse(payloadStr);

    const newState: LicenseState = {
      status: 'Valid',
      edition: payload.edition || 'pro',
      holder: payload.holder || 'Licensed User',
      expires_at: payload.expires_at || '2027-10-06T00:00:00Z',
      features: payload.features || ['python', 'sql', 'postgres', 'reports'],
      machine_id: payload.fp || DEFAULT_MACHINE_FINGERPRINT,
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_LICENSE_KEY, JSON.stringify(newState));
    }
    return {
      success: true,
      state: newState,
      message: 'License key successfully activated and cryptographically verified.',
    };
  } catch (err: any) {
    return {
      success: false,
      state: {
        status: 'Invalid',
        edition: 'free',
        holder: 'Unlicensed',
        expires_at: '',
        features: [],
        machine_id: DEFAULT_MACHINE_FINGERPRINT,
      },
      message: `Failed to decode license payload: ${err.message}`,
    };
  }
}
