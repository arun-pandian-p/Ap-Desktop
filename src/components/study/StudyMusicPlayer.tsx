import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Music, 
  Headphones, 
  Sparkles, 
  Wind,
  Radio,
  Sliders
} from 'lucide-react';
import { 
  studyMusicService, 
  PLAYLISTS, 
  CUSTOM_PLAYLIST,
  PlaylistInfo, 
  Track, 
  RepeatMode 
} from '@/services/audio/studyMusicService';
import { Upload, Trash2 } from 'lucide-react';

interface StudyMusicPlayerProps {
  className?: string;
  autoStartWithTimer?: boolean;
}

export const StudyMusicPlayer: React.FC<StudyMusicPlayerProps> = ({
  className = '',
}) => {
  const [state, setState] = useState(studyMusicService.getState());
  const [customTracks, setCustomTracks] = useState(studyMusicService.getCustomTracks());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = studyMusicService.subscribe(() => {
      setState(studyMusicService.getState());
      setCustomTracks(studyMusicService.getCustomTracks());
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await studyMusicService.importAudioFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Failed to import audio file:', err);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const targetSeconds = (percent / 100) * state.duration;
    studyMusicService.seek(targetSeconds);
  };

  return (
    <div className={`p-4 bg-[#0F182B] rounded-2xl border border-[#1E2A44] shadow-md space-y-3 select-none ${className}`}>
      {/* Hidden File Input for Audio Importer */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/ogg,audio/wav,audio/*,.mp3,.ogg,.wav"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header & Playlist Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2A44] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E11D26]/20 border border-[#E11D26]/40 text-[#E11D26] flex items-center justify-center">
            <Radio className={`w-3.5 h-3.5 ${state.isPlaying ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Tamil Study Music</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">Offline</span>
            </h4>
            <p className="text-[10px] text-gray-400">Carnatic Veena, Flute & Lo-Fi Focus</p>
          </div>
        </div>

        {/* Playlist Selector Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {PLAYLISTS.map((pl) => {
            const isSelected = state.currentPlaylistId === pl.id;
            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => studyMusicService.selectPlaylist(pl.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#E11D26] text-white shadow-xs ring-1 ring-red-400/50'
                    : 'bg-[#142038] text-gray-400 hover:text-white hover:bg-[#1E2A44]'
                }`}
                title={pl.description}
              >
                {pl.name}
              </button>
            );
          })}

          {/* Custom Audio Tab */}
          <button
            type="button"
            onClick={() => studyMusicService.selectPlaylist('imported')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
              state.currentPlaylistId === 'imported'
                ? 'bg-[#EC4899] text-white shadow-xs ring-1 ring-pink-400/50'
                : 'bg-[#142038] text-gray-400 hover:text-white hover:bg-[#1E2A44]'
            }`}
            title="Imported personal audio tracks"
          >
            My Audio ({customTracks.length})
          </button>

          {/* Import Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            title="Import local .mp3, .ogg, or .wav focus audio"
          >
            <Upload className="w-3 h-3 text-red-400" />
            <span>+ Import</span>
          </button>
        </div>
      </div>

      {/* Currently Playing Track Info & Visualizer */}
      <div className="flex items-center justify-between gap-3 bg-[#142038] p-3 rounded-xl border border-[#1E2A44]">
        <div className="flex items-center gap-3 truncate">
          {/* Animated Audio Equalizer Bars */}
          <div className="flex items-end gap-0.5 h-5 w-5 shrink-0">
            {[0.4, 0.9, 0.6, 1.0, 0.5].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-[#E11D26] rounded-full transition-all duration-300"
                style={{
                  height: state.isPlaying ? `${Math.max(20, Math.min(100, Math.random() * 100))}%` : '20%',
                  animation: state.isPlaying ? `pulse 0.8s ease-in-out infinite alternate ${i * 0.15}s` : 'none'
                }}
              />
            ))}
          </div>

          <div className="truncate">
            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>{state.currentTrack.title}</span>
            </div>
            <div className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
              {state.currentTrack.artist} • {state.isUsingSynthFallback ? 'Synthesized Carnatic Ambient' : 'Local Offline Audio'}
            </div>
          </div>
        </div>

        {/* Shuffle & Repeat Controls */}
        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {state.currentTrack.isCustom && (
            <button
              type="button"
              onClick={() => studyMusicService.deleteCustomTrack(state.currentTrack.id)}
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:text-red-400 hover:bg-red-950/40 text-gray-400"
              title="Delete imported track"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => studyMusicService.toggleShuffle()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              state.isShuffled ? 'text-[#E11D26] bg-red-950/40' : 'hover:text-white hover:bg-[#1E2A44]'
            }`}
            title={state.isShuffled ? 'Shuffle: ON' : 'Shuffle: OFF'}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => studyMusicService.cycleRepeatMode()}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              state.repeatMode !== 'off' ? 'text-[#E11D26] bg-red-950/40' : 'hover:text-white hover:bg-[#1E2A44]'
            }`}
            title={`Repeat: ${state.repeatMode.toUpperCase()}`}
          >
            {state.repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar & Seek */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={100}
          value={progressPercent || 0}
          onChange={handleSeekChange}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#E11D26]"
        />
        <div className="flex justify-between text-[10px] font-mono text-gray-400">
          <span>{formatSeconds(state.currentTime)}</span>
          <span>{formatSeconds(state.duration)}</span>
        </div>
      </div>

      {/* Primary Playback & Volume Row */}
      <div className="flex items-center justify-between pt-1">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => studyMusicService.prev()}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E2A44] rounded-xl transition-colors cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => studyMusicService.togglePlay()}
            className="p-2.5 bg-[#E11D26] hover:bg-[#C8101A] text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            title={state.isPlaying ? 'Pause Music' : 'Play Music'}
          >
            {state.isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => studyMusicService.next()}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1E2A44] rounded-xl transition-colors cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Slider & Mute Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => studyMusicService.toggleMute()}
            className="text-gray-400 hover:text-white cursor-pointer"
            title={state.isMuted ? 'Unmute' : 'Mute'}
          >
            {state.isMuted || state.volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.isMuted ? 0 : state.volume}
            onChange={(e) => studyMusicService.setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#E11D26]"
            title={`Volume: ${Math.round((state.isMuted ? 0 : state.volume) * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
