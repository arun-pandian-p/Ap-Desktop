import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Volume2, 
  Flame, 
  MoreVertical,
  Activity,
  Sparkles
} from 'lucide-react';
import { ScreenId } from '@/types';

interface SessionsViewProps {
  onNavigate: (screen: ScreenId) => void;
  onOpenStartModal: () => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  onNavigate,
  onOpenStartModal,
}) => {
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(2);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const switchMode = (m: 'focus' | 'short_break' | 'long_break') => {
    setMode(m);
    setIsActive(false);
    if (m === 'focus') setSecondsLeft(25 * 60);
    else if (m === 'short_break') setSecondsLeft(5 * 60);
    else setSecondsLeft(15 * 60);
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Study Sessions & Focus Timer</h1>
          <p className="text-xs text-gray-500 mt-1">Pomodoro intervals with privacy-preserving inactivity tracking</p>
        </div>

        <button
          onClick={onOpenStartModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>New Custom Session</span>
        </button>
      </div>

      {/* Main Grid: Stay Focused Dark Card & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dark Timer Card (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1220] text-white p-7 rounded-3xl border border-[#1E2A44] shadow-lg flex flex-col justify-between" data-surface="dark-panel">
          {/* Modes Pill Segmented */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => switchMode('focus')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                mode === 'focus' ? 'bg-[#E11D26] text-white shadow-xs' : 'bg-[#142038] text-gray-400 hover:text-white'
              }`}
            >
              Focus 25 min
            </button>
            <button
              onClick={() => switchMode('short_break')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                mode === 'short_break' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#142038] text-gray-400 hover:text-white'
              }`}
            >
              Short Break 5 min
            </button>
            <button
              onClick={() => switchMode('long_break')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                mode === 'long_break' ? 'bg-[#10B981] text-white shadow-xs' : 'bg-[#142038] text-gray-400 hover:text-white'
              }`}
            >
              Long Break 15 min
            </button>
          </div>

          {/* Big Timer Display */}
          <div className="my-6 text-center">
            <div className="text-7xl font-mono font-black tracking-tighter text-white mb-2">
              {formatTime(secondsLeft)}
            </div>
            <div className="text-xs text-gray-400 font-medium flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{isActive ? 'Session in Progress' : 'Ready to Focus'}</span>
              <span>•</span>
              <span className="text-gray-300">Target: DSA Pattern 14</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-8 py-3 rounded-2xl text-white font-extrabold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E11D26] hover:bg-[#C8101A]'
              }`}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isActive ? 'Pause Interval' : 'Start Focus'}</span>
            </button>

            <button
              onClick={() => { setIsActive(false); switchMode(mode); }}
              className="p-3 bg-[#142038] hover:bg-[#1E2A44] text-gray-300 rounded-2xl transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-[#1E2A44] text-xs text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <Volume2 className="w-4 h-4 text-gray-400" />
              <span>Sound notification on finish</span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#E11D26]"
              />
            </label>
            <span className="text-[11px] text-gray-500">Auto-logged to local database</span>
          </div>
        </div>

        {/* Stats & Session Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Statistics */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Today's Focus Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[11px] text-gray-500">Total Focus Time</span>
                <div className="text-xl font-black text-gray-900 mt-0.5">4h 12m</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[11px] text-gray-500">Sessions Finished</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">7 Blocks</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[11px] text-gray-500">Tasks Completed</span>
                <div className="text-xl font-black text-blue-600 mt-0.5">3 Tasks</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-[11px] text-gray-500">Average Block</span>
                <div className="text-xl font-black text-gray-900 mt-0.5">26.5 min</div>
              </div>
            </div>
          </div>

          {/* Idle Detection Privacy Guarantee Card (Section 16.6 H) */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Idle Detection & Privacy</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Ap tracks your active study intervals without invading your privacy.
            </p>

            <div className="space-y-1.5 text-[11px] text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Input timestamps only (no keystroke contents recorded)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero webcam or screen video monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>All session intervals stored strictly on your local disk</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500">Mark idle after:</span>
              <select
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(Number(e.target.value))}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 font-semibold text-gray-700"
              >
                <option value={1}>1 Minute</option>
                <option value={2}>2 Minutes (Default)</option>
                <option value={5}>5 Minutes</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
