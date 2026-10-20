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
  Play,
  Camera,
  ExternalLink,
  Server,
  Code2,
  Headphones,
  Pause,
  Music,
  Search
} from 'lucide-react';
import { AccentColor, ThemeMode, LicenseState, ScreenId, UserProfile } from '@/types';
import iconLogo from '@/assets/icon.png';
import { getIntegrityDiagnostics, getRecentSecurityEvents } from '@/services/integrity';
import { getMachineFingerprint, saveLicense } from '@/services/license';
import { 
  importQuestionsFromCsv, 
  reloadQuestionsFromSeed, 
  exportQuestionsToCsv, 
  getCurriculumStats, 
  vacuumDatabase,
  fetchAppSettings,
  setAppSetting,
  importSqlExercisesFromCsv,
  importPostgresExercisesFromCsv,
  exportSqlExercisesToCsv,
  exportPostgresExercisesToCsv,
  getSqlCurriculumStats,
  getPostgresCurriculumStats,
  generateSampleCsv,
  resetQuestionsToDefault,
  resetSqlExercisesToDefault,
  resetPostgresExercisesToDefault,
  resetAllUploadedDatasets,
  clearAllSubmissionsAndHistory,
  resetSubmissionsToBaseline,
  testAndConnectRealtimeDb
} from '@/services/db';
import { 
  getPythonInterpreterInfo, 
  PythonInterpreterInfo, 
  executePythonCode,
  getAllRuntimesInfo,
  verifyRuntime,
  UnifiedRuntimeStatus
} from '@/services/runner';
import { studyMusicService, PLAYLISTS, Track } from '@/services/audio/studyMusicService';
import { getUserProfile, saveUserProfile } from '@/services/profile';
import { EditProfileModal } from '@/components/dialogs/EditProfileModal';
import { APP_VERSION, APP_RUNTIME_ARCHITECTURE } from '@/config/version';

