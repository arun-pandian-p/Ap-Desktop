import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Edit3,
  Globe,
  Radio,
  Share2,
  Box,
  Binary,
  Users,
  HardDrive
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

  const [config, setConfig] = useState<PostgresConfig>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ap_postgres_config') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          host: parsed.host || 'localhost',
          port: parsed.port || 5432,
          database: parsed.database || 'postgres',
          user: parsed.user || 'postgres',
          password: parsed.password || '2030',
          sslmode: parsed.sslmode || 'prefer',
        };
      }
    } catch {}
    return {
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '2030',
      sslmode: 'prefer',
    };
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
  
  // Tree expansion states (pgAdmin hierarchy)
  const [isServersExpanded, setIsServersExpanded] = useState(true);
  const [isPgServerExpanded, setIsPgServerExpanded] = useState(true);
  const [isDatabasesExpanded, setIsDatabasesExpanded] = useState(true);
  const [isDbExpanded, setIsDbExpanded] = useState(true);
  const [isSchemaExpanded, setIsSchemaExpanded] = useState(true);
  const [isTablesExpanded, setIsTablesExpanded] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  // Inline table edit state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colIndex: number; colName: string; value: string } | null>(null);
  const [editSuccessToast, setEditSuccessToast] = useState<string | null>(null);

  // Upload Dataset Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadTableName, setUploadTableName] = useState('');
  const [uploadPreviewData, setUploadPreviewData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const toggleTableExpand = (tblName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTables(prev => ({ ...prev, [tblName]: !prev[tblName] }));
  };

  const filteredTables = useMemo(() => {
    if (!searchTreeFilter.trim()) return tables;
    const term = searchTreeFilter.toLowerCase();
    return tables.filter(t => t.name.toLowerCase().includes(term));
  }, [tables, searchTreeFilter]);
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
    try {
      localStorage.setItem('ap_postgres_config', JSON.stringify(cfgToUse));
    } catch {}

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

  // 1. Export Results to CSV
  const handleExportCsv = () => {
    if (!result || !result.columns || !result.values || result.values.length === 0) return;
    const headerLine = result.columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    const rowLines = result.values.map(row => 
      row.map(val => `"${String(val === null || val === undefined ? '' : val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable || 'query_results'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Export Results to XLSX (Compatible Spreadsheet XML)
  const handleExportXlsx = () => {
    if (!result || !result.columns || !result.values || result.values.length === 0) return;
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="PostgreSQL Results">
  <Table>
   <Row>
    ${result.columns.map(c => `<Cell><Data ss:Type="String">${String(c).replace(/[<>&]/g, '')}</Data></Cell>`).join('')}
   </Row>
   ${result.values.map(row => `
   <Row>
    ${row.map(val => `<Cell><Data ss:Type="String">${String(val ?? '').replace(/[<>&]/g, '')}</Data></Cell>`).join('')}
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable || 'query_results'}_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Save Inline Cell Edit and execute UPDATE statement
  const handleSaveCellEdit = async () => {
    if (!editingCell || !result || !result.columns || !result.values) return;
    const { rowIndex, colIndex, colName, value: newVal } = editingCell;
    const row = result.values[rowIndex];
    if (!row) return;

    // Determine primary key column or first column for matching
    const pkColName = result.columns[0] || 'id';
    const pkVal = row[0];

    // Optimistically update local UI state
    const updatedValues = result.values.map((r, rIdx) => {
      if (rIdx === rowIndex) {
        const copy = [...r];
        copy[colIndex] = newVal;
        return copy;
      }
      return r;
    });

    setResult({ ...result, values: updatedValues });
    setEditingCell(null);

    // Formulate and execute genuine PostgreSQL UPDATE
    const tbl = selectedTable || 'employees';
    const updateQuery = typeof pkVal === 'number'
      ? `UPDATE "${tbl}" SET "${colName}" = '${String(newVal).replace(/'/g, "''")}' WHERE "${pkColName}" = ${pkVal};`
      : `UPDATE "${tbl}" SET "${colName}" = '${String(newVal).replace(/'/g, "''")}' WHERE "${pkColName}" = '${String(pkVal).replace(/'/g, "''")}';`;

    const updateRes = await postgresExecuteQuery(config, updateQuery);
    if (updateRes.success) {
      setEditSuccessToast(`✓ Updated row (${pkColName}=${pkVal}): "${colName}" = "${newVal}"`);
      setTimeout(() => setEditSuccessToast(null), 3000);
    }
  };

  // 4. Handle Upload File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    setUploadTableName(baseName || 'imported_dataset');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
          const rows = lines.slice(1, 6).map(l => l.split(',').map(c => c.trim().replace(/^["']|["']$/g, '')));
          setUploadPreviewData({ headers, rows });
        }
      } else if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const headers = Object.keys(parsed[0]);
            const rows = parsed.slice(0, 5).map(item => headers.map(k => String(item[k] ?? '')));
            setUploadPreviewData({ headers, rows });
          }
        } catch {}
      } else {
        // Fallback generic SQL or text
        setUploadPreviewData({ headers: ['raw_sql'], rows: [[content.slice(0, 80) + '...']] });
      }
    };
    reader.readAsText(file);
  };

  // 5. Execute Dataset Upload / Table Placement
  const handleExecuteDatasetUpload = async () => {
    if (!uploadTableName.trim() || !uploadPreviewData) return;
    setIsUploading(true);
    setUploadMessage(null);

    const tblName = uploadTableName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    const cols = uploadPreviewData.headers.map(h => `"${h.replace(/[^a-zA-Z0-9_]/g, '_')}" TEXT`).join(', ');
    const createTableSql = `CREATE TABLE IF NOT EXISTS "${tblName}" (id SERIAL PRIMARY KEY, ${cols});`;

    // Create table
    await postgresExecuteQuery(config, createTableSql);

    // Insert preview rows
    for (const row of uploadPreviewData.rows) {
      const colNames = uploadPreviewData.headers.map(h => `"${h.replace(/[^a-zA-Z0-9_]/g, '_')}"`).join(', ');
      const values = row.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ');
      await postgresExecuteQuery(config, `INSERT INTO "${tblName}" (${colNames}) VALUES (${values});`);
    }

    setIsUploading(false);
    setIsUploadModalOpen(false);
    setUploadPreviewData(null);
    setUploadFileName('');

    // Refresh table list
    await handleRefreshTables();
    handleTableClick(tblName);
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

          {/* Catalog Tree View matching pgAdmin reference */}
          <div className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-1">
            {/* Servers (1) Root Node */}
            <div className="space-y-1">
              <div 
                onClick={() => setIsServersExpanded(prev => !prev)}
                className="flex items-center gap-1.5 text-gray-200 font-bold hover:text-white cursor-pointer py-1 px-1.5 rounded hover:bg-[#182033] transition-colors select-none text-xs"
              >
                {isServersExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                <Server className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span>Servers (1)</span>
              </div>

              {isServersExpanded && (
                <div className="pl-3.5 space-y-1 border-l border-[#1C2438] ml-2">
                  {/* PostgreSQL 16 Server Node */}
                  <div 
                    onClick={() => setIsPgServerExpanded(prev => !prev)}
                    className="flex items-center gap-1.5 text-blue-300 font-semibold hover:text-white cursor-pointer py-1 px-1.5 rounded hover:bg-[#182033] transition-colors select-none"
                  >
                    {isPgServerExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>PostgreSQL 16</span>
                  </div>

                  {isPgServerExpanded && (
                    <div className="pl-3.5 space-y-1 border-l border-[#1C2438] ml-2">
                      {/* Databases (3) Node */}
                      <div 
                        onClick={() => setIsDatabasesExpanded(prev => !prev)}
                        className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-1 px-1.5 rounded hover:bg-[#182033] transition-colors select-none font-medium"
                      >
                        <div className="flex items-center gap-1.5">
                          {isDatabasesExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Databases (3)</span>
                        </div>
                      </div>

                      {isDatabasesExpanded && (
                        <div className="pl-3.5 space-y-1 border-l border-[#1C2438] ml-2">
                          {/* Test (Disconnected) */}
                          <div className="flex items-center gap-1.5 text-gray-400 py-0.5 px-1.5 rounded opacity-70">
                            <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                            <Database className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="line-through text-red-400/80">Test</span>
                            <X className="w-2.5 h-2.5 text-red-400 ml-auto" />
                          </div>

                          {/* postgres (Connected / Active Database) */}
                          <div className="space-y-1">
                            <div 
                              onClick={() => setIsDbExpanded(prev => !prev)}
                              className="flex items-center gap-1.5 text-emerald-400 font-bold hover:text-white cursor-pointer py-1 px-1.5 rounded bg-[#182038]/60 border border-[#222C47] transition-colors select-none"
                            >
                              {isDbExpanded ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              <Database className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span className="truncate">{config.database || 'postgres'}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto animate-pulse" />
                            </div>

                            {/* Database Sub-Objects (pgAdmin 4 structure) */}
                            {isDbExpanded && (
                              <div className="pl-3.5 space-y-0.5 border-l border-[#1C2438] ml-2 text-[11px] text-gray-400">
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Binary className="w-3 h-3 text-purple-400" /><span>Casts</span></div>
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Box className="w-3 h-3 text-blue-400" /><span>Catalogs</span></div>
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Layers className="w-3 h-3 text-cyan-400" /><span>Event Triggers</span></div>
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><ShieldCheck className="w-3 h-3 text-emerald-400" /><span>Extensions</span></div>
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Globe className="w-3 h-3 text-amber-400" /><span>Foreign Data Wrappers</span></div>
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Code2 className="w-3 h-3 text-yellow-400" /><span>Languages</span></div>
                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Radio className="w-3 h-3 text-indigo-400" /><span>Publications</span></div>

                                {/* Schemas Node */}
                                <div className="space-y-0.5 pt-0.5">
                                  <div 
                                    onClick={() => setIsSchemaExpanded(prev => !prev)}
                                    className="flex items-center gap-1.5 text-gray-200 font-semibold hover:text-white cursor-pointer py-1 px-1 rounded hover:bg-[#182033] transition-colors select-none"
                                  >
                                    {isSchemaExpanded ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
                                    <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Schemas (1)</span>
                                  </div>

                                  {isSchemaExpanded && (
                                    <div className="pl-3 space-y-0.5 border-l border-[#1C2438] ml-2">
                                      <div 
                                        onClick={() => setIsTablesExpanded(prev => !prev)}
                                        className="flex items-center justify-between text-gray-300 hover:text-white cursor-pointer py-1 px-1 rounded hover:bg-[#182033] transition-colors select-none"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          {isTablesExpanded ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
                                          <Folder className="w-3 h-3 text-amber-300 shrink-0" />
                                          <span>public</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono">{filteredTables.length} tables</span>
                                      </div>

                                      {isTablesExpanded && (
                                        <div className="pl-3 space-y-0.5 border-l border-[#1C2438] ml-1.5">
                                          {filteredTables.length === 0 ? (
                                            <div className="text-[11px] text-gray-500 italic py-1 px-2">No tables found</div>
                                          ) : (
                                            filteredTables.map((tbl: PostgresTableInfo) => {
                                              const isSelected = selectedTable === tbl.name;
                                              return (
                                                <div
                                                  key={tbl.name}
                                                  onClick={() => handleTableClick(tbl.name)}
                                                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                                    isSelected
                                                      ? 'bg-[#3D141C] text-white border border-[#E11D26]/40 font-bold'
                                                      : 'text-gray-300 hover:bg-[#182136] hover:text-white'
                                                  }`}
                                                  title={`Click to inspect & query table "${tbl.name}"`}
                                                >
                                                  <div className="flex items-center gap-1.5 truncate">
                                                    <Table className="w-3 h-3 text-blue-400 shrink-0" />
                                                    <span className="truncate">{tbl.name}</span>
                                                  </div>
                                                  <span className="text-[10px] text-gray-500 font-mono">
                                                    {tbl.count !== undefined ? `${String(tbl.count).replace(/rows?/gi, '').trim()} rows` : ''}
                                                  </span>
                                                </div>
                                              );
                                            })
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-[#182033] cursor-pointer"><ChevronRight className="w-3 h-3 text-gray-500" /><Share2 className="w-3 h-3 text-orange-400" /><span>Subscriptions</span></div>
                              </div>
                            )}
                          </div>

                          {/* testing (Disconnected) */}
                          <div className="flex items-center gap-1.5 text-gray-400 py-0.5 px-1.5 rounded opacity-70">
                            <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                            <Database className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="line-through text-red-400/80">testing</span>
                            <X className="w-2.5 h-2.5 text-red-400 ml-auto" />
                          </div>
                        </div>
                      )}

                      {/* Server-level Nodes: Login/Group Roles & Tablespaces */}
                      <div className="flex items-center gap-1.5 py-1 px-1.5 text-gray-400 hover:text-gray-200 cursor-pointer rounded hover:bg-[#182033]">
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                        <Users className="w-3.5 h-3.5 text-pink-400" />
                        <span>Login/Group Roles</span>
                      </div>
                      <div className="flex items-center gap-1.5 py-1 px-1.5 text-gray-400 hover:text-gray-200 cursor-pointer rounded hover:bg-[#182033]">
                        <ChevronRight className="w-3 h-3 text-gray-500" />
                        <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tablespaces</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Monaco Query Editor & Results (6 cols) */}
        <div className="col-span-6 flex flex-col border-r border-[#1C2438] bg-[#0E1322] overflow-hidden">
          {/* Query Tabs */}
          <div className="h-9 bg-[#101524] border-b border-[#1C2438] px-3 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-1 overflow-x-auto max-w-[55%]">
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
                + New
              </button>
            </div>

            {/* Quick Query Actions */}
            <div className="flex items-center gap-1.5 text-gray-400">
              <button
                onClick={() => editorRef.current?.format()}
                className="hover:text-white flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-[#182033] cursor-pointer"
                title="Format SQL (Ctrl+Shift+F)"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Format</span>
              </button>

              <button
                onClick={() => {
                  const starter = defaultQuery;
                  setQuery(starter);
                  setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: starter, result: null } : t));
                  editorRef.current?.setValue(starter);
                  setResult(null);
                }}
                className="hover:text-white flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-[#182033] cursor-pointer"
                title="Reset editor back to default starter query"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset</span>
              </button>

              <button
                onClick={() => {
                  setQuery('');
                  setQueryTabs(prev => prev.map(t => t.id === activeQueryTabId ? { ...t, query: '', result: null } : t));
                  editorRef.current?.setValue('');
                  setResult(null);
                }}
                className="hover:text-red-400 text-gray-400 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-red-950/30 cursor-pointer"
                title="Remove all code from editor (Blank slate)"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
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
            {/* Results Tabs & Action Buttons Bar */}
            <div className="px-4 py-1.5 border-b border-[#1C2438] bg-[#101524] flex items-center justify-between text-xs font-semibold select-none">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveResultTab('results')}
                  className={`pb-1.5 pt-0.5 border-b-2 transition-colors ${
                    activeResultTab === 'results' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Query Results
                </button>
                <button
                  onClick={() => setActiveResultTab('output')}
                  className={`pb-1.5 pt-0.5 border-b-2 transition-colors ${
                    activeResultTab === 'output' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Data Output
                </button>
                <button
                  onClick={() => setActiveResultTab('messages')}
                  className={`pb-1.5 pt-0.5 border-b-2 transition-colors ${
                    activeResultTab === 'messages' ? 'border-[#E11D26] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Messages
                </button>
              </div>

              {/* Data Actions: Export CSV, Export XLSX, Upload Dataset (3rd place button) */}
              <div className="flex items-center gap-2">
                {result && result.values && result.values.length > 0 && (
                  <>
                    <button
                      onClick={handleExportCsv}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#182033] hover:bg-[#202B45] text-gray-300 hover:text-white rounded-md border border-[#25324E] text-[11px] font-mono transition-colors"
                      title="Export current query results to CSV"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>CSV</span>
                    </button>

                    <button
                      onClick={handleExportXlsx}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#182033] hover:bg-[#202B45] text-gray-300 hover:text-white rounded-md border border-[#25324E] text-[11px] font-mono transition-colors"
                      title="Export current query results to Excel XLSX"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-blue-400" />
                      <span>XLSX</span>
                    </button>
                  </>
                )}

                {/* 3rd Button: Upload / Place Dataset */}
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#1E2638] hover:bg-[#28334A] text-purple-300 hover:text-purple-100 rounded-md border border-purple-800/60 text-[11px] font-mono transition-colors"
                  title="Upload / Place Dataset (CSV, XLSX, JSON, SQL)"
                >
                  <Upload className="w-3 h-3 text-purple-400" />
                  <span>Upload Dataset</span>
                </button>

                {result && (
                  <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-gray-400 pl-2 border-l border-[#1C2438]">
                    <span>{result.execution_ms ?? 0}ms</span>
                    <span>•</span>
                    <span>{result.row_count ?? (result.values ? result.values.length : 0)} rows</span>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Success Toast */}
            {editSuccessToast && (
              <div className="px-4 py-1.5 bg-emerald-950/70 border-b border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{editSuccessToast}</span>
              </div>
            )}

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
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-800/60">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Query executed successfully. Rows returned: {result.row_count ?? result.values.length} | Duration: {result.execution_ms ?? 0} ms</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono italic">
                          Double-click any cell to edit &amp; update table
                        </span>
                      </div>

                      <div className="bg-[#141A2E] rounded-xl border border-[#222C47] overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#182038] border-b border-[#222C47] text-gray-300 font-bold">
                              <th className="py-2 px-3 border-r border-[#222C47] text-gray-500 w-10">#</th>
                              {(result.columns || []).map((c, i) => (
                                <th key={i} className="py-2 px-3 border-r border-[#222C47] last:border-r-0">{c}</th>
                              ))}
                              <th className="py-2 px-3 text-center text-gray-400 w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1D253C]">
                            {(result.values || []).map((row, ri) => (
                              <tr key={ri} className="hover:bg-[#182038]/60 text-gray-200 group">
                                <td className="py-1.5 px-3 border-r border-[#222C47] text-gray-500">{ri + 1}</td>
                                {row.map((val, vi) => {
                                  const colName = result.columns?.[vi] || `col_${vi}`;
                                  const isEditingThis = editingCell && editingCell.rowIndex === ri && editingCell.colIndex === vi;

                                  return (
                                    <td 
                                      key={vi} 
                                      onDoubleClick={() => {
                                        setEditingCell({
                                          rowIndex: ri,
                                          colIndex: vi,
                                          colName,
                                          value: String(val ?? '')
                                        });
                                      }}
                                      className="py-1.5 px-3 border-r border-[#222C47] last:border-r-0 relative cursor-pointer"
                                      title="Double-click to edit cell value"
                                    >
                                      {isEditingThis ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            autoFocus
                                            value={editingCell.value}
                                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveCellEdit();
                                              if (e.key === 'Escape') setEditingCell(null);
                                            }}
                                            className="w-full bg-[#0E1322] text-white px-2 py-0.5 rounded border border-blue-500 focus:outline-hidden text-xs font-mono"
                                          />
                                          <button
                                            onClick={handleSaveCellEdit}
                                            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950 rounded"
                                            title="Save (Enter)"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setEditingCell(null)}
                                            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                                            title="Cancel (Esc)"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between group-hover:text-white">
                                          <span>{String(val ?? '')}</span>
                                          <Edit3 
                                            onClick={() => setEditingCell({ rowIndex: ri, colIndex: vi, colName, value: String(val ?? '') })}
                                            className="w-3 h-3 text-gray-600 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" 
                                          />
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="py-1.5 px-2 text-center text-gray-500">
                                  <button
                                    onClick={() => {
                                      // Start editing first editable column
                                      if (result.columns && result.columns.length > 1) {
                                        setEditingCell({
                                          rowIndex: ri,
                                          colIndex: 1,
                                          colName: result.columns[1],
                                          value: String(row[1] ?? '')
                                        });
                                      }
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-400 hover:bg-[#1F2942] rounded transition-colors"
                                    title="Edit row"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </td>
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
                {selectedTableInfo?.count ? `${String(selectedTableInfo.count).replace(/rows?/gi, '').trim()} rows` : '0 rows'}
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

      {/* Upload / Place Dataset Modal (3rd Button action) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#25324E] space-y-4 text-gray-200">
            <div className="flex items-center justify-between border-b border-[#25324E] pb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" />
                <h3 className="font-extrabold text-white text-sm">Upload &amp; Place Dataset in PostgreSQL</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* File Input */}
              <div>
                <label className="block font-bold text-gray-300 mb-1.5">Select Dataset File (CSV, XLSX, JSON, SQL)</label>
                <label className="border-2 border-dashed border-[#2A3554] hover:border-purple-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-[#0E1322] cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-purple-400" />
                  <span className="text-gray-300 font-semibold">
                    {uploadFileName || 'Click to browse or drop CSV/JSON file'}
                  </span>
                  <span className="text-[10px] text-gray-500">Supports .csv, .json, .sql, .xlsx</span>
                  <input
                    type="file"
                    accept=".csv,.json,.sql,.xlsx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Target Table Name */}
              <div>
                <label className="block font-bold text-gray-300 mb-1">Target Table Name</label>
                <input
                  type="text"
                  value={uploadTableName}
                  onChange={(e) => setUploadTableName(e.target.value)}
                  placeholder="e.g. employees, customers, orders"
                  className="w-full px-3 py-2 bg-[#0E1322] border border-[#25324E] rounded-lg font-mono text-white focus:border-purple-500 focus:outline-hidden text-xs"
                />
              </div>

              {/* Preview Table Data */}
              {uploadPreviewData && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Parsed Columns: <strong>{uploadPreviewData.headers.length}</strong></span>
                    <span>Sample Rows: <strong>{uploadPreviewData.rows.length}</strong></span>
                  </div>
                  <div className="bg-[#0E1322] rounded-lg border border-[#25324E] overflow-x-auto max-h-32 text-[10px] font-mono">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#182038] text-gray-300 border-b border-[#25324E]">
                          {uploadPreviewData.headers.map((h, i) => (
                            <th key={i} className="py-1 px-2 border-r border-[#25324E] last:border-r-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreviewData.rows.map((r, ri) => (
                          <tr key={ri} className="border-b border-[#1D253C] last:border-b-0 text-gray-300">
                            {r.map((v, vi) => (
                              <td key={vi} className="py-1 px-2 border-r border-[#25324E] last:border-r-0 truncate max-w-[120px]">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#25324E]">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-3 py-2 bg-[#1C2438] hover:bg-[#25324E] text-gray-300 hover:text-white font-bold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!uploadPreviewData || !uploadTableName.trim() || isUploading}
                onClick={handleExecuteDatasetUpload}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-lg text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Placing Dataset...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import &amp; Place Table</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
