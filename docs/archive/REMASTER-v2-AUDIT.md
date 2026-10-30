# Technical Audit & Remaster Plan

Phase 1, October 26, 2026. Implementation requires approval of this plan.

## Current architecture and baseline

The checkout is clean `main` at `a6b26c9`; `feat/remaster-v2` does not yet exist locally. After approval, create that exact requested branch before implementation. No push, commit, deployment, or gameplay change is part of Phase 1.

The actual game is TypeScript + Phaser 3.90 + Vite 7, already organized into `src/core`, `src/data`, `src/config`, `src/entities`, `src/systems`, `src/scenes`, and `src/ui`. Preserve this architecture and extract testable logic incrementally. `GameScene.ts` is 2,986 lines; `BootScene.ts` is 1,121 lines. A wholesale rewrite would put substantial working gameplay at risk.

SwiftUI owns native menus, while one persistent WKWebView runs the game. `WebGameHost.swift` uses `BundledGameSchemeHandler.swift` to serve the bundled game through a custom URL scheme. Saves remain local to each browser/app data store; sharing source code does not imply cross-device save synchronization.

PWA support already exists: `public/manifest.webmanifest`, three icons, `public/sw.js`, install metadata, safe-area probes, touch suppression, offline/update logic, and a Pages workflow. Add the missing sharing metadata and improve existing systems rather than duplicating them with a second manifest or game implementation.

## CI diagnosis: verified evidence

