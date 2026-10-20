import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Smartphone, 
  Table, 
  Workflow, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Loader2,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { 
  ConnectedService, 
  testServiceConnection, 
  saveServiceConfig, 
  disconnectService 
} from '@/services/notifications';

interface ConfigureServiceModalProps {
  isOpen: boolean;
  serviceId: string | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onServicesUpdated: () => void;
}

export const ConfigureServiceModal: React.FC<ConfigureServiceModalProps> = ({
  isOpen,
  serviceId,
  onClose,
  onSuccess,
  onServicesUpdated,
}) => {
  // Form states
  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Twilio
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioFromPhone, setTwilioFromPhone] = useState('');
  const [twilioToPhone, setTwilioToPhone] = useState('');

  // Google Sheets
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState('');
  const [googleSheetName, setGoogleSheetName] = useState('Sheet1');
  const [googleWebhookUrl, setGoogleWebhookUrl] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');

  // N8N
  const [n8nBaseUrl, setN8nBaseUrl] = useState('http://localhost:5678');
  const [n8nApiKey, setN8nApiKey] = useState('');
  const [n8nWebhookPath, setN8nWebhookPath] = useState('');

  // UI state
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      setShowSecret(false);
    }
  }, [isOpen, serviceId]);

  if (!isOpen || !serviceId) return null;

  const getServiceInfo = () => {
    switch (serviceId) {
      case 'telegram':
        return {
          title: 'Configure Telegram Bot',
          icon: Send,
          color: 'text-blue-500',
          desc: 'Deliver automated daily study digests, streak alerts, and pomodoro milestones directly to your Telegram chat or channel.',
        };
      case 'twilio':
        return {
          title: 'Configure Twilio SMS / WhatsApp',
          icon: Smartphone,
          color: 'text-red-500',
          desc: 'High-priority SMS and WhatsApp notification channel powered by Twilio REST API.',
        };
      case 'google':
        return {
          title: 'Configure Google Sheets Progress Sync',
          icon: Table,
          color: 'text-emerald-600',
          desc: 'Automatically append solved coding problems, review notes, and weekly performance tables to a private Google Spreadsheet.',
        };
      case 'n8n':
        return {
          title: 'Configure N8N Workflow Automation',
          icon: Workflow,
          color: 'text-orange-500',
          desc: 'Connect to your self-hosted or cloud N8N instance to trigger custom webhooks and automated learning pipelines.',
        };
      default:
        return {
          title: 'Configure Integration',
          icon: ShieldCheck,
          color: 'text-gray-700',
          desc: 'Configure external notification channel credentials.',
        };
    }
  };

  const info = getServiceInfo();
  const Icon = info.icon;

  // Build credentials payload based on active service
  const getPayload = () => {
    if (serviceId === 'telegram') {
      return {
        botToken: telegramBotToken.trim(),
        chatId: telegramChatId.trim(),
      };
    }
    if (serviceId === 'twilio') {
      return {
        accountSid: twilioAccountSid.trim(),
        authToken: twilioAuthToken.trim(),
        fromPhone: twilioFromPhone.trim(),
        toPhone: twilioToPhone.trim(),
      };
    }
    if (serviceId === 'google') {
      // Auto-extract ID if full URL pasted
      let sheetId = googleSpreadsheetId.trim();
      const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) sheetId = match[1];

      return {
        spreadsheetId: sheetId,
        sheetName: googleSheetName.trim() || 'Sheet1',
        webhookUrl: googleWebhookUrl.trim(),
        apiKey: googleApiKey.trim(),
      };
    }
    if (serviceId === 'n8n') {
      return {
        baseUrl: n8nBaseUrl.trim(),
        apiKey: n8nApiKey.trim(),
        webhookPath: n8nWebhookPath.trim(),
      };
    }
    return {};
  };

  // Test Connection
  const handleTestConnection = async () => {
    const payload = getPayload();
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testServiceConnection(serviceId, payload);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Configuration (Encrypts via safeStorage)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = getPayload();
    setIsSaving(true);
    setTestResult(null);

    try {
      const res = await saveServiceConfig(serviceId, payload);
      if (res.success) {
        onSuccess(`Saved and encrypted credentials for ${info.title}.`);
        onServicesUpdated();
        onClose();
      } else {
        setTestResult({ success: false, message: res.message || 'Failed to save configuration.' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to save credentials.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Disconnect Service
  const handleDisconnect = async () => {
    if (!window.confirm(`Are you sure you want to disconnect ${info.title} and remove its encrypted credentials from local storage?`)) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await disconnectService(serviceId);
      onSuccess(res.message);
      onServicesUpdated();
      onClose();
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Disconnect failed.' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0E1526] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shrink-0 ${info.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{info.title}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Protected with Windows DPAPI (Electron safeStorage)</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {info.desc}
          </p>

          {/* Service-Specific Fields */}
          {serviceId === 'telegram' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Telegram Bot Token <span className="text-[#E11D26]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Create a bot with <span className="font-mono text-gray-600 dark:text-gray-300">@BotFather</span> on Telegram and paste the API token here.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Chat ID or Channel Username <span className="text-[#E11D26]">*</span>
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 123456789 or @my_ap_alerts"
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Message <span className="font-mono text-gray-600 dark:text-gray-300">@userinfobot</span> to find your personal Telegram numerical Chat ID.
                </p>
              </div>
            </div>
          )}

          {serviceId === 'twilio' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Account SID <span className="text-[#E11D26]">*</span>
                  </label>
                  <input
                    type="text"
                    value={twilioAccountSid}
                    onChange={(e) => setTwilioAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Auth Token <span className="text-[#E11D26]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={twilioAuthToken}
                      onChange={(e) => setTwilioAuthToken(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Sender Phone Number (From) <span className="text-[#E11D26]">*</span>
                  </label>
                  <input
                    type="text"
                    value={twilioFromPhone}
                    onChange={(e) => setTwilioFromPhone(e.target.value)}
                    placeholder="+1234567890 or whatsapp:+14155238886"
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Destination Phone Number (To) <span className="text-[#E11D26]">*</span>
                  </label>
                  <input
                    type="text"
                    value={twilioToPhone}
                    onChange={(e) => setTwilioToPhone(e.target.value)}
                    placeholder="+1987654321 or whatsapp:+1987654321"
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {serviceId === 'google' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Google Spreadsheet ID or URL <span className="text-[#E11D26]">*</span>
                </label>
                <input
                  type="text"
                  value={googleSpreadsheetId}
                  onChange={(e) => setGoogleSpreadsheetId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms or paste full URL"
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Sheet / Tab Name
                  </label>
                  <input
                    type="text"
                    value={googleSheetName}
                    onChange={(e) => setGoogleSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Google Cloud API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={googleApiKey}
                    onChange={(e) => setGoogleApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Google Apps Script Webhook URL (Recommended for 1-Click Sync)
                </label>
                <input
                  type="url"
                  value={googleWebhookUrl}
                  onChange={(e) => setGoogleWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Using a free Google Apps Script web app provides instantaneous append syncing without OAuth prompt delays.
                </p>
              </div>
            </div>
          )}

          {serviceId === 'n8n' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  N8N Base URL <span className="text-[#E11D26]">*</span>
                </label>
                <input
                  type="url"
                  value={n8nBaseUrl}
                  onChange={(e) => setN8nBaseUrl(e.target.value)}
                  placeholder="http://localhost:5678 or https://n8n.yourdomain.com"
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  N8N API Key (Header X-N8N-API-KEY)
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={n8nApiKey}
                    onChange={(e) => setN8nApiKey(e.target.value)}
                    placeholder="n8n_api_key_..."
                    className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Webhook Path (Optional)
                </label>
                <input
                  type="text"
                  value={n8nWebhookPath}
                  onChange={(e) => setN8nWebhookPath(e.target.value)}
                  placeholder="/webhook/ap-workspace-alerts"
                  className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-hidden focus:border-[#E11D26] font-mono"
                />
              </div>
            </div>
          )}

          {/* Test Result Message Box */}
          {testResult && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              testResult.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded transition-colors"
                title="Wipe saved credentials for this service"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="submit"
                disabled={isSaving || isTesting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isSaving ? 'Encrypting & Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
