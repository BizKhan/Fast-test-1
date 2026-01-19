/**
 * Button - A reusable button that checks for clicks
 */
export class Button {
  constructor(x = 0, y = 0, w = 200, h = 80, text = '', color = '#4a90e2', alpha = 1, onClick = null) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.text = text;
    this.color = color;
    this.alpha = alpha;
    this.onClick = onClick;
    
    this.visible = true;
  }
  
  /**
   * Render the button
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    if (!this.visible) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    
    // Render text if present
    if (this.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x + this.w / 2, this.y + this.h / 2);
    }
    
    ctx.restore();
  }
  
  /**
   * Check if click coordinates are within button bounds
   * Uses exclusive boundaries on right/bottom edges (standard rectangle collision)
   * @param {number} mouseX - Mouse X coordinate (in canvas space)
   * @param {number} mouseY - Mouse Y coordinate (in canvas space)
   * @returns {boolean} True if click is within button
   */
  checkClick(mouseX, mouseY) {
    if (!this.visible) return false;
    
    const clicked = mouseX >= this.x && mouseX < this.x + this.w &&
                    mouseY >= this.y && mouseY < this.y + this.h;
    
    if (clicked && this.onClick) {
      this.onClick(this);
    }
    
    return clicked;
  }
}
