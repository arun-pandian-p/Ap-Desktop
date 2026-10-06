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
  Sparkles,
  Radio,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  X
} from 'lucide-react';
import { ScreenId } from '@/types';
import { StudyMusicPlayer } from '@/components/study/StudyMusicPlayer';
import { studyMusicService } from '@/services/audio/studyMusicService';

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
  const [playMusicWithSession, setPlayMusicWithSession] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [musicState, setMusicState] = useState(studyMusicService.getState());

  useEffect(() => {
    const unsub = studyMusicService.subscribe(() => {
      setMusicState(studyMusicService.getState());
    });
    return () => unsub();
  }, []);

  const toggleAlwaysOnTop = async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.setAlwaysOnTop) {
      const next = !isAlwaysOnTop;
      const res = await window.electronAPI.setAlwaysOnTop(next);
      setIsAlwaysOnTop(res ?? next);
    } else {
      setIsAlwaysOnTop(!isAlwaysOnTop);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      if (soundEnabled) {
        studyMusicService.playCompletionChime();
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, soundEnabled]);

  const switchMode = (m: 'focus' | 'short_break' | 'long_break') => {
    setMode(m);
    setIsActive(false);
    if (m === 'focus') setSecondsLeft(25 * 60);
    else if (m === 'short_break') setSecondsLeft(5 * 60);
    else setSecondsLeft(15 * 60);
  };

  const handleToggleTimer = () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    if (playMusicWithSession) {
      if (nextActive) {
        studyMusicService.play();
      } else {
        studyMusicService.pause();
      }
    }
  };

  const handleResetTimer = () => {
    setIsActive(false);
    switchMode(mode);
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = mode === 'focus' ? 25 * 60 : mode === 'short_break' ? 5 * 60 : 15 * 60;
  const progressPercent = ((totalDuration - secondsLeft) / totalDuration) * 100;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Immersive Focus Mode Fullscreen Modal / Overlay */}
      {isFocusMode && (
        <div className="fixed inset-0 z-50 bg-[#070D18]/95 backdrop-blur-2xl flex flex-col justify-between p-8 text-white select-none animate-fadeIn">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#E11D26] animate-ping" />
              <span className="text-sm font-black tracking-widest text-red-500 uppercase">Ap Focus Immersion</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
                {mode === 'focus' ? 'Deep Work Block' : 'Break Time'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAlwaysOnTop}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAlwaysOnTop ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
                title="Keep Focus Window Always On Top"
              >
                {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 fill-black" /> : <PinOff className="w-3.5 h-3.5" />}
                <span>{isAlwaysOnTop ? 'Pinned On Top' : 'Pin On Top'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Exit Focus Mode (Esc)"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Immersion Timer Display */}
          <div className="flex flex-col items-center justify-center my-auto space-y-6">
            <div className="relative flex items-center justify-center">
              {/* Circular progress SVG */}
              <svg className="w-80 h-80 transform -rotate-90">
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-white/10"
                  fill="transparent"
                />
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  stroke="#E11D26"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 140}
                  strokeDashoffset={2 * Math.PI * 140 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="text-7xl font-mono font-black tracking-tighter text-white drop-shadow-2xl">
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-xs uppercase tracking-widest text-gray-400 mt-2 font-bold">
                  {isActive ? 'Deep Focus Session' : 'Paused — Click to Resume'}
                </span>
              </div>
            </div>

            {/* Quick Transport Buttons */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleToggleTimer}
                className={`px-10 py-3.5 rounded-2xl text-white font-extrabold text-sm flex items-center gap-2.5 transition-all shadow-xl active:scale-95 cursor-pointer ${
                  isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E11D26] hover:bg-[#C8101A]'
                }`}
              >
                {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                <span>{isActive ? 'Pause' : 'Start Focus'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetTimer}
                className="p-3.5 bg-white/10 hover:bg-white/20 text-gray-200 rounded-2xl transition-colors cursor-pointer"
                title="Reset Session"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Music Strip */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <Radio className={`w-4 h-4 text-[#E11D26] ${musicState.isPlaying ? 'animate-pulse' : ''}`} />
              <div>
                <div className="text-xs font-bold text-white">{musicState.currentTrack.title}</div>
                <div className="text-[10px] text-gray-400">{musicState.currentTrack.artist}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => studyMusicService.togglePlay()}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                {musicState.isPlaying ? 'Pause Audio' : 'Play Audio'}
              </button>

              <button
                type="button"
                onClick={() => studyMusicService.next()}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Next Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Study Sessions & Focus Timer</h1>
          <p className="text-xs text-gray-500 mt-1">Pomodoro intervals with privacy-preserving inactivity tracking</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFocusMode(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#142038] hover:bg-[#1E2A44] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Enter Distraction-Free Immersive Desktop Focus Mode"
          >
            <Maximize2 className="w-3.5 h-3.5 text-red-400" />
            <span>Immersive Focus Mode</span>
          </button>

          <button
            onClick={onOpenStartModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>New Custom Session</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Stay Focused Dark Card & Side Panel (Music + Stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dark Timer Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0B1220] text-white p-7 rounded-3xl border border-[#1E2A44] shadow-lg flex flex-col justify-between" data-surface="dark-panel">
            {/* Modes Pill Segmented */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <button
                onClick={() => switchMode('focus')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === 'focus' ? 'bg-[#E11D26] text-white shadow-xs' : 'bg-[#142038] text-gray-400 hover:text-white'
                }`}
              >
                Focus 25 min
              </button>
              <button
                onClick={() => switchMode('short_break')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  mode === 'short_break' ? 'bg-[#2563EB] text-white shadow-xs' : 'bg-[#142038] text-gray-400 hover:text-white'
                }`}
              >
                Short Break 5 min
              </button>
              <button
                onClick={() => switchMode('long_break')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
                onClick={handleToggleTimer}
                className={`px-8 py-3 rounded-2xl text-white font-extrabold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                  isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E11D26] hover:bg-[#C8101A]'
                }`}
              >
                {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isActive ? 'Pause Interval' : 'Start Focus'}</span>
              </button>

              <button
                onClick={handleResetTimer}
                className="p-3 bg-[#142038] hover:bg-[#1E2A44] text-gray-300 rounded-2xl transition-colors cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Footer Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-[#1E2A44] text-xs text-gray-400 mt-6">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span>End-of-session chime</span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#E11D26]"
                  />
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <Radio className="w-4 h-4 text-[#E11D26]" />
                  <span>Auto-play music with session</span>
                  <input
                    type="checkbox"
                    checked={playMusicWithSession}
                    onChange={(e) => setPlayMusicWithSession(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#E11D26]"
                  />
                </label>
              </div>

              <span className="text-[11px] text-gray-500">Auto-logged to SQLite</span>
            </div>
          </div>
        </div>

        {/* Side Panel: Tamil Study Music Player & Statistics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Prominent Built-in Offline Tamil Study Music Player */}
          <StudyMusicPlayer />

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

          {/* Idle Detection Privacy Guarantee Card */}
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
