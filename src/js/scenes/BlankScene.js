import { Scene } from './Scene.js';

/**
 * BlankScene - A blank scene to prove the loop is running
 */
export class BlankScene extends Scene {
  constructor() {
    super('BlankScene');
  }
  
  /**
   * Populate layers with scene entities
   */
  populateLayers() {
    // Add a simple background to prove rendering works
    const bg = {
      render: (ctx) => {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 1080, 1920);
      }
    };
    
    this.layerManager.addToLayer(bg, 'BG_FAR');
    
    // Add a simple text indicator
    const text = {
      render: (ctx) => {
        ctx.fillStyle = '#ffffff';
        ctx.font = '72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Canvas Template Running', 540, 960);
        ctx.fillText('1080x1920', 540, 1060);
      }
    };
    
    this.layerManager.addToLayer(text, 'TEXT');
  }
  
  /**
   * Update scene logic
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    // Blank scene has no updates
  }
}
