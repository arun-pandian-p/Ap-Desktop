import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Track, ScreenId } from '@/types';
import { fetchTracks } from '@/services/db';

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

  useEffect(() => {
    fetchTracks().then(setTracks);
  }, []);

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto max-h-[calc(100vh-5rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Learning Tracks</h1>
          <p className="text-xs text-gray-500 mt-1">
            Structured career curricula covering algorithmic patterns, SQL engineering, and placement aptitude
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tracks and topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E8EAF2] rounded-xl focus:outline-hidden focus:border-[#E11D26] shadow-2xs"
            />
          </div>

          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Track</span>
          </button>
        </div>
      </div>

      {/* Summary Analytics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-[#E8EAF2] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E11D26] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Overall Progress</div>
            <div className="text-xl font-black text-gray-900">18 / 52 Topics (34.6%)</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Current Streak</div>
            <div className="text-xl font-black text-gray-900">14 Days Active</div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Study Time</div>
            <div className="text-xl font-black text-gray-900">42.5 Hours Logged</div>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        {(['All', 'In Progress', 'Completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab
                ? 'bg-[#E11D26] text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-[#E8EAF2] hover:bg-gray-50'
            }`}
          >
            {tab} Tracks
          </button>
        ))}
      </div>

      {/* Track Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredTracks.map((track) => {
          const isDsa = track.slug.includes('coding');
          const isSql = track.slug.includes('sql');
          const total = track.total_problems || (isDsa ? 413 : isSql ? 549 : 252);
          const solved = isDsa ? 64 : isSql ? 45 : 33;
          const pct = Math.round((solved / total) * 100);

          return (
            <div
              key={track.id}
              className="bg-white rounded-2xl border border-[#E8EAF2] hover:border-gray-300 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header with Icon, Level & Fixed Position ⋯ Menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      isDsa 
                        ? 'bg-red-50 text-[#E11D26]' 
                        : isSql 
                        ? 'bg-blue-50 text-[#2563EB]' 
                        : 'bg-purple-50 text-purple-600'
                    }`}>
                      {isDsa ? <Code2 className="w-5 h-5" /> : isSql ? <Database className="w-5 h-5" /> : <Map className="w-5 h-5" />}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      track.level === 'beginner'
                        ? 'bg-emerald-50 text-emerald-700'
                        : track.level === 'intermediate'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {track.level ? track.level.toUpperCase() : 'INTERMEDIATE'}
                    </span>
                  </div>

                  {/* ⋯ Menu placed without overlapping title (Fixes Section 16.13 mockup defect) */}
                  <button className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#E11D26] transition-colors leading-snug">
                  {track.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  {track.description}
                </p>

                {/* Progress bar */}
                <div className="my-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">{solved} / {total} items</span>
                    <span className="font-bold text-[#E11D26]">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#E11D26] h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>Last studied: Yesterday</span>
                  <span>Est: 18h left</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  if (onSelectTrack) onSelectTrack(track);
                  onNavigate('problems');
                }}
                className="mt-4 w-full py-2 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95"
              >
                <span>Continue Learning</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Create Custom Track dashed card */}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#E11D26] p-5 flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 hover:bg-red-50/20 transition-all cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#E11D26] group-hover:text-white text-gray-400 flex items-center justify-center mb-3 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#E11D26]">Create a Custom Track</h4>
          <p className="text-[11px] text-gray-400 mt-1 max-w-[180px]">Import your company problem list or personal syllabus</p>
          <span className="mt-3 text-xs font-bold text-[#E11D26]">Get Started →</span>
        </div>
      </div>
    </div>
  );
};
