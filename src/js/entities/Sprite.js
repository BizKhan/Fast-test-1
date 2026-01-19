/**
 * Sprite - Base sprite class for game entities
 */
export class Sprite {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    
    // Transform properties
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.alpha = 1;
    
    // Visual properties
    this.image = null;
    this.color = '#ffffff';
    
    // Animation
    this.visible = true;
    this.active = true;
  }
  
  /**
   * Load an image for this sprite
   * @param {string|Image} image - Image path or Image object
   */
  setImage(image) {
    if (typeof image === 'string') {
      const img = new Image();
      // Attach onload handler BEFORE setting src to handle cached images
      img.onload = () => {
        this.image = img;
        if (this.width === 0) this.width = img.width;
        if (this.height === 0) this.height = img.height;
      };
      // Set src after handler is attached
      img.src = image;
      
      // Handle already-loaded cached images
      if (img.complete) {
        img.onload();
      }
    } else {
      this.image = image;
      if (this.width === 0 && image.width) this.width = image.width;
      if (this.height === 0 && image.height) this.height = image.height;
    }
  }
  
  /**
   * Set color (used when no image is set)
   * @param {string} color - CSS color string
   */
  setColor(color) {
    this.color = color;
  }
  
  /**
   * Update sprite (override in subclasses)
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Override in subclasses
  }
  
  /**
   * Render sprite
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible || !this.active) return;
    
    ctx.save();
    
    // Apply transforms
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-this.width / 2, -this.height / 2);
    
    // Draw image or colored rectangle
    if (this.image && this.image.complete) {
      ctx.drawImage(this.image, 0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    
    ctx.restore();
  }
  
  /**
   * Check if point is inside sprite bounds
   * Uses exclusive boundaries on right/bottom edges (standard rectangle collision)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean}
   */
  contains(x, y) {
    return x >= this.x && x < this.x + this.width &&
           y >= this.y && y < this.y + this.height;
  }
  
  /**
   * Get center X position
   * @returns {number}
   */
  getCenterX() {
    return this.x + this.width / 2;
  }
  
  /**
   * Get center Y position
   * @returns {number}
   */
  getCenterY() {
    return this.y + this.height / 2;
  }
}
