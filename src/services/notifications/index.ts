import secretConfig from '@/../secret.json';

export interface ConnectedService {
  name: string;
  id: 'telegram' | 'twilio' | 'google' | 'n8n' | 'local';
  status: 'connected' | 'not_configured' | 'offline';
  description: string;
  details: string;
}

export function getConnectedServices(): ConnectedService[] {
  return [
    {
      name: 'Telegram Bot',
      id: 'telegram',
      status: secretConfig.TELEGRAM_BOT_TOKEN ? 'connected' : 'not_configured',
      description: 'Daily study summaries, task streak alerts, and pomodoro completions.',
      details: `Chat ID: ${secretConfig.TELEGRAM_CHAT_ID || 'Not configured'}`,
    },
    {
      name: 'Twilio SMS / WhatsApp',
      id: 'twilio',
      status: secretConfig.TWILIO_ACCOUNT_SID ? 'connected' : 'not_configured',
      description: 'High-priority deadline SMS and WhatsApp notification channel.',
      details: `From: ${secretConfig.TWILIO_PHONE_NUMBER || 'Not configured'}`,
    },
    {
      name: 'Google Sheets Progress Sync',
      id: 'google',
      status: secretConfig.GOOGLE_SPREADSHEET_ID ? 'connected' : 'not_configured',
      description: 'Automated tabular backup of solved questions and weekly performance.',
      details: `Sheet ID: ${secretConfig.GOOGLE_SPREADSHEET_ID.slice(0, 8)}...`,
    },
    {
      name: 'N8N Workflow Automation',
      id: 'n8n',
      status: secretConfig.N8N_BASE_URL ? 'connected' : 'not_configured',
      description: 'Local webhooks triggering personalized spaced-repetition schedules.',
      details: `Host: ${secretConfig.N8N_HOST || 'http://localhost:5678'}`,
    },
    {
      name: 'Local Windows Notifications',
      id: 'local',
      status: 'connected',
      description: 'System tray toasts for break timers and study session completions.',
      details: 'Enabled (Native Desktop)',
    },
  ];
}

export async function sendTelegramAlert(text: string): Promise<{ success: boolean; message: string }> {
  if (!secretConfig.TELEGRAM_BOT_TOKEN || !secretConfig.TELEGRAM_CHAT_ID) {
    return {
      success: false,
      message: 'Telegram credentials not found in secure configuration vault.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${secretConfig.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: secretConfig.TELEGRAM_CHAT_ID,
        text: `🚀 [Ap Study Platform]\n\n${text}`,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, message: 'Telegram notification delivered successfully.' };
    } else {
      return { success: false, message: `Telegram API error: ${data.description || 'Unknown error'}` };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Network error or offline: ${err.message}`,
    };
  }
}
