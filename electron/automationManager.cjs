const { app, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

/**
 * Secure Credential Storage & Automation Manager for Ap Workspace
 *
 * Uses Windows DPAPI (via Electron safeStorage) to encrypt sensitive integration
 * credentials on disk at app.getPath('userData')/ap_credentials.enc.
 * Raw API keys, tokens, and passwords are NEVER logged or exposed to the renderer.
 */

function getUserDataDir() {
  if (app && typeof app.getPath === 'function') {
    try {
      return app.getPath('userData');
    } catch {}
  }
  const home = process.env.APPDATA || process.env.HOME || path.join(__dirname, '..');
  const fallback = path.join(home, 'Ap_Dev_Workspace');
  try {
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  } catch {}
  return fallback;
}

function getCredentialsFilePath() {
  const userDataDir = getUserDataDir();
  return path.join(userDataDir, 'ap_credentials.enc');
}

function getFallbackCredentialsFilePath() {
  const userDataDir = getUserDataDir();
  return path.join(userDataDir, 'ap_credentials.json');
}

// In-memory cache of decrypted credentials in main process only
let memoryStore = null;

function loadEncryptedCredentials() {
  if (memoryStore !== null) {
    return memoryStore;
  }

  const encPath = getCredentialsFilePath();
  const fallbackPath = getFallbackCredentialsFilePath();

  // 1. Try reading Electron safeStorage encrypted file
  if (fs.existsSync(encPath)) {
    try {
      const encryptedBuffer = fs.readFileSync(encPath);
      if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
        const decryptedJson = safeStorage.decryptString(encryptedBuffer);
        memoryStore = JSON.parse(decryptedJson);
        return memoryStore;
      }
    } catch (e) {
      console.warn('Failed to decrypt credentials with safeStorage:', e.message);
    }
  }

  // 2. Check fallback JSON (e.g. if safeStorage was not yet initialized or in dev)
  if (fs.existsSync(fallbackPath)) {
    try {
      const raw = fs.readFileSync(fallbackPath, 'utf-8');
      memoryStore = JSON.parse(raw);
      return memoryStore;
    } catch (e) {
      console.warn('Failed to parse fallback credentials:', e.message);
    }
  }

  memoryStore = {};
  return memoryStore;
}

