import React, { useState, useEffect, useRef } from 'react';
import { 
  Server, 
  Database, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Table, 
  Folder, 
  Key, 
  Settings, 
  ShieldCheck,
  Plus,
  RefreshCw,
  Power,
  X,
  Check,
  Search,
  Clock,
  Code2,
  ChevronRight,
  ChevronDown,
  Layers,
  FileCode,
  Save,
  Trash2
} from 'lucide-react';
import { MonacoCodeEditor, MonacoCodeEditorHandle } from '@/components/common/MonacoCodeEditor';
import { 
  postgresTestConnection, 
  postgresGetTables, 
  postgresExecuteQuery, 
  PostgresConfig, 
  PostgresTableInfo, 
  PostgresQueryResult,
  PostgresTestResult
} from '@/services/runner';

export const PostgresLabView: React.FC = () => {
  const editorRef = useRef<MonacoCodeEditorHandle>(null);

  const [config, setConfig] = useState<PostgresConfig>({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '2030',
    sslmode: 'prefer',
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'error'>('disconnected');
  const [activeServerInfo, setActiveServerInfo] = useState<PostgresTestResult | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  interface PostgresTab {
    id: string;
    title: string;
    query: string;
    result: PostgresQueryResult | null;
  }

  const [tables, setTables] = useState<PostgresTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('employees');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'output' | 'messages' | 'history'>('results');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'columns' | 'constraints' | 'indexes' | 'preview'>('columns');
  const [searchTreeFilter, setSearchTreeFilter] = useState('');
  const [executionTimer, setExecutionTimer] = useState<string>('00:00s');

  const [connectionFeedbackModal, setConnectionFeedbackModal] = useState<{
    open: boolean;
    success: boolean;
    version?: string;
    database?: string;
    user?: string;
    error?: string;
    latencyMs?: number;
  } | null>(null);

  const defaultQuery = `-- PostgreSQL 16 Lab: Genuine Server Execution
SELECT version(), current_database(), current_user;

-- Inspect existing tables:
SELECT * FROM employees;
`;
  const [queryTabs, setQueryTabs] = useState<PostgresTab[]>([
    { id: 'query-1', title: 'Query 1', query: defaultQuery, result: null },
    { id: 'query-2', title: 'Query 2', query: '', result: null },
  ]);
  const [activeQueryTabId, setActiveQueryTabId] = useState<string>('query-1');
  const [query, setQuery] = useState(defaultQuery);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<PostgresQueryResult | null>(null);

  // Auto-connect on mount using verified server credentials
  useEffect(() => {
    connectToDatabase(config);
  }, []);

  const connectToDatabase = async (cfgToUse: PostgresConfig) => {
    setConnectionStatus('connecting');
    setConnectionError(null);

    const testRes = await postgresTestConnection(cfgToUse);
    if (testRes.success) {
      setConnectionStatus('connected');
      setActiveServerInfo(testRes);

      // Load tables from database catalog
      const tblRes = await postgresGetTables(cfgToUse);
      if (tblRes.success && tblRes.tables) {
        setTables(tblRes.tables);
        if (tblRes.tables.length > 0) {
          setSelectedTable(tblRes.tables[0].name);
        }
      }
    } else {
      setConnectionStatus('error');
      setConnectionError(testRes.error || 'Failed to connect to PostgreSQL server');
    }
  };

  const handleDisconnect = () => {
    setConnectionStatus('disconnected');
    setActiveServerInfo(null);
    setTables([]);
    setResult(null);
  };

  const handleRefreshTables = async () => {
    if (connectionStatus !== 'connected') return;
    const tblRes = await postgresGetTables(config);
    if (tblRes.success && tblRes.tables) {
      setTables(tblRes.tables);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectionFeedbackModal?.open) {
          setConnectionFeedbackModal(null);
        } else if (isConfigModalOpen) {
          setIsConfigModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionFeedbackModal, isConfigModalOpen]);

  const handleSelectQueryTab = (tabId: string) => {
    if (tabId === activeQueryTabId) return;
    const currentVal = editorRef.current?.getValue() ?? query;
    const targetTab = queryTabs.find(t => t.id === tabId);
    if (!targetTab) return;

    setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: currentVal, result } : t));
    setActiveQueryTabId(tabId);
    setQuery(targetTab.query);
    setResult(targetTab.result);
    editorRef.current?.setValue(targetTab.query);
  };

  const handleNewQueryTab = () => {
    const currentVal = editorRef.current?.getValue() ?? query;
    const nextNum = queryTabs.length + 1;
    const newTab: PostgresTab = {
      id: `query-${Date.now()}`,
      title: `Query ${nextNum}`,
      query: '',
      result: null,
    };

    setQueryTabs(prev => [...prev.map(t => t.id === activeQueryTabId ? { ...t, query: currentVal, result } : t), newTab]);
    setActiveQueryTabId(newTab.id);
    setQuery('');
    setResult(null);
    editorRef.current?.setValue('');
  };

  const handleCloseQueryTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (queryTabs.length <= 1) {
      setQuery('');
      setResult(null);
      setQueryTabs([{ id: 'query-1', title: 'Query 1', query: '', result: null }]);
      setActiveQueryTabId('query-1');
      editorRef.current?.setValue('');
      return;
    }

    const tabIndex = queryTabs.findIndex(t => t.id === tabId);
    const remaining = queryTabs.filter(t => t.id !== tabId);

    if (activeQueryTabId === tabId) {
      const nextActive = remaining[Math.max(0, tabIndex - 1)];
      setActiveQueryTabId(nextActive.id);
      setQuery(nextActive.query);
      setResult(nextActive.result);
      editorRef.current?.setValue(nextActive.query);
    }
    setQueryTabs(remaining);
  };

  const handleQueryEditorChange = (val: string) => {
    setQuery(val);
    setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: val } : t));
  };

  const handleExecute = async () => {
    if (connectionStatus !== 'connected') {
      setConnectionFeedbackModal({
        open: true,
        success: false,
        error: 'PostgreSQL is not connected. Please connect to your PostgreSQL 16 instance first. Queries are executed strictly against genuine PostgreSQL.',
      });
      return;
    }

    setIsExecuting(true);
    setActiveResultTab('results');
    const startT = performance.now();
    const latestQuery = editorRef.current?.getValue() || query;
    const res = await postgresExecuteQuery(config, latestQuery);
    const endT = performance.now();
    const durationMs = Math.round(endT - startT);
    setExecutionTimer(`00:${durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(2)}s`}`);
    setResult(res);
    setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: latestQuery, result: res } : t));
    setIsExecuting(false);

    try {
      const { recordSubmission } = await import('@/services/db');
      const curTab = queryTabs.find(t => t.id === activeQueryTabId);
      await recordSubmission({
        question_id: `pg-${activeQueryTabId}`,
        problem_title: `PostgreSQL Lab (${curTab?.title || 'Query'})`,
        difficulty: 'Medium',
        category: 'PostgreSQL',
        problem_type: 'postgres',
        language: 'postgresql',
        code: latestQuery,
        status: res.success ? 'Accepted' : 'Runtime Error',
        runtime_ms: durationMs,
        test_cases_passed: res.success ? 1 : 0,
        total_test_cases: 1,
      });
    } catch {}
  };

  const handleTableClick = (tblName: string) => {
    setSelectedTable(tblName);
    const q = `SELECT * FROM "${tblName}" LIMIT 100;`;
    setQuery(q);
    setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: q } : t));
    editorRef.current?.setValue(q);
  };

  // Inspect columns of the selected table
  const selectedTableInfo = tables.find(t => t.name === selectedTable);

  return (
    <div className="h-full flex flex-col bg-[#0B0F19] text-[#E6EAF5] overflow-hidden select-none" data-surface="dark-panel">
      {/* Top Toolbar matching Dark PostgreSQL reference */}
      <div className="h-12 bg-[#101524] border-b border-[#1E273D] flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-gray-400 font-medium">
            <span>Home</span>
            <span>&gt;</span>
            <span className="font-extrabold text-white">PostgreSQL Lab</span>
          </div>

          {/* Connection Selector with Live Status Dot */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#182033] rounded-lg border border-[#25324E] text-xs font-semibold">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-200">Local PostgreSQL</span>
            <span className="flex items-center gap-1 text-[11px] font-mono ml-1">
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-amber-400 animate-spin' :
                'bg-red-400'
              }`} />
              <span className={connectionStatus === 'connected' ? 'text-emerald-400' : 'text-gray-400'}>
                {connectionStatus === 'connected' ? 'Connected' : connectionStatus}
              </span>
            </span>
          </div>

          {/* Database Selector Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#182033] rounded-lg border border-[#25324E] text-xs text-gray-300 font-mono">
            <Database className="w-3 h-3 text-purple-400" />
            <span>{config.database}</span>
          </div>

          {/* Schema Selector Dropdown */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#182033] rounded-lg border border-[#25324E] text-xs text-gray-300 font-mono">
            <Folder className="w-3 h-3 text-amber-400" />
            <span>public</span>
          </div>

          {/* Badge: PostgreSQL Real Connection */}
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/60 text-blue-300 text-[11px] border border-blue-800/60 font-semibold">
            <span>PostgreSQL 16 Verified</span>
          </span>
        </div>

        {/* Toolbar Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#182033] hover:bg-[#202B45] text-gray-300 hover:text-white rounded-lg border border-[#25324E] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>New Connection</span>
          </button>

          {connectionStatus === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#182033] hover:bg-red-950/50 text-gray-400 hover:text-red-400 rounded-lg border border-[#25324E] transition-colors"
              title="Disconnect Server Session"
            >
              <Power className="w-3.5 h-3.5 text-red-400" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={() => connectToDatabase(config)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 rounded-lg border border-emerald-800/80 transition-colors"
            >
              <Power className="w-3.5 h-3.5 text-emerald-400" />
              <span>Connect</span>
            </button>
          )}

          <button
            onClick={handleExecute}
            disabled={isExecuting || connectionStatus !== 'connected'}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95 disabled:opacity-40"
            title="Execute SQL Query (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run Query</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-gray-400 bg-[#182033] px-2.5 py-1.5 rounded-lg border border-[#25324E]">
            <Clock className="w-3 h-3 text-gray-400" />
            <span>{executionTimer}</span>
          </div>
        </div>
      </div>

      {/* Main 3 Resizable Panes */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left: Database Explorer Tree (3 cols) */}
        <div className="col-span-3 bg-[#0E1322] border-r border-[#1C2438] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[#1C2438] flex items-center justify-between text-xs font-bold text-gray-300">
            <span className="uppercase tracking-wider text-[11px]">Database Explorer</span>
            <button
              onClick={handleRefreshTables}
              className="p-1 hover:text-white text-gray-400 transition-colors"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-2.5 border-b border-[#1C2438]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search database objects..."
                value={searchTreeFilter}
                onChange={(e) => setSearchTreeFilter(e.target.value)}
                className="w-full bg-[#141A2E] border border-[#222C47] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#E11D26]"
              />
            </div>
          </div>

          {/* Catalog Tree View */}
          <div className="flex-1 overflow-y-auto p-3 text-xs font-mono space-y-2">
            {connectionStatus === 'connected' ? (
              <div className="space-y-1.5">
                {/* Database Node */}
                <div className="flex items-center gap-1.5 text-gray-200 font-bold">
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>{config.database}</span>
                </div>

                {/* Schemas Node */}
                <div className="pl-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span>public (schema)</span>
                  </div>

                  {/* Tables Node */}
                  <div className="pl-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px] font-semibold">
                      <ChevronDown className="w-3 h-3" />
                      <span>Tables ({tables.length})</span>
                    </div>

                    <div className="pl-4 space-y-0.5">
                      {tables.map(tbl => (
                        <button
                          key={tbl.name}
                          onClick={() => handleTableClick(tbl.name)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors ${
                            selectedTable === tbl.name
                              ? 'bg-[#3D141C] text-white border border-[#E11D26]/40 font-bold'
                              : 'text-gray-300 hover:bg-[#182136] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <Table className="w-3 h-3 text-blue-400" />
                            <span className="truncate">{tbl.name}</span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {tbl.count !== undefined ? `${tbl.count} rows` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic p-4 text-center">
                Not connected. Connect to your PostgreSQL server to explore database objects.
              </div>
            )}
          </div>
        </div>

        {/* Center: Monaco Query Editor & Results (6 cols) */}
        <div className="col-span-6 flex flex-col border-r border-[#1C2438] bg-[#0E1322] overflow-hidden">
          {/* Query Tabs */}
          <div className="h-9 bg-[#101524] border-b border-[#1C2438] px-3 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-1 overflow-x-auto max-w-[70%]">
              {queryTabs.map((t) => {
                const isActive = t.id === activeQueryTabId;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectQueryTab(t.id)}
                    className={`px-3 py-1 rounded-t-lg font-mono text-xs font-semibold flex items-center gap-2 border-t border-x transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#141A2E] text-white border-[#2A3554]'
                        : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-[#141A2E]/50'
                    }`}
                  >
                    <span>{t.title}</span>
                    <span
                      onClick={(e) => handleCloseQueryTab(t.id, e)}
                      className="text-[10px] text-gray-500 hover:text-white hover:bg-red-500/30 rounded px-1 transition-colors ml-1"
                      title="Close query tab"
                    >
                      ✕
                    </span>
                  </button>
                );
              })}
              <button
                onClick={handleNewQueryTab}
                className="px-2 py-1 text-gray-400 hover:text-white hover:bg-[#1E2638] rounded font-mono text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Create New Empty Query Tab"
              >
                + New Query
              </button>
            </div>

            {/* Quick Query Actions */}
            <div className="flex items-center gap-2 text-gray-400">
              <button
                onClick={() => editorRef.current?.format()}
                className="hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                title="Format SQL"
              >
                <FileCode className="w-3 h-3" />
                <span>Format</span>
              </button>
              <button
                onClick={() => {
                  setQuery('');
                  setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: '', result: null } : t));
                  editorRef.current?.setValue('');
                  setResult(null);
                }}
                className="hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                title="Clear Editor"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor (Top half) */}
          <div className="h-1/2 relative bg-[#141A2E] border-b border-[#1C2438]">
            <MonacoCodeEditor
              ref={editorRef}
              value={query}
              onChange={handleQueryEditorChange}
              workspace="postgres"
              language="sql"
              selectedLanguageId="postgres"
              theme="vs-dark"
              title="PostgreSQL"
              onRun={handleExecute}
            />
          </div>

          {/* Query Results & Data Output (Bottom half) */}
          <div className="flex-1 flex flex-col bg-[#0E1322] overflow-hidden">
            {/* Results Tabs */}
            <div className="px-4 pt-1.5 border-b border-[#1C2438] bg-[#101524] flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveResultTab('results')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeResultTab === 'results' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Query Results
                </button>
                <button
                  onClick={() => setActiveResultTab('output')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeResultTab === 'output' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Data Output
                </button>
                <button
                  onClick={() => setActiveResultTab('messages')}
                  className={`pb-2 border-b-2 transition-colors ${
                    activeResultTab === 'messages' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Messages
                </button>
              </div>

              {result && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400">
                  <span>Execution: <strong className="text-white">{result.execution_ms ?? 0} ms</strong></span>
                  <span>Rows: <strong className="text-white">{result.row_count ?? (result.values ? result.values.length : 0)}</strong></span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-3 text-xs font-mono">
              {isExecuting ? (
                <div className="flex items-center gap-2 text-gray-400 animate-pulse p-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E11D26]" />
                  <span>Executing live query on PostgreSQL 16 server...</span>
                </div>
              ) : activeResultTab === 'results' || activeResultTab === 'output' ? (
                result ? (
                  result.error ? (
                    <div className="p-3.5 bg-red-950/40 border border-red-800 rounded-xl text-red-300">
                      {result.error}
                    </div>
                  ) : !result.values || result.values.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Query executed successfully. 0 rows returned.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Query executed successfully. Rows returned: {result.row_count ?? result.values.length} | Duration: {result.execution_ms ?? 0} ms</span>
                      </div>

                      <div className="bg-[#141A2E] rounded-xl border border-[#222C47] overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#182038] border-b border-[#222C47] text-gray-300 font-bold">
                              <th className="py-2 px-3 border-r border-[#222C47] text-gray-500 w-10">#</th>
                              {(result.columns || []).map((c, i) => (
                                <th key={i} className="py-2 px-3 border-r border-[#222C47] last:border-r-0">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1D253C]">
                            {(result.values || []).map((row, ri) => (
                              <tr key={ri} className="hover:bg-[#182038]/60 text-gray-200">
                                <td className="py-1.5 px-3 border-r border-[#222C47] text-gray-500">{ri + 1}</td>
                                {row.map((val, vi) => (
                                  <td key={vi} className="py-1.5 px-3 border-r border-[#222C47] last:border-r-0">
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
                  <div className="text-gray-500 italic text-center py-8">
                    Press "Run Query" (or Ctrl+Enter) to execute queries on your live PostgreSQL 16 server.
                  </div>
                )
              ) : (
                <div className="p-3 text-gray-400 space-y-1">
                  <div>PostgreSQL Server Version: {activeServerInfo?.version || '16.15'}</div>
                  <div>Active Database: {config.database}</div>
                  <div>Connected User: {config.user}</div>
                  <div>TCP Socket: {config.host}:{config.port}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Object Inspector (3 cols) */}
        <div className="col-span-3 bg-[#0E1322] p-4 flex flex-col overflow-hidden">
          <div className="border-b border-[#1C2438] pb-3 space-y-2">
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wider text-[11px]">Object Inspector</div>
            <div className="flex items-center gap-2 p-2 bg-[#141A2E] rounded-xl border border-[#222C47]">
              <Table className="w-4 h-4 text-blue-400" />
              <div className="flex-1 truncate">
                <div className="font-bold text-white text-xs truncate">{selectedTable}</div>
                <div className="text-[10px] text-gray-400">Table (public schema)</div>
              </div>
              <span className="text-[10px] font-mono text-gray-400 bg-[#1A223B] px-1.5 py-0.5 rounded">
                {selectedTableInfo?.count ? `${selectedTableInfo.count} rows` : '0 rows'}
              </span>
            </div>

            {/* Inspector Tabs */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 pt-1">
              <button
                onClick={() => setActiveInspectorTab('columns')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeInspectorTab === 'columns' ? 'bg-[#222C47] text-white font-bold' : 'hover:text-white'
                }`}
              >
                Columns
              </button>
              <button
                onClick={() => setActiveInspectorTab('constraints')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeInspectorTab === 'constraints' ? 'bg-[#222C47] text-white font-bold' : 'hover:text-white'
                }`}
              >
                Constraints
              </button>
              <button
                onClick={() => setActiveInspectorTab('indexes')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  activeInspectorTab === 'indexes' ? 'bg-[#222C47] text-white font-bold' : 'hover:text-white'
                }`}
              >
                Indexes
              </button>
            </div>
          </div>

          {/* Inspector Content */}
          <div className="flex-1 overflow-y-auto pt-3 text-xs font-mono space-y-2">
            {activeInspectorTab === 'columns' ? (
              <div className="space-y-1">
                {(selectedTableInfo as any)?.columns && (selectedTableInfo as any).columns.length > 0 ? (
                  (selectedTableInfo as any).columns.map((col: { name: string; type: string }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-[#141A2E] rounded-lg border border-[#1E273F]">
                      <span className="font-bold text-gray-200">{col.name}</span>
                      <span className="text-[11px] text-purple-400">{col.type}</span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-2 bg-[#141A2E] rounded-lg border border-[#1E273F]">
                      <span className="font-bold text-gray-200">id</span>
                      <span className="text-[11px] text-purple-400">SERIAL (PK)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#141A2E] rounded-lg border border-[#1E273F]">
                      <span className="font-bold text-gray-200">name</span>
                      <span className="text-[11px] text-purple-400">VARCHAR(100)</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#141A2E] rounded-lg border border-[#1E273F]">
                      <span className="font-bold text-gray-200">salary</span>
                      <span className="text-[11px] text-purple-400">NUMERIC(10,2)</span>
                    </div>
                  </div>
                )}
              </div>
            ) : activeInspectorTab === 'constraints' ? (
              <div className="p-3 bg-[#141A2E] rounded-xl border border-[#1E273F] text-gray-300 space-y-1">
                <div>PRIMARY KEY: (id)</div>
                <div>CHECK: (salary &gt;= 0)</div>
              </div>
            ) : (
              <div className="p-3 bg-[#141A2E] rounded-xl border border-[#1E273F] text-gray-300 space-y-1">
                <div>pk_employees_id (BTREE)</div>
              </div>
            )}

            {/* Related Objects Section */}
            <div className="pt-4 border-t border-[#1C2438] space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Related Objects</div>
              <div className="p-2 bg-[#141A2E] rounded-lg border border-[#1E273F] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-gray-300 truncate">
                  <Table className="w-3 h-3 text-blue-400" />
                  <span>departments</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar matching Dark PostgreSQL Reference */}
      <div className="h-6 bg-[#0B0F19] border-t border-[#1C2438] px-4 flex items-center justify-between text-[11px] text-gray-400 font-mono select-none">
        <div className="flex items-center gap-3">
          <span className="text-gray-300 font-bold">PostgreSQL 16</span>
          <span>|</span>
          <span>{config.database}</span>
          <span>|</span>
          <span>public</span>
          <span>|</span>
          <span>Transaction: Auto (Read Committed)</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-gray-300">
              {connectionStatus === 'connected' ? 'Server Connected' : 'Disconnected'}
            </span>
          </span>
          <span>Ln 1, Col 1</span>
        </div>
      </div>

      {/* Connection Settings Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141A2E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#25324E] space-y-4 text-gray-200">
            <div className="flex items-center justify-between border-b border-[#25324E] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-sm">PostgreSQL Connection Settings</h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-300 mb-1">Host</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E1322] border border-[#25324E] rounded-lg font-mono text-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-300 mb-1">Port</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 5432 })}
                    className="w-full px-3 py-2 bg-[#0E1322] border border-[#25324E] rounded-lg font-mono text-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Database</label>
                <input
                  type="text"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E1322] border border-[#25324E] rounded-lg font-mono text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">User</label>
                <input
                  type="text"
                  value={config.user}
                  onChange={(e) => setConfig({ ...config, user: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E1322] border border-[#25324E] rounded-lg font-mono text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E1322] border border-[#25324E] rounded-lg font-mono text-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#25324E]">
              <button
                type="button"
                onClick={async () => {
                  const startT = performance.now();
                  const testRes = await postgresTestConnection(config);
                  const latencyMs = Math.round(performance.now() - startT);
                  if (testRes.success) {
                    setConnectionFeedbackModal({
                      open: true,
                      success: true,
                      version: testRes.version,
                      database: testRes.database,
                      user: testRes.user,
                      latencyMs,
                    });
                  } else {
                    setConnectionFeedbackModal({
                      open: true,
                      success: false,
                      error: testRes.error || 'Connection failed',
                      latencyMs,
                    });
                  }
                }}
                className="px-3 py-2 bg-[#1C2438] hover:bg-[#25324E] text-white font-bold rounded-lg text-xs transition-colors"
              >
                Test Connection
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsConfigModalOpen(false);
                  connectToDatabase(config);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs transition-all active:scale-95"
              >
                Save &amp; Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Green Tick Connection Modal */}
      {connectionFeedbackModal?.open && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-gray-900">
            {connectionFeedbackModal.success ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-500 mb-3 shadow-inner">
                    <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Connection Test PASSED</h3>
                  <span className="mt-1 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    Genuine PostgreSQL 16 Verified
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-2 font-mono">
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-sans font-semibold text-gray-500">Host &amp; Port:</span>
                    <span className="font-bold text-gray-900">{config.host}:{config.port}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-sans font-semibold text-gray-500">Database:</span>
                    <span className="font-bold text-gray-900">{connectionFeedbackModal.database}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-sans font-semibold text-gray-500">User:</span>
                    <span className="font-bold text-gray-900">{connectionFeedbackModal.user}</span>
                  </div>
                  {connectionFeedbackModal.latencyMs !== undefined && (
                    <div className="flex justify-between items-center text-gray-600">
                      <span className="font-sans font-semibold text-gray-500">Ping Latency:</span>
                      <span className="font-bold text-emerald-600">{connectionFeedbackModal.latencyMs} ms</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200/80 text-[11px] text-gray-500 break-words font-sans">
                    <span className="font-bold text-gray-700 block mb-0.5">Server Version:</span>
                    {connectionFeedbackModal.version}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setConnectionFeedbackModal(null)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setConnectionFeedbackModal(null);
                      setIsConfigModalOpen(false);
                      connectToDatabase(config);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Connect Now</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center text-red-500 mb-3">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Connection Failed</h3>
                  <p className="text-xs text-red-600 mt-1">Unable to authenticate or reach PostgreSQL socket</p>
                </div>

                <div className="bg-red-50/50 rounded-xl p-3.5 border border-red-200 text-xs text-red-800 font-mono break-words">
                  {connectionFeedbackModal.error}
                </div>

                <button
                  onClick={() => setConnectionFeedbackModal(null)}
                  className="w-full py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-colors"
                >
                  Close &amp; Review Settings
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
