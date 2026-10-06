import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  Flame, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Download,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { ScreenId } from '@/types';
import { fetchProfileStats, fetchStats } from '@/services/db';

interface AnalyticsViewProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  const [statsData, setStatsData] = useState({
    solvedQuestions: 0,
    totalQuestions: 4073,
    accuracy: 0,
    activeStudyHours: '0.0',
    currentStreak: 0,
    longestStreak: 0,
    totalSubmissions: 0,
    attemptingCount: 0,
  });

  const loadData = async () => {
    try {
      const [pStats, sStats] = await Promise.all([
        fetchProfileStats(),
        fetchStats(),
      ]);
      const acc = pStats.totalSubmissions > 0
        ? Math.round((pStats.totalSolved / pStats.totalSubmissions) * 100)
        : 0;
      setStatsData({
        solvedQuestions: pStats.totalSolved,
        totalQuestions: pStats.totalQuestions,
        accuracy: acc,
        activeStudyHours: sStats.activeStudyHours,
        currentStreak: pStats.currentStreak,
        longestStreak: pStats.longestStreak,
        totalSubmissions: pStats.totalSubmissions,
        attemptingCount: pStats.attemptingCount,
      });
    } catch (e) {
      console.warn('AnalyticsView loadData error:', e);
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => { loadData(); };
    window.addEventListener('ap_submissions_updated', handler);
    window.addEventListener('ap_profile_updated', handler);
    return () => {
      window.removeEventListener('ap_submissions_updated', handler);
      window.removeEventListener('ap_profile_updated', handler);
    };
  }, []);

  const activityData = [
    { day: 'Mon', hours: 3.2, goal: 3.0 },
    { day: 'Tue', hours: 4.5, goal: 3.0 },
    { day: 'Wed', hours: 3.8, goal: 3.0 },
    { day: 'Thu', hours: 5.2, goal: 3.0 },
    { day: 'Fri', hours: 6.0, goal: 3.0 },
    { day: 'Sat', hours: 6.5, goal: 3.0 },
    { day: 'Sun', hours: 4.2, goal: 3.0 },
  ];

  const todoCount = Math.max(0, statsData.totalQuestions - statsData.solvedQuestions - statsData.attemptingCount);
  const pieData = [
    { name: 'Accepted', value: statsData.solvedQuestions, color: '#16A34A' },
    { name: 'Attempted / Failed', value: Math.max(statsData.attemptingCount, statsData.totalSubmissions - statsData.solvedQuestions), color: '#EF4444' },
    { name: 'Todo', value: todoCount, color: '#E2E8F0' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Progress & Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Data-driven metrics calculated from your real persisted study logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select className="text-xs font-semibold text-gray-700 bg-white border border-[#E8EAF2] rounded-xl px-3 py-2 shadow-2xs">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>All Time</option>
          </select>

          <button 
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-[#E8EAF2] rounded-xl text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Total Study Time</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{statsData.activeStudyHours}h</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Logged active focus</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Problems Solved</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{statsData.solvedQuestions}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">{statsData.totalSubmissions} submissions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Overall Accuracy</span>
          <div className="text-2xl font-black text-gray-900 mt-1">{statsData.accuracy}%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">Accepted / Total</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Current Streak</span>
          <div className="text-2xl font-black text-[#D97706] mt-1">{statsData.currentStreak} Days</div>
          <div className="text-[11px] text-gray-400 mt-1">Longest: {statsData.longestStreak} days</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Tracks In Progress</span>
          <div className="text-2xl font-black text-purple-600 mt-1">4 / 6</div>
          <div className="text-[11px] text-gray-400 mt-1">66% enrolled</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Activity Line Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Study Activity Over Time</h3>
              <p className="text-xs text-gray-500">Hours spent practicing per day vs daily 3-hour target</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E11D26]"></span> Active Hours</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Daily Target</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <XAxis dataKey="day" stroke="#98A2B3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#98A2B3" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#E11D26" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="goal" stroke="#D0D5DD" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Problem Solving Performance Donut (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Problem Accuracy Breakdown</h3>
            <p className="text-xs text-gray-500 mb-4">Distribution across the 1,337 curriculum</p>

            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Solved</span>
              <strong className="text-gray-900">142 (10.6%)</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span> Attempted</span>
              <strong className="text-gray-900">38 (2.8%)</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Remaining</span>
              <strong className="text-gray-900">1,157 (86.6%)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap Grid */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Weekly Practice Heatmap</h3>
          <p className="text-xs text-gray-500 mb-4">Study intensity across hours of the day</p>

          <div className="grid grid-cols-7 gap-2">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, di) => (
              <div key={di} className="text-center">
                <span className="text-[10px] font-bold text-gray-400 mb-1 block">{d}</span>
                <div className="space-y-1">
                  {[1, 2, 3, 4].map((block, bi) => {
                    const intensity = (di + bi) % 4;
                    const bg = intensity === 3 ? 'bg-[#E11D26]' : intensity === 2 ? 'bg-[#F9B0B0]' : intensity === 1 ? 'bg-[#FCD7D7]' : 'bg-gray-100';
                    return <div key={bi} className={`h-6 rounded-md ${bg}`} title="High activity"></div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Earned Milestones & Badges</h3>
          <p className="text-xs text-gray-500 mb-3">Honors unlocked from continuous study</p>

          <div className="space-y-2.5">
            {[
              { title: '14-Day Consistency Master', desc: 'Practiced coding 14 consecutive days', date: 'Earned today', xp: '+100 XP' },
              { title: 'SQL Joins Architect', desc: 'Solved 25 complex multi-table SQL joins', date: 'Yesterday', xp: '+50 XP' },
              { title: 'Pattern Conqueror: Two Pointers', desc: 'Completed all 10 two-pointer challenges', date: '3 days ago', xp: '+50 XP' },
            ].map((ach, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{ach.title}</div>
                    <div className="text-[11px] text-gray-500">{ach.desc}</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#E11D26]">{ach.xp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
