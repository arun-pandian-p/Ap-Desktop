import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Flame, 
  Calendar, 
  Save, 
  Plus, 
  Sparkles, 
  AlertTriangle, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { ScreenId } from '@/types';

interface DailyReviewViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSaveToast: (msg: string) => void;
}

export const DailyReviewView: React.FC<DailyReviewViewProps> = ({
  onNavigate,
  onSaveToast,
}) => {
  const [reflection1, setReflection1] = useState(
    'Understood the difference between contiguous sliding window problems vs hash-indexed two pointer lookups. Solved Two Sum and 3Sum variants without looking at solutions.'
  );
  const [reflection2, setReflection2] = useState(
    'Need more speed on SQL window partition sorting. Need to revise DENSE_RANK() vs ROW_NUMBER() edge cases.'
  );
  const [blockers, setBlockers] = useState('Slight distraction during the afternoon break block.');
  const [selectedBlockerTags, setSelectedBlockerTags] = useState(['Concept understanding']);

  const accomplishments = [
    { id: '1', title: 'Solved 12 LeetCode Two Pointers practice problems', category: 'DSA', time: '10:30 AM' },
    { id: '2', title: 'Completed SQL Window Functions Challenge #4', category: 'SQL', time: '2:15 PM' },
    { id: '3', title: 'Completed 4 Pomodoro focus blocks without interruptions', category: 'Focus', time: '5:00 PM' },
  ];

  const tomorrowPlan = [
    { id: '1', title: 'Binary Search rotated array problem set', category: 'DSA', priority: 'High' },
    { id: '2', title: 'PostgreSQL CTE and recursive query lab', category: 'SQL', priority: 'Medium' },
    { id: '3', title: 'Write structured notes for Sliding Window pattern', category: 'Notes', priority: 'Low' },
  ];

  const handleSave = () => {
    onSaveToast('Daily review saved locally to encrypted database snapshot.');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Daily Review & Reflection</h1>
          <p className="text-xs text-gray-500 mt-1">
            Assess today's progress, diagnose learning gaps, and set tomorrow's priorities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8EAF2] rounded-xl text-xs font-semibold text-gray-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Tuesday, Oct 6, 2026</span>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Review</span>
          </button>
        </div>
      </div>

      {/* Your Day at a Glance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Tasks Completed</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">3 of 5</div>
          <div className="text-[11px] text-gray-400 mt-0.5">60% achievement</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Focus Time</span>
          <div className="text-2xl font-black text-gray-900 mt-1">4h 12m</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">+45m vs target</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Problems Solved</span>
          <div className="text-2xl font-black text-gray-900 mt-1">12 items</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">100% test pass</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <span className="text-xs text-gray-500">Daily Study Goal</span>
          <div className="text-2xl font-black text-[#E11D26] mt-1">92%</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Almost complete!</div>
        </div>
      </div>

      {/* Main Grid: Lettered Review Sections & Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Lettered Sections (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Today's Accomplishments */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-50 text-[#E11D26] font-bold text-xs flex items-center justify-center">A</span>
              <h3 className="text-sm font-bold text-gray-900">Today's Accomplishments</h3>
            </div>

            <div className="space-y-2">
              {accomplishments.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-gray-800">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-semibold">{item.category}</span>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Learning Reflection */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563EB] font-bold text-xs flex items-center justify-center">B</span>
              <h3 className="text-sm font-bold text-gray-900">Learning Reflection</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">What concepts or patterns clicked today?</label>
                <textarea
                  rows={2}
                  value={reflection1}
                  onChange={(e) => setReflection1(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-[#E11D26] text-xs text-gray-800 leading-relaxed"
                />
                <div className="text-[10px] text-gray-400 text-right mt-0.5">{reflection1.length} / 500</div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">What challenges or questions need reinforcement?</label>
                <textarea
                  rows={2}
                  value={reflection2}
                  onChange={(e) => setReflection2(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-hidden focus:border-[#E11D26] text-xs text-gray-800 leading-relaxed"
                />
                <div className="text-[10px] text-gray-400 text-right mt-0.5">{reflection2.length} / 300</div>
              </div>
            </div>
          </div>

          {/* Section C: Blockers & Improvements */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-[#D97706] font-bold text-xs flex items-center justify-center">C</span>
              <h3 className="text-sm font-bold text-gray-900">Blockers and Improvements</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              {['Time management', 'Concept understanding', 'Distractions', 'Energy fatigue'].map((tag) => {
                const isSelected = selectedBlockerTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) setSelectedBlockerTags(selectedBlockerTags.filter(t => t !== tag));
                      else setSelectedBlockerTags([...selectedBlockerTags, tag]);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400' : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-hidden focus:border-[#E11D26]"
            />
          </div>

          {/* Section D: Plan for Tomorrow */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 font-bold text-xs flex items-center justify-center">D</span>
              <h3 className="text-sm font-bold text-gray-900">Plan for Tomorrow</h3>
            </div>

            <div className="space-y-2">
              {tomorrowPlan.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="font-semibold text-gray-800">{p.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 text-[11px] font-semibold">{p.category}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Rail: Consistency & Breakdown */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Review Consistency</h3>
            <p className="text-xs text-gray-500 mb-3">7 consecutive daily logs completed</p>

            <div className="grid grid-cols-7 gap-1.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center">
                  <span className="text-[10px] font-bold text-gray-400 mb-1 block">{d}</span>
                  <div className="h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    ✓
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Study Category Breakdown</h3>
            <p className="text-xs text-gray-500 mb-4">Minutes logged today by topic</p>

            <div className="space-y-3">
              {[
                { name: 'DSA Pattern Practice', mins: 140, pct: 55, color: 'bg-[#E11D26]' },
                { name: 'SQL & Database Lab', mins: 75, pct: 30, color: 'bg-[#2563EB]' },
                { name: 'Planning & Reviews', mins: 37, pct: 15, color: 'bg-emerald-500' },
              ].map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{cat.name}</span>
                    <span className="font-bold text-gray-900">{cat.mins} min ({cat.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
