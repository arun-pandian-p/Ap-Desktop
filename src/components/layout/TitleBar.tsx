import React from 'react';
import { 
  Flame, 
  Clock, 
  Bell, 
  Search, 
  Plus, 
  Minus, 
  Square, 
  X,
  Wifi,
  Sparkles,
  LogOut
} from 'lucide-react';
import { ScreenId } from '@/types';

interface TitleBarProps {
  currentScreen: ScreenId;
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  streakDays?: number;
  studyHours?: string;
  onNavigate: (screen: ScreenId) => void;
  onLock?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentScreen,
  onOpenQuickAdd,
  onOpenCommandPalette,
  streakDays = 14,
  studyHours = '4.2h',
  onNavigate,
  onLock,
}) => {
  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      console.log('Window minimize (browser mode)');
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch {
      console.log('Window toggle maximize (browser mode)');
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      console.log('Window close (browser mode)');
    }
  };

  return (
    <header className="h-12 bg-white border-b border-[#E8EAF2] flex items-center justify-between px-4 select-none titlebar-drag-region z-30">
      {/* Left: Window identity & Search */}
      <div className="flex items-center gap-4 titlebar-no-drag">
        <div className="flex items-center gap-2.5">
          <img 
            src="/assets/icon.png" 
            alt="Ap Logo" 
            className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0 drop-shadow-xs" 
          />
          <span className="font-bold text-gray-900 tracking-tight text-sm">Ap Workspace</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F7EE] text-[#15803D] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse"></span>
            Pro Active
          </span>
        </div>

        {/* Global Search Trigger (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#F1F3F9] hover:bg-[#E9ECF5] text-gray-500 hover:text-gray-900 rounded-lg text-xs font-medium border border-[#E8EAF2] transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search problems, tasks, topics...</span>
          <kbd className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[10px] text-gray-500 font-mono shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Center: Realtime Stats & Quick Actions */}
      <div className="flex items-center gap-3 titlebar-no-drag">
        {/* Daily Streak Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF4E0] border border-[#FED7AA] text-[#B45309] text-xs font-semibold">
          <Flame className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
          <span>{streakDays} Days</span>
        </div>

        {/* Active Study Hours */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{studyHours} Today</span>
        </div>

        {/* Online / Offline Status */}
        <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500" title="Offline-first database active">
          <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
          <span className="text-[11px] font-medium text-gray-600">Local DB</span>
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Quick Add</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => onNavigate('reports')}
          className="relative p-1.5 text-gray-500 hover:text-gray-900 hover:bg-[#F1F3F9] rounded-lg transition-colors"
          title="Notifications & Reports"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E11D26] ring-2 ring-white"></span>
        </button>

        {/* Log Out Workspace Trigger */}
        {onLock && (
          <button
            onClick={onLock}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-[#F1F3F9] rounded-lg transition-colors"
            title="Log Out (Lock Workspace)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#E11D26] rounded transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
