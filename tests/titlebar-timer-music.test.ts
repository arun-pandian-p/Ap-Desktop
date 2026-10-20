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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { focusTimerService } from '../src/services/timer/focusTimerService';
import { studyMusicService } from '../src/services/audio/studyMusicService';

describe('Ap Workspace — Title Bar, Study Timer & Background Music Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    focusTimerService.reset();
    studyMusicService.pause();
  });

  describe('1. Global Centralized Focus Timer Engine', () => {
    it('should initialize with accurate default 25-minute focus state', () => {
      const state = focusTimerService.getState();
      expect(state.mode).toBe('focus');
      expect(state.isRunning).toBe(false);
      expect(state.remainingSeconds).toBe(25 * 60);
      expect(state.totalDurationSeconds).toBe(25 * 60);
    });

    it('should start, calculate deadline via targetTimestamp, and transition to running', () => {
      focusTimerService.start();
      const state = focusTimerService.getState();
      expect(state.isRunning).toBe(true);
      expect(state.targetTimestamp).toBeGreaterThan(Date.now());
      // Remaining seconds should match deadline difference
      const expectedRemaining = Math.ceil((state.targetTimestamp! - Date.now()) / 1000);
      expect(Math.abs(state.remainingSeconds - expectedRemaining)).toBeLessThanOrEqual(1);
    });

    it('should pause and preserve remaining time without resetting to zero', () => {
      focusTimerService.start();
      // Fast forward slightly
      const runningState = focusTimerService.getState();
      expect(runningState.isRunning).toBe(true);

      focusTimerService.pause();
      const pausedState = focusTimerService.getState();
      expect(pausedState.isRunning).toBe(false);
      expect(pausedState.targetTimestamp).toBeNull();
      expect(pausedState.remainingSeconds).toBeGreaterThan(0);
      expect(pausedState.remainingSeconds).toBeLessThanOrEqual(25 * 60);
    });

    it('should resume from paused remaining time accurately', () => {
      focusTimerService.start();
      focusTimerService.pause();
      const pausedSeconds = focusTimerService.getState().remainingSeconds;

      // Resume
      focusTimerService.start();
      const resumedState = focusTimerService.getState();
      expect(resumedState.isRunning).toBe(true);
      const expectedDeadline = Date.now() + pausedSeconds * 1000;
      expect(Math.abs(resumedState.targetTimestamp! - expectedDeadline)).toBeLessThan(100);
    });

    it('should reset back to full duration cleanly', () => {
      focusTimerService.start();
      focusTimerService.pause();
      focusTimerService.reset();

      const state = focusTimerService.getState();
      expect(state.isRunning).toBe(false);
      expect(state.remainingSeconds).toBe(25 * 60);
      expect(state.targetTimestamp).toBeNull();
    });

    it('should switch between focus, short_break, and long_break modes accurately', () => {
      focusTimerService.setMode('short_break');
      expect(focusTimerService.getState().mode).toBe('short_break');
      expect(focusTimerService.getState().totalDurationSeconds).toBe(5 * 60);
      expect(focusTimerService.getState().remainingSeconds).toBe(5 * 60);

      focusTimerService.setMode('long_break');
      expect(focusTimerService.getState().mode).toBe('long_break');
      expect(focusTimerService.getState().totalDurationSeconds).toBe(15 * 60);
      expect(focusTimerService.getState().remainingSeconds).toBe(15 * 60);

      focusTimerService.setMode('focus');
      expect(focusTimerService.getState().mode).toBe('focus');
      expect(focusTimerService.getState().totalDurationSeconds).toBe(25 * 60);
    });

    it('should persist active state to localStorage so accidental reloads or navigation do not reset', () => {
      focusTimerService.start();
      const savedRaw = localStorage.getItem('ap_focus_timer_active_state');
      expect(savedRaw).toBeTruthy();
      const saved = JSON.parse(savedRaw!);
      expect(saved.isRunning).toBe(true);
      expect(saved.mode).toBe('focus');
      expect(saved.targetTimestamp).toBeGreaterThan(Date.now());
    });

    it('should update and notify all subscribers synchronously', () => {
      const listener = vi.fn();
      const unsub = focusTimerService.subscribe(listener);

      // Initial call on subscribe
      expect(listener).toHaveBeenCalled();
      const initialCallCount = listener.mock.calls.length;

      focusTimerService.toggle();
      expect(listener.mock.calls.length).toBeGreaterThan(initialCallCount);

      unsub();
      const countAfterUnsub = listener.mock.calls.length;
      focusTimerService.reset();
      // Should not be called after unsubscribe
      expect(listener.mock.calls.length).toBe(countAfterUnsub);
    });
  });

  describe('2. Persistent Study Music Engine (Across All Routes)', () => {
    it('should initialize with default state and track catalog', () => {
      const state = studyMusicService.getState();
      expect(state).toBeDefined();
      expect(typeof state.isPlaying).toBe('boolean');
      expect(state.currentTrack).toBeDefined();
      expect(state.currentTrack.title).toBeTruthy();
      expect(state.volume).toBeGreaterThan(0);
    });

    it('should pause and preserve playback position instead of resetting to 0', () => {
      studyMusicService.seek(42);
      expect(studyMusicService.getState().currentTime).toBe(42);

      studyMusicService.pause();
      expect(studyMusicService.getState().isPlaying).toBe(false);
      expect(studyMusicService.getState().currentTime).toBe(42);
    });

    it('should adjust volume with clamping [0, 1] and persist settings', () => {
      studyMusicService.setVolume(0.85);
      expect(studyMusicService.getState().volume).toBe(0.85);

      // Clamping test
      studyMusicService.setVolume(1.5);
      expect(studyMusicService.getState().volume).toBe(1);

      studyMusicService.setVolume(-0.5);
      expect(studyMusicService.getState().volume).toBe(0);

      expect(localStorage.getItem('ap_music_volume')).toBe('0');
    });

    it('should toggle mute without losing original volume setting', () => {
      studyMusicService.setVolume(0.7);
      expect(studyMusicService.getState().isMuted).toBe(false);

      studyMusicService.toggleMute();
      expect(studyMusicService.getState().isMuted).toBe(true);

      studyMusicService.toggleMute();
      expect(studyMusicService.getState().isMuted).toBe(false);
      expect(studyMusicService.getState().volume).toBe(0.7);
    });

    it('should cycle repeat mode between all, one, and off', () => {
      studyMusicService.cycleRepeatMode();
      const mode1 = studyMusicService.getState().repeatMode;
      expect(['all', 'one', 'off']).toContain(mode1);

      studyMusicService.cycleRepeatMode();
      const mode2 = studyMusicService.getState().repeatMode;
      expect(['all', 'one', 'off']).toContain(mode2);
      expect(mode2).not.toBe(mode1);
    });

    it('should cycle next and previous tracks without errors', () => {
      const initialTrack = studyMusicService.getCurrentTrack();
      studyMusicService.next();
      const nextTrack = studyMusicService.getCurrentTrack();
      expect(nextTrack).toBeDefined();

      studyMusicService.prev();
      const prevTrack = studyMusicService.getCurrentTrack();
      expect(prevTrack.id).toBe(initialTrack.id);
    });
  });

  describe('3. Title Bar UI & Geometry Constraints', () => {
    it('should verify TitleBar component file exists and contains 60px height constraint', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const titleBarPath = path.resolve(__dirname, '../src/components/layout/TitleBar.tsx');
      expect(fs.existsSync(titleBarPath)).toBe(true);

      const content = fs.readFileSync(titleBarPath, 'utf8');
      // Must contain 60px height class
      expect(content).toContain('h-[60px]');
      // Must contain dragging region and no-drag controls
      expect(content).toContain('titlebar-drag-region');
      expect(content).toContain('titlebar-no-drag');
      // Must contain overflow menu trigger for compact windows
      expect(content).toContain('MoreHorizontal');
    });
  });
});
