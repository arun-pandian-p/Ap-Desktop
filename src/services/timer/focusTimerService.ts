/**
 * Ap Workspace — Global Focus & Pomodoro Timer Service
 * Timestamp-based focus blocks, short/long breaks, SQLite persistence, and real-time synchronization.
 * Centralized singleton: survives route navigation, window minimize/restore, and page unmounts.
 */

import { logStudySession } from '@/services/db';
import { realtimeService } from '@/services/websocket/realtimeService';

export type FocusMode = 'focus' | 'short_break' | 'long_break';

export interface FocusTimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  autoStartBreaks: boolean;
  soundEnabled: boolean;
}

export interface FocusTimerState {
  mode: FocusMode;
  isRunning: boolean;
  remainingSeconds: number;
  totalDurationSeconds: number;
  completedSessionsToday: number;
  totalFocusSecondsToday: number;
  targetTimestamp: number | null;
  sessionStartedAt: string | null;
}

const DEFAULT_SETTINGS: FocusTimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  autoStartBreaks: false,
  soundEnabled: true,
};

const TIMER_STORAGE_KEY = 'ap_focus_timer_active_state';
const SETTINGS_STORAGE_KEY = 'ap_focus_settings';

class FocusTimerService {
  private settings: FocusTimerSettings;
  private mode: FocusMode = 'focus';
  private isRunning: boolean = false;
  private targetTimestamp: number | null = null;
  private pausedRemainingSeconds: number = 25 * 60;
  private totalDurationSeconds: number = 25 * 60;
  private sessionStartedAt: string | null = null;
  private completedSessionsToday: number = 0;
  private totalFocusSecondsToday: number = 0;

  private intervalId: any = null;
  private listeners = new Set<(state: FocusTimerState) => void>();

