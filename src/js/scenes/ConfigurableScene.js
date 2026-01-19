/**
 * ConfigurableScene - A scene that loads its behavior from JSON configuration
 * 
 * This enables the JSON-driven architecture where scenes are defined as data,
 * not code. The GameDev UI generates JSON configs, and this class executes them.
 */
import { Scene } from './Scene.js';
import { Sprite } from '../entities/Sprite.js';
import { Button } from '../entities/Button.js';

export class ConfigurableScene extends Scene {
  constructor(name = 'ConfigurableScene') {
    super(name);
    
    // Config data
    this.config = null;
    this.canvasSize = { width: 1080, height: 1920 };
    
    // State management
    this.states = [];
    this.currentStateIndex = 0;
    this.currentStateName = null;
    this.stateTimer = 0;
    
    // Entity tracking
    this.entities = new Map(); // id -> entity
    this.entityAnimations = new Map(); // id -> animation state
    
    // Assets to load
    this.assetsToLoad = { images: [], audio: [], videos: [] };
  }
  
  /**
   * Load scene from JSON configuration
   * @param {Object} config - Scene JSON config (matches scene-schema.json)
   * @returns {ConfigurableScene} this (for chaining)
   */
  loadFromConfig(config) {
    this.config = config;
    this.name = config.sceneName || 'ConfigurableScene';
    
    if (config.canvasSize) {
      this.canvasSize = config.canvasSize;
    }
    
    // Store states
    this.states = config.states || [];
    
    // Collect assets to preload
    if (config.assets) {
      this.assetsToLoad = {
        images: config.assets.images || [],
        audio: config.assets.audio || [],
        videos: config.assets.videos || []
      };
    }
    
    return this;
  }
  
  /**
   * Initialize - load all assets
   */
  async init() {
    if (!this.config) {
      console.warn('ConfigurableScene: No config loaded');
      return;
    }
    
    const loader = this.engine.assetLoader;
    
    // Load images
    if (this.assetsToLoad.images.length > 0) {
      await loader.loadImages(this.assetsToLoad.images);
    }
    
    // Load audio
    if (this.assetsToLoad.audio.length > 0) {
      await loader.loadAudioFiles(this.assetsToLoad.audio);
    }
    
    // Log loaded assets
    console.log(`[${this.name}] Assets loaded:`, {
      images: this.assetsToLoad.images.length,
      audio: this.assetsToLoad.audio.length
    });
  }
  
  /**
   * Enter scene - start first state
   */
  enter() {
    super.enter();
    this.currentStateIndex = 0;
    this.stateTimer = 0;
    
    if (this.states.length > 0) {
      this.currentStateName = this.states[0].name;
      console.log(`[${this.name}] Entering state: ${this.currentStateName}`);
    }
  }
  
  /**
   * Exit scene - cleanup
   */
  exit() {
    super.exit();
    this.entities.clear();
    this.entityAnimations.clear();
    
    // Unload scene-specific assets
    const assetIds = [
      ...this.assetsToLoad.images.map(a => a.id),
      ...this.assetsToLoad.audio.map(a => a.id)
    ];
    
    if (assetIds.length > 0 && this.engine.assetLoader.unloadAssets) {
      this.engine.assetLoader.unloadAssets(assetIds);
    }
  }
  
  /**
   * Populate layers - set up initial state
   */
  populateLayers() {
    if (this.states.length > 0) {
      this._setupState(this.states[0]);
    }
  }
  
  /**
   * Update - handle state logic and transitions
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.states.length === 0) return;
    
    const currentState = this.states[this.currentStateIndex];
    if (!currentState) return;
    
    this.stateTimer += dt;
    
    // Update entity animations
    this._updateAnimations(dt);
    
    // Handle button clicks
    if (this.inputHandler.mouse.pressed) {
      this._handleButtonClicks();
    }
    
    // Check for timer transition
    if (currentState.transition && currentState.transition.type === 'timer') {
      if (this.stateTimer >= currentState.transition.duration) {
        this._handleTransition(currentState.transition);
      }
    }
  }
  
  /**
   * Set up a state - clear layers and create entities
   * @private
   */
  _setupState(state) {
    if (state.clearLayers) {
      this.layerManager.clearAll();
      this.entities.clear();
      this.entityAnimations.clear();
    }
    
    if (!state.layers) return;
    
    // Process each layer
    for (const [layerName, entities] of Object.entries(state.layers)) {
      if (!Array.isArray(entities)) continue;
      
      for (const entityConfig of entities) {
        const entity = this._createEntity(entityConfig);
        if (entity) {
          this.layerManager.addToLayer(entity, layerName);
          
          // Track entity by id
          if (entityConfig.id) {
            this.entities.set(entityConfig.id, entity);
          }
          
          // Set up animation if present
          if (entityConfig.animation) {
            this._setupAnimation(entity, entityConfig.animation);
          }
        }
      }
    }
  }
  
