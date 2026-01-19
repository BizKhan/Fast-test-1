import { Engine } from './core/Engine.js';
import { BootScene } from './scenes/BootScene.js';
import { ConfigurableScene } from './scenes/ConfigurableScene.js';

/**
 * Main entry point - boots the Engine
 * 
 * Supports multiple modes:
 * 1. Default: Loads BootScene
 * 2. JSON mode: Load ?scene=SceneName.json to test JSON configs
 * 3. Embedded mode: Receives scene config via postMessage from GameDev UI
 */

// Get canvas element
const canvas = document.getElementById('gameCanvas');

if (!canvas) {
  console.error('Canvas element not found!');
} else {
  // Create engine
  const engine = new Engine(canvas, 1080, 1920);
  
  // Check for embedded mode (from iframe)
  const urlParams = new URLSearchParams(window.location.search);
  const isEmbedded = urlParams.get('embedded') === 'true';
  const sceneParam = urlParams.get('scene');
  
  if (isEmbedded) {
    // Embedded mode: wait for postMessage commands
    console.log('Engine started in embedded mode - waiting for commands');
    setupPostMessageHandler(engine);
    
    // Show a "waiting" screen so user knows iframe is working
    showWaitingScreen(engine);
    
    // Notify parent that engine is ready
    notifyParent({ type: 'ENGINE_READY', data: { width: 1080, height: 1920 } });
    
  } else if (sceneParam) {
    // Load JSON scene from file
    loadJSONScene(engine, sceneParam);
  } else {
    // Default: load BootScene
    const bootScene = new BootScene();
    engine.sceneManager.changeScene(bootScene);
    engine.start();
    
    console.log('Game Engine initialized');
    console.log('Internal resolution: 1080x1920');
    console.log('BootScene loaded - engine is alive');
  }
  
  // Make engine globally available for debugging
  window.gameEngine = engine;
  
  // Expose helper to load JSON scenes from console
  window.loadScene = (jsonPath) => loadJSONScene(engine, jsonPath);
}

/**
 * Show a waiting screen in embedded mode
 */
function showWaitingScreen(engine) {
  const ctx = engine.ctx;
  const width = engine.width;
  const height = engine.height;
  
  // Dark background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);
  
  // Gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1e3a5f');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Center text
  ctx.fillStyle = '#64748b';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🎮', width / 2, height / 2 - 40);
  
  ctx.font = '32px Arial';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Ready', width / 2, height / 2 + 30);
  
  ctx.font = '24px Arial';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Click Run to start', width / 2, height / 2 + 80);
}

/**
 * Setup postMessage handler for communication with GameDev UI
 */
