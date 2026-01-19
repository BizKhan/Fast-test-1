/**
 * Scene - Base class for all game scenes
 */
export class Scene {
  constructor(name) {
    this.name = name;
    this.sceneManager = null;
    this.engine = null;
    this.layerManager = null;
    this.inputHandler = null;
    
    // Scene state
    this.isActive = false;
    this.isInitialized = false;
  }
  
  /**
   * Initialize scene (called once when scene is created)
   * Override in subclasses
   */
  init() {
    // Override in subclasses
  }
  
  /**
   * Called when scene is entered
   * Override in subclasses
   */
  enter() {
    this.isActive = true;
    if (!this.isInitialized) {
      this.init();
      this.isInitialized = true;
    }
  }
  
  /**
   * Called when scene is exited
   * Override in subclasses
   */
  exit() {
    this.isActive = false;
  }
  
  /**
   * Update scene logic
   * Override in subclasses
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Override in subclasses
  }
  
  /**
   * Populate layers with scene entities
   * Override in subclasses to add entities to layers
   */
  populateLayers() {
    // Override in subclasses
    // Use this.layerManager.addToLayer(entity, 'LAYER_NAME')
  }
  
  /**
   * Render scene
   * Override in subclasses
   */
  render() {
    // Override in subclasses if needed
  }
  
  /**
   * Set engine reference (called by engine)
   * @param {Engine} engine - Engine instance
   */
  setEngine(engine) {
    this.engine = engine;
    this.layerManager = engine.getLayerManager();
    this.inputHandler = engine.getInputHandler();
    this.sceneManager = engine.getSceneManager();
  }
  
  /**
   * Switch to another scene
   * @param {string} sceneName - Name of scene to switch to
   */
  switchScene(sceneName) {
    if (this.sceneManager) {
      this.sceneManager.switchTo(sceneName);
    }
  }
}