| Evidence | Cause and current status |
|---|---|
| [Failed web CI, October 21](https://github.com/ndabney562/moshi-and-pals/actions/runs/39681891029) | Build passed; smoke failed on the Compounding Station cash assertion. Expected 700, observed 730 because a germ reward arrived during the interaction. Commit `820bd30` now checks the 300 spent instead. |
| Earlier native smoke assertion; local commit `4c730a5` | PNG prefix comparison sliced 15 characters but compared a shorter prefix. Already changed to `startsWith('data:image/png')`. |
| [Failed iOS UI test, October 21](https://github.com/ndabney562/moshi-and-pals/actions/runs/39674978136) | `testHiringAPalAsksFirst` read `Hire · 45 NPS` immediately after hiring instead of waiting for `On shift`. Swift package tests passed in that run. Commit `3f22802` adds a predicate wait. |
| [Latest web CI](https://github.com/ndabney562/moshi-and-pals/actions/runs/39685317770) | Passed on `820bd30`, which is included in the local merge commit. |
| [Latest iOS CI](https://github.com/ndabney562/moshi-and-pals/actions/runs/39818373738) and [Pages deployment](https://github.com/ndabney562/moshi-and-pals/actions/runs/39818373778) | Both passed on the checkout's `a6b26c9`. Some earlier failed iOS runs returned no jobs; their cause is unverified and must not be inferred from neighboring runs. |

These historical failures are already fixed. The remaster should preserve those fixes and improve test determinism, not claim to repair an existing build failure without reproduction.

## Remaining risks and intended fixes

| Location | Finding | Planned fix |
|---|---|---|
| `src/core/native.ts` | Native mode depends solely on `?native`. In a normal browser that query still selects the empty Native scene, even though message posting safely does nothing. | Require a callable native message handler as well as the query flag; add browser fallback and bridge contract tests. |
| `vite.config.ts`, `scripts/ios-bundle-web.sh` | Web uses `/moshi-and-pals/`; iOS separately builds the same source with `MOSHI_BASE=./`, then removes `sw.js`. Logic is shared, but outputs are not byte-identical. The iOS script bypasses TypeScript checking and its timestamp inputs omit `package.json` and `tsconfig.json`. | Produce one tested relative-URL bundle and copy the same artifact into iOS. Skip worker registration by host capability rather than deleting files. Validate artifact parity and invalidate build caching on every relevant input. |
| `scripts/smoke-test.mjs` | 2,425-line serial suite combines smoke, regression, offline, touch, and native bridge coverage. It mutates scene internals and shares state. Default browser executable is a Linux-specific path; cleanup starts after browser creation. A measured failing CI run consumed approximately 26 minutes. | Split isolated scenarios, seed random/time-dependent logic, use state predicates, ensure cleanup on setup failure, and configure a reproducible browser install. Keep a short smoke lane and require the full regression suite for release approval. |
| `src/core/settings.ts` | Parsed saved settings are spread into defaults without validating field types or nested `learned`. | Validate and migrate supported fields; cover corrupt JSON, valid JSON with invalid shapes, and unavailable storage. Preserve existing save keys and valid progress. |
| `.github/workflows/ci.yml`, `deploy.yml`, `ios.yml` | Web CI runs only on PRs; Pages builds without running tests; iOS runs automatically on PRs and main pushes. Native UI tests use a stand-in game and do not exercise a real WKWebView. | Run fast Linux checks on pushes and PRs, require checks before Pages artifact upload/deploy, make heavy iOS runs manual, and add an actual bundled-game integration check. |

## Exact planned implementation paths

All paths below are relative to `/Users/noahdabney/Desktop/AI.Stuff/Local.Stuff/moshi-and-pals`.

| Work area | Existing files to modify | New files |
|---|---|---|
| Test configuration and entry points | `package.json`, `package-lock.json`, `tsconfig.json`, `scripts/smoke-test.mjs`, `.gitignore` | `vitest.config.ts`, `playwright.config.ts`, `tests/helpers/storage.ts`, `tests/helpers/game.ts`, `tests/fixtures/bridge-snapshot.json` |
| Unit coverage | No gameplay changes before baseline tests are established | `tests/unit/save.test.ts`, `tests/unit/settings.test.ts`, `tests/unit/progress.test.ts`, `tests/unit/shiftSave.test.ts`, `tests/unit/shift.test.ts`, `tests/unit/rng.test.ts`, `tests/unit/mechanics.test.ts`, `tests/unit/native.test.ts`, `tests/unit/orientation.test.ts`, `tests/unit/dialogue.test.ts` |
| Browser regression coverage | Preserve existing smoke assertions during migration | `tests/e2e/smoke.spec.ts`, `tests/e2e/gameplay.spec.ts`, `tests/e2e/progression.spec.ts`, `tests/e2e/dialogue.spec.ts`, `tests/e2e/mobile.spec.ts`, `tests/e2e/pwa.spec.ts`, `tests/e2e/native.spec.ts`, `scripts/verify-web-bundle.mjs` |
| Shared build and host adapter | `vite.config.ts`, `scripts/ios-bundle-web.sh`, `src/main.ts`, `src/core/native.ts`, `src/core/updates.ts`, `public/sw.js`, `ios/MoshiAndPals/Services/WebGameHost.swift`, `ios/MoshiAndPals/Services/BundledGameSchemeHandler.swift` | `src/core/platform.ts` |
| State and mechanics extraction | `src/core/settings.ts`, `src/core/inputState.ts`, `src/scenes/GameScene.ts`, `src/systems/Sprayer.ts`, `src/entities/Player.ts` | `src/core/mechanics.ts` |
| Mobile UI and presentation | `index.html`, `public/manifest.webmanifest`, `src/core/orientation.ts`, `src/core/safeArea.ts`, `src/config/display.ts`, `src/config/controls.ts`, `src/config/theme.ts`, `src/ui/VirtualJoystick.ts`, `src/ui/HudButton.ts`, `src/ui/ChoicePanel.ts`, `src/scenes/TitleScene.ts`, `src/scenes/HudScene.ts`, `src/scenes/GameOverScene.ts` | `public/social-card.png`, composed from existing approved game artwork |
| Dialogue and audio | `src/ui/SpeechBubble.ts`, `src/systems/PatientDirector.ts`, `src/systems/Scribes.ts`, `src/systems/FrontDesk.ts`, `src/core/sfx.ts`, `src/core/music.ts` | `src/core/dialogue.ts` |
| Native integration tests | `ios/MoshiAndPalsUITests/MoshiAndPalsUITests.swift`, `ios/MoshiKit/Tests/MoshiKitTests/BridgeTests.swift`, `ios/MoshiAndPals.xcodeproj/xcshareddata/xcschemes/MoshiAndPals.xcscheme` | None initially |
| CI and documentation | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/ios.yml`, `README.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`, `docs/BALANCE.md` if tuning changes | `docs/REMASTER-v2-QA.md` |

This is the proposed scope, not a commitment to edit files without need. Any additional gameplay system changes require an explicit rationale in the change report.

## Test structure and release gate

| Layer | Coverage and isolation |
|---|---|
| Vitest unit tests | Node for pure functions; JSDOM for browser adapters/storage. Reset modules and storage between cases. Test save migrations, invalid values, daily seeds, progression purchases, upgrade costs, refill/cooldown boundaries, analog input math, and native capability detection. Keep Phaser rendering in real browser tests rather than pretending JSDOM renders a canvas. |
| Dialogue regression | Current dialogue is event-triggered arrays and speech bubbles, not branching dialogue trees. Test character-specific responses, placeholder substitution, timing, replacement priority, and cleanup using existing approved lines. Add no new characters or jokes without creative approval. |
| Playwright regression | Fresh context per scenario; Chromium and WebKit for mobile layouts. Cover boot/start/pause/resume/game-over, multi-touch move/spray, control release after interruption, Pal signatures, buying/unlocking, save/resume and reload. Assert no runtime errors, unhandled rejections, console errors, failed assets, or asset 404s. |
| PWA and artifact checks | Serve the real build at `/moshi-and-pals/`; verify manifest/icons/social image, relative imports and native custom-scheme paths. Explicitly enable the worker because automation normally skips registration. Verify controlled offline reload, cache upgrades, and matching hashes for web assets copied into iOS. |
| Swift and real native integration | Retain the 35 package tests and existing SwiftUI tests; test actual bundled WKWebView readiness, snapshot decoding, start/exit, saved settings, and reload recovery. WebKit browser coverage does not replace device testing for notches, audio interruption, or installation. |

Phase 2 establishes the baseline before refactoring. Phase 3 keeps it green after each bounded change. Phase 4 must report exact commands, passed/failed/skipped counts, browser versions, bundle paths, Swift results, and limitations. A skipped or unavailable required check does not count as a passing gate.

Prepare workflow edits locally before the Phase 4 report so the report covers the final proposed code. Phase 5 may commit and push only after the report is approved. Any post-report code change requires rerunning affected checks before pushing. Merging to `main` is a separate explicit action; pushing the feature branch alone will not update the public Pages site.

## Remaster direction

Preserve the clinic comedy, existing Pals, progression economy, and procedural artwork. Improve touch target spacing, HUD hierarchy, interaction feedback, readable dialogue, consistent panel transitions, and reduced-motion behavior. Use dynamic viewport sizing with fallbacks, safe-area conversions, and portrait rotation tests without changing the core landscape design.

Extract only mechanics needed for granular tests; reduce scene orchestration complexity incrementally. Profile scene updates and transient effects before optimizing. Verify movement, cooldowns, and timers at 30 and 60 fps, background/foreground input release, and audio recovery after gestures and interruptions. Frame-rate targets require measurement on real hardware; no unmeasured performance improvement is claimed.

## Phase 1 local verification

Existing Swift package: **35 tests passed, zero failures**, using temporary writable compiler/cache directories. Initial default-cache invocation failed because the sandbox blocked `~/.cache/clang`; rerunning with explicit temporary cache paths resolved it.

Locked npm dependencies installed after retrying outside the network-restricted sandbox. Local toolchain is Node 24.22.1 and Xcode 27.1; CI specifies Node 22 and `macos-15`. Record and resolve toolchain differences before the final gate.

`npm run build`: **passed**, including TypeScript checking and Vite production compilation. Output includes `dist/index.html`, `dist/version.json`, and a 1,550 kB JavaScript bundle (444 kB gzip). No browser performance inference is made from bundle size alone.

Full browser regression, long smoke execution, and simulator integration are reserved for the approved QA phases. Historical CI success is not a substitute for the final local test report.

Next action: approve Phase 2 to establish the local baseline and test runner on `feat/remaster-v2`.
