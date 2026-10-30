# Remaster v2: local QA verification

**Branch:** `feat/remaster-v2` · **Version:** 0.33.0 · **Date:** October 26, 2026

**Local QA passed. On October 26, 2026, the user authorized committing and pushing this feature branch and future test-gated pushes, with a change list supplied for review. Merging and production deployment remain separate actions.**

## What changed

| Area | Result |
|---|---|
| One game artifact | Relative asset paths work at `/moshi-and-pals/` and the native root. The iOS build copies the same sealed `dist/` artifact, including browser-only files. Source fingerprints and SHA-256 file checksums reject stale or edited inputs. |
| Mobile presentation | Stronger title/menu hierarchy, higher-contrast touch controls, larger button labels, visible loading feedback, dynamic viewport sizing, actual-canvas safe-area conversion, coalesced resize work, and viewport reconciliation after a native wake even if resize callbacks were missed. Existing poster, Pals, approved dialogue, save keys, and economy tuning are retained. |
| Input, dialogue and audio | Touch cancellation releases controls and pauses; keyboard/pointer state resets together. Speech bubbles replace their animation cleanly and respect reduced motion. Pal reactions use an independent seeded dialogue stream. Interrupted audio recovery coalesces gestures, catches failures, and ramps mute changes. |
| Browser and PWA | A `?native` link without a callable host stays playable. Settings reject malformed field types. Worker installation caches the complete sealed build before activation; a failed asset keeps the previous worker active. Caches stay within the game scope, retain the previous build, and await writes. An older cached page cannot replace a newer worker. Sharing metadata and a 1200×630 PNG use the existing approved poster. |
| Native and CI | A real WKWebView integration test waits for the game's `playing` message, then relaunches it. Native version matches 0.33.0. Linux push/PR checks use a short smoke lane; Pages requires the complete web gate and deploys only from main. macOS/iOS workflows are manual. Workflow changes are local and have not run on GitHub. |

## Verification results

**All required local checks passed. No required checks were skipped.**

| Check | Final result |
|---|---|
| Production build and source/test typechecking | Passed under Node 22.23.4 |
| Vitest unit tests | 83 passed, 0 failed, 0 pending; 14 files |
| Chrome + WebKit browser regressions | 38 passed, 0 failed, 0 skipped, 0 retries/flaky results |
| Artifact integrity/parity and atomic worker installation | 6 passed, 0 failed; corruption, stale source, failed downloads and invalid scope are rejected |
| Full original gameplay smoke suite | 206 checks passed, 0 failed; final complete web command exited 0 |
| Existing and extended Swift package tests | 36 passed, 0 failed |
| iPhone simulator UI + real WKWebView integration | 8 passed, 0 failed, 0 skipped, including optional screenshot checks; final full-screen capture recheck also passed |
| Short Linux CI smoke lane | 4 passed locally; these scenarios also pass within the final full browser suite |
| Static artifact, scripts, workflows, whitespace | App and Pages manifests match exactly; JS/shell syntax, three workflow YAML files, and `git diff --check` pass |

Verified source fingerprint: `0a600924d73e…`. The bundle contains 10 sealed files plus its checksum manifest. Production game JavaScript is approximately 1,553 kB (445 kB gzip); this is a size measurement, not a hardware frame-rate benchmark.

## Commands and evidence

A local preview is available on this computer at `http://127.0.0.1:4175/moshi-and-pals/`.

The final web run uses Node 22.23.4, matching CI's Node major version, with Playwright Test 1.56.1. Browser engines: Google Chrome 155.0.8059.85 and WebKit 26.0 (Playwright build 2215). Native verification uses Xcode 27.1 and the installed iPhone 18 Pro simulator running iOS 27.0. This is simulator coverage, not a physical-device claim.

```sh
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/moshi-playwright \
  npm exec --yes --package=node@22 --cache /private/tmp/moshi-audit-npm-cache -- npm run test:all

swift test --package-path ios/MoshiKit

TEST_RUNNER_SCREENSHOTS=1 MOSHI_WEB_BUNDLE="$PWD/dist" \
  xcodebuild test -project ios/MoshiAndPals.xcodeproj -scheme MoshiAndPals \
  -destination 'platform=iOS Simulator,id=DDA9AD5B-9766-49AC-B79F-5613459A8AF2' \
  -derivedDataPath /private/tmp/moshi-remaster-derived \
  -resultBundlePath /private/tmp/moshi-remaster-ios-release.xcresult CODE_SIGNING_ALLOWED=NO
```

