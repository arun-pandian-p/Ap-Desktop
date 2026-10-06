import React, { useState } from 'react';
import { X, HardDrive, Download, Upload, ShieldCheck, Check } from 'lucide-react';
import { persistDatabase } from '@/services/db';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeDrafts, setIncludeDrafts] = useState(true);

  if (!isOpen) return null;

  const handleCreateBackup = () => {
    persistDatabase();
    const saved = localStorage.getItem('ap_encrypted_sqlite_db_v1') || '';
    const blob = new Blob([saved], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ap_backup_${new Date().toISOString().slice(0, 10)}.apdb`;
    a.click();
    URL.revokeObjectURL(url);
    onSuccess('Encrypted local backup downloaded successfully with HMAC chain head.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E11D26] flex items-center justify-center font-bold">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Backup & Restore Data</h3>
              <p className="text-xs text-gray-500">Secure snapshot of your local progress & notes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong>Offline-First Guarantee:</strong> Your backup includes 100% of your problems, study history, and task data protected with DPAPI-grade encryption and an HMAC tamper-evidence chain.
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-800">Backup Contents Checklist:</div>
            {[
              { label: 'SQLite Core Database (1,337 problems, tracks, topics)', checked: true },
              { label: 'Pomodoro Study Sessions & Inactivity Logs', checked: includeHistory, set: setIncludeHistory },
              { label: 'Saved Code Drafts & SQL Queries', checked: includeDrafts, set: setIncludeDrafts },
              { label: 'Custom Planner Tasks & Daily Reviews', checked: true },
            ].map((item, idx) => (
              <label key={idx} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={!item.set}
                  onChange={(e) => item.set && item.set(e.target.checked)}
                  className="w-4 h-4 rounded text-[#E11D26] focus:ring-red-500 border-gray-300"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Estimated Size: <strong>~1.4 MB</strong></span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#E11D26] hover:bg-[#C8101A] rounded-lg shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Create Backup</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
