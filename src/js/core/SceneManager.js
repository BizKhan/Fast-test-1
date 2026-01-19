/**
 * SceneManager - Manages game scenes and holds the currentScene
 */
export class SceneManager {
  constructor(engine) {
    this.engine = engine;
    this.currentScene = null;
    this.scenes = new Map(); // Scene registry for name-based switching
  }
  
  /**
   * Register a scene by name
   * @param {string} name - Scene name identifier
   * @param {Scene} scene - Scene instance
   */
  register(name, scene) {
    this.scenes.set(name, scene);
  }
  
  /**
   * Switch to a scene by name
   * @param {string} sceneName - Name of the scene to switch to
   */
  switchTo(sceneName) {
    const scene = this.scenes.get(sceneName);
    if (!scene) {
      console.warn(`Scene not found: ${sceneName}`);
      return;
    }
    this.changeScene(scene);
  }
  
  /**
   * Change to a new scene
   * Clears the LayerManager and populates it with the new scene's entities
   * @param {Scene} newScene - Scene instance to switch to
   */
  changeScene(newScene) {
    // Exit current scene if it exists
    if (this.currentScene && typeof this.currentScene.exit === 'function') {
      this.currentScene.exit();
    }
    
    // Set engine reference on new scene
    if (newScene) {
      newScene.setEngine(this.engine);
    }
    
    // Clear LayerManager
    this.engine.layerManager.clearAll();
    
    // Set new scene
    this.currentScene = newScene;
    
    // Enter new scene (calls init() if not initialized)
    if (newScene && typeof newScene.enter === 'function') {
      newScene.enter();
    }
    
    // Populate LayerManager with new scene's entities
    if (newScene && typeof newScene.populateLayers === 'function') {
      newScene.populateLayers();
    }
  }
  
  /**
   * Get current scene
   * @returns {Scene|null}
   */
  getCurrentScene() {
    return this.currentScene;
  }
  
  /**
   * Update current scene
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    if (this.currentScene && typeof this.currentScene.update === 'function') {
      this.currentScene.update(deltaTime);
    }
  }
}
