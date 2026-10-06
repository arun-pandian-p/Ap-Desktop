import React, { useState, useEffect } from 'react';
import { ScreenId, AccentColor, ThemeMode, Task, Question, LicenseState } from '@/types';
import { TitleBar } from '@/components/layout/TitleBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { ToastContainer, ToastMessage } from '@/components/common/Toast';
import { CreateTaskModal } from '@/components/dialogs/CreateTaskModal';
import { StartSessionModal } from '@/components/dialogs/StartSessionModal';
import { BackupRestoreModal } from '@/components/dialogs/BackupRestoreModal';
import { CommandPalette } from '@/components/dialogs/CommandPalette';

import { DashboardView } from '@/features/dashboard/DashboardView';
import { ProblemsView } from '@/features/problems/ProblemsView';
import { TracksView } from '@/features/tracks/TracksView';
import { PythonPracticeView } from '@/features/python/PythonPracticeView';
import { SqlPracticeView } from '@/features/sql/SqlPracticeView';
import { PostgresLabView } from '@/features/postgres/PostgresLabView';
import { PlannerView } from '@/features/planner/PlannerView';
import { SessionsView } from '@/features/sessions/SessionsView';
import { AnalyticsView } from '@/features/analytics/AnalyticsView';
import { DailyReviewView } from '@/features/review/DailyReviewView';
import { ReportsView } from '@/features/reports/ReportsView';
import { SettingsView } from '@/features/settings/SettingsView';
import { ProfileView } from '@/features/profile/ProfileView';
import { LoginView } from '@/features/auth/LoginView';

import { getDatabase, fetchTasks, addTask, updateTaskStatus, fetchStats } from '@/services/db';
import { getCurrentLicense } from '@/services/license';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('ap_unlocked') === 'true';
  });
  const [accentColor, setAccentColor] = useState<AccentColor>('red');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ap_theme_mode') : null;
    return (saved === 'dark' || saved === 'light' || saved === 'system') ? (saved as ThemeMode) : 'light';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [license, setLicense] = useState<LicenseState>(getCurrentLicense());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<any>({ streakDays: 14, activeStudyHours: '4.2' });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dialog states
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isStartSessionOpen, setIsStartSessionOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [selectedProblem, setSelectedProblem] = useState<Question | undefined>();

  // Lock / Unlock handlers
  const handleUnlock = (name: string) => {
    sessionStorage.setItem('ap_unlocked', 'true');
    setIsUnlocked(true);
    addToast(`Welcome back, ${name}!`);
  };

  const handleLock = () => {
    sessionStorage.removeItem('ap_unlocked');
    setIsUnlocked(false);
  };

  // Add toast helper
  const addToast = (title: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', body?: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, title, type, body }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial load and real-time stats listener
  useEffect(() => {
    const refreshStats = async () => {
      try {
        const loadedStats = await fetchStats();
        setStats(loadedStats);
      } catch {}
    };

    getDatabase().then(async () => {
      const loadedTasks = await fetchTasks();
      setTasks(loadedTasks);
      refreshStats();
    });

    window.addEventListener('ap_submissions_updated', refreshStats);
    return () => window.removeEventListener('ap_submissions_updated', refreshStats);
  }, []);

  // Sync theme changes with DOM and localStorage
  useEffect(() => {
    localStorage.setItem('ap_theme_mode', themeMode);
    const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [themeMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Task handlers
  const handleToggleTask = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    await updateTaskStatus(id, nextStatus);
    const updated = await fetchTasks();
    setTasks(updated);
    addToast(nextStatus === 'completed' ? 'Task marked as completed! 🎉' : 'Task reopened.', 'success');
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'created_at'>) => {
    const created = await addTask(taskData);
    setTasks(prev => [created, ...prev]);
    addToast('Task created and added to your planner.', 'success');
  };

  if (!isUnlocked) {
    return <LoginView onUnlock={handleUnlock} />;
  }

  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div 
      className={`h-screen w-screen flex flex-col overflow-hidden font-sans antialiased transition-colors duration-200 ${
        isDarkMode ? 'dark bg-[#090D16] text-[#F8FAFC]' : 'bg-[#F7F8FC] text-[#101828]'
      }`}
      data-accent={accentColor}
      data-theme={isDarkMode ? 'dark' : 'light'}
    >
      {/* 1. Frameless Custom Title Bar */}
      <TitleBar
        currentScreen={currentScreen}
        onOpenQuickAdd={() => setIsCreateTaskOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        streakDays={stats.streakDays}
        studyHours={`${stats.activeStudyHours}h`}
        onNavigate={setCurrentScreen}
        onLock={handleLock}
      />

      {/* 2. Middle Body: Sidebar + Active Screen */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          license={license}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          onLock={handleLock}
        />

        <main className={`flex-1 overflow-hidden relative transition-colors duration-200 ${
          isDarkMode ? 'bg-[#090D16]' : 'bg-[#F7F8FC]'
        }`}>
          {currentScreen === 'dashboard' && (
            <DashboardView
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onNavigate={setCurrentScreen}
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            />
          )}

          {currentScreen === 'problems' && (
            <ProblemsView
              onNavigate={setCurrentScreen}
              onSelectProblemForPractice={(p) => {
                setSelectedProblem(p);
                setCurrentScreen('python');
              }}
            />
          )}

          {currentScreen === 'tracks' && (
            <TracksView
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'python' && (
            <PythonPracticeView
              initialProblem={selectedProblem}
            />
          )}

          {currentScreen === 'sql' && (
            <SqlPracticeView />
          )}

          {currentScreen === 'postgres' && (
            <PostgresLabView />
          )}

          {currentScreen === 'planner' && (
            <PlannerView
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onAddTask={handleCreateTask}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'sessions' && (
            <SessionsView
              onNavigate={setCurrentScreen}
              onOpenStartModal={() => setIsStartSessionOpen(true)}
            />
          )}

          {currentScreen === 'analytics' && (
            <AnalyticsView
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'review' && (
            <DailyReviewView
              onNavigate={setCurrentScreen}
              onSaveToast={(msg) => addToast(msg, 'success')}
            />
          )}

          {currentScreen === 'reports' && (
            <ReportsView
              onNavigate={setCurrentScreen}
              onShowToast={addToast}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsView
              accentColor={accentColor}
              onChangeAccent={setAccentColor}
              themeMode={themeMode}
              onChangeTheme={setThemeMode}
              license={license}
              onRefreshLicense={() => setLicense(getCurrentLicense())}
              onShowToast={addToast}
              onOpenBackupModal={() => setIsBackupOpen(true)}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'profile' && (
            <ProfileView
              onNavigate={setCurrentScreen}
              onShowToast={addToast}
            />
          )}
        </main>
      </div>

      {/* 3. Global Modals & Notifications */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTask}
      />

      <StartSessionModal
        isOpen={isStartSessionOpen}
        onClose={() => setIsStartSessionOpen(false)}
        onStart={(mins, title) => {
          addToast(`Started ${mins} min focus session for "${title}"`, 'success');
          setCurrentScreen('sessions');
        }}
      />

      <BackupRestoreModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onSuccess={(msg) => addToast(msg, 'success')}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentScreen}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
