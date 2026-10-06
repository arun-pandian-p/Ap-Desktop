import React, { useState, useRef } from 'react';
import { 
  Play, 
  RotateCcw, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  Table
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
    // Always read latest query from editorRef
    const latestQuery = editorRef.current?.getValue() || query;
    const res = await executeSqlQuery(latestQuery, exercise.id);
    setResult(res);
    setIsExecuting(false);
  };

  const handleResetQuery = () => {
    resetExerciseSqlDb(exercise.id);
    const initialQ = exercise.initial_query || '';
    setQuery(initialQ);
    editorRef.current?.setValue(initialQ);
    setResult(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F8FC] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-12 bg-white border-b border-[#E8EAF2] flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-gray-900 text-sm">SQL Practice Workspace</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            SQLite Engine (WebAssembly Isolated)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Exercise Navigator */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              onClick={() => handleSelectExercise(selectedExerciseIndex - 1)}
              disabled={selectedExerciseIndex <= 0}
              className="px-2 py-1 text-gray-700 hover:text-black disabled:opacity-30 disabled:hover:text-gray-700 font-bold text-xs"
              title="Previous SQL Exercise"
            >
              ← Prev
            </button>
            <span className="px-2 font-mono text-[11px] font-bold text-gray-600 border-x border-gray-200">
              {selectedExerciseIndex + 1} / {sqlExercisesData.length}
            </span>
            <button
              onClick={() => handleSelectExercise(selectedExerciseIndex + 1)}
              disabled={selectedExerciseIndex >= sqlExercisesData.length - 1}
              className="px-2 py-1 text-gray-700 hover:text-black disabled:opacity-30 disabled:hover:text-gray-700 font-bold text-xs"
              title="Next SQL Exercise"
            >
              Next →
            </button>
          </div>

          <button
            onClick={handleResetQuery}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset Query and Table Seeds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRunQuery}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Execute Query (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run Query</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Split */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left: Challenge Explorer (Dark Surface) (3 cols) */}
        <div className="col-span-3 bg-[#0B1220] border-r border-[#1E2A44] text-[#E6EAF5] flex flex-col overflow-hidden" data-surface="dark-panel">
          <div className="p-3 border-b border-[#1E2A44]">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Curated Challenges</div>
            <div className="space-y-1">
              {sqlExercisesData.map((ex, idx) => {
                const isSelected = idx === selectedExerciseIndex;
                return (
                  <button
                    key={ex.id}
                    onClick={() => handleSelectExercise(idx)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#3D1217] text-white border border-[#E11D26]/40 shadow-xs'
                        : 'text-gray-400 hover:bg-[#0F182B] hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-200 truncate">{ex.title}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        ex.difficulty === 'Easy' ? 'bg-emerald-950 text-emerald-400' :
                        ex.difficulty === 'Medium' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'
                      }`}>
                        {ex.difficulty}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500">{ex.category}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-2 text-xs font-mono">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Challenge Schema:</div>
            <pre className="p-2.5 bg-[#0F182B] rounded-lg border border-[#1E2A44] text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed">
              {exercise.schema_sql}
            </pre>
          </div>
        </div>

        {/* Center: Editor & Results (6 cols) */}
        <div className="col-span-6 flex flex-col border-r border-[#E8EAF2] bg-white overflow-hidden">
          {/* Challenge Description */}
          <div className="p-4 border-b border-[#E8EAF2] bg-[#F7F8FC]/50">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-gray-900">{exercise.title}</h2>
              <span className="text-[11px] font-semibold text-gray-500">{exercise.category}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{exercise.description}</p>
          </div>

          {/* Editor Container */}
          <div className="h-1/2 border-b border-[#E8EAF2] relative">
            <MonacoCodeEditor
              ref={editorRef}
              value={query}
              onChange={setQuery}
              language="sql"
              theme="vs-light"
              onRun={handleRunQuery}
            />
          </div>

          {/* Results Output */}
          <div className="h-1/2 flex flex-col bg-gray-50/70 overflow-hidden">
            <div className="px-4 py-2 border-b border-[#E8EAF2] bg-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-700">Query Output</span>
                {result && result.passed && !result.error && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Expected Output Matched
                  </span>
                )}
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
                <div className="flex items-center gap-2 text-gray-500 animate-pulse font-mono">
                  <Database className="w-4 h-4 text-[#E11D26]" />
                  <span>Executing query on SQLite practice database...</span>
                </div>
              ) : result ? (
                result.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-xs">
                    {result.error}
                  </div>
                ) : result.values.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 font-mono text-xs">
                    Query executed successfully. 0 rows returned.
                  </div>
                ) : (
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
                )
              ) : (
                <div className="text-gray-400 italic text-center py-8">
                  Click "Run Query" (or Ctrl+Enter) to execute your SQL against the local dataset.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Progress & Tips (3 cols) */}
        <div className="col-span-3 bg-white p-5 overflow-y-auto space-y-4">
          <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
            <div className="text-xs font-bold text-[#E11D26] uppercase tracking-wider mb-1">SQL Concept Tip</div>
            <p className="text-xs text-gray-600 leading-relaxed">
              When filtering aggregated rows, always use <code>HAVING</code> after <code>GROUP BY</code>, whereas <code>WHERE</code> filters before aggregation.
            </p>
          </div>

          {/* Expected Output Test Case */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
              <span>Expected Test Target:</span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                {exercise.expected_output_json ? `${JSON.parse(exercise.expected_output_json).length} rows required` : 'Target Output'}
              </span>
            </div>
            {exercise.expected_output_json && (
              <div className="bg-white p-2 rounded-lg border border-gray-200 overflow-x-auto text-[10px] font-mono text-gray-700 max-h-48 overflow-y-auto">
                <pre>{JSON.stringify(JSON.parse(exercise.expected_output_json), null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
