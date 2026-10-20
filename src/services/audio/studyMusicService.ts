/**
 * Ap Workspace — Offline Tamil Study Music & Ambient Engine
 * Manages local audio playback, synthesized ambient raga backups,
 * playlists, volume, and session completion chimes.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  playlist: 'tamil_instrumental' | 'calm_focus' | 'lofi_focus' | 'ambient' | 'imported' | 'lofi' | 'piano' | 'nature' | 'whitenoise' | 'custom';
  category?: 'lofi' | 'ambient' | 'piano' | 'nature' | 'whitenoise' | 'custom';
  src: string;
  ragaNoteFreqs?: number[]; // Web Audio API procedural synthesis frequencies
  isCustom?: boolean;
  filename?: string;
}

export type MusicCategory = 'lofi' | 'ambient' | 'piano' | 'nature' | 'whitenoise' | 'custom';

export interface PlaylistInfo {
  id: 'tamil_instrumental' | 'calm_focus' | 'lofi_focus' | 'ambient' | 'imported' | 'lofi' | 'piano' | 'nature' | 'whitenoise' | 'custom';
  name: string;
  description: string;
  iconName: string;
  color: string;
}

export const CUSTOM_PLAYLIST: PlaylistInfo = {
  id: 'custom',
  name: 'Custom',
  description: 'Personal imported focus audio tracks (.mp3, .ogg, .wav, .m4a)',
  iconName: 'FolderMusic',
  color: '#EC4899'
};

export const PLAYLISTS: PlaylistInfo[] = [
  {
    id: 'tamil_instrumental',
    name: 'Tamil Instrumental',
    description: 'Veena harmonics, flute serenades, and traditional Carnatic ragas',
    iconName: 'Music',
    color: '#E11D26'
  },
  {
    id: 'calm_focus',
    name: 'Calm Focus',
    description: 'Tanpura drone, soft acoustic piano, and gentle rain vibes',
    iconName: 'Sparkles',
    color: '#3B82F6'
  },
  {
    id: 'lofi_focus',
    name: 'Lo-Fi Focus',
    description: 'Chill Tamil midnight beats (68 BPM) and relaxing mridangam chords',
    iconName: 'Headphones',
    color: '#8B5CF6'
  },
  {
    id: 'ambient',
    name: 'Ambient & Bells',
    description: 'Temple brass chimes, delta waves, and deep mountain meditation',
    iconName: 'Wind',
    color: '#10B981'
  }
];

export const MUSIC_CATEGORIES: { id: MusicCategory; name: string; description: string; icon: string }[] = [
  { id: 'lofi', name: 'Lo-fi', description: 'Chill midnight lo-fi study beats', icon: 'Headphones' },
  { id: 'ambient', name: 'Ambient', description: 'Veena harmonics and temple chimes', icon: 'Sparkles' },
  { id: 'piano', name: 'Piano', description: 'Acoustic piano and gentle melodies', icon: 'Music' },
  { id: 'nature', name: 'Nature Sounds', description: 'Forest rain, stream, and birds', icon: 'Wind' },
  { id: 'whitenoise', name: 'White Noise', description: 'Deep brown and pink noise', icon: 'Radio' },
  { id: 'custom', name: 'Custom', description: 'Locally imported focus audio tracks', icon: 'Music' },
];

export const TRACK_CATALOG: Track[] = [
  // 1. Tamil Instrumental
  {
    id: 'tamil-1',
    title: 'Kalyani Dawn (Veena Meditation)',
    artist: 'Ap Carnatic Collective',
    duration: 320,
    playlist: 'tamil_instrumental',
    src: '/audio/study/tamil-instrumental/veena_serenity.mp3',
    ragaNoteFreqs: [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88] // Kalyani
  },
  {
    id: 'tamil-2',
    title: 'Mohanam Flute Serenity',
    artist: 'Carnatic Bamboo Ensemble',
    duration: 295,
    playlist: 'tamil_instrumental',
    src: '/audio/study/tamil-instrumental/flute_meditation.mp3',
    ragaNoteFreqs: [261.63, 293.66, 329.63, 392.00, 440.00] // Mohanam pentatonic
  },
  {
    id: 'tamil-3',
    title: 'Hamsadhwani Flow (Violin Echoes)',
    artist: 'South Indian Acoustic Strings',
    duration: 340,
    playlist: 'tamil_instrumental',
    src: '/audio/study/tamil-instrumental/carnatic_ambient.mp3',
    ragaNoteFreqs: [261.63, 293.66, 329.63, 392.00, 493.88] // Hamsadhwani
  },

  // 2. Calm Focus
  {
    id: 'calm-1',
    title: 'Tanpura Drone & Soft Piano',
    artist: 'Mindful Acoustics',
    duration: 360,
    playlist: 'calm_focus',
    src: '/audio/study/calm-focus/tanpura_soft_piano.mp3',
    ragaNoteFreqs: [130.81, 196.00, 261.63, 392.00]
  },
  {
    id: 'calm-2',
    title: 'Morning Sitar & Stream',
    artist: 'Zen Raga Lab',
    duration: 310,
    playlist: 'calm_focus',
    src: '/audio/study/calm-focus/morning_raga_calm.mp3',
    ragaNoteFreqs: [146.83, 220.00, 293.66, 440.00]
  },

  // 3. Lo-Fi Focus
  {
    id: 'lofi-1',
    title: 'Tamil Midnight Lo-Fi Beats',
    artist: 'Chennai Chillhop Lab',
    duration: 280,
    playlist: 'lofi_focus',
    src: '/audio/study/lofi-focus/chill_tamil_beats.mp3',
    ragaNoteFreqs: [174.61, 220.00, 261.63, 329.63]
  },
  {
    id: 'lofi-2',
    title: 'Rooftop Breeze & Mridangam',
    artist: 'Marina Lo-Fi Studio',
    duration: 305,
    playlist: 'lofi_focus',
    src: '/audio/study/lofi-focus/rooftop_breeze_lofi.mp3',
    ragaNoteFreqs: [164.81, 196.00, 246.94, 329.63]
  },

  // 4. Ambient & Bells
  {
    id: 'ambient-1',
    title: 'Temple Brass Bells & Drone',
    artist: 'Sacred Acoustics',
    duration: 400,
    playlist: 'ambient',
    src: '/audio/study/ambient/temple_bells_drone.mp3',
    ragaNoteFreqs: [110.00, 164.81, 220.00, 329.63]
  },
  {
    id: 'ambient-2',
    title: 'Deep Nilgiri Mountain Wind',
    artist: 'Western Ghats Nature Sounds',
    duration: 380,
    playlist: 'ambient',
    src: '/audio/study/ambient/mountain_wind.mp3',
    ragaNoteFreqs: [98.00, 146.83, 196.00, 293.66]
  },

  // 5. Piano
  {
    id: 'piano-1',
    title: 'Moonlight Sonata Focus (Adagio)',
    artist: 'Classical Piano Lab',
    duration: 330,
    playlist: 'piano',
    category: 'piano',
    src: '/audio/study/piano/moonlight_sonata.mp3',
    ragaNoteFreqs: [220.00, 261.63, 329.63, 440.00]
  },
  {
    id: 'piano-2',
    title: 'Soft Nocturne Reverie',
    artist: 'Quiet Keys Project',
    duration: 290,
    playlist: 'piano',
    category: 'piano',
    src: '/audio/study/piano/soft_nocturne.mp3',
    ragaNoteFreqs: [174.61, 220.00, 261.63, 349.23]
  },

  // 6. Nature Sounds
  {
    id: 'nature-1',
    title: 'Gentle Rain on Cedar Leaves',
    artist: 'Rainforest Acoustics',
    duration: 420,
    playlist: 'nature',
    category: 'nature',
    src: '/audio/study/nature/cedar_rain.mp3',
    ragaNoteFreqs: [130.81, 164.81, 196.00, 261.63]
  },
  {
    id: 'nature-2',
    title: 'Forest Stream & Birds at Dawn',
    artist: 'Wilderness Ambience',
    duration: 360,
    playlist: 'nature',
    category: 'nature',
    src: '/audio/study/nature/forest_stream.mp3',
    ragaNoteFreqs: [146.83, 196.00, 220.00, 293.66]
  },

  // 7. White Noise
  {
    id: 'whitenoise-1',
    title: 'Deep Brown Noise (Deep Work)',
    artist: 'Neural Wave Acoustics',
    duration: 450,
    playlist: 'whitenoise',
    category: 'whitenoise',
    src: '/audio/study/whitenoise/brown_noise.mp3',
    ragaNoteFreqs: [82.41, 110.00, 146.83, 196.00]
  },
  {
    id: 'whitenoise-2',
    title: 'Pink Noise Gentle Stream',
    artist: 'Focus Frequency Lab',
    duration: 400,
    playlist: 'whitenoise',
    category: 'whitenoise',
    src: '/audio/study/whitenoise/pink_noise.mp3',
    ragaNoteFreqs: [98.00, 130.81, 164.81, 246.94]
  }
];

export type RepeatMode = 'off' | 'all' | 'one';

class StudyMusicService {
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthNodes: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
  private synthInterval: any = null;

  private customTracks: Track[] = [];
  private currentTrackIndex = 0;
  private currentPlaylistId: PlaylistInfo['id'] = 'tamil_instrumental';
  private isPlaying = false;
  private volume = 0.75;
  private isMuted = false;
  private repeatMode: RepeatMode = 'all';
  private isShuffled = false;
  private isUsingSynthFallback = false;
  private currentTime = 0;
  private duration = 300;

  private listeners = new Set<() => void>();

  constructor() {
    this.loadPersistedSettings();
    this.loadCustomTracks();
    this.loadElectronManagedAudio();
    this.initAudioElement();
  }

  private initAudioElement() {
    if (typeof Audio === 'undefined') return;
    if (this.audioEl) return;
    try {
      this.audioEl = new Audio();
      this.audioEl.addEventListener('timeupdate', () => {
        if (this.audioEl && !this.isUsingSynthFallback) {
          this.currentTime = Math.floor(this.audioEl.currentTime);
          this.notify();
        }
      });
      this.audioEl.addEventListener('ended', () => {
        this.handleTrackEnded();
      });
      this.audioEl.addEventListener('error', () => {
        if (this.isPlaying) {
          this.startSynthFallback(this.getCurrentTrack(), false);
        }
      });
    } catch (e) {
      console.warn('Audio element initialization failed:', e);
    }
  }

  public async loadElectronManagedAudio() {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.listManagedAudio) {
      try {
        const res = await (window as any).electronAPI.listManagedAudio();
        if (res && res.success && Array.isArray(res.files)) {
          const electronTracks: Track[] = res.files.map((f: any) => ({
            id: `managed-${f.id}`,
            title: f.title || f.filename,
            artist: 'Imported Focus Audio',
            duration: f.duration || 180,
            playlist: 'custom',
            category: 'custom',
            src: `file:///${f.filepath.replace(/\\/g, '/')}`,
            isCustom: true,
            filename: f.filename,
          }));
          const existingIds = new Set(this.customTracks.map(t => t.id));
          const newTracks = electronTracks.filter(t => !existingIds.has(t.id));
          if (newTracks.length > 0) {
            this.customTracks = [...this.customTracks, ...newTracks];
            this.saveCustomTracks();
            this.notify();
          }
        }
      } catch (e) {
        console.warn('Failed to load electron managed audio:', e);
      }
    }
  }

  private loadPersistedSettings() {
    try {
      const savedVol = localStorage.getItem('ap_music_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol);

      const savedPlaylist = localStorage.getItem('ap_music_playlist');
      if (savedPlaylist && (PLAYLISTS.some(p => p.id === savedPlaylist) || savedPlaylist === 'imported')) {
        this.currentPlaylistId = savedPlaylist as any;
      }

      const savedRepeat = localStorage.getItem('ap_music_repeat');
      if (savedRepeat && ['off', 'all', 'one'].includes(savedRepeat)) {
        this.repeatMode = savedRepeat as RepeatMode;
      }

      const savedShuffle = localStorage.getItem('ap_music_shuffle');
      if (savedShuffle !== null) this.isShuffled = savedShuffle === 'true';
    } catch {}
  }

  private loadCustomTracks() {
    try {
      const raw = localStorage.getItem('ap_custom_study_tracks');
      if (raw) {
        this.customTracks = JSON.parse(raw);
      }
    } catch {}
  }

  private saveCustomTracks() {
    try {
      localStorage.setItem('ap_custom_study_tracks', JSON.stringify(this.customTracks));
    } catch {}
  }

  public async importAudioFile(file: File): Promise<Track> {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        const track: Track = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Personal Focus Audio',
          duration: 180,
          playlist: 'imported',
          src: 'data:audio/mp3;base64,',
          isCustom: true,
        };
        this.customTracks.push(track);
        this.saveCustomTracks();
        this.selectPlaylist('imported');
        this.notify();
        return resolve(track);
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          if (typeof Audio === 'undefined') {
            const track: Track = {
              id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              title: file.name.replace(/\.[^/.]+$/, ''),
              artist: 'Personal Focus Audio',
              duration: 180,
              playlist: 'imported',
              src: dataUrl,
              isCustom: true,
            };
            this.customTracks.push(track);
            this.saveCustomTracks();
            this.selectPlaylist('imported');
            this.notify();
            return resolve(track);
          }

          const tempAudio = new Audio(dataUrl);
          tempAudio.addEventListener('loadedmetadata', () => {
            const track: Track = {
              id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              title: file.name.replace(/\.[^/.]+$/, ''),
              artist: 'Personal Focus Audio',
              duration: Math.round(tempAudio.duration) || 180,
              playlist: 'imported',
              src: dataUrl,
              isCustom: true,
            };

            this.customTracks.push(track);
            this.saveCustomTracks();
            this.selectPlaylist('imported');
            this.notify();
            resolve(track);
          });
          tempAudio.addEventListener('error', () => {
            const track: Track = {
              id: `custom-${Date.now()}`,
              title: file.name.replace(/\.[^/.]+$/, ''),
              artist: 'Personal Focus Audio',
              duration: 240,
              playlist: 'imported',
              src: dataUrl,
              isCustom: true,
            };
            this.customTracks.push(track);
            this.saveCustomTracks();
            this.selectPlaylist('imported');
            this.notify();
            resolve(track);
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  public deleteCustomTrack(trackId: string) {
    this.customTracks = this.customTracks.filter(t => t.id !== trackId);
    this.saveCustomTracks();
    if (this.currentPlaylistId === 'imported') {
      if (this.currentTrackIndex >= this.customTracks.length) {
        this.currentTrackIndex = Math.max(0, this.customTracks.length - 1);
      }
    }
    this.notify();
  }

  public getCustomTracks(): Track[] {
    return [...this.customTracks];
  }

  private saveSettings() {
    try {
      localStorage.setItem('ap_music_volume', this.volume.toString());
      localStorage.setItem('ap_music_playlist', this.currentPlaylistId);
      localStorage.setItem('ap_music_repeat', this.repeatMode);
      localStorage.setItem('ap_music_shuffle', this.isShuffled.toString());
    } catch {}
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch {}
    });
  }

  public async deleteManagedTrack(trackId: string, filename?: string) {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.deleteManagedAudio && filename) {
      try {
        await (window as any).electronAPI.deleteManagedAudio(filename);
      } catch (e) {
        console.warn('Failed to delete managed audio from disk:', e);
      }
    }
    this.deleteCustomTrack(trackId);
  }

  public getPlaylistTracks(playlistId: PlaylistInfo['id'] = this.currentPlaylistId): Track[] {
    if (playlistId === 'imported' || playlistId === 'custom') {
      return this.customTracks;
    }
    if (playlistId === 'lofi') {
      return TRACK_CATALOG.filter(t => t.playlist === 'lofi' || t.playlist === 'lofi_focus');
    }
    return TRACK_CATALOG.filter(t => t.playlist === playlistId);
  }

  public getCurrentTrack(): Track {
    const tracks = this.getPlaylistTracks();
    return tracks[this.currentTrackIndex] || tracks[0] || (this.customTracks.length > 0 ? this.customTracks[0] : TRACK_CATALOG[0]);
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.getCurrentTrack(),
      currentPlaylistId: this.currentPlaylistId,
      volume: this.volume,
      isMuted: this.isMuted,
      repeatMode: this.repeatMode,
      isShuffled: this.isShuffled,
      currentTime: this.currentTime,
      duration: this.duration,
      isUsingSynthFallback: this.isUsingSynthFallback,
    };
  }

  public selectPlaylist(playlistId: PlaylistInfo['id']) {
    if (this.currentPlaylistId === playlistId) return;
    this.currentPlaylistId = playlistId;
    this.currentTrackIndex = 0;
    this.saveSettings();
    if (this.isPlaying) {
      this.playCurrentTrack();
    } else {
      this.notify();
    }
  }

  public selectTrack(trackId: string) {
    const tracks = this.getPlaylistTracks();
    const idx = tracks.findIndex(t => t.id === trackId);
    if (idx >= 0) {
      this.currentTrackIndex = idx;
      this.playCurrentTrack();
    }
  }

  public async play() {
    if (this.isPlaying) return;

    // If resuming current track where we paused
    if (this.currentTime > 0) {
      if (!this.isUsingSynthFallback && this.audioEl && this.audioEl.src) {
        try {
          this.isPlaying = true;
          this.audioEl.volume = this.isMuted ? 0 : this.volume;
          await this.audioEl.play();
          this.notify();
          return;
        } catch {
          // If HTMLAudio cannot resume, fallback to synth without zeroing time
          this.startSynthFallback(this.getCurrentTrack(), false);
          return;
        }
      } else if (this.isUsingSynthFallback) {
        this.isPlaying = true;
        this.resumeSynthFallback(this.getCurrentTrack());
        return;
      }
    }

    this.isPlaying = true;
    await this.playCurrentTrack();
  }

  public pause() {
    this.isPlaying = false;
    if (this.audioEl && !this.isUsingSynthFallback) {
      try {
        this.audioEl.pause();
      } catch {}
    }
    this.pauseSynth();
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public next() {
    const tracks = this.getPlaylistTracks();
    if (tracks.length === 0) return;

    if (this.isShuffled) {
      this.currentTrackIndex = Math.floor(Math.random() * tracks.length);
    } else {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % tracks.length;
    }

    if (this.isPlaying) {
      this.playCurrentTrack();
    } else {
      this.currentTime = 0;
      this.notify();
    }
  }

  public prev() {
    const tracks = this.getPlaylistTracks();
    if (tracks.length === 0) return;

    this.currentTrackIndex = (this.currentTrackIndex - 1 + tracks.length) % tracks.length;

    if (this.isPlaying) {
      this.playCurrentTrack();
    } else {
      this.currentTime = 0;
      this.notify();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioEl) {
      this.audioEl.volume = this.isMuted ? 0 : this.volume;
    }
    if (this.synthNodes && this.synthNodes.gain) {
      this.synthNodes.gain.gain.value = this.isMuted ? 0 : this.volume * 0.12;
    }
    this.saveSettings();
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
  }

  public toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    this.saveSettings();
    this.notify();
  }

  public cycleRepeatMode() {
    const modes: RepeatMode[] = ['all', 'one', 'off'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    this.saveSettings();
    this.notify();
  }

  public seek(seconds: number) {
    this.currentTime = seconds;
    if (this.audioEl && !this.isUsingSynthFallback) {
      try {
        this.audioEl.currentTime = seconds;
      } catch {}
    }
    this.notify();
  }

  private stopAudio() {
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      } catch {}
    }
    this.stopSynth();
    this.currentTime = 0;
  }

  private async playCurrentTrack() {
    this.stopAudio();
    const track = this.getCurrentTrack();
    this.duration = track.duration;
    this.currentTime = 0;
    this.isPlaying = true;

    // 1. Attempt to play real audio file if present
    try {
      this.initAudioElement();

      if (this.audioEl) {
        this.audioEl.src = track.src;
        this.audioEl.volume = this.isMuted ? 0 : this.volume;
        const playPromise = this.audioEl.play();
        if (playPromise !== undefined) {
          await playPromise;
          this.isUsingSynthFallback = false;
          this.notify();
          return;
        }
      }
    } catch {
      // Audio play blocked or file not found -> start synth
      this.startSynthFallback(track, true);
    }
  }

  private handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.playCurrentTrack();
    } else if (this.repeatMode === 'all') {
      this.next();
    } else {
      const tracks = this.getPlaylistTracks();
      if (this.currentTrackIndex < tracks.length - 1) {
        this.next();
      } else {
        this.pause();
      }
    }
  }

  // -------------------------------------------------------------
  // Web Audio API Ambient Procedural Raga Engine (100% Offline)
  // -------------------------------------------------------------
  private pauseSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try {
        this.audioCtx.suspend();
      } catch {}
    }
  }

  private resumeSynthFallback(track: Track) {
    if (!this.synthNodes || !this.audioCtx) {
      this.startSynthFallback(track, false);
      return;
    }

    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch {}

    if (!this.synthInterval) {
      this.synthInterval = setInterval(() => {
        if (this.isPlaying && this.isUsingSynthFallback) {
          this.currentTime += 1;
          if (this.currentTime >= this.duration) {
            this.handleTrackEnded();
          }
          this.notify();
        }
      }, 1000);
    }
    this.notify();
  }

  private startSynthFallback(track: Track, resetTime = true) {
    this.stopSynth();
    this.isUsingSynthFallback = true;
    if (resetTime) {
      this.currentTime = 0;
    }

    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const masterGain = this.audioCtx.createGain();
      masterGain.gain.value = this.isMuted ? 0 : this.volume * 0.14;
      masterGain.connect(this.audioCtx.destination);

      const notes = track.ragaNoteFreqs || [261.63, 329.63, 392.00, 440.00];
      const oscs: OscillatorNode[] = [];

      // Create rich drone chord with slight detune for lush resonance
      notes.slice(0, 4).forEach((freq, i) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const noteGain = this.audioCtx.createGain();

        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        osc.detune.setValueAtTime((i - 1.5) * 4, this.audioCtx.currentTime);

        noteGain.gain.setValueAtTime(0.08 / (i + 1), this.audioCtx.currentTime);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start();
        oscs.push(osc);
      });

      this.synthNodes = { oscs, gain: masterGain };

      // Gentle procedural progress ticker
      this.synthInterval = setInterval(() => {
        if (this.isPlaying && this.isUsingSynthFallback) {
          this.currentTime += 1;
          if (this.currentTime >= this.duration) {
            this.handleTrackEnded();
          }
          this.notify();
        }
      }, 1000);

      this.notify();
    } catch (e) {
      console.warn('Web Audio synthesis failed:', e);
    }
  }

  private stopSynth() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthNodes) {
      try {
        this.synthNodes.oscs.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch {}
        });
        this.synthNodes.gain.disconnect();
      } catch {}
      this.synthNodes = null;
    }
  }

  /**
   * Play high-resonance end of session notification chime
   */
  public playCompletionChime() {
    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Pentatonic bell harmony: C5 -> E5 -> G5 -> C6
      const chimeFreqs = [523.25, 659.25, 783.99, 1046.50];
      chimeFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 2.0);
      });
    } catch (e) {
      console.warn('Completion chime audio error:', e);
    }
  }
}

export const studyMusicService = new StudyMusicService();
