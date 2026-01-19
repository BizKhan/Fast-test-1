/**
 * AudioManager - Handles audio playback for music and sound effects
 */
export class AudioManager {
  constructor() {
    this.musicVolume = 1.0;
    this.sfxVolume = 1.0;
    this.currentMusic = null;
    this.musicCache = new Map();
    this.sfxCache = new Map();
  }
  
  /**
   * Play background music
   * @param {string} id - Music identifier
   * @param {boolean} loop - Whether to loop the music
   */
  playMusic(id, loop = true) {
    // Stop current music if playing
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }
    
    // Get or create audio element
    let audio = this.musicCache.get(id);
    if (!audio) {
      audio = new Audio();
      audio.src = `/assets/music/${id}`;
      audio.volume = this.musicVolume;
      // Load the audio element before caching
      audio.load();
      this.musicCache.set(id, audio);
    }
    
    audio.loop = loop;
    audio.volume = this.musicVolume;
    audio.play().catch(err => {
      console.warn(`Could not play music ${id}:`, err);
    });
    
    this.currentMusic = audio;
  }
  
  /**
   * Stop current music
   */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }
  
  /**
   * Play a sound effect
   * @param {string} id - SFX identifier
   * @param {number} volume - Volume (0-1), defaults to sfxVolume
   */
  playSFX(id, volume = null) {
    // Get the cached src path, or create and cache it
    let srcPath = this.sfxCache.get(id);
    if (!srcPath) {
      srcPath = `/assets/sfx/${id}`;
      this.sfxCache.set(id, srcPath);
    }
    
    // Create a new Audio element for each play (reliable across all browsers)
    // This avoids cloneNode issues with media element state
    const audio = new Audio(srcPath);
    audio.volume = volume !== null ? volume : this.sfxVolume;
    audio.play().catch(err => {
      console.warn(`Could not play SFX ${id}:`, err);
    });
  }
  
  /**
   * Set music volume
   * @param {number} volume - Volume (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
    }
  }
  
  /**
   * Set SFX volume
   * @param {number} volume - Volume (0-1)
   */
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
}
