import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Play, 
  Bookmark, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Filter, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Question, ScreenId, DifficultyLevel } from '@/types';
import { fetchQuestions, updateQuestionStatus } from '@/services/db';

interface ProblemsViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectProblemForPractice?: (problem: Question) => void;
}

export const ProblemsView: React.FC<ProblemsViewProps> = ({
  onNavigate,
  onSelectProblemForPractice,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(1337);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  const loadData = async () => {
    const res = await fetchQuestions({
      search,
      difficulty: difficultyFilter,
      status: statusFilter,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    });
    setQuestions(res.questions);
    setTotal(res.total);
  };

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, difficultyFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [search, difficultyFilter, statusFilter, currentPage]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleSolved = async (q: Question) => {
    const nextStatus = q.status === 'solved' ? 'todo' : 'solved';
    await updateQuestionStatus(q.id, nextStatus);
    loadData();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Coding Problems</h1>
          <p className="text-xs text-gray-500 mt-1">
            Master 50 core algorithmic patterns across 1,337 curated interview questions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, pattern..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E8EAF2] rounded-xl focus:outline-hidden focus:border-[#E11D26] shadow-2xs"
            />
          </div>

          <button
            onClick={() => onNavigate('python')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Open Python IDE</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Total Curriculum</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">1,337</div>
          <div className="text-[10px] text-gray-400">Curated Problems</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-emerald-600">Solved</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">142</div>
          <div className="text-[10px] text-emerald-600">10.6% Completion</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-blue-600">In Progress</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">38</div>
          <div className="text-[10px] text-blue-600">Active Attempts</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Not Started</div>
          <div className="text-xl font-black text-gray-600 mt-0.5">1,157</div>
          <div className="text-[10px] text-gray-400">Remaining to Solve</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-medium text-gray-500">Curriculum Progress</div>
          <div className="w-full bg-gray-100 rounded-full h-2 my-1">
            <div className="bg-[#E11D26] h-2 rounded-full" style={{ width: '10.6%' }}></div>
          </div>
          <div className="text-[10px] text-gray-400 font-medium">Goal: 300 problems</div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E8EAF2]">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          {['All', 'Solved', 'Attempted', 'Todo'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-[#E11D26] text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Difficulty Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium mr-1">Difficulty:</span>
          {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                difficultyFilter === diff
                  ? diff === 'Easy'
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
                    : diff === 'Medium'
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400'
                    : diff === 'Hard'
                    ? 'bg-red-100 text-red-800 ring-1 ring-red-400'
                    : 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table & Right Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E8EAF2] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-[#E8EAF2] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(questions.map(q => q.id)));
                        else setSelectedIds(new Set());
                      }}
                      className="w-3.5 h-3.5 rounded text-[#E11D26] border-gray-300" 
                    />
                  </th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Problem Title</th>
                  <th className="py-3 px-3">Pattern / Topic</th>
                  <th className="py-3 px-3">Difficulty</th>
                  <th className="py-3 px-3">Platform</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {questions.map((q) => {
                  const isSolved = q.status === 'solved';
                  const isSelected = selectedIds.has(q.id);
                  return (
                    <tr 
                      key={q.id}
                      className={`hover:bg-gray-50/80 transition-colors ${isSelected ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(q.id)}
                          className="w-3.5 h-3.5 rounded text-[#E11D26] border-gray-300"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleSolved(q)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSolved
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 hover:border-[#E11D26]'
                          }`}
                        >
                          {isSolved && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      <td className="py-3 px-4 font-semibold text-gray-900 max-w-xs">
                        <div className="truncate">{q.title}</div>
                        <div className="text-[10px] text-gray-400 font-normal">#{q.order_num} • {q.subtopic_name || 'Core Problem'}</div>
                      </td>

                      <td className="py-3 px-3 text-gray-600">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                          {q.pattern_name || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700'
                            : q.difficulty === 'Medium'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-gray-500 font-medium text-[11px]">
                        {q.platform}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              if (onSelectProblemForPractice) onSelectProblemForPractice(q);
                              onNavigate('python');
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-[#E11D26] text-[#E11D26] hover:text-white transition-all shadow-2xs"
                            title="Code Solution in Python"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          {q.practice_link && (
                            <a
                              href={q.practice_link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Open External Problem"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {total > 0 ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, total)} of {total} problems
              <span className="ml-2 font-semibold text-gray-700">(Page {currentPage} of {Math.max(1, Math.ceil(total / pageSize))})</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-gray-700 font-semibold transition-all active:scale-95 shadow-2xs"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-gray-600 font-bold">{currentPage} / {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(total / pageSize)), p + 1))}
                disabled={currentPage >= Math.ceil(total / pageSize)}
                className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-gray-700 font-semibold transition-all active:scale-95 shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Rail: Continue Practice & Recommended */}
        <div className="space-y-6">
          {/* Continue Practice Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Up Next in Queue</h3>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-900">Find Even or Odd</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Easy</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Beginners Basic Math Probs</p>
              <button
                onClick={() => onNavigate('python')}
                className="mt-3 w-full py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Practice</span>
              </button>
            </div>
          </div>

          {/* Daily Goal Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-900">Daily Target</h3>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-gray-900">3 of 5</div>
            <p className="text-xs text-gray-500 mb-3">problems completed today</p>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div className="bg-[#E11D26] h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <div className="text-[11px] text-gray-400 italic">2 more to keep your 14-day streak burning!</div>
          </div>
        </div>
      </div>
    </div>
  );
};
