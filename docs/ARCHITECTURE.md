# Technical Architecture

**Stack:** TypeScript + Phaser 3.90 + Vite. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. Later wrapped with Capacitor for TestFlight.

## Display
Fixed logical height of 720 px; width follows the screen's aspect ratio (`src/config/display.ts`), scaled to fill. HUD reads iPhone safe-area insets via a CSS probe (`src/core/safeArea.ts`).

## Scenes (`src/scenes/`)
- **Boot**: generates placeholder textures in code (will become the asset loader).
- **Title**: tap to start (also unlocks iOS audio).
- **Game**: world, physics, room, Eugene. Reads `inputState` each frame.
- **Hud**: runs on top of Game. Owns touch joysticks and keyboard/mouse fallback; writes `inputState`.

## Data flow
`Hud` → `core/inputState` → `Game` → `entities/Player`.
Systems will announce gameplay events on `core/events.ts` (event bus); dialogue, audio, scoring and Easter eggs listen there instead of being wired into combat code.

## Content as data
- `src/config/`: tuning numbers (balance, controls, display, theme colors).
- `src/data/`: content (rooms now; germs, equipment, waves, dialogue later).

## Testing
`npm run build && npm run smoke` serves the build, opens it in a phone-sized touch browser, drives both sticks, checks Eugene moves and faces the aim direction, and fails on console errors.
