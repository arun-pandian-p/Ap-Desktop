import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  MapPin, 
  Building2, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter, 
  Award, 
  Flame, 
  Camera, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Info,
  Layers,
  Code2,
  Clock,
  Check,
  Eye,
  MessageSquare
} from 'lucide-react';
import { UserProfile, ScreenId, ProfileStatsResult, HeatmapResult, SubmissionRecord, HeatmapDay } from '@/types';
import { getUserProfile, saveUserProfile } from '@/services/profile';
import { fetchProfileStats, fetchSubmissionHeatmap, fetchSubmissions } from '@/services/db';
import { EditProfileModal } from '@/components/dialogs/EditProfileModal';

interface ProfileViewProps {
  onNavigate?: (screen: ScreenId) => void;
  onShowToast?: (title: string, type?: 'success' | 'warning' | 'error' | 'info', body?: string) => void;
}

function formatRelativeTime(isoStr: string): string {
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    return '1 year ago';
  } catch {
    return 'Recently';
  }
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // SQLite-driven statistics & heatmap
  const [dbStats, setDbStats] = useState<ProfileStatsResult>({
    totalSolved: 90,
    totalQuestions: 4073,
    easySolved: 64,
    easyTotal: 969,
    mediumSolved: 23,
    mediumTotal: 2124,
    hardSolved: 3,
    hardTotal: 980,
    attemptingCount: 3,
    totalSubmissions: 124,
    totalActiveDays: 20,
    currentStreak: 3,
    longestStreak: 3,
  });

  const [selectedYear, setSelectedYear] = useState<number | 'current'>('current');
  const [heatmapData, setHeatmapData] = useState<HeatmapResult | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'recent_ac' | 'list' | 'solutions' | 'discuss'>('recent_ac');
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // Load real SQLite data
  const loadDbData = async () => {
    try {
      const stats = await fetchProfileStats();
      setDbStats(stats);

      const hmap = await fetchSubmissionHeatmap(selectedYear);
      setHeatmapData(hmap);

      const subs = await fetchSubmissions({ limit: 40 });
      setSubmissions(subs);
    } catch (err) {
      console.warn('Error loading profile DB data:', err);
    }
  };

  useEffect(() => {
    loadDbData();

    const handleUpdate = () => {
      loadDbData();
    };

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
      loadDbData();
    };

    window.addEventListener('ap_submissions_updated', handleUpdate);
    window.addEventListener('ap_questions_updated', handleUpdate);
    window.addEventListener('ap_profile_updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('ap_submissions_updated', handleUpdate);
      window.removeEventListener('ap_questions_updated', handleUpdate);
      window.removeEventListener('ap_profile_updated', handleProfileUpdate);
    };
  }, [selectedYear]);

  const handleSaveProfile = async (updated: UserProfile) => {
    const saved = await saveUserProfile(updated);
    setProfile(saved);
    if (onShowToast) {
      onShowToast('Profile Updated Successfully', 'success', 'Your portfolio and settings have been saved.');
    }
  };

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 4: return 'bg-[#39D353]'; // Bright neon green (10+ submissions)
      case 3: return 'bg-[#26A641]'; // Vibrant green (6-9 submissions)
      case 2: return 'bg-[#006D32]'; // Deep green (3-5 submissions)
      case 1: return 'bg-[#0E4429]'; // Subtle green (1-2 submissions)
      default: return 'bg-[#232733]'; // Inactive dark cell (0 submissions)
    }
  };

  const recentAcList = useMemo(() => {
    return submissions.filter(s => s.status === 'Accepted');
  }, [submissions]);

  // Compute month positions for the 52 columns
  const monthLabels = [
    { label: 'Oct', col: 0 },
    { label: 'Nov', col: 4 },
    { label: 'Dec', col: 9 },
    { label: 'Jan', col: 13 },
    { label: 'Feb', col: 17 },
    { label: 'Mar', col: 22 },
    { label: 'Apr', col: 26 },
    { label: 'May', col: 30 },
    { label: 'Jun', col: 35 },
    { label: 'Jul', col: 39 },
    { label: 'Aug', col: 43 },
    { label: 'Sep', col: 48 },
  ];

  // Circle gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  const solveRatio = Math.min(1, dbStats.totalSolved / Math.max(1, dbStats.totalQuestions));
  const strokeDashoffset = circumference * (1 - solveRatio);

  return (
    <div className="h-full overflow-y-auto bg-[#0C0E14] text-[#E6EAF5] p-6 font-sans select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header / Breadcrumb */}
        <div className="flex items-center justify-between pb-2 border-b border-[#222634]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button 
              onClick={() => onNavigate && onNavigate('dashboard')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span>&gt;</span>
            <span className="font-bold text-white">Developer Profile</span>
          </div>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-[#E11D26] hover:bg-[#C8101A] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile & Photo</span>
          </button>
        </div>

        {/* Main 2-Column Grid matching LeetCode Profile Reference */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ======================================================== */}
          {/* LEFT CARD: User Identity, Bio, Socials & Community Stats */}
          {/* Rank is COMPLETELY REMOVED as requested                  */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 bg-[#181A22] rounded-2xl border border-[#262A38] p-6 flex flex-col justify-between shadow-xl">
            <div className="space-y-5">
              {/* Profile Photo & Names */}
              <div className="flex items-start gap-4">
                <div 
                  onClick={() => setIsEditModalOpen(true)}
                  className="relative group w-20 h-20 rounded-2xl bg-[#262A38] border-2 border-[#33384B] overflow-hidden shrink-0 cursor-pointer shadow-md"
                  title="Click to change profile photo"
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#E11D26] text-white font-extrabold text-2xl flex items-center justify-center">
                      {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AP'}
                    </div>
                  )}
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Change</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate" title={profile.name}>
                    {profile.name}
                  </h2>
                  <p className="text-xs text-gray-400 font-mono truncate">
                    {profile.username}
                  </p>
                  
                  {/* Followers / Following row (matching screenshot) */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span><strong className="text-white">3</strong> Following</span>
                    <span>•</span>
                    <span><strong className="text-white">0</strong> Followers</span>
                  </div>
                </div>
              </div>

              {/* Edit Profile Button (Green border button matching LeetCode screenshot) */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full py-2 bg-[#1C2C24] hover:bg-[#23382D] text-[#34D399] border border-[#2B4738] rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Edit Profile
              </button>

              {/* Bio & Details */}
              <div className="space-y-2.5 text-xs text-gray-300">
                {profile.location && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                    <a 
                      href={profile.website} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="truncate text-blue-400 hover:underline"
                    >
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile.github && (
                  <div className="flex items-center gap-2.5">
                    <Github className="w-4 h-4 text-gray-400 shrink-0" />
                    <a 
                      href={`https://github.com/${profile.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-mono text-gray-300 hover:text-white"
                    >
                      {profile.github}
                    </a>
                  </div>
                )}
                {profile.linkedin && (
                  <div className="flex items-center gap-2.5">
                    <Linkedin className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate font-mono">{profile.linkedin}</span>
                  </div>
                )}
              </div>

              {/* Community Stats (matching LeetCode left card) */}
              <div className="pt-4 border-t border-[#262A38] space-y-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Community Stats
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2 text-gray-400">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>Views</span>
                    </span>
                    <span className="font-mono text-gray-300 font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2 text-gray-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Solution</span>
                    </span>
                    <span className="font-mono text-gray-300 font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2 text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                      <span>Discuss</span>
                    </span>
                    <span className="font-mono text-gray-300 font-bold">0</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="flex items-center gap-2 text-gray-400">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reputation</span>
                    </span>
                    <span className="font-mono text-gray-300 font-bold">0</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT TOP: Problems Solved Dial & Badges Card            */}
          {/* ======================================================== */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* CARD 1: Problems Solved Radial Dial (8 cols) */}
            <div className="md:col-span-8 bg-[#181A22] rounded-2xl border border-[#262A38] p-6 shadow-xl flex flex-col justify-between">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Circular Gauge */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#262A38"
                        strokeWidth="7"
                        fill="transparent"
                      />
                      {/* Dynamic Solved Arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#F59E0B"
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute text-center">
                      <div className="text-2xl font-black text-white font-mono">
                        {dbStats.totalSolved}
                        <span className="text-xs text-gray-500 font-normal">/{dbStats.totalQuestions}</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Solved</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {dbStats.attemptingCount} Attempting
                      </div>
                    </div>
                  </div>
                </div>

                {/* Difficulty Bars */}
                <div className="sm:col-span-7 space-y-3 font-sans">
                  {/* Easy */}
                  <div className="bg-[#141720] p-2.5 rounded-xl border border-[#222736]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-teal-400 font-bold">Easy</span>
                      <span className="font-mono text-gray-200 text-xs">
                        <strong>{dbStats.easySolved}</strong> <span className="text-gray-500">/{dbStats.easyTotal}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#262A38] overflow-hidden">
                      <div 
                        className="h-full bg-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (dbStats.easySolved / Math.max(1, dbStats.easyTotal)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="bg-[#141720] p-2.5 rounded-xl border border-[#222736]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-amber-400 font-bold">Med.</span>
                      <span className="font-mono text-gray-200 text-xs">
                        <strong>{dbStats.mediumSolved}</strong> <span className="text-gray-500">/{dbStats.mediumTotal}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#262A38] overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (dbStats.mediumSolved / Math.max(1, dbStats.mediumTotal)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Hard */}
                  <div className="bg-[#141720] p-2.5 rounded-xl border border-[#222736]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-red-400 font-bold">Hard</span>
                      <span className="font-mono text-gray-200 text-xs">
                        <strong>{dbStats.hardSolved}</strong> <span className="text-gray-500">/{dbStats.hardTotal}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#262A38] overflow-hidden">
                      <div 
                        className="h-full bg-red-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (dbStats.hardSolved / Math.max(1, dbStats.hardTotal)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Badges Card (4 cols, matching LeetCode screenshot) */}
            <div className="md:col-span-4 bg-[#181A22] rounded-2xl border border-[#262A38] p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-gray-400 font-medium">Badges</span>
                  <span className="font-bold text-white font-mono flex items-center gap-1">
                    <span>2</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </span>
                </div>

                {/* Badge Icons */}
                <div className="flex items-center gap-4 py-2">
                  {/* Badge 1: Pandas (PD) */}
                  <div className="flex flex-col items-center gap-1 group cursor-pointer" title="Pandas Badge">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-950 to-purple-900 border border-indigo-700/60 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <span className="font-mono font-black text-indigo-300 text-sm tracking-tighter">PD</span>
                    </div>
                  </div>

                  {/* Badge 2: SQL */}
                  <div className="flex flex-col items-center gap-1 group cursor-pointer" title="SQL Practice Badge">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-950 to-cyan-900 border border-cyan-700/60 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                      <span className="font-mono font-black text-cyan-300 text-xs">SQL</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#262A38] text-[11px] text-gray-400">
                <div className="text-gray-500 text-[10px]">Most Recent Badge</div>
                <div className="font-bold text-gray-200 mt-0.5">Top SQL 50</div>
              </div>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* MIDDLE SECTION: Real-time Heatmap & Streaks from SQLite  */}
        {/* ======================================================== */}
        <div className="bg-[#181A22] rounded-2xl border border-[#262A38] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                <strong className="text-white font-mono">{dbStats.totalSubmissions}</strong> submissions in the past one year
              </h3>
              <Info className="w-3.5 h-3.5 text-gray-500" />
            </div>

            <div className="flex items-center gap-5 text-xs font-mono text-gray-400">
              <span>Total active days: <strong className="text-white">{dbStats.totalActiveDays}</strong></span>
              <span>Max streak: <strong className="text-emerald-400">{dbStats.longestStreak}</strong></span>
              <span>Current streak: <strong className="text-amber-400">{dbStats.currentStreak}</strong></span>
              
              {/* Year Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedYear(val === 'current' ? 'current' : Number(val));
                }}
                className="bg-[#202432] border border-[#2E3547] text-gray-200 text-xs rounded-lg px-2.5 py-1 focus:outline-hidden cursor-pointer"
              >
                <option value="current">Current</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </div>

          {/* 52-Column Calendar Grid */}
          <div className="relative overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-[760px]">
              {(heatmapData?.weeks || []).map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => (
                    <div
                      key={dIdx}
                      onMouseEnter={(e) => {
                        if (day.date) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({ date: day.date, count: day.count, x: rect.left, y: rect.top });
                        }
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`w-2.5 h-2.5 rounded-2xs transition-colors hover:ring-1 hover:ring-white ${
                        day.date ? getHeatmapColor(day.level) : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Month Labels along bottom */}
            <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-2 min-w-[760px] px-1 select-none">
              {monthLabels.map((m, idx) => (
                <span key={idx}>{m.label}</span>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono mt-3 px-1">
              <span>Past 12 Months Activity</span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-2xs bg-[#232733]" />
                <div className="w-2.5 h-2.5 rounded-2xs bg-[#0E4429]" />
                <div className="w-2.5 h-2.5 rounded-2xs bg-[#006D32]" />
                <div className="w-2.5 h-2.5 rounded-2xs bg-[#26A641]" />
                <div className="w-2.5 h-2.5 rounded-2xs bg-[#39D353]" />
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredDay && (
            <div 
              className="fixed z-50 px-2.5 py-1 bg-black/90 border border-gray-700 text-[11px] font-mono text-white rounded-md shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-1.5"
              style={{ left: hoveredDay.x + 5, top: hoveredDay.y - 4 }}
            >
              {hoveredDay.count} submissions on {hoveredDay.date}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* BOTTOM SECTION: Submissions Tabs (Recent AC / List)     */}
        {/* ======================================================== */}
        <div className="bg-[#181A22] rounded-2xl border border-[#262A38] overflow-hidden shadow-xl">
          {/* Tabs Header Bar */}
          <div className="border-b border-[#262A38] px-6 pt-3 flex items-center justify-between bg-[#151720]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('recent_ac')}
                className={`pb-3 px-3 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'recent_ac' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Recent AC</span>
              </button>

              <button
                onClick={() => setActiveSubTab('list')}
                className={`pb-3 px-3 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'list' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>List</span>
              </button>

              <button
                onClick={() => setActiveSubTab('solutions')}
                className={`pb-3 px-3 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'solutions' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Solutions</span>
              </button>

              <button
                onClick={() => setActiveSubTab('discuss')}
                className={`pb-3 px-3 border-b-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'discuss' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Discuss</span>
              </button>
            </div>

            <div className="text-xs text-gray-400 font-mono pb-3">
              Total {activeSubTab === 'recent_ac' ? recentAcList.length : submissions.length} records
            </div>
          </div>

          {/* Submissions List Content */}
          <div className="divide-y divide-[#222634] max-h-96 overflow-y-auto">
            {activeSubTab === 'recent_ac' ? (
              recentAcList.length > 0 ? (
                recentAcList.map((sub) => (
                  <div key={sub.id} className="p-4 hover:bg-[#1C1F2B] transition-colors flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-white hover:text-[#E11D26] cursor-pointer">
                        {sub.problem_title}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        sub.difficulty === 'Easy'
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
                          : sub.difficulty === 'Medium'
                          ? 'bg-amber-950/70 text-amber-400 border-amber-800/80'
                          : 'bg-red-950/70 text-red-400 border-red-800/80'
                      }`}>
                        {sub.difficulty}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400 uppercase bg-[#202534] px-1.5 py-0.5 rounded">
                        {sub.language}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
                      {(sub.runtime_ms ?? 0) > 0 && <span>{sub.runtime_ms} ms</span>}
                      <span>{formatRelativeTime(sub.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-500 font-mono text-xs">
                  No accepted submissions yet. Solve problems in Python or SQL Practice to see them here!
                </div>
              )
            ) : activeSubTab === 'list' ? (
              submissions.length > 0 ? (
                submissions.map((sub) => (
                  <div key={sub.id} className="p-4 hover:bg-[#1C1F2B] transition-colors flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${sub.status === 'Accepted' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div className="font-bold text-white hover:text-[#E11D26] cursor-pointer">
                        {sub.problem_title}
                      </div>
                      <span className={`text-[10px] font-bold ${sub.status === 'Accepted' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sub.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
                      <span className="uppercase text-[10px]">{sub.language}</span>
                      <span>{formatRelativeTime(sub.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-500 font-mono text-xs">
                  No submissions recorded yet.
                </div>
              )
            ) : (
              <div className="p-10 text-center text-gray-400 text-xs">
                {activeSubTab === 'solutions' 
                  ? 'Your shared solution templates and editorial notes will appear here.'
                  : 'Join the developer community discussion on algorithmic trade-offs.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Profile & Photo Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />
    </div>
  );
};
