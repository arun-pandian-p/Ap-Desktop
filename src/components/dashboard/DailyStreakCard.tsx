import React, { useEffect, useState } from 'react';
import { 
  Flame, 
  Trophy, 
  Target, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Award, 
  Plus, 
  Minus, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Lock
} from 'lucide-react';
import { getStreakState, setDailyGoal, StreakState } from '@/services/streak/streakService';
import { ScreenId } from '@/types';

interface DailyStreakCardProps {
  onNavigate: (screen: ScreenId) => void;
}

const MILESTONE_LEVELS = [
  { days: 3, label: '3-Day Spark' },
  { days: 7, label: '7-Day Blaze' },
  { days: 14, label: '14-Day Torch' },
  { days: 30, label: '30-Day Inferno' },
  { days: 60, label: '60-Day Titan' },
  { days: 100, label: '100-Day Master' },
  { days: 365, label: '365-Day Legend' },
];

export const DailyStreakCard: React.FC<DailyStreakCardProps> = ({ onNavigate }) => {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStreak = async () => {
    try {
      const state = await getStreakState();
      setStreak(state);
    } catch (err) {
      console.warn('Failed to load streak state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreak();
    const handleUpdate = () => { loadStreak(); };
    window.addEventListener('ap_streak_updated', handleUpdate);
    window.addEventListener('ap_submissions_updated', handleUpdate);
    window.addEventListener('ap_questions_updated', handleUpdate);
    return () => {
      window.removeEventListener('ap_streak_updated', handleUpdate);
      window.removeEventListener('ap_submissions_updated', handleUpdate);
      window.removeEventListener('ap_questions_updated', handleUpdate);
    };
  }, []);

  const handleAdjustGoal = async (delta: number) => {
    if (!streak) return;
    const newGoal = Math.max(1, Math.min(20, streak.dailyGoal + delta));
    await setDailyGoal(newGoal);
    loadStreak();
  };

  if (loading || !streak) {
    return (
      <div className="bg-white dark:bg-[#0E1526] p-6 rounded-2xl border border-[#E8EAF2] dark:border-[#1E2A44] shadow-xs animate-pulse h-48 flex items-center justify-center">
        <div className="text-xs text-gray-400">Loading daily streak metrics...</div>
      </div>
    );
  }

  const isCompleted = streak.isGoalCompletedToday;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-red-50/30 dark:from-[#0E1526] dark:via-[#0F182B] dark:to-[#170E1A] p-5 sm:p-6 rounded-2xl border border-[#E8EAF2] dark:border-[#1E2A44] shadow-xs">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-500/10 dark:bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Main Streak Hero Stats */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black transition-all shadow-sm ${
              isCompleted 
                ? 'bg-gradient-to-tr from-[#E11D26] to-amber-500 text-white ring-4 ring-red-500/20 shadow-red-500/30' 
                : streak.currentStreak > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 text-[#D97706] ring-2 ring-amber-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              <Flame className={`w-7 h-7 ${isCompleted ? 'animate-bounce' : ''}`} />
            </div>
            {isCompleted && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-[#0E1526]">
                ✓
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
              }`}>
                {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                <span>{isCompleted ? 'Goal Completed Today' : 'Daily Goal In Progress'}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>All-Time Record: <strong className="text-gray-900 dark:text-white">{streak.longestStreak} days</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-[#E11D26]" />
                <span>Solved Today: <strong className="text-gray-900 dark:text-white">{streak.solvedToday} / {streak.dailyGoal}</strong> problems</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: 7-Day Activity Strip */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Last 7 Days Activity</span>
            <span className="text-[10px] lowercase text-gray-400">local calendar</span>
          </div>

          <div className="flex items-center gap-2">
            {streak.activityStrip.map((day, idx) => {
              const isToday = idx === 6;
              return (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                      day.isCompleted
                        ? 'bg-[#E11D26] text-white shadow-xs scale-105'
                        : isToday
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 ring-2 ring-dashed ring-gray-300 dark:ring-gray-700'
                        : 'bg-gray-100 dark:bg-[#142038] text-gray-400'
                    }`}
                    title={`${day.date}: ${day.distinctProblems} distinct problems solved`}
                  >
                    {day.isCompleted ? (
                      <Flame className="w-4 h-4 fill-white" />
                    ) : (
                      <span className="text-[11px] font-medium opacity-60">·</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    isToday ? 'text-[#E11D26]' : 'text-gray-400'
                  }`}>
                    {day.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Daily Goal Controls & Quick Action */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Daily Target:</span>
            <div className="flex items-center bg-gray-100 dark:bg-[#142038] rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleAdjustGoal(-1)}
                disabled={streak.dailyGoal <= 1}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 transition-colors"
                title="Decrease daily goal"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-2 font-mono text-xs font-bold text-gray-900 dark:text-white">
                {streak.dailyGoal}
              </span>
              <button
                onClick={() => handleAdjustGoal(1)}
                disabled={streak.dailyGoal >= 20}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 transition-colors"
                title="Increase daily goal"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            onClick={() => onNavigate('python')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>{isCompleted ? 'Keep Practicing' : 'Solve Today\'s Problem'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Milestones Strip */}
      <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Streak Milestones:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {MILESTONE_LEVELS.map((m) => {
            const isUnlocked = (streak.currentStreak >= m.days) || streak.milestonesAchieved.includes(m.days);
            return (
              <span
                key={m.days}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                  isUnlocked
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/50 shadow-2xs'
                    : 'bg-gray-100 dark:bg-[#142038] text-gray-400 dark:text-gray-500'
                }`}
                title={isUnlocked ? `Milestone Unlocked: Solved for ${m.days} consecutive days!` : `Locked: Reach a ${m.days}-day streak to earn`}
              >
                {isUnlocked ? <Sparkles className="w-2.5 h-2.5 text-amber-500" /> : <Lock className="w-2.5 h-2.5" />}
                <span>{m.days}d</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
