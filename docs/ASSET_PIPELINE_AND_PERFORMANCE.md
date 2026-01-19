# Asset Pipeline & Performance Specifications

> **Engine:** Canvas Template Engine (1080×1920, 9:16 Portrait)  
> **Author:** Senior Game Performance Architect  
> **Version:** 1.0.0  
> **Last Updated:** 2026-01-12

---

## Table of Contents

1. [Image Specifications](#1-image-specifications)
2. [The Tiling Standard](#2-the-tiling-standard)
3. [Sprite-Sheet Mapping](#3-sprite-sheet-mapping)
4. [Mobile Performance Guardrails](#4-mobile-performance-guardrails)
5. [Audio Standards](#5-audio-standards)
6. [Memory Management](#6-memory-management)
7. [Quick Reference Tables](#7-quick-reference-tables)

---

## 1. Image Specifications

### 1.1 Supported Formats

| Format | Use Case | Compression | Alpha | Recommendation |
|--------|----------|-------------|-------|----------------|
| **PNG** | Sprites, UI, transparent assets | Lossless | ✅ Yes | Primary format for game assets |
| **WebP** | Backgrounds, large images | Lossy/Lossless | ✅ Yes | 25-35% smaller than PNG |
| **JPEG** | Photos, non-transparent BGs | Lossy | ❌ No | Avoid for game sprites |

### 1.2 The Power of Two (PO2) Rule

> **CRITICAL:** Mobile GPUs are optimized for textures with Power of Two dimensions.

#### Why PO2 Matters

- Mobile GPUs (Adreno, Mali, Apple GPU) store textures in PO2-aligned memory blocks
- Non-PO2 textures are internally padded to the next PO2 size, **wasting VRAM**
- PO2 textures enable **hardware mipmapping** for better scaling performance
- Non-PO2 textures may cause **render stalls** on older devices

#### Valid PO2 Dimensions

```
32, 64, 128, 256, 512, 1024, 2048, 4096
```

#### PO2 Compliance Rules

| Asset Type | Required Dimensions | Notes |
|------------|---------------------|-------|
| Sprite Sheets | **Must be PO2 × PO2** | e.g., 512×512, 1024×1024, 2048×2048 |
| Individual Sprites | Frame size can be non-PO2 | Sheet must be PO2 |
| Tiled Backgrounds | Tile dimensions PO2 | e.g., 256×256, 512×512 tiles |
| Full-screen Images | Exception allowed | 1080×1920 acceptable for BG_FAR layer |

#### PO2 Compliance Examples

```
✅ CORRECT:
   - player_sheet.png    → 1024 × 1024 (PO2 × PO2)
   - enemy_sheet.png     → 512 × 512   (PO2 × PO2)
   - tile_grass.png      → 256 × 256   (PO2 × PO2)
   - particles.png       → 256 × 512   (PO2 × PO2)

❌ INCORRECT:
   - player_sheet.png    → 1000 × 1000 (padded to 1024×1024, wastes 48KB)
   - enemy_sheet.png     → 500 × 400   (padded to 512×512, wastes 35%)
   - tile_grass.png      → 300 × 300   (padded to 512×512, wastes 66%)
```

### 1.3 Maximum Sheet Size: 2048×2048

> **HARD LIMIT:** All sprite sheets must be ≤ 2048×2048 pixels.

#### Rationale

| Device Category | Max Texture Size | Our Target |
|-----------------|------------------|------------|
| Low-end Android (2020-) | 2048×2048 | ✅ Supported |
| Mid-range Mobile | 4096×4096 | ✅ Supported |
| High-end / Desktop | 8192×8192+ | ✅ Supported |

By enforcing **2048×2048 maximum**, we guarantee compatibility with:
- 99.5% of active mobile devices
- All iOS devices (iPhone 6+)
- All Android devices with OpenGL ES 3.0+

#### Sheet Size Memory Impact

| Sheet Size | Bit Depth | Uncompressed VRAM | With Alpha |
|------------|-----------|-------------------|------------|
| 512×512 | 32-bit RGBA | 1 MB | 1 MB |
| 1024×1024 | 32-bit RGBA | 4 MB | 4 MB |
| 2048×2048 | 32-bit RGBA | 16 MB | 16 MB |
| 4096×4096 | 32-bit RGBA | 64 MB | ⚠️ Risk on low-end |

### 1.4 Image Optimization Pipeline

#### Pre-Production Checklist

```
□ Export at exact PO2 dimensions (no scaling needed at runtime)
□ Use PNG-8 where possible (256 colors max)
□ Use PNG-24/32 only when alpha gradients required
□ Run through optimizer (TinyPNG, ImageOptim, Squoosh)
□ Target < 500KB per sprite sheet
□ Target < 200KB per background tile
```

#### Recommended Tools

| Tool | Platform | Use Case |
|------|----------|----------|
| **Squoosh** | Web | WebP conversion, quality comparison |
| **TinyPNG** | Web/CLI | PNG optimization (up to 70% reduction) |
| **TexturePacker** | Desktop | Sprite sheet generation with PO2 output |
| **ImageOptim** | macOS | Batch optimization |
| **Sharp (npm)** | Node.js | Automated build pipeline |

---

## 2. The Tiling Standard

### 2.1 Why Tiled Backgrounds?

> **RULE:** Never use a single wide/tall image for scrolling backgrounds. Always use repeating tiles.

#### Memory Comparison: Single Image vs Tiled

**Scenario:** Vertical endless runner with scrolling background

| Approach | Image Size | VRAM Usage | RAM During Load |
|----------|------------|------------|-----------------|
| ❌ Single tall image | 1080×7680 | ~33 MB | 66 MB peak |
| ✅ Tiled (1080×1920 × 2) | 1080×1920 ×2 | ~16 MB | 16 MB peak |
| ✅ Tiled (1080×512 × 4) | 1080×512 ×4 | ~8 MB | 8 MB peak |

**Result:** Tiling reduces memory by **50-75%** and prevents mobile crashes.

### 2.2 Tile Size Standards

| Background Type | Recommended Tile Size | Notes |
|-----------------|----------------------|-------|
| Static full-screen | 1080×1920 | Single image, no tiling needed |
| Vertical scroll | 1080×512 or 1080×1024 | Height should be PO2 for optimal GPU |
| Horizontal scroll | 512×1920 or 1024×1920 | Width should be PO2 |
| Parallax (far) | 1080×1024 | Slower scroll = can be smaller |
| Parallax (near) | 1080×512 | Faster scroll = needs more tiles |

### 2.3 Seamless Tile Requirements

For scrolling backgrounds, tiles must be **seamless** (edges match perfectly).

#### Seamless Tile Checklist

```
□ Top edge pixels match bottom edge pixels (vertical scroll)
□ Left edge pixels match right edge pixels (horizontal scroll)
□ No visible seam when tiles are placed adjacent
□ Test by placing 3+ tiles in sequence
```

#### Seamless Tile Implementation Pattern

```javascript
/**
 * Vertical scrolling background using 2 tile instances
 * Tiles swap positions when scrolling off-screen
 */
class ScrollingBackground {
  constructor(tileImage, scrollSpeed) {
    this.tileImage = tileImage;
    this.scrollSpeed = scrollSpeed; // pixels per second
    this.tileHeight = 1024; // PO2 tile height
    
    // Two tile positions for seamless loop
    this.tile1Y = 0;
    this.tile2Y = -this.tileHeight;
  }
  
  update(dt) {
    // Move tiles down (dt in seconds)
    this.tile1Y += this.scrollSpeed * dt;
    this.tile2Y += this.scrollSpeed * dt;
    
    // Wrap tiles when they scroll off-screen
    if (this.tile1Y >= 1920) {
      this.tile1Y = this.tile2Y - this.tileHeight;
    }
    if (this.tile2Y >= 1920) {
      this.tile2Y = this.tile1Y - this.tileHeight;
    }
  }
  
  render(ctx) {
    ctx.drawImage(this.tileImage, 0, this.tile1Y, 1080, this.tileHeight);
    ctx.drawImage(this.tileImage, 0, this.tile2Y, 1080, this.tileHeight);
  }
}
```

### 2.4 Parallax Layer Configuration

```javascript
/**
 * Standard parallax configuration for BG_FAR and BG_NEAR layers
 */
const PARALLAX_CONFIG = {
  BG_FAR: {
    scrollMultiplier: 0.3,  // 30% of camera speed
    tileSize: { width: 1080, height: 1024 },
    tilesNeeded: 3  // ceil(1920/1024) + 1
  },
  BG_NEAR: {
    scrollMultiplier: 0.7,  // 70% of camera speed
    tileSize: { width: 1080, height: 512 },
    tilesNeeded: 5  // ceil(1920/512) + 1
  }
};
```

---

## 3. Sprite-Sheet Mapping

### 3.1 Standardized JSON Schema

All sprite sheets must have an accompanying `.json` metadata file.

#### Schema Definition

```json
{
  "$schema": "sprite-sheet-schema-v1",
  "meta": {
    "image": "player_sheet.png",
    "size": { "w": 1024, "h": 1024 },
    "frameSize": { "w": 128, "h": 128 },
    "scale": 1
  },
  "animations": {
    "idle": {
      "row": 0,
      "frames": 4,
      "frameRate": 8,
      "loop": true
    },
    "walk": {
      "row": 1,
      "frames": 8,
      "frameRate": 12,
      "loop": true
    },
    "jump": {
      "row": 2,
      "frames": 6,
      "frameRate": 10,
      "loop": false
    },
    "attack": {
      "row": 3,
      "frames": 6,
      "frameRate": 15,
      "loop": false
    },
    "death": {
      "row": 4,
      "frames": 8,
      "frameRate": 10,
      "loop": false
    }
  }
}
```

### 3.2 Schema Field Definitions

#### `meta` Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | ✅ | Filename of the sprite sheet PNG |
| `size.w` | number | ✅ | Total sheet width in pixels (must be PO2) |
| `size.h` | number | ✅ | Total sheet height in pixels (must be PO2) |
| `frameSize.w` | number | ✅ | Width of a single frame |
| `frameSize.h` | number | ✅ | Height of a single frame |
| `scale` | number | ❌ | Render scale multiplier (default: 1) |

#### `animations` Object

Each animation key maps to:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `row` | number | ✅ | Row index (0-based) on the sprite sheet |
| `frames` | number | ✅ | Number of frames in this animation |
| `frameRate` | number | ✅ | Frames per second (FPS) |
| `loop` | boolean | ✅ | Whether animation loops |
| `startFrame` | number | ❌ | Starting frame offset (default: 0) |
| `events` | object | ❌ | Frame-specific event triggers |

### 3.3 Animation Event Triggers (Optional)

```json
{
  "animations": {
    "attack": {
      "row": 3,
      "frames": 6,
      "frameRate": 15,
      "loop": false,
      "events": {
        "3": "playSound:sword_swing",
        "5": "spawnHitbox:attack_hitbox"
      }
    }
  }
}
```

### 3.4 Sprite-Sheet Layout Standard

```
┌────────────────────────────────────────────────────────────┐
│  Sheet: 1024×1024  │  Frame: 128×128  │  8 cols × 8 rows   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Row 0: [idle_0][idle_1][idle_2][idle_3][     ][     ]...  │
│  Row 1: [walk_0][walk_1][walk_2][walk_3][walk_4][walk_5].. │
│  Row 2: [jump_0][jump_1][jump_2][jump_3][jump_4][jump_5]   │
│  Row 3: [attack_0][attack_1][attack_2][attack_3]...        │
│  Row 4: [death_0][death_1][death_2][death_3]...            │
│  Row 5: [empty row - reserved for future]                  │
│  Row 6: [empty row - reserved for future]                  │
│  Row 7: [empty row - reserved for future]                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.5 AnimatedSprite Implementation

```javascript
/**
 * AnimatedSprite - Sprite with frame-based animation support
 * Uses standardized JSON metadata schema
 */
export class AnimatedSprite extends Sprite {
  constructor(x, y, sheetImage, metadata) {
    super(x, y, metadata.meta.frameSize.w, metadata.meta.frameSize.h);
    
    this.sheetImage = sheetImage;
    this.meta = metadata.meta;
    this.animations = metadata.animations;
    
    // Animation state
    this.currentAnimation = null;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.isPlaying = false;
    this.onAnimationEnd = null;
  }
  
  /**
   * Play an animation by name
   * @param {string} name - Animation name from metadata
   * @param {function} onEnd - Optional callback when non-looping animation ends
   */
  play(name, onEnd = null) {
    if (!this.animations[name]) {
      console.warn(`Animation not found: ${name}`);
      return;
    }
    
    // Don't restart if already playing same animation
    if (this.currentAnimation === name && this.isPlaying) return;
    
    this.currentAnimation = name;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.isPlaying = true;
    this.onAnimationEnd = onEnd;
  }
  
  /**
   * Update animation frame based on deltaTime
   * @param {number} dt - Delta time in SECONDS
   */
  update(dt) {
    if (!this.isPlaying || !this.currentAnimation) return;
    
    const anim = this.animations[this.currentAnimation];
    const frameDuration = 1 / anim.frameRate; // seconds per frame
    
    this.frameTimer += dt;
    
    // Advance frame(s) - handles frame skipping if dt is large
    while (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      this.currentFrame++;
      
      // Check for animation end
      if (this.currentFrame >= anim.frames) {
        if (anim.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = anim.frames - 1; // Stay on last frame
          this.isPlaying = false;
          if (this.onAnimationEnd) {
            this.onAnimationEnd(this.currentAnimation);
          }
        }
      }
    }
  }
  
  /**
   * Render current animation frame
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.visible || !this.sheetImage) return;
    
    const anim = this.animations[this.currentAnimation];
    if (!anim) return;
    
    // Calculate source rectangle on sprite sheet
    const srcX = this.currentFrame * this.meta.frameSize.w;
    const srcY = anim.row * this.meta.frameSize.h;
    const srcW = this.meta.frameSize.w;
    const srcH = this.meta.frameSize.h;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.scale(this.scaleX, this.scaleY);
    
    ctx.drawImage(
      this.sheetImage,
      srcX, srcY, srcW, srcH,           // Source rectangle
      -this.width / 2, -this.height / 2, // Destination position
      this.width, this.height            // Destination size
    );
    
    ctx.restore();
  }
}
```

---

## 4. Mobile Performance Guardrails

### 4.1 Delta-Time (dt) Requirement

> **MANDATORY:** All movement, animation, and time-based calculations MUST use `deltaTime`.

#### Why Delta-Time?

| Without dt | With dt |
|------------|---------|
| Movement speed varies with frame rate | Consistent speed on all devices |
| 60 FPS device moves 2× faster than 30 FPS | Same speed regardless of FPS |
| Unpredictable physics | Deterministic physics |
| Impossible to debug timing issues | Reproducible behavior |

#### Delta-Time Rules

```javascript
// ❌ WRONG - Frame-rate dependent
update() {
  this.x += 5;                    // 5px per frame = varies with FPS
  this.rotation += 0.1;           // Rotation varies with FPS
  this.timer++;                   // Timer counts frames, not time
}

// ✅ CORRECT - Frame-rate independent
update(dt) {
  this.x += 300 * dt;             // 300 pixels per SECOND
  this.rotation += 2 * dt;        // 2 radians per SECOND
  this.timer += dt;               // Timer counts real seconds
}
```

#### Common dt Patterns

```javascript
/**
 * Standard delta-time patterns
 * Note: dt is in SECONDS (0.016 for 60 FPS, 0.033 for 30 FPS)
 */

// Movement (pixels per second)
const SPEED = 400; // 400 px/s
this.x += SPEED * dt;

// Rotation (radians per second)
const ROTATION_SPEED = Math.PI; // 180° per second
this.rotation += ROTATION_SPEED * dt;

// Cooldown timer
this.fireCooldown -= dt;
if (this.fireCooldown <= 0) {
  this.fire();
  this.fireCooldown = 0.5; // 0.5 second cooldown
}

// Animation frame timing (handled in AnimatedSprite)
this.frameTimer += dt;
if (this.frameTimer >= 1 / this.frameRate) {
  this.frameTimer = 0;
  this.advanceFrame();
}

// Interpolation / Easing
this.progress += dt / this.duration; // 0 to 1 over duration seconds
this.progress = Math.min(this.progress, 1);

// Spawner (spawn every N seconds)
this.spawnTimer += dt;
if (this.spawnTimer >= this.spawnInterval) {
  this.spawnTimer = 0;
  this.spawnEnemy();
}
```

### 4.2 Object Pooling

> **MANDATORY:** Use object pools for any entity spawned more than 10 times per second.

#### When to Use Object Pooling

| Entity Type | Spawn Frequency | Pooling Required |
|-------------|-----------------|------------------|
| Bullets | High (10-60/sec) | ✅ Yes |
| Particles | Very High (100+/sec) | ✅ Yes |
| Enemies | Medium (1-5/sec) | ✅ Recommended |
| Collectibles | Medium | ✅ Recommended |
| UI Elements | Low (on demand) | ❌ No |
| Player | Once | ❌ No |

#### Why Object Pooling?

| Without Pooling | With Pooling |
|-----------------|--------------|
| `new Object()` every spawn | Reuse existing objects |
| Triggers garbage collection | No GC pauses |
| GC causes frame stutters | Smooth 60 FPS |
| Memory fragmentation | Stable memory footprint |

#### Object Pool Implementation

```javascript
/**
 * Generic Object Pool for entity reuse
 * Prevents garbage collection stutters on mobile
 */
export class ObjectPool {
  /**
   * @param {Function} factory - Function that creates new instances
   * @param {Function} reset - Function that resets an instance for reuse
   * @param {number} initialSize - Pre-allocate this many objects
   */
  constructor(factory, reset, initialSize = 20) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.active = [];
    
    // Pre-allocate objects
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }
  
  /**
   * Get an object from the pool (or create if empty)
   * @returns {Object} A ready-to-use object
   */
  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      // Pool exhausted - create new (log warning in dev)
      console.warn('ObjectPool exhausted, creating new instance');
      obj = this.factory();
    }
    
    this.active.push(obj);
    return obj;
  }
  
  /**
   * Return an object to the pool
   * @param {Object} obj - Object to release
   */
  release(obj) {
    const index = this.active.indexOf(obj);
    if (index === -1) return;
    
    this.active.splice(index, 1);
    this.reset(obj);
    this.pool.push(obj);
  }
  
  /**
   * Release all active objects back to pool
   */
  releaseAll() {
    while (this.active.length > 0) {
      const obj = this.active.pop();
      this.reset(obj);
      this.pool.push(obj);
    }
  }
  
  /**
   * Get count of active objects
   */
  getActiveCount() {
    return this.active.length;
  }
  
  /**
   * Get count of available objects in pool
   */
  getAvailableCount() {
    return this.pool.length;
  }
}
```

#### Bullet Pool Example

```javascript
// Create bullet pool with factory and reset functions
const bulletPool = new ObjectPool(
  // Factory: create new bullet
  () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    active: false,
    damage: 1,
    render(ctx) {
      if (!this.active) return;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }),
  // Reset: prepare for reuse
  (bullet) => {
    bullet.x = 0;
    bullet.y = 0;
    bullet.vx = 0;
    bullet.vy = 0;
    bullet.active = false;
  },
  // Initial pool size
  50
);

// Spawn bullet from pool
function fireBullet(x, y, vx, vy) {
  const bullet = bulletPool.acquire();
  bullet.x = x;
  bullet.y = y;
  bullet.vx = vx;
  bullet.vy = vy;
  bullet.active = true;
  return bullet;
}

// Update all active bullets
function updateBullets(dt) {
  for (const bullet of bulletPool.active) {
    if (!bullet.active) continue;
    
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    
    // Release if off-screen
    if (bullet.y < -20 || bullet.y > 1940 || 
        bullet.x < -20 || bullet.x > 1100) {
      bulletPool.release(bullet);
    }
  }
}
```

### 4.3 Off-Screen Culling

> **MANDATORY:** Entities outside the visible area must skip rendering.

#### Culling Boundaries

```javascript
/**
 * Screen bounds with buffer for culling
 * Buffer prevents pop-in at screen edges
 */
const CULL_BOUNDS = {
  left: -100,
  right: 1180,   // 1080 + 100 buffer
  top: -100,
  bottom: 2020   // 1920 + 100 buffer
};

/**
 * Check if entity is within cullable bounds
 * @param {Object} entity - Must have x, y, width, height
 * @returns {boolean} True if visible (should render)
 */
function isOnScreen(entity) {
  return (
    entity.x + entity.width > CULL_BOUNDS.left &&
    entity.x < CULL_BOUNDS.right &&
    entity.y + entity.height > CULL_BOUNDS.top &&
    entity.y < CULL_BOUNDS.bottom
  );
}
```

#### Culling Integration Pattern

```javascript
/**
 * Render method with culling
 */
render(ctx) {
  // Skip render if off-screen
  if (!isOnScreen(this)) return;
  
  // Normal render logic
  ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
}

/**
 * Update method with optional logic culling
 * Note: Some entities need updates even when off-screen (audio, timers)
 */
update(dt) {
  // Always update position (needed for scroll-in)
  this.x += this.vx * dt;
  this.y += this.vy * dt;
  
  // Skip expensive logic if off-screen
  if (!isOnScreen(this)) return;
  
  // Expensive logic only when visible
  this.updateAnimation(dt);
  this.checkCollisions();
}
```

#### Hybrid Culling for Particle Systems

```javascript
/**
 * Particle system with render culling
 * Particles still update off-screen but don't render
 */
class ParticleSystem {
  update(dt) {
    for (const particle of this.particles) {
      // Always update physics (cheap)
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      
      // Release dead particles
      if (particle.life <= 0) {
        this.pool.release(particle);
      }
    }
  }
  
  render(ctx) {
    for (const particle of this.particles) {
      // Cull off-screen particles
      if (!isOnScreen(particle)) continue;
      
      // Render visible particles
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }
}
```

### 4.4 Performance Budget

| Metric | Target | Danger Zone |
|--------|--------|-------------|
| Frame Time | < 16.6ms (60 FPS) | > 33ms (30 FPS) |
| Draw Calls | < 100 per frame | > 200 |
| Active Entities | < 500 | > 1000 |
| Particles | < 200 | > 500 |
| Texture Memory | < 64 MB | > 128 MB |
| JS Heap | < 50 MB | > 100 MB |

---

## 5. Audio Standards

### 5.1 Supported Formats

| Format | Browser Support | File Size | Quality | Recommendation |
|--------|-----------------|-----------|---------|----------------|
| **MP3** | Universal (99%+) | Small | Good | ✅ Primary format |
| **OGG** | Chrome, Firefox, Edge | Smaller | Better | Fallback for non-Safari |
| **AAC** | Safari, iOS | Small | Good | iOS fallback |
| **WAV** | Universal | Large | Lossless | ❌ Avoid (too large) |

### 5.2 Audio Specifications

| Audio Type | Format | Sample Rate | Bit Rate | Max Duration | Max File Size |
|------------|--------|-------------|----------|--------------|---------------|
| **Music** | MP3 | 44.1 kHz | 128-192 kbps | 3-5 min | 3 MB |
| **SFX** | MP3 | 44.1 kHz | 128 kbps | < 3 sec | 100 KB |
| **Ambient** | MP3 | 44.1 kHz | 96-128 kbps | Loop (30s-2min) | 1 MB |
| **Voice** | MP3 | 22.05 kHz | 64-96 kbps | < 10 sec | 200 KB |

### 5.3 Mobile Audio Unlock Requirement

> **CRITICAL:** Mobile browsers block audio playback until user interaction.

#### The Problem

- iOS Safari, Chrome Mobile, and Firefox Mobile require a user gesture (tap, click) before any audio can play
- Calling `audio.play()` before user interaction will fail silently or throw an error
- This is a **security feature** to prevent unwanted autoplay

#### The Solution: Audio Unlock Pattern

```javascript
/**
 * AudioUnlocker - Unlocks Web Audio on first user interaction
 * Must be called before any audio playback on mobile
 */
class AudioUnlocker {
  constructor(audioManager) {
    this.audioManager = audioManager;
    this.isUnlocked = false;
    this.unlockPromise = null;
  }
  
  /**
   * Initialize unlock listeners
   * Call this in your boot/title scene
   */
  init() {
    if (this.isUnlocked) return Promise.resolve();
    
    this.unlockPromise = new Promise((resolve) => {
      const unlock = () => {
        if (this.isUnlocked) return;
        
        // Create and play silent audio to unlock
        const silentAudio = new Audio();
        silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQAAAAAAAAAAaD///////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+M4wAALMAHsY0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        silentAudio.volume = 0.001;
        
        const playPromise = silentAudio.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.isUnlocked = true;
            console.log('Audio unlocked');
            
            // Remove listeners
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('touchend', unlock);
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            
            resolve();
          }).catch(() => {
            // Still locked, wait for next interaction
          });
        }
      };
      
      // Listen for any user interaction
      document.addEventListener('touchstart', unlock, { once: false });
      document.addEventListener('touchend', unlock, { once: false });
      document.addEventListener('click', unlock, { once: false });
      document.addEventListener('keydown', unlock, { once: false });
    });
    
    return this.unlockPromise;
  }
  
  /**
   * Check if audio is unlocked
   */
  get unlocked() {
    return this.isUnlocked;
  }
}
```

#### Integration in Title Scene

```javascript
class TitleScene extends Scene {
  constructor() {
    super('TitleScene');
    this.audioUnlocker = null;
    this.showTapPrompt = true;
  }
  
  init() {
    this.audioUnlocker = new AudioUnlocker(this.engine.audioManager);
    this.audioUnlocker.init();
  }
  
  populateLayers() {
    // "Tap to Start" prompt
    const tapPrompt = {
      alpha: 1,
      render: (ctx) => {
        if (!this.showTapPrompt) return;
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 300) * 0.5; // Pulse
        ctx.fillText('TAP TO START', 540, 1400);
        ctx.globalAlpha = 1;
      }
    };
    this.layerManager.addToLayer(tapPrompt, 'TEXT');
  }
  
  update(dt) {
    if (this.inputHandler.mouse.pressed) {
      if (this.audioUnlocker.unlocked) {
        // Audio ready - play music and proceed
        this.engine.audioManager.playMusic('title_theme.mp3');
        this.sceneManager.switchTo('MainMenu');
      } else {
        // First tap unlocks audio, next tap proceeds
        this.showTapPrompt = true;
      }
    }
  }
}
```

### 5.4 Audio File Organization

```
/assets/
├── music/
│   ├── title_theme.mp3       (< 3 MB, loopable)
│   ├── gameplay_loop.mp3     (< 3 MB, loopable)
│   ├── boss_battle.mp3       (< 2 MB, loopable)
│   └── game_over.mp3         (< 1 MB, one-shot)
│
├── sfx/
│   ├── ui/
│   │   ├── click.mp3         (< 50 KB)
│   │   ├── hover.mp3         (< 30 KB)
│   │   └── back.mp3          (< 50 KB)
│   │
│   ├── player/
│   │   ├── jump.mp3          (< 80 KB)
│   │   ├── land.mp3          (< 50 KB)
│   │   ├── attack.mp3        (< 100 KB)
│   │   └── hurt.mp3          (< 80 KB)
│   │
│   └── game/
│       ├── explosion.mp3     (< 100 KB)
│       ├── coin.mp3          (< 50 KB)
│       └── powerup.mp3       (< 80 KB)
│
└── ambient/
    ├── forest_loop.mp3       (< 1 MB, loopable)
    └── rain_loop.mp3         (< 800 KB, loopable)
```

---

## 6. Memory Management

### 6.1 AssetLoader Cache Management

> **CRITICAL:** Clear unused assets between scenes to prevent mobile memory crashes.

#### The Problem

- Mobile devices have limited RAM (1-4 GB shared with OS)
- iOS aggressively kills apps exceeding ~200 MB
- Accumulated textures across scenes cause crashes
- `Image` objects remain in memory until explicitly dereferenced

#### Scene-Based Asset Strategy

```javascript
/**
 * Asset loading strategy per scene type
 */
const ASSET_STRATEGY = {
  // Persistent: Never unloaded (small, universal assets)
  persistent: [
    'ui_spritesheet.png',
    'common_sfx.mp3',
    'fonts.png'
  ],
  
  // Scene-specific: Load on enter, unload on exit
  sceneAssets: {
    'TitleScene': ['title_bg.png', 'title_music.mp3'],
    'GameScene': ['player.png', 'enemies.png', 'level1_bg.png', 'game_music.mp3'],
    'BossScene': ['boss.png', 'boss_music.mp3', 'boss_arena.png']
  }
};
```

### 6.2 Extended AssetLoader with Cache Clearing

```javascript
/**
 * Extended AssetLoader with memory management
 * Add these methods to your existing AssetLoader class
 */

/**
 * Unload a specific image from cache
 * @param {string} id - Asset identifier
 */
unloadImage(id) {
  const img = this.images.get(id);
  if (img) {
    // Remove reference to allow garbage collection
    img.src = '';
    this.images.delete(id);
    console.log(`Unloaded image: ${id}`);
  }
}

/**
 * Unload a specific audio from cache
 * @param {string} id - Asset identifier
 */
unloadAudio(id) {
  const audio = this.audio.get(id);
  if (audio) {
    audio.pause();
    audio.src = '';
    this.audio.delete(id);
    console.log(`Unloaded audio: ${id}`);
  }
}

/**
 * Unload a specific video from cache
 * @param {string} id - Asset identifier
 */
unloadVideo(id) {
  const video = this.videos.get(id);
  if (video) {
    video.pause();
    video.src = '';
    this.videos.delete(id);
    console.log(`Unloaded video: ${id}`);
  }
}

/**
 * Unload multiple assets by ID
 * @param {string[]} ids - Array of asset IDs to unload
 */
unloadAssets(ids) {
  for (const id of ids) {
    this.unloadImage(id);
    this.unloadAudio(id);
    this.unloadVideo(id);
  }
}

/**
 * Unload all assets EXCEPT the specified persistent ones
 * @param {string[]} persistentIds - IDs to keep loaded
 */
unloadAllExcept(persistentIds) {
  const keepSet = new Set(persistentIds);
  
  // Unload images
  for (const [id] of this.images) {
    if (!keepSet.has(id)) {
      this.unloadImage(id);
    }
  }
  
  // Unload audio
  for (const [id] of this.audio) {
    if (!keepSet.has(id)) {
      this.unloadAudio(id);
    }
  }
  
  // Unload videos
  for (const [id] of this.videos) {
    if (!keepSet.has(id)) {
      this.unloadVideo(id);
    }
  }
  
  console.log(`Cache cleared. Keeping: ${persistentIds.join(', ')}`);
}

/**
 * Clear ALL cached assets
 * Use with caution - requires reloading everything
 */
clearAllCache() {
  for (const [id] of this.images) {
    this.unloadImage(id);
  }
  for (const [id] of this.audio) {
    this.unloadAudio(id);
  }
  for (const [id] of this.videos) {
    this.unloadVideo(id);
  }
  
  this.images.clear();
  this.audio.clear();
  this.videos.clear();
  
  console.log('All asset cache cleared');
}

/**
 * Get current cache memory estimate (rough)
 * @returns {Object} Memory stats
 */
getCacheStats() {
  let imageMemory = 0;
  
  for (const [id, img] of this.images) {
    if (img.complete) {
      // Estimate: width × height × 4 bytes (RGBA)
      imageMemory += img.width * img.height * 4;
    }
  }
  
  return {
    imageCount: this.images.size,
    audioCount: this.audio.size,
    videoCount: this.videos.size,
    estimatedImageMemory: `${(imageMemory / 1024 / 1024).toFixed(2)} MB`
  };
}
```

### 6.3 Scene Exit Cleanup Pattern

```javascript
/**
 * Scene with proper asset cleanup
 */
class GameScene extends Scene {
  constructor() {
    super('GameScene');
    this.sceneAssets = ['player.png', 'enemies.png', 'level_bg.png', 'game_music.mp3'];
  }
  
  async init() {
    // Load scene-specific assets
    await this.engine.assetLoader.loadImages([
      { id: 'player', path: '/assets/images/player.png' },
      { id: 'enemies', path: '/assets/images/enemies.png' },
      { id: 'level_bg', path: '/assets/images/level_bg.png' }
    ]);
  }
  
  exit() {
    super.exit();
    
    // Stop music
    this.engine.audioManager.stopMusic();
    
    // Unload scene-specific assets
    this.engine.assetLoader.unloadAssets(this.sceneAssets);
    
    // Force garbage collection hint (browser may ignore)
    if (window.gc) window.gc();
    
    console.log('GameScene assets unloaded');
  }
}
```

### 6.4 Memory Monitoring (Debug Only)

```javascript
/**
 * Memory monitor for development builds
 * Remove or disable in production
 */
class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 60;
  }
  
  update() {
    if (!performance.memory) return; // Chrome only
    
    const used = performance.memory.usedJSHeapSize / 1024 / 1024;
    this.samples.push(used);
    
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  render(ctx) {
    if (this.samples.length === 0) return;
    
    const current = this.samples[this.samples.length - 1];
    const max = Math.max(...this.samples);
    
    // Warning color if > 100 MB
    ctx.fillStyle = current > 100 ? '#ff4444' : '#44ff44';
    ctx.font = '24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`MEM: ${current.toFixed(1)} MB (peak: ${max.toFixed(1)} MB)`, 20, 60);
  }
}
```

### 6.5 Memory Budget

| Category | Budget | Warning | Critical |
|----------|--------|---------|----------|
| Total JS Heap | < 50 MB | 75 MB | 100 MB |
| Texture Memory | < 64 MB | 100 MB | 128 MB |
| Audio Buffers | < 10 MB | 20 MB | 30 MB |
| Object Pools | < 5 MB | 10 MB | 15 MB |

---

## 7. Quick Reference Tables

### 7.1 Image Size Quick Reference

| Asset Type | Dimensions | Format | Max Size |
|------------|------------|--------|----------|
| Full-screen BG | 1080×1920 | PNG/WebP | 500 KB |
| Scroll tile (V) | 1080×512 | PNG | 200 KB |
| Scroll tile (H) | 512×1920 | PNG | 200 KB |
| Sprite sheet | ≤2048×2048 | PNG | 500 KB |
| UI elements | 512×512 | PNG | 100 KB |

### 7.2 PO2 Dimension Reference

| PO2 Value | Common Use |
|-----------|------------|
| 64 | Small icons, particles |
| 128 | Medium sprites, UI buttons |
| 256 | Large sprites, tiles |
| 512 | Character sheets, tiles |
| 1024 | Full sprite sheets |
| 2048 | Maximum sheet size |

### 7.3 Performance Targets

| Metric | Target | Max Acceptable |
|--------|--------|----------------|
| FPS | 60 | 30 |
| Frame time | < 16.6 ms | < 33 ms |
| Draw calls | < 50 | < 100 |
| Active entities | < 200 | < 500 |
| Memory (JS heap) | < 50 MB | < 100 MB |
| Texture memory | < 64 MB | < 128 MB |

### 7.4 Audio Format Reference

| Type | Format | Sample Rate | Max Duration | Max Size |
|------|--------|-------------|--------------|----------|
| Music | MP3 | 44.1 kHz | 3-5 min | 3 MB |
| SFX | MP3 | 44.1 kHz | < 3 sec | 100 KB |
| Ambient | MP3 | 44.1 kHz | 30s-2min | 1 MB |

### 7.5 Layer Reference

| Layer | Index | Purpose |
|-------|-------|---------|
| BG_FAR | 0 | Far parallax |
| BG_NEAR | 1 | Near parallax |
| VIDEO_IMAGE | 2 | Full-screen media |
| SHAPES | 3 | Primitives, particles |
| SPRITES | 4 | Game entities |
| TEXT | 5 | HUD, labels |
| UI_BUTTONS | 6 | Touch UI |

---

## Appendix A: Checklist for Production Release

```
PRE-RELEASE ASSET AUDIT
═══════════════════════

□ All sprite sheets ≤ 2048×2048
□ All sprite sheets are PO2 dimensions
□ All images optimized (TinyPNG/Squoosh)
□ No single image > 500 KB
□ Total texture memory < 64 MB per scene
□ All audio files are MP3 format
□ Music files < 3 MB each
□ SFX files < 100 KB each
□ Audio unlock implemented for mobile

PRE-RELEASE CODE AUDIT
══════════════════════

□ All movement uses deltaTime (dt)
□ Object pools for bullets/particles
□ Off-screen culling implemented
□ Scene exit() clears scene-specific assets
□ No console.log in production
□ Memory monitor disabled in production
□ Tested on low-end device (2GB RAM)
□ Tested at 30 FPS (throttled)
□ No frame drops in 5-minute gameplay
```

---

*End of Asset Pipeline & Performance Specifications*
