import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink,
  X,
  ListFilter
} from 'lucide-react';
import { Question } from '@/types';
import { MonacoCodeEditor, MonacoCodeEditorHandle } from '@/components/common/MonacoCodeEditor';
import { executePythonCode, getPythonInterpreterInfo, PythonRunResult, PythonInterpreterInfo } from '@/services/runner';
import { fetchQuestions } from '@/services/db';
import { getProblemDetails } from '@/data/problemPresets';

interface PythonPracticeViewProps {
  initialProblem?: Question;
}

export const PythonPracticeView: React.FC<PythonPracticeViewProps> = ({
  initialProblem,
}) => {
  const editorRef = useRef<MonacoCodeEditorHandle>(null);

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'editorial' | 'submissions'>('description');
  const [activeBottomTab, setActiveBottomTab] = useState<'result' | 'testcase' | 'console'>('result');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<PythonRunResult | null>(null);
  const [pyInfo, setPyInfo] = useState<PythonInterpreterInfo | null>(null);

  // Load questions and interpreter info on mount
  useEffect(() => {
    async function loadData() {
      const qRes = await fetchQuestions({ limit: 1337 });
      setAllQuestions(qRes.questions);

      if (initialProblem) {
        const foundIdx = qRes.questions.findIndex(q => q.id === initialProblem.id);
        if (foundIdx >= 0) {
          setCurrentIndex(foundIdx);
        }
      }

      const info = await getPythonInterpreterInfo();
      setPyInfo(info);
    }
    loadData();
  }, [initialProblem]);

  const activeProblem: Question = allQuestions[currentIndex] || initialProblem || {
    id: 'prob-1',
    title: 'Two Sum (Two Pointers / Hash Pattern)',
    difficulty: 'Easy',
    pattern_name: 'Two Pointers - Technique',
    xp: 5,
    status: 'solved',
    order_num: 1,
    platform: 'LeetCode',
    practice_link: 'https://leetcode.com/problems/two-sum/',
  };

  const details = getProblemDetails(activeProblem);

  // Sync starter code when active question changes
  useEffect(() => {
    setCode(details.starterCode);
    editorRef.current?.setValue(details.starterCode);
    setRunResult(null);
    setSelectedCaseIdx(0);
  }, [activeProblem.id]);

  const handlePrevProblem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextProblem = () => {
    if (currentIndex < allQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelectProblem = (idx: number) => {
    setCurrentIndex(idx);
    setIsSelectorOpen(false);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setActiveBottomTab('result');
    const currentCode = editorRef.current?.getValue() || code;
    const result = await executePythonCode(currentCode, details.testCases);
    setRunResult(result);
    setIsRunning(false);
  };

  const handleReset = () => {
    setCode(details.starterCode);
    editorRef.current?.setValue(details.starterCode);
  };

  const filteredQuestions = allQuestions.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.pattern_name && q.pattern_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    String(q.order_num).includes(searchQuery)
  );

  return (
    <div className="h-full bg-[#0B1220] text-[#E6EAF5] flex flex-col overflow-hidden select-none" data-surface="dark-panel">
      {/* Top Workspace Bar with Full Navigation */}
      <div className="h-12 bg-[#0F182B] border-b border-[#1E2A44] flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-[#E11D26]" />
            <span>Python Workspace</span>
          </span>

          {/* Question Navigator */}
          <div className="flex items-center bg-[#142038] rounded-lg p-0.5 border border-[#1E2A44]">
            <button
              onClick={handlePrevProblem}
              disabled={currentIndex <= 0}
              className="px-2.5 py-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 font-bold text-xs flex items-center gap-0.5"
              title="Previous Question"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <button
              onClick={() => setIsSelectorOpen(true)}
              className="px-3 py-1 font-mono text-[11px] font-bold text-white hover:text-red-400 border-x border-[#1E2A44] flex items-center gap-1.5 transition-colors"
              title="Click to search and jump to any question"
            >
              <ListFilter className="w-3 h-3 text-[#E11D26]" />
              <span>Problem {currentIndex + 1} of {allQuestions.length || 1337}</span>
            </button>

            <button
              onClick={handleNextProblem}
              disabled={currentIndex >= (allQuestions.length - 1)}
              className="px-2.5 py-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 font-bold text-xs flex items-center gap-0.5"
              title="Next Question"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interpreter Status Badge */}
          <span className="hidden sm:flex px-2.5 py-0.5 rounded-full bg-[#142038] text-gray-300 font-mono text-[11px] border border-[#1E2A44] items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${pyInfo?.installed ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span>{pyInfo ? `${pyInfo.version.trim()} (${pyInfo.status})` : 'Detecting Interpreter...'}</span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#142038] rounded-lg transition-colors"
            title="Reset to Original Code Template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#142038] hover:bg-[#1E2A44] text-white rounded-lg font-semibold border border-[#1E2A44] transition-all disabled:opacity-50"
            title="Run Code against Test Cases (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            <span>Run Code</span>
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Solution</span>
          </button>
        </div>
      </div>

      {/* Main 2-Pane Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Problem Details & Editorial (5 cols) */}
        <div className="lg:col-span-5 border-r border-[#1E2A44] flex flex-col bg-[#0F182B] overflow-hidden">
          {/* Tabs header */}
          <div className="flex items-center border-b border-[#1E2A44] px-4 pt-2 gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === 'description' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab('editorial')}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === 'editorial' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Editorial & Hints
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === 'submissions' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Submissions
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-gray-300">
            {activeTab === 'description' && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400">Problem #{activeProblem.order_num || currentIndex + 1}</span>
                    <h2 className="text-base font-extrabold text-white tracking-tight mt-0.5">{activeProblem.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      activeProblem.difficulty === 'Easy'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : activeProblem.difficulty === 'Medium'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }`}>
                      {activeProblem.difficulty}
                    </span>
                    {activeProblem.practice_link && (
                      <a
                        href={activeProblem.practice_link}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                        title="Open on Platform"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#142038] rounded-xl border border-[#1E2A44] space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Algorithmic Pattern:</div>
                  <div className="text-white font-semibold flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#E11D26]" />
                    <span>{activeProblem.pattern_name || 'Core Problem'}</span>
                  </div>
                </div>

                <div className="text-gray-300 leading-relaxed font-sans">
                  {details.description}
                </div>

                {/* Examples */}
                <div className="space-y-3 pt-1">
                  <div className="font-bold text-white text-xs">Examples:</div>
                  {details.examples.map((ex, i) => (
                    <div key={i} className="p-3 bg-[#0B1220] rounded-xl font-mono text-[11px] text-gray-300 border border-[#1E2A44] space-y-1">
                      <div><span className="text-gray-500">Input:</span> {ex.input}</div>
                      <div><span className="text-gray-500">Output:</span> {ex.output}</div>
                      {ex.explanation && (
                        <div className="text-gray-400 font-sans text-[11px] pt-1 border-t border-[#1E2A44]/60">
                          <span className="text-gray-500 font-mono">Explanation:</span> {ex.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="pt-2">
                  <div className="font-bold text-white text-xs mb-1.5">Constraints:</div>
                  <ul className="list-disc pl-4 space-y-1 text-gray-400 text-[11px]">
                    {details.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'editorial' && (
              <div className="space-y-3 font-sans">
                <h3 className="font-bold text-white text-sm">Algorithmic Intuition & Approach:</h3>
                <p className="text-gray-300 leading-relaxed">
                  {details.editorial.approach}
                </p>
                <div className="p-3.5 bg-[#142038] rounded-xl border border-[#1E2A44] font-mono text-[11px] text-emerald-400 space-y-1">
                  <div className="font-bold text-white">Complexity Targets:</div>
                  <div>{details.editorial.complexity}</div>
                </div>
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400">Local Verified Execution Logs:</div>
                {runResult ? (
                  <div className="p-3 bg-[#142038] rounded-xl border border-[#1E2A44] flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className={`font-bold ${runResult.status === 'Accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {runResult.status}
                      </span>
                      <div className="text-[10px] text-gray-400">Latest Run</div>
                    </div>
                    <div className="text-right text-gray-300">
                      <div>{runResult.runtime_ms} ms</div>
                      <div className="text-[10px] text-gray-500">{runResult.memory_kb} KB peak</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic p-3">No submissions yet for this session.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Editor & Output (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-[#0B1220] overflow-hidden">
          {/* Editor Container (Top half) */}
          <div className="h-3/5 border-b border-[#1E2A44] relative">
            <MonacoCodeEditor
              ref={editorRef}
              value={code}
              onChange={setCode}
              language="python"
              theme="vs-dark"
              onRun={handleRun}
            />
          </div>

          {/* Results & Test Cases & Console (Bottom half) */}
          <div className="h-2/5 flex flex-col bg-[#0F182B] overflow-hidden">
            {/* Bottom Tabs */}
            <div className="flex items-center justify-between border-b border-[#1E2A44] px-4 pt-1.5 text-xs font-semibold">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveBottomTab('result')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeBottomTab === 'result' ? 'border-[#E11D26] text-white font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Test Results
                </button>
                <button
                  onClick={() => setActiveBottomTab('testcase')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeBottomTab === 'testcase' ? 'border-[#E11D26] text-white font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Test Cases ({details.testCases.length})
                </button>
                <button
                  onClick={() => setActiveBottomTab('console')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeBottomTab === 'console' ? 'border-[#E11D26] text-white font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Console Output
                </button>
              </div>

              {runResult && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400">
                  <span>Runtime: <strong className="text-white">{runResult.runtime_ms} ms</strong></span>
                  <span>Memory: <strong className="text-white">{runResult.memory_kb} KB</strong></span>
                </div>
              )}
            </div>

            {/* Bottom Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
              {isRunning ? (
                <div className="flex items-center gap-2 text-gray-400 animate-pulse">
                  <Play className="w-4 h-4 fill-current text-[#E11D26]" />
                  <span>Executing Python in restricted low-IL child process...</span>
                </div>
              ) : activeBottomTab === 'result' ? (
                runResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          runResult.status === 'Accepted' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-red-950 text-red-400 border border-red-800'
                        }`}>
                          {runResult.status}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          {runResult.test_cases_passed} / {runResult.total_test_cases} test cases passed
                        </span>
                      </div>
                    </div>

                    {/* Test Cases Pill Grid */}
                    <div className="flex items-center gap-2">
                      {runResult.test_details.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCaseIdx(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                            selectedCaseIdx === idx ? 'ring-2 ring-white/30' : ''
                          } ${
                            t.passed 
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' 
                              : 'bg-red-950/60 border-red-800 text-red-400'
                          }`}
                        >
                          <span>Case {idx + 1}</span>
                          {t.passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>

                    {/* Active Case Details */}
                    {runResult.test_details[selectedCaseIdx] && (
                      <div className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2A44] space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-gray-500">Input: </span>
                          <span className="text-gray-200">{runResult.test_details[selectedCaseIdx].input}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Expected: </span>
                          <span className="text-emerald-400">{runResult.test_details[selectedCaseIdx].expected}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual: </span>
                          <span className={runResult.test_details[selectedCaseIdx].passed ? 'text-emerald-400' : 'text-red-400'}>
                            {runResult.test_details[selectedCaseIdx].actual}
                          </span>
                        </div>
                      </div>
                    )}

                    {runResult.stderr && (
                      <pre className="p-3 bg-red-950/30 rounded-xl border border-red-800/60 text-red-300 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                        {runResult.stderr}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 italic py-4">
                    Press "Run Code" (or Ctrl+Enter) to execute your Python solution against the live worker harness.
                  </div>
                )
              ) : activeBottomTab === 'testcase' ? (
                /* Show ALL test cases */
                <div className="space-y-2.5">
                  <div className="text-gray-300 font-bold mb-2 flex items-center justify-between">
                    <span>Predefined Test Cases ({details.testCases.length}):</span>
                    <span className="text-[10px] text-gray-400 font-normal">Passed automatically to Python solve() function</span>
                  </div>
                  {details.testCases.map((tc, i) => (
                    <div key={i} className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2A44] space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-gray-400 font-bold">
                        <span>Test Case {i + 1}</span>
                        {tc.explanation && <span className="text-[10px] font-normal text-gray-500">{tc.explanation}</span>}
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold">Input: </span>
                        <span className="text-gray-200">{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 font-semibold">Expected: </span>
                        <span className="text-emerald-400">{tc.expected}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Console Output Tab */
                <div className="space-y-2">
                  <div className="text-gray-400 font-semibold mb-1">Standard I/O Streams:</div>
                  {runResult?.stdout ? (
                    <pre className="p-3 bg-[#0B1220] rounded-xl border border-[#1E2A44] text-gray-300 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                      {runResult.stdout}
                    </pre>
                  ) : runResult?.stderr ? (
                    <pre className="p-3 bg-red-950/30 rounded-xl border border-red-800/60 text-red-300 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                      {runResult.stderr}
                    </pre>
                  ) : (
                    <div className="text-gray-500 italic py-4">No output stream generated yet. Add print(...) statements to inspect variables.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Searchable Problem Selector Modal */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0F182B] text-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-[#1E2A44] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
              <div className="flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-[#E11D26]" />
                <h3 className="text-base font-extrabold tracking-tight">Select Problem ({allQuestions.length} Available)</h3>
              </div>
              <button
                onClick={() => setIsSelectorOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by title, order number, or pattern..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0B1220] border border-[#1E2A44] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#E11D26]"
                autoFocus
              />
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#1E2A44]/30">
              {filteredQuestions.slice(0, 100).map((q) => {
                const realIdx = allQuestions.findIndex(item => item.id === q.id);
                const isSelected = realIdx === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => handleSelectProblem(realIdx)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs transition-all ${
                      isSelected
                        ? 'bg-[#3D1217] text-white border border-[#E11D26]/50'
                        : 'hover:bg-[#142038] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-gray-500 w-10">#{q.order_num}</span>
                      <div>
                        <div className="font-bold text-white">{q.title}</div>
                        <div className="text-[10px] text-gray-400">{q.pattern_name || 'Core Problem'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
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
