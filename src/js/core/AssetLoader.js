/**
 * AssetLoader - Utility to preload Images, Audio, and Video files
 */
export class AssetLoader {
  constructor() {
    this.images = new Map();
    this.audio = new Map();
    this.videos = new Map();
    this.loadedCount = 0;
    this.totalCount = 0;
    this.onProgress = null;
    this.onComplete = null;
  }
  
  /**
   * Load an image
   * @param {string} id - Asset identifier
   * @param {string} path - Path to image file
   * @returns {Promise<Image>}
   */
  loadImage(id, path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        this.onAssetLoaded();
        resolve(img);
      };
      img.onerror = () => {
        // Count failed assets toward completion to prevent blocking
        this.onAssetLoaded();
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });
  }
  
  /**
   * Load an audio file
   * @param {string} id - Asset identifier
   * @param {string} path - Path to audio file
   * @returns {Promise<HTMLAudioElement>}
   */
  loadAudio(id, path) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        this.audio.set(id, audio);
        this.onAssetLoaded();
        resolve(audio);
      };
      audio.onerror = () => {
        // Count failed assets toward completion to prevent blocking
        this.onAssetLoaded();
        reject(new Error(`Failed to load audio: ${path}`));
      };
      audio.src = path;
      audio.load();
    });
  }
  
  /**
   * Load a video file
   * @param {string} id - Asset identifier
   * @param {string} path - Path to video file
   * @returns {Promise<HTMLVideoElement>}
   */
  loadVideo(id, path) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.oncanplaythrough = () => {
        this.videos.set(id, video);
        this.onAssetLoaded();
        resolve(video);
      };
      video.onerror = () => {
        // Count failed assets toward completion to prevent blocking
        this.onAssetLoaded();
        reject(new Error(`Failed to load video: ${path}`));
      };
      video.src = path;
      video.load();
    });
  }
  
  /**
   * Start a new loading batch (resets counters)
   * Call this before loading multiple batches to ensure correct progress tracking
   */
  startBatch() {
    this.loadedCount = 0;
    this.totalCount = 0;
  }
  
  /**
   * Load multiple images
   * @param {Array<{id: string, path: string}>} assets - Array of image assets
   * @param {boolean} newBatch - If true, resets counters before loading (default: false)
   * @returns {Promise<void>}
   */
  loadImages(assets, newBatch = false) {
    // Reset if explicitly starting new batch, or if previous batch is complete, or if no batch is active
    if (newBatch || this.totalCount === 0 || this.loadedCount >= this.totalCount) {
      this.startBatch();
    }
    this.totalCount += assets.length;
    return Promise.all(assets.map(asset => this.loadImage(asset.id, asset.path)));
  }
  
  /**
   * Load multiple audio files
   * @param {Array<{id: string, path: string}>} assets - Array of audio assets
   * @param {boolean} newBatch - If true, resets counters before loading (default: false)
   * @returns {Promise<void>}
   */
  loadAudioFiles(assets, newBatch = false) {
    // Reset if explicitly starting new batch, or if previous batch is complete, or if no batch is active
    if (newBatch || this.totalCount === 0 || this.loadedCount >= this.totalCount) {
      this.startBatch();
    }
    this.totalCount += assets.length;
    return Promise.all(assets.map(asset => this.loadAudio(asset.id, asset.path)));
  }
  
  /**
   * Load multiple video files
   * @param {Array<{id: string, path: string}>} assets - Array of video assets
   * @param {boolean} newBatch - If true, resets counters before loading (default: false)
   * @returns {Promise<void>}
   */
  loadVideos(assets, newBatch = false) {
    // Reset if explicitly starting new batch, or if previous batch is complete, or if no batch is active
    if (newBatch || this.totalCount === 0 || this.loadedCount >= this.totalCount) {
      this.startBatch();
    }
    this.totalCount += assets.length;
    return Promise.all(assets.map(asset => this.loadVideo(asset.id, asset.path)));
  }
  
  /**
   * Called when an asset finishes loading
   */
  onAssetLoaded() {
    this.loadedCount++;
    const progress = this.totalCount > 0 ? this.loadedCount / this.totalCount : 1;
    
    if (this.onProgress) {
      this.onProgress(progress, this.loadedCount, this.totalCount);
    }
    
    if (this.loadedCount >= this.totalCount && this.onComplete) {
      this.onComplete();
    }
  }
  
  /**
   * Get loaded image
   * @param {string} id - Asset identifier
   * @returns {Image|null}
   */
  getImage(id) {
    return this.images.get(id) || null;
  }
  
  /**
   * Get loaded audio
   * @param {string} id - Asset identifier
   * @returns {HTMLAudioElement|null}
   */
  getAudio(id) {
    return this.audio.get(id) || null;
  }
  
  /**
   * Get loaded video
   * @param {string} id - Asset identifier
   * @returns {HTMLVideoElement|null}
   */
  getVideo(id) {
    return this.videos.get(id) || null;
  }
  
  /**
   * Reset loader state
   */
  reset() {
    this.loadedCount = 0;
    this.totalCount = 0;
  }
  
  /**
   * Check if a number is a power of two
   * @param {number} n - Number to check
   * @returns {boolean}
   */
  static isPowerOfTwo(n) {
    return n && (n & (n - 1)) === 0;
  }
  
  /**
   * Validate if image dimensions are power of two (for GPU efficiency)
   * @param {Image} img - Image to validate
   * @returns {{valid: boolean, width: number, height: number, message: string}}
   */
  static validatePO2(img) {
    const widthValid = AssetLoader.isPowerOfTwo(img.width);
    const heightValid = AssetLoader.isPowerOfTwo(img.height);
    const valid = widthValid && heightValid;
    
    let message = '';
    if (!valid) {
      message = `⚠️ Non-PO2 dimensions: ${img.width}×${img.height}. `;
      if (!widthValid) message += `Width should be ${AssetLoader.nearestPO2(img.width)}. `;
      if (!heightValid) message += `Height should be ${AssetLoader.nearestPO2(img.height)}.`;
    }
    
    return { valid, width: img.width, height: img.height, message };
  }
  
  /**
   * Get nearest power of two (rounds up)
   * @param {number} n - Number
   * @returns {number}
   */
  static nearestPO2(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }
  
  /**
   * Load image with PO2 validation
   * @param {string} id - Asset identifier
   * @param {string} path - Path to image file
   * @param {boolean} warnPO2 - Log warning if not PO2 (default: true)
   * @returns {Promise<Image>}
   */
  loadImageWithValidation(id, path, warnPO2 = true) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        
        // Validate PO2
        if (warnPO2) {
          const validation = AssetLoader.validatePO2(img);
          if (!validation.valid) {
            console.warn(`[AssetLoader] ${id}: ${validation.message}`);
          }
        }
        
        this.onAssetLoaded();
        resolve(img);
      };
      img.onerror = () => {
        this.onAssetLoaded();
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });
  }
  
  /**
   * Unload a specific image from cache
   * @param {string} id - Asset identifier
   */
  unloadImage(id) {
    const img = this.images.get(id);
    if (img) {
      img.src = '';
      this.images.delete(id);
    }
  }
  
  /**
   * Unload a specific audio from cache
   * @param {string} id - Asset identifier
   */
  unloadAudio(id) {
    const audio = this.audio.get(id);
    if (audio) {
      audio.pause();
      audio.src = '';
      this.audio.delete(id);
    }
  }
  
  /**
   * Unload a specific video from cache
   * @param {string} id - Asset identifier
   */
  unloadVideo(id) {
    const video = this.videos.get(id);
    if (video) {
      video.pause();
      video.src = '';
      this.videos.delete(id);
    }
  }
  
  /**
   * Unload multiple assets by ID
   * @param {string[]} ids - Array of asset IDs to unload
   */
  unloadAssets(ids) {
    for (const id of ids) {
      this.unloadImage(id);
      this.unloadAudio(id);
      this.unloadVideo(id);
    }
  }
  
  /**
   * Unload all assets EXCEPT the specified persistent ones
   * @param {string[]} persistentIds - IDs to keep loaded
   */
  unloadAllExcept(persistentIds) {
    const keepSet = new Set(persistentIds);
    
    for (const [id] of this.images) {
      if (!keepSet.has(id)) this.unloadImage(id);
    }
    for (const [id] of this.audio) {
      if (!keepSet.has(id)) this.unloadAudio(id);
    }
    for (const [id] of this.videos) {
      if (!keepSet.has(id)) this.unloadVideo(id);
    }
  }
  
  /**
   * Clear ALL cached assets
   */
  clearAllCache() {
    for (const [id] of this.images) this.unloadImage(id);
    for (const [id] of this.audio) this.unloadAudio(id);
    for (const [id] of this.videos) this.unloadVideo(id);
    
    this.images.clear();
    this.audio.clear();
    this.videos.clear();
  }
  
  /**
   * Get current cache memory estimate
   * @returns {{imageCount: number, audioCount: number, videoCount: number, estimatedImageMemory: string}}
   */
  getCacheStats() {
    let imageMemory = 0;
    
    for (const [id, img] of this.images) {
      if (img.complete) {
        // Estimate: width × height × 4 bytes (RGBA)
        imageMemory += img.width * img.height * 4;
      }
    }
    
    return {
      imageCount: this.images.size,
      audioCount: this.audio.size,
      videoCount: this.videos.size,
      estimatedImageMemory: `${(imageMemory / 1024 / 1024).toFixed(2)} MB`
    };
  }
  
  /**
   * Get validation report for all loaded images
   * @returns {Array<{id: string, width: number, height: number, valid: boolean, message: string}>}
   */
  getPO2Report() {
    const report = [];
    
    for (const [id, img] of this.images) {
      if (img.complete) {
        const validation = AssetLoader.validatePO2(img);
        report.push({
          id,
          ...validation
        });
      }
    }
    
    return report;
  }
}