  constructor() {
    this.settings = this.loadSettings();
    this.loadTodayStats();
    this.restoreActiveState();

    // Listen for window visibility/focus to guarantee accurate UI on minimize/restore
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.handleWindowFocus());
      document.addEventListener('visibilitychange', () => this.handleWindowFocus());
    }
  }

  private loadSettings(): FocusTimerSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {}
    return { ...DEFAULT_SETTINGS };
  }

  public saveSettings(newSettings: Partial<FocusTimerSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {}
    if (!this.isRunning) {
      this.initMode(this.mode);
      this.persistActiveState();
      this.notify();
    }
  }

  public getSettings(): FocusTimerSettings {
    return { ...this.settings };
  }

  private loadTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const raw = localStorage.getItem(`ap_focus_stats_${today}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.completedSessionsToday = parsed.completedSessionsToday || 0;
        this.totalFocusSecondsToday = parsed.totalFocusSecondsToday || 0;
      }
    } catch {}
  }

  private saveTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem(
        `ap_focus_stats_${today}`,
        JSON.stringify({
          completedSessionsToday: this.completedSessionsToday,
          totalFocusSecondsToday: this.totalFocusSecondsToday,
        })
      );
    } catch {}
  }

  private getDurationForMode(mode: FocusMode): number {
    switch (mode) {
      case 'focus':
        return Math.max(60, (this.settings.focusMinutes || 25) * 60);
      case 'short_break':
        return Math.max(60, (this.settings.shortBreakMinutes || 5) * 60);
      case 'long_break':
        return Math.max(60, (this.settings.longBreakMinutes || 15) * 60);
    }
  }

  private initMode(mode: FocusMode) {
    this.mode = mode;
    this.totalDurationSeconds = this.getDurationForMode(mode);
    this.pausedRemainingSeconds = this.totalDurationSeconds;
    this.targetTimestamp = null;
    this.sessionStartedAt = null;
    this.isRunning = false;
    this.stopInterval();
  }

  private persistActiveState() {
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          mode: this.mode,
          isRunning: this.isRunning,
          targetTimestamp: this.targetTimestamp,
          pausedRemainingSeconds: this.pausedRemainingSeconds,
          totalDurationSeconds: this.totalDurationSeconds,
          sessionStartedAt: this.sessionStartedAt,
        })
      );
    } catch {}
  }

  private restoreActiveState() {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.mode = parsed.mode || 'focus';
        this.totalDurationSeconds = parsed.totalDurationSeconds || this.getDurationForMode(this.mode);
        this.sessionStartedAt = parsed.sessionStartedAt || null;

        if (parsed.isRunning && parsed.targetTimestamp) {
          const now = Date.now();
          const remaining = Math.ceil((parsed.targetTimestamp - now) / 1000);
          if (remaining > 0) {
            this.isRunning = true;
            this.targetTimestamp = parsed.targetTimestamp;
            this.startInterval();
            return;
          } else {
            // Completed while window was closed or reloaded
            this.targetTimestamp = parsed.targetTimestamp;
            this.handleCompletion();
            return;
          }
        } else {
          this.pausedRemainingSeconds =
            typeof parsed.pausedRemainingSeconds === 'number'
              ? parsed.pausedRemainingSeconds
              : this.totalDurationSeconds;
          this.isRunning = false;
          this.targetTimestamp = null;
          return;
        }
      }
    } catch {}
    this.initMode(this.mode);
  }

  private handleWindowFocus() {
    if (this.isRunning && this.targetTimestamp !== null) {
      if (Date.now() >= this.targetTimestamp) {
        this.handleCompletion();
      } else {
        this.notify();
      }
    }
  }

  public getState(): FocusTimerState {
    let remaining = this.pausedRemainingSeconds;
    if (this.isRunning && this.targetTimestamp !== null) {
      remaining = Math.max(0, Math.ceil((this.targetTimestamp - Date.now()) / 1000));
    }
    return {
      mode: this.mode,
      isRunning: this.isRunning,
      remainingSeconds: remaining,
      totalDurationSeconds: this.totalDurationSeconds,
      completedSessionsToday: this.completedSessionsToday,
      totalFocusSecondsToday: this.totalFocusSecondsToday,
      targetTimestamp: this.targetTimestamp,
      sessionStartedAt: this.sessionStartedAt,
    };
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    const remaining = this.pausedRemainingSeconds > 0 ? this.pausedRemainingSeconds : this.totalDurationSeconds;
    this.targetTimestamp = Date.now() + remaining * 1000;
    if (!this.sessionStartedAt) {
      this.sessionStartedAt = new Date().toISOString();
    }
    this.startInterval();
    this.persistActiveState();
    this.notify();

    realtimeService.publish('study-session:started', {
      sessionId: `session-${Date.now()}`,
      sessionType: this.mode,
      startedAt: this.sessionStartedAt,
      targetMinutes: Math.round(this.totalDurationSeconds / 60),
    }).catch(() => {});
  }

  public pause() {
    if (!this.isRunning) return;
    if (this.targetTimestamp !== null) {
      this.pausedRemainingSeconds = Math.max(0, Math.ceil((this.targetTimestamp - Date.now()) / 1000));
    }
    this.isRunning = false;
    this.targetTimestamp = null;
    this.stopInterval();
    this.persistActiveState();
    this.notify();

    // If interrupted after >= 30 active seconds, log partial study session
    this.logInterruptedSessionIfNeeded();
  }

  public toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  public reset() {
    this.logInterruptedSessionIfNeeded();
    this.initMode(this.mode);
    this.persistActiveState();
    this.notify();
  }

  public skip() {
    this.handleCompletion();
  }

  public setMode(mode: FocusMode) {
    if (this.mode === mode) return;
    this.logInterruptedSessionIfNeeded();
    this.initMode(mode);
    this.persistActiveState();
    this.notify();
  }

  private startInterval() {
    this.stopInterval();
    this.intervalId = setInterval(() => {
      if (!this.isRunning || this.targetTimestamp === null) return;
      const now = Date.now();
      if (now >= this.targetTimestamp) {
        this.handleCompletion();
      } else {
        this.notify();
      }
    }, 1000);
  }

  private stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async logInterruptedSessionIfNeeded() {
    if (this.mode === 'focus' && this.sessionStartedAt) {
      const elapsed = this.totalDurationSeconds - this.getState().remainingSeconds;
      if (elapsed >= 30) {
        try {
          await logStudySession({
            session_type: this.mode,
            started_at: this.sessionStartedAt,
            ended_at: new Date().toISOString(),
            elapsed_seconds: elapsed,
            active_seconds: elapsed,
            idle_seconds: 0,
            status: 'interrupted',
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ap_stats_updated'));
          }
        } catch {}
      }
    }
    this.sessionStartedAt = null;
  }

  private async handleCompletion() {
    this.stopInterval();
    this.isRunning = false;
    this.targetTimestamp = null;

    const completedMode = this.mode;
    const completedDuration = this.totalDurationSeconds;
    const startedAt = this.sessionStartedAt || new Date(Date.now() - completedDuration * 1000).toISOString();
    const endedAt = new Date().toISOString();
    this.sessionStartedAt = null;

    if (completedMode === 'focus') {
      this.completedSessionsToday += 1;
      this.totalFocusSecondsToday += completedDuration;
      this.saveTodayStats();

      // Persist completed study session to SQLite database for analytics & daily streak
      try {
        await logStudySession({
          session_type: 'focus',
          started_at: startedAt,
          ended_at: endedAt,
          elapsed_seconds: completedDuration,
          active_seconds: completedDuration,
          idle_seconds: 0,
          status: 'completed',
        });
      } catch (err) {
        console.warn('Failed to log completed study session to database:', err);
      }

      if (this.settings.soundEnabled) {
        this.playChime();
      }

      // Next: short break or long break (every 4 focus sessions)
      const nextMode: FocusMode =
        this.completedSessionsToday % 4 === 0 ? 'long_break' : 'short_break';
      this.initMode(nextMode);

      if (this.settings.autoStartBreaks) {
        this.start();
      }
    } else {
      // Break ended -> switch to focus
      if (this.settings.soundEnabled) {
        this.playChime();
      }
      this.initMode('focus');
    }

    this.persistActiveState();
    this.notify();

    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ap_stats_updated'));
        window.dispatchEvent(new CustomEvent('ap_focus_timer_completed', { detail: { mode: completedMode } }));
      }
      realtimeService.publish('study-session:completed', {
        sessionId: `session-${Date.now()}`,
        sessionType: completedMode,
        startedAt,
        endedAt,
        elapsedSeconds: completedDuration,
        activeSeconds: completedDuration,
        idleSeconds: 0,
      }).catch(() => {});
    } catch {}
  }

  public playChime() {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;

      // Two-tone gentle bell chime: 523.25Hz (C5) -> 659.25Hz (E5)
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.3, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };

      playTone(523.25, now, 0.8);
      playTone(659.25, now + 0.25, 1.2);
    } catch {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }

  public subscribe(cb: (state: FocusTimerState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(s);
      } catch {}
    });
  }
}

export const focusTimerService = new FocusTimerService();
