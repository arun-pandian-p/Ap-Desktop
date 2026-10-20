/**
 * Safe Configuration Loader for External Notification Services
 * 
 * External integrations (Telegram, Twilio, Google Sheets, N8N) are optional.
 * When secret.json is absent, empty credentials are used, cleanly marking service
 * statuses as 'not_configured' and preserving local Windows notifications and offline queues.
 */

export interface NotificationSecrets {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  GOOGLE_SPREADSHEET_ID?: string;
  N8N_BASE_URL?: string;
  N8N_HOST?: string;
}

const DEFAULT_SECRETS: NotificationSecrets = {
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_PHONE_NUMBER: '',
  GOOGLE_SPREADSHEET_ID: '',
  N8N_BASE_URL: '',
  N8N_HOST: '',
};

let activeSecrets: NotificationSecrets = { ...DEFAULT_SECRETS };

// Load optional secret.json if present in the build or environment
try {
  const secretModules = import.meta.glob<{ default: NotificationSecrets }>('/secret.json', { eager: true });
  if (secretModules['/secret.json']) {
    activeSecrets = {
      ...DEFAULT_SECRETS,
      ...(secretModules['/secret.json'].default || secretModules['/secret.json']),
    };
  }
} catch {
  activeSecrets = { ...DEFAULT_SECRETS };
}

export function getNotificationSecrets(): NotificationSecrets {
  return activeSecrets;
}

/**
 * Allows test suites to supply mock credentials in-memory without
 * exposing secrets or requiring secret.json on disk.
 */
export function setNotificationSecretsForTesting(secrets: Partial<NotificationSecrets> | null): void {
  if (secrets === null) {
    activeSecrets = { ...DEFAULT_SECRETS };
  } else {
    activeSecrets = { ...DEFAULT_SECRETS, ...secrets };
  }
}