The Swift package command used writable temporary compiler/SwiftPM cache paths, as in Phase 2. Web output is retained in `/private/tmp/moshi-remaster-release-gate.log`; native output is in `/private/tmp/moshi-remaster-swift-final.log` and `/private/tmp/moshi-remaster-ios-release.log`. Machine-readable web results are `test-results/unit.json` and `test-results/regression.json`. These generated files and temporary native results remain local.

## Checks covered

The unit suite preserves record migration, per-difficulty/daily scoring, progress purchases, Pal hiring, equipment timings, seeded randomness, save/resume, achievements and native command contracts. Added checks cover settings validation, native capability detection, analog boundaries, shared-input reset, viewport/canvas conversion, audio interruption failures and worker downgrade prevention.

The browser suite uses fresh contexts, strict static hosting without SPA fallbacks, and both browser engines. It covers start/move, pause/resume, save/quit/reload/continue, game-over/restart, menus, portrait touch mapping, resizing, 30 FPS updates, interrupted touches, reduced motion, real speech bubbles, emulated native messages, native-query fallback, root hosting, preview assets, asset 404s, offline reload and worker upgrades. Runtime exceptions, unhandled rejections, unexpected console errors, failed requests and HTTP errors fail these tests. Expected network errors from version probes during the deliberately simulated outage are excluded; unexpected asset failures are not excluded.

Artifact and worker-install tests verify complete precaching before activation, reject partial downloads or out-of-scope assets, and copy the actual build through the iOS bundling script, verify identical checksums, and prove corrupted files and stale source fingerprints are rejected. The full original gameplay smoke suite remains part of the release gate. Native menu tests remain, and the added integration test uses an empty in-memory native cache and an ephemeral real WKWebView; its `playing` status is produced by game initialization, not by the native Start button alone.

Visual QA captures are in `docs/screenshots/remaster-title-phone.png`, `remaster-title-tablet.png`, `remaster-title-portrait.png`, `remaster-game-phone.png`, and `remaster-game-native.png`. Native gameplay, canvas/viewport geometry, and the existing light/dark menu captures are retained as XCTest attachments. The native integration test also asserts that portrait CSS clears and the landscape canvas remains inside the viewport. Images were inspected after transition animations settled. The debug FPS readout now measures real scene updates rather than browser RAF callbacks. The native image uses the full-screen screenshot API because XCTest's cropped app screenshot retained stale orientation metadata; the geometry attachment and full-screen capture both verify the corrected canvas. The visible “Shift in progress” text is an integration-test overlay and does not appear in normal play.

QA also corrected an asynchronous smoke assertion: Playwright's `waitForFunction` treated a Promise as truthy before cache reads completed. The suite now polls the awaited cache contents in Node while preserving the original script, shell and poster assertions. Native viewport reconciliation is protected by a browser regression that deliberately suppresses resize callbacks and by the simulator's actual canvas bounds assertions.

## Verification limits and release authorization

Physical iPhone checks for installation, Dynamic Island/notch variants, real audio interruption, battery use, and sustained hardware performance remain manual. Simulator and browser emulation do not establish a 60 FPS hardware benchmark or coverage on an iOS 17 device. The native canvas was also measured at approximately 874 × 402 CSS pixels, inside its 874 × 402 viewport after waking. No paid backend, paid hosting service, or new external media dependency was introduced.

The workflows were parsed locally and their commands checked locally; no GitHub Actions run or fresh public-link preview is claimed. Rich sharing cards and the updated public game can be checked only after an approved push and merge/deploy. Pushing this feature branch alone will not replace the main Pages site.

The user approved the push after reviewing the passing local QA result. Continue to require passing checks before future pushes and provide a reviewable list of changes afterward. Any later source change requires rerunning affected checks before publishing.
