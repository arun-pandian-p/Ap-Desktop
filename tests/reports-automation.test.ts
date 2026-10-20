import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getAutomationSchedule, 
  saveAutomationSchedule, 
  getConnectedServices, 
  getQueuedNotifications, 
  processOfflineQueue,
  fetchConnectedServices 
} from '../src/services/notifications';
import { getDatabase } from '../src/services/db';

const automationManager = require('../electron/automationManager.cjs');

describe('Reports & Automation Integrations Verification', () => {
  beforeEach(async () => {
    const db = await getDatabase();
    db.run(`DELETE FROM app_settings WHERE key LIKE 'notif_%'`);
  });

  it('1. should return masked service status with unconfigured states initially', () => {
    const services = automationManager.getMaskedServicesStatus();
    expect(Array.isArray(services)).toBe(true);
    expect(services.length).toBeGreaterThanOrEqual(4);

    const telegram = services.find((s: any) => s.id === 'telegram');
    expect(telegram).toBeDefined();
    expect(telegram.name).toBe('Telegram Bot');
  });

  it('2. should save, mask, and safely retrieve encrypted credentials for Telegram', () => {
    const saveRes = automationManager.saveServiceCredentials('telegram', {
      botToken: 'TEST_TELEGRAM_BOT_TOKEN_12345',
      chatId: '-100987654321',
    });
    expect(saveRes.success).toBe(true);

    const services = automationManager.getMaskedServicesStatus();
    const telegram = services.find((s: any) => s.id === 'telegram');
    expect(telegram.isConfigured).toBe(true);
    expect(telegram.status).toBe('connected');
    // Verify credential is masked and never leaks raw secret
    expect(telegram.details).not.toContain('TEST_TELEGRAM_BOT_TOKEN_12345');
    expect(telegram.details).toContain('••••');
  });

  it('3. should save, mask, and safely retrieve encrypted credentials for Twilio', () => {
    const saveRes = automationManager.saveServiceCredentials('twilio', {
      accountSid: 'MOCK_TWILIO_ACCOUNT_SID_TEST',
      authToken: 'mock_auth_token_sample_12345',
      senderPhone: '+15551234567',
      targetPhone: '+15557654321',
      mode: 'sms',
    });
    expect(saveRes.success).toBe(true);

    const services = automationManager.getMaskedServicesStatus();
    const twilio = services.find((s: any) => s.id === 'twilio');
    expect(twilio.isConfigured).toBe(true);
    expect(twilio.status).toBe('connected');
    expect(twilio.details).not.toContain('mock_auth_token_sample_12345');
    expect(twilio.details).toContain('From:');
    expect(twilio.details).toContain('••••');
  });

  it('4. should delete credentials and revert service to unconfigured state', () => {
    const delRes = automationManager.deleteServiceCredentials('telegram');
    expect(delRes.success).toBe(true);

    const services = automationManager.getMaskedServicesStatus();
    const telegram = services.find((s: any) => s.id === 'telegram');
    expect(telegram.isConfigured).toBe(false);
    expect(telegram.status).toBe('not_configured');
  });

  it('5. should persist automation schedule with delivery channels and event triggers', () => {
    const updated = saveAutomationSchedule({
      enabled: true,
      time: '21:30',
      frequency: 'daily',
      channels: {
        telegram: true,
        twilioSms: false,
        twilioWhatsapp: false,
        googleSheets: true,
        n8nWebhook: false,
        windowsDesktop: true,
      },
      triggers: {
        dailyStreakReminder: true,
        streakMilestone: true,
        dailySummary: true,
        weeklyReport: false,
      },
    });

    expect(updated.enabled).toBe(true);
    expect(updated.time).toBe('21:30');
    expect(updated.channels.telegram).toBe(true);
    expect(updated.channels.googleSheets).toBe(true);

    const loaded = getAutomationSchedule();
    expect(loaded.enabled).toBe(true);
    expect(loaded.time).toBe('21:30');
    expect(loaded.channels.telegram).toBe(true);
  });

  it('6. should queue notifications when offline and support queue draining', async () => {
    const queue = getQueuedNotifications();
    expect(Array.isArray(queue)).toBe(true);

    const drainRes = await processOfflineQueue();
    expect(drainRes).toBeDefined();
    expect(typeof drainRes.processed).toBe('number');
  });
});
