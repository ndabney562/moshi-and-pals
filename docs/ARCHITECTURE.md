# Technical Architecture

**Stack:** TypeScript + Phaser 3.90 + Vite. Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. A SwiftUI wrapper embeds the same sealed artifact.

## iPhone app (`ios/`, v0.33)
A SwiftUI app (iOS 17+, MVVM, no dependencies) around the same web build. `scripts/ios-bundle-web.sh` (an Xcode build phase) verifies the shared relative-URL `dist/` artifact against source and file checksums, then copies it into the app as `Game/`. `scripts/verify-web-bundle.mjs` rejects missing, stale or changed files. No native-specific JavaScript build exists. `WebGameHost` keeps one `WKWebView` alive for the app's life, serving those files at `moshi://app/` (`BundledGameSchemeHandler`). The custom scheme gives localStorage a stable origin.
- **Game side:** `src/core/native.ts`, active only with both `?native` and a callable WebKit host, detected in `core/platform.ts`. A browser query without a host falls back to Title. Boot goes to the empty `Native` scene instead of Title, and its loop sleeps there. `toTitle()` (used by every way back to the menu) returns there and posts `exit`. `window.moshiNative` takes `start({kind})`, `open('board'|'locker')`, `hire(id)`, `setSettings(patch)` and `refresh()`. The game posts `snapshot` (saves, records, achievements, Atlas, today's modifiers, saved shift, and the Pals' and germs' textures once), `ready`, `playing`, `exit` and `haptic` (from the event bus).
- **App side:** `ios/MoshiKit` (Swift package, unit-tested) holds the Codable snapshot models, `BridgeMessage`/`BridgeCommand`, `GameStore` (the single source of truth: it queues commands until `ready`, caches the last snapshot to disk and throttles haptics) and the Play/Progress/Settings view models. `ios/MoshiAndPals` holds the views and `DesignSystem/Theme.swift` (all colors, type, spacing, motion). Menu tests use `-ui-testing` with sample data; integration tests use `-web-integration`, an ephemeral real WKWebView and an empty snapshot cache. The real game reports `playing` after shift initialization; native state never treats the start command alone as proof of gameplay.

## Display
Fixed logical height of 720 px; width follows the screen's aspect ratio (`src/config/display.ts`), scaled to fill. Visible dimensions follow `visualViewport` and `100dvh`. Resize work is coalesced per animation frame, with a cheap dimension check on active frames to recover from missed WKWebView resize callbacks. HUD reads iPhone safe-area insets via a CSS probe and the actual canvas scale (`src/core/safeArea.ts`).

## Scenes (`src/scenes/`)
- **Boot**: generates placeholder textures in code (will become the asset loader).
- **Title**: tap to start (also unlocks iOS audio).
- **Game**: world, physics, room, Eugene. Reads `inputState` each frame.
- **Hud**: runs on top of Game. Owns touch joysticks and keyboard/mouse fallback; writes `inputState`.

## Data flow
`Hud` → `core/inputState` → `Game` → `entities/Player`.
Systems announce gameplay events on `core/events.ts` (event bus); dialogue, audio, scoring and Easter eggs listen there instead of being wired into combat code.

## Pals and scribes (M16, M18)
- `data/characters.ts` lists the playable Pals (passive + signature id); GameScene runs the signature (`sinusPurge`, `codeBlue`, `cleanField`, `grievance`). Ken's passive multiplies damage to Diamond inside `damageGerm`, so every source counts.
- `systems/Scribes` runs Omar, Alan and Donald the X-ray tech (no physics bodies; steer toward a spot behind Eugene, FlowField steps when a wall is in the way, straight over furniture to a patient in the same room, teleport when far or stuck). They hurt germs through `damageGerm` and patients through `PatientDirector.sprayed`, the same paths as Eugene. Unlocks are `scribe:<id>` in progress `owned`; `Powerups` filters its drop pool with them. Omar and Alan (`ScribeDef.waitsIn`) wait in a random locked exam room each shift (`GameScene.hideScribes`); `unlockRoom` lets them out for the rest of the shift (`releaseScribe`). Donald has no `cost`: he waits in X-ray (`waitsIn`, `unlockRoom: 'xray'`) even before he's unlocked, and opening it unlocks him (`progress.unlockScribe`). `progress.staffTiers` drops Overtime for helpers with `waitsIn`.
- `systems/FrontDesk` runs Selina and Elaine (`ScribeDef.desk`; `Scribes` skips them). Summoned through `GameScene.summonHelper` like every helper; they sit behind the RECEPTION desk and call `PatientDirector.openLine`/`closeLine`. While the line is open the director walks wandering patients to the line spots (no violations, no leaving) and `checkIn` sends one home through `onCleaned`. Staff upgrades: `progress.staff` levels, `staffBoost(id)` (power/speed/duration), read at summon by both systems; `summonHelper` stretches the visit and the HUD timer.

## Combat (M2)
- `systems/Sprayer` runs any spray-type equipment from `data/equipment.ts` (supply, fire rate, spread, refill) and fires pooled `entities/Droplet`s.
- `entities/Germ` is one pooled class configured by `data/germs.ts`; damage = droplet damage × equipment effectiveness for the germ's tag.
- `systems/FlowField` floods a 40 px grid from Eugene every 250 ms; germs step toward the closer neighbor cell, so they route around furniture at a flat cost regardless of germ count.
- `systems/Fx` owns capped/pooled feedback (particles, stains, damage numbers). `core/sfx` holds placeholder synthesized sounds, one named slot per sound. `core/music` is a look-ahead Web Audio sequencer on the same context: it plays the step patterns in `data/music.ts` with synthesized instruments, each song split into a `base` and a `pressure` layer. `GameScene.updateMusic` calls `setMusicMix(song, pressure)` every frame (boss theme while a boss round runs or a boss is alive; pressure from the crowd and Eugene's health, tuned in `config/music.ts`); song changes wait for the next bar.

## The clinic map (M8)
`data/clinic.ts` describes rooms as boxes (in floor-plan pixels, converted with `g()`/`u()`) with doors; walls are generated from room outlines and every door/opening is cut out of every wall it touches. A room may have several boxes (open areas like the waiting room and hallways). Floors sit side by side in one world (`RoomLayout.floors`; the camera is bounded to Eugene's floor). `RoomLayout.stairs` are paired zones: walking into one end puts you at the other end's `arrive` point. `FlowField.setPortals` links those cells, so germs path through stairs; `GameScene.updateStairs` moves Eugene and any germ on a different floor from him. The old fictional layout (`MOSHILAND` in `data/rooms.ts`) is no longer used.

## Special germs (M7)
- `GermDef.armor` (Spore Pod): `GameScene.armorMult` scales droplet damage by hit direction vs the germ's facing; `Germ.flip` (Sinus Purge) disables it. Armored germs turn at `turnDegPerSec`.
- `GermDef.spit` (Sneezer): `systems/GermBehaviors.steerSpitter` keeps distance, circles, winds up and calls `fireGlob`; `entities/Glob` (pooled) and `systems/Puddles` (pooled) handle the mucus. Puddles slow Eugene through `Player.setSpeedMod` (a per-source multiplier stack, also used by Diamond's meeting).
- `WAVES.aliveLimit` caps how many of a type are alive; `WaveDirector` lets other germs go first when one is capped.

## Rounds and the run
- `systems/WaveDirector` owns round state and the spawn queue (count, mix, max alive, spawn interval, hp/speed scaling, boss rounds; all from `data/waves.ts`). `GameScene` asks it each frame and does the spawning.
- Bosses implement `systems/BossBrain` (update, movement override, onHurt, damageTaken...). `WAVES.bossFor(r)` picks Diamond or Patient Zero (`systems/PatientZeroBrain`).
- `systems/DiamondBrain` steers the boss germ (a normal pooled `Germ` whose def has `brain: 'diamond'`): speech bubbles (`ui/SpeechBubble`), Mandatory Meeting, Write-Ups, Policy Tantrum. It talks to the scene through a small `BossHost` interface; lines live in `data/diamond.ts`, numbers in `BALANCE.diamond`.
- `systems/PatientDirector` runs patients (`entities/Patient`, pooled, max 3): spawning at doors, wandering to open floor spots, violations (data in `data/patients.ts`) that spawn germs through `GameScene`, and cleaning when sprayed. Numbers in `BALANCE.patients`.
- Economy: `GameScene` owns this run's Copays (`addCopays`, `CopaysChanged`), the Sinus Purge cooldown (`PurgeChanged`) the USE button (`StationNearby`: supply carts and locked doors) and which rooms are open (`unlockRoom`, `RoomUnlocked`, `RoomEntered`). Rooms and doors are data in `data/rooms.ts` (`RoomArea`, door obstacles with `opens` + `cost`); buying a door removes its collider and calls `FlowField.rebuild`. All germ damage goes through `GameScene.damageGerm` (spray and purge alike). `Sprayer` tracks bottle and jug (`reserve`).
- `Player` owns health, invulnerability and regen. On death `GameScene.endRun` freezes the room, records the score (`core/save.ts`), stops the HUD and launches `GameOverScene`. SCRUB IN AGAIN restarts the Game scene from scratch.
- The HUD pulls the current state on start via `GameScene.broadcastState()`, then follows events.

## Pause and game time
The HUD owns pause (`HudScene.pause/resume`): it releases all touches, clears `inputState` and pauses the Game scene; it also auto-pauses on Phaser's `hidden`/`blur` events. `core/gameClock.useGameTime` makes the Game scene's `time.now` advance only by frame deltas while it runs, so every `time.now + ms` timer freezes with the game. Game code must use `this.time.now` (or the `time` GameScene.update passes along), never the loop's wall-clock time. Any touch calls `sfx.resumeAudio()` because iOS suspends audio after interruptions.

## Settings
`core/settings.ts` holds player settings saved in localStorage (wrapped in try/catch; falls back to defaults). Currently: `autoAim`, `sound`, `music` (all in the pause menu), `character` and `difficulty` (title screen).

## Tools (M12)
Every tool is a `Sprayer` (supply, fire rate, refills, upgrades). Spray tools launch pooled droplets; tools with an `attack` (Wipes `swipe`, Gel Launcher `lob`, Defib Paddles `chain`) hand each shot to `systems/Arsenal.ts`. Both paths end in `GameScene.hitGerm` (effectiveness, crits, slow, armor, then `damageGerm`). Crates open the Supply Requisition: `GameScene` emits `RequisitionOpened`, the HUD pauses the game and shows `ui/RequisitionPanel`, and the pick or appeal comes back as an event.

## Achievements and offline (M13)
- `data/achievements.ts` lists them; `core/achievements.ts` stores unlocked ids under their own localStorage key and emits `AchievementUnlocked` (HUD toast). `GameScene.achieve(id)` is called where each one happens and remembers this run's unlocks for the Discharge Summary.
- `public/sw.js` (hand-written): network-first for the page, cache-first for everything else, one cache per build (`sw.js?v=<build>`). The title screen hands it everything already loaded (`offerFilesToCache`), so the next launch works offline. Test browsers skip the worker unless the URL has `?sw`.
- The build writes `version.json`; `core/updates.ts` checks it at launch and whenever the app returns to the foreground, and the title screen offers UPDATE READY (the pause menu mentions it).

## Room traps and vending (M14)
Traps are stations (`GameScene.buildStations`, kinds `handDryer`, `autoclave`, `xrayControls` in `data/clinic.ts`): `useTrap` pays, starts the recharge (`trapReadyAt`), and fires the effect; numbers in `BALANCE.traps`. The vending machine (`vending`) uses the same `ui/ChoicePanel` as the Supply Requisition (`VendingOpened` / `VendingPicked` / `VendingDone` / `VendingCancelled`); snacks in `data/vending.ts` set run perks (`perks`, `player.maxHp`, a `snack` speed mod).

## Residency (M15)
`core/progress.ts` keeps between-run progress under its own key (credits, owned board items, the chosen Specialty and Starter Kit tool, lifetime kills per germ). `GameScene.applyResidency` applies the Specialty's `mods` at the start of a shift (max health, speed, start Copays, jug size; `hitGerm`, `sinusPurge`, `scaled` and `upgradeCost` read the rest), and `endRun` banks the shift's credits and kills. `scenes/BoardScene.ts` is the board (Specialties, Starter Kit, Atlas), opened from the title screen. The Equipment Locker (`scenes/LockerScene.ts`, numbers in `config/locker.ts`) spends `progress.bank` (`bankFor` share of each shift's Copays) on per-tool levels in `progress.locker`; `Sprayer` applies them with `withLocker` over its tiered definition.

## Today's Shift, modifiers, difficulty (M17)
- `core/rng.ts`: seeded mulberry32. `seedRun(seed)` at the start of every shift reseeds named streams (`runRng.wave`, `spawn`, `loot`, `patients`, `ai`, `world`), so one system's frame-dependent rolls can't shift another's. Gameplay rolls use them; cosmetic ones (particles, shake, sound, dialogue) stay on `Math.random`.
- `core/shift.ts`: the title picks the next shift's kind (`chooseShift`); `GameScene.create` asks `nextShift()` for `{ daily?, difficulty, mods, seed }`, so PLAY AGAIN repeats it. `dailyShift(date)` hashes the local date into the seed and 2 modifiers.
- Modifiers are data (`data/modifiers.ts`), numbers in `BALANCE.modifiers`; `GameScene.hasMod(id)` gates each effect. Power Outage is one pre-drawn canvas texture (dark with a soft hole) moved to Eugene's screen position each frame. Construction adds the room's doors to a static group that collides with Eugene only, after a coarse `FlowField` check that he can still walk back to the waiting room.
- Difficulty multipliers (`BALANCE.difficulty`) apply in `scaled()` (germ HP), `hurtPlayer` (damage), `WaveDirector.intervalMult` and kill Copays. Save v3 keeps records per difficulty plus the day's best (`core/save.ts`).

## The Miracle Cure (secret quest)
`systems/MiracleCure.ts` keeps the quest's state and hands GameScene its stations (magazine table, reception phone, office microwave and fridge, the stalls, the Records Room door, CLOCK OUT on the front exit); each is `gone` until the step before it is done. GameScene calls it on X-ray pulses, vending (slot B4), round start/end and the Fax Machine's death. The Records Room is a sealed extra floor in `data/clinic.ts` (`RECORDS_ROOM`, room `secret: true`: no fog, not counted); entering teleports Eugene, `WaveDirector.holdBreak` keeps the break from running out while he's inside, and leaving clears what's left in there. `systems/FaxMachineBrain.ts` is the boss. `endRun(true)` is the alternate ending (`RunResult.clockedOut`: credits roll in GameOverScene, `progress.grant('scrubCap')`, then Eugene uses the `eugene-cap` texture).

## Content as data
- `src/config/`: tuning numbers (balance, controls, display, theme colors).
- `src/data/`: content (rooms now; germs, equipment, waves, dialogue later).

## Testing
Debug switches live in `core/debug.ts` (`?round`, `?copays`, `?god`, `?fps`, `?debug`, `?mods`, `?seed`); see the changelog for usage. They also run in the smoke test.
`npm run build && npm run smoke` serves the build, opens it in a phone-sized touch browser, drives both sticks, checks Eugene moves and faces the aim direction, waits for germs, sprays them until some die, taps Refill, and fails on console errors. CI runs it on every pull request.
- Orientation: `core/orientation.ts` keeps the game landscape. On a touch screen taller than wide it rotates `#game` 90° with CSS, and patches Phaser's parent measuring, centering and pointer mapping to match; `safeArea.ts` rotates the insets too.
- **Save & Quit** (`core/shiftSave.ts`, key `moshi.shift.v1`): `GameScene.snapshot(round)` captures the run-level state (shift setup, doctor, Specialty, Copays, score, health, open rooms, tools with tiers, snacks, released helpers, run stats, Miracle Cure flags) at every RoundStarted; `saveAndQuit()` saves that mid-round, or a fresh snapshot for the next round in a break. `scene.start('Game', { resume: true })` loads it in `create` (and clears it): `WaveDirector` starts at the saved round, `restoreShift` puts the rest back (`restoreRoom` opens rooms without fanfare; snacks are replayed through `applySnack`). Every other start passes `{ resume: false }` (Phaser keeps a scene's last start data otherwise).

## Remaster boundaries

`core/mechanics.ts` contains pure equipment scaling and analog-input math. `core/dialogue.ts` selects approved character reactions and replaces named tokens. Dialogue uses its own seeded stream so speech does not change spawn or loot rolls. `resetInputState` clears shared controls without replacing their object identity; cancellation and pause also release held keys/buttons.

Settings are validated at the storage boundary without changing save keys. Audio recovery coalesces repeated gestures, tolerates interrupted sessions, and ramps mute changes. Speech and urgent control pulses honor reduced motion. The FPS readout counts actual scene updates rather than RAF callbacks.

The service worker precaches the sealed manifest’s complete asset set before activation, then scopes its caches to the Pages directory, keeps the current and previous build, validates cache offers, waits for cache writes, and never downgrades a newer worker from an older cached page. The native custom scheme skips web update/offline registration. The worker file remains in both bundles to preserve artifact parity.

## Release checks

`npm run test:all` runs source/test typechecking, unit tests, a production build, artifact integrity/parity checks, real-browser regressions, and the full gameplay smoke suite in order. The strict preview server supports both `/moshi-and-pals/` and the native root layout, returns real 404s for asset misses, and does not mask errors with SPA fallbacks. CI uses pinned browser engines on Linux; heavy iOS tests are manual. Pages uploads the exact artifact that passed the complete web gate.
