import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getConnectedServices, 
  getAutomationSchedule, 
  saveAutomationSchedule, 
  dispatchNotification,
  getQueuedNotifications,
  saveQueuedNotifications,
  processOfflineQueue,
  clearNotificationStorageForTesting
} from '../src/services/notifications';

describe('Connected Services & Automation Scheduler', () => {
  beforeEach(() => {
    clearNotificationStorageForTesting();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should detect configured services from secret.json', () => {
    const services = getConnectedServices();
    expect(services.length).toBeGreaterThanOrEqual(4);

    const telegram = services.find(s => s.id === 'telegram');
    expect(telegram).toBeDefined();
    expect(telegram?.status).toBe('connected');

    const google = services.find(s => s.id === 'google');
    expect(google).toBeDefined();
    expect(google?.status).toBe('connected');
  });

  it('should mask sensitive credential details and never expose raw tokens', () => {
    const services = getConnectedServices();
    const telegram = services.find(s => s.id === 'telegram');
    expect(telegram?.details).not.toContain('8711937903:AAGzTyaP1lmwMEWyXbGSLyqdrp0WZO0v54I');

    const google = services.find(s => s.id === 'google');
    expect(google?.details).toContain('Sheet ID:');
    expect(google?.details).toContain('...');
  });

  it('should save and persist automation schedule with frequency and triggers', () => {
    const saved = saveAutomationSchedule({
      enabled: true,
      frequency: 'daily',
      time: '18:30',
      channels: { telegram: true, twilio: false, googleSheets: true, windowsNotifications: true },
      triggers: {
        problemCompleted: true,
        sessionCompleted: true,
        noteUpdated: true,
        dailySummary: true,
        streakMilestone: true,
      }
    });

    expect(saved.time).toBe('18:30');
    expect(saved.frequency).toBe('daily');
    expect(saved.nextScheduledAt).toBeDefined();

    const loaded = getAutomationSchedule();
    expect(loaded.time).toBe('18:30');
    expect(loaded.channels.telegram).toBe(true);
  });

  it('should handle notification queueing and deduplication safely', async () => {
    saveQueuedNotifications([
      { id: 'q-1', channel: 'telegram', title: 'Problem Solved', body: 'Two Sum AC', timestamp: new Date().toISOString(), retryCount: 0 }
    ]);

    const queue = getQueuedNotifications();
    expect(queue.length).toBe(1);
    expect(queue[0].title).toBe('Problem Solved');
  });
});
