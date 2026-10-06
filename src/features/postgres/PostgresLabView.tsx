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
  Check
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
  const [tables, setTables] = useState<PostgresTableInfo[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [connectionFeedbackModal, setConnectionFeedbackModal] = useState<{
    open: boolean;
    success: boolean;
    version?: string;
    database?: string;
    user?: string;
    error?: string;
    latencyMs?: number;
  } | null>(null);

  const defaultQuery = '-- PostgreSQL 16 Lab: Genuine Server Execution\nSELECT version(), current_database(), current_user;\n\n-- Inspect existing tables:\nSELECT * FROM employees;\n';
  const [query, setQuery] = useState(defaultQuery);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<PostgresQueryResult | null>(null);

  // Auto-connect on mount using verified credentials
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

      // Load tables from database
      const tblRes = await postgresGetTables(cfgToUse);
      if (tblRes.success && tblRes.tables) {
        setTables(tblRes.tables);
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
    const latestQuery = editorRef.current?.getValue() || query;
    const res = await postgresExecuteQuery(config, latestQuery);
    setResult(res);
    setIsExecuting(false);
  };

  const handleTableClick = (tblName: string) => {
    const q = `SELECT * FROM "${tblName}" LIMIT 100;`;
    setQuery(q);
    editorRef.current?.setValue(q);
  };

  return (
    <div className="h-full flex flex-col bg-[#F7F8FC] overflow-hidden select-none">
      {/* Top Connection Bar */}
      <div className="h-12 bg-white border-b border-[#E8EAF2] flex items-center justify-between px-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-gray-900 text-sm">PostgreSQL Lab</span>
          </div>

          {/* Genuine Connection Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all">
            {connectionStatus === 'connected' ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected: postgresql://{config.user}@{config.host}:{config.port}/{config.database}</span>
              </span>
            ) : connectionStatus === 'connecting' ? (
              <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border-amber-200">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span>Connecting to PostgreSQL Server 16...</span>
              </span>
            ) : connectionStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-red-700 bg-red-50 border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Connection Error</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-600 bg-gray-50 border-gray-200">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Disconnected</span>
              </span>
            )}
          </div>

          {activeServerInfo?.version && (
            <span className="text-[11px] text-gray-500 font-mono hidden md:inline truncate max-w-xs">
              {activeServerInfo.version.split(',')[0]}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Settings */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#F1F3F9] hover:bg-[#E9ECF5] text-gray-700 rounded-lg font-semibold border border-[#E8EAF2] transition-colors"
            title="Configure Connection Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Connection</span>
          </button>

          {/* Connect / Disconnect */}
          {connectionStatus === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-lg font-semibold border border-gray-200 transition-colors"
              title="Disconnect from Server"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={() => connectToDatabase(config)}
              disabled={connectionStatus === 'connecting'}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}

          <button
            onClick={handleExecute}
            disabled={isExecuting || connectionStatus !== 'connected'}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Execute Query on PostgreSQL (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Execute SQL</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Left Database Explorer (3 cols) */}
        <div className="col-span-3 bg-[#0B1220] border-r border-[#1E2A44] text-[#E6EAF5] p-3 flex flex-col overflow-hidden" data-surface="dark-panel">
          <div className="flex items-center justify-between mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>Database Explorer</span>
            <button
              onClick={handleRefreshTables}
              disabled={connectionStatus !== 'connected'}
              className="p-1 hover:text-white text-gray-400 rounded transition-colors disabled:opacity-30"
              title="Refresh Tables"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 text-xs font-mono flex-1 overflow-y-auto">
            <div className="p-2 rounded-lg bg-[#142038] text-white flex items-center justify-between font-bold border border-[#1E2A44]">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span>{config.database}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-normal">{config.host}:{config.port}</span>
            </div>

            <div className="pl-3 space-y-1 pt-2">
              <div className="flex items-center gap-2 text-gray-400 font-semibold">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>public (schema)</span>
              </div>

              <div className="pl-3 space-y-1 pt-1">
                {connectionStatus === 'connected' ? (
                  tables.length > 0 ? (
                    tables.map((tbl, i) => (
                      <button
                        key={i}
                        onClick={() => handleTableClick(tbl.name)}
                        className="w-full text-left p-1.5 rounded-md hover:bg-[#142038] text-gray-300 hover:text-white flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Table className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400" />
                          <span className="truncate">{tbl.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">{tbl.count}</span>
                      </button>
                    ))
                  ) : (
                    <div className="text-gray-500 italic p-2 text-[11px]">No tables in public schema</div>
                  )
                ) : (
                  <div className="text-gray-500 italic p-2 text-[11px]">Connect to load tables</div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1E2A44] text-[11px] text-gray-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Genuine Server Protocol</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-normal">
              PostgreSQL Lab executes directly against your local/remote server via TCP port 5432.
            </p>
          </div>
        </div>

        {/* Center: Editor & Results (9 cols) */}
        <div className="col-span-9 flex flex-col bg-white overflow-hidden">
          {connectionError && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-mono text-[11px]">{connectionError}</span>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px]"
              >
                Configure Credentials
              </button>
            </div>
          )}

          {/* Monaco Editor (Top Half) */}
          <div className="h-1/2 border-b border-[#E8EAF2] relative">
            <MonacoCodeEditor
              ref={editorRef}
              value={query}
              onChange={setQuery}
              language="sql"
              theme="vs-dark"
              onRun={handleExecute}
            />
          </div>

          {/* Query Output / Results (Bottom Half) */}
          <div className="h-1/2 flex flex-col bg-gray-50/70 overflow-hidden">
            <div className="px-4 py-2 border-b border-[#E8EAF2] bg-white flex items-center justify-between text-xs">
              <div className="font-bold text-gray-700">PostgreSQL Query Result</div>
              {result && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                  <span>Duration: <strong className="text-gray-900">{result.execution_ms} ms</strong></span>
                  <span>Rows: <strong className="text-gray-900">{result.row_count}</strong></span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-3 text-xs">
              {isExecuting ? (
                <div className="flex items-center gap-2 text-gray-500 animate-pulse font-mono">
                  <Server className="w-4 h-4 text-[#E11D26]" />
                  <span>Executing query on PostgreSQL Server 16...</span>
                </div>
              ) : result ? (
                result.error ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-mono text-xs whitespace-pre-wrap">
                    {result.error}
                  </div>
                ) : result.columns && result.columns.length > 0 ? (
                  <div className="bg-white rounded-xl border border-[#E8EAF2] overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-gray-100/75 border-b border-gray-200 text-gray-700 font-bold">
                          {result.columns.map((col, idx) => (
                            <th key={idx} className="py-2 px-3 border-r border-gray-200 last:border-r-0">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.values?.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-gray-50">
                            {row.map((val, vIdx) => (
                              <td key={vIdx} className="py-1.5 px-3 border-r border-gray-100 last:border-r-0 text-gray-800">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 font-mono text-xs">
                    Query completed successfully with 0 returned rows.
                  </div>
                )
              ) : (
                <div className="text-gray-400 italic text-center py-8">
                  {connectionStatus === 'connected' 
                    ? 'Press "Execute SQL" (or Ctrl+Enter) to run queries on your live PostgreSQL 16 instance.'
                    : 'Connect to PostgreSQL server above to execute queries.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connection Settings Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-gray-900 text-sm">PostgreSQL Connection Settings</h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Port</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 5432 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Database</label>
                <input
                  type="text"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={config.user}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <button
                type="button"
                onClick={async () => {
                  const t0 = performance.now();
                  const testRes = await postgresTestConnection(config);
                  const latencyMs = Math.round(performance.now() - t0);
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
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-xs transition-colors"
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
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redesigned Green Tick Connection Modal */}
      {connectionFeedbackModal?.open && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
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
                    <span className="font-sans font-semibold text-gray-500">Host & Port:</span>
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
                  Close & Review Settings
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
