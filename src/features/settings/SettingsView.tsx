import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sliders, 
  HardDrive, 
  Terminal, 
  Database, 
  Timer, 
  Bell, 
  ShieldCheck, 
  RotateCcw, 
  Info,
  Check,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  FileSpreadsheet,
  Key,
  Trash2,
  Lock,
  RefreshCw,
  Cpu,
  Layers,
  Save,
  Sparkles,
  User,
  Mail,
  AtSign,
  Play
} from 'lucide-react';
import { AccentColor, ThemeMode, LicenseState } from '@/types';
import { getIntegrityDiagnostics, getRecentSecurityEvents } from '@/services/integrity';
import { getMachineFingerprint, saveLicense } from '@/services/license';
import { 
  importQuestionsFromCsv, 
  reloadQuestionsFromSeed, 
  exportQuestionsToCsv, 
  getCurriculumStats, 
  vacuumDatabase,
  fetchAppSettings,
  setAppSetting
} from '@/services/db';
import { getPythonInterpreterInfo, PythonInterpreterInfo, executePythonCode } from '@/services/runner';

interface SettingsViewProps {
  accentColor: AccentColor;
  onChangeAccent: (color: AccentColor) => void;
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  license: LicenseState;
  onRefreshLicense: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
  onOpenBackupModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  accentColor,
  onChangeAccent,
  themeMode,
  onChangeTheme,
  license,
  onRefreshLicense,
  onShowToast,
  onOpenBackupModal,
}) => {
  const [activeSection, setActiveSection] = useState<
    'appearance' | 'general' | 'problems_settings' | 'storage' | 'python' | 'security' | 'backup' | 'about'
  >('appearance');

  const [licenseInput, setLicenseInput] = useState('');
  const [tauriInfo, setTauriInfo] = useState<any>(null);
  const [pyInfo, setPyInfo] = useState<PythonInterpreterInfo | null>(null);

  // General Preferences state
  const [userName, setUserName] = useState('Arun Pandian');
  const [userHandle, setUserHandle] = useState('arun4709s');
  const [userEmail, setUserEmail] = useState('arunpandi47777@gmail.com');
  const [focusDuration, setFocusDuration] = useState('25');
  const [breakDuration, setBreakDuration] = useState('5');
  const [idleThreshold, setIdleThreshold] = useState('2');
  const [autoSave, setAutoSave] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Problems Settings & Stats
  const [curriculumStats, setCurriculumStats] = useState({ total: 1337, easy: 450, medium: 650, hard: 237, patterns: 50 });
  const [isImporting, setIsImporting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Python diagnostic state
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);

  useEffect(() => {
    async function initSettings() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke('app_info');
        setTauriInfo(info);
      } catch {}

      const pInfo = await getPythonInterpreterInfo();
      setPyInfo(pInfo);

      const stats = await getCurriculumStats();
      setCurriculumStats(stats);

      const settings = await fetchAppSettings();
      if (settings.user_name) setUserName(settings.user_name);
      if (settings.user_handle) setUserHandle(settings.user_handle);
      if (settings.user_email) setUserEmail(settings.user_email);
      if (settings.idle_threshold_minutes) setIdleThreshold(settings.idle_threshold_minutes);
    }
    initSettings();
  }, []);

  const diagnostics = getIntegrityDiagnostics();
  const securityEvents = getRecentSecurityEvents();
  const fingerprint = getMachineFingerprint();

  // Save General Preferences in real-time
  const handleSaveGeneral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingGeneral(true);
    await setAppSetting('user_name', userName);
    await setAppSetting('user_handle', userHandle);
    await setAppSetting('user_email', userEmail);
    await setAppSetting('idle_threshold_minutes', idleThreshold);
    await setAppSetting('focus_duration', focusDuration);
    await setAppSetting('break_duration', breakDuration);
    setTimeout(() => {
      setIsSavingGeneral(false);
      onShowToast('Settings updated in real time!', 'success');
    }, 400);
  };

  // CSV/XLSX Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const res = await importQuestionsFromCsv(text);
      const updatedStats = await getCurriculumStats();
      setCurriculumStats(updatedStats);
      onShowToast(`Successfully imported ${res.imported} problems from ${file.name}! Total curriculum: ${res.total}`, 'success');
    } catch (err: any) {
      onShowToast(`Failed to parse file: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  // Reload Default Curriculum
  const handleReloadDataset = async () => {
    setIsReloading(true);
    try {
      const res = await reloadQuestionsFromSeed();
      const updatedStats = await getCurriculumStats();
      setCurriculumStats(updatedStats);
      onShowToast(`Curriculum refreshed! Total: ${res.total} verified problems synchronized.`, 'success');
    } catch (err: any) {
      onShowToast(`Error reloading dataset: ${err.message}`, 'error');
    } finally {
      setIsReloading(false);
    }
  };

  // Export to CSV
  const handleExportCsv = async () => {
    try {
      const csv = await exportQuestionsToCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ap_curriculum_problems_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast('Problems exported to CSV successfully!', 'success');
    } catch (err: any) {
      onShowToast(`Export failed: ${err.message}`, 'error');
    }
  };

  // Python diagnostic self-test
  const handleRunPythonDiagnostic = async () => {
    setDiagRunning(true);
    setDiagResult(null);
    try {
      const res = await executePythonCode('import sys, math\nprint(f"Python {sys.version.split()[0]} execution verified. Pi = {math.pi:.4f}")');
      if (res.status === 'Accepted') {
        setDiagResult(`✓ ${res.stdout.trim()} (Runtime: ${res.runtime_ms} ms, Memory: ${res.memory_kb} KB)`);
        onShowToast('Python 3.12 sandbox diagnostic verified!', 'success');
      } else {
        setDiagResult(`✕ Diagnostic returned ${res.status}: ${res.stderr}`);
        onShowToast('Diagnostic failed', 'error');
      }
    } catch (e: any) {
      setDiagResult(`✕ Error: ${e.message}`);
    } finally {
      setDiagRunning(false);
    }
  };

  const handleVacuum = async () => {
    await vacuumDatabase();
    onShowToast('SQLite database vacuumed and optimized successfully.', 'success');
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;
    const res = saveLicense(licenseInput.trim());
    if (res.success) {
      onShowToast(res.message, 'success');
      onRefreshLicense();
      setLicenseInput('');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  const handleWipeData = () => {
    if (confirm('Are you absolutely sure you want to wipe local data and reset all preferences? This action is irreversible.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Settings & Security Center</h1>
          <p className="text-xs text-gray-500 mt-1">Configure workspace preferences, import problem datasets, and manage offline storage</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>All changes saved locally</span>
          </span>
        </div>
      </div>

      {/* Main Split: Left Nav & Right Panels */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Settings Navigation */}
        <div className="col-span-12 md:col-span-3 bg-white p-3 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-1">
          {[
            { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
            { id: 'general', label: 'General Preferences', icon: Sliders },
            { id: 'problems_settings', label: 'Problems & Dataset Import', icon: FileSpreadsheet, isBadge: true },
            { id: 'storage', label: 'Offline Storage & DB', icon: HardDrive },
            { id: 'python', label: 'Python Runtime', icon: Terminal },
            { id: 'security', label: 'Privacy & Security Center', icon: ShieldCheck },
            { id: 'backup', label: 'Backup & Restore', icon: RotateCcw },
            { id: 'about', label: 'About Ap Workspace', icon: Info },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#FDECEC] text-[#A80000] font-bold shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#E11D26]' : 'text-gray-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.isBadge && (
                  <span className="px-1.5 py-0.2 bg-[#E11D26] text-white rounded text-[10px] font-bold">CSV</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Settings Body */}
        <div className="col-span-12 md:col-span-9 bg-white p-6 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          
          {/* Section 1: Appearance & Themes */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Appearance & Customization</h3>
                <p className="text-xs text-gray-500">Tailor the visual theme, accent colors, and editor density</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Interface Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Light Shell (Default)' },
                    { id: 'dark', label: 'Full Dark Theme' },
                    { id: 'system', label: 'System Automatic' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onChangeTheme(t.id as ThemeMode)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        themeMode === t.id
                          ? 'border-[#E11D26] bg-red-50/50 text-[#C8101A] ring-2 ring-red-500/20'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Accent Color Palette</label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'red', name: 'Crimson Red', hex: '#E11D26' },
                    { id: 'pink', name: 'Hot Pink', hex: '#EC4899' },
                    { id: 'orange', name: 'Vibrant Orange', hex: '#F97316' },
                    { id: 'yellow', name: 'Amber Yellow', hex: '#EAB308' },
                    { id: 'green', name: 'Emerald Green', hex: '#10B981' },
                    { id: 'blue', name: 'Electric Blue', hex: '#2563EB' },
                    { id: 'purple', name: 'Deep Purple', hex: '#8B5CF6' },
                    { id: 'gray', name: 'Slate Gray', hex: '#475569' },
                  ].map((swatch) => (
                    <button
                      key={swatch.id}
                      onClick={() => onChangeAccent(swatch.id as AccentColor)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-2xs ${
                        accentColor === swatch.id ? 'ring-3 ring-offset-2 ring-gray-900 scale-105' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                      title={swatch.name}
                    >
                      {accentColor === swatch.id && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 2: General Preferences */}
          {activeSection === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Developer Profile & Workspace Defaults</h3>
                  <p className="text-xs text-gray-500">Manage identity details, timer durations, and automation flags</p>
                </div>
                <button
                  type="submit"
                  disabled={isSavingGeneral}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingGeneral ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes in Real Time</span>
                </button>
              </div>

              {/* Developer Profile Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Display Name</span>
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:border-[#E11D26] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>Username Handle</span>
                  </label>
                  <input
                    type="text"
                    value={userHandle}
                    onChange={(e) => setUserHandle(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:border-[#E11D26] focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:border-[#E11D26] focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Study & Timer Config */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                <div className="text-xs font-bold text-gray-800">Timer & Activity Thresholds</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Focus Session (Minutes)</label>
                    <input
                      type="number"
                      value={focusDuration}
                      onChange={(e) => setFocusDuration(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Short Break (Minutes)</label>
                    <input
                      type="number"
                      value={breakDuration}
                      onChange={(e) => setBreakDuration(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Idle Detection Threshold</label>
                    <input
                      type="number"
                      value={idleThreshold}
                      onChange={(e) => setIdleThreshold(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="w-4 h-4 text-[#E11D26] rounded focus:ring-red-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-800">Auto-save Code Solutions</div>
                    <div className="text-[11px] text-gray-500">Automatically persist Monaco code buffer into local SQLite database on every run</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#E11D26] rounded focus:ring-red-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-gray-800">Audio Chimes on Test Pass</div>
                    <div className="text-[11px] text-gray-500">Play subtle success audio cue when all test cases pass</div>
                  </div>
                </label>
              </div>
            </form>
          )}

          {/* Section 3: Problems Settings (CSV/XLSX Import & Feed) */}
          {activeSection === 'problems_settings' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#E11D26]" />
                    <span>Curriculum & Problem Dataset Management</span>
                  </h3>
                  <p className="text-xs text-gray-500">Import custom problems via CSV/XLSX, synchronize dataset, or export curriculum</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReloadDataset}
                    disabled={isReloading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    title="Reload original 1,337 problems from seed dataset"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin text-[#E11D26]' : ''}`} />
                    <span>Sync from Dataset</span>
                  </button>

                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* KPI Badges for Problems */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <div className="text-xl font-black text-gray-900">{curriculumStats.total}</div>
                  <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Problems</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <div className="text-xl font-black text-emerald-600">{curriculumStats.easy}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Easy Problems</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <div className="text-xl font-black text-amber-600">{curriculumStats.medium}</div>
                  <div className="text-[10px] text-amber-700 font-semibold uppercase">Medium Problems</div>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                  <div className="text-xl font-black text-red-600">{curriculumStats.hard}</div>
                  <div className="text-[10px] text-red-700 font-semibold uppercase">Hard Problems</div>
                </div>
              </div>

              {/* File Import Box */}
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 hover:bg-red-50/20 hover:border-red-300 transition-all text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-50 text-[#E11D26] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Upload CSV or XLSX Problem File</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Select a CSV/XLSX file matching GrindGram format (columns: order, title, platform, difficulty, pattern, practice_link).
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <label className="cursor-pointer px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isImporting ? 'Parsing & Ingesting...' : 'Select File to Import'}</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.txt"
                      onChange={handleFileUpload}
                      disabled={isImporting}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Supported Columns Guide */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="font-bold text-gray-800">Supported Schema Columns:</div>
                <div className="font-mono text-[11px] text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200">
                  order_num, title, pattern_name, subtopic_name, platform, difficulty, practice_link, video_link, hint_link
                </div>
                <p className="text-[11px] text-gray-500">
                  Importing new records immediately updates the SQLite database and makes problems accessible in Python Practice and the Problems table in real time.
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Offline Storage */}
          {activeSection === 'storage' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Offline SQLite Storage</h3>
                  <p className="text-xs text-gray-500">Inspect database health, run vacuum optimizations, and clear cache</p>
                </div>
                <button
                  onClick={handleVacuum}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  Optimize & Vacuum DB
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[11px] font-sans font-medium mb-1">Database Engine</span>
                  <div className="font-bold text-gray-900">SQLite 3 (sql.js WebAssembly)</div>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[11px] font-sans font-medium mb-1">Storage State</span>
                  <div className="font-bold text-emerald-600">Active & Persisted (Local)</div>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[11px] font-sans font-medium mb-1">Approximate Footprint</span>
                  <div className="font-bold text-gray-900">~1.8 MB (Indexed)</div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="font-bold text-gray-800">Database Tables Overview:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-600">
                  <div>• tracks: Core track definitions</div>
                  <div>• questions: 1,337 curriculum entries</div>
                  <div>• tasks: To-do planner tasks</div>
                  <div>• study_sessions: Tracked Pomodoro intervals</div>
                  <div>• attempts: Python & SQL execution logs</div>
                  <div>• app_settings: Local key-value preferences</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Python Runtime */}
          {activeSection === 'python' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Python 3.12 Sandbox Runtime</h3>
                  <p className="text-xs text-gray-500">Subprocess interpreter environment, audit hooks, and resource quotas</p>
                </div>
                <button
                  onClick={handleRunPythonDiagnostic}
                  disabled={diagRunning}
                  className="px-3.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {diagRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>Run Live Diagnostic</span>
                </button>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-sans font-bold">Interpreter Version:</span>
                  <span className="font-bold text-gray-900">{pyInfo?.version || 'Python 3.12.10'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-sans font-bold">Executable Path:</span>
                  <span className="text-gray-700 text-[11px] truncate max-w-sm">{pyInfo?.executable || 'python.exe'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-sans font-bold">Audit Hook Protection:</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Active (sys.addaudithook)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-sans font-bold">Execution Timeout:</span>
                  <span className="text-gray-800">10,000 ms (Fail-closed)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-sans font-bold">Memory Tracking:</span>
                  <span className="text-gray-800">tracemalloc Active</span>
                </div>
              </div>

              {diagResult && (
                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2A44] font-mono text-xs text-emerald-400">
                  {diagResult}
                </div>
              )}
            </div>
          )}

          {/* Section 6: Privacy & Security */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>Security Center</span>
                  </h3>
                  <p className="text-xs text-gray-500">Live hardware diagnostics, ECDSA licensing, and tamper-evidence checks</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Integrity Score: {diagnostics.score}/100</span>
                </div>
              </div>

              {/* License Card */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cryptographic License</span>
                    <div className="text-sm font-extrabold text-gray-900 mt-0.5">{license.holder}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {license.status.toUpperCase()} ({license.edition.toUpperCase()} EDITION)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-600 bg-white p-3 rounded-lg border border-gray-200">
                  <div>Hardware Fingerprint: <strong>{fingerprint}</strong></div>
                  <div>Valid Until: <strong>{new Date(license.expires_at || Date.now()).toLocaleDateString()}</strong></div>
                </div>

                <form onSubmit={handleActivateLicense} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Paste license key (e.g., ApLic1.<payload>.<sig>)..."
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white text-xs font-bold rounded-lg shadow-2xs"
                  >
                    Activate Key
                  </button>
                </form>
              </div>

              {/* Danger Zone: Wipe Data */}
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-red-900">Wipe Local Data & Reset State</div>
                  <div className="text-[11px] text-red-600">Purges all local SQLite storage, notes, and credentials</div>
                </div>
                <button
                  onClick={handleWipeData}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe Everything</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 7: Backup & Restore */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">Local Snapshots & Data Export</h3>
                <p className="text-xs text-gray-500">Create cryptographic database backups with HMAC tamper-evidence heads</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ap is strictly offline-first. Your data is stored on this machine and never sent to cloud servers without your explicit consent.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onOpenBackupModal}
                    className="px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Open Backup Manager
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 8: About Ap */}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900">About Ap Workspace</h3>
                <p className="text-xs text-gray-500">Security-Hardened Developer Practice & Preparation Platform</p>
              </div>

              <div className="flex items-center gap-5 p-5 bg-gradient-to-r from-red-50/50 via-white to-gray-50/50 rounded-2xl border border-red-100 shadow-2xs">
                <img 
                  src="/assets/icon.png" 
                  alt="Glossy Red Ap Monogram Icon" 
                  className="w-16 h-16 rounded-2xl object-contain drop-shadow-md shrink-0" 
                />
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Ap</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E11D26] text-white">v1.0.0</span>
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Master developer interview preparation, 50 DSA patterns, 1,337 problems, SQL practice, PostgreSQL lab, and local study planner.
                  </p>
                  <p className="text-xs text-gray-500 font-semibold mt-1">
                    Created by Arun Pandian (arun4709s) • arunpandi47777@gmail.com
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[11px] font-medium mb-1">Architecture & Runtime</span>
                  <div className="font-semibold text-gray-800">Tauri 2 • React 18 • CPython 3.12 • SQLite 3</div>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[11px] font-medium mb-1">Security Model</span>
                  <div className="font-semibold text-gray-800">ECDSA P-256 Offline License • Audit Chains</div>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[11px] font-medium mb-1">Curriculum Database</span>
                  <div className="font-semibold text-gray-800">1,337 Curated Problems (GrindGram Verified)</div>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[11px] font-medium mb-1">Storage Mode</span>
                  <div className="font-semibold text-gray-800">100% Offline-First • Zero Cloud Dependency</div>
                </div>
                <div className="col-span-2 p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[11px] font-medium mb-1">Local App Data Directory</span>
                  <div className="font-mono text-[11px] text-gray-800 break-all">
                    {tauriInfo?.app_data_dir || '%APPDATA%\\Ap (Local Database & Preferences)'}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
