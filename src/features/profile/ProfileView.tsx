import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Building2, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter, 
  Award, 
  Trophy, 
  Flame, 
  Camera, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { UserProfile, ScreenId } from '@/types';
import { getUserProfile, saveUserProfile } from '@/services/profile';
import { EditProfileModal } from '@/components/dialogs/EditProfileModal';

interface ProfileViewProps {
  onNavigate?: (screen: ScreenId) => void;
  onShowToast?: (title: string, type?: 'success' | 'warning' | 'error' | 'info', body?: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Sync profile on mount and event
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
    };
    window.addEventListener('ap_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('ap_profile_updated', handleProfileUpdate);
  }, []);

  const handleSaveProfile = async (updated: UserProfile) => {
    const saved = await saveUserProfile(updated);
    setProfile(saved);
    if (onShowToast) {
      onShowToast('Profile Updated Successfully', 'success', 'Your portfolio and settings have been saved.');
    }
  };

  // Generate 52 weeks of realistic heatmap data
  const weeks = 52;
  const daysPerWeek = 7;
  // Seeded mock distribution for the 52-week activity
  const heatmapData = React.useMemo(() => {
    const grid: number[][] = [];
    for (let w = 0; w < weeks; w++) {
      const col: number[] = [];
      for (let d = 0; d < daysPerWeek; d++) {
        // High density activity simulating user's screenshot
        const seed = (w * 7 + d * 13) % 100;
        let level = 0;
        if (seed > 85) level = 4;
        else if (seed > 60) level = 3;
        else if (seed > 35) level = 2;
        else if (seed > 15) level = 1;
        col.push(level);
      }
      grid.push(col);
    }
    return grid;
  }, []);

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 4: return 'bg-[#39D353]'; // Bright neon green
      case 3: return 'bg-[#26A641]'; // Vibrant green
      case 2: return 'bg-[#006D32]'; // Deep green
      case 1: return 'bg-[#0E4429]'; // Subtle green
      default: return 'bg-[#232733]'; // Inactive dark gray
    }
  };

  // Rating history points for SVG chart
  const ratingPoints = [
    { x: 20, y: 70 },
    { x: 50, y: 72 },
    { x: 70, y: 75 },
    { x: 100, y: 71 },
    { x: 130, y: 70 },
    { x: 170, y: 69 },
    { x: 210, y: 68 },
    { x: 240, y: 68 },
    { x: 270, y: 67 },
    { x: 300, y: 65 },
    { x: 330, y: 60 },
    { x: 350, y: 55 },
    { x: 370, y: 50 },
    { x: 390, y: 46 },
    { x: 410, y: 42 },
  ];

  const svgPathD = ratingPoints.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
  }, '');

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

        {/* Main 2-Column Grid matching 2nd uploaded image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT CARD: User Identity & Bio & Socials (4 Cols) */}
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
                    @{profile.username}
                  </p>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#252A38] text-[11px] font-mono text-cyan-400 border border-[#31374A]">
                    <span>Rank :</span>
                    <strong className="text-white">{profile.rank}</strong>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="text-xs text-gray-300 italic leading-relaxed bg-[#1E212B] p-3 rounded-xl border border-[#2A2E3D]">
                "{profile.bio || 'Insanely mad about coding'}"
              </div>

              {/* Identity Details */}
              <div className="space-y-2.5 text-xs text-gray-300">
                {profile.location && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </div>
                )}
                {profile.institution && (
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{profile.institution}</span>
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
                    <span className="truncate font-mono">{profile.github}</span>
                  </div>
                )}
                {profile.linkedin && (
                  <div className="flex items-center gap-2.5">
                    <Linkedin className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate font-mono">{profile.linkedin}</span>
                  </div>
                )}
                {profile.twitter && (
                  <div className="flex items-center gap-2.5">
                    <Twitter className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate font-mono">@{profile.twitter}</span>
                  </div>
                )}
              </div>

              {/* Skills Tags */}
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Technical Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#252A3A] border border-[#31374C] text-[11px] font-mono text-gray-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="mt-6 w-full py-2 bg-[#252A3A] hover:bg-[#2D3346] text-gray-200 text-xs font-semibold rounded-xl border border-[#31374C] transition-colors cursor-pointer text-center"
            >
              Edit Profile Settings
            </button>
          </div>

          {/* RIGHT COLUMN: Solved Stats + Contest Rating (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* CARD 2: Problems Solved Dial & Category Progress */}
            <div className="bg-[#181A22] rounded-2xl border border-[#262A38] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-gray-400">@{profile.username}</span>
                <span className="text-xs font-mono text-gray-500">#{profile.rank}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Circular Radial Gauge */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* SVG Gauge Circles */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#262A38"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      {/* Progress arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="#F59E0B"
                        strokeWidth="8"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 * (1 - 0.72)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute text-center">
                      <div className="text-3xl font-extrabold text-white font-mono">
                        {profile.solved.total}
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">solved</div>
                    </div>
                  </div>
                </div>

                {/* Category Progress Bars */}
                <div className="md:col-span-7 space-y-3.5 font-sans">
                  {/* Easy */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-semibold">Easy</span>
                      <span className="font-mono text-gray-300">
                        <strong>{profile.solved.easy}</strong> <span className="text-gray-500">/{profile.solved.easyTotal}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#262A38] overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(profile.solved.easy / profile.solved.easyTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-amber-400 font-semibold">Medium</span>
                      <span className="font-mono text-gray-300">
                        <strong>{profile.solved.medium}</strong> <span className="text-gray-500">/{profile.solved.mediumTotal}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#262A38] overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(profile.solved.medium / profile.solved.mediumTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Hard */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-red-400 font-semibold">Hard</span>
                      <span className="font-mono text-gray-300">
                        <strong>{profile.solved.hard}</strong> <span className="text-gray-500">/{profile.solved.hardTotal}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#262A38] overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(profile.solved.hard / profile.solved.hardTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: Contest Rating & Rankings */}
            <div className="bg-[#181A22] rounded-2xl border border-[#262A38] p-6 shadow-xl">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-[11px] text-gray-400 font-medium">Contest Rating</div>
                  <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5">
                    {profile.contestRating}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 font-medium">Global Ranking</div>
                  <div className="text-xs font-bold text-gray-200 font-mono mt-1">
                    <span className="text-cyan-400 font-extrabold text-sm">{profile.globalRanking.split(' ')[0]}</span>
                    <span className="text-gray-500 text-[10px]"> {profile.globalRanking.split(' ').slice(1).join(' ')}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 font-medium">Attended</div>
                  <div className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5">
                    {profile.attendedContests}
                  </div>
                </div>
              </div>

              {/* Progression Line Chart */}
              <div className="pt-2">
                <div className="relative h-24 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 440 90">
                    {/* Trend Line */}
                    <path
                      d={svgPathD}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Points */}
                    {ratingPoints.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r="2.5"
                        fill="#F59E0B"
                        className="transition-transform hover:scale-150"
                      />
                    ))}
                  </svg>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1">
                  <span>2022</span>
                  <span>2023</span>
                  <span>2024</span>
                  <span>2025</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* CARD 4: Heatmap (Last 52 Weeks) - Full Width at Bottom */}
        <div className="bg-[#181A22] rounded-2xl border border-[#262A38] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Heatmap (Last 52 Weeks)</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
              <span>Active Days: <strong className="text-white">312</strong></span>
              <span>Longest Streak: <strong className="text-emerald-400">42 Days</strong></span>
            </div>
          </div>

          {/* 52-Column Activity Grid */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1 min-w-[720px] justify-between">
              {heatmapData.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((level, dIdx) => (
                    <div
                      key={dIdx}
                      className={`w-2.5 h-2.5 rounded-2xs transition-colors hover:ring-1 hover:ring-white ${getHeatmapColor(level)}`}
                      title={`Week ${wIdx + 1}, Day ${dIdx + 1}: ${level * 3} activities`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono mt-3 px-1">
              <span>2/25/2024</span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span>Less</span>
                <div className="w-2 h-2 rounded-2xs bg-[#232733]" />
                <div className="w-2 h-2 rounded-2xs bg-[#0E4429]" />
                <div className="w-2 h-2 rounded-2xs bg-[#006D32]" />
                <div className="w-2 h-2 rounded-2xs bg-[#26A641]" />
                <div className="w-2 h-2 rounded-2xs bg-[#39D353]" />
                <span>More</span>
              </div>
              <span>2/27/2025</span>
            </div>
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
