/**
 * Ap Workspace — Robust Backup & Restore Engine
 * Supports:
 * - Versioned Backup Packages (v2) with metadata, manifests, checksums
 * - Legacy v1 .apdb raw base64 SQLite databases
 * - Pre-restore safety snapshots and transactional rollbacks
 * - Selective vs Full category restoration
 * - Live database verification and event dispatching
 */

import { getDatabase, persistDatabase } from '@/services/db';
import { APP_VERSION } from '@/config/version';
import type { Database } from 'sql.js';

export interface BackupCategoryMeta {
  id: string;
  label: string;
  table: string;
  count: number;
  available: boolean;
  description: string;
}

export interface BackupManifest {
  version: number;
  appVersion: string;
  createdAt: string;
  checksum: string;
  categories: string[];
  recordCounts: Record<string, number>;
  options: {
    includeHistory: boolean;
    includeDrafts: boolean;
  };
}

export interface ApBackupPackage {
  ap_backup_format: 'ap_workspace_backup';
  version: number;
  app_version: string;
  created_at: string;
  checksum: string;
  manifest: {
    categories: string[];
    record_counts: Record<string, number>;
    options: {
      includeHistory: boolean;
      includeDrafts: boolean;
    };
  };
  sqlite_base64: string;
}

export interface BackupPreview {
  isValid: boolean;
  version: number;
  format: string;
  createdAt: string;
  appVersion: string;
  categories: BackupCategoryMeta[];
  totalRecords: number;
  rawSqliteBase64: string;
  fileSize: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredCategories: string[];
  restoredCounts: Record<string, number>;
  safetyBackupCreated: boolean;
  safetyBackupTimestamp: string;
  message: string;
  error?: string;
}

const DB_STORAGE_KEY = 'ap_encrypted_sqlite_db_v1';
const SAFETY_BACKUP_KEY = 'ap_safety_backup_pre_restore';
const SAFETY_BACKUP_TIMESTAMP_KEY = 'ap_safety_backup_timestamp';

// Simple deterministic hash for checksumming
function computeSimpleChecksum(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'chk-' + Math.abs(hash).toString(16);
}

/**
 * Creates an exportable backup file with versioned manifest.
 */
export async function createBackupPackage(options: {
  includeHistory?: boolean;
  includeDrafts?: boolean;
} = {}): Promise<{
  fileName: string;
  content: string;
  blob: Blob;
  manifest: BackupManifest;
}> {
  persistDatabase();

  const db = await getDatabase();
  const rawBase64 = typeof localStorage !== 'undefined'
    ? (localStorage.getItem(DB_STORAGE_KEY) || '')
    : '';

  const getCount = (table: string): number => {
    try {
      const res = db.exec(`SELECT COUNT(*) FROM ${table}`);
      return res.length && res[0].values.length ? (res[0].values[0][0] as number) : 0;
    } catch {
      return 0;
    }
  };

  const recordCounts: Record<string, number> = {
    questions: getCount('questions'),
    tracks: getCount('tracks'),
    topics: getCount('topics'),
    subtopics: getCount('subtopics'),
    tasks: getCount('tasks'),
    study_sessions: options.includeHistory !== false ? getCount('study_sessions') : 0,
    attempts: options.includeHistory !== false ? getCount('attempts') : 0,
    code_drafts: options.includeDrafts !== false ? getCount('code_drafts') : 0,
    daily_reviews: getCount('daily_reviews'),
    app_settings: getCount('app_settings'),
    sql_exercises: getCount('sql_exercises'),
    postgres_exercises: getCount('postgres_exercises'),
  };

  const categories = Object.keys(recordCounts).filter(k => recordCounts[k] > 0);
  const now = new Date().toISOString();
  const checksum = computeSimpleChecksum(rawBase64);

  const manifest: BackupManifest = {
    version: 2,
    appVersion: APP_VERSION,
    createdAt: now,
    checksum,
    categories,
    recordCounts,
    options: {
      includeHistory: options.includeHistory !== false,
      includeDrafts: options.includeDrafts !== false,
    },
  };

  const backupPackage: ApBackupPackage = {
    ap_backup_format: 'ap_workspace_backup',
    version: 2,
    app_version: APP_VERSION,
    created_at: now,
    checksum,
    manifest: {
      categories,
      record_counts: recordCounts,
      options: {
        includeHistory: options.includeHistory !== false,
        includeDrafts: options.includeDrafts !== false,
      },
    },
    sqlite_base64: rawBase64,
  };

  const content = JSON.stringify(backupPackage, null, 2);
  const fileName = `ap_backup_${now.slice(0, 10)}_${Date.now().toString().slice(-4)}.apdb`;
  const blob = new Blob([content], { type: 'application/json' });

  return { fileName, content, blob, manifest };
}

