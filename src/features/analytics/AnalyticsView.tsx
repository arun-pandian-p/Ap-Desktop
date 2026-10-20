import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart3, 
  Clock, 
  Flame, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Download,
  Calendar,
  Sparkles,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  Check,
  Activity,
  Layers
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { ScreenId } from '@/types';
import { RealtimeConnectionState } from '@/types/realtime';
import { realtimeService } from '@/services/websocket/realtimeService';
import { 
  fetchAnalyticsSnapshot, 
  exportAnalyticsReport, 
  DateRangeKey, 
  AnalyticsSnapshot 
} from '@/services/analytics/analyticsService';

interface AnalyticsViewProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>('7d');
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>(realtimeService.getState());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Authoritative data fetch strictly from SQLite
  const loadData = useCallback(async (range: DateRangeKey = selectedRange) => {
    try {
      setIsLoading(true);
      const data = await fetchAnalyticsSnapshot(range);
      if (isMountedRef.current) {
        setSnapshot(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.warn('AnalyticsView: failed to fetch snapshot:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedRange]);

  // Connect to Realtime WebSocket/IPC bus on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // 1. Initial snapshot fetch
    loadData(selectedRange);

    // 2. Connect Realtime service
    realtimeService.connect().catch(() => {});

    // 3. Track connection state
    const unsubStatus = realtimeService.onStatusChange((status) => {
      if (isMountedRef.current) {
        setConnectionState(status);
      }
    });

    // 4. Invalidate and re-fetch on any incoming realtime mutation
    const unsubAllEvents = realtimeService.subscribeAll((event) => {
      loadData(selectedRange);
    });

    // 5. Invalidation event listener
    const unsubInvalidated = realtimeService.subscribe('analytics:invalidated', () => {
      loadData(selectedRange);
    });

    // 6. Window resume and online handlers
    const handleFocus = () => {
      loadData(selectedRange);
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      isMountedRef.current = false;
      unsubStatus();
      unsubAllEvents();
      unsubInvalidated();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [loadData, selectedRange]);

  // Handle Date Range selector change
  const handleRangeChange = (newRange: DateRangeKey) => {
    setSelectedRange(newRange);
    loadData(newRange);
  };

  // Handle Export Report download
  const handleExport = () => {
    if (!snapshot) return;
    setIsExporting(true);
    try {
      exportAnalyticsReport(snapshot, 'csv');
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  // Prepare Donut pie data
  const pieData = snapshot ? [
    { name: 'Accepted', value: snapshot.solvedQuestions, color: '#16A34A' },
    { name: 'Attempted', value: snapshot.attemptedQuestions, color: '#EF4444' },
    { name: 'Remaining', value: snapshot.remainingQuestions, color: '#E2E8F0' },
  ] : [];

  // Connection pill styling & label
  const renderConnectionPill = () => {
    switch (connectionState) {
      case 'live':
        return (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold shadow-2xs cursor-default"
            title="Real-Time Sync active via Electron IPC & WebSocket"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>
        );
      case 'connecting':
        return (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold shadow-2xs cursor-default"
            title="Connecting to real-time events bus..."
          >
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Connecting...</span>
          </div>
        );
      case 'reconnecting':
        return (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold shadow-2xs cursor-default"
            title="Reconnecting to real-time socket with exponential backoff..."
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Reconnecting...</span>
          </div>
        );
      case 'error':
        return (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold shadow-2xs cursor-default"
            title="WebSocket error — running in local database-backed mode"
          >
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>Error (DB Fallback)</span>
          </div>
        );
      case 'offline':
      default:
        return (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-[11px] font-bold shadow-2xs cursor-default"
            title="Offline — running in local database-backed mode"
          >
            <WifiOff className="w-3 h-3 text-gray-500" />
            <span>Offline (DB Fallback)</span>
          </div>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)] select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Progress & Analytics</h1>
            {renderConnectionPill()}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Data-driven metrics calculated from your real persisted study logs & database records
            {lastRefreshed && (
              <span className="text-gray-400 ml-1.5 font-mono text-[10px]">
                (Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => handleRangeChange(e.target.value as DateRangeKey)}
              className="text-xs font-semibold text-gray-700 bg-white border border-[#E8EAF2] rounded-xl px-3 py-2 shadow-2xs cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadData(selectedRange)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-[#E8EAF2] rounded-xl text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            title="Refresh Authoritative Data from SQLite"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export Report Button */}
          <button 
            onClick={handleExport}
            disabled={!snapshot || isExporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-[#E8EAF2] rounded-xl text-xs font-semibold shadow-2xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            title="Download CSV report of current metrics"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Study Time */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs transition-all hover:shadow-sm">
          <span className="text-xs text-gray-500">Total Study Time</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {snapshot ? `${snapshot.activeStudyHours}h` : '0.0h'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Logged active focus</span>
          </div>
        </div>

        {/* Problems Solved */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs transition-all hover:shadow-sm">
          <span className="text-xs text-gray-500">Problems Solved</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {snapshot ? snapshot.solvedQuestions : 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {snapshot ? `${snapshot.totalSubmissions} submissions` : '0 submissions'}
          </div>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs transition-all hover:shadow-sm">
          <span className="text-xs text-gray-500">Overall Accuracy</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {snapshot ? `${snapshot.accuracy}%` : '0%'}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Accepted / Total</span>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs transition-all hover:shadow-sm">
          <span className="text-xs text-gray-500">Current Streak</span>
          <div className="text-2xl font-black text-[#D97706] mt-1 flex items-center gap-1.5">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span>{snapshot ? `${snapshot.currentStreak} Days` : '0 Days'}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Longest: {snapshot ? `${snapshot.longestStreak} days` : '0 days'}
          </div>
        </div>

        {/* Tracks In Progress */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8EAF2] shadow-2xs transition-all hover:shadow-sm">
          <span className="text-xs text-gray-500">Tracks In Progress</span>
          <div className="text-2xl font-black text-purple-600 mt-1 flex items-center gap-1">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>{snapshot ? `${snapshot.tracksInProgress} / ${snapshot.totalTracks}` : '0 / 0'}</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {snapshot ? `${snapshot.tracksEnrolledPercent}% active` : '0% active'}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study Activity Line Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Study Activity Over Time</h3>
              <p className="text-xs text-gray-500">
                Hours spent practicing per day vs daily 3-hour target ({selectedRange === '7d' ? '7 days' : selectedRange === '30d' ? '30 days' : selectedRange === '90d' ? '90 days' : 'all time'})
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E11D26]"></span> Active Hours
              </span>
              <span className="flex items-center gap-1.5 font-medium text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span> Daily Target (3h)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {snapshot && snapshot.activityChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshot.activityChart}>
                  <XAxis 
                    dataKey="day" 
                    stroke="#98A2B3" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#98A2B3" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 'auto']}
                    unit="h"
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-[#0B1220] text-white p-3 rounded-xl shadow-xl border border-gray-800 text-xs space-y-1">
                            <div className="font-bold text-gray-200">{pt.date} ({pt.day})</div>
                            <div className="text-red-400 font-semibold">Active Focus: {pt.hours} hours</div>
                            <div className="text-emerald-400">Problems Solved: {pt.solved}</div>
                            <div className="text-gray-400">Submissions: {pt.totalAttempts}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#E11D26" 
                    strokeWidth={3} 
                    dot={{ r: snapshot.activityChart.length > 14 ? 2 : 4 }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="goal" 
                    stroke="#D0D5DD" 
                    strokeDasharray="5 5" 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                Loading study activity logs...
              </div>
            )}
          </div>
        </div>

        {/* Problem Solving Performance Donut (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Problem Accuracy Breakdown</h3>
            <p className="text-xs text-gray-500 mb-4">
              Distribution across {snapshot?.totalQuestions || 1337} curriculum challenges
            </p>

            <div className="h-44 flex items-center justify-center">
              {snapshot ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      innerRadius={50} 
                      outerRadius={70} 
                      paddingAngle={4} 
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: any) => [`${val} problems`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-gray-400">Loading breakdown...</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
                <span>Solved</span>
              </span>
              <strong className="text-gray-900">
                {snapshot ? `${snapshot.solvedQuestions} (${snapshot.solvedPercent}%)` : '0 (0%)'}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> 
                <span>Attempted</span>
              </span>
              <strong className="text-gray-900">
                {snapshot ? `${snapshot.attemptedQuestions} (${snapshot.attemptedPercent}%)` : '0 (0%)'}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-300"></span> 
                <span>Remaining</span>
              </span>
              <strong className="text-gray-900">
                {snapshot ? `${snapshot.remainingQuestions} (${snapshot.remainingPercent}%)` : '0 (0%)'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Practice Heatmap Grid */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Weekly Practice Heatmap</h3>
            <span className="text-[11px] text-gray-400 font-medium">Last 7 Calendar Days</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Study intensity across hours of the day (Morning, Afternoon, Evening, Night)</p>

          <div className="grid grid-cols-7 gap-2">
            {snapshot && snapshot.weeklyHeatmap.map((dayData, di) => (
              <div key={di} className="text-center">
                <span className={`text-[10px] font-bold mb-1 block ${dayData.isToday ? 'text-[#E11D26]' : 'text-gray-400'}`}>
                  {dayData.dayShort}
                  {dayData.isToday && <span className="text-[8px] block font-extrabold text-red-500">TODAY</span>}
                </span>

                <div className="space-y-1">
                  {dayData.blocks.map((block, bi) => {
                    const bg = block.intensity === 3 
                      ? 'bg-[#E11D26]' 
                      : block.intensity === 2 
                      ? 'bg-[#F9B0B0]' 
                      : block.intensity === 1 
                      ? 'bg-[#FCD7D7]' 
                      : 'bg-gray-100';

                    const tooltipText = `${dayData.dayFull} ${block.label}: ${block.activeMinutes} min focus, ${block.solves} solved, ${block.attempts} attempts`;

                    return (
                      <div 
                        key={bi} 
                        className={`h-6 rounded-md ${bg} transition-all hover:scale-105 cursor-pointer`}
                        title={tooltipText}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 text-[10px] text-gray-500">
            <span>Blocks: Morning (6-12), Afternoon (12-17), Evening (17-21), Night (21-6)</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <span className="w-2.5 h-2.5 rounded bg-gray-100" />
              <span className="w-2.5 h-2.5 rounded bg-[#FCD7D7]" />
              <span className="w-2.5 h-2.5 rounded bg-[#F9B0B0]" />
              <span className="w-2.5 h-2.5 rounded bg-[#E11D26]" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Recent Achievements & Milestones */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Earned Milestones & Badges</h3>
            <span className="text-[11px] font-semibold text-emerald-600">Authoritative Unlocks</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Honors unlocked from continuous study and solved problem thresholds</p>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {snapshot && snapshot.milestones.map((ach) => (
              <div 
                key={ach.id} 
                className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                  ach.isEarned 
                    ? 'bg-amber-50/60 border-amber-200/80 shadow-2xs' 
                    : 'bg-gray-50/80 border-gray-100 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                    ach.isEarned 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{ach.title}</span>
                      {ach.isEarned && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{ach.desc}</div>
                    {!ach.isEarned && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full" 
                            style={{ width: `${ach.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{ach.progressText}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 ml-2">
                  <span className={`text-[11px] font-bold ${ach.isEarned ? 'text-[#E11D26]' : 'text-gray-400'}`}>
                    {ach.xp}
                  </span>
                  {ach.isEarned && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
                      <Check className="w-3 h-3" />
                      <span>Earned</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
