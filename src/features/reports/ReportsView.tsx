import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Calendar,
  Settings,
  Play,
  Pause,
  RefreshCw,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ScreenId } from '@/types';
import { 
  getConnectedServices, 
  sendTelegramAlert, 
  sendTwilioAlert,
  sendGoogleSheetsSync,
  sendWindowsNotification,
  getAutomationSchedule,
  saveAutomationSchedule,
  getQueuedNotifications,
  processOfflineQueue,
  AutomationSchedule
} from '@/services/notifications';

interface ReportsViewProps {
  onNavigate: (screen: ScreenId) => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [schedule, setSchedule] = useState<AutomationSchedule>(getAutomationSchedule());
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [isTestingService, setIsTestingService] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [selectedServiceForAutomation, setSelectedServiceForAutomation] = useState<string | null>(null);

  const connectedServices = getConnectedServices();

  useEffect(() => {
    const s = getAutomationSchedule();
    setSchedule(s);
    setQueuedCount(getQueuedNotifications().length);
  }, []);

  const handleToggleScheduleActive = () => {
    const updated = saveAutomationSchedule({ enabled: !schedule.enabled });
    setSchedule(updated);
    onShowToast(updated.enabled ? 'Automation Scheduler activated.' : 'Automation Scheduler paused.', 'success');
  };

  const handleSaveSchedule = () => {
    const updated = saveAutomationSchedule(schedule);
    setSchedule(updated);
    onShowToast('Schedule and trigger configurations saved successfully.', 'success');
  };

  const handleTestService = async (serviceId: string) => {
    setIsTestingService(serviceId);
    try {
      let res: { success: boolean; message: string };
      if (serviceId === 'telegram') {
        res = await sendTelegramAlert('🎯 [Test Send] Ap Automation alert: Telegram Bot connection verified!');
      } else if (serviceId === 'twilio') {
        res = await sendTwilioAlert('🎯 [Test Send] Ap Automation SMS: Twilio connection verified!');
      } else if (serviceId === 'google') {
        res = await sendGoogleSheetsSync('Solved: Two Sum, Valid Anagram');
      } else if (serviceId === 'local') {
        res = await sendWindowsNotification('Ap Automation Alert', 'Windows desktop notification connection verified!');
      } else {
        res = { success: true, message: 'Service test completed.' };
      }

      if (res.success) {
        onShowToast(res.message, 'success');
      } else {
        onShowToast(res.message, 'error');
      }
    } catch (e: any) {
      onShowToast(`Test failed: ${e.message}`, 'error');
    } finally {
      setIsTestingService(null);
    }
  };

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

  const handleDrainQueue = async () => {
    const res = await processOfflineQueue();
    setQueuedCount(getQueuedNotifications().length);
    onShowToast(`Processed ${res.processed} queued notifications (${res.failed} remaining/failed).`, 'success');
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
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Reports & Automation Services</h1>
          <p className="text-xs text-gray-500 mt-1">
            Automated study digests, multi-channel schedules, and offline-resilient notification queues
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-[#E8EAF2] rounded-xl text-xs font-semibold shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleTestTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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

      {/* Main Grid: Connected Services & Automation Scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Connected Services (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Configured External Services</h3>
              <p className="text-xs text-gray-500">Protected credentials loaded securely from local vault</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Auto-Sync Online
            </span>
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

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleTestService(svc.id)}
                    disabled={isTestingService === svc.id}
                    className="px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isTestingService === svc.id ? 'Sending...' : 'Test Send'}
                  </button>
                  <button
                    onClick={() => setSelectedServiceForAutomation(svc.id)}
                    className="px-2.5 py-1.5 bg-[#E11D26]/10 hover:bg-[#E11D26]/20 text-[#E11D26] border border-[#E11D26]/20 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Rail: Complete Automation Scheduler (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#E11D26]" />
                  <span>Automation Scheduler</span>
                </h3>
                <p className="text-xs text-gray-500">Recurring delivery & offline auto-queue</p>
              </div>

              <button
                onClick={handleToggleScheduleActive}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  schedule.enabled ? 'bg-emerald-500 text-white shadow-xs' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {schedule.enabled ? <Play className="w-3 h-3 fill-white" /> : <Pause className="w-3 h-3" />}
                <span>{schedule.enabled ? 'Active' : 'Paused'}</span>
              </button>
            </div>

            {/* Schedule Frequency & Time Settings */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Frequency:</span>
                <select
                  value={schedule.frequency}
                  onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as any })}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 font-semibold text-gray-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly (Sunday)</option>
                  <option value="custom">Custom Schedule</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Delivery Time:</span>
                <input
                  type="time"
                  value={schedule.time}
                  onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                  className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 font-mono text-gray-700 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
                <span>Next Run:</span>
                <span className="font-mono font-semibold text-gray-700">
                  {schedule.time} ({schedule.frequency.toUpperCase()})
                </span>
              </div>
            </div>

