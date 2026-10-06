import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Flame, 
  TrendingUp, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  BookOpen, 
  Target, 
  Award,
  ChevronRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart 
} from 'recharts';
import { Task, ScreenId } from '@/types';
import { fetchProfileStats, fetchStats, fetchSubmissions } from '@/services/db';

interface DashboardViewProps {
  tasks: Task[];
  onToggleTask: (id: string, currentStatus: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenCreateTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  onToggleTask,
  onNavigate,
  onOpenCreateTask,
}) => {
  const [statsData, setStatsData] = useState({
    solvedQuestions: 0,
    accuracy: 0,
    activeStudyHours: '0.0',
    currentStreak: 0,
    totalSubmissions: 0,
    completedTasks: 0,
    totalTasks: 0,
  });

  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', questions: 0, hours: 0 },
    { day: 'Tue', questions: 0, hours: 0 },
    { day: 'Wed', questions: 0, hours: 0 },
    { day: 'Thu', questions: 0, hours: 0 },
    { day: 'Fri', questions: 0, hours: 0 },
    { day: 'Sat', questions: 0, hours: 0 },
    { day: 'Sun', questions: 0, hours: 0 },
  ]);

  const loadData = async () => {
    try {
      const [pStats, sStats, subs] = await Promise.all([
        fetchProfileStats(),
        fetchStats(),
        fetchSubmissions({ limit: 100 }),
      ]);

      const acc = pStats.totalSubmissions > 0
        ? Math.round((pStats.totalSolved / pStats.totalSubmissions) * 100)
        : 0;

      setStatsData({
        solvedQuestions: pStats.totalSolved,
        accuracy: acc,
        activeStudyHours: sStats.activeStudyHours,
        currentStreak: pStats.currentStreak,
        totalSubmissions: pStats.totalSubmissions,
        completedTasks: sStats.completedTasks,
        totalTasks: sStats.totalTasks,
      });

      // Compute last 7 days submissions distribution for trend chart
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const last7: { day: string; questions: number; hours: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const daySubCount = subs.filter(s => s.created_at.startsWith(dayStr)).length;
        last7.push({
          day: dayNames[d.getDay()],
          questions: daySubCount,
          hours: daySubCount > 0 ? Math.round((daySubCount * 0.4 + 1.2) * 10) / 10 : 0,
        });
      }
      setWeeklyData(last7);
    } catch (e) {
      console.warn('DashboardView loadData error:', e);
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => { loadData(); };
    window.addEventListener('ap_submissions_updated', handler);
    window.addEventListener('ap_questions_updated', handler);
    window.addEventListener('ap_profile_updated', handler);
    return () => {
      window.removeEventListener('ap_submissions_updated', handler);
      window.removeEventListener('ap_questions_updated', handler);
      window.removeEventListener('ap_profile_updated', handler);
    };
  }, []);

  // Pomodoro quick timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => { setIsRunning(false); setTimerSeconds(25 * 60); };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const quotes = [
    { text: "Consistency is not about perfection, it's about showing up every single day.", author: "Daily Reminder" },
    { text: "Master patterns, not just problems. 50 patterns unlock 1,000 algorithmic solutions.", author: "GrindGram Principle" },
    { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Good morning, Arun Pandian! 👋
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Keep going! Consistency is your superpower. You have 3 tasks scheduled for today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('sessions')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>Start Session</span>
          </button>
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Questions Solved */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Questions Solved</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-[#E11D26] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight">{statsData.solvedQuestions}</div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp className="w-3 h-3" />
            <span>{statsData.totalSubmissions} total submissions</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Accuracy</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight">{statsData.accuracy}%</div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp className="w-3 h-3" />
            <span>{statsData.currentStreak} day streak</span>
          </div>
        </div>

        {/* Active Study Time */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Active Study Time</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight">{statsData.activeStudyHours}h</div>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <TrendingUp className="w-3 h-3" />
            <span>Logged active focus</span>
          </div>
        </div>

        {/* Topics Completed */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-medium">Topics Completed</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight">18 <span className="text-xs font-normal text-gray-400">/ 52</span></div>
          <div className="mt-2 text-[11px] text-gray-400 font-medium">
            34.6% curriculum progress
          </div>
        </div>

        {/* Tasks Ring */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Daily Goal</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between my-1">
            <div>
              <div className="text-2xl font-black text-gray-900">{statsData.completedTasks} <span className="text-xs font-normal text-gray-400">/ {statsData.totalTasks}</span></div>
              <div className="text-[11px] text-gray-400">Tasks finished</div>
            </div>
            {/* Mini Progress Ring */}
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#E11D26]"
                  strokeDasharray={`${Math.round((statsData.completedTasks / Math.max(1, statsData.totalTasks)) * 100)}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-gray-800">
                {Math.round((statsData.completedTasks / Math.max(1, statsData.totalTasks)) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Weekly Chart & Focus Pomodoro Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Progress Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Weekly Performance Trends</h3>
              <p className="text-xs text-gray-500">Solved problems and active focus hours over the last 7 days</p>
            </div>
            <select className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D26" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#E11D26" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#98A2B3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#98A2B3" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1220', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="questions" stroke="#E11D26" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQuestions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Session Pomodoro Card */}
        <div className="bg-[#0B1220] text-white p-5 rounded-2xl border border-[#1E2A44] shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E11D26] animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Pomodoro Focus</span>
            </div>
            <button onClick={() => onNavigate('sessions')} className="text-xs text-[#E11D26] hover:underline font-semibold">
              Full View →
            </button>
          </div>

          {/* Timer Ring */}
          <div className="my-6 flex flex-col items-center justify-center">
            <div className="text-5xl font-mono font-black tracking-tight text-white mb-2">
              {formatTimer(timerSeconds)}
            </div>
            <span className="text-xs text-gray-400 font-medium">Target: Two Pointers Pattern</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleTimer}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
                isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E11D26] hover:bg-[#C8101A]'
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>
            <button
              onClick={resetTimer}
              className="w-10 h-10 rounded-full bg-[#142038] hover:bg-[#1E2A44] text-gray-300 flex items-center justify-center transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center text-[11px] text-gray-500 mt-4">
            Idle detection active: inactivity marked after 2 mins
          </div>
        </div>
      </div>

      {/* Bottom Grid: Today's Plan, Weak Topics & Quote */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Plan */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Today's Practice Plan</h3>
              <p className="text-xs text-gray-500">Your prioritized items for this morning</p>
            </div>
            <button 
              onClick={() => onNavigate('planner')} 
              className="text-xs font-bold text-[#E11D26] hover:underline flex items-center gap-1"
            >
              <span>View All Tasks</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {tasks.slice(0, 4).map((task) => {
              const isCompleted = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCompleted 
                      ? 'bg-gray-50/70 border-gray-100 opacity-60' 
                      : 'bg-white border-[#E8EAF2] hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleTask(task.id, task.status)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 hover:border-[#E11D26]'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <span className={`text-xs font-semibold ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                      </span>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>Due: {task.due_date || 'Today'}</span>
                        <span>•</span>
                        <span>{task.estimated_minutes} min</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    task.priority === 'High'
                      ? 'bg-red-50 text-red-700'
                      : task.priority === 'Medium'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Rail: Weak Topics & Quote */}
        <div className="space-y-6">
          {/* Weak Topics */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Focus Areas (Weak Topics)</h3>
            <p className="text-xs text-gray-500 mb-4">Recommended for revision based on attempt accuracy</p>

            <div className="space-y-3">
              {[
                { name: 'Dynamic Programming (Grid)', accuracy: 42, color: 'bg-red-500' },
                { name: 'Binary Trees (LCA)', accuracy: 55, color: 'bg-amber-500' },
                { name: 'SQL Window Functions', accuracy: 64, color: 'bg-blue-500' },
              ].map((topic, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{topic.name}</span>
                    <span className="font-bold text-gray-900">{topic.accuracy}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${topic.color} rounded-full`} style={{ width: `${topic.accuracy}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('problems')}
              className="mt-4 w-full py-2 text-xs font-bold text-center text-[#E11D26] bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
            >
              Practice Weak Patterns →
            </button>
          </div>

          {/* Red Mountain Quote Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#E11D26] to-[#A80000] text-white shadow-sm flex flex-col justify-between">
            <Sparkles className="w-5 h-5 text-white/80 mb-2" />
            <p className="text-xs font-medium leading-relaxed italic text-white/95">
              "{quotes[0].text}"
            </p>
            <div className="mt-3 text-[11px] font-bold text-white/75 text-right">
              — {quotes[0].author}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