  /**
   * Create an entity from config
   * @private
   */
  _createEntity(config) {
    switch (config.type) {
      case 'sprite':
        return this._createSprite(config);
      case 'button':
        return this._createButton(config);
      case 'text':
        return this._createText(config);
      case 'shape':
        return this._createShape(config);
      default:
        console.warn(`Unknown entity type: ${config.type}`);
        return null;
    }
  }
  
  /**
   * Create a Sprite entity
   * @private
   */
  _createSprite(config) {
    const sprite = new Sprite(
      config.x || 0,
      config.y || 0,
      config.width || 0,
      config.height || 0
    );
    
    // Set image from asset loader
    if (config.assetId && this.engine.assetLoader) {
      const image = this.engine.assetLoader.getImage(config.assetId);
      if (image) {
        sprite.setImage(image);
      }
    }
    
    // Apply additional properties
    if (config.rotation !== undefined) sprite.rotation = config.rotation;
    if (config.alpha !== undefined) sprite.alpha = config.alpha;
    if (config.scaleX !== undefined) sprite.scaleX = config.scaleX;
    if (config.scaleY !== undefined) sprite.scaleY = config.scaleY;
    if (config.visible !== undefined) sprite.visible = config.visible;
    
    return sprite;
  }
  
  /**
   * Create a Button entity
   * @private
   */
  _createButton(config) {
    const button = new Button(
      config.x || 0,
      config.y || 0,
      config.width || 200,
      config.height || 80,
      config.text || '',
      config.color || '#4a90e2',
      config.alpha !== undefined ? config.alpha : 1,
      null // onClick set below
    );
    
    // Set up onClick handler
    if (config.onClick) {
      button.onClick = () => this._handleButtonAction(config.onClick);
      button._actionConfig = config.onClick; // Store for reference
    }
    
    return button;
  }
  
  /**
   * Create a Text entity (render object)
   * @private
   */
  _createText(config) {
    const textEntity = {
      type: 'text',
      content: config.content || '',
      x: config.x || 0,
      y: config.y || 0,
      font: config.font || '48px Arial',
      color: config.color || '#ffffff',
      textAlign: config.textAlign || 'left',
      alpha: config.alpha !== undefined ? config.alpha : 1,
      visible: config.visible !== undefined ? config.visible : true,
      
      render(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = this.font;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = 'top';
        ctx.fillText(this.content, this.x, this.y);
        ctx.restore();
      }
    };
    
    return textEntity;
  }
  
  /**
   * Create a Shape entity (render object)
   * @private
   */
  _createShape(config) {
    const shapeEntity = {
      type: 'shape',
      shape: config.shape || 'rect',
      x: config.x || 0,
      y: config.y || 0,
      width: config.width || 100,
      height: config.height || 100,
      radius: config.radius || 50,
      color: config.color || '#ffffff',
      fill: config.fill !== undefined ? config.fill : true,
      strokeWidth: config.strokeWidth || 1,
      alpha: config.alpha !== undefined ? config.alpha : 1,
      visible: config.visible !== undefined ? config.visible : true,
      
      render(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.fill) {
          ctx.fillStyle = this.color;
        } else {
          ctx.strokeStyle = this.color;
          ctx.lineWidth = this.strokeWidth;
        }
        
        switch (this.shape) {
          case 'rect':
            if (this.fill) {
              ctx.fillRect(this.x, this.y, this.width, this.height);
            } else {
              ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
            break;
            
          case 'circle':
            ctx.beginPath();
            ctx.arc(this.x + this.radius, this.y + this.radius, this.radius, 0, Math.PI * 2);
            if (this.fill) {
              ctx.fill();
            } else {
              ctx.stroke();
            }
            break;
            
          case 'line':
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.stroke();
            break;
        }
        
        ctx.restore();
      }
    };
    
    return shapeEntity;
  }
  
  /**
   * Set up an animation for an entity
   * @private
   */
  _setupAnimation(entity, animConfig) {
    const animation = {
      entity,
      type: animConfig.type,
      duration: animConfig.duration || 1,
      delay: animConfig.delay || 0,
      easing: animConfig.easing || 'linear',
      direction: animConfig.direction || 'top',
      elapsed: 0,
      started: false,
      completed: false,
      
      // Store initial values
      initialAlpha: entity.alpha,
      initialX: entity.x,
      initialY: entity.y,
      initialScaleX: entity.scaleX || 1,
      initialScaleY: entity.scaleY || 1
    };
    
    // Set initial state based on animation type
    switch (animConfig.type) {
      case 'fadeIn':
        entity.alpha = 0;
        break;
      case 'fadeOut':
        // Already visible
        break;
      case 'slideIn':
        this._setSlideInStart(entity, animation);
        break;
      case 'scale':
        entity.scaleX = 0;
        entity.scaleY = 0;
        break;
    }
    
    // Store animation (use entity reference as key)
    this.entityAnimations.set(entity, animation);
  }
  
