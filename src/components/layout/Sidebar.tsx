import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Code2, 
  Terminal, 
  Database, 
  Server, 
  CheckSquare, 
  Timer, 
  BarChart3, 
  CalendarCheck, 
  FileText, 
  Settings, 
  Crown, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { ScreenId, LicenseState } from '@/types';
import { getUserProfile, DEFAULT_USER_PROFILE } from '@/services/profile';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  license: LicenseState;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLock?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  license,
  isCollapsed,
  onToggleCollapse,
  onLock,
}) => {
  const [userProfile, setUserProfile] = React.useState(getUserProfile());

  React.useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) setUserProfile(e.detail);
    };
    window.addEventListener('ap_profile_updated', handleUpdate);
    return () => window.removeEventListener('ap_profile_updated', handleUpdate);
  }, []);

  const navItems = [
    { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracks' as ScreenId, label: 'Learning Tracks', icon: Map },
    { id: 'problems' as ScreenId, label: 'Problems', icon: Code2 },
    { id: 'python' as ScreenId, label: 'Python Practice', icon: Terminal },
    { id: 'sql' as ScreenId, label: 'SQL Practice', icon: Database },
    { id: 'postgres' as ScreenId, label: 'PostgreSQL Lab', icon: Server },
    { id: 'planner' as ScreenId, label: 'To-do Planner', icon: CheckSquare },
    { id: 'sessions' as ScreenId, label: 'Study Sessions', icon: Timer },
    { id: 'analytics' as ScreenId, label: 'Progress & Analytics', icon: BarChart3 },
    { id: 'review' as ScreenId, label: 'Daily Review', icon: CalendarCheck },
    { id: 'reports' as ScreenId, label: 'Reports & Notifications', icon: FileText },
    { id: 'settings' as ScreenId, label: 'Settings & Backup', icon: Settings },
  ];

  return (
    <aside 
      className={`h-[calc(100vh-3rem)] bg-white border-r border-[#E8EAF2] flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        isCollapsed ? 'w-16' : 'w-[225px]'
      }`}
    >
      {/* Top Header & Navigation Items */}
      <div className="flex flex-col flex-1 overflow-y-auto px-3 py-4">
        {/* Brand & Collapse Toggle */}
        <div className={`flex items-center mb-6 px-1 ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/icon.png" 
                alt="Ap Logo" 
                className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0 drop-shadow-xs" 
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-gray-900 text-base leading-tight">Ap</span>
                <span className="text-[10px] text-gray-400 font-medium">Prep & Practice</span>
              </div>
            </div>
          ) : (
            <img 
              src="/assets/icon.png" 
              alt="Ap Logo" 
              className="w-8 h-8 rounded-xl object-contain shadow-xs mx-auto drop-shadow-xs" 
              title="Ap Workspace"
            />
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors mx-auto"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#E11D26] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-[#F1F3F9] hover:text-gray-900'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pinned User Card at Bottom */}
      <div className="p-3 border-t border-[#E8EAF2] bg-[#F7F8FC]/50">
        <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <button 
            type="button"
            onClick={() => onNavigate('profile')}
            className="w-8 h-8 rounded-full bg-[#E11D26] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:ring-2 hover:ring-[#E11D26]/40 transition-all overflow-hidden"
            title={`${userProfile.name} (@${userProfile.username}) - Click to view profile`}
          >
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt={userProfile.name} className="w-full h-full object-cover" />
            ) : (
              userProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AP'
            )}
          </button>

          {!isCollapsed ? (
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="text-xs font-bold text-gray-900 truncate hover:text-[#E11D26] transition-colors text-left cursor-pointer"
                  title={`${userProfile.name} - View Profile`}
                >
                  {userProfile.name}
                </button>
                <div className="flex items-center gap-1">
                  {onLock && (
                    <button
                      onClick={onLock}
                      className="text-gray-400 hover:text-red-600 p-0.5 rounded transition-colors"
                      title="Log Out (Lock Workspace)"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button 
                    onClick={() => onNavigate('settings')}
                    className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 font-semibold text-amber-600">
                  <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{license.edition === 'pro' ? 'Pro Plan' : 'Free Tier'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="text-gray-400 hover:text-gray-600 text-[10px] font-mono truncate text-left cursor-pointer"
                >
                  {userProfile.username}
                </button>
              </div>
            </div>
          ) : (
            onLock && (
              <button
                onClick={onLock}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </aside>
  );
};
