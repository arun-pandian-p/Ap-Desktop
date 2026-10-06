import React, { useState } from 'react';
import { X, Play, Clock, Sparkles } from 'lucide-react';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (durationMinutes: number, taskName: string) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({
  isOpen,
  onClose,
  onStart,
}) => {
  const [sessionName, setSessionName] = useState('DSA Practice & Problem Solving');
  const [duration, setDuration] = useState(25);
  const [focusMode, setFocusMode] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E11D26] flex items-center justify-center font-bold">
              <Play className="w-4 h-4 fill-[#E11D26]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Start Study Session</h3>
              <p className="text-xs text-gray-500">Configure your Pomodoro focus block</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Session Focus / Task Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-[#E11D26]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Planned Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 45, 60, 90].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    duration === mins
                      ? 'bg-red-50 text-[#C8101A] border-red-300 ring-2 ring-red-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-800">Distraction-Free Mode</div>
              <div className="text-[11px] text-gray-500">Mutes notifications during this interval</div>
            </div>
            <input
              type="checkbox"
              checked={focusMode}
              onChange={(e) => setFocusMode(e.target.checked)}
              className="w-4 h-4 rounded text-[#E11D26] focus:ring-red-500 border-gray-300"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onStart(duration, sessionName);
                onClose();
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#E11D26] hover:bg-[#C8101A] rounded-lg shadow-sm"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