  /**
   * Set initial position for slideIn animation
   * @private
   */
  _setSlideInStart(entity, animation) {
    switch (animation.direction) {
      case 'top':
        entity.y = -entity.height - 100;
        break;
      case 'bottom':
        entity.y = this.canvasSize.height + 100;
        break;
      case 'left':
        entity.x = -entity.width - 100;
        break;
      case 'right':
        entity.x = this.canvasSize.width + 100;
        break;
    }
  }
  
  /**
   * Update all active animations
   * @private
   */
  _updateAnimations(dt) {
    for (const [entity, anim] of this.entityAnimations) {
      if (anim.completed) continue;
      
      anim.elapsed += dt;
      
      // Handle delay
      if (anim.elapsed < anim.delay) continue;
      
      const effectiveElapsed = anim.elapsed - anim.delay;
      const progress = Math.min(effectiveElapsed / anim.duration, 1);
      const easedProgress = this._applyEasing(progress, anim.easing);
      
      switch (anim.type) {
        case 'fadeIn':
          entity.alpha = easedProgress * anim.initialAlpha;
          break;
          
        case 'fadeOut':
          entity.alpha = anim.initialAlpha * (1 - easedProgress);
          break;
          
        case 'slideIn':
          this._updateSlideIn(entity, anim, easedProgress);
          break;
          
        case 'scale':
          entity.scaleX = easedProgress * anim.initialScaleX;
          entity.scaleY = easedProgress * anim.initialScaleY;
          break;
          
        case 'pulse':
          const pulse = 1 + Math.sin(effectiveElapsed * 4) * 0.1;
          entity.scaleX = anim.initialScaleX * pulse;
          entity.scaleY = anim.initialScaleY * pulse;
          break;
      }
      
      if (progress >= 1 && anim.type !== 'pulse') {
        anim.completed = true;
      }
    }
  }
  
  /**
   * Update slideIn animation
   * @private
   */
  _updateSlideIn(entity, anim, progress) {
    switch (anim.direction) {
      case 'top':
      case 'bottom':
        entity.y = anim.initialY + (anim.initialY - entity.y) * (1 - (1 - progress));
        // Simpler: lerp to target
        const targetY = anim.direction === 'top' 
          ? anim.initialY 
          : anim.initialY;
        entity.y = this._lerp(entity.y, anim.initialY, progress);
        break;
      case 'left':
      case 'right':
        entity.x = this._lerp(entity.x, anim.initialX, progress);
        break;
    }
  }
  
  /**
   * Apply easing function
   * @private
   */
  _applyEasing(t, easing) {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'linear':
      default:
        return t;
    }
  }
  
  /**
   * Linear interpolation
   * @private
   */
  _lerp(start, end, t) {
    return start + (end - start) * t;
  }
  
  /**
   * Handle button clicks
   * @private
   */
  _handleButtonClicks() {
    const { x, y } = this.inputHandler.mouse;
    
    for (const [id, entity] of this.entities) {
      if (entity.checkClick) {
        entity.checkClick(x, y);
      }
    }
  }
  
  /**
   * Handle button action
   * @private
   */
  _handleButtonAction(action) {
    console.log(`[${this.name}] Button action:`, action);
    
    switch (action.action) {
      case 'switchScene':
        if (action.target) {
          this.switchScene(action.target);
        }
        break;
        
      case 'switchState':
        if (action.target) {
          this._switchToState(action.target);
        }
        break;
        
      case 'playSound':
        if (action.sound && this.engine.audioManager) {
          this.engine.audioManager.playSFX(action.sound);
        }
        break;
        
      case 'custom':
        // For custom actions, emit an event or call a callback
        console.log('Custom action:', action);
        break;
    }
  }
  
  /**
   * Handle transition to next state/scene
   * @private
   */
  _handleTransition(transition) {
    if (transition.nextScene) {
      this.switchScene(transition.nextScene);
    } else if (transition.nextState) {
      this._switchToState(transition.nextState);
    }
  }
  
  /**
   * Switch to a named state
   * @private
   */
  _switchToState(stateName) {
    const stateIndex = this.states.findIndex(s => s.name === stateName);
    if (stateIndex === -1) {
      console.warn(`[${this.name}] State not found: ${stateName}`);
      return;
    }
    
    console.log(`[${this.name}] Switching to state: ${stateName}`);
    
    this.currentStateIndex = stateIndex;
    this.currentStateName = stateName;
    this.stateTimer = 0;
    
    this._setupState(this.states[stateIndex]);
  }
  
  /**
   * Get current state name
   * @returns {string}
   */
  getCurrentStateName() {
    return this.currentStateName;
  }
  
  /**
   * Get entity by id
   * @param {string} id - Entity id
   * @returns {Object|null}
   */
  getEntity(id) {
    return this.entities.get(id) || null;
  }
}
