import { LayerManager } from './LayerManager.js';
import { InputHandler } from './InputHandler.js';
import { SceneManager } from './SceneManager.js';
import { AudioManager } from './AudioManager.js';
import { AssetLoader } from './AssetLoader.js';

/**
 * Engine - Main game engine class with integrated Audio/Media hooks
 */
export class Engine {
  constructor(canvas, width = 1080, height = 1920) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    
    // Initialize the 1080x1920 canvas
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Instantiate core systems
    this.inputHandler = new InputHandler(canvas, width, height);
    this.layerManager = new LayerManager(canvas);
    this.sceneManager = new SceneManager(this);
    this.audioManager = new AudioManager();
    this.assetLoader = new AssetLoader();
    
    // Letterbox scaling - ensure game stays centered on any device
    this.setupLetterboxScaling();
    
    // Game loop state
    this.isRunning = false;
    this.lastTime = 0;
    this.frameId = null;
    this.isFirstFrame = true; // Dedicated flag for first frame detection
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.setupLetterboxScaling();
      this.inputHandler.updateTransform();
    });
  }
  
  /**
   * Setup letterbox scaling to keep game centered on any device
   */
  setupLetterboxScaling() {
    const container = this.canvas.parentElement || document.body;
    const containerWidth = container.clientWidth || window.innerWidth;
    const containerHeight = container.clientHeight || window.innerHeight;
    
    // Calculate scale to maintain aspect ratio (letterbox)
    const scaleX = containerWidth / this.width;
    const scaleY = containerHeight / this.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate scaled dimensions
    const scaledWidth = this.width * scale;
    const scaledHeight = this.height * scale;
    
    // Center the canvas
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;
    
    // Apply CSS transform for centering (handled by CSS object-fit: contain)
    // The InputHandler will handle coordinate transformation
    this.inputHandler.updateTransform();
  }
  
  /**
   * Start the game loop with requestAnimationFrame
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isFirstFrame = true; // Reset first frame flag
    // Use requestAnimationFrame to provide the initial timestamp
    this.frameId = requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
  }
  
  /**
   * Main game loop - The Heartbeat
   * Calculates deltaTime in seconds for frame-rate independence
   * @param {number} currentTime - Current timestamp in milliseconds
   */
  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    // Calculate deltaTime (seconds elapsed since last frame)
    // First frame uses a default ~16.67ms (60fps) using dedicated flag
    let deltaTime;
    if (this.isFirstFrame) {
      deltaTime = 1 / 60; // Default to ~16.67ms for first frame
      this.isFirstFrame = false;
    } else {
      deltaTime = (currentTime - this.lastTime) / 1000;
    }
    this.lastTime = currentTime;
    
    // Clamp deltaTime to prevent huge jumps (e.g., after tab was backgrounded)
    deltaTime = Math.min(deltaTime, 0.1); // Max 100ms
    
    // Update game logic
    this.update(deltaTime);
    
    // Draw frame
    this.draw();
    
    // Reset input flags at end of frame after all logic has consumed them
    this.inputHandler.resetFrame();
    
    // Schedule next frame
    this.frameId = requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  /**
   * Update game state
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    // Update Input (does not reset flags - that happens at end of frame)
    this.inputHandler.update();
    
    // Update Scene (can now check pressed/released flags)
    this.sceneManager.update(deltaTime);
  }
  
  /**
   * Draw frame
   */
  draw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Render all layers
    this.layerManager.render(this.ctx);
  }
  
  /**
   * Get layer manager
   * @returns {LayerManager}
   */
  getLayerManager() {
    return this.layerManager;
  }
  
  /**
   * Get input handler
   * @returns {InputHandler}
   */
  getInputHandler() {
    return this.inputHandler;
  }
  
  /**
   * Get scene manager
   * @returns {SceneManager}
   */
  getSceneManager() {
    return this.sceneManager;
  }
  
  /**
   * Get audio manager
   * @returns {AudioManager}
   */
  getAudioManager() {
    return this.audioManager;
  }
  
  /**
   * Get asset loader
   * @returns {AssetLoader}
   */
  getAssetLoader() {
    return this.assetLoader;
  }
}
