import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Table,
  Search,
  Bookmark,
  Send,
  Check,
  Flame,
  Clock,
  Save,
  Award,
  Layers,
  FileText,
  BookOpen,
  Code2,
  History,
  Tag,
  Building2,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  HelpCircle,
  ExternalLink,
  Maximize2,
  Image as ImageIcon,
  X,
  ListFilter
} from 'lucide-react';
import initialSqlExercisesData from '@/data/sqlExercises.json';
import { MonacoCodeEditor, MonacoCodeEditorHandle } from '@/components/common/MonacoCodeEditor';
import { executeSqlQuery, resetExerciseSqlDb, SqlQueryResult } from '@/services/runner';
import { fetchSqlExercises } from '@/services/db';
import { SqlExercise } from '@/types';

export const SqlPracticeView: React.FC = () => {
  const editorRef = useRef<MonacoCodeEditorHandle>(null);

  const [exercises, setExercises] = useState<SqlExercise[]>(initialSqlExercisesData as SqlExercise[]);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const exercise = exercises[selectedExerciseIndex] || (initialSqlExercisesData[0] as SqlExercise);

  const [query, setQuery] = useState(exercise.initial_query || 'SELECT * FROM Person;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);

  // LeetCode Tabs
  const [activeProblemTab, setActiveProblemTab] = useState<'description' | 'editorial' | 'solutions' | 'submissions'>('description');
  const [activeBottomTab, setActiveBottomTab] = useState<'results' | 'testcase' | 'history'>('results');

  // Schema popups / toggles
  const [showSqlSchemaModal, setShowSqlSchemaModal] = useState(false);
  const [showPandasSchemaModal, setShowPandasSchemaModal] = useState(false);
  const [isProblemListOpen, setIsProblemListOpen] = useState(false);

  // Internet Scraped Table Image URL support
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [showImageConnector, setShowImageConnector] = useState(false);

  const [searchFilter, setSearchFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likesCount, setLikesCount] = useState(4620);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [history, setHistory] = useState<Array<{ title: string; time: string; passed: boolean; duration: number }>>([
    { title: '175. Combine Two Tables', time: '10:42 AM', passed: true, duration: 6 },
    { title: 'High Earners in Engineering', time: '09:15 AM', passed: true, duration: 8 },
    { title: 'Duplicate Emails', time: 'Yesterday', passed: true, duration: 5 },
  ]);

  // Load from DB on mount and listen for CSV updates
  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchSqlExercises();
        if (list && list.length > 0) {
          setExercises(list);
          const current = list[selectedExerciseIndex] || list[0];
          if (current) {
            const initialQ = current.initial_query || current.solution_sql || 'SELECT * FROM Person;';
            setQuery(initialQ);
            editorRef.current?.setValue(initialQ);
            resetExerciseSqlDb(current.id);
          }
        }
      } catch (e) {
        console.warn('Error loading SQL exercises from DB:', e);
      }
    }
    loadData();

    window.addEventListener('ap_sql_exercises_updated', loadData);
    return () => window.removeEventListener('ap_sql_exercises_updated', loadData);
  }, []);

  // Update query buffer when exercise changes
  const handleSelectExercise = (idx: number) => {
    setSelectedExerciseIndex(idx);
    const nextEx = exercises[idx] || (initialSqlExercisesData[0] as SqlExercise);
    const initialQ = nextEx.initial_query || nextEx.solution_sql || 'SELECT * FROM Person;';
    setQuery(initialQ);
    editorRef.current?.setValue(initialQ);
    setResult(null);
    setIsProblemListOpen(false);
    setCustomImageUrl(nextEx.image_url || '');
    resetExerciseSqlDb(nextEx.id);
  };

  const handleNextProblem = () => {
    if (selectedExerciseIndex < exercises.length - 1) {
      handleSelectExercise(selectedExerciseIndex + 1);
    }
  };

  const handlePrevProblem = () => {
    if (selectedExerciseIndex > 0) {
      handleSelectExercise(selectedExerciseIndex - 1);
    }
  };

  const handleRunQuery = async () => {
    setIsExecuting(true);
    setActiveBottomTab('results');
    const latestQuery = editorRef.current?.getValue() || query;
    const res = await executeSqlQuery(latestQuery, exercise.id);
    setResult(res);
    setIsExecuting(false);

    if (res) {
      const isPassed = Boolean(res.passed && !res.error);
      setHistory(prev => [
        {
          title: exercise.title,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          passed: isPassed,
          duration: res.execution_ms,
        },
        ...prev.slice(0, 9),
      ]);

      // Record to SQLite attempts database in real time
      try {
        const { recordSubmission } = await import('@/services/db');
        await recordSubmission({
          question_id: exercise.id,
          problem_title: exercise.title,
          difficulty: exercise.difficulty,
          category: exercise.category,
          problem_type: 'sql',
          language: 'sql',
          code: latestQuery,
          status: isPassed ? 'Accepted' : (res.error ? 'Runtime Error' : 'Wrong Answer'),
          runtime_ms: res.execution_ms,
          test_cases_passed: isPassed ? 1 : 0,
          total_test_cases: 1,
        });
      } catch (err) {
        console.warn('Failed to record SQL submission:', err);
      }
    }
  };

  const handleResetQuery = () => {
    resetExerciseSqlDb(exercise.id);
    const initialQ = exercise.initial_query || '';
    setQuery(initialQ);
    editorRef.current?.setValue(initialQ);
    setResult(null);
  };

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchSearch = ex.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          ex.category.toLowerCase().includes(searchFilter.toLowerCase());
      const matchDiff = difficultyFilter === 'All' || ex.difficulty === difficultyFilter;
      const matchTopic = selectedTopic === 'All' || ex.category === selectedTopic;
      return matchSearch && matchDiff && matchTopic;
    });
  }, [exercises, searchFilter, difficultyFilter, selectedTopic]);

  const topicsList = useMemo(() => {
    const map = new Map<string, number>();
    exercises.forEach(ex => {
      map.set(ex.category, (map.get(ex.category) || 0) + 1);
    });
    return [
      { name: 'All', count: exercises.length },
      ...Array.from(map.entries()).map(([name, count]) => ({ name, count })),
    ];
  }, [exercises]);

  const parsedExpectedOutput = useMemo(() => {
    try {
      return JSON.parse(exercise.expected_output_json || '[]');
    } catch {
      return [];
    }
  }, [exercise.expected_output_json]);

  const activeImageUrl = customImageUrl || exercise.image_url;

  return (
    <div className="h-full flex flex-col bg-[#0B0F19] text-[#E6EAF5] overflow-hidden select-none" data-surface="dark-panel">
      {/* Top Workspace Header Bar */}
      <div className="h-12 bg-[#101524] border-b border-[#1E273D] flex items-center justify-between px-4 text-xs z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400 font-medium">
            <span>Home</span>
            <span>&gt;</span>
            <span className="font-extrabold text-white">SQL Practice</span>
          </div>

          {/* Quick Problem Navigator */}
          <div className="flex items-center gap-1 bg-[#182033] p-0.5 rounded-lg border border-[#25324E]">
            <button
              onClick={handlePrevProblem}
              disabled={selectedExerciseIndex === 0}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-[#25324E] cursor-pointer"
              title="Previous Problem"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsProblemListOpen(true)}
              className="px-2.5 py-0.5 text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Browse all SQL problems"
            >
              <span className="max-w-[140px] truncate">{exercise.title}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <button
              onClick={handleNextProblem}
              disabled={selectedExerciseIndex >= exercises.length - 1}
              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-[#25324E] cursor-pointer"
              title="Next Problem"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#182033] rounded-lg border border-[#25324E] text-xs font-mono text-gray-300">
            <Database className="w-3.5 h-3.5 text-[#E11D26]" />
            <span>SQLite Wasm Engine</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <button
            onClick={() => setShowImageConnector(prev => !prev)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#182033] hover:bg-[#25324E] text-gray-300 hover:text-white rounded-lg border border-[#25324E] transition-colors cursor-pointer"
            title="Connect / scrape table images from internet"
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>Table Image {activeImageUrl ? '(Connected)' : ''}</span>
          </button>

          <button
            onClick={handleResetQuery}
            className="flex items-center gap-1.5 px-2.5 py-1 text-gray-400 hover:text-white hover:bg-[#1E2638] rounded-lg transition-colors cursor-pointer"
            title="Reset code to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRunQuery}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Run Query against SQLite (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isExecuting ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Optional Internet Image Connector Input Drawer */}
      {showImageConnector && (
        <div className="bg-[#101524] border-b border-[#1E273D] px-4 py-2.5 flex items-center gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-cyan-400 font-bold shrink-0">
            <ImageIcon className="w-4 h-4" />
            <span>Scraped Table Image URL:</span>
          </div>
          <input
            type="text"
            placeholder="Paste table image URL scraped from web (e.g. https://... or /assets/...)"
            value={customImageUrl}
            onChange={(e) => setCustomImageUrl(e.target.value)}
            className="flex-1 bg-[#182033] border border-[#25324E] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#E11D26]"
          />
          {customImageUrl && (
            <button
              onClick={() => setCustomImageUrl('')}
              className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-[#182033]"
            >
              Clear Image
            </button>
          )}
          <button
            onClick={() => setShowImageConnector(false)}
            className="text-gray-500 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Pane Split: Left (Problem Description matching LeetCode 175) & Right (Editor & Results) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        
        {/* ========================================================= */}
        {/* Left Pane: LeetCode 175 Problem Description (6 cols)     */}
        {/* ========================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col border-r border-[#1C2438] bg-[#0E1322] overflow-hidden">
          
          {/* Top Tabs Bar: Description | Editorial | Solutions | Submissions */}
          <div className="h-9 bg-[#101524] border-b border-[#1C2438] px-4 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveProblemTab('description')}
                className={`flex items-center gap-1.5 pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activeProblemTab === 'description'
                    ? 'border-[#E11D26] text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Description</span>
              </button>

              <button
                onClick={() => setActiveProblemTab('editorial')}
                className={`flex items-center gap-1.5 pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activeProblemTab === 'editorial'
                    ? 'border-[#E11D26] text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Editorial</span>
              </button>

              <button
                onClick={() => setActiveProblemTab('solutions')}
                className={`flex items-center gap-1.5 pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activeProblemTab === 'solutions'
                    ? 'border-[#E11D26] text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Solutions</span>
              </button>

              <button
                onClick={() => setActiveProblemTab('submissions')}
                className={`flex items-center gap-1.5 pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                  activeProblemTab === 'submissions'
                    ? 'border-[#E11D26] text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <History className="w-3.5 h-3.5 text-purple-400" />
                <span>Submissions</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <button
                onClick={() => setIsProblemListOpen(true)}
                className="hover:text-white p-1 rounded hover:bg-[#182033] flex items-center gap-1 text-[11px] cursor-pointer"
                title="Browse problem list"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List ({exercises.length})</span>
              </button>
            </div>
          </div>

          {/* Problem Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-gray-300">
            {activeProblemTab === 'description' && (
              <div className="space-y-4">
                {/* Title & Solved State */}
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{exercise.title}</span>
                  </h1>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                    <span>Solved</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                </div>

                {/* Tags & Pills: Easy / Topics / Companies */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    exercise.difficulty === 'Easy' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' :
                    exercise.difficulty === 'Medium' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50' :
                    'bg-red-950/80 text-red-400 border border-red-800/50'
                  }`}>
                    {exercise.difficulty}
                  </span>

                  <button
                    onClick={() => {}}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#182033] border border-[#25324E] text-gray-300 hover:text-white text-[11px] cursor-pointer"
                  >
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span>Topics</span>
                  </button>

                  <button
                    onClick={() => {}}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#182033] border border-[#25324E] text-gray-300 hover:text-white text-[11px] cursor-pointer"
                  >
                    <Building2 className="w-3 h-3 text-gray-400" />
                    <span>Companies</span>
                  </button>
                </div>

                {/* Schema Links: SQL Schema > | Pandas Schema > */}
                <div className="flex items-center gap-4 text-xs font-semibold pt-1">
                  <button
                    onClick={() => setShowSqlSchemaModal(true)}
                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>SQL Schema</span>
                    <span>&gt;</span>
                  </button>

                  <button
                    onClick={() => setShowPandasSchemaModal(true)}
                    className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Pandas Schema</span>
                    <span>&gt;</span>
                  </button>
                </div>

                {/* Description Text */}
                <p className="leading-relaxed text-gray-300 text-xs whitespace-pre-line">
                  {exercise.description}
                </p>

                {/* Connected / Scraped Internet Image Table if available */}
                {activeImageUrl && (
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#141A2E] border border-[#232F4D]">
                    <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Connected Table Image (Web / Diagram):</span>
                      </span>
                    </div>
                    <img
                      src={activeImageUrl}
                      alt="Scraped SQL Table Diagram"
                      className="max-w-full rounded-lg border border-[#25324E] shadow-md object-contain max-h-64 mx-auto"
                      onError={() => console.warn('Image failed to load:', activeImageUrl)}
                    />
                  </div>
                )}

                {/* Schema Tables ASCII (Matching Screenshot 2) */}
                {exercise.schema_tables_ascii ? (
                  <div className="space-y-2">
                    <pre className="p-3.5 bg-[#121727] rounded-xl border border-[#202940] font-mono text-[11px] text-gray-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {exercise.schema_tables_ascii}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="font-bold text-gray-300">Schema DDL:</div>
                    <pre className="p-3 bg-[#121727] rounded-xl border border-[#202940] text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap">
                      {exercise.schema_sql}
                    </pre>
                  </div>
                )}

                {/* Input ASCII Tables (Matching Screenshot 3) */}
                {exercise.input_ascii ? (
                  <div className="space-y-1.5">
                    <div className="font-bold text-sm text-white">Input:</div>
                    <pre className="p-3.5 bg-[#121727] rounded-xl border border-[#202940] font-mono text-[11px] text-gray-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {exercise.input_ascii}
                    </pre>
                  </div>
                ) : null}

                {/* Output ASCII Table (Matching Screenshot 3) */}
                {exercise.output_ascii ? (
                  <div className="space-y-1.5">
                    <div className="font-bold text-sm text-white">Output:</div>
                    <pre className="p-3.5 bg-[#121727] rounded-xl border border-[#202940] font-mono text-[11px] text-gray-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {exercise.output_ascii}
                    </pre>
                  </div>
                ) : null}

                {/* Explanation Block (Matching Screenshot 3) */}
                {exercise.explanation && (
                  <div className="space-y-1.5">
                    <div className="font-bold text-sm text-white">Explanation:</div>
                    <div className="p-3.5 bg-[#121727] rounded-xl border border-[#202940] text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                      {exercise.explanation}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeProblemTab === 'editorial' && (
              <div className="space-y-3 leading-relaxed">
                <h3 className="font-bold text-base text-white">Editorial & SQL Query Mechanics</h3>
                <p>
                  To combine information across relational entities where some records may not exist in the referenced table, an <strong className="text-white">OUTER JOIN</strong> (specifically <code className="bg-[#1C2438] px-1.5 py-0.5 rounded text-red-400 font-mono">LEFT JOIN</code>) is required.
                </p>
                <div className="p-3 bg-[#161D2E] rounded-xl border border-[#25324E] space-y-2">
                  <div className="font-bold text-white text-xs">Join Logic Breakdown:</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-300 text-xs">
                    <li><strong className="text-white">INNER JOIN:</strong> Drops rows if foreign key is not present.</li>
                    <li><strong className="text-white">LEFT JOIN:</strong> Retains all rows from the left table and outputs <code className="font-mono text-amber-400">NULL</code> for missing right-hand columns.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeProblemTab === 'solutions' && (
              <div className="space-y-3">
                <h3 className="font-bold text-base text-white">Optimal SQL Solution</h3>
                <div className="relative">
                  <pre className="p-4 bg-[#121727] rounded-xl border border-[#202940] font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
                    {exercise.solution_sql}
                  </pre>
                  <button
                    onClick={() => {
                      setQuery(exercise.solution_sql);
                      editorRef.current?.setValue(exercise.solution_sql);
                    }}
                    className="mt-2 px-3 py-1.5 bg-[#1E273D] hover:bg-[#2A3756] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Copy to Editor</span>
                  </button>
                </div>
              </div>
            )}

            {activeProblemTab === 'submissions' && (
              <div className="space-y-3">
                <h3 className="font-bold text-base text-white">Submission History</h3>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#121727] rounded-xl border border-[#202940] text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${h.passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="font-semibold text-white">{h.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${h.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                          {h.passed ? 'Accepted' : 'Wrong Answer'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
                        <span>{h.time}</span>
                        <span className="text-white">{h.duration} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom LeetCode Reactions Footer (Thumbs up 4.6K, Star, Share) */}
          <div className="h-10 bg-[#101524] border-t border-[#1C2438] px-4 flex items-center justify-between text-xs text-gray-400 select-none shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setLiked(prev => !prev);
                  setLikesCount(c => liked ? c - 1 : c + 1);
                }}
                className={`flex items-center gap-1 hover:text-white cursor-pointer ${liked ? 'text-emerald-400 font-bold' : ''}`}
                title="Like problem"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>{(likesCount / 1000).toFixed(1)}K</span>
              </button>

              <button className="hover:text-white cursor-pointer" title="Dislike">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsBookmarked(b => !b)}
                className={`hover:text-white cursor-pointer ${isBookmarked ? 'text-amber-400 fill-amber-400' : ''}`}
                title="Bookmark problem"
              >
                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
              </button>

              <button className="hover:text-white cursor-pointer" title="Share problem">
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="hover:text-white p-1" title="Help & Feedback">
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* Right Pane: Monaco Query Editor & Results (6 cols)        */}
        {/* ========================================================= */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-[#0E1322] overflow-hidden">
          
          {/* Editor Header Bar */}
          <div className="h-9 bg-[#101524] border-b border-[#1C2438] px-4 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-300">
                <Code2 className="w-3.5 h-3.5 text-[#E11D26]" />
                <span>SQL (SQLite dialect)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => editorRef.current?.format()}
                className="hover:text-white text-gray-400 text-[11px] px-2 py-0.5 rounded hover:bg-[#182033] cursor-pointer"
                title="Format SQL query"
              >
                Format
              </button>
              <button
                onClick={() => {
                  setQuery('');
                  editorRef.current?.setValue('');
                }}
                className="hover:text-white text-gray-400 text-[11px] px-2 py-0.5 rounded hover:bg-[#182033] cursor-pointer"
                title="Clear editor"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Monaco Editor Container (Top half) */}
          <div className="h-1/2 relative bg-[#141A2E] border-b border-[#1C2438]">
            <MonacoCodeEditor
              ref={editorRef}
              value={query}
              onChange={setQuery}
              workspace="sql"
              language="sql"
              selectedLanguageId="sqlite"
              theme="vs-dark"
              title="SQL Query"
              onRun={handleRunQuery}
            />
          </div>

          {/* Bottom Results & Testcase Pane (Bottom half) */}
          <div className="flex-1 flex flex-col bg-[#0E1322] overflow-hidden">
            {/* Results Navigation Tabs */}
            <div className="h-9 bg-[#101524] border-b border-[#1C2438] px-4 flex items-center justify-between text-xs select-none shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveBottomTab('results')}
                  className={`pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                    activeBottomTab === 'results' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Results Table
                </button>
                <button
                  onClick={() => setActiveBottomTab('testcase')}
                  className={`pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                    activeBottomTab === 'testcase' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Expected Target
                </button>
                <button
                  onClick={() => setActiveBottomTab('history')}
                  className={`pb-2 pt-2 border-b-2 font-semibold transition-colors cursor-pointer ${
                    activeBottomTab === 'history' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Execution Log
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400">
                  <span>Runtime: <strong className="text-white">{result.execution_ms} ms</strong></span>
                  <span>Rows: <strong className="text-white">{result.rows_count}</strong></span>
                </div>
              )}
            </div>

            {/* Results Table Output Container */}
            <div className="flex-1 overflow-auto p-4 text-xs font-mono">
              {isExecuting ? (
                <div className="flex items-center gap-2 text-gray-400 animate-pulse p-4">
                  <Database className="w-4 h-4 text-[#E11D26]" />
                  <span>Executing query against SQLite WebAssembly worker...</span>
                </div>
              ) : activeBottomTab === 'results' ? (
                result ? (
                  result.error ? (
                    <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-xl text-red-300 font-mono text-xs">
                      {result.error}
                    </div>
                  ) : result.values.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 font-mono text-xs">
                      Query executed successfully. 0 rows returned.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/50">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Query executed successfully. Execution time: {result.execution_ms} ms | Rows returned: {result.rows_count}</span>
                      </div>

                      <div className="bg-[#121727] rounded-xl border border-[#202940] overflow-hidden">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="bg-[#182033] border-b border-[#25324E] text-gray-200 font-bold">
                              {result.columns.map((c, i) => (
                                <th key={i} className="py-2 px-3 border-r border-[#25324E] last:border-r-0">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1C253B]">
                            {result.values.map((row, ri) => (
                              <tr key={ri} className="hover:bg-[#182136]">
                                {row.map((val, vi) => (
                                  <td key={vi} className="py-1.5 px-3 border-r border-[#1C253B] last:border-r-0 text-gray-300">
                                    {val === null ? <span className="text-gray-500 italic">null</span> : String(val)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-gray-500 italic text-center py-10">
                    Click "Run Query" (or Ctrl+Enter) to execute your SQL against the local dataset.
                  </div>
                )
              ) : activeBottomTab === 'testcase' ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-300">Target Output Rows:</div>
                  <pre className="p-3.5 bg-[#121727] border border-[#202940] rounded-xl font-mono text-xs text-gray-200 overflow-x-auto">
                    {JSON.stringify(parsedExpectedOutput, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-300">Recent Executions:</div>
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-[#121727] border border-[#202940] rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${h.passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="font-semibold text-gray-200">{h.title}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-gray-400 text-[11px]">
                        <span>{h.time}</span>
                        <span>{h.duration} ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SQL Schema Popover Modal */}
      {showSqlSchemaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#101524] border border-[#25324E] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E273D] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#E11D26]" />
                <span>SQL Schema DDL (SQLite)</span>
              </h3>
              <button
                onClick={() => setShowSqlSchemaModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#182033]"
              >
                ✕
              </button>
            </div>
            <pre className="p-3 bg-[#141A2E] border border-[#232F4D] rounded-xl font-mono text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {exercise.schema_sql}
              {'\n\n-- Seed statements:\n'}
              {exercise.seed_sql}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSqlSchemaModal(false)}
                className="px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pandas Schema Popover Modal */}
      {showPandasSchemaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#101524] border border-[#25324E] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E273D] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>Pandas Schema (Python DataFrame)</span>
              </h3>
              <button
                onClick={() => setShowPandasSchemaModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#182033]"
              >
                ✕
              </button>
            </div>
            <pre className="p-3 bg-[#141A2E] border border-[#232F4D] rounded-xl font-mono text-xs text-gray-200 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {exercise.pandas_schema || '# Standard Pandas Schema Representation\nimport pandas as pd\n# Data loaded into DataFrame\ndf = pd.read_sql_query(query, conn)'}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setShowPandasSchemaModal(false)}
                className="px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Problem List Drawer Modal */}
      {isProblemListOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#101524] border border-[#25324E] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1E273D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#E11D26]" />
                <h3 className="text-sm font-bold text-white">All SQL Challenges ({filteredExercises.length})</h3>
              </div>
              <button
                onClick={() => setIsProblemListOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#182033]"
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-[#1E273D] bg-[#141A2E] flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search challenges..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#182033] border border-[#25324E] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-1">
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      difficultyFilter === diff
                        ? 'bg-[#E11D26] text-white'
                        : 'bg-[#182033] text-gray-400 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {filteredExercises.map((ex) => {
                const globalIdx = exercises.findIndex(item => item.id === ex.id);
                const isSelected = globalIdx === selectedExerciseIndex;

                return (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExercise(globalIdx)}
                    className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected
                        ? 'bg-[#25151D] text-white border-[#E11D26]/60 shadow-xs'
                        : 'bg-[#141A2E]/60 border-transparent text-gray-300 hover:bg-[#182033] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-[#E11D26] text-white' : 'bg-gray-700/60 text-gray-300'
                      }`}>
                        {globalIdx + 1}
                      </span>
                      <span className="truncate font-semibold">{ex.title}</span>
                      <span className="text-[10px] text-gray-500 font-mono">({ex.category})</span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ml-2 ${
                      ex.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-400' :
                      ex.difficulty === 'Medium' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'
                    }`}>
                      {ex.difficulty}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