function setupPostMessageHandler(engine) {
  window.addEventListener('message', (event) => {
    const { type, data } = event.data || {};
    
    switch (type) {
      case 'LOAD_SCENE_CONFIG':
        // Load scene from config object
        loadSceneFromConfig(engine, data);
        break;
        
      case 'START_ENGINE':
        if (!engine.isRunning) {
          engine.start();
          notifyParent({ type: 'ENGINE_STARTED' });
        }
        break;
        
      case 'STOP_ENGINE':
        engine.stop();
        notifyParent({ type: 'ENGINE_STOPPED' });
        break;
        
      case 'SWITCH_STATE':
        // Switch to a specific state in the current scene
        const currentScene = engine.sceneManager.currentScene;
        if (currentScene && currentScene._switchToState) {
          currentScene._switchToState(data.stateName);
          notifyParent({ type: 'STATE_CHANGED', data: { stateName: data.stateName } });
        }
        break;
        
      case 'GET_DEBUG_INFO':
        // Send debug info back to parent
        sendDebugInfo(engine);
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  });
  
  // Send debug info periodically when running
  setInterval(() => {
    if (engine.isRunning) {
      sendDebugInfo(engine);
    }
  }, 500);
}

/**
 * Send debug info to parent window
 */
function sendDebugInfo(engine) {
  const currentScene = engine.sceneManager.currentScene;
  const layers = engine.layerManager;
  
  // Count entities per layer
  const layerCounts = {};
  ['BG_FAR', 'BG_NEAR', 'VIDEO_IMAGE', 'SHAPES', 'SPRITES', 'TEXT', 'UI_BUTTONS'].forEach(name => {
    const layer = layers.getLayer(name);
    layerCounts[name] = layer ? layer.length : 0;
  });
  
  notifyParent({
    type: 'DEBUG_INFO',
    data: {
      isRunning: engine.isRunning,
      sceneName: currentScene?.name || 'None',
      stateName: currentScene?.getCurrentStateName?.() || 'N/A',
      fps: Math.round(1000 / 16.67), // Approximate
      layerCounts,
      totalEntities: Object.values(layerCounts).reduce((a, b) => a + b, 0)
    }
  });
}

/**
 * Notify parent window
 */
function notifyParent(message) {
  if (window.parent !== window) {
    window.parent.postMessage(message, '*');
  }
}

/**
 * Load a scene from a config object (from postMessage)
 */
function loadSceneFromConfig(engine, config) {
  try {
    console.log('Loading scene from config:', config.sceneName);
    
    const scene = new ConfigurableScene();
    scene.loadFromConfig(config);
    
    engine.sceneManager.register(config.sceneName, scene);
    engine.sceneManager.switchTo(config.sceneName);
    
    if (!engine.isRunning) {
      engine.start();
    }
    
    notifyParent({
      type: 'SCENE_LOADED',
      data: {
        sceneName: config.sceneName,
        states: config.states?.map(s => s.name) || []
      }
    });
    
    console.log(`Scene "${config.sceneName}" loaded from config`);
  } catch (error) {
    console.error('Failed to load scene config:', error);
    notifyParent({
      type: 'ERROR',
      data: { message: error.message }
    });
  }
}

/**
 * Load a scene from JSON file
 * @param {Engine} engine - Engine instance
 * @param {string} jsonPath - Path to JSON file (relative to /scenes/ or absolute)
 */
async function loadJSONScene(engine, jsonPath) {
  try {
    // Construct full path
    let fullPath = jsonPath;
    if (!jsonPath.startsWith('/') && !jsonPath.startsWith('http')) {
      // Check if it's in SceneEditor examples or local scenes
      if (jsonPath.includes('/')) {
        fullPath = jsonPath;
      } else {
        // Try SceneEditor examples first, then local scenes
        fullPath = `../../SceneEditor/examples/${jsonPath}`;
      }
    }
    
    console.log(`Loading scene from: ${fullPath}`);
    
    // Fetch JSON
    const response = await fetch(fullPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${fullPath}: ${response.status}`);
    }
    
    const config = await response.json();
    console.log('Scene config loaded:', config.sceneName);
    
    // Create and configure scene
    const scene = new ConfigurableScene();
    scene.loadFromConfig(config);
    
    // Register and switch to scene
    engine.sceneManager.register(config.sceneName, scene);
    engine.sceneManager.switchTo(config.sceneName);
    
    // Start engine if not already running
    if (!engine.isRunning) {
      engine.start();
    }
    
    console.log(`Scene "${config.sceneName}" loaded successfully`);
    console.log('States:', config.states.map(s => s.name).join(' → '));
    
    return scene;
  } catch (error) {
    console.error('Failed to load JSON scene:', error);
    
    // Fall back to boot scene
    const bootScene = new BootScene();
    engine.sceneManager.changeScene(bootScene);
    engine.start();
    
    return null;
  }
}

/**
 * Helper to create scene from inline JSON (for console testing)
 * Usage: createScene({ sceneName: 'Test', states: [...] })
 */
window.createScene = (config) => {
  const engine = window.gameEngine;
  if (!engine) {
    console.error('Engine not initialized');
    return null;
  }
  
  const scene = new ConfigurableScene();
  scene.loadFromConfig(config);
  
  engine.sceneManager.register(config.sceneName, scene);
  engine.sceneManager.switchTo(config.sceneName);
  
  return scene;
};

// Log available commands
console.log('═══════════════════════════════════════════════════════');
console.log('Canvas Engine - GameDev UI Test Environment');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('Console Commands:');
console.log('  loadScene("TestScene.json")  - Load a JSON scene');
console.log('  createScene({...})           - Create scene from object');
console.log('  gameEngine                   - Access engine instance');
console.log('');
console.log('URL Parameters:');
console.log('  ?scene=TestScene.json        - Auto-load JSON scene');
console.log('═══════════════════════════════════════════════════════');
