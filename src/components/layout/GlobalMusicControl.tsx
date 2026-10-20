import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sparkles, 
  Wind, 
  Music, 
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  studyMusicService, 
  PLAYLISTS, 
  PlaylistInfo, 
  Track 
} from '@/services/audio/studyMusicService';
import { ScreenId } from '@/types';

interface GlobalMusicControlProps {
  onNavigate?: (screen: ScreenId) => void;
}

export const GlobalMusicControl: React.FC<GlobalMusicControlProps> = ({ onNavigate }) => {
  const [state, setState] = useState(studyMusicService.getState());
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = studyMusicService.subscribe(() => {
      setState(studyMusicService.getState());
    });
    return () => unsub();
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    studyMusicService.togglePlay();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    studyMusicService.next();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    studyMusicService.prev();
  };

  const currentTrack = state.currentTrack;
  const currentCategory = PLAYLISTS.find(p => p.id === state.currentPlaylistId) || PLAYLISTS[0];

  return (
    <div className="relative select-none" ref={popoverRef}>
      {/* Titlebar Music Pill */}
      <div 
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
          state.isPlaying
            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 text-purple-700 dark:text-purple-300'
            : 'bg-gray-50 dark:bg-[#142038] border-gray-200 dark:border-[#1E2A44] text-gray-600 dark:text-gray-300'
        }`}
        title={`Focus Music: ${currentTrack?.title || 'Study Music'} - Click for music player`}
      >
        <Headphones className={`w-3.5 h-3.5 ${state.isPlaying ? 'animate-bounce text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
        
        <span className="max-w-[100px] truncate text-[11px] font-medium hidden sm:inline-block">
          {currentTrack?.title || 'Focus Audio'}
        </span>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title={state.isPlaying ? 'Pause Music' : 'Play Music'}
        >
          {state.isPlaying ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current" />
          )}
        </button>

        {/* Skip Track Button */}
        <button
          type="button"
          onClick={handleNext}
          className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Next Track"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* Music Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-[#0F182B] rounded-2xl border border-[#E8EAF2] dark:border-[#1E2A44] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1E2A44] pb-2 mb-3">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
              <Headphones className="w-4 h-4 text-purple-600" />
              <span>Ap Focus Music & Ambience</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Playing Track Card */}
          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 mb-3 space-y-1">
            <div className="font-bold text-gray-900 dark:text-white truncate text-xs">
              {currentTrack?.title || 'Study Music'}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {currentTrack?.artist || 'Ap Audio Engine'} • {currentCategory.name}
            </div>
          </div>

          {/* Player Controls (Prev / Play / Next / Volume) */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl border border-gray-200 dark:border-[#1E2A44] hover:bg-gray-100 dark:hover:bg-[#142038] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                {state.isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-2 rounded-xl border border-gray-200 dark:border-[#1E2A44] hover:bg-gray-100 dark:hover:bg-[#142038] text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume & Mute */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => studyMusicService.toggleMute()}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                title={state.isMuted ? 'Unmute' : 'Mute'}
              >
                {state.isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.isMuted ? 0 : state.volume}
                onChange={(e) => studyMusicService.setVolume(parseFloat(e.target.value))}
                className="w-16 accent-purple-600 cursor-pointer"
                title={`Volume: ${Math.round(state.volume * 100)}%`}
              />
            </div>
          </div>

          {/* Categories Grid: Lo-fi, Ambient, Piano, Nature Sounds, White Noise, Custom */}
          <div className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Categories
            </div>
            <div className="grid grid-cols-3 gap-1">
              {PLAYLISTS.map((pl) => {
                const isSelected = state.currentPlaylistId === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={() => studyMusicService.selectPlaylist(pl.id)}
                    className={`p-2 rounded-xl text-left border text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-2xs'
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-[#142038] text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <div className="truncate font-bold">{pl.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Link to Music Library in Settings */}
          {onNavigate && (
            <div className="border-t border-gray-100 dark:border-[#1E2A44] pt-2 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Manage audio files</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('settings');
                }}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Music Library</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