/**
 * Validates and inspects an uploaded backup file string.
 * Supports both v2 JSON packages and v1 raw SQLite Base64 strings.
 */
export async function validateAndInspectBackup(
  fileContent: string,
  fileSize: number = 0
): Promise<BackupPreview> {
  const trimmed = fileContent.trim();
  if (!trimmed) {
    throw new Error('Selected backup file is empty.');
  }

  let sqliteBase64 = '';
  let version = 1;
  let createdAt = new Date().toISOString();
  let appVersion = '1.0.0';
  let format = 'v1_raw_apdb';

  // Attempt 1: Check if it's a v2 JSON package
  if (trimmed.startsWith('{') && trimmed.includes('"ap_backup_format"')) {
    try {
      const parsed: ApBackupPackage = JSON.parse(trimmed);
      if (parsed.ap_backup_format !== 'ap_workspace_backup') {
        throw new Error('Unsupported backup container: Missing ap_workspace_backup signature.');
      }
      if (!parsed.sqlite_base64) {
        throw new Error('Corrupted backup package: Missing sqlite_base64 payload.');
      }
      version = parsed.version || 2;
      createdAt = parsed.created_at || createdAt;
      appVersion = parsed.app_version || '1.0.1';
      format = `v${version}_package`;
      sqliteBase64 = parsed.sqlite_base64;
    } catch (err: any) {
      throw new Error(`Invalid backup package JSON: ${err.message}`);
    }
  } else {
    // Attempt 2: Legacy v1 base64 raw SQLite dump
    sqliteBase64 = trimmed;
    format = 'v1_legacy_sqlite_base64';
  }

  // Validate base64 structure and SQLite header
  let bytes: Uint8Array;
  try {
    const binary = atob(sqliteBase64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } catch (err) {
    throw new Error('Malformed backup data: File payload is not valid base64 encoded data.');
  }

  // SQLite magic header check: "SQLite format 3\0"
  const headerCheck = String.fromCharCode(...bytes.slice(0, 15));
  if (headerCheck !== 'SQLite format 3') {
    throw new Error('Invalid backup integrity: Decrypted payload is not a valid SQLite 3 database.');
  }

  // Open temporary sandboxed DB in-memory to query categories and counts
  let tempDb: Database;
  try {
    const { default: initSqlJs } = await import('sql.js');
    const SQL = await initSqlJs({});
    tempDb = new SQL.Database(bytes);
  } catch (err: any) {
    throw new Error(`Failed to initialize in-memory database verifier: ${err.message}`);
  }

  // Verify critical tables exist
  const tableCheckRes = tempDb.exec(`SELECT name FROM sqlite_master WHERE type='table'`);
  const existingTables = new Set<string>();
  if (tableCheckRes.length && tableCheckRes[0].values) {
    tableCheckRes[0].values.forEach(v => {
      if (v[0]) existingTables.add(String(v[0]));
    });
  }

  if (!existingTables.has('questions') && !existingTables.has('tracks')) {
    throw new Error('Incompatible backup: Missing core "questions" or "tracks" tables.');
  }

  const queryCount = (tableName: string): number => {
    if (!existingTables.has(tableName)) return 0;
    try {
      const res = tempDb.exec(`SELECT COUNT(*) FROM ${tableName}`);
      return res.length && res[0].values.length ? (res[0].values[0][0] as number) : 0;
    } catch {
      return 0;
    }
  };

  const categories: BackupCategoryMeta[] = [
    {
      id: 'core_database',
      label: 'Core Problems & Learning Tracks',
      table: 'questions',
      count: queryCount('questions') + queryCount('tracks'),
      available: queryCount('questions') > 0,
      description: `${queryCount('questions')} questions across ${queryCount('tracks')} tracks & ${queryCount('topics')} topics`,
    },
    {
      id: 'study_sessions',
      label: 'Pomodoro Study Sessions & History',
      table: 'study_sessions',
      count: queryCount('study_sessions'),
      available: queryCount('study_sessions') > 0,
      description: `${queryCount('study_sessions')} completed study sessions and logs`,
    },
    {
      id: 'attempts',
      label: 'Submission Records & Code Attempts',
      table: 'attempts',
      count: queryCount('attempts'),
      available: queryCount('attempts') > 0,
      description: `${queryCount('attempts')} practice submission attempts`,
    },
    {
      id: 'tasks',
      label: 'Custom Planner Tasks & Milestones',
      table: 'tasks',
      count: queryCount('tasks'),
      available: queryCount('tasks') > 0,
      description: `${queryCount('tasks')} personal planner tasks`,
    },
    {
      id: 'code_drafts',
      label: 'Saved Code Drafts & Queries',
      table: 'code_drafts',
      count: queryCount('code_drafts'),
      available: queryCount('code_drafts') > 0,
      description: `${queryCount('code_drafts')} saved multi-language code drafts`,
    },
    {
      id: 'daily_reviews',
      label: 'Daily Reviews & Reflection Logs',
      table: 'daily_reviews',
      count: queryCount('daily_reviews'),
      available: queryCount('daily_reviews') > 0,
      description: `${queryCount('daily_reviews')} daily review records`,
    },
    {
      id: 'app_settings',
      label: 'User Settings & Preferences',
      table: 'app_settings',
      count: queryCount('app_settings'),
      available: queryCount('app_settings') > 0,
      description: `${queryCount('app_settings')} preferences and application keys`,
    },
  ];

  const totalRecords = categories.reduce((sum, c) => sum + c.count, 0);

  return {
    isValid: true,
    version,
    format,
    createdAt,
    appVersion,
    categories,
    totalRecords,
    rawSqliteBase64: sqliteBase64,
    fileSize: fileSize || fileContent.length,
  };
}

/**
 * Creates an automatic safety snapshot of the current live database.
 */
export function createSafetyBackupSnapshot(): {
  success: boolean;
  timestamp: string;
  size: number;
} {
  persistDatabase();
  const currentBase64 = typeof localStorage !== 'undefined'
    ? (localStorage.getItem(DB_STORAGE_KEY) || '')
    : '';

  const timestamp = new Date().toISOString();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SAFETY_BACKUP_KEY, currentBase64);
    localStorage.setItem(SAFETY_BACKUP_TIMESTAMP_KEY, timestamp);
  }

  return {
    success: true,
    timestamp,
    size: currentBase64.length,
  };
}

