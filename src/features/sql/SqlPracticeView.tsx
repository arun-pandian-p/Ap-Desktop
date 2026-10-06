import React, { useState, useRef, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
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
  ChevronLeft
} from 'lucide-react';
import sqlExercisesData from '@/data/sqlExercises.json';
import { MonacoCodeEditor, MonacoCodeEditorHandle } from '@/components/common/MonacoCodeEditor';
import { executeSqlQuery, resetExerciseSqlDb, SqlQueryResult } from '@/services/runner';

export const SqlPracticeView: React.FC = () => {
  const editorRef = useRef<MonacoCodeEditorHandle>(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(0);
  const exercise = sqlExercisesData[selectedExerciseIndex];

  const [query, setQuery] = useState(exercise.initial_query || 'SELECT * FROM employees;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [activeCenterTab, setActiveCenterTab] = useState<'editor' | 'description' | 'schema' | 'submissions'>('editor');
  const [activeBottomTab, setActiveBottomTab] = useState<'results' | 'testcase' | 'console' | 'history'>('results');
  const [searchFilter, setSearchFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [history, setHistory] = useState<Array<{ title: string; time: string; passed: boolean; duration: number }>>([
    { title: 'Second Highest Salary', time: '10:42 AM', passed: true, duration: 8 },
    { title: 'Duplicate Emails', time: '09:15 AM', passed: true, duration: 6 },
    { title: 'Department Highest Salary', time: 'Yesterday', passed: false, duration: 12 },
  ]);

  const handleSelectExercise = (idx: number) => {
    setSelectedExerciseIndex(idx);
    const nextEx = sqlExercisesData[idx];
    const initialQ = nextEx.initial_query || 'SELECT * FROM employees;';
    setQuery(initialQ);
    editorRef.current?.setValue(initialQ);
    setResult(null);
  };

  const handleRunQuery = async () => {
    setIsExecuting(true);
    setActiveBottomTab('results');
    const latestQuery = editorRef.current?.getValue() || query;
    const res = await executeSqlQuery(latestQuery, exercise.id);
    setResult(res);
    setIsExecuting(false);

    // Record in query history
    if (res) {
      setHistory(prev => [
        {
          title: exercise.title,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          passed: Boolean(res.passed && !res.error),
          duration: res.execution_ms,
        },
        ...prev.slice(0, 9),
      ]);
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
    return sqlExercisesData.filter(ex => {
      const matchSearch = ex.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          ex.category.toLowerCase().includes(searchFilter.toLowerCase());
      const matchDiff = difficultyFilter === 'All' || ex.difficulty === difficultyFilter;
      const matchTopic = selectedTopic === 'All' || ex.category === selectedTopic;
      return matchSearch && matchDiff && matchTopic;
    });
  }, [searchFilter, difficultyFilter, selectedTopic]);

  const topicsList = [
    { name: 'All', count: sqlExercisesData.length },
    { name: 'Aggregation', count: 3 },
    { name: 'Self Join', count: 2 },
    { name: 'Window Functions', count: 2 },
    { name: 'Subqueries', count: 2 },
    { name: 'Basic Query', count: 1 },
  ];

  const parsedExpectedOutput = useMemo(() => {
    try {
      return exercise.expected_output_json ? JSON.parse(exercise.expected_output_json) : [];
    } catch {
      return [];
    }
  }, [exercise.expected_output_json]);

  return (
    <div className="h-full flex flex-col bg-[#F7F8FC] overflow-hidden select-none">
      {/* Top Breadcrumb & Status Bar */}
      <div className="h-12 bg-white border-b border-[#E8EAF2] flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <span>Home</span>
            <span>&gt;</span>
            <span className="font-extrabold text-gray-900">SQL Practice</span>
          </div>

          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SQLite Practice Engine (WASM Isolated)</span>
          </span>
        </div>

        {/* Global User Metric Stats */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="hidden lg:flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>14 Days Streak</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Study Timer: 62h 30m</span>
          </div>

          <button 
            onClick={handleRunQuery}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Progress</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Split (Col 1: Explorer, Col 2: Editor/Results, Col 3: Concept/Progress) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left: SQL Challenge Explorer (3 cols) */}
        <div className="col-span-3 bg-[#13161F] border-r border-[#1E2433] text-[#E6EAF5] flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-[#1E2433] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-200">
              <span className="uppercase tracking-wider text-[11px]">SQL Challenge Explorer</span>
              <span className="text-[10px] text-gray-400 font-mono">{filteredExercises.length} Challenges</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#1C2230] border border-[#2A3347] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#E11D26]"
              />
            </div>

            {/* Difficulty Filter Pills */}
            <div className="flex items-center gap-1.5 text-[11px]">
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                    difficultyFilter === diff
                      ? 'bg-[#E11D26] text-white shadow-xs'
                      : 'bg-[#1C2230] text-gray-400 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Topic Chips */}
            <div className="space-y-1 text-xs">
              <div className="text-[10px] uppercase font-bold text-gray-400">Topics</div>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {topicsList.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTopic(t.name)}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-colors ${
                      selectedTopic === t.name
                        ? 'bg-[#2A3347] text-white font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-[#1C2230]'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exercises List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredExercises.map((ex) => {
              const globalIdx = sqlExercisesData.findIndex(item => item.id === ex.id);
              const isSelected = globalIdx === selectedExerciseIndex;

              return (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExercise(globalIdx)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-[#25151D] text-white border-[#E11D26]/60 shadow-xs'
                      : 'bg-[#181D29]/50 border-transparent text-gray-300 hover:bg-[#1C2230] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected ? 'bg-[#E11D26] text-white' : 'bg-gray-700/60 text-gray-300'
                    }`}>
                      {globalIdx + 1}
                    </span>
                    <span className="truncate font-semibold">{ex.title}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ml-1 ${
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

        {/* Center: Problem Statement, Editor, and Results (6 cols) */}
        <div className="col-span-6 flex flex-col border-r border-[#E8EAF2] bg-white overflow-hidden">
          {/* Problem Header & Table Schema Preview */}
          <div className="p-4 border-b border-[#E8EAF2] bg-[#FAFBFD] space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-gray-900 tracking-tight">{exercise.title}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    exercise.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                    exercise.difficulty === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {exercise.difficulty}
                  </span>
                  <Bookmark className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 cursor-pointer" />
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{exercise.description}</p>
              </div>

              {/* Schema Table Preview */}
              <div className="hidden xl:block bg-white border border-gray-200 rounded-lg p-2 text-[10px] font-mono shadow-2xs max-w-[200px]">
                <div className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <Table className="w-3 h-3 text-blue-600" />
                  <span>Table: employees</span>
                </div>
                <div className="text-gray-500 text-[9px] border-t border-gray-100 pt-1">
                  id (INT), name (VARCHAR), salary (INT)
                </div>
              </div>
            </div>

            {/* Center Navigation Tabs */}
            <div className="flex items-center gap-4 text-xs font-bold border-b border-gray-200/80 pt-1">
              <button
                onClick={() => setActiveCenterTab('editor')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeCenterTab === 'editor' ? 'border-[#E11D26] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                SQL Editor
              </button>
              <button
                onClick={() => setActiveCenterTab('schema')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeCenterTab === 'schema' ? 'border-[#E11D26] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Schema & Tables
              </button>
              <button
                onClick={() => setActiveCenterTab('description')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeCenterTab === 'description' ? 'border-[#E11D26] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Full Description
              </button>
            </div>
          </div>

          {/* Editor Container (Top half) */}
          <div className="h-1/2 relative bg-[#141824] border-b border-gray-200">
            {activeCenterTab === 'editor' ? (
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
            ) : activeCenterTab === 'schema' ? (
              <div className="p-4 h-full overflow-y-auto bg-[#0F141F] text-gray-200 font-mono text-xs space-y-2">
                <div className="font-bold text-gray-300">Target Schema DDL:</div>
                <pre className="p-3 bg-[#161D2B] rounded-xl border border-[#232E45] whitespace-pre-wrap leading-relaxed text-[11px] text-gray-300">
                  {exercise.schema_sql}
                </pre>
              </div>
            ) : (
              <div className="p-4 h-full overflow-y-auto bg-white text-gray-700 text-xs space-y-3 leading-relaxed">
                <h3 className="font-bold text-sm text-gray-900">{exercise.title}</h3>
                <p>{exercise.description}</p>
                <div className="font-bold text-gray-800">Target Concept:</div>
                <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-100">
                  Focus on correct ANSI SQL query semantics with appropriate aggregation and joins.
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="px-4 py-2 bg-white border-b border-[#E8EAF2] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunQuery}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                title="Execute Query against SQLite (Ctrl+Enter)"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run Query</span>
              </button>

              <button
                onClick={handleRunQuery}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Solution</span>
              </button>

              <button
                onClick={handleResetQuery}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset Query to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ready
              </span>
              <span>|</span>
              <span>{result ? `${result.execution_ms} ms` : '8 ms'}</span>
            </div>
          </div>

          {/* Results Output (Bottom half) */}
          <div className="flex-1 flex flex-col bg-gray-50/70 overflow-hidden">
            {/* Bottom Tabs */}
            <div className="px-4 pt-2 border-b border-[#E8EAF2] bg-white flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveBottomTab('results')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeBottomTab === 'results' ? 'border-[#E11D26] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Results
                </button>
                <button
                  onClick={() => setActiveBottomTab('testcase')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeBottomTab === 'testcase' ? 'border-[#E11D26] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Expected Target
                </button>
                <button
                  onClick={() => setActiveBottomTab('history')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeBottomTab === 'history' ? 'border-[#E11D26] text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Query History
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                  <span>Execution: <strong className="text-gray-900">{result.execution_ms} ms</strong></span>
                  <span>Rows: <strong className="text-gray-900">{result.rows_count}</strong></span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-3 text-xs">
              {isExecuting ? (
                <div className="flex items-center gap-2 text-gray-500 animate-pulse font-mono p-4">
                  <Database className="w-4 h-4 text-[#E11D26]" />
                  <span>Executing query in isolated WebAssembly worker...</span>
                </div>
              ) : activeBottomTab === 'results' ? (
                result ? (
                  result.error ? (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-xs">
                      {result.error}
                    </div>
                  ) : result.values.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 font-mono text-xs">
                      Query executed successfully. 0 rows returned.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Query executed successfully. Execution time: {result.execution_ms} ms | Rows returned: {result.rows_count}</span>
                      </div>

                      <div className="bg-white rounded-xl border border-[#E8EAF2] overflow-hidden shadow-2xs">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-700 font-bold">
                              {result.columns.map((c, i) => (
                                <th key={i} className="py-2 px-3 border-r border-gray-200 last:border-r-0">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {result.values.map((row, ri) => (
                              <tr key={ri} className="hover:bg-gray-50">
                                {row.map((val, vi) => (
                                  <td key={vi} className="py-1.5 px-3 border-r border-gray-100 last:border-r-0 text-gray-800">
                                    {String(val)}
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
                  <div className="text-gray-400 italic text-center py-8">
                    Click "Run Query" (or Ctrl+Enter) to execute your SQL against the local dataset.
                  </div>
                )
              ) : activeBottomTab === 'testcase' ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-700">Expected Query Result:</div>
                  <pre className="p-3 bg-white border border-gray-200 rounded-xl font-mono text-xs text-gray-800 overflow-x-auto">
                    {JSON.stringify(parsedExpectedOutput, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-gray-700 mb-1">Recent Execution Log:</div>
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${h.passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="font-semibold text-gray-800">{h.title}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-gray-500 text-[11px]">
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

        {/* Right: Challenge Progress & SQL Concepts (3 cols) */}
        <div className="col-span-3 bg-white p-5 overflow-y-auto space-y-5">
          {/* Progress Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span>Challenge Progress</span>
              <span className="text-gray-500 font-mono">1 / {sqlExercisesData.length}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border-4 border-[#E11D26] flex items-center justify-center font-bold text-gray-900 text-xs">
                10%
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs font-semibold text-gray-700">Completed</div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#E11D26] h-full rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* SQL Concept Chips */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-800 uppercase tracking-wider text-[11px]">SQL Concepts</div>
            <div className="flex flex-wrap gap-1.5">
              {['MAX', 'DISTINCT', 'Subqueries', 'NULL Handling', 'HAVING', 'GROUP BY', 'INNER JOIN'].map(concept => (
                <span key={concept} className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                  {concept}
                </span>
              ))}
            </div>
          </div>

          {/* Next Suggested Challenges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
              <span className="uppercase tracking-wider text-[11px]">Next Suggested</span>
              <span className="text-blue-600 text-[11px] cursor-pointer hover:underline">View All &rarr;</span>
            </div>
            <div className="space-y-1.5">
              {sqlExercisesData.slice(1, 4).map((item, idx) => (
                <div 
                  key={item.id} 
                  onClick={() => handleSelectExercise(idx + 1)}
                  className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer transition-all flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-gray-800 truncate">{item.title}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {item.difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Goal Card */}
          <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#E11D26]">
              <Award className="w-4 h-4" />
              <span>Daily Goal</span>
            </div>
            <div className="text-xs text-gray-700 font-medium">
              4 of 6 challenges completed today
            </div>
            <div className="w-full bg-red-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#E11D26] h-full rounded-full" style={{ width: '67%' }} />
            </div>
            <p className="text-[11px] text-gray-500 italic pt-1">
              Keep going! You are doing great!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
