import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Table, 
  RefreshCw,
  Plus,
  HelpCircle
} from 'lucide-react';
import { importCodingSheetFromCsv } from '@/services/db';
import { parseCsvText, generateCodingSheetSampleCsv, CsvImportSummary, ParsedCsvResult } from '@/services/db/csvHelper';
import { Track } from '@/types';

interface ImportSheetCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  defaultTrackSlug?: string;
  onSuccess?: (summary: CsvImportSummary) => void;
}

export const ImportSheetCsvModal: React.FC<ImportSheetCsvModalProps> = ({
  isOpen,
  onClose,
  tracks,
  defaultTrackSlug,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>('existing');
  const [selectedTrackSlug, setSelectedTrackSlug] = useState<string>(defaultTrackSlug || (tracks[0]?.slug || ''));
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackCategory, setNewTrackCategory] = useState('Placement Sheet');

  const [preview, setPreview] = useState<ParsedCsvResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      validateAndPreview(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    setFileName(null);
    validateAndPreview(text);
  };

  const validateAndPreview = (text: string) => {
    setImportSummary(null);
    if (!text.trim()) {
      setPreview(null);
      setValidationErrors([]);
      return;
    }

    try {
      const parsed = parseCsvText(text);
      setPreview(parsed);

      const errors: string[] = [];
      if (parsed.headers.length === 0) {
        errors.push('No headers detected in CSV file.');
      }
      if (!parsed.headers.includes('title')) {
        errors.push('Warning: No "title" column found. Ensure questions have a title or problem_name column.');
      }
      if (parsed.rows.length === 0) {
        errors.push('No data rows found below headers.');
      }

      setValidationErrors(errors);
    } catch (err: any) {
      setValidationErrors([`Parsing failed: ${err.message}`]);
    }
  };

  const handleDownloadSample = () => {
    const sample = generateCodingSheetSampleCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coding_sheet_sample_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadErrorReport = () => {
    if (!importSummary || !importSummary.errors.length) return;
    const errorRows = importSummary.errors.map(e => `Row ${e.row || e.line || '?'}: ${e.error || e.message}`).join('\n');
    const blob = new Blob([errorRows], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitImport = async () => {
    if (!csvText.trim()) return;
    setIsImporting(true);

    try {
      const options: any = { csvText };
      if (targetMode === 'new') {
        options.newTrackTitle = newTrackTitle.trim() || 'Imported Coding Sheet';
        options.category = newTrackCategory.trim() || 'Imported Sheets';
      } else {
        options.targetTrackSlug = selectedTrackSlug;
      }

      const summary = await importCodingSheetFromCsv(options);
      setImportSummary(summary);
      if (onSuccess) onSuccess(summary);
    } catch (err: any) {
      setValidationErrors([`Import failed: ${err.message}`]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#0E1526] border border-[#E8EAF2] dark:border-[#1E2A44] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-csv-title"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-[#0E1526] border-b border-[#E8EAF2] dark:border-[#1E2A44] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 text-[#E11D26] flex items-center justify-center font-bold">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 id="import-csv-title" className="text-sm font-extrabold text-gray-900 dark:text-white">
                Import Coding Sheet from CSV
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                RFC 4180 parser supporting commas/newlines inside quotes & automatic delimiter detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Track Destination */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Import Destination
            </label>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'existing'}
                  onChange={() => setTargetMode('existing')}
                  className="text-[#E11D26] focus:ring-[#E11D26]"
                />
                <span>Add to Existing Sheet</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'new'}
                  onChange={() => setTargetMode('new')}
                  className="text-[#E11D26] focus:ring-[#E11D26]"
                />
                <span>Create New Sheet for this CSV</span>
              </label>
            </div>

            {targetMode === 'existing' ? (
              <select
                value={selectedTrackSlug}
                onChange={(e) => setSelectedTrackSlug(e.target.value)}
                className="w-full mt-1 px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
              >
                {tracks.map(t => (
                  <option key={t.id} value={t.slug}>
                    {t.title} ({t.total_problems || 0} items)
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <input
                    type="text"
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    placeholder="New Sheet Title (e.g. Blind 75 DSA)"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={newTrackCategory}
                    onChange={(e) => setNewTrackCategory(e.target.value)}
                    placeholder="Category (e.g. Placement)"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Upload Area & Sample Template */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Select CSV File or Paste Raw Text
              </label>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-xs text-[#E11D26] hover:underline font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template</span>
              </button>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#E11D26] dark:hover:border-[#E11D26] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-[#142038]/30 hover:bg-red-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {fileName ? fileName : 'Click to browse or drop CSV file here'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                UTF-8 encoded with comma or semicolon delimiter
              </p>
            </div>

            <textarea
              value={csvText}
              onChange={handleTextChange}
              placeholder="Or paste raw CSV text directly here..."
              rows={4}
              className="w-full font-mono text-[11px] px-3.5 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26]"
            />
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Validation Notices:</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* CSV Preview Table */}
          {preview && preview.rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-gray-400" />
                  <span>Detected: {preview.rows.length} rows (Delimiter: "{preview.delimiter}")</span>
                </span>
                <span className="text-[11px] text-gray-400 font-normal">Showing first 4 rows preview</span>
              </div>

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto max-h-40">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-[#142038] border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                      {preview.headers.map((h, i) => (
                        <th key={i} className="p-2 font-bold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-600 dark:text-gray-400">
                    {preview.rows.slice(0, 4).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {preview.headers.map((h, cIdx) => (
                          <td key={cIdx} className="p-2 truncate max-w-xs">{row.record[h] || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Post-Import Results Summary */}
          {importSummary && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Import Completed Successfully!</span>
                </div>
                {importSummary.errors.length > 0 && (
                  <button
                    onClick={handleDownloadErrorReport}
                    className="text-xs text-[#E11D26] hover:underline font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Error Report ({importSummary.errors.length})</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs mt-2">
                <div className="p-2 rounded-lg bg-white/60 dark:bg-[#142038]/60">
                  <div className="text-[10px] text-gray-500">Total Rows</div>
                  <div className="text-base font-black text-gray-900 dark:text-white">{importSummary.totalRows || preview?.rows.length || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/60 dark:bg-[#142038]/60 text-emerald-600">
                  <div className="text-[10px]">Imported</div>
                  <div className="text-base font-black">{importSummary.imported}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/60 dark:bg-[#142038]/60 text-amber-600">
                  <div className="text-[10px]">Duplicates</div>
                  <div className="text-base font-black">{importSummary.duplicates || importSummary.duplicate || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/60 dark:bg-[#142038]/60 text-red-600">
                  <div className="text-[10px]">Errors</div>
                  <div className="text-base font-black">{importSummary.errors.length}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-[#131D33] border-t border-[#E8EAF2] dark:border-[#1E2A44] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            {importSummary ? 'Done' : 'Cancel'}
          </button>
          {!importSummary && (
            <button
              type="button"
              onClick={handleCommitImport}
              disabled={isImporting || !csvText.trim() || !preview || preview.rows.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Upload className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
              <span>{isImporting ? 'Importing Questions...' : 'Confirm & Import Questions'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
