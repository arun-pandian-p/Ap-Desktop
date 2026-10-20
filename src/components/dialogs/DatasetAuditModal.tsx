import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  XCircle, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  X, 
  ChevronRight, 
  Database, 
  FileCode, 
  Terminal,
  Filter,
  Info
} from 'lucide-react';
import { Question, VerificationStatus } from '@/types';
import { 
  auditProblemLibrary, 
  verifyProblem, 
  LibraryAuditSummary, 
  ProblemVerificationReport 
} from '@/services/verification/problemVerificationService';
import { 
  auditAndPersistProblemVerifications, 
  fetchQuestions, 
  createPreVerificationSafetyBackup 
} from '@/services/db';

interface DatasetAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProblemForPractice?: (problem: Question) => void;
}

export const DatasetAuditModal: React.FC<DatasetAuditModalProps> = ({
  isOpen,
  onClose,
  onSelectProblemForPractice,
}) => {
  const [summary, setSummary] = useState<LibraryAuditSummary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<ProblemVerificationReport | null>(null);
  const [safetyBackupTimestamp, setSafetyBackupTimestamp] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Load audit data on open
  useEffect(() => {
    if (!isOpen) return;
    loadAuditData();
  }, [isOpen]);

  // Handle Escape key to dismiss dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const qRes = await fetchQuestions({ limit: 10000 });
      setQuestions(qRes.questions);
      const auditRes = auditProblemLibrary(qRes.questions);
      setSummary(auditRes);
    } catch (e) {
      console.error('Failed to load library audit data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunFullAuditAndMigrate = async () => {
    setRevalidating(true);
    try {
      const backupRes = await createPreVerificationSafetyBackup();
      if (backupRes.success) {
        setSafetyBackupTimestamp(new Date(backupRes.timestamp).toLocaleTimeString());
      }
      const updated = await auditAndPersistProblemVerifications();
      setSummary(updated);
      const qRes = await fetchQuestions({ limit: 10000 });
      setQuestions(qRes.questions);
    } catch (e) {
      console.error('Audit run failed:', e);
    } finally {
      setRevalidating(false);
    }
  };

  if (!isOpen) return null;

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    const rep = summary?.problemReports[q.id];
    const status = rep?.status || 'unverified';

    if (filterStatus === 'verified' && status !== 'verified') return false;
    if (filterStatus === 'partially_verified' && status !== 'partially_verified') return false;
    if (filterStatus === 'unverified' && status !== 'unverified') return false;
    if (filterStatus === 'invalid' && status !== 'invalid') return false;
    if (filterStatus === 'duplicates') {
      const isDup = summary?.duplicateGroups.some(g => g.ids.includes(q.id));
      if (!isDup) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(query);
      const matchPlatform = (q.platform || '').toLowerCase().includes(query);
      const matchId = q.id.toLowerCase().includes(query);
      return matchTitle || matchPlatform || matchId;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const displayedQuestions = filteredQuestions.slice((page - 1) * pageSize, page * pageSize);

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-max">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Verified</span>
          </span>
        );
      case 'partially_verified':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-400 border border-blue-800 flex items-center gap-1 w-max">
            <Info className="w-3 h-3 text-blue-400" />
            <span>Partially Verified</span>
          </span>
        );
      case 'invalid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-950/80 text-red-400 border border-red-800 flex items-center gap-1 w-max">
            <XCircle className="w-3 h-3 text-red-400" />
            <span>Invalid</span>
          </span>
        );
      case 'unverified':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1 w-max">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>Unverified</span>
          </span>
        );
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div 
        className="w-full max-w-6xl max-h-[92vh] bg-[#0B1220] border border-[#1E2A44] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200"
        data-surface="dark-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2A44] bg-[#0F182B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E11D26] to-[#800F15] flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Dataset Integrity & Verification Audit</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#142038] text-emerald-400 border border-emerald-800">
                  Deterministic Pipeline
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Audits all curriculum problems for authenticity, non-dummy examples, and reference test execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunFullAuditAndMigrate}
              disabled={revalidating || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Execute live audit and safely update verification status in SQLite"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${revalidating ? 'animate-spin' : ''}`} />
              <span>{revalidating ? 'Auditing Library...' : 'Revalidate & Persist'}</span>
            </button>
            <button
              id="btn-close-audit-modal"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#142038] transition-colors cursor-pointer"
              title="Close Audit Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="p-6 border-b border-[#1E2A44] bg-[#0B1220] space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Database Integrity Status: </span>
              <strong className="text-white">Active SQLite Engine</strong>
              {safetyBackupTimestamp && (
                <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800 text-[10px]">
                  Safety Snapshot: {safetyBackupTimestamp}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 font-mono">
              Audited: {summary ? new Date(summary.auditedAt).toLocaleTimeString() : 'Pending'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {/* 1. Total */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-[#1E2A44]">
              <div className="text-[11px] font-medium text-gray-400">Total</div>
              <div className="text-lg font-black text-white mt-0.5">{summary?.total.toLocaleString() ?? '...'}</div>
              <div className="text-[9px] text-gray-500">Curriculum Records</div>
            </div>

            {/* 2. Verified */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-emerald-900/60">
              <div className="text-[11px] font-medium text-emerald-400">Verified</div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">{summary?.verified.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-emerald-600">Tests 100% Passed</div>
            </div>

            {/* 3. Partially Verified */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-blue-900/60">
              <div className="text-[11px] font-medium text-blue-400">Partially Verified</div>
              <div className="text-lg font-black text-blue-400 mt-0.5">{summary?.partiallyVerified.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-blue-500">Official Judge Link</div>
            </div>

            {/* 4. Unverified */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-amber-900/60">
              <div className="text-[11px] font-medium text-amber-400">Unverified</div>
              <div className="text-lg font-black text-amber-400 mt-0.5">{summary?.unverified.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-amber-600">Needs Validation</div>
            </div>

            {/* 5. Invalid */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-red-900/60">
              <div className="text-[11px] font-medium text-red-400">Invalid</div>
              <div className="text-lg font-black text-red-400 mt-0.5">{summary?.invalid.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-red-500">Corrupted / Dummy</div>
            </div>

            {/* 6. Duplicates */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-purple-900/60">
              <div className="text-[11px] font-medium text-purple-400">Duplicates</div>
              <div className="text-lg font-black text-purple-400 mt-0.5">{summary?.duplicates.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-purple-500">Duplicate Titles</div>
            </div>

            {/* 7. Failed Ref Tests */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-rose-900/60">
              <div className="text-[11px] font-medium text-rose-400">Failed Tests</div>
              <div className="text-lg font-black text-rose-400 mt-0.5">{summary?.failedReferenceTests.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-rose-500">Ref Execution Mismatch</div>
            </div>

            {/* 8. Broken Links */}
            <div className="bg-[#0F182B] p-3 rounded-xl border border-orange-900/60">
              <div className="text-[11px] font-medium text-orange-400">Broken Links</div>
              <div className="text-lg font-black text-orange-400 mt-0.5">{summary?.brokenSourceLinks.toLocaleString() ?? '0'}</div>
              <div className="text-[9px] text-orange-500">Missing HTTPS URL</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="px-6 py-3 border-b border-[#1E2A44] bg-[#0F182B]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'All', label: 'All Problems', count: summary?.total },
              { id: 'verified', label: 'Verified', count: summary?.verified },
              { id: 'partially_verified', label: 'Partially Verified', count: summary?.partiallyVerified },
              { id: 'unverified', label: 'Unverified', count: summary?.unverified },
              { id: 'invalid', label: 'Invalid', count: summary?.invalid },
              { id: 'duplicates', label: 'Duplicates', count: summary?.duplicates },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setFilterStatus(tab.id); setPage(1); }}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === tab.id
                    ? 'bg-[#E11D26] text-white shadow-xs'
                    : 'bg-[#142038] text-gray-300 hover:bg-[#1E2A44]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-md bg-black/30 text-[10px] font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audited problems..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#142038] border border-[#1E2A44] rounded-xl text-white placeholder-gray-500 focus:outline-hidden focus:border-[#E11D26]"
            />
          </div>
        </div>

        {/* Main Content Area: Problem Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-3 text-gray-400">
              <RefreshCw className="w-8 h-8 text-[#E11D26] animate-spin" />
              <span>Analyzing curriculum problem records against 10-point deterministic pipeline...</span>
            </div>
          ) : displayedQuestions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-2 text-gray-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <div className="text-sm font-bold text-white">No problems found for filter: {filterStatus}</div>
              <p className="text-xs text-gray-500">All examined records conform to the requested filter constraints.</p>
            </div>
          ) : (
            <div className="border border-[#1E2A44] rounded-xl overflow-hidden bg-[#0F182B]/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0F182B] text-gray-400 font-semibold border-b border-[#1E2A44]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Problem Title</th>
                    <th className="py-2.5 px-3">Platform / Attribution</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Score</th>
                    <th className="py-2.5 px-3">Reference Tests</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]/60">
                  {displayedQuestions.map(q => {
                    const rep = summary?.problemReports[q.id];
                    const status = rep?.status || 'unverified';
                    const score = rep?.score ?? 0;

                    return (
                      <tr key={q.id} className="hover:bg-[#142038]/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-gray-500">{q.order_num || '-'}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{q.title}</span>
                            {rep?.isApAuthored && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950/70 text-red-400 border border-red-800">
                                Ap-Authored
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500">{q.pattern_name || q.track_slug || 'DSA'}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-gray-300 font-medium">{rep?.sourceAttribution || q.platform}</div>
                          {q.practice_link ? (
                            <a
                              href={q.practice_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              <span>Official Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-500">No external URL</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {getStatusBadge(status)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}>
                            {score}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {rep?.hasReferenceImplementation ? (
                            rep.referenceTestsPassed ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Passed</span>
                              </span>
                            ) : (
                              <span className="text-red-400 font-semibold flex items-center gap-1 text-[11px]">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Failed</span>
                              </span>
                            )
                          ) : (
                            <span className="text-gray-500 text-[11px]">External Judge</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedReport(rep || null)}
                              className="px-2.5 py-1 bg-[#142038] hover:bg-[#1E2A44] text-gray-300 hover:text-white rounded-lg text-xs font-semibold border border-[#1E2A44] transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                            {onSelectProblemForPractice && (
                              <button
                                onClick={() => {
                                  onSelectProblemForPractice(q);
                                  onClose();
                                }}
                                className="px-2.5 py-1 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                title="Open in Practice IDE"
                              >
                                Practice
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredQuestions.length)} of {filteredQuestions.length} problems
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-[#142038] hover:bg-[#1E2A44] disabled:opacity-30 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 font-mono">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-[#142038] hover:bg-[#1E2A44] disabled:opacity-30 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Problem Diagnostics Modal Drawer */}
        {selectedReport && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="w-full max-w-2xl bg-[#0F182B] border border-[#1E2A44] rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{selectedReport.title}</span>
                    {getStatusBadge(selectedReport.status)}
                  </h3>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Source: {selectedReport.sourceAttribution}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#142038]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Checks Checklist */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
                <div className="font-bold text-gray-300">10-Point Deterministic Verification Checks:</div>
                {selectedReport.checks.map(chk => (
                  <div
                    key={chk.checkId}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                      chk.passed
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                        : 'bg-red-950/20 border-red-900/40 text-red-300'
                    }`}
                  >
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-semibold">{chk.name}</div>
                      <div className="text-[11px] opacity-80 mt-0.5">{chk.message}</div>
                    </div>
                  </div>
                ))}

                {selectedReport.diagnostics.length > 0 && (
                  <div className="mt-3 p-3 bg-red-950/30 rounded-xl border border-red-900/50 space-y-1">
                    <div className="font-bold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Diagnostics:</span>
                    </div>
                    <ul className="list-disc pl-5 text-[11px] text-red-300 space-y-0.5">
                      {selectedReport.diagnostics.map((diag, i) => (
                        <li key={i}>{diag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-[#1E2A44]">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-1.5 bg-[#142038] hover:bg-[#1E2A44] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