function saveEncryptedCredentials(store) {
  memoryStore = { ...store };
  const jsonStr = JSON.stringify(store);
  const encPath = getCredentialsFilePath();
  const fallbackPath = getFallbackCredentialsFilePath();

  if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
    try {
      const encryptedBuffer = safeStorage.encryptString(jsonStr);
      fs.writeFileSync(encPath, encryptedBuffer);
      // Remove unencrypted fallback if it exists
      if (fs.existsSync(fallbackPath)) {
        try { fs.unlinkSync(fallbackPath); } catch {}
      }
      return true;
    } catch (e) {
      console.warn('safeStorage encryption failed, writing restricted fallback:', e.message);
    }
  }

  // Fallback to restricted permissions file if DPAPI is unavailable
  try {
    fs.writeFileSync(fallbackPath, jsonStr, { mode: 0o600 });
    return true;
  } catch (err) {
    console.error('Failed to write credentials file:', err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Masking Helpers (Never expose raw tokens to renderer)
// -----------------------------------------------------------------------------

function maskToken(token, visibleChars = 4) {
  if (!token) return 'Not configured';
  const str = String(token).trim();
  if (str.length <= visibleChars * 2) {
    return '••••••••';
  }
  return str.slice(0, visibleChars) + '••••' + str.slice(-visibleChars);
}

function maskPhone(phone) {
  if (!phone) return 'Not configured';
  const str = String(phone).trim();
  if (str.length <= 4) return '••' + str;
  return str.slice(0, 3) + '••••' + str.slice(-4);
}

// -----------------------------------------------------------------------------
// Service Status & Details
// -----------------------------------------------------------------------------

function getMaskedServicesStatus() {
  const store = loadEncryptedCredentials();

  const telegram = store.telegram || {};
  const twilio = store.twilio || {};
  const google = store.google || {};
  const n8n = store.n8n || {};

  return [
    {
      id: 'telegram',
      name: 'Telegram Bot',
      status: (telegram.botToken && telegram.chatId) ? 'connected' : 'not_configured',
      description: 'Daily study summaries, task streak alerts, and pomodoro completions.',
      details: telegram.chatId 
        ? `Chat ID: ${telegram.chatId} • Bot: ${maskToken(telegram.botToken, 4)}` 
        : 'Not configured',
      isConfigured: Boolean(telegram.botToken && telegram.chatId),
      configuredAt: telegram.configuredAt,
    },
    {
      id: 'twilio',
      name: 'Twilio SMS / WhatsApp',
      status: (twilio.accountSid && twilio.authToken && twilio.fromPhone && twilio.toPhone) ? 'connected' : 'not_configured',
      description: 'High-priority deadline SMS and WhatsApp notification channel.',
      details: twilio.fromPhone 
        ? `From: ${maskPhone(twilio.fromPhone)} → To: ${maskPhone(twilio.toPhone)}` 
        : 'Not configured',
      isConfigured: Boolean(twilio.accountSid && twilio.authToken && twilio.fromPhone && twilio.toPhone),
      configuredAt: twilio.configuredAt,
    },
    {
      id: 'google',
      name: 'Google Sheets Progress Sync',
      status: (google.spreadsheetId && (google.serviceAccountJson || google.webhookUrl || google.apiKey)) ? 'connected' : 'not_configured',
      description: 'Automated tabular backup of solved questions and weekly performance.',
      details: google.spreadsheetId 
        ? `Sheet ID: ${google.spreadsheetId.slice(0, 8)}... • Tab: ${google.sheetName || 'Sheet1'}` 
        : 'Not configured',
      isConfigured: Boolean(google.spreadsheetId && (google.serviceAccountJson || google.webhookUrl || google.apiKey)),
      configuredAt: google.configuredAt,
    },
    {
      id: 'n8n',
      name: 'N8N Workflow Automation',
      status: (n8n.baseUrl && (n8n.apiKey || n8n.webhookPath)) ? 'connected' : 'not_configured',
      description: 'Local webhooks triggering personalized spaced-repetition schedules.',
      details: n8n.baseUrl ? `Instance: ${n8n.baseUrl}` : 'Not configured',
      isConfigured: Boolean(n8n.baseUrl && (n8n.apiKey || n8n.webhookPath)),
      configuredAt: n8n.configuredAt,
    },
    {
      id: 'local',
      name: 'Local Windows Notifications',
      status: 'connected',
      description: 'System tray toasts for break timers and study session completions.',
      details: 'Enabled (Native Desktop)',
      isConfigured: true,
      configuredAt: null,
    },
  ];
}

// -----------------------------------------------------------------------------
// Save / Delete Credentials Handlers
// -----------------------------------------------------------------------------

function saveServiceCredentials(serviceId, config) {
  if (!serviceId) throw new Error('Service ID is required');
  const store = loadEncryptedCredentials();

  const timestamp = new Date().toISOString();

  if (serviceId === 'telegram') {
    const { botToken, chatId } = config || {};
    if (!botToken || !chatId) {
      throw new Error('Telegram Bot Token and Chat ID are both required.');
    }
    store.telegram = {
      botToken: String(botToken).trim(),
      chatId: String(chatId).trim(),
      configuredAt: timestamp,
    };
  } else if (serviceId === 'twilio') {
    const accountSid = config?.accountSid;
    const authToken = config?.authToken;
    const fromPhone = config?.fromPhone || config?.senderPhone;
    const toPhone = config?.toPhone || config?.targetPhone || config?.recipientPhone;
    if (!accountSid || !authToken || !fromPhone || !toPhone) {
      throw new Error('Account SID, Auth Token, Sender Number, and Destination are all required.');
    }
    store.twilio = {
      accountSid: String(accountSid).trim(),
      authToken: String(authToken).trim(),
      fromPhone: String(fromPhone).trim(),
      toPhone: String(toPhone).trim(),
      configuredAt: timestamp,
    };
  } else if (serviceId === 'google') {
    const { spreadsheetId, sheetName, serviceAccountJson, webhookUrl, apiKey } = config || {};
    if (!spreadsheetId) {
      throw new Error('Google Spreadsheet ID is required.');
    }
    if (!serviceAccountJson && !webhookUrl && !apiKey) {
      throw new Error('Either Service Account JSON, Apps Script Webhook URL, or API Key is required.');
    }
    store.google = {
      spreadsheetId: String(spreadsheetId).trim(),
      sheetName: (sheetName || 'Sheet1').trim(),
      serviceAccountJson: serviceAccountJson ? String(serviceAccountJson).trim() : '',
      webhookUrl: webhookUrl ? String(webhookUrl).trim() : '',
      apiKey: apiKey ? String(apiKey).trim() : '',
      configuredAt: timestamp,
    };
  } else if (serviceId === 'n8n') {
    const { baseUrl, apiKey, webhookPath } = config || {};
    if (!baseUrl) {
      throw new Error('N8N Instance Base URL is required.');
    }
    if (!apiKey && !webhookPath) {
      throw new Error('Either N8N API Key or Webhook Path is required.');
    }
    store.n8n = {
      baseUrl: String(baseUrl).trim().replace(/\/+$/, ''),
      apiKey: apiKey ? String(apiKey).trim() : '',
      webhookPath: webhookPath ? String(webhookPath).trim() : '',
      configuredAt: timestamp,
    };
  } else {
    throw new Error(`Unsupported service ID: ${serviceId}`);
  }

  saveEncryptedCredentials(store);
  return { success: true, message: `Successfully saved encrypted credentials for ${serviceId}` };
}

function deleteServiceCredentials(serviceId) {
  const store = loadEncryptedCredentials();
  if (store[serviceId]) {
    delete store[serviceId];
    saveEncryptedCredentials(store);
  }
  return { success: true, message: `Disconnected ${serviceId}` };
}

function getServiceCredentials(serviceId) {
  const store = loadEncryptedCredentials();
  return store[serviceId] || null;
}

// -----------------------------------------------------------------------------
// Real Test Connection & Verification HTTP Clients
// -----------------------------------------------------------------------------

function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'http:' ? http : https;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error('Connection timed out after 12s.'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 1. Telegram
async function testTelegramConnection(credentials) {
  const { botToken, chatId } = credentials || {};
  if (!botToken || !chatId) {
    return { success: false, message: 'Missing Telegram Bot Token or Chat ID.' };
  }

  try {
    // 1. Verify Bot Token validity via getMe
    const meRes = await makeHttpRequest({
      protocol: 'https:',
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/getMe`,
      method: 'GET',
    });

    let meData = {};
    try { meData = JSON.parse(meRes.body); } catch {}

    if (!meData.ok) {
      return {
        success: false,
        message: `Telegram Bot Verification Failed: ${meData.description || 'Invalid token'}`,
      };
    }

    const botName = meData.result?.username || meData.result?.first_name || 'Bot';

    // 2. Dispatch real verification message to the specified Chat ID
    const postPayload = JSON.stringify({
      chat_id: chatId,
      text: `🎯 *Ap Workspace Connection Verified*\n\nYour Telegram bot *@${botName}* is successfully connected to Ap Workspace!\nTime: ${new Date().toLocaleString()}`,
      parse_mode: 'Markdown',
    });

    const sendRes = await makeHttpRequest(
      {
        protocol: 'https:',
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postPayload),
        },
      },
      postPayload
    );

    let sendData = {};
    try { sendData = JSON.parse(sendRes.body); } catch {}

    if (sendData.ok) {
      return {
        success: true,
        message: `Connected! Verified bot @${botName} and delivered test message to Chat ID ${chatId}.`,
      };
    } else {
      return {
        success: false,
        message: `Telegram Error: ${sendData.description || 'Could not deliver to chat ID'}. Make sure you have started a chat with @${botName}.`,
      };
    }
  } catch (err) {
    return { success: false, message: `Network/TLS error connecting to Telegram: ${err.message}` };
  }
}

// 2. Twilio
async function testTwilioConnection(credentials) {
  const { accountSid, authToken, fromPhone, toPhone } = credentials || {};
  if (!accountSid || !authToken || !fromPhone || !toPhone) {
    return { success: false, message: 'Missing Account SID, Auth Token, From Number, or Destination.' };
  }

  try {
    const postParams = new URLSearchParams({
      To: toPhone,
      From: fromPhone,
      Body: `🎯 Ap Workspace: Twilio connection verified! Timestamp: ${new Date().toLocaleTimeString()}`,
    }).toString();

    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const res = await makeHttpRequest(
      {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postParams),
        },
      },
      postParams
    );

    let data = {};
    try { data = JSON.parse(res.body); } catch {}

    if (res.statusCode >= 200 && res.statusCode < 300 && data.sid) {
      return {
        success: true,
        message: `Twilio message dispatched successfully (Message SID: ${data.sid}, Status: ${data.status}).`,
      };
    } else {
      const code = data.code ? `[Code ${data.code}] ` : '';
      const msg = data.message || `HTTP ${res.statusCode}`;
      return {
        success: false,
        message: `Twilio Error: ${code}${msg}. Check SID, Token, and Phone permissions.`,
      };
    }
  } catch (err) {
    return { success: false, message: `Network error connecting to Twilio API: ${err.message}` };
  }
}

// 3. Google Sheets
async function testGoogleSheetsConnection(credentials) {
  const { spreadsheetId, sheetName, webhookUrl, apiKey } = credentials || {};
  if (!spreadsheetId) {
    return { success: false, message: 'Google Spreadsheet ID is required.' };
  }

  // A. If Apps Script / Webhook URL provided: test webhook append
  if (webhookUrl) {
    try {
      const urlObj = new URL(webhookUrl);
      const payload = JSON.stringify({
        event: 'test_connection',
        spreadsheetId,
        sheetName: sheetName || 'Sheet1',
        row: [new Date().toISOString(), 'Ap Workspace Test', 'Connected', 'Verified'],
      });

      const res = await makeHttpRequest(
        {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        payload
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return { success: true, message: `Successfully synced test row to Google Sheet via Webhook.` };
      } else {
        return { success: false, message: `Webhook responded with HTTP ${res.statusCode}: ${res.body.slice(0, 100)}` };
      }
    } catch (err) {
      return { success: false, message: `Webhook connection error: ${err.message}` };
    }
  }

  // B. If API Key provided: verify spreadsheet existence and metadata
  if (apiKey) {
    try {
      const pathUrl = `/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=properties.title,sheets.properties.title`;
      const res = await makeHttpRequest({
        protocol: 'https:',
        hostname: 'sheets.googleapis.com',
        port: 443,
        path: pathUrl,
        method: 'GET',
      });

      let data = {};
      try { data = JSON.parse(res.body); } catch {}

      if (res.statusCode === 200 && data.properties) {
        const title = data.properties.title || 'Spreadsheet';
        return { success: true, message: `Successfully verified Google Sheet: "${title}". Permissions confirmed.` };
      } else {
        const errDesc = data.error?.message || `HTTP ${res.statusCode}`;
        return { success: false, message: `Google Sheets API Error: ${errDesc}` };
      }
    } catch (err) {
      return { success: false, message: `Network error connecting to Google Sheets API: ${err.message}` };
    }
  }

  // C. Fallback: validate format
  if (spreadsheetId.length >= 20) {
    return { success: true, message: `Google Sheet ID format validated (${spreadsheetId.slice(0, 8)}...).` };
  }

  return { success: false, message: 'Invalid Spreadsheet ID format or missing credentials.' };
}

// 4. N8N Workflow
async function testN8nConnection(credentials) {
  const { baseUrl, apiKey, webhookPath } = credentials || {};
  if (!baseUrl) {
    return { success: false, message: 'N8N Base URL is required.' };
  }

  let cleanUrl = baseUrl.trim().replace(/\/+$/, '');
  try {
    const urlObj = new URL(cleanUrl);

    // If webhookPath specified: test POST trigger
    if (webhookPath) {
      const testPath = webhookPath.startsWith('/') ? webhookPath : '/' + webhookPath;
      const payload = JSON.stringify({
        event: 'test_connection',
        source: 'Ap Workspace',
        timestamp: new Date().toISOString(),
      });

      const res = await makeHttpRequest(
        {
          protocol: urlObj.protocol,
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: testPath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...(apiKey ? { 'X-N8N-API-KEY': apiKey } : {}),
          },
        },
        payload
      );

      if (res.statusCode >= 200 && res.statusCode < 400) {
        return { success: true, message: `N8N Webhook reached successfully (HTTP ${res.statusCode}).` };
      } else {
        return { success: false, message: `N8N Webhook returned HTTP ${res.statusCode}: ${res.body.slice(0, 100)}` };
      }
    }

    // Otherwise test health / API endpoint
    const testPath = apiKey ? '/api/v1/workflows?limit=1' : '/healthz';
    const res = await makeHttpRequest({
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: testPath,
      method: 'GET',
      headers: apiKey ? { 'X-N8N-API-KEY': apiKey } : {},
    });

    if (res.statusCode >= 200 && res.statusCode < 400) {
      return { success: true, message: `N8N instance at ${urlObj.hostname}:${urlObj.port || 5678} is online and responsive!` };
    } else {
      return { success: false, message: `N8N returned HTTP ${res.statusCode}. Check URL and API Key.` };
    }
  } catch (err) {
    return { success: false, message: `Could not connect to N8N at ${cleanUrl}: ${err.message}` };
  }
}

// -----------------------------------------------------------------------------
// Unified Dispatcher / Test Connection Router
// -----------------------------------------------------------------------------

async function testServiceConnection(serviceId, config = null) {
  // If config is not passed, use saved encrypted credentials
  const creds = config || getServiceCredentials(serviceId);
  if (!creds && serviceId !== 'local') {
    return {
      success: false,
      message: `No credentials configured for ${serviceId}. Click Configure to add credentials.`,
    };
  }

  if (serviceId === 'telegram') {
    return testTelegramConnection(creds);
  }
  if (serviceId === 'twilio') {
    return testTwilioConnection(creds);
  }
  if (serviceId === 'google') {
    return testGoogleSheetsConnection(creds);
  }
  if (serviceId === 'n8n') {
    return testN8nConnection(creds);
  }
  if (serviceId === 'local') {
    return { success: true, message: 'Local Windows desktop notifications are available natively.' };
  }

  return { success: false, message: `Unknown service: ${serviceId}` };
}

async function sendLiveNotification(serviceId, payload) {
  const creds = getServiceCredentials(serviceId);
  if (!creds && serviceId !== 'local') {
    return { success: false, message: `${serviceId} credentials not found. Please configure in Reports & Automation.` };
  }

  const text = payload.text || payload.body || 'Ap Workspace Alert';

  if (serviceId === 'telegram') {
    try {
      const postPayload = JSON.stringify({
        chat_id: creds.chatId,
        text: `🚀 *[Ap Workspace]*\n\n${text}`,
        parse_mode: 'Markdown',
      });
      const res = await makeHttpRequest(
        {
          protocol: 'https:',
          hostname: 'api.telegram.org',
          port: 443,
          path: `/bot${creds.botToken}/sendMessage`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postPayload),
          },
        },
        postPayload
      );
      const data = JSON.parse(res.body);
      return { success: data.ok, message: data.ok ? 'Telegram alert delivered' : data.description };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  if (serviceId === 'twilio') {
    try {
      const postParams = new URLSearchParams({
        To: creds.toPhone,
        From: creds.fromPhone,
        Body: `[Ap Workspace] ${text}`,
      }).toString();
      const authHeader = 'Basic ' + Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64');

      const res = await makeHttpRequest(
        {
          protocol: 'https:',
          hostname: 'api.twilio.com',
          port: 443,
          path: `/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postParams),
          },
        },
        postParams
      );
      const data = JSON.parse(res.body);
      return { success: res.statusCode < 300, message: res.statusCode < 300 ? 'Twilio SMS queued' : (data.message || 'Twilio failed') };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  return testServiceConnection(serviceId, creds);
}

module.exports = {
  getMaskedServicesStatus,
  saveServiceCredentials,
  deleteServiceCredentials,
  getServiceCredentials,
  testServiceConnection,
  sendLiveNotification,
};
