import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Map, 
  Code2, 
  Database, 
  BookOpen, 
  MoreVertical, 
  ArrowRight, 
  Flame, 
  Clock, 
  Award,
  Sparkles,
  Upload,
  Download,
  Edit3,
  Trash2,
  FileText
} from 'lucide-react';
import { Track, ScreenId } from '@/types';
import { fetchTracks, deleteTrack, exportCodingSheetToCsv } from '@/services/db';
import { CreateTrackModal } from '@/components/dialogs/CreateTrackModal';
import { EditTrackModal } from '@/components/dialogs/EditTrackModal';
import { ImportSheetCsvModal } from '@/components/dialogs/ImportSheetCsvModal';

interface TracksViewProps {
  onNavigate: (screen: ScreenId) => void;
  onSelectTrack?: (track: Track) => void;
}

export const TracksView: React.FC<TracksViewProps> = ({
  onNavigate,
  onSelectTrack,
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'In Progress' | 'Completed'>('All');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [importingTrackSlug, setImportingTrackSlug] = useState<string | undefined>(undefined);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const loadTracks = async () => {
    try {
      const data = await fetchTracks();
      setTracks(data);
    } catch (e) {
      console.warn('Failed to fetch tracks:', e);
    }
  };

  useEffect(() => {
    loadTracks();
    window.addEventListener('ap_tracks_updated', loadTracks);
    window.addEventListener('ap_questions_updated', loadTracks);
    window.addEventListener('ap_submissions_updated', loadTracks);
    return () => {
      window.removeEventListener('ap_tracks_updated', loadTracks);
      window.removeEventListener('ap_questions_updated', loadTracks);
      window.removeEventListener('ap_submissions_updated', loadTracks);
    };
  }, []);

  // Close card menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuTrackId(null);
      }
    };
    if (activeMenuTrackId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuTrackId]);

  const handleExportCsv = async (track: Track) => {
    setActiveMenuTrackId(null);
    try {
      const csv = await exportCodingSheetToCsv(track.slug);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.slug}_questions.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export sheet CSV:', err);
    }
  };

  const handleDeleteSheet = async (track: Track) => {
    setActiveMenuTrackId(null);
    const confirmed = window.confirm(`Are you sure you want to delete the coding sheet "${track.title}" and its questions?`);
    if (confirmed) {
      await deleteTrack(track.id, true);
      loadTracks();
    }
  };

  const filteredTracks = tracks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()));

    const total = t.total_problems || 0;
    const solved = t.solved_problems || 0;

    if (filter === 'Completed') {
      return matchesSearch && total > 0 && solved >= total;
    }
    if (filter === 'In Progress') {
      return matchesSearch && solved > 0 && solved < total;
    }
    return matchesSearch;
  });

  // Calculate cumulative stats
  const totalSheets = tracks.length;
  const totalQuestions = tracks.reduce((acc, t) => acc + (t.total_problems || 0), 0);
  const totalSolved = tracks.reduce((acc, t) => acc + (t.solved_problems || 0), 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Coding Sheets & Curricula
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Structured career tracks covering algorithmic patterns, SQL engineering, and placement sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search sheets, topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#142038] border border-[#E8EAF2] dark:border-[#1E2A44] rounded-xl text-gray-900 dark:text-white focus:outline-hidden focus:border-[#E11D26] shadow-2xs"
            />
          </div>

          <button
            onClick={() => {
              setImportingTrackSlug(undefined);
              setIsImportOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Import questions from CSV"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Sheet</span>
          </button>
        </div>
      </div>

      {/* Summary Analytics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-[#0E1526] p-5 rounded-2xl border border-[#E8EAF2] dark:border-[#1E2A44] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#E11D26] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Curricula</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {totalSheets} Sheets ({totalQuestions.toLocaleString()} problems)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-3 md:pt-0 md:pl-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#D97706] flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Overall Solved</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {totalSolved.toLocaleString()} Solved ({overallPct}%)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-3 md:pt-0 md:pl-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Preparation Status</div>
            <div className="text-xl font-black text-gray-900 dark:text-white">
              Active Prep Track
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        {(['All', 'In Progress', 'Completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === tab
                ? 'bg-[#E11D26] text-white shadow-2xs'
                : 'bg-white dark:bg-[#0E1526] text-gray-600 dark:text-gray-300 border border-[#E8EAF2] dark:border-[#1E2A44] hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {tab} Tracks
          </button>
        ))}
      </div>

      {/* Track Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTracks.map((track) => {
          const isDsa = track.slug.includes('coding') || track.slug.includes('dsa');
          const isSql = track.slug.includes('sql');
          const total = track.total_problems || 0;
          const solved = track.solved_problems || 0;
          const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
          const isMenuOpen = activeMenuTrackId === track.id;

          return (
            <div
              key={track.id}
              className="bg-white dark:bg-[#0E1526] rounded-2xl border border-[#E8EAF2] dark:border-[#1E2A44] hover:border-gray-300 dark:hover:border-gray-700 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
            >
              <div>
                {/* Header with Icon, Level & ⋯ Menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      isDsa 
                        ? 'bg-red-50 text-[#E11D26] dark:bg-red-950/40' 
                        : isSql 
                        ? 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/40' 
                        : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40'
                    }`}>
                      {isDsa ? <Code2 className="w-5 h-5" /> : isSql ? <Database className="w-5 h-5" /> : <Map className="w-5 h-5" />}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      track.level === 'beginner'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : track.level === 'intermediate'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    }`}>
                      {track.level ? track.level.toUpperCase() : 'INTERMEDIATE'}
                    </span>
                  </div>

                  {/* ⋯ Context Menu Button */}
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenuTrackId(isMenuOpen ? null : track.id)}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      title="Sheet options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div 
                        ref={menuRef}
                        className="absolute right-0 top-7 w-48 bg-white dark:bg-[#131D33] border border-[#E8EAF2] dark:border-[#1E2A44] rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          onClick={() => {
                            setActiveMenuTrackId(null);
                            setEditingTrack(track);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Sheet Details</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuTrackId(null);
                            setImportingTrackSlug(track.slug);
                            setIsImportOpen(true);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-500" />
                          <span>Import Questions CSV</span>
                        </button>

                        <button
                          onClick={() => handleExportCsv(track)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-200 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Export to CSV</span>
                        </button>

                        <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

                        <button
                          onClick={() => handleDeleteSheet(track)}
                          className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Sheet</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#E11D26] transition-colors leading-snug">
                  {track.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {track.description || 'Curated practice collection for algorithmic problem solving.'}
                </p>

                {/* Progress bar */}
                <div className="my-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {solved} / {total} items
                    </span>
                    <span className="font-bold text-[#E11D26]">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#E11D26] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>{track.category || 'General DSA'}</span>
                  <span>{total} questions</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (onSelectTrack) onSelectTrack(track);
                  onNavigate('problems');
                }}
                className="mt-4 w-full py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <span>Continue Learning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Create Custom Track dashed card */}
        <div 
          onClick={() => setIsCreateOpen(true)}
          className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#E11D26] dark:hover:border-[#E11D26] p-6 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-[#0E1526]/50 hover:bg-red-50/20 dark:hover:bg-red-950/20 transition-all cursor-pointer group min-h-[260px]"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-[#E11D26] group-hover:text-white text-gray-400 flex items-center justify-center mb-3 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-[#E11D26]">
            Create a Custom Track
          </h4>
          <p className="text-[11px] text-gray-400 mt-1 max-w-[180px]">
            Import your company problem list or personal syllabus
          </p>
          <span className="mt-3 text-xs font-bold text-[#E11D26]">Get Started →</span>
        </div>
      </div>

      {/* Dialogs */}
      <CreateTrackModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadTracks()}
      />

      <EditTrackModal
        isOpen={Boolean(editingTrack)}
        onClose={() => setEditingTrack(null)}
        track={editingTrack}
        onSuccess={() => loadTracks()}
        onDelete={(t) => handleDeleteSheet(t)}
      />

      <ImportSheetCsvModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        tracks={tracks}
        defaultTrackSlug={importingTrackSlug}
        onSuccess={() => loadTracks()}
      />
    </div>
  );
};
