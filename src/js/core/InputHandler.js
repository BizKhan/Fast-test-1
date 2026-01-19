/**
 * InputHandler - Manages input events and coordinate mapping
 * Handles screen-to-canvas coordinate transformation for 1080x1920 internal resolution
 */
export class InputHandler {
  constructor(canvas, internalWidth = 1080, internalHeight = 1920) {
    this.canvas = canvas;
    this.internalWidth = internalWidth;
    this.internalHeight = internalHeight;
    
    // Input state
    this.keys = {};
    this.mouse = {
      x: 0,
      y: 0,
      down: false,
      pressed: false,
      released: false
    };
    
    this.touches = [];
    this.touchStartPositions = [];
    
    // Coordinate transformation cache
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.setupEventListeners();
    this.updateTransform();
  }
  
  /**
   * Update coordinate transformation based on current canvas size
   */
  updateTransform() {
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;
    
    // Guard against zero dimensions (canvas not yet laid out)
    if (canvasWidth === 0 || canvasHeight === 0) {
      // Use fallback scale of 1 to prevent division by zero
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    
    // Calculate scale to maintain aspect ratio
    const scaleX = canvasWidth / this.internalWidth;
    const scaleY = canvasHeight / this.internalHeight;
    this.scale = Math.min(scaleX, scaleY);
    
    // Ensure scale is never zero (additional safety)
    if (this.scale === 0) {
      this.scale = 1;
    }
    
    // Calculate offsets for centering
    const scaledWidth = this.internalWidth * this.scale;
    const scaledHeight = this.internalHeight * this.scale;
    this.offsetX = (canvasWidth - scaledWidth) / 2;
    this.offsetY = (canvasHeight - scaledHeight) / 2;
  }
  
  /**
   * Convert screen coordinates to canvas coordinates
   * Clamps to [0, internalWidth] and [0, internalHeight] (inclusive)
   * Exclusive boundary semantics are handled by collision detection (Sprite.contains, Button.checkClick)
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} Canvas coordinates {x, y}
   */
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    
    // Transform to internal coordinates
    const canvasX = (x - this.offsetX) / this.scale;
    const canvasY = (y - this.offsetY) / this.scale;
    
    // Clamp to canvas bounds (inclusive)
    // Note: Exclusive boundary semantics for collision detection are enforced
    // by Sprite.contains() and Button.checkClick(), not here
    return {
      x: Math.max(0, Math.min(this.internalWidth, canvasX)),
      y: Math.max(0, Math.min(this.internalHeight, canvasY))
    };
  }
  
  /**
   * Setup event listeners for keyboard, mouse, and touch
   */
  setupEventListeners() {
    // Define game keys that should prevent default behavior
    // Only these specific keys are blocked - all others (typing, etc.) work normally
    const GAME_KEYS = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'Enter',
      'KeyW', 'KeyA', 'KeyS', 'KeyD'
    ]);
    
    // Keyboard events - only prevent default for specific game keys
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      
      // Only prevent default for specific game keys
      // This allows text input, search, and other keyboard features to work
      if (GAME_KEYS.has(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      
      // Only prevent default for specific game keys
      if (GAME_KEYS.has(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    });
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      const coords = this.screenToCanvas(e.clientX, e.clientY);
      this.mouse.x = coords.x;
      this.mouse.y = coords.y;
      this.mouse.down = true;
      this.mouse.pressed = true;
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const coords = this.screenToCanvas(e.clientX, e.clientY);
      this.mouse.x = coords.x;
      this.mouse.y = coords.y;
      e.preventDefault();
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      this.mouse.down = false;
      this.mouse.released = true;
      e.preventDefault();
    });
    
    // Handle mouse release outside canvas (user clicked, dragged out, released)
    window.addEventListener('mouseup', () => {
      if (this.mouse.down) {
        this.mouse.down = false;
        this.mouse.released = true;
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      // Don't set released here - wait for actual mouseup event
      // Just track that mouse has left (mouse.down remains true if dragging out)
    });
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      // Process only new touches from changedTouches to preserve existing touch start positions
      Array.from(e.changedTouches).forEach((touch) => {
        const coords = this.screenToCanvas(touch.clientX, touch.clientY);
        
        // Add new touch with its starting position
        this.touches.push({
          id: touch.identifier,
          x: coords.x,
          y: coords.y,
          startX: coords.x,
          startY: coords.y
        });
        this.touchStartPositions.push({
          id: touch.identifier,
          x: coords.x,
          y: coords.y
        });
      });
      
      if (this.touches.length > 0) {
        this.mouse.x = this.touches[0].x;
        this.mouse.y = this.touches[0].y;
        this.mouse.down = true;
        this.mouse.pressed = true;
      }
      
      e.preventDefault();
    });
    
    this.canvas.addEventListener('touchmove', (e) => {
      this.touches = [];
      
      Array.from(e.touches).forEach((touch) => {
        const coords = this.screenToCanvas(touch.clientX, touch.clientY);
        const startPos = this.touchStartPositions.find(t => t.id === touch.identifier);
        this.touches.push({
          id: touch.identifier,
          x: coords.x,
          y: coords.y,
          startX: startPos ? startPos.x : coords.x,
          startY: startPos ? startPos.y : coords.y
        });
      });
      
      if (this.touches.length > 0) {
        this.mouse.x = this.touches[0].x;
        this.mouse.y = this.touches[0].y;
      }
      
      e.preventDefault();
    });
    
    this.canvas.addEventListener('touchend', (e) => {
      // Remove ended touches from touches array
      this.touches = this.touches.filter(touch => {
        return Array.from(e.changedTouches).every(changed => changed.identifier !== touch.id);
      });
      
      // Clean up corresponding touch start positions to prevent memory leak
      Array.from(e.changedTouches).forEach(changedTouch => {
        this.touchStartPositions = this.touchStartPositions.filter(
          startPos => startPos.id !== changedTouch.identifier
        );
      });
      
      if (this.touches.length === 0) {
        this.mouse.down = false;
        this.mouse.released = true;
      }
      
      e.preventDefault();
    });
    
    // Window resize - update transform
    window.addEventListener('resize', () => {
      this.updateTransform();
    });
  }
  
  /**
   * Check if a key is currently pressed
   * @param {string} code - Key code (e.g., 'KeyW', 'ArrowUp')
   * @returns {boolean}
   */
  isKeyDown(code) {
    return this.keys[code] === true;
  }
  
  /**
   * Check if mouse/touch is down
   * @returns {boolean}
   */
  isMouseDown() {
    return this.mouse.down;
  }
  
  /**
   * Get mouse position in canvas coordinates
   * @returns {Object} {x, y}
   */
  getMousePos() {
    return { x: this.mouse.x, y: this.mouse.y };
  }
  
  /**
   * Get all active touches
   * @returns {Array} Array of touch objects
   */
  getTouches() {
    return this.touches;
  }
  
  /**
   * Update input state (does not reset flags - use resetFrame() at end of frame)
   */
  update() {
    // Input state is updated by event listeners
    // Flags are reset at end of frame via resetFrame()
  }
  
  /**
   * Reset frame-specific flags (call at end of frame after all game logic)
   */
  resetFrame() {
    this.mouse.pressed = false;
    this.mouse.released = false;
  }
}
