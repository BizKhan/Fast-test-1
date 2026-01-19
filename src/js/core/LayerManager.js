/**
 * LayerManager - Handles layered rendering with specific z-order
 * Render order (bottom to top):
 * BG_FAR -> BG_NEAR -> VIDEO_IMAGE -> SHAPES -> SPRITES -> TEXT -> UI_BUTTONS
 */
export class LayerManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Define render layers in order (bottom to top)
    this.LAYERS = {
      BG_FAR: 0,
      BG_NEAR: 1,
      VIDEO_IMAGE: 2,
      SHAPES: 3,
      SPRITES: 4,
      TEXT: 5,
      UI_BUTTONS: 6
    };
    
    // Store entities for each layer
    this.layerEntities = {};
    
    // Initialize empty arrays for each layer
    Object.keys(this.LAYERS).forEach(layer => {
      this.layerEntities[layer] = [];
    });
  }
  
  /**
   * Add an entity to a specific layer
   * @param {Object} entity - Entity with a render(ctx) method
   * @param {string} layerName - Layer name (e.g., 'SPRITES', 'UI_BUTTONS')
   */
  addToLayer(entity, layerName) {
    if (!this.LAYERS.hasOwnProperty(layerName)) {
      console.warn(`Unknown layer: ${layerName}`);
      return;
    }
    
    // Avoid duplicates
    if (!this.layerEntities[layerName].includes(entity)) {
      this.layerEntities[layerName].push(entity);
    }
  }
  
  /**
   * Remove an entity from a layer
   * @param {Object} entity - Entity to remove
   * @param {string} layerName - Layer name
   */
  removeFromLayer(entity, layerName) {
    if (!this.LAYERS.hasOwnProperty(layerName)) {
      return;
    }
    
    const index = this.layerEntities[layerName].indexOf(entity);
    if (index > -1) {
      this.layerEntities[layerName].splice(index, 1);
    }
  }
  
  /**
   * Clear all entities from a layer
   * @param {string} layerName - Layer name
   */
  clearLayer(layerName) {
    if (this.LAYERS.hasOwnProperty(layerName)) {
      this.layerEntities[layerName] = [];
    }
  }
  
  /**
   * Clear all layers
   */
  clearAll() {
    Object.keys(this.LAYERS).forEach(layer => {
      this.layerEntities[layer] = [];
    });
  }
  
  /**
   * Render all layers in order
   * Loops through each layer array and draws the entities
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // Get layers sorted by their numeric value (render order)
    const sortedLayers = Object.keys(this.LAYERS).sort(
      (a, b) => this.LAYERS[a] - this.LAYERS[b]
    );
    
    // Loop through each layer array and draw entities
    for (const layerName of sortedLayers) {
      const entities = this.layerEntities[layerName];
      for (const entity of entities) {
        if (entity && typeof entity.render === 'function') {
          entity.render(ctx);
        }
      }
    }
  }
}
