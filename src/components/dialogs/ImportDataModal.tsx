import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Table, 
  RefreshCw, 
  Plus, 
  Database, 
  CheckSquare, 
  Code2, 
  Layers,
  Download
} from 'lucide-react';
import { 
  previewDataset, 
  commitDatasetImport, 
  DatasetType, 
  DatasetFormat, 
  ConflictMode, 
  DatasetPreview, 
  DatasetImportResult 
} from '@/services/import/datasetImportService';
import { Track } from '@/types';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks?: Track[];
  onSuccess: (msg: string) => void;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  tracks = [],
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasetType, setDatasetType] = useState<DatasetType>('problems');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // Target track configuration (for problems)
  const [targetTrackMode, setTargetTrackMode] = useState<'existing' | 'new'>('existing');
  const [selectedTrackSlug, setSelectedTrackSlug] = useState<string>(tracks[0]?.slug || 'top-interview-150');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackCategory, setNewTrackCategory] = useState('Imported Sheets');

  // Conflict handling
  const [conflictMode, setConflictMode] = useState<ConflictMode>('skip');

  // Preview & Status
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<DatasetImportResult | null>(null);

  // Handle Escape key to dismiss dialog
  useEffect(() => {
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

  const handleSelectFile = async () => {
    setValidationError(null);
    setImportResult(null);

    // Native Electron dialog
    if (window.electronAPI?.openImportFileDialog && window.electronAPI?.readImportFile) {
      try {
        const dialogRes = await window.electronAPI.openImportFileDialog();
        if (dialogRes.canceled || !dialogRes.filePaths?.length) return;

        const filePath = dialogRes.filePaths[0];
        setIsValidating(true);
        const readRes = await window.electronAPI.readImportFile(filePath);
        if (!readRes.success || !readRes.content) {
          throw new Error(readRes.error || 'Failed to read dataset file.');
        }

        setFileName(readRes.fileName || filePath.split(/[/\\]/).pop() || 'dataset');
        setRawText(readRes.content);
        await runValidationAndPreview(readRes.content, datasetType);
        return;
      } catch (err: any) {
        setValidationError(err.message);
        setIsValidating(false);
        return;
      }
    }

    fileInputRef.current?.click();
  };

  const handleBrowserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setImportResult(null);
    setFileName(file.name);
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      await runValidationAndPreview(text, datasetType);
    };
    reader.onerror = () => {
      setValidationError('Failed to read file.');
      setIsValidating(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    setFileName(null);
    setImportResult(null);
    await runValidationAndPreview(text, datasetType);
  };

  const runValidationAndPreview = async (text: string, type: DatasetType) => {
    if (!text.trim()) {
      setPreview(null);
      setValidationError(null);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    try {
      const prev = await previewDataset(type, text, undefined, {
        targetTrackSlug: targetTrackMode === 'existing' ? selectedTrackSlug : undefined,
      });
      setPreview(prev);
      setValidationError(null);
    } catch (err: any) {
      setPreview(null);
      setValidationError(`Validation failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDatasetTypeChange = async (newType: DatasetType) => {
    setDatasetType(newType);
    setImportResult(null);
    if (rawText.trim()) {
      await runValidationAndPreview(rawText, newType);
    }
  };

  const handleExecuteImport = async () => {
    if (!rawText.trim()) return;
    setIsImporting(true);
    setValidationError(null);

    try {
      const res = await commitDatasetImport(datasetType, rawText, preview?.format, {
        conflictMode,
        targetTrackSlug: targetTrackMode === 'existing' ? selectedTrackSlug : undefined,
        newTrackTitle: targetTrackMode === 'new' ? newTrackTitle : undefined,
        newTrackCategory: targetTrackMode === 'new' ? newTrackCategory : undefined,
      });

      setImportResult(res);
      onSuccess(res.message);
    } catch (err: any) {
      setValidationError(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-[#0E1526] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-[#1E2A44] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1E2A44] shrink-0 bg-white dark:bg-[#0E1526]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">External Dataset Importer</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Import questions, sheets & planner tasks from JSON or CSV</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dataset Type Selector */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-100 dark:border-[#1E2A44] bg-gray-50/50 dark:bg-[#142038]/50 flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleDatasetTypeChange('problems')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              datasetType === 'problems'
                ? 'bg-white dark:bg-[#1E2A44] text-[#E11D26] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Problem Collections (JSON / CSV)</span>
          </button>
          <button
            onClick={() => handleDatasetTypeChange('tasks')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              datasetType === 'tasks'
                ? 'bg-white dark:bg-[#1E2A44] text-[#E11D26] shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Planner Tasks (JSON / CSV)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt"
            onChange={handleBrowserFileChange}
            className="hidden"
          />

          {validationError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-relaxed">{validationError}</div>
            </div>
          )}

          {/* Destination options for problems */}
          {datasetType === 'problems' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Target Sheet Destination
              </label>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="targetTrackMode"
                    checked={targetTrackMode === 'existing'}
                    onChange={() => setTargetTrackMode('existing')}
                    className="text-[#E11D26] focus:ring-[#E11D26]"
                  />
                  <span>Add to Existing Track</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="targetTrackMode"
                    checked={targetTrackMode === 'new'}
                    onChange={() => setTargetTrackMode('new')}
                    className="text-[#E11D26] focus:ring-[#E11D26]"
                  />
                  <span>Create New Track for this Dataset</span>
                </label>
              </div>

              {targetTrackMode === 'existing' ? (
                <select
                  value={selectedTrackSlug}
                  onChange={(e) => setSelectedTrackSlug(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
                >
                  {tracks.length > 0 ? (
                    tracks.map(t => (
                      <option key={t.id} value={t.slug}>
                        {t.title} ({t.total_problems || 0} questions)
                      </option>
                    ))
                  ) : (
                    <option value="top-interview-150">Top Interview 150</option>
                  )}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <input
                    type="text"
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    placeholder="New Track Title (e.g. NeetCode 150)"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
                  />
                  <input
                    type="text"
                    value={newTrackCategory}
                    onChange={(e) => setNewTrackCategory(e.target.value)}
                    placeholder="Category (e.g. DSA Placement)"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Conflict Resolution Strategy */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Duplicate Title Conflict Resolution
            </label>
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="conflictMode"
                  checked={conflictMode === 'skip'}
                  onChange={() => setConflictMode('skip')}
                  className="text-[#E11D26] focus:ring-[#E11D26]"
                />
                <span>Skip Duplicates (Default)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="conflictMode"
                  checked={conflictMode === 'overwrite'}
                  onChange={() => setConflictMode('overwrite')}
                  className="text-[#E11D26] focus:ring-[#E11D26]"
                />
                <span>Update Existing Records</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="conflictMode"
                  checked={conflictMode === 'keep_both'}
                  onChange={() => setConflictMode('keep_both')}
                  className="text-[#E11D26] focus:ring-[#E11D26]"
                />
                <span>Keep Both (Append)</span>
              </label>
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Select File or Paste Content
              </label>
              <span className="text-[11px] text-gray-400">
                Supports .json and RFC 4180 .csv
              </span>
            </div>

            <div 
              onClick={handleSelectFile}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-[#142038]/30 hover:bg-emerald-50/20"
            >
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {fileName ? fileName : 'Click to browse or drop external dataset file'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Native dialog or browser file selector
              </p>
            </div>

            <textarea
              value={rawText}
              onChange={handleTextChange}
              placeholder={`Or paste raw JSON array or CSV text here...\nExample JSON: [{"title": "Two Sum", "difficulty": "Easy"}]`}
              rows={3}
              className="w-full font-mono text-[11px] px-3.5 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Preview State */}
          {preview && preview.totalRecords > 0 && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Detected Format: <strong className="uppercase">{preview.format}</strong> • Total Records: {preview.totalRecords}</span>
                </span>
                <span className="text-[11px] text-amber-600 font-semibold">
                  {preview.duplicateCount > 0 ? `${preview.duplicateCount} duplicate(s) detected` : 'No duplicates detected'}
                </span>
              </div>

              {preview.sampleRows.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto max-h-36">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-[#142038] border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                        {preview.headers.slice(0, 6).map((h, i) => (
                          <th key={i} className="p-2 font-bold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-400">
                      {preview.sampleRows.slice(0, 4).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {preview.headers.slice(0, 6).map((h, cIdx) => (
                            <td key={cIdx} className="p-2 truncate max-w-xs">{String(row[h] || '-')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Post-Import Result Summary */}
          {importResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2 text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Dataset Import Process Completed</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                  Target: {importResult.targetDestination}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-lg bg-white/70 dark:bg-[#142038]/60">
                  <div className="text-[10px] text-gray-500">Total Rows</div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">{importResult.total}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-[#142038]/60 text-emerald-600">
                  <div className="text-[10px]">Imported</div>
                  <div className="text-base font-bold">{importResult.imported}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-[#142038]/60 text-amber-600">
                  <div className="text-[10px]">Duplicates</div>
                  <div className="text-base font-bold">{importResult.duplicatesSkipped}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/70 dark:bg-[#142038]/60 text-red-600">
                  <div className="text-[10px]">Errors</div>
                  <div className="text-base font-bold">{importResult.errors.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1E2A44] bg-gray-50/50 dark:bg-[#142038]/50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
          >
            {importResult ? 'Done' : 'Cancel'}
          </button>
          {!importResult && (
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!rawText.trim() || !preview || preview.validRecords === 0 || isImporting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              <span>{isImporting ? 'Importing Dataset...' : 'Confirm & Import Dataset'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
