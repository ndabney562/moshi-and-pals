# Phase 2 baseline QA report

Local branch: `feat/remaster-v2`. Date: October 26, 2026. No commits or pushes made. This report covers baseline test setup, not approval to deploy or completion of the remaster.

## What now works

The repository has a local, typechecked test gate: `npm run test:all`. It runs isolated unit tests, builds the unchanged game, exercises real Chrome and WebKit browsers at `/moshi-and-pals/`, then runs the preserved full gameplay smoke suite. Running the gate sequentially prevents rebuilding `dist/` while browser tests use its files.

Unit coverage includes save v1/v2 migrations, per-difficulty records, daily rewards, storage failures, progression purchases, Pal hiring, locker/staff upgrade caps, seeded RNG stream isolation, daily shift selection, cooldown and refill boundaries, perfect pours, spill penalties, equipment upgrades, Pal-specific dialogue and fallback responses, achievement persistence, native settings validation/commands/boot queueing, and portrait/safe-area mapping.

Browser coverage uses fresh contexts and real canvas rendering: touch start, movement, pause/resume with frozen game time, save/quit/reload/continue, game-over/restart, board/locker transitions, portrait touch mapping, resize, measured 30 FPS updates, speech-bubble replacement/follow/expiry, native host messages and daily launch, manifest/icons/version paths, and service-worker reload during a transport outage. Runtime exceptions, console errors, failed requests, and HTTP errors fail these tests. Expected offline version probes are narrowly excluded; unexpected failed asset requests remain failures.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| Production TypeScript + Vite build | Passed | `npm run build`; unchanged game bundle `dist/assets/index-PkjhAsVx.js` |
| Test-source typechecking | Passed | `npm run test:typecheck` |
| Vitest units | 66 passed, 0 failed, 0 pending across 11 files | `npm run test:unit`; `test-results/unit.json` |
| Chrome + WebKit browser regressions | 24 passed, 0 failed, 0 skipped; no retries | `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/moshi-playwright npm run test:regression` |
| Preserved full smoke suite | 206 checks passed, 0 failed; exit code 0; 143 seconds | `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/moshi-playwright npm run smoke`; `/private/tmp/moshi-phase2-smoke-verified.log` |
| Existing Swift package tests | 35 passed, 0 failed | `swift test --package-path ios/MoshiKit` with writable temporary cache arguments; `/private/tmp/moshi-phase2-swift.log` |
| Script syntax, dependency lock and whitespace | Passed | `node --check` on both smoke/browser scripts; root dev dependencies match lockfile; `git diff --check` |

No production JavaScript, Swift code, or workflow was modified. The final local release gate must be repeated after Phase 3 changes; these baseline results do not authorize pushing.

## Test infrastructure changes

| Files | Purpose |
|---|---|
| `package.json`, `package-lock.json` | Pin Vitest 3.2.4, JSDOM 26.1.0, Playwright Test 1.56.1, and Node type definitions; add local unit, watch, typecheck, regression, baseline and complete-gate commands. |
| `vitest.config.ts`, `tsconfig.tests.json`, `tests/unit/`, `tests/helpers/setup.ts` | Isolated storage/module state, strict typechecking, and machine-readable unit output. |
| `playwright.config.ts`, `tests/e2e/`, `tests/helpers/game.ts`, `tests/helpers/offline-server.ts` | Single-worker Chromium/WebKit coverage without retries, per-test diagnostics and failure traces; static Pages-subpath server with switchable transport outage. |
| `scripts/browser.mjs`, `scripts/smoke-test.mjs` | Portable Chrome discovery, launch-failure server cleanup, real scene-update FPS measurement, queued-resume wait, and explicit smoke pass/fail totals. |
| `.gitignore`, `README.md`, `CONTRIBUTING.md`, `docs/CHANGELOG.md` | Ignore generated reports and document repeatable local commands. Game sources, native sources and workflows are unchanged. |

## Failures diagnosed during setup

The initial menu regression tapped a text object's bottom-left origin. Using rendered object bounds corrected the test coordinate calculation.

The original smoke FPS assertion compared Phaser's `actualFps` with the 30 FPS game-update cap. Inspection of the installed Phaser 3.90 `TimeStep.stepLimitFPS` showed it increments its FPS counter before deciding whether to update the game. The test now measures actual scene update events over elapsed wall time and requires a positive rate no greater than 34 FPS. Gameplay code was not changed.

The original vending-machine assertion read the Game scene before its queued resume had run. The purchase itself succeeded. The test now waits for both panel dismissal and the actual resumed state before checking the purchase result.

Playwright WebKit's `context.setOffline(true)` returned an internal navigation error on this host. The replacement test serves the unchanged production bundle on a separate localhost origin, confirms its files are cached, then drops every incoming server connection. Both browser engines must reload the game from the real service worker cache. This is a transport outage test; it does not claim to validate iOS standalone installation or the OS airplane-mode UI.

One exploratory smoke run overlapped a build that replaced `dist/`, causing missing assets and incomplete service-worker caching. The verified run uses a stable completed build; `test:all` preserves that ordering. No assertion was relaxed to hide missing assets.

## Reproduce locally

1. Use Node 22 to match CI, then run `npm ci`.
2. Run `npx playwright install chromium webkit`; installed Google Chrome is used automatically when present, or set `CHROMIUM_PATH` explicitly.
3. Run `npm run test:all` for the web gate. Browser traces/screenshots appear only on failures in `test-results/browser/`; JSON summaries appear in `test-results/unit.json` and `test-results/regression.json`.
4. Run `swift test --package-path ios/MoshiKit` for existing native package tests. In a restricted filesystem, set `CLANG_MODULE_CACHE_PATH`, `SWIFTPM_MODULECACHE_OVERRIDE`, `--scratch-path`, `--cache-path`, and `--manifest-cache local` to writable temporary locations; the local verification also used `--disable-sandbox` for SwiftPM subprocesses.
5. Review this baseline before authorizing Phase 3 implementation. Any later release still requires a separate complete Phase 4 QA report and approval before pushing.

This host uses Node 24.22.1, npm 11.19.1 and Xcode 27.1. Browser verification used Google Chrome 155.0.8059.85 and WebKit 26.0 (Playwright build 2215). The downloaded WebKit runtime is in `/private/tmp/moshi-playwright`; local browser commands used `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/moshi-playwright`.

## Remaining scope

No production defect is intentionally captured as desired behavior. The audit's malformed-setting type validation and native-query-without-host fallback remain Phase 3 work. Existing native UI tests use a stand-in game; simulator integration, physical-device safe areas/audio/installation, service-worker version-upgrade scenarios, visual remastering, and one-artifact web/iOS parity remain later-phase checks. No test coverage percentage or real-device performance claim is made.