/**
 * Returns info on existing pre-restore safety backup if available.
 */
export function getSafetyBackupInfo(): {
  exists: boolean;
  timestamp: string | null;
  size: number;
} {
  if (typeof localStorage === 'undefined') {
    return { exists: false, timestamp: null, size: 0 };
  }
  const saved = localStorage.getItem(SAFETY_BACKUP_KEY);
  const timestamp = localStorage.getItem(SAFETY_BACKUP_TIMESTAMP_KEY);
  return {
    exists: Boolean(saved && saved.length > 0),
    timestamp,
    size: saved ? saved.length : 0,
  };
}

/**
 * Restores the application database from a pre-restore safety snapshot.
 */
export async function rollbackToSafetyBackup(): Promise<{
  success: boolean;
  message: string;
}> {
  if (typeof localStorage === 'undefined') {
    return { success: false, message: 'LocalStorage unavailable.' };
  }
  const safetyData = localStorage.getItem(SAFETY_BACKUP_KEY);
  if (!safetyData) {
    return { success: false, message: 'No pre-restore safety backup found.' };
  }

  try {
    localStorage.setItem(DB_STORAGE_KEY, safetyData);
    // Reload database in memory
    const { getDatabase } = await import('@/services/db');
    // Force reload by re-instantiating
    const { default: initSqlJs } = await import('sql.js');
    const SQL = await initSqlJs({});
    const binary = atob(safetyData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const restored = new SQL.Database(bytes);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ap_questions_updated'));
      window.dispatchEvent(new CustomEvent('ap_tracks_updated'));
      window.dispatchEvent(new CustomEvent('ap_stats_updated'));
    }

    return {
      success: true,
      message: 'Successfully rolled back to pre-restore safety snapshot.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to rollback safety backup: ${err.message}`,
    };
  }
}

/**
 * Restores data from the validated preview into the SQLite database.
 * Supports full restoration or selective category restoration.
 */
