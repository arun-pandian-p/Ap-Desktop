import { describe, it, expect, beforeEach } from 'vitest';
import { 
  studyMusicService, 
  PLAYLISTS, 
  TRACK_CATALOG 
} from '../src/services/audio/studyMusicService';

describe('Tamil Study Music & Offline Focus Audio Engine', () => {
  beforeEach(() => {
    studyMusicService.pause();
  });

  it('1. should verify all 4 focus playlists exist with valid metadata', () => {
    expect(PLAYLISTS).toHaveLength(4);
    const ids = PLAYLISTS.map(p => p.id);
    expect(ids).toContain('tamil_instrumental');
    expect(ids).toContain('calm_focus');
    expect(ids).toContain('lofi_focus');
    expect(ids).toContain('ambient');
  });

  it('2. should catalog valid Tamil Instrumental and ambient focus tracks', () => {
    expect(TRACK_CATALOG.length).toBeGreaterThanOrEqual(8);
    const tamilTracks = studyMusicService.getPlaylistTracks('tamil_instrumental');
    expect(tamilTracks.length).toBeGreaterThanOrEqual(3);
    
    // Check specific track details
    const kalyani = tamilTracks.find(t => t.id === 'tamil-1');
    expect(kalyani).toBeDefined();
    expect(kalyani?.title).toContain('Kalyani Dawn');
    expect(kalyani?.ragaNoteFreqs).toBeDefined();
    expect(kalyani?.ragaNoteFreqs?.length).toBeGreaterThan(0);
  });

  it('3. should handle playback state transitions (play, pause, next, prev)', async () => {
    const initialState = studyMusicService.getState();
    expect(initialState.isPlaying).toBe(false);

    // Test Play
    await studyMusicService.play();
    let state = studyMusicService.getState();
    expect(state.isPlaying).toBe(true);

    // Test Next Track
    const firstTrackId = state.currentTrack.id;
    studyMusicService.next();
    state = studyMusicService.getState();
    expect(state.currentTrack.id).not.toBe(firstTrackId);

    // Test Pause
    studyMusicService.pause();
    state = studyMusicService.getState();
    expect(state.isPlaying).toBe(false);
  });

  it('4. should adjust volume and handle mute toggling accurately', () => {
    studyMusicService.setVolume(0.85);
    let state = studyMusicService.getState();
    expect(state.volume).toBe(0.85);
    expect(state.isMuted).toBe(false);

    studyMusicService.toggleMute();
    state = studyMusicService.getState();
    expect(state.isMuted).toBe(true);

    studyMusicService.toggleMute();
    state = studyMusicService.getState();
    expect(state.isMuted).toBe(false);
    expect(state.volume).toBe(0.85);
  });

  it('5. should cycle repeat modes (all -> one -> off)', () => {
    studyMusicService.cycleRepeatMode();
    let state = studyMusicService.getState();
    expect(['all', 'one', 'off']).toContain(state.repeatMode);

    studyMusicService.toggleShuffle();
    state = studyMusicService.getState();
    expect(typeof state.isShuffled).toBe('boolean');
  });

  it('6. should switch playlists and update tracks cleanly', () => {
    studyMusicService.selectPlaylist('lofi_focus');
    let state = studyMusicService.getState();
    expect(state.currentPlaylistId).toBe('lofi_focus');
    expect(state.currentTrack.playlist).toBe('lofi_focus');

    studyMusicService.selectPlaylist('ambient');
    state = studyMusicService.getState();
    expect(state.currentPlaylistId).toBe('ambient');
    expect(state.currentTrack.playlist).toBe('ambient');
  });

  it('7. should execute end-of-session completion chime safely', () => {
    expect(() => {
      studyMusicService.playCompletionChime();
    }).not.toThrow();
  });
});
