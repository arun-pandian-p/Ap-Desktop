import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  Download, 
  Bell, 
  CheckCircle2, 
  Clock, 
  Flame, 
  MessageSquare, 
  Smartphone, 
  Table, 
  Workflow, 
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ScreenId } from '@/types';
import { getConnectedServices, sendTelegramAlert } from '@/services/notifications';

interface ReportsViewProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const connectedServices = getConnectedServices();

  const handleTestTelegram = async () => {
    setIsSendingTelegram(true);
    setTelegramStatus(null);
    const res = await sendTelegramAlert('Test alert from Ap Desktop: Your 14-day streak is verified and active! 🎯');
    setIsSendingTelegram(false);
    if (res.success) {
      setTelegramStatus('Telegram alert delivered successfully to your Chat ID!');
      onShowToast('Telegram message sent successfully!', 'success');
    } else {
      setTelegramStatus(`Error: ${res.message}`);
      onShowToast(`Failed to dispatch alert: ${res.message}`, 'error');
    }
  };

  const handleExportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Date,Problems Solved,Focus Hours,Tasks Done\n2026-10-06,12,4.2,3\n2026-10-05,10,3.8,4\n2026-10-04,15,5.1,5';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ap_weekly_progress_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV Report exported successfully.', 'success');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reports & Connected Services</h1>
          <p className="text-xs text-gray-500 mt-1">
            Automated study digests, CSV exports, and external messaging channels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-[#E8EAF2] rounded-xl text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleTestTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSendingTelegram ? 'Dispatching...' : 'Send Telegram Alert'}</span>
          </button>
        </div>
      </div>

      {telegramStatus && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
          telegramStatus.startsWith('Error') 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {telegramStatus.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          <span>{telegramStatus}</span>
        </div>
      )}

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Study Time This Week</span>
          <div className="text-2xl font-black text-gray-900 mt-1">28.5h</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">+4.2h vs last week</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Problems Solved</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">54 items</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">+18% increase</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Tasks Completed</span>
          <div className="text-2xl font-black text-gray-900 mt-1">16 of 20</div>
          <div className="text-[11px] text-gray-400 mt-0.5">80% sprint rate</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Study Goal Progress</span>
          <div className="text-2xl font-black text-[#E11D26] mt-1">94%</div>
          <div className="text-[11px] text-gray-400 mt-0.5">On target for weekly crown</div>
        </div>
      </div>

      {/* Main Grid: Connected Services & Reports Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Services (from secret.json) (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Configured External Services</h3>
            <p className="text-xs text-gray-500">Protected credentials loaded securely from local vault</p>
          </div>

          <div className="space-y-3">
            {connectedServices.map((svc) => (
              <div
                key={svc.id}
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200 transition-all flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center shrink-0 font-bold shadow-2xs">
                    {svc.id === 'telegram' && <Send className="w-4 h-4 text-blue-500" />}
                    {svc.id === 'twilio' && <Smartphone className="w-4 h-4 text-red-500" />}
                    {svc.id === 'google' && <Table className="w-4 h-4 text-emerald-600" />}
                    {svc.id === 'n8n' && <Workflow className="w-4 h-4 text-orange-500" />}
                    {svc.id === 'local' && <Bell className="w-4 h-4 text-purple-600" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{svc.name}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        svc.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {svc.status === 'connected' ? 'CONNECTED' : 'NOT CONFIGURED'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{svc.description}</p>
                    <div className="text-[11px] font-mono text-gray-400 mt-1">{svc.details}</div>
                  </div>
                </div>

                {svc.id === 'telegram' && (
                  <button
                    onClick={handleTestTelegram}
                    disabled={isSendingTelegram}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-all shrink-0 active:scale-95"
                  >
                    Test Send
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Rail: Reminder Settings */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Notification Schedule</h3>
            <p className="text-xs text-gray-500">Configure automated delivery intervals</p>

            <div className="space-y-3 text-xs">
              {[
                { title: 'Daily Study Kickoff (9:00 AM)', active: true },
                { title: 'Daily Review Evening Prompt (8:00 PM)', active: true },
                { title: 'Weekly Performance Digest (Sunday)', active: true },
                { title: 'Long Inactivity Idle Alert', active: false },
              ].map((rem, i) => (
                <label key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                  <span className="font-semibold text-gray-800">{rem.title}</span>
                  <input
                    type="checkbox"
                    defaultChecked={rem.active}
                    className="w-4 h-4 rounded text-[#E11D26] focus:ring-red-500 border-gray-300"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
