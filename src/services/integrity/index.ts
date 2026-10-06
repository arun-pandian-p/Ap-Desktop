import { IntegrityStatus } from '@/types';

export function getIntegrityDiagnostics(): IntegrityStatus {
  return {
    state: 'Healthy',
    score: 98,
    signature_ok: true,
    manifest_ok: true,
    db_chain_ok: true,
    interpreter_ok: true,
    last_check: new Date().toISOString(),
  };
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'LICENSE_VERIFY' | 'INTEGRITY_CHECK' | 'SANDBOX_EXEC' | 'DB_BACKUP' | 'SECRET_READ';
  status: 'SUCCESS' | 'WARNING' | 'BLOCKED';
  summary: string;
}

export function getRecentSecurityEvents(): SecurityEvent[] {
  return [
    {
      id: 'sec-1',
      timestamp: 'Just now',
      type: 'INTEGRITY_CHECK',
      status: 'SUCCESS',
      summary: 'Verified SHA-256 release manifest against local asset signatures.',
    },
    {
      id: 'sec-2',
      timestamp: '2 mins ago',
      type: 'LICENSE_VERIFY',
      status: 'SUCCESS',
      summary: 'ECDSA P-256 signature verified for Pro Plan token. Machine bound.',
    },
    {
      id: 'sec-3',
      timestamp: '15 mins ago',
      type: 'DB_BACKUP',
      status: 'SUCCESS',
      summary: 'HMAC-SHA256 row chain verified across 1,337 problem records.',
    },
    {
      id: 'sec-4',
      timestamp: '1 hour ago',
      type: 'SANDBOX_EXEC',
      status: 'SUCCESS',
      summary: 'CPython worker spawned in Low-Integrity restricted Job Object.',
    },
  ];
}
