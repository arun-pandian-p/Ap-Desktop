import { describe, it, expect, beforeEach } from 'vitest';
import { verifyCredentials, setupInitialAccount, isAuthInitialized, clearAuthForTesting } from '../src/services/auth';
import { saveCodeDraft, getCodeDraft, clearCodeDraft } from '../src/services/db';
import { studyMusicService } from '../src/services/audio/studyMusicService';

describe('Ap Workspace — Safe Feature Enhancement Suite', () => {
  beforeEach(async () => {
    clearAuthForTesting();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {}
  });

  describe('Phase 1: PBKDF2 Authentication', () => {
    it('should verify initial setup credentials securely with PBKDF2', async () => {
      const isValidInitial = await verifyCredentials('arun4709s');
      expect(isValidInitial).toBe(true);

      const isInit = await isAuthInitialized();
      expect(isInit).toBe(true);

      // Verify wrong password fails
      const isInvalid = await verifyCredentials('wrongPassword');
      expect(isInvalid).toBe(false);
    });

    it('should allow custom account setup and authenticate with derived keys', async () => {
      await setupInitialAccount('secureSuperPass123!');
      const success = await verifyCredentials('secureSuperPass123!');
      expect(success).toBe(true);

      const fail = await verifyCredentials('wrongPass');
      expect(fail).toBe(false);
    });
  });

  describe('Phase 2: Custom Study Audio Management', () => {
    it('should manage custom track import and playback list without mutating defaults', async () => {
      const fakeFile = new File(['dummy audio content'], 'night_focus.mp3', { type: 'audio/mp3' });
      const track = await studyMusicService.importAudioFile(fakeFile);

      expect(track.id).toContain('custom-');
      expect(track.title).toBe('night_focus');
      expect(track.playlist).toBe('imported');

      const customList = studyMusicService.getCustomTracks();
      expect(customList.length).toBeGreaterThanOrEqual(1);
      expect(customList.some(t => t.id === track.id)).toBe(true);

      studyMusicService.deleteCustomTrack(track.id);
      const updatedList = studyMusicService.getCustomTracks();
      expect(updatedList.some(t => t.id === track.id)).toBe(false);
    });
  });

  describe('Phase 4: Persistent Code Drafts', () => {
    it('should save, retrieve, and clear Python and SQL drafts in SQLite', async () => {
      const pyCode = 'def solution():\n    return 42\n';
      const sqlCode = 'SELECT name, salary FROM Employee WHERE salary > 50000;';

      // Save drafts
      await saveCodeDraft('prob-1', 'python', pyCode);
      await saveCodeDraft('sql-175', 'sql', sqlCode);

      // Retrieve drafts
      const savedPy = await getCodeDraft('prob-1', 'python');
      const savedSql = await getCodeDraft('sql-175', 'sql');

      expect(savedPy).toBe(pyCode);
      expect(savedSql).toBe(sqlCode);

      // Non-existent problem returns null
      const nonExistent = await getCodeDraft('prob-9999', 'python');
      expect(nonExistent).toBeNull();

      // Clear draft
      await clearCodeDraft('prob-1', 'python');
      const clearedPy = await getCodeDraft('prob-1', 'python');
      expect(clearedPy).toBeNull();

      // SQL draft remains intact
      expect(await getCodeDraft('sql-175', 'sql')).toBe(sqlCode);
    });
  });
});
