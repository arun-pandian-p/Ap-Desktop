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
  playlist: 'tamil_instrumental' | 'calm_focus' | 'lofi_focus' | 'ambient' | 'imported';
  src: string;
  ragaNoteFreqs?: number[]; // Web Audio API procedural synthesis frequencies
  isCustom?: boolean;
}

export interface PlaylistInfo {
  id: 'tamil_instrumental' | 'calm_focus' | 'lofi_focus' | 'ambient' | 'imported';
  name: string;
  description: string;
  iconName: string;
  color: string;
}

export const CUSTOM_PLAYLIST: PlaylistInfo = {
  id: 'imported',
  name: 'My Audio',
  description: 'Personal imported focus audio tracks (.mp3, .ogg, .wav)',
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

  public getPlaylistTracks(playlistId: PlaylistInfo['id'] = this.currentPlaylistId): Track[] {
    if (playlistId === 'imported') {
      return this.customTracks;
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
    this.isPlaying = true;
    await this.playCurrentTrack();
  }

  public pause() {
    this.isPlaying = false;
    this.stopAudio();
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
  }

  private async playCurrentTrack() {
    this.stopAudio();
    const track = this.getCurrentTrack();
    this.duration = track.duration;
    this.currentTime = 0;

    // 1. Attempt to play real audio file if present
    try {
      if (!this.audioEl) {
        this.audioEl = new Audio();
        this.audioEl.addEventListener('timeupdate', () => {
          if (this.audioEl && !this.isUsingSynthFallback) {
            this.currentTime = this.audioEl.currentTime;
            this.notify();
          }
        });
        this.audioEl.addEventListener('ended', () => {
          this.handleTrackEnded();
        });
        this.audioEl.addEventListener('error', () => {
          // File missing on disk -> Seamlessly fallback to procedural Web Audio raga
          this.startSynthFallback(track);
        });
      }

      this.audioEl.src = track.src;
      this.audioEl.volume = this.isMuted ? 0 : this.volume;
      const playPromise = this.audioEl.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.isUsingSynthFallback = false;
        this.notify();
        return;
      }
    } catch {
      // Audio play blocked or file not found -> start synth
      this.startSynthFallback(track);
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
  private startSynthFallback(track: Track) {
    this.stopSynth();
    this.isUsingSynthFallback = true;

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
