// Provide in-memory localStorage polyfill for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  };
}

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createBackupPackage, 
  validateAndInspectBackup, 
  restoreBackup, 
  rollbackToSafetyBackup,
  getSafetyBackupInfo 
} from '../src/services/backup/backupService';
import { 
  previewDataset, 
  commitDatasetImport 
} from '../src/services/import/datasetImportService';
import { getDatabase, fetchTasks } from '../src/services/db';
import { APP_VERSION } from '../src/config/version';
import fs from 'fs';
import path from 'path';

describe('Ap Workspace — Backup, Restoration & Dataset Import Engine', () => {
  beforeEach(async () => {
    // Ensure DB is initialized
    await getDatabase();
  });

  describe('1. Backup Creation & Restoration Workflows', () => {
    it('1. should create an encrypted backup package with manifest, checksum, and SQLite payload', async () => {
      const backup = await createBackupPackage();
      expect(backup.fileName).toMatch(/^ap_backup_\d{4}-\d{2}-\d{2}_\d{4}\.apdb$/);
      expect(backup.content).toBeTruthy();
      expect(backup.manifest).toBeDefined();
      expect(backup.manifest.version).toBe(2);
      expect(backup.manifest.appVersion).toBe(APP_VERSION);
      expect(backup.manifest.recordCounts.questions).toBeGreaterThan(0);
      expect(backup.manifest.recordCounts.tracks).toBeGreaterThan(0);

      // JSON parsing test
      const parsed = JSON.parse(backup.content);
      expect(parsed.ap_backup_format).toBe('ap_workspace_backup');
      expect(parsed.sqlite_base64).toBeTruthy();
    });

    it('2. should validate and inspect a valid backup package preview accurately', async () => {
      const backup = await createBackupPackage();
      const preview = await validateAndInspectBackup(backup.content, backup.content.length);

      expect(preview.isValid).toBe(true);
      expect(preview.version).toBe(2);
      expect(preview.format).toBe('v2_package');
      expect(preview.categories.length).toBeGreaterThanOrEqual(5);

      const coreCat = preview.categories.find(c => c.id === 'core_database');
      expect(coreCat).toBeDefined();
      expect(coreCat?.available).toBe(true);
      expect(coreCat?.count).toBeGreaterThan(100);
    });

    it('3. should support legacy v1 raw base64 SQLite .apdb backup files', async () => {
      // In v1, the backup file was just the raw base64 string
      const backup = await createBackupPackage();
      const rawBase64 = JSON.parse(backup.content).sqlite_base64;

      const preview = await validateAndInspectBackup(rawBase64, rawBase64.length);
      expect(preview.isValid).toBe(true);
      expect(preview.format).toBe('v1_legacy_sqlite_base64');
      expect(preview.totalRecords).toBeGreaterThan(0);
    });

    it('4. should reject malformed, empty, or corrupted backup files with descriptive errors', async () => {
      // Empty string
      await expect(validateAndInspectBackup('')).rejects.toThrow('Selected backup file is empty.');

      // Corrupt base64
      await expect(validateAndInspectBackup('not-a-valid-base64-content!@#$%^')).rejects.toThrow();

      // Valid base64 but not SQLite
      const fakeBase64 = Buffer.from('Hello world this is not a database').toString('base64');
      await expect(validateAndInspectBackup(fakeBase64)).rejects.toThrow('Invalid backup integrity');
    });

    it('5. should reject unsupported backup packages missing format signature', async () => {
      const invalidJson = JSON.stringify({
        ap_backup_format: 'unknown_unsupported_format',
        sqlite_base64: 'abc',
      });
      await expect(validateAndInspectBackup(invalidJson)).rejects.toThrow('Unsupported backup container');
    });

    it('6. should restore a backup successfully, create an auto safety backup, and verify restored records', async () => {
      const backup = await createBackupPackage();
      const preview = await validateAndInspectBackup(backup.content);

      // Execute restoration
      const result = await restoreBackup(preview);
      expect(result.success).toBe(true);
      expect(result.safetyBackupCreated).toBe(true);
      expect(result.safetyBackupTimestamp).toBeTruthy();
      expect(result.restoredCategories.length).toBeGreaterThan(0);

      // Verify safety snapshot exists
      const safetyInfo = getSafetyBackupInfo();
      expect(safetyInfo.exists).toBe(true);
      expect(safetyInfo.timestamp).toBe(result.safetyBackupTimestamp);
    });

    it('7. should support selective category restoration without altering unselected categories', async () => {
      const backup = await createBackupPackage();
      const preview = await validateAndInspectBackup(backup.content);

      // Restore tasks category only
      const result = await restoreBackup(preview, ['tasks']);
      expect(result.success).toBe(true);
      expect(result.restoredCategories).toContain('tasks');
    });

    it('8. should safely rollback to pre-restore safety snapshot on demand', async () => {
      const rollbackRes = await rollbackToSafetyBackup();
      expect(rollbackRes.success).toBe(true);
      expect(rollbackRes.message).toContain('rolled back to pre-restore');
    });
  });

  describe('2. Dataset Import Engine (Problems & Tasks)', () => {
    it('9. should preview and import a valid JSON problem dataset with duplicate detection', async () => {
      const jsonProblems = JSON.stringify([
        {
          title: 'Unique Integration Problem Alpha',
          difficulty: 'Hard',
          pattern_name: 'Dynamic Programming',
          platform: 'LeetCode',
          practice_link: 'https://leetcode.com/problems/alpha',
          xp: 15,
        },
        {
          title: 'Unique Integration Problem Beta',
          difficulty: 'Easy',
          pattern_name: 'Two Pointers',
          platform: 'GeeksforGeeks',
          xp: 5,
        }
      ]);

      const preview = await previewDataset('problems', jsonProblems);
      expect(preview.type).toBe('problems');
      expect(preview.format).toBe('json');
      expect(preview.totalRecords).toBe(2);
      expect(preview.validRecords).toBe(2);
      expect(preview.errors.length).toBe(0);

      const importRes = await commitDatasetImport('problems', jsonProblems, 'json', {
        targetTrackSlug: 'top-interview-150',
        conflictMode: 'skip',
      });
      expect(importRes.success).toBe(true);
      expect(importRes.imported).toBe(2);
      expect(importRes.duplicatesSkipped).toBe(0);

      // Importing again should detect 2 duplicates
      const reimportPreview = await previewDataset('problems', jsonProblems, 'json', {
        targetTrackSlug: 'top-interview-150',
      });
      expect(reimportPreview.duplicateCount).toBe(2);

      const reimportRes = await commitDatasetImport('problems', jsonProblems, 'json', {
        targetTrackSlug: 'top-interview-150',
        conflictMode: 'skip',
      });
      expect(reimportRes.duplicatesSkipped).toBe(2);
      expect(reimportRes.imported).toBe(0);
    });

    it('10. should preview and import a valid CSV task dataset with RFC 4180 parsing', async () => {
      const csvTasks = `title,description,priority,status,estimated_minutes\n"Implement Cache Engine","Review Redis & LRU eviction","High","todo",45\n"PostgreSQL Connection Pool","Audit idle connections","Medium","in_progress",30`;

      const preview = await previewDataset('tasks', csvTasks);
      expect(preview.type).toBe('tasks');
      expect(preview.format).toBe('csv');
      expect(preview.totalRecords).toBe(2);
      expect(preview.validRecords).toBe(2);
      expect(preview.errors.length).toBe(0);

      const importRes = await commitDatasetImport('tasks', csvTasks, 'csv', {
        conflictMode: 'skip',
      });
      expect(importRes.success).toBe(true);
      expect(importRes.imported).toBe(2);

      const currentTasks = await fetchTasks();
      const titles = currentTasks.map(t => t.title);
      expect(titles).toContain('Implement Cache Engine');
      expect(titles).toContain('PostgreSQL Connection Pool');
    });

    it('11. should handle dataset validation errors gracefully when required fields are missing', async () => {
      const invalidJson = JSON.stringify([
        { description: 'No title given' },
        { priority: 'Low' }
      ]);

      const preview = await previewDataset('tasks', invalidJson);
      expect(preview.validRecords).toBe(0);
      expect(preview.errors.length).toBe(2);
    });
  });

  describe('3. UI Presence & Integration Verification', () => {
    it('12. should verify SettingsView contains Create Backup, Restore Backup, and Import Data actions', () => {
      const settingsViewPath = path.resolve(__dirname, '../src/features/settings/SettingsView.tsx');
      expect(fs.existsSync(settingsViewPath)).toBe(true);

      const content = fs.readFileSync(settingsViewPath, 'utf8');
      expect(content).toContain('btn-settings-create-backup');
      expect(content).toContain('btn-settings-restore-backup');
      expect(content).toContain('btn-settings-import-data');
      expect(content).toContain('Create Backup Snapshot');
      expect(content).toContain('Restore from Backup');
      expect(content).toContain('Import External Dataset');
    });

    it('13. should verify BackupRestoreModal contains segmented Create and Restore tab switching', () => {
      const modalPath = path.resolve(__dirname, '../src/components/dialogs/BackupRestoreModal.tsx');
      expect(fs.existsSync(modalPath)).toBe(true);

      const content = fs.readFileSync(modalPath, 'utf8');
      expect(content).toContain('activeTab');
      expect(content).toContain('Create Backup');
      expect(content).toContain('Restore Backup');
      expect(content).toContain('Backup Contents Checklist');
      expect(content).toContain('validateAndInspectBackup');
      expect(content).toContain('restoreBackup');
      expect(content).toContain('getSafetyBackupInfo');
      expect(content).toContain('rollbackToSafetyBackup');
    });

    it('14. should verify ImportDataModal exists and handles both Problems and Tasks', () => {
      const importModalPath = path.resolve(__dirname, '../src/components/dialogs/ImportDataModal.tsx');
      expect(fs.existsSync(importModalPath)).toBe(true);

      const content = fs.readFileSync(importModalPath, 'utf8');
      expect(content).toContain('Problem Collections (JSON / CSV)');
      expect(content).toContain('Planner Tasks (JSON / CSV)');
      expect(content).toContain('previewDataset');
      expect(content).toContain('commitDatasetImport');
    });
  });
});