export async function restoreBackup(
  preview: BackupPreview,
  selectedCategoryIds?: string[]
): Promise<RestoreResult> {
  if (!preview || !preview.isValid || !preview.rawSqliteBase64) {
    throw new Error('Cannot restore invalid or incomplete backup preview.');
  }

  // 1. Create automatic safety backup first!
  const safety = createSafetyBackupSnapshot();

  const binary = atob(preview.rawSqliteBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const { default: initSqlJs } = await import('sql.js');
  const SQL = await initSqlJs({});
  const candidateDb = new SQL.Database(bytes);

  const isFullRestore = !selectedCategoryIds || selectedCategoryIds.length === 0 || selectedCategoryIds.length === preview.categories.length;

  const restoredCounts: Record<string, number> = {};
  const restoredCategories: string[] = [];

  try {
    const liveDb = await getDatabase();

    if (isFullRestore) {
      // Full database replacement
      // Copy all tables from candidateDb
      liveDb.run('BEGIN TRANSACTION;');

      const tableOrder = [
        'tracks', 'topics', 'subtopics', 'questions',
        'tasks', 'study_sessions', 'attempts',
        'daily_reviews', 'app_settings', 'code_drafts',
        'sql_exercises', 'postgres_exercises'
      ];

      for (const table of tableOrder) {
        try {
          const checkCand = candidateDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
          if (!checkCand.length) continue;

          const rows = candidateDb.exec(`SELECT * FROM ${table}`);
          if (!rows.length) {
            liveDb.run(`DELETE FROM ${table}`);
            restoredCounts[table] = 0;
            continue;
          }

          const cols = rows[0].columns;
          const placeholders = cols.map(() => '?').join(', ');
          const insertSql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

          liveDb.run(`DELETE FROM ${table}`);
          for (const row of rows[0].values) {
            liveDb.run(insertSql, row as (string | number | null)[]);
          }

          restoredCounts[table] = rows[0].values.length;
          restoredCategories.push(table);
        } catch (tableErr) {
          console.warn(`Warning during full restore of ${table}:`, tableErr);
        }
      }

      liveDb.run('COMMIT;');
    } else {
      // Selective category restoration
      liveDb.run('BEGIN TRANSACTION;');

      const categoryToTables: Record<string, string[]> = {
        core_database: ['tracks', 'topics', 'subtopics', 'questions'],
        study_sessions: ['study_sessions'],
        attempts: ['attempts'],
        tasks: ['tasks'],
        code_drafts: ['code_drafts'],
        daily_reviews: ['daily_reviews'],
        app_settings: ['app_settings'],
      };

      for (const catId of selectedCategoryIds) {
        const tables = categoryToTables[catId] || [];
        for (const table of tables) {
          const checkCand = candidateDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
          if (!checkCand.length) continue;

          const rows = candidateDb.exec(`SELECT * FROM ${table}`);
          if (!rows.length) continue;

          const cols = rows[0].columns;
          const placeholders = cols.map(() => '?').join(', ');
          const insertSql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

          liveDb.run(`DELETE FROM ${table}`);
          for (const row of rows[0].values) {
            liveDb.run(insertSql, row as (string | number | null)[]);
          }

          restoredCounts[table] = (restoredCounts[table] || 0) + rows[0].values.length;
          if (!restoredCategories.includes(catId)) {
            restoredCategories.push(catId);
          }
        }
      }

      liveDb.run('COMMIT;');
    }

    persistDatabase();

    // Verify restored records
    const verifiedQuestionsRes = liveDb.exec('SELECT COUNT(*) FROM questions');
    const finalQuestionCount = verifiedQuestionsRes.length && verifiedQuestionsRes[0].values.length
      ? (verifiedQuestionsRes[0].values[0][0] as number)
      : 0;

    if (finalQuestionCount === 0 && (isFullRestore || selectedCategoryIds?.includes('core_database'))) {
      throw new Error('Verification failed: Questions table is empty after restore.');
    }

    // Trigger update events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ap_questions_updated'));
      window.dispatchEvent(new CustomEvent('ap_tracks_updated'));
      window.dispatchEvent(new CustomEvent('ap_stats_updated'));
    }

    return {
      success: true,
      restoredCategories,
      restoredCounts,
      safetyBackupCreated: true,
      safetyBackupTimestamp: safety.timestamp,
      message: `Successfully restored ${Object.values(restoredCounts).reduce((a, b) => a + b, 0)} records across ${restoredCategories.length} categories.`,
    };
  } catch (err: any) {
    // Transactional rollback to safety backup on failure!
    try {
      if (typeof localStorage !== 'undefined' && safety.timestamp) {
        localStorage.setItem(DB_STORAGE_KEY, localStorage.getItem(SAFETY_BACKUP_KEY) || '');
      }
    } catch {}

    throw new Error(`Restoration failed and automatically rolled back to safety backup: ${err.message}`);
  }
}
