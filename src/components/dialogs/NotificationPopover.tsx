import React, { useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  Info, 
  RefreshCw,
  Flame,
  Award
} from 'lucide-react';
import { APP_VERSION } from '@/config/version';
import { 
  AppNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteAppNotification, 
  clearAllAppNotifications 
} from '@/services/notifications';
import { ScreenId } from '@/types';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigate: (screen: ScreenId) => void;
  onOpenUpdateDialog?: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigate,
  onOpenUpdateDialog,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <Flame className="w-4 h-4 text-[#E11D26]" />;
      case 'update':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'problem':
        return <Award className="w-4 h-4 text-emerald-500" />;
      case 'system':
        return <Info className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleNotificationClick = (item: AppNotification) => {
    markNotificationAsRead(item.id);
    if (item.type === 'update' && onOpenUpdateDialog) {
      onClose();
      onOpenUpdateDialog();
    } else if (item.actionScreen) {
      onClose();
      onNavigate(item.actionScreen);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-4 top-14 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#0E1526] border border-[#E8EAF2] dark:border-[#1E2A44] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{ filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.25))' }}
      role="dialog"
      aria-label="Notification Center"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50/80 dark:bg-[#131D33] border-b border-[#E8EAF2] dark:border-[#1E2A44] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-white text-xs">Notifications</span>
          {unreadCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E11D26] text-white">
              {unreadCount} new
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              Up to date
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => clearAllAppNotifications()}
              className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-[#1E2A44]">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#142038] text-gray-400 flex items-center justify-center mx-auto mb-2">
              <Bell className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">No notifications</p>
            <p className="text-[11px] text-gray-400 mt-0.5">You're completely caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className={`p-3.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-[#142038]/60 cursor-pointer transition-colors ${
                !item.read ? 'bg-red-50/20 dark:bg-red-950/10' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#142038] flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {item.body}
                </p>

                {item.actionScreen && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#E11D26]">
                    <span>View in {item.actionScreen}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!item.read && (
                  <button
                    onClick={() => markNotificationAsRead(item.id)}
                    className="p-1 text-gray-400 hover:text-emerald-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => deleteAppNotification(item.id)}
                  className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Delete"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with App Version & Check for Updates action */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#131D33] border-t border-[#E8EAF2] dark:border-[#1E2A44] flex items-center justify-between text-[11px]">
        <span className="text-gray-400 font-mono">Ap Workspace v{APP_VERSION}</span>
        {onOpenUpdateDialog && (
          <button
            onClick={() => {
              onClose();
              onOpenUpdateDialog();
            }}
            className="text-[#E11D26] hover:underline font-bold flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Check for Updates</span>
          </button>
        )}
      </div>
    </div>
  );
};

function formatTimestamp(isoStr: string): string {
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return 'Recently';
  }
}