            {/* Channels Enabled */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-800">Delivery Channels:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.channels.telegram}
                    onChange={(e) => setSchedule({
                      ...schedule,
                      channels: { ...schedule.channels, telegram: e.target.checked }
                    })}
                    className="w-3.5 h-3.5 rounded text-[#E11D26]"
                  />
                  <span>Telegram Bot</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.channels.twilio}
                    onChange={(e) => setSchedule({
                      ...schedule,
                      channels: { ...schedule.channels, twilio: e.target.checked }
                    })}
                    className="w-3.5 h-3.5 rounded text-[#E11D26]"
                  />
                  <span>Twilio SMS</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.channels.googleSheets}
                    onChange={(e) => setSchedule({
                      ...schedule,
                      channels: { ...schedule.channels, googleSheets: e.target.checked }
                    })}
                    className="w-3.5 h-3.5 rounded text-[#E11D26]"
                  />
                  <span>Google Sheets</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.channels.windowsNotifications}
                    onChange={(e) => setSchedule({
                      ...schedule,
                      channels: { ...schedule.channels, windowsNotifications: e.target.checked }
                    })}
                    className="w-3.5 h-3.5 rounded text-[#E11D26]"
                  />
                  <span>Windows Toast</span>
                </label>
              </div>
            </div>

            {/* Event Triggers */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-800">Event Triggers:</span>
              <div className="space-y-1.5 text-xs">
                {[
                  { key: 'problemCompleted', label: 'Completed coding problems' },
                  { key: 'sessionCompleted', label: 'Completed practice sessions' },
                  { key: 'noteUpdated', label: 'Notes added/updated' },
                  { key: 'dailySummary', label: 'Daily study summary' },
                  { key: 'streakMilestone', label: 'Streak/milestone alerts' },
                ].map((trig) => (
                  <label key={trig.key} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100/50">
                    <span className="text-gray-700 font-medium">{trig.label}</span>
                    <input
                      type="checkbox"
                      checked={(schedule.triggers as any)[trig.key]}
                      onChange={(e) => setSchedule({
                        ...schedule,
                        triggers: { ...schedule.triggers, [trig.key]: e.target.checked }
                      })}
                      className="w-3.5 h-3.5 rounded text-[#E11D26]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Offline Queue Bar */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                <span>Offline Queue: <strong>{queuedCount} pending</strong></span>
              </div>
              {queuedCount > 0 && (
                <button
                  onClick={handleDrainQueue}
                  className="px-2 py-0.5 bg-amber-600 text-white rounded text-[11px] font-bold cursor-pointer hover:bg-amber-700"
                >
                  Sync Now
                </button>
              )}
            </div>

            {/* Save Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">
                {schedule.lastDeliveryStatus === 'success' && '✓ Last sent delivered'}
                {schedule.lastDeliveryStatus === 'queued' && '⏳ Queued offline'}
                {!schedule.lastDeliveryStatus && 'Ready for auto-delivery'}
              </span>

              <button
                onClick={handleSaveSchedule}
                className="px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
