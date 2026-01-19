# CANVAS_TEMPLATE
A folder with an initial setup for my js canvas apps and games.

# 1080x1920 Universal Canvas Engine (Platinum Template)

## Architecture
- **Resolution:** Internal 1080 x 1920 (9:16).
- **Coordinate System:** Handled by `InputHandler`. Use canvas-space coordinates (0-1080, 0-1920) for all game logic.
- **Layers (Bottom to Top):**
  1. BG_FAR (Parallax)
  2. BG_NEAR (Parallax)
  3. VIDEO_IMAGE
  4. SHAPES
  5. SPRITES
  6. TEXT
  7. UI_BUTTONS (Always on top)

## How to use this Template
1. Duplicate this folder.
2. Run Phase 2: Game Injector Prompt in Cursor.
3. Start coding scenes in `src/js/scenes/`.

## Deployment
1. `npm run build` -> Generates the `/dist` folder.
2. `npx cap sync` -> Pushes `/dist` to iOS/Android.
