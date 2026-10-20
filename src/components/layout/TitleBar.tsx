import React from 'react';
import { 
  Flame, 
  Clock, 
  Bell, 
  Plus, 
  Minus, 
  Square, 
  X, 
  LogOut, 
  Sun, 
  Moon, 
  MoreHorizontal, 
  Database,
  Sparkles,
  Copy
} from 'lucide-react';
import { ScreenId, ThemeMode, Question, Track } from '@/types';
import { getUserProfile } from '@/services/profile';
import { getAppNotifications, getUnreadNotificationCount, addAppNotification, AppNotification } from '@/services/notifications';
import { NotificationPopover } from '@/components/dialogs/NotificationPopover';
import { UpdateDialog } from '@/components/dialogs/UpdateDialog';
import { GlobalFocusTimerControl } from './GlobalFocusTimerControl';
import { GlobalMusicControl } from './GlobalMusicControl';
import { GlobalSearchBar } from './GlobalSearchBar';
import iconLogo from '@/assets/icon.png';

interface TitleBarProps {
  currentScreen: ScreenId;
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  streakDays?: number;
  studyHours?: string;
  onNavigate: (screen: ScreenId) => void;
  onLock?: () => void;
  themeMode?: ThemeMode;
  onToggleTheme?: () => void;
  onSelectProblem?: (problem: Question) => void;
  onSelectTrack?: (track: Track) => void;
  onSearchProblems?: (query: string) => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentScreen,
  onOpenQuickAdd,
  onOpenCommandPalette,
  streakDays = 14,
  studyHours = '4.2h',
  onNavigate,
  onLock,
  themeMode = 'light',
  onToggleTheme,
  onSelectProblem,
  onSelectTrack,
  onSearchProblems,
}) => {
  const [profile, setProfile] = React.useState(getUserProfile());
  const [notifications, setNotifications] = React.useState<AppNotification[]>(() => getAppNotifications());
  const [unreadCount, setUnreadCount] = React.useState<number>(() => getUnreadNotificationCount());
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = React.useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = React.useState(false);
  const [isMaximized, setIsMaximized] = React.useState(false);

  const overflowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const refreshNotifications = () => {
      setNotifications(getAppNotifications());
      setUnreadCount(getUnreadNotificationCount());
    };

    const handleUpdate = (e: any) => {
      if (e.detail) setProfile(e.detail);
    };

    const handleOpenUpdateDialog = () => {
      setIsUpdateDialogOpen(true);
    };

    window.addEventListener('ap_profile_updated', handleUpdate);
    window.addEventListener('ap_notifications_updated', refreshNotifications);
    window.addEventListener('ap_open_update_dialog', handleOpenUpdateDialog);

    // Check window maximized state
    const checkMax = async () => {
      if (window.electronAPI?.isMaximized) {
        try {
          const max = await window.electronAPI.isMaximized();
          setIsMaximized(Boolean(max));
        } catch {}
      }
    };
    checkMax();
    window.addEventListener('resize', checkMax);

    // Listen for background update check from Electron main process
    let unsubUpdater: (() => void) | undefined;
    if (window.electronAPI?.onUpdateAvailableNotification) {
      unsubUpdater = window.electronAPI.onUpdateAvailableNotification((info) => {
        if (info && info.latestVersion) {
          addAppNotification({
            title: `Ap Workspace Update ${info.latestVersion} Available`,
            body: `A new version ${info.latestVersion} is available. Click here to review and install.`,
            type: 'update',
          });
        }
      });
    }

    return () => {
      window.removeEventListener('ap_profile_updated', handleUpdate);
      window.removeEventListener('ap_notifications_updated', refreshNotifications);
      window.removeEventListener('ap_open_update_dialog', handleOpenUpdateDialog);
      window.removeEventListener('resize', checkMax);
      if (unsubUpdater) unsubUpdater();
    };
  }, []);

  // Close overflow menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOverflowOpen]);

  const handleMinimize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.minimize();
    } else {
      console.log('Window minimize (browser mode)');
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.maximize();
      try {
        const max = await window.electronAPI.isMaximized();
        setIsMaximized(Boolean(max));
      } catch {}
    } else {
      setIsMaximized(prev => !prev);
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.close();
    } else {
      console.log('Window close (browser mode)');
    }
  };

  return (
    <header className="h-[60px] min-h-[60px] max-h-[60px] bg-white dark:bg-[#0E1526] border-b border-[#E8EAF2] dark:border-[#1E293B] flex items-center justify-between px-3 md:px-4 select-none titlebar-drag-region z-30 w-full overflow-hidden">
      {/* 1. Left: Identity & Search */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 lg:shrink titlebar-no-drag">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 shrink-0">
          <img 
            src={iconLogo} 
            alt="Ap Logo" 
            className="w-8 h-8 rounded-lg object-contain shadow-xs shrink-0 drop-shadow-xs" 
          />
          <span className="font-extrabold text-gray-900 dark:text-white tracking-tight text-sm whitespace-nowrap hidden sm:inline">
            Ap Workspace
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F7EE] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 font-bold items-center gap-1 hidden 2xl:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
            Pro Active
          </span>
        </div>

        {/* Global Search Bar (Responsive flex width with min-width: 0) */}
        <div className="w-40 sm:w-52 md:w-64 lg:w-72 xl:w-80 min-w-0 transition-all">
          <GlobalSearchBar
            onNavigate={onNavigate}
            onSelectProblem={onSelectProblem}
            onSelectTrack={onSelectTrack}
            onOpenQuickAdd={onOpenQuickAdd}
            onOpenCommandPalette={onOpenCommandPalette}
            onSearchProblems={onSearchProblems}
          />
        </div>
      </div>

      {/* 2. Center/Right: Status Indicators, Controls, Quick Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end flex-1 mr-2 titlebar-no-drag">
        {/* Daily Streak Pill */}
        <div 
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFF4E0] dark:bg-amber-950/40 border border-[#FED7AA] dark:border-amber-900/60 text-[#B45309] dark:text-amber-300 text-xs font-semibold whitespace-nowrap shrink-0"
          title={`Daily Problem-Solving Streak: ${streakDays} Consecutive Days`}
        >
          <Flame className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
          <span>{streakDays}d</span>
        </div>

        {/* Active Study Hours (hidden on small viewports, accessible in overflow) */}
        <div 
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-900/60 text-[#1D4ED8] dark:text-blue-300 text-xs font-semibold whitespace-nowrap shrink-0"
          title={`Today's Focused Study Time: ${studyHours}`}
        >
          <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>{studyHours}</span>
        </div>

        {/* Centralized Focus Timer Control */}
        <div className="shrink-0">
          <GlobalFocusTimerControl />
        </div>

        {/* Persistent Background Music Control */}
        <div className="shrink-0">
          <GlobalMusicControl onNavigate={onNavigate} />
        </div>

        {/* Realtime DB Status (visible on xl+, in overflow menu on smaller screens) */}
        <button
          type="button"
          onClick={async () => {
            try {
              const { testAndConnectRealtimeDb } = await import('@/services/db');
              await testAndConnectRealtimeDb();
            } catch {}
          }}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full transition-colors cursor-pointer shrink-0"
          title="Realtime SQLite Database Active (Click to verify & synchronize)"
          aria-label="Verify Realtime SQLite Database"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold">Realtime DB</span>
        </button>

        {/* Quick Add Button (visible on lg+, in overflow menu on smaller screens) */}
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          title="Create New Task / Item (Quick Add)"
          aria-label="Quick Add"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Quick Add</span>
        </button>

        {/* Theme Changer Toggle (Sun / Moon) */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-[#F1F3F9] dark:hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer shrink-0"
            title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600 fill-gray-600/10" />
            )}
          </button>
        )}

        {/* Notification Bell with Dynamic Unread Badge */}
        <button
          type="button"
          onClick={() => setIsNotificationsOpen(prev => !prev)}
          className="relative p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-[#F1F3F9] dark:hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer shrink-0"
          title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notification Center'}
          aria-label="Notification Center"
          aria-expanded={isNotificationsOpen}
          aria-haspopup="dialog"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#E11D26] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-[#0E1526] animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="w-7 h-7 rounded-full bg-[#E11D26] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:ring-2 hover:ring-[#E11D26]/40 transition-all overflow-hidden"
          title={`${profile.name} (@${profile.username}) - View Developer Profile`}
          aria-label="Developer Profile"
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AP'
          )}
        </button>

        {/* Log Out Workspace Trigger (visible on xl+, in overflow on smaller screens) */}
        {onLock && (
          <button
            type="button"
            onClick={onLock}
            className="hidden xl:flex p-1.5 text-gray-500 hover:text-red-600 hover:bg-[#F1F3F9] dark:hover:bg-[#1E293B] rounded-lg transition-colors shrink-0 cursor-pointer"
            title="Log Out (Lock Workspace)"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

        {/* Responsive Overflow Dropdown Trigger for compact screens */}
        <div className="relative xl:hidden shrink-0" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setIsOverflowOpen(prev => !prev)}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-[#F1F3F9] dark:hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
            title="More actions and indicators"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isOverflowOpen && (
            <div className="absolute right-0 top-10 w-56 bg-white dark:bg-[#0E1526] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOverflowOpen(false);
                  onOpenQuickAdd();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-200 font-medium"
              >
                <Plus className="w-4 h-4 text-[#E11D26]" />
                <span>Quick Add Task</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsOverflowOpen(false);
                  try {
                    const { testAndConnectRealtimeDb } = await import('@/services/db');
                    await testAndConnectRealtimeDb();
                  } catch {}
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-800 dark:text-gray-200 font-medium"
              >
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Verify Realtime DB</span>
              </button>

              <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-[11px] border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
                <span>Today's Study Time:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{studyHours}</span>
              </div>

              {onLock && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOverflowOpen(false);
                    onLock();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-medium border-t border-gray-100 dark:border-gray-800/60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Lock Workspace</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Right: Windows Standard Window Control Buttons */}
      <div className="flex items-center border-l border-gray-200 dark:border-slate-800 pl-1.5 shrink-0 titlebar-no-drag">
        <button
          type="button"
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Minimize Window"
          aria-label="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title={isMaximized ? "Restore Down" : "Maximize Window"}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#E11D26] rounded transition-colors cursor-pointer"
          title="Close Window"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Interactive Notification Popover */}
      <NotificationPopover
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNavigate={onNavigate}
        onOpenUpdateDialog={() => setIsUpdateDialogOpen(true)}
      />

      {/* Software Update Dialog */}
      <UpdateDialog
        isOpen={isUpdateDialogOpen}
        onClose={() => setIsUpdateDialogOpen(false)}
      />
    </header>
  );
};
