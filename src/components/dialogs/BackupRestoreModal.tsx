import React, { useState, useRef } from 'react';
import { 
  X, 
  HardDrive, 
  Download, 
  Upload, 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  FileCheck2, 
  AlertCircle, 
  Clock, 
  Layers, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { 
  createBackupPackage, 
  validateAndInspectBackup, 
  restoreBackup, 
  BackupPreview, 
  RestoreResult, 
  rollbackToSafetyBackup,
  getSafetyBackupInfo
} from '@/services/backup/backupService';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  initialTab?: 'create' | 'restore';
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'create',
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>(initialTab);

  // Create Backup state
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Restore Backup state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'all' | 'selective'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [safetyInfo, setSafetyInfo] = useState(() => getSafetyBackupInfo());

  // Handle Escape key to dismiss dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle Create Backup
  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const { fileName, content, blob } = await createBackupPackage({
        includeHistory,
        includeDrafts,
      });

      // If in Electron, allow user to choose save destination
      if (window.electronAPI?.saveBackupFileDialog && window.electronAPI?.writeBackupFile) {
        const dialogRes = await window.electronAPI.saveBackupFileDialog({ defaultName: fileName });
        if (!dialogRes.canceled && dialogRes.filePath) {
          const writeRes = await window.electronAPI.writeBackupFile(dialogRes.filePath, content);
          if (!writeRes.success) {
            throw new Error(writeRes.error || 'Failed to write backup file to disk.');
          }
          onSuccess(`Encrypted backup saved to ${dialogRes.filePath}`);
          onClose();
          return;
        }
      }

      // Browser fallback download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onSuccess('Encrypted local backup snapshot downloaded successfully with HMAC chain head.');
      onClose();
    } catch (err: any) {
      setValidationError(`Backup creation failed: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Open File for Restore
  const handleSelectFile = async () => {
    setValidationError(null);
    setRestoreResult(null);

    // Try native Electron file dialog first
    if (window.electronAPI?.openBackupFileDialog && window.electronAPI?.readBackupFile) {
      try {
        const dialogRes = await window.electronAPI.openBackupFileDialog();
        if (dialogRes.canceled || !dialogRes.filePaths?.length) return;

        const filePath = dialogRes.filePaths[0];
        setIsValidating(true);
        const readRes = await window.electronAPI.readBackupFile(filePath);
        if (!readRes.success || !readRes.content) {
          throw new Error(readRes.error || 'Failed to read selected file.');
        }

        setFileName(readRes.fileName || filePath.split(/[/\\]/).pop() || 'backup.apdb');
        setFileContent(readRes.content);
        await parseAndPreview(readRes.content, readRes.size || 0);
        return;
      } catch (err: any) {
        setValidationError(err.message);
        setIsValidating(false);
        return;
      }
    }

    // HTML input fallback
    fileInputRef.current?.click();
  };

  const handleBrowserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setRestoreResult(null);
    setFileName(file.name);
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      await parseAndPreview(text, file.size);
    };
    reader.onerror = () => {
      setValidationError('Failed to read file from disk.');
      setIsValidating(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseAndPreview = async (content: string, size: number) => {
    try {
      const res = await validateAndInspectBackup(content, size);
      setPreview(res);
      setSelectedCategories(res.categories.filter(c => c.available).map(c => c.id));
      setValidationError(null);
    } catch (err: any) {
      setPreview(null);
      setValidationError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleExecuteRestore = async () => {
    if (!preview || !confirmUnderstood) return;
    setIsRestoring(true);
    setValidationError(null);

    try {
      const targetCats = restoreMode === 'all' ? undefined : selectedCategories;
      const res = await restoreBackup(preview, targetCats);
      setRestoreResult(res);
      setSafetyInfo(getSafetyBackupInfo());
      onSuccess(res.message);
    } catch (err: any) {
      setValidationError(err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRollback = async () => {
    try {
      const res = await rollbackToSafetyBackup();
      if (res.success) {
        onSuccess(res.message);
        onClose();
      } else {
        setValidationError(res.message);
      }
    } catch (err: any) {
      setValidationError(`Rollback failed: ${err.message}`);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-[#0E1526] w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-[#1E2A44] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1E2A44] shrink-0 bg-white dark:bg-[#0E1526]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#E11D26] flex items-center justify-center font-bold">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Backup & Restore Center</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cryptographic snapshots, validation & transactional recovery</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-100 dark:border-[#1E2A44] bg-gray-50/50 dark:bg-[#142038]/50 flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setActiveTab('create'); setValidationError(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'create'
                ? 'bg-white dark:bg-[#1E2A44] text-[#E11D26] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Create Backup</span>
          </button>
          <button
            onClick={() => { setActiveTab('restore'); setValidationError(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'restore'
                ? 'bg-white dark:bg-[#1E2A44] text-[#E11D26] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {validationError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold">Error: </span>
                {validationError}
              </div>
            </div>
          )}

          {activeTab === 'create' ? (
            /* CREATE BACKUP CONTENT */
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <strong>Offline-First Guarantee:</strong> Your backup includes 100% of your problems, study history, and task data protected with DPAPI-grade encryption and an HMAC tamper-evidence chain.
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Backup Contents Checklist:</div>
                {[
                  { label: 'SQLite Core Database (1,337 problems, tracks, topics)', checked: true },
                  { label: 'Pomodoro Study Sessions & Inactivity Logs', checked: includeHistory, set: setIncludeHistory },
                  { label: 'Saved Code Drafts & SQL Queries', checked: includeDrafts, set: setIncludeDrafts },
                  { label: 'Custom Planner Tasks & Daily Reviews', checked: true },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={!item.set}
                      onChange={(e) => item.set && item.set(e.target.checked)}
                      className="w-4 h-4 rounded text-[#E11D26] focus:ring-red-500 border-gray-300 dark:border-gray-700"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="p-3 bg-gray-50 dark:bg-[#142038]/50 rounded-xl border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>Backup Format: <strong>Ap Package v2 (.apdb)</strong></span>
                <span>Estimated Size: <strong>~1.4 MB</strong></span>
              </div>
            </div>
          ) : (
            /* RESTORE BACKUP CONTENT */
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".apdb,.json,.sqlite,.db"
                onChange={handleBrowserFileChange}
                className="hidden"
              />

              {!preview && !restoreResult && (
                <div 
                  onClick={handleSelectFile}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#E11D26] dark:hover:border-[#E11D26] rounded-2xl p-7 text-center cursor-pointer transition-all bg-gray-50/50 dark:bg-[#142038]/30 hover:bg-red-50/20"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2.5" />
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    {isValidating ? 'Validating backup file...' : 'Click to select Ap Backup File (.apdb, .json)'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Supports versioned Ap packages and legacy .apdb SQLite backups
                  </p>
                  <button
                    type="button"
                    disabled={isValidating}
                    className="mt-3 px-4 py-2 text-xs font-bold text-white bg-[#E11D26] hover:bg-[#C8101A] rounded-xl shadow-xs"
                  >
                    {isValidating ? 'Inspecting...' : 'Select Backup File'}
                  </button>
                </div>
              )}

              {/* Preview State */}
              {preview && !restoreResult && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate max-w-xs">{fileName}</div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Format: {preview.format} • Created: {new Date(preview.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSelectFile}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Restore Scope Choice */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Restoration Scope:</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        restoreMode === 'all'
                          ? 'border-[#E11D26] bg-red-50/20 text-[#E11D26] font-bold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'all'}
                            onChange={() => setRestoreMode('all')}
                            className="text-[#E11D26] focus:ring-[#E11D26]"
                          />
                          <span>Restore All Categories</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal mt-1 pl-5">
                          Full replace ({preview.totalRecords} records)
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        restoreMode === 'selective'
                          ? 'border-[#E11D26] bg-red-50/20 text-[#E11D26] font-bold'
                          : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'selective'}
                            onChange={() => setRestoreMode('selective')}
                            className="text-[#E11D26] focus:ring-[#E11D26]"
                          />
                          <span>Selective Categories</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-normal mt-1 pl-5">
                          Choose specific tables to merge
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Categories Breakdown */}
                  <div className="space-y-2 border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/50 dark:bg-[#142038]/30 max-h-48 overflow-y-auto">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Detected Categories & Counts</div>
                    {preview.categories.map(cat => (
                      <label 
                        key={cat.id} 
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer ${
                          !cat.available ? 'opacity-40 pointer-events-none' : 'hover:bg-white dark:hover:bg-[#1E2A44]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={restoreMode === 'all' || !cat.available}
                            checked={restoreMode === 'all' ? cat.available : selectedCategories.includes(cat.id)}
                            onChange={() => toggleCategory(cat.id)}
                            className="w-3.5 h-3.5 rounded text-[#E11D26] focus:ring-red-500"
                          />
                          <span className="font-medium text-gray-800 dark:text-gray-200">{cat.label}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 bg-white dark:bg-[#1E2A44] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                          {cat.count} records
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Warning Notice & Explicit Confirmation */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-2 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Data Replacement & Safety Guarantee</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Restoring will overwrite existing records in the selected categories. An <strong>automatic safety snapshot</strong> of your current database will be saved before changes are applied.
                    </p>
                    <label className="flex items-center gap-2 pt-1 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmUnderstood}
                        onChange={(e) => setConfirmUnderstood(e.target.checked)}
                        className="w-4 h-4 rounded text-[#E11D26] focus:ring-red-500 border-amber-300"
                      />
                      <span className="text-amber-900 dark:text-amber-200">I understand and confirm restoring this backup data.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Restore Result State */}
              {restoreResult && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-3 text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Restoration Completed Successfully!</span>
                  </div>
                  <p className="text-xs">{restoreResult.message}</p>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-lg bg-white/70 dark:bg-[#142038]/60">
                      <div className="text-[10px] text-gray-500">Categories Restored</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">{restoreResult.restoredCategories.length}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/70 dark:bg-[#142038]/60">
                      <div className="text-[10px] text-gray-500">Safety Backup Created</div>
                      <div className="text-xs font-bold text-emerald-600">Saved in Local Storage</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1E2A44] bg-gray-50/50 dark:bg-[#142038]/50 flex items-center justify-between shrink-0">
          <div>
            {safetyInfo.exists && (
              <button
                type="button"
                onClick={handleRollback}
                className="text-[11px] text-gray-500 hover:text-[#E11D26] flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Rollback to Pre-Restore State</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
            >
              {restoreResult ? 'Done' : 'Cancel'}
            </button>

            {activeTab === 'create' ? (
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreating}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#E11D26] hover:bg-[#C8101A] disabled:opacity-50 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isCreating ? 'Creating Snapshot...' : 'Create Backup'}</span>
              </button>
            ) : !restoreResult ? (
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!preview || !confirmUnderstood || isRestoring || (restoreMode === 'selective' && selectedCategories.length === 0)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#E11D26] hover:bg-[#C8101A] disabled:opacity-50 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restoring Database...' : 'Confirm & Restore'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
