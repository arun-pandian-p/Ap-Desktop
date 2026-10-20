import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Coffee, 
  Brain,
  ChevronDown,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  focusTimerService, 
  FocusTimerState, 
  FocusMode 
} from '@/services/timer/focusTimerService';

export const GlobalFocusTimerControl: React.FC = () => {
  const [timerState, setTimerState] = useState<FocusTimerState>(focusTimerService.getState());
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(focusTimerService.getSettings());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = focusTimerService.subscribe((state) => {
      setTimerState(state);
    });
    return () => unsub();
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeLabel = (mode: FocusMode) => {
    switch (mode) {
      case 'focus': return 'Focus';
      case 'short_break': return 'Short Break';
      case 'long_break': return 'Long Break';
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    focusTimerService.toggle();
  };

  return (
    <div className="relative select-none" ref={popoverRef}>
      {/* Titlebar Timer Pill */}
      <div 
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          timerState.mode === 'focus'
            ? timerState.isRunning
              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-[#E11D26] dark:text-red-400'
              : 'bg-gray-50 dark:bg-[#142038] border-gray-200 dark:border-[#1E2A44] text-gray-700 dark:text-gray-300'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400'
        }`}
        title={`Focus Timer: ${getModeLabel(timerState.mode)} (${formatTime(timerState.remainingSeconds)}) - Click for controls`}
      >
        {timerState.mode === 'focus' ? (
          <Brain className={`w-3.5 h-3.5 ${timerState.isRunning ? 'animate-pulse text-[#E11D26]' : 'text-gray-500'}`} />
        ) : (
          <Coffee className="w-3.5 h-3.5 text-emerald-600" />
        )}
        <span className="font-mono font-bold tracking-tight">
          {formatTime(timerState.remainingSeconds)}
        </span>

        {/* Inline Play/Pause Toggle */}
        <button
          type="button"
          onClick={handleToggle}
          className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={timerState.isRunning ? 'Pause Timer' : 'Start Timer'}
        >
          {timerState.isRunning ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
        </button>
      </div>

      {/* Popover Controls Modal */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-72 bg-white dark:bg-[#0F182B] rounded-2xl border border-[#E8EAF2] dark:border-[#1E2A44] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1E2A44] pb-2 mb-3">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
              <Timer className="w-4 h-4 text-[#E11D26]" />
              <span>Pomodoro Focus Timer</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-[#142038] rounded-xl mb-4">
            <button
              onClick={() => focusTimerService.setMode('focus')}
              className={`py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                timerState.mode === 'focus'
                  ? 'bg-white dark:bg-[#0B1220] text-[#E11D26] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Focus ({settings.focusMinutes}m)
            </button>
            <button
              onClick={() => focusTimerService.setMode('short_break')}
              className={`py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                timerState.mode === 'short_break'
                  ? 'bg-white dark:bg-[#0B1220] text-emerald-600 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Short ({settings.shortBreakMinutes}m)
            </button>
            <button
              onClick={() => focusTimerService.setMode('long_break')}
              className={`py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                timerState.mode === 'long_break'
                  ? 'bg-white dark:bg-[#0B1220] text-blue-600 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Long ({settings.longBreakMinutes}m)
            </button>
          </div>

          {/* Large Countdown Display */}
          <div className="text-center my-3">
            <div className="font-mono text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {formatTime(timerState.remainingSeconds)}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {getModeLabel(timerState.mode)} Block
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => focusTimerService.reset()}
              className="p-2 rounded-xl border border-gray-200 dark:border-[#1E2A44] hover:bg-gray-100 dark:hover:bg-[#142038] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => focusTimerService.toggle()}
              className="flex items-center gap-2 px-6 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {timerState.isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              onClick={() => focusTimerService.skip()}
              className="p-2 rounded-xl border border-gray-200 dark:border-[#1E2A44] hover:bg-gray-100 dark:hover:bg-[#142038] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
              title="Skip to Next Mode"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Today's Focus Stats */}
          <div className="border-t border-gray-100 dark:border-[#1E2A44] pt-2.5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <span>Sessions today: <strong className="text-gray-900 dark:text-white font-bold">{timerState.completedSessionsToday}</strong></span>
            <span>Focus time: <strong className="text-gray-900 dark:text-white font-bold">{Math.round(timerState.totalFocusSecondsToday / 60)} min</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
