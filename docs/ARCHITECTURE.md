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

## Combat (M2)
- `systems/Sprayer` runs any spray-type equipment from `data/equipment.ts` (supply, fire rate, spread, refill) and fires pooled `entities/Droplet`s.
- `entities/Germ` is one pooled class configured by `data/germs.ts`; damage = droplet damage × equipment effectiveness for the germ's tag.
- `systems/FlowField` floods a 40 px grid from Eugene every 250 ms; germs step toward the closer neighbor cell, so they route around furniture at a flat cost regardless of germ count.
- `systems/Fx` owns capped/pooled feedback (particles, stains, damage numbers). `core/sfx` holds placeholder synthesized sounds, one named slot per sound.

## Rounds and the run
- `systems/WaveDirector` owns round state and the spawn queue (count, mix, max alive, spawn interval, hp/speed scaling, boss rounds; all from `data/waves.ts`). `GameScene` asks it each frame and does the spawning.
- `systems/DiamondBrain` steers the boss germ (a normal pooled `Germ` whose def has `brain: 'diamond'`): speech bubbles (`ui/SpeechBubble`), Mandatory Meeting, Write-Ups, Policy Tantrum. It talks to the scene through a small `BossHost` interface; lines live in `data/diamond.ts`, numbers in `BALANCE.diamond`.
- `systems/PatientDirector` runs patients (`entities/Patient`, pooled, max 3): spawning at doors, wandering to open floor spots, violations (data in `data/patients.ts`) that spawn germs through `GameScene`, and cleaning when sprayed. Numbers in `BALANCE.patients`.
- Economy: `GameScene` owns this run's Copays (`addCopays`, `CopaysChanged`), the Sinus Purge cooldown (`PurgeChanged`) the USE button (`StationNearby`: supply carts and locked doors) and which rooms are open (`unlockRoom`, `RoomUnlocked`, `RoomEntered`). Rooms and doors are data in `data/rooms.ts` (`RoomArea`, door obstacles with `opens` + `cost`); buying a door removes its collider and calls `FlowField.rebuild`. All germ damage goes through `GameScene.damageGerm` (spray and purge alike). `Sprayer` tracks bottle and jug (`reserve`).
- `Player` owns health, invulnerability and regen. On death `GameScene.endRun` freezes the room, records the score (`core/save.ts`), stops the HUD and launches `GameOverScene`. SCRUB IN AGAIN restarts the Game scene from scratch.
- The HUD pulls the current state on start via `GameScene.broadcastState()`, then follows events.

## Settings
`core/settings.ts` holds player settings saved in localStorage (wrapped in try/catch; falls back to defaults). Currently: `autoAim`.

## Content as data
- `src/config/`: tuning numbers (balance, controls, display, theme colors).
- `src/data/`: content (rooms now; germs, equipment, waves, dialogue later).

## Testing
Debug switches live in `core/debug.ts` (`?round`, `?copays`, `?god`, `?fps`, `?debug`); see the changelog for usage. They also run in the smoke test.
`npm run build && npm run smoke` serves the build, opens it in a phone-sized touch browser, drives both sticks, checks Eugene moves and faces the aim direction, waits for germs, sprays them until some die, taps Refill, and fails on console errors. CI runs it on every pull request.
- Orientation: `core/orientation.ts` keeps the game landscape. On a touch screen taller than wide it rotates `#game` 90° with CSS, and patches Phaser's parent measuring, centering and pointer mapping to match; `safeArea.ts` rotates the insets too.