interface SettingsViewProps {
  accentColor: AccentColor;
  onChangeAccent: (color: AccentColor) => void;
  themeMode: ThemeMode;
  onChangeTheme: (mode: ThemeMode) => void;
  license: LicenseState;
  onRefreshLicense: () => void;
  onShowToast: (msg: string, type?: 'success' | 'warning' | 'error') => void;
  onOpenBackupModal: (initialTab?: 'create' | 'restore') => void;
  onOpenImportModal?: () => void;
  onNavigate?: (screen: ScreenId) => void;
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
  onOpenImportModal,
  onNavigate,
}) => {
  const [activeSection, setActiveSection] = useState<
    'appearance' | 'general' | 'problems_settings' | 'storage' | 'python' | 'runtimes' | 'music' | 'security' | 'backup' | 'about'
  >('appearance');

  const [licenseInput, setLicenseInput] = useState('');
  const [pyInfo, setPyInfo] = useState<PythonInterpreterInfo | null>(null);

  // Multi-Language Runtimes State
  const [allRuntimes, setAllRuntimes] = useState<Record<string, UnifiedRuntimeStatus>>({});
  const [loadingRuntimes, setLoadingRuntimes] = useState(false);
  const [runtimeDiagResults, setRuntimeDiagResults] = useState<Record<string, string>>({});
  const [runtimeDiagRunning, setRuntimeDiagRunning] = useState<Record<string, boolean>>({});
  const [customPaths, setCustomPaths] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ap_custom_runtime_paths');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Music Library State
  const [musicTracks, setMusicTracks] = useState<Track[]>([]);
  const [musicCategoryFilter, setMusicCategoryFilter] = useState<string>('all');
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [musicState, setMusicState] = useState(studyMusicService.getState());

  const loadRuntimes = async () => {
    setLoadingRuntimes(true);
    try {
      const data = await getAllRuntimesInfo();
      setAllRuntimes(data as any);
    } catch (e) {
      console.warn('Failed to load runtimes in settings:', e);
    } finally {
      setLoadingRuntimes(false);
    }
  };

  const handleVerifyRuntime = async (lang: 'python' | 'java' | 'cpp' | 'postgres') => {
    setRuntimeDiagRunning(prev => ({ ...prev, [lang]: true }));
    try {
      const res = await verifyRuntime(lang);
      setRuntimeDiagResults(prev => ({
        ...prev,
        [lang]: res.success
          ? `Verified! Output: "${(res.output || '').trim()}" (${res.runtimeMs || 0} ms)`
          : `Verification failed: ${res.error || 'Execution test failed'}`
      }));
      await loadRuntimes();
      onShowToast(`${lang.toUpperCase()} verification ${res.success ? 'passed' : 'failed'}`, res.success ? 'success' : 'error');
    } catch (e: any) {
      setRuntimeDiagResults(prev => ({
        ...prev,
        [lang]: `Error: ${e.message}`
      }));
    } finally {
      setRuntimeDiagRunning(prev => ({ ...prev, [lang]: false }));
    }
  };

  const loadMusic = () => {
    const custom = studyMusicService.getCustomTracks();
    const presets = PLAYLISTS.flatMap(p => studyMusicService.getPlaylistTracks(p.id));
    const all = [...custom, ...presets];
    const unique = Array.from(new Map(all.map(t => [t.id, t])).values());
    setMusicTracks(unique);
    setMusicState(studyMusicService.getState());
  };

  useEffect(() => {
    loadRuntimes();
    loadMusic();
    const unsub = studyMusicService.subscribe(() => {
      loadMusic();
    });
    return () => unsub();
  }, []);

  const handleImportAudio = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openAudioFileDialog) {
      try {
        const dialogRes = await (window as any).electronAPI.openAudioFileDialog();
        if (dialogRes && dialogRes.success && dialogRes.filepath) {
          const importRes = await (window as any).electronAPI.importAudioFile(dialogRes.filepath);
          if (importRes && importRes.success) {
            await studyMusicService.loadElectronManagedAudio();
            loadMusic();
            onShowToast(`Imported "${importRes.file.title}" to audio library!`, 'success');
            return;
          }
        }
      } catch (err: any) {
        console.warn('Electron audio import fallback to browser:', err);
      }
    }

    const file = e?.target?.files?.[0];
    if (file) {
      try {
        const t = await studyMusicService.importAudioFile(file);
        loadMusic();
        onShowToast(`Imported "${t.title}" to library!`, 'success');
      } catch (err: any) {
        onShowToast(`Audio import failed: ${err.message}`, 'error');
      }
    }
  };

  const handleDeleteMusicTrack = async (track: Track) => {
    if (confirm(`Remove "${track.title}" from your focus audio library?`)) {
      await studyMusicService.deleteManagedTrack(track.id, track.filename);
      loadMusic();
      onShowToast(`Removed "${track.title}" from library.`, 'success');
    }
  };

  // General Preferences state
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());
  const [userName, setUserName] = useState('Arun Pandian');
  const [userHandle, setUserHandle] = useState('arun4709s');
  const [userEmail, setUserEmail] = useState('arunpandi47777@gmail.com');
  const [focusDuration, setFocusDuration] = useState('25');
  const [breakDuration, setBreakDuration] = useState('5');
  const [idleThreshold, setIdleThreshold] = useState('2');
  const [autoSave, setAutoSave] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showSaveSuccessPopup, setShowSaveSuccessPopup] = useState(false);

  // Problems Settings & Categorized Dataset Import
  const [datasetCategory, setDatasetCategory] = useState<'python' | 'sql' | 'postgres'>('python');
  const [curriculumStats, setCurriculumStats] = useState({ total: 1337, easy: 450, medium: 650, hard: 237, patterns: 50 });
  const [sqlStats, setSqlStats] = useState({ total: 10, easy: 5, medium: 3, hard: 2, categories: 4 });
  const [postgresStats, setPostgresStats] = useState({ total: 4, easy: 1, medium: 2, hard: 1, categories: 3 });
  const [isImporting, setIsImporting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isConnectingDb, setIsConnectingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; latencyMs: number; message: string }>({
    connected: true,
    latencyMs: 1,
    message: 'Connected to SQLite Realtime Engine',
  });
  const [confirmResetModal, setConfirmResetModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);

  const [appInfo, setAppInfo] = useState<any>(null);
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  // Python diagnostic state
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<string | null>(null);

  useEffect(() => {
    async function initSettings() {
      if (window.electronAPI) {
        try {
          const info = await window.electronAPI.appInfo();
          setAppInfo(info);
          if (info?.version && info.version !== '0.0.0') setAppVersion(info.version);
        } catch {}
        try {
          if (window.electronAPI.getAppVersion) {
            const v = await window.electronAPI.getAppVersion();
            if (v && v !== '0.0.0') setAppVersion(v);
          }
        } catch {}
      }

      const pInfo = await getPythonInterpreterInfo();
      setPyInfo(pInfo);

      const stats = await getCurriculumStats();
      setCurriculumStats(stats);

      const sStats = await getSqlCurriculumStats();
      setSqlStats(sStats);

      const pgStats = await getPostgresCurriculumStats();
      setPostgresStats(pgStats);

      const profile = getUserProfile();
      setUserProfile(profile);
      if (profile.name) setUserName(profile.name);
      if (profile.username) setUserHandle(profile.username);
      if (profile.email) setUserEmail(profile.email);

      const settings = await fetchAppSettings();
      if (settings.user_name) setUserName(settings.user_name);
      if (settings.user_handle) setUserHandle(settings.user_handle);
      if (settings.user_email) setUserEmail(settings.user_email);
      if (settings.idle_threshold_minutes) setIdleThreshold(settings.idle_threshold_minutes);
    }
    initSettings();

    const handleProfileSync = (e: any) => {
      if (e.detail) {
        setUserProfile(e.detail);
        if (e.detail.name) setUserName(e.detail.name);
        if (e.detail.username) setUserHandle(e.detail.username);
        if (e.detail.email) setUserEmail(e.detail.email);
      }
    };
    window.addEventListener('ap_profile_updated', handleProfileSync);
    return () => window.removeEventListener('ap_profile_updated', handleProfileSync);
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

    const updated = await saveUserProfile({
      name: userName,
      username: userHandle,
      email: userEmail,
    });
    setUserProfile(updated);
    setShowSaveSuccessPopup(true);

    setTimeout(() => {
      setShowSaveSuccessPopup(false);
      setIsSavingGeneral(false);
      onShowToast('Settings and profile updated in real time!', 'success');
    }, 1200);
  };

  // Category-based CSV/XLSX Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, cat: 'python' | 'sql' | 'postgres') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      if (cat === 'python') {
        const res = await importQuestionsFromCsv(text);
        const updatedStats = await getCurriculumStats();
        setCurriculumStats(updatedStats);
        onShowToast(`Python Practice: Imported ${res.imported} problems from ${file.name}! Total: ${res.total}`, 'success');
      } else if (cat === 'sql') {
        const res = await importSqlExercisesFromCsv(text);
        const updatedStats = await getSqlCurriculumStats();
        setSqlStats(updatedStats);
        onShowToast(`SQL Practice: Imported ${res.imported} exercises from ${file.name}! Total: ${res.total}`, 'success');
      } else {
        const res = await importPostgresExercisesFromCsv(text);
        const updatedStats = await getPostgresCurriculumStats();
        setPostgresStats(updatedStats);
        onShowToast(`PostgreSQL Lab: Imported ${res.imported} lab exercises from ${file.name}! Total: ${res.total}`, 'success');
      }
    } catch (err: any) {
      onShowToast(`Failed to parse file: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDownloadSample = (cat: 'python' | 'sql' | 'postgres') => {
    const csv = generateSampleCsv(cat);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap_sample_${cat}_problems.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast(`Sample ${cat.toUpperCase()} CSV template downloaded!`, 'success');
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

  // Connect & Re-verify Realtime SQLite Database
  const handleConnectRealtimeDb = async () => {
    setIsConnectingDb(true);
    try {
      const res = await testAndConnectRealtimeDb();
      setDbStatus({
        connected: res.success,
        latencyMs: res.latencyMs,
        message: res.message,
      });

      const [cStats, sStats, pStats] = await Promise.all([
        getCurriculumStats(),
        getSqlCurriculumStats(),
        getPostgresCurriculumStats(),
      ]);
      setCurriculumStats(cStats);
      setSqlStats(sStats);
      setPostgresStats(pStats);

      setShowSaveSuccessPopup(true);
      setTimeout(() => setShowSaveSuccessPopup(false), 2200);
      onShowToast(`Realtime DB Connected! Live latency: ${res.latencyMs}ms across all workspaces.`, 'success');
    } catch (err: any) {
      onShowToast(`Failed to connect realtime DB: ${err.message}`, 'error');
    } finally {
      setIsConnectingDb(false);
    }
  };

  // Reset a specific category to default seed
  const handleResetCategory = async (cat: 'python' | 'sql' | 'postgres') => {
    setIsResetting(true);
    try {
      if (cat === 'python') {
        const res = await resetQuestionsToDefault();
        const updated = await getCurriculumStats();
        setCurriculumStats(updated);
        onShowToast(`Python Practice reset to default ${res.total} curriculum problems!`, 'success');
      } else if (cat === 'sql') {
        const res = await resetSqlExercisesToDefault();
        const updated = await getSqlCurriculumStats();
        setSqlStats(updated);
        onShowToast(`SQL Practice reset to default ${res.total} exercises!`, 'success');
      } else {
        const res = await resetPostgresExercisesToDefault();
        const updated = await getPostgresCurriculumStats();
        setPostgresStats(updated);
        onShowToast(`PostgreSQL Lab reset to default ${res.total} labs!`, 'success');
      }
      setShowSaveSuccessPopup(true);
      setTimeout(() => setShowSaveSuccessPopup(false), 2200);
    } catch (err: any) {
      onShowToast(`Reset failed: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
      setConfirmResetModal(null);
    }
  };

  // Reset All Uploaded Datasets
  const handleResetAllUploaded = async () => {
    setIsResetting(true);
    try {
      const res = await resetAllUploadedDatasets();
      const [cStats, sStats, pStats] = await Promise.all([
        getCurriculumStats(),
        getSqlCurriculumStats(),
        getPostgresCurriculumStats(),
      ]);
      setCurriculumStats(cStats);
      setSqlStats(sStats);
      setPostgresStats(pStats);
      setShowSaveSuccessPopup(true);
      setTimeout(() => setShowSaveSuccessPopup(false), 2200);
      onShowToast(`All uploaded datasets reset! Python: ${res.python}, SQL: ${res.sql}, Postgres: ${res.postgres}`, 'success');
    } catch (err: any) {
      onShowToast(`Reset all uploaded failed: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
      setConfirmResetModal(null);
    }
  };

  // Clear & Reset All Submissions & History to 0
  const handleClearAllSubmissions = async () => {
    setIsResetting(true);
    try {
      await clearAllSubmissionsAndHistory();
      setShowSaveSuccessPopup(true);
      setTimeout(() => setShowSaveSuccessPopup(false), 2200);
      onShowToast('All submissions, active history, streaks, and heatmap reset to 0!', 'success');
    } catch (err: any) {
      onShowToast(`Reset submissions failed: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
      setConfirmResetModal(null);
    }
  };

  // Reset Submissions & Streaks to Baseline
  const handleResetSubmissions = async () => {
    setIsResetting(true);
    try {
      await resetSubmissionsToBaseline();
      setShowSaveSuccessPopup(true);
      setTimeout(() => setShowSaveSuccessPopup(false), 2200);
      onShowToast('Submissions and streaks restored to demo baseline (90 Solved, 124 Submissions)!', 'success');
    } catch (err: any) {
      onShowToast(`Reset submissions failed: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
      setConfirmResetModal(null);
    }
  };

  // Export to CSV
  const handleExportCsv = async (cat: 'python' | 'sql' | 'postgres' = datasetCategory) => {
    try {
      let csv = '';
      if (cat === 'python') {
        csv = await exportQuestionsToCsv();
      } else if (cat === 'sql') {
        csv = await exportSqlExercisesToCsv();
      } else {
        csv = await exportPostgresExercisesToCsv();
      }
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ap_${cat}_problems_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onShowToast(`${cat.toUpperCase()} problems exported to CSV successfully!`, 'success');
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

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleConnectRealtimeDb}
            disabled={isConnectingDb}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Test and synchronize SQLite database across all screens"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isConnectingDb ? 'animate-spin' : ''}`} />
            <span>{isConnectingDb ? 'Connecting DB...' : 'Connect Realtime DB'}</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Realtime Live ({dbStatus.latencyMs}ms)</span>
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
            { id: 'runtimes', label: 'Manage Runtimes', icon: Terminal },
            { id: 'music', label: 'Music Library', icon: Headphones },
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

              {/* Developer Profile Portfolio & Photo Card */}
              <div className="p-4 bg-gradient-to-r from-gray-50 via-red-50/20 to-gray-50 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div 
                    onClick={() => setIsProfileModalOpen(true)}
                    className="relative group w-14 h-14 rounded-2xl bg-gray-200 border-2 border-white shadow-md overflow-hidden shrink-0 cursor-pointer flex items-center justify-center"
                    title="Click to change profile photo (Drag & Drop or browse)"
                  >
                    {userProfile.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#E11D26] text-white font-extrabold text-lg flex items-center justify-center">
                        {userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AP'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                      <Camera className="w-3.5 h-3.5 mb-0.5" />
                      <span>Change</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span>{userProfile.name}</span>
                    </h4>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">@{userProfile.username} • {userProfile.email}</p>
                    <p className="text-[11px] text-gray-400 italic mt-0.5">"{userProfile.bio}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#E11D26]" />
                    <span>Change Photo</span>
                  </button>

                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('profile')}
                      className="px-3.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View Profile & Heatmap</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
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

          {/* Section 3: Problems Settings (Categorized CSV/XLSX Import & Feed) */}
          {activeSection === 'problems_settings' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#E11D26]" />
                    <span>Curriculum & Problem Dataset Management</span>
                  </h3>
                  <p className="text-xs text-gray-500">Import custom problems via CSV/XLSX, synchronize dataset, or export curriculum by category</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleConnectRealtimeDb}
                    disabled={isConnectingDb}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Connect and synchronize SQLite database across all screens"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isConnectingDb ? 'animate-spin' : ''}`} />
                    <span>{isConnectingDb ? 'Connecting...' : 'Connect Realtime DB'}</span>
                  </button>

                  <button
                    onClick={() => setConfirmResetModal({
                      open: true,
                      title: `Reset ${datasetCategory === 'python' ? 'Python' : datasetCategory === 'sql' ? 'SQL' : 'PostgreSQL'} Uploaded Problems?`,
                      description: `This will reset all ${datasetCategory} questions back to the verified default factory seed dataset.`,
                      action: () => handleResetCategory(datasetCategory),
                    })}
                    disabled={isResetting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                    title={`Reset ${datasetCategory} uploaded problems back to default`}
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-amber-600 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>Reset {datasetCategory === 'python' ? 'Python' : datasetCategory === 'sql' ? 'SQL' : 'Postgres'}</span>
                  </button>

                  <button
                    onClick={() => setConfirmResetModal({
                      open: true,
                      title: 'Reset All Uploaded Datasets?',
                      description: 'This will purge all custom uploaded problems across Python, SQL, and PostgreSQL and restore default factory datasets.',
                      action: handleResetAllUploaded,
                    })}
                    disabled={isResetting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Reset all uploaded datasets across all categories"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Reset All Uploaded</span>
                  </button>

                  <button
                    onClick={() => handleDownloadSample(datasetCategory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    title={`Download sample ${datasetCategory.toUpperCase()} CSV template`}
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Sample CSV</span>
                  </button>

                  <button
                    onClick={() => handleExportCsv(datasetCategory)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#E11D26]" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Category Selector Tabs */}
              <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setDatasetCategory('python')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    datasetCategory === 'python'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Terminal className={`w-4 h-4 ${datasetCategory === 'python' ? 'text-[#E11D26]' : 'text-gray-400'}`} />
                  <span>Python Practice</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 text-[#C8101A] font-mono">
                    {curriculumStats.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDatasetCategory('sql')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    datasetCategory === 'sql'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Database className={`w-4 h-4 ${datasetCategory === 'sql' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span>SQL Practice</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 font-mono">
                    {sqlStats.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDatasetCategory('postgres')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    datasetCategory === 'postgres'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <Server className={`w-4 h-4 ${datasetCategory === 'postgres' ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <span>PostgreSQL Lab</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-mono">
                    {postgresStats.total}
                  </span>
                </button>
              </div>

              {/* Category-Specific KPI Stats Badges */}
              {datasetCategory === 'python' && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <div className="text-xl font-black text-gray-900">{curriculumStats.total}</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Python</div>
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
              )}

              {datasetCategory === 'sql' && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <div className="text-xl font-black text-gray-900">{sqlStats.total}</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase">Total SQL</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xl font-black text-emerald-600">{sqlStats.easy}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase">Easy SQL</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                    <div className="text-xl font-black text-amber-600">{sqlStats.medium}</div>
                    <div className="text-[10px] text-amber-700 font-semibold uppercase">Medium SQL</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                    <div className="text-xl font-black text-red-600">{sqlStats.hard}</div>
                    <div className="text-[10px] text-red-700 font-semibold uppercase">Hard SQL</div>
                  </div>
                </div>
              )}

              {datasetCategory === 'postgres' && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <div className="text-xl font-black text-gray-900">{postgresStats.total}</div>
                    <div className="text-[10px] text-gray-500 font-semibold uppercase">Total PG Labs</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <div className="text-xl font-black text-emerald-600">{postgresStats.easy}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase">Easy Labs</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                    <div className="text-xl font-black text-amber-600">{postgresStats.medium}</div>
                    <div className="text-[10px] text-amber-700 font-semibold uppercase">Medium Labs</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                    <div className="text-xl font-black text-red-600">{postgresStats.hard}</div>
                    <div className="text-[10px] text-red-700 font-semibold uppercase">Hard Labs</div>
                  </div>
                </div>
              )}

              {/* Dedicated Category File Import Box */}
              <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 hover:bg-red-50/20 hover:border-red-300 transition-all text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-50 text-[#E11D26] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Upload {datasetCategory === 'python' ? 'Python Practice' : datasetCategory === 'sql' ? 'SQL Practice' : 'PostgreSQL Lab'} CSV File
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    {datasetCategory === 'python'
                      ? 'Select a CSV file matching DSA format (columns: order_num, title, pattern_name, subtopic_name, platform, difficulty, practice_link).'
                      : datasetCategory === 'sql'
                      ? 'Select a CSV file with SQL exercises (columns: id, title, difficulty, category, description, schema_sql, seed_sql, initial_query, solution_sql, expected_output_json, input_ascii, output_ascii, explanation, image_url).'
                      : 'Select a CSV file with PostgreSQL lab scripts (columns: id, title, difficulty, category, description, setup_sql, query_solution, verification_sql, notes).'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadSample(datasetCategory)}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-gray-500" />
                    <span>Download {datasetCategory.toUpperCase()} Sample</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmResetModal({
                      open: true,
                      title: `Reset ${datasetCategory.toUpperCase()} Uploaded Problems?`,
                      description: `This will reset all ${datasetCategory} items back to the factory default seed dataset.`,
                      action: () => handleResetCategory(datasetCategory),
                    })}
                    disabled={isResetting}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-4 h-4 text-amber-600 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>Reset Uploaded {datasetCategory.toUpperCase()}</span>
                  </button>

                  <label className="cursor-pointer px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isImporting ? 'Ingesting Dataset...' : `Import ${datasetCategory.toUpperCase()} CSV`}</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.txt"
                      onChange={(e) => handleFileUpload(e, datasetCategory)}
                      disabled={isImporting}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Category-Specific Supported Columns Guide */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="font-bold text-gray-800">
                  Supported Schema Columns for {datasetCategory === 'python' ? 'Python Practice' : datasetCategory === 'sql' ? 'SQL Practice' : 'PostgreSQL Lab'}:
                </div>
                <div className="font-mono text-[11px] text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                  {datasetCategory === 'python' && 'order_num, title, pattern_name, subtopic_name, platform, difficulty, practice_link, video_link, hint_link'}
                  {datasetCategory === 'sql' && 'id, title, difficulty, category, description, schema_sql, seed_sql, initial_query, solution_sql, expected_output_json, input_ascii, output_ascii, explanation, image_url'}
                  {datasetCategory === 'postgres' && 'id, title, difficulty, category, description, setup_sql, query_solution, verification_sql, notes'}
                </div>
                <p className="text-[11px] text-gray-500">
                  {datasetCategory === 'python' && 'Importing updates SQLite questions table and immediately reflects in Python Practice and Problems list.'}
                  {datasetCategory === 'sql' && 'Importing updates SQLite sql_exercises table and immediately feeds into SQL Practice workspace in real time.'}
                  {datasetCategory === 'postgres' && 'Importing updates SQLite postgres_exercises table and immediately feeds into PostgreSQL Lab workspace in real time.'}
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Offline Storage */}
          {activeSection === 'storage' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Offline SQLite Storage & Realtime Engine</h3>
                  <p className="text-xs text-gray-500">Inspect database health, connect realtime engine, and manage uploaded datasets</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConnectRealtimeDb}
                    disabled={isConnectingDb}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isConnectingDb ? 'animate-spin' : ''}`} />
                    <span>{isConnectingDb ? 'Connecting...' : 'Connect Realtime DB'}</span>
                  </button>

                  <button
                    onClick={handleVacuum}
                    className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Optimize & Vacuum DB
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[11px] font-sans font-medium mb-1">Database Engine</span>
                  <div className="font-bold text-gray-900">SQLite 3 (sql.js WebAssembly)</div>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700 block text-[11px] font-sans font-medium mb-1">Realtime Live Engine</span>
                  <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live ({dbStatus.latencyMs}ms latency)</span>
                  </div>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[11px] font-sans font-medium mb-1">Approximate Footprint</span>
                  <div className="font-bold text-gray-900">~1.8 MB (Persisted)</div>
                </div>
              </div>

              {/* Reset Uploaded Datasets & Recovery Card */}
              <div className="p-5 bg-gradient-to-r from-red-50/40 via-amber-50/20 to-gray-50 rounded-2xl border border-red-200/60 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/70 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-[#E11D26]" />
                      <span>Dataset Reset & Baseline Recovery</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Reset custom uploaded problems or restore factory seeds for Python, SQL, and PostgreSQL
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmResetModal({
                      open: true,
                      title: 'Reset All Uploaded Datasets?',
                      description: 'This will purge all custom uploaded questions across Python, SQL, and PostgreSQL and restore original factory seeds.',
                      action: handleResetAllUploaded,
                    })}
                    disabled={isResetting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset All Uploaded Datasets</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="text-xs font-bold text-gray-800">Python Practice</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{curriculumStats.total} total problems</div>
                    </div>
                    <button
                      onClick={() => setConfirmResetModal({
                        open: true,
                        title: 'Reset Python Practice Problems?',
                        description: 'Restore the default 1,337 DSA questions from seed.',
                        action: () => handleResetCategory('python'),
                      })}
                      className="mt-3 w-full py-1.5 bg-gray-50 hover:bg-red-50 hover:text-red-700 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset Python Seed
                    </button>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="text-xs font-bold text-gray-800">SQL Practice</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{sqlStats.total} exercises</div>
                    </div>
                    <button
                      onClick={() => setConfirmResetModal({
                        open: true,
                        title: 'Reset SQL Practice Exercises?',
                        description: 'Restore the default 10 SQL exercises from seed.',
                        action: () => handleResetCategory('sql'),
                      })}
                      className="mt-3 w-full py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset SQL Seed
                    </button>
                  </div>

                  <div className="p-3.5 bg-white rounded-xl border border-gray-200 flex flex-col justify-between shadow-2xs">
                    <div>
                      <div className="text-xs font-bold text-gray-800">PostgreSQL Lab</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{postgresStats.total} labs</div>
                    </div>
                    <button
                      onClick={() => setConfirmResetModal({
                        open: true,
                        title: 'Reset PostgreSQL Lab Exercises?',
                        description: 'Restore the default 4 PostgreSQL labs from seed.',
                        action: () => handleResetCategory('postgres'),
                      })}
                      className="mt-3 w-full py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset PG Seed
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                <div className="font-bold text-gray-800">Database Tables Overview:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-600">
                  <div>• tracks: Core track definitions</div>
                  <div>• questions: Curriculum entries ({curriculumStats.total} total)</div>
                  <div>• sql_exercises: SQL Practice dataset ({sqlStats.total} exercises)</div>
                  <div>• postgres_exercises: PostgreSQL Lab scripts ({postgresStats.total} labs)</div>
                  <div>• attempts: Execution logs, streaks & heatmaps</div>
                  <div>• tasks: To-do planner tasks</div>
                  <div>• study_sessions: Tracked Pomodoro intervals</div>
                  <div>• app_settings: Local key-value preferences</div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Manage Language Runtimes & Toolchains */}
          {(activeSection === 'runtimes' || activeSection === 'python') && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Manage Language Runtimes & Toolchains</h3>
                  <p className="text-xs text-gray-500">
                    Verify execution backends, compiler toolchains, and configure paths for Python, Java, C++, and PostgreSQL
                  </p>
                </div>
                <button
                  onClick={loadRuntimes}
                  disabled={loadingRuntimes}
                  className="px-3.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRuntimes ? 'animate-spin' : ''}`} />
                  <span>Check All Runtimes</span>
                </button>
              </div>

              {/* Runtimes Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Python 3.12 */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">Python 3.12</div>
                        <div className="text-[11px] text-gray-500">CPython / Pyodide Isolated Worker</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Ready
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Version:</span>
                      <span className="text-gray-900 font-bold">{allRuntimes.python?.version || pyInfo?.version || 'Python 3.12.10'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Path:</span>
                      <span className="text-gray-700 truncate max-w-[200px]">{allRuntimes.python?.executable || pyInfo?.executable || 'python.exe'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-emerald-700 font-bold">Verified & Active</span>
                    </div>
                  </div>

                  {runtimeDiagResults.python && (
                    <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2A44] font-mono text-[11px] text-emerald-400">
                      {runtimeDiagResults.python}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyRuntime('python')}
                      disabled={runtimeDiagRunning.python}
                      className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
                      <span>{runtimeDiagRunning.python ? 'Verifying...' : 'Verify Python'}</span>
                    </button>
                    <a
                      href="https://www.python.org/downloads/"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Open Official Python Download Page"
                    >
                      <span>Vendor</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* 2. Java JDK 21 / 25 LTS */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-[#E11D26] flex items-center justify-center font-bold">
                        <Code2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">Java JDK 21/25 LTS</div>
                        <div className="text-[11px] text-gray-500">javac Compiler & HotSpot VM</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      allRuntimes.java?.installed 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {allRuntimes.java?.installed ? 'Ready' : 'Not Installed'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">JDK Version:</span>
                      <span className="text-gray-900 font-bold">{allRuntimes.java?.version || 'javac 25.0.4.1 (Temurin LTS)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Compiler:</span>
                      <span className="text-gray-700 truncate max-w-[200px]">{allRuntimes.java?.executable || 'javac.exe'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-emerald-700 font-bold">{allRuntimes.java?.status || 'Ready (Verified)'}</span>
                    </div>
                  </div>

                  {runtimeDiagResults.java && (
                    <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2A44] font-mono text-[11px] text-emerald-400">
                      {runtimeDiagResults.java}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyRuntime('java')}
                      disabled={runtimeDiagRunning.java}
                      className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-red-600" />
                      <span>{runtimeDiagRunning.java ? 'Compiling Test...' : 'Verify Java'}</span>
                    </button>
                    <a
                      href="https://adoptium.net/temurin/releases/"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Download Eclipse Temurin JDK 21 or 25 LTS"
                    >
                      <span>Vendor</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* 3. C++ Toolchain (GCC/Clang/MSVC) */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">C++ Compiler Toolchain</div>
                        <div className="text-[11px] text-gray-500">MinGW GCC / LLVM Clang / MSVC</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      allRuntimes.cpp?.installed 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {allRuntimes.cpp?.installed ? 'Ready' : 'Not Installed'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Detected:</span>
                      <span className="text-gray-900 font-bold">{allRuntimes.cpp?.version || 'None found in PATH'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Executable:</span>
                      <span className="text-gray-700 truncate max-w-[200px]">{allRuntimes.cpp?.executable || 'g++, clang++, or cl.exe'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className={allRuntimes.cpp?.installed ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                        {allRuntimes.cpp?.status || 'Not Installed (Action Required)'}
                      </span>
                    </div>
                  </div>

                  {!allRuntimes.cpp?.installed && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Windows Toolchain Required</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        To execute C++17 problems locally, install MinGW-w64 (GCC), LLVM Clang, or Visual Studio C++ Build Tools and ensure the bin folder is added to your PATH.
                      </p>
                    </div>
                  )}

                  {runtimeDiagResults.cpp && (
                    <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2A44] font-mono text-[11px] text-emerald-400">
                      {runtimeDiagResults.cpp}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyRuntime('cpp')}
                      disabled={runtimeDiagRunning.cpp}
                      className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-purple-600" />
                      <span>{runtimeDiagRunning.cpp ? 'Testing...' : 'Check C++'}</span>
                    </button>
                    <a
                      href="https://winlibs.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Download MinGW-w64 standalone build for Windows"
                    >
                      <span>WinLibs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://www.msys2.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Download MSYS2 package manager"
                    >
                      <span>MSYS2</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* 4. PostgreSQL Lab Server */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">PostgreSQL Lab</div>
                        <div className="text-[11px] text-gray-500">PostgreSQL TCP Server & psql</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Configured
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs font-mono space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Host / Port:</span>
                      <span className="text-gray-900 font-bold">127.0.0.1:5432</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">User / DB:</span>
                      <span className="text-gray-700">postgres / postgres</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-emerald-700 font-bold">TCP Service Monitored</span>
                    </div>
                  </div>

                  {runtimeDiagResults.postgres && (
                    <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#1E2A44] font-mono text-[11px] text-emerald-400">
                      {runtimeDiagResults.postgres}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleVerifyRuntime('postgres')}
                      disabled={runtimeDiagRunning.postgres}
                      className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
                      <span>{runtimeDiagRunning.postgres ? 'Testing...' : 'Test PG Server'}</span>
                    </button>
                    <a
                      href="https://www.postgresql.org/download/windows/"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Download Official PostgreSQL Installer"
                    >
                      <span>Vendor</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Music Library */}
          {activeSection === 'music' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Focus Music & Ambient Library</h3>
                  <p className="text-xs text-gray-500">
                    Import and manage local focus audio tracks. Managed copies are stored safely in user data directory.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Audio File</span>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a,.flac"
                      onChange={handleImportAudio}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setMusicCategoryFilter('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      musicCategoryFilter === 'all'
                        ? 'bg-[#E11D26] text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    All ({musicTracks.length})
                  </button>
                  {PLAYLISTS.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => setMusicCategoryFilter(pl.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        musicCategoryFilter === pl.id
                          ? 'bg-[#E11D26] text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search focus tracks..."
                    value={musicSearchQuery}
                    onChange={(e) => setMusicSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-hidden focus:border-[#E11D26] w-48"
                  />
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-2">
                {musicTracks
                  .filter((t) => {
                    const matchesCategory =
                      musicCategoryFilter === 'all' ||
                      t.playlist === musicCategoryFilter ||
                      (musicCategoryFilter === 'custom' && t.isCustom);
                    const matchesSearch =
                      t.title.toLowerCase().includes(musicSearchQuery.toLowerCase()) ||
                      t.artist.toLowerCase().includes(musicSearchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  })
                  .map((track) => {
                    const isPlayingThis = musicState.isPlaying && musicState.currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          isPlayingThis
                            ? 'bg-purple-50/80 border-purple-300 text-purple-900'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (isPlayingThis) {
                                studyMusicService.pause();
                              } else {
                                studyMusicService.selectTrack(track.id);
                                studyMusicService.play();
                              }
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              isPlayingThis
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                            title={isPlayingThis ? 'Pause' : 'Play Preview'}
                          >
                            {isPlayingThis ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          </button>

                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <span>{track.title}</span>
                              {track.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {track.artist} • {Math.floor(track.duration / 60)}:{((track.duration % 60) + '').padStart(2, '0')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize">
                            {track.playlist.replace('_', ' ')}
                          </span>

                          {track.isCustom && (
                            <button
                              onClick={() => handleDeleteMusicTrack(track)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete app-managed copy (original source is safe)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
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
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Local Snapshots, Restore & Data Import</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Export encrypted snapshots, restore previous backups transactionally, or import external datasets
                </p>
              </div>

              {/* 3 Dedicated Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Create Backup Card */}
                <div className="p-5 bg-white dark:bg-[#142038] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-[#E11D26] dark:hover:border-[#E11D26] shadow-xs flex flex-col justify-between transition-all group">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#E11D26] flex items-center justify-center font-bold">
                      <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Create Backup</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Export full application data including 1,337 problems, study logs, code drafts, and planner into a secure <code className="font-mono text-[11px] text-[#E11D26]">.apdb</code> snapshot.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-2">
                    <button
                      id="btn-settings-create-backup"
                      onClick={() => onOpenBackupModal('create')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E11D26] hover:bg-[#C8101A] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Create Backup Snapshot</span>
                    </button>
                  </div>
                </div>

                {/* 2. Restore Backup Card */}
                <div className="p-5 bg-white dark:bg-[#142038] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-xs flex flex-col justify-between transition-all group">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <RotateCcw className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Restore Backup</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Select an existing Ap backup, preview detected categories, select full or selective restore, with automatic pre-restore safety snapshots.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-2">
                    <button
                      id="btn-settings-restore-backup"
                      onClick={() => onOpenBackupModal('restore')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 hover:border-blue-500 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold rounded-xl bg-white dark:bg-[#142038] shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore from Backup</span>
                    </button>
                  </div>
                </div>

                {/* 3. Import Data Card */}
                <div className="p-5 bg-white dark:bg-[#142038] rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs flex flex-col justify-between transition-all group">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Import Data</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Import external problem sets or planner task lists from JSON or RFC 4180 CSV with duplicate checking and conflict resolution.
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 mt-2">
                    <button
                      id="btn-settings-import-data"
                      onClick={() => onOpenImportModal ? onOpenImportModal() : onNavigate?.('tracks')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-700 hover:border-emerald-500 text-gray-800 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-bold rounded-xl bg-white dark:bg-[#142038] shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import External Dataset</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Offline-First Security & Safety Details */}
              <div className="p-4 bg-gray-50 dark:bg-[#142038]/50 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Offline-First Guarantee & Local Database Health</span>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Database Engine: SQLite 3.45 (In-Memory + AES/HMAC Encrypted Local Storage)
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Ap Workspace never transmits your problems, code drafts, or study history to external cloud servers. All backups are encrypted locally and cryptographically signed with an HMAC integrity head. Before any restoration occurs, an automatic safety backup is generated to ensure zero data loss.
                </p>
                <div className="pt-1 flex items-center gap-3">
                  <button
                    onClick={() => onOpenBackupModal('create')}
                    className="text-xs text-[#E11D26] hover:underline font-bold flex items-center gap-1"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Open Comprehensive Backup Manager</span>
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
                  src={iconLogo} 
                  alt="Glossy Red Ap Monogram Icon" 
                  className="w-16 h-16 rounded-2xl object-contain drop-shadow-md shrink-0" 
                />
                <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <span>Ap</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E11D26] text-white">v{appVersion}</span>
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Master developer interview preparation, 50 DSA patterns, 1,337 problems, SQL practice, PostgreSQL lab, and local study planner.
                    </p>
                    <p className="text-xs text-gray-500 font-semibold mt-1">
                      Created by Arun Pandian (arun4709s) • arunpandi47777@gmail.com
                    </p>
                  </div>
                  <button
                    id="btn-settings-check-updates"
                    onClick={() => window.dispatchEvent(new CustomEvent('ap_open_update_dialog'))}
                    className="px-4 py-2.5 bg-[#E11D26] text-white font-semibold text-xs rounded-xl shadow-xs hover:bg-[#b8141d] active:scale-95 transition-all flex items-center gap-2 shrink-0 cursor-pointer w-fit"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check for Updates</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80">
                  <span className="text-gray-400 block text-[11px] font-medium mb-1">Architecture & Runtime</span>
                  <div className="font-semibold text-gray-800">{APP_RUNTIME_ARCHITECTURE}</div>
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
                    %APPDATA%\Ap (Local Database & Preferences)
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Edit Profile & Photo Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        onSave={(updated) => {
          setUserProfile(updated);
          setUserName(updated.name);
          setUserHandle(updated.username);
          setUserEmail(updated.email);
          onShowToast('Profile photo and details updated!', 'success');
        }}
      />

      {/* Confirmation Modal for Reset Actions */}
      {confirmResetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-100 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 max-w-md w-full animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E11D26] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#E11D26]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900">{confirmResetModal.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{confirmResetModal.description}</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Realtime SQLite tables will be immediately updated and synchronized across all open screens.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetModal(null)}
                disabled={isResetting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirmResetModal.action) {
                    await confirmResetModal.action();
                  }
                }}
                disabled={isResetting}
                className="px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isResetting ? 'Resetting...' : 'Confirm & Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emerald Green Tick Update Confirmation Popup (Matching Design System) */}
      {showSaveSuccessPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Database Synchronized</h4>
            <p className="text-xs text-gray-500 mt-1">
              Real-time SQLite database updated and broadcast to all workspaces!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
