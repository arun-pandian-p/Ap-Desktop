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
  ChevronRight,
  Trash2,
  X,
  BookOpen,
  ShieldCheck,
  Info,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { Question, ScreenId, DifficultyLevel, Track } from '@/types';
import { fetchQuestions, updateQuestionStatus, fetchTracks, createQuestion, deleteQuestion, fetchVerificationSummary } from '@/services/db';
import { DatasetAuditModal } from '@/components/dialogs/DatasetAuditModal';

interface ProblemsViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectProblemForPractice?: (problem: Question) => void;
  selectedTrack?: Track;
  initialSearch?: string;
}

export const ProblemsView: React.FC<ProblemsViewProps> = ({
  onNavigate,
  onSelectProblemForPractice,
  selectedTrack,
  initialSearch,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(1337);
  const [search, setSearch] = useState(initialSearch || '');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [trackFilter, setTrackFilter] = useState<string>(selectedTrack?.slug || 'All');
  const [tracksList, setTracksList] = useState<Track[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // Add Question Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<string>('All');
  const [verifiedCount, setVerifiedCount] = useState<number>(29);
  const [newTitle, setNewTitle] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('Medium');
  const [newPattern, setNewPattern] = useState('');
  const [newSubtopic, setNewSubtopic] = useState('');
  const [newPlatform, setNewPlatform] = useState('LeetCode');
  const [newLink, setNewLink] = useState('');
  const [newTrackSlug, setNewTrackSlug] = useState(selectedTrack?.slug || 'core-dsa');

  const [kpiStats, setKpiStats] = useState({ total: 1337, solved: 90, inProgress: 3, notStarted: 1244 });

  useEffect(() => {
    fetchTracks().then(setTracksList).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setCurrentPage(1);
    }
  }, [initialSearch]);

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      if (e.detail?.query !== undefined) {
        setSearch(e.detail.query);
        setCurrentPage(1);
      }
    };
    window.addEventListener('ap_search_problems', handleGlobalSearch);
    return () => window.removeEventListener('ap_search_problems', handleGlobalSearch);
  }, []);

  useEffect(() => {
    if (selectedTrack) {
      setTrackFilter(selectedTrack.slug);
      setNewTrackSlug(selectedTrack.slug);
    }
  }, [selectedTrack]);

  const loadData = async () => {
    const res = await fetchQuestions({
      search,
      difficulty: difficultyFilter,
      status: statusFilter,
      trackSlug: trackFilter !== 'All' ? trackFilter : undefined,
      verificationStatus: verificationFilter !== 'All' ? verificationFilter : undefined,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    });
    setQuestions(res.questions);
    setTotal(res.total);

    try {
      const summary = await fetchVerificationSummary();
      if (summary) setVerifiedCount(summary.verified);
    } catch {}

    try {
      const { fetchProfileStats } = await import('@/services/db');
      const stats = await fetchProfileStats();
      const tot = res.total || 1337;
      setKpiStats({
        total: tot,
        solved: stats.totalSolved,
        inProgress: stats.attemptingCount,
        notStarted: Math.max(0, tot - stats.totalSolved - stats.attemptingCount),
      });
    } catch {}
  };

  useEffect(() => {
    window.addEventListener('ap_questions_updated', loadData);
    window.addEventListener('ap_submissions_updated', loadData);
    window.addEventListener('ap_tracks_updated', loadData);
    return () => {
      window.removeEventListener('ap_questions_updated', loadData);
      window.removeEventListener('ap_submissions_updated', loadData);
      window.removeEventListener('ap_tracks_updated', loadData);
    };
  }, [trackFilter]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, difficultyFilter, statusFilter, trackFilter, verificationFilter]);

  useEffect(() => {
    loadData();
  }, [search, difficultyFilter, statusFilter, trackFilter, verificationFilter, currentPage]);

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
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Add question to sheet"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Problem</span>
          </button>

          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Audit dataset and inspect deterministic verification pipeline"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Dataset Audit</span>
          </button>

          <button
            onClick={() => onNavigate('python')}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Open Practice IDE</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Total Curriculum</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{kpiStats.total.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400">Curated Problems</div>
        </div>
        <div 
          onClick={() => setIsAuditModalOpen(true)}
          className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs cursor-pointer hover:border-emerald-400 transition-all"
          title="Click to view Problem Verification Dashboard"
        >
          <div className="text-xs font-medium text-emerald-700 flex items-center justify-between">
            <span>Verified</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{verifiedCount.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-medium">100% Tested Reference</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-emerald-600">Solved</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{kpiStats.solved.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600">{Math.round((kpiStats.solved / Math.max(1, kpiStats.total)) * 100)}% Completion</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-blue-600">In Progress</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">{kpiStats.inProgress.toLocaleString()}</div>
          <div className="text-[10px] text-blue-600">Active Attempts</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Not Started</div>
          <div className="text-xl font-black text-gray-600 mt-0.5">{kpiStats.notStarted.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400">Remaining to Solve</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#E8EAF2] shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-medium text-gray-500">Curriculum Progress</div>
          <div className="w-full bg-gray-100 rounded-full h-2 my-1">
            <div className="bg-[#E11D26] h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((kpiStats.solved / Math.max(1, kpiStats.total)) * 100))}%` }}></div>
          </div>
          <div className="text-[10px] text-gray-400 font-medium">{kpiStats.solved} of {kpiStats.total} completed</div>
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

        {/* Verification Status Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium mr-1">Audit Status:</span>
          {[
            { id: 'All', label: 'All' },
            { id: 'verified', label: 'Verified' },
            { id: 'partially_verified', label: 'Partially Verified' },
            { id: 'unverified', label: 'Unverified' },
          ].map((vst) => (
            <button
              key={vst.id}
              onClick={() => setVerificationFilter(vst.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                verificationFilter === vst.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {vst.label}
            </button>
          ))}
        </div>

        {/* Difficulty Filters & Sheet Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium mr-1">Sheet:</span>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-[#142038] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-hidden focus:border-[#E11D26]"
            >
              <option value="All">All Sheets ({tracksList.length})</option>
              {tracksList.map(t => (
                <option key={t.id} value={t.slug}>{t.title}</option>
              ))}
            </select>
          </div>

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
                  <th className="py-3 px-3">Verification</th>
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

                      <td className="py-3 px-3">
                        {q.verification_status === 'verified' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        ) : q.verification_status === 'partially_verified' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-max">
                            <Info className="w-3 h-3 text-blue-600" />
                            <span>Partially Verified</span>
                          </span>
                        ) : q.verification_status === 'invalid' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 w-max">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Invalid</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                            <HelpCircle className="w-3 h-3 text-amber-600" />
                            <span>Unverified</span>
                          </span>
                        )}
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
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-[#E11D26] text-[#E11D26] hover:text-white transition-all shadow-2xs cursor-pointer"
                            title="Code Solution in Practice IDE"
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
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete question "${q.title}"?`)) {
                                await deleteQuestion(q.id);
                                loadData();
                              }
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete problem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add Problem Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0E1526] border border-[#E8EAF2] dark:border-[#1E2A44] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-[#0E1526] border-b border-[#E8EAF2] dark:border-[#1E2A44] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 text-[#E11D26] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Add Problem to Sheet</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                await createQuestion({
                  title: newTitle.trim(),
                  difficulty: newDifficulty,
                  pattern_name: newPattern.trim() || 'General',
                  subtopic_name: newSubtopic.trim(),
                  platform: newPlatform,
                  practice_link: newLink.trim(),
                  track_slug: newTrackSlug,
                });
                setIsAddModalOpen(false);
                setNewTitle('');
                setNewPattern('');
                setNewSubtopic('');
                setNewLink('');
                loadData();
              }}
              className="p-6 space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Target Sheet</label>
                <select
                  value={newTrackSlug}
                  onChange={(e) => setNewTrackSlug(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl"
                >
                  {tracksList.map(t => <option key={t.id} value={t.slug}>{t.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Problem Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Longest Substring Without Repeating Characters"
                  className="w-full px-3 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                  <input
                    type="text"
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    placeholder="LeetCode, GFG, HackerRank"
                    className="w-full px-3 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Pattern / Topic</label>
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="e.g. Sliding Window, Dynamic Programming"
                  className="w-full px-3 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Practice Link (URL)</label>
                <input
                  type="url"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://leetcode.com/problems/..."
                  className="w-full px-3 py-2 bg-white dark:bg-[#142038] border border-gray-300 dark:border-gray-700 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dataset Audit Modal */}
      <DatasetAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          loadData();
        }}
        onSelectProblemForPractice={onSelectProblemForPractice}
      />
    </div>
  );
};
