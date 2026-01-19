import { Scene } from './Scene.js';

/**
 * BootScene - Boot scene showing engine status and JSON loading info
 */
export class BootScene extends Scene {
  constructor() {
    super('BootScene');
    this.pulseTime = 0;
  }
  
  /**
   * Populate layers with scene entities
   */
  populateLayers() {
    // Add gradient background
    const bg = {
      render: (ctx) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
        gradient.addColorStop(0, '#0f0f23');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1920);
      }
    };
    this.layerManager.addToLayer(bg, 'BG_FAR');
    
    // Store reference for animation
    this.textEntity = {
      scene: this,
      render: (ctx) => {
        // Logo
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.roundRect(440, 300, 200, 200, 30);
        ctx.fill();
        
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('🎮', 540, 400);
        
        // Title
        ctx.font = 'bold 72px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Canvas Engine', 540, 600);
        
        // Subtitle
        ctx.font = '36px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('JSON-Driven Game Development', 540, 680);
        
        // Status box
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.beginPath();
        ctx.roundRect(290, 780, 500, 60, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = '28px Arial';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText('✓ Engine Running • 1080×1920 • 60fps', 540, 815);
        
        // Instructions box
        ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.beginPath();
        ctx.roundRect(140, 920, 800, 400, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.stroke();
        
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#a5b4fc';
        ctx.fillText('Load a JSON Scene', 540, 980);
        
        ctx.font = '24px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        
        const instructions = [
          '1. Add ?scene=TestScene.json to URL',
          '2. Or in console: loadScene("TestScene.json")',
          '3. Or: createScene({ sceneName: "Test", ... })',
          '',
          'Example JSON scenes in:',
          '  SceneEditor/examples/'
        ];
        
        let y = 1040;
        for (const line of instructions) {
          ctx.fillText(line, 200, y);
          y += 40;
        }
        
        ctx.textAlign = 'center';
        
        // Pulsing hint at bottom
        const pulse = 0.5 + Math.sin(this.scene.pulseTime * 3) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.font = '28px Arial';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Open browser console for more commands', 540, 1500);
        ctx.globalAlpha = 1;
        
        // Footer
        ctx.font = '24px Arial';
        ctx.fillStyle = '#475569';
        ctx.fillText('GameDev UI • Platinum Standard', 540, 1800);
      }
    };
    
    this.layerManager.addToLayer(this.textEntity, 'TEXT');
  }
  
  /**
   * Update scene logic
   * @param {number} deltaTime - Time since last frame in seconds
   */
  update(deltaTime) {
    this.pulseTime += deltaTime;
  }
}
