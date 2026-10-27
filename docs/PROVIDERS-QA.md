# Provider roster and abilities: QA report

October 26, 2026. Approval: all proposed new-provider abilities and the six photo-based appearances were approved by the user before implementation. Local checks must pass before committing. Earlier authorization permits test-gated feature-branch pushes; merging to main is separate.

## Delivered behavior

- Eleven playable providers, including Jason, Dhiwya, Raj, Lidiya, Dharma, Amanda and Janeen. The approved photo-based sprites are generated in the shared game; reference photographs remain local and gitignored. Jason uses the supplied burgundy-scrub description.
- Dedicated Providers menu with paged cards, confirmed NPS purchases, persistent hires and separate NPS second-ability unlocks. The iOS Play menu opens this same web scene. Each unlocked second ability has its own touch button, F binding and cooldown; Q remains the first special.
- All fourteen approved new-provider specials, medication projectiles/boosts, three seeded scrub palettes, independent helper rally modifiers with expiry, PSR bonus-output buffs, ingredient recharges/combinations, deterministic upstairs companion and gag/apex provider passives. See [balance details](PROVIDERS-BALANCE.md).
- New unit/browser regression coverage plus the previously uncommitted affinity foundation, name validator and smoke assertion fix. Existing NPS hires, earned helper upgrades and version-1 saves remain compatible. Raj pantry consumption is saved explicitly; temporary effects follow the existing restart-at-round save contract.

## Final checks

| Check | Result |
|---|---|
| Source and test TypeScript checks | Passed |
| Unit tests | 121 passed |
| Build, SHA-256 sealed web artifact, web/iOS copy parity and worker tests | Build passed; 6 checks passed |
| Chromium and WebKit regression | 70 passed |
| Original gameplay smoke suite | 206 passed, 0 failed |
| Swift package suite | 36 passed |
| iOS simulator suite | 7 passed, 0 failures; final Xcode command succeeded |
| Visual review | Production Providers menu and second-action controls captured and inspected; six draft sprites previously approved |

Commands use the locally installed Node 22 runtime, `npm run test:all`, `swift test --package-path ios/MoshiKit --scratch-path /private/tmp/moshi-providers-swift`, and the existing Xcode simulator suite against the sealed `dist/` bundle. Logs are in `/private/tmp/moshi-providers-final-web.log`, `/private/tmp/moshi-providers-swift.log`, and `/private/tmp/moshi-providers-ios-final.log`. Machine-readable browser/unit results remain under gitignored `test-results/`.

One targeted WebKit menu test initially tapped a freshly redrawn interactive object before Phaser registered it. The test now waits for rendering frames, preserving the actual touch purchase assertions. Dhiwya marks are keyed to enemy spawn generations so pooled enemies cannot inherit a mark; locked second requests cannot bypass ownership checks. The first simulator run passed six tests but hit an Xcode app-launch background-assertion timeout in the achievements test; the full rerun against the final bundle passed all seven tests, including achievements and real WKWebView startup. No source-photo files, unrelated generated `output/` files or test traces are intended for the commit.

## Milestone 6: Shared Online Leaderboard Backend & Integration (QA report)

- **Worker API & D1 backend verified**: Cloudflare Worker endpoint handling `POST /api/scores` and `GET /api/scores` operates under the $0 free tier, using parameterized SQLite queries (`INSERT INTO scores`, `WHERE mode = ? AND difficulty = ?`), <= 2KB payload guardrails, and public edge caching headers (`Cache-Control: public, max-age=15`).
- **Grapheme validation verified**: Player handles are constrained to 1–10 visible characters via Unicode grapheme cluster segmentation, rejecting whitespace-only, control characters, or oversized names.
- **Client & Leaderboard UI verified**: `LeaderboardScene` renders top 10 scores with interactive mode pills (`STANDARD` vs `FLU SEASON (ENDLESS)`) and difficulty pills (`WALK-IN`, `URGENT`, `TRAUMA`). Player callsign can be edited and persisted to `localStorage`.
- **Navigation entry points verified**: Accessible from Title Scene right menu card (`🏆 LEADERBOARD`) and GameOverScene Discharge Summary (`LEADERBOARD`), with clean return navigation to both callers.
- **Test execution summary**:
  - TypeScript type check: Passed with 0 errors (`tsc --project tsconfig.tests.json`).
  - Unit tests: 24 test files, 153 passed (`npm run test:unit`).
  - Web bundle & worker checks: 6 passed (`npm run test:bundle`).
  - Playwright browser regression: 108 passed across Chromium and WebKit (`npm run test:regression`).

## Milestone 5: Endless Flu Season Mode (QA report)

- **Mechanics verified**: Endless Flu Season (`mode: 'fluSeason'`) runs as an independent infinite mode with continuous wave spawning and rising outbreak pressure (`BALANCE.fluSeasonMode.outbreakPressure`).
- **Wave flow & short supply windows**: Waves transition without stalling if the queue is empty and 2 or fewer germs linger (or after `maxWaveBreatherMs = 3500`), providing a 2.0-second supply window (`supplyWindowMs = 2000`) before the next wave immediately begins.
- **Score isolation**: Flu Season personal records (`save.fluSeason`) are stored and tracked independently from standard Walk-In, Urgent, and Trauma records.
- **UI & HUD verified**: Mode toggle on Title Scene switches cleanly between `STANDARD` and `FLU SEASON`; in-game HUD displays wave counter and supply window alerts; Discharge Summary reflects Endless Flu Season mode.
- **Test execution summary**:
  - TypeScript type check: Passed with 0 errors (`tsc --project tsconfig.tests.json`).
  - Unit tests: 23 test files, 147 passed (`npm run test:unit`).
  - Playwright browser regression: 104 passed across Chromium and WebKit (`npm run test:regression`).

## Milestone 4: Alexandra, Essence Scribe (QA report)

- **Mechanics verified**: Alexandra fires multi-target ink and steam bursts hitting up to 4 targets for 45 damage every 700 ms, delivering 64.3 single-target DPS and up to 257.1 multi-target DPS, exceeding Omar, Alan, and Donald combined.
- **Visuals & Animation verified**: Procedural texture `scribe-alexandra` renders floating ethereal cloud essence with black medical mask, mask pleats, and cyan eyes; hover scale undulation and mist particles render during gameplay.
- **Roster & Board integration verified**: Alexandra is available on the Residency Board for 50 CME; waits in first-floor exam rooms when hired; correctly integrates with the equipment locker's staff upgrades and provider affinity multipliers.
- **Framework integration verified**: Alexandra participates in attendance and distraction events with in-character dialogue; rejects trainee assignments as specified.
- **Test execution summary**:
  - TypeScript type check: Passed with 0 errors (`tsc --project tsconfig.tests.json`).
  - Unit tests: 22 test files, 143 passed (`npm run test:unit`).
  - Web bundle & worker checks: 6 passed (`npm run test:bundle`).
  - Playwright browser regression: 98 passed across Chromium and WebKit (`npm run test:regression`).
  - Legacy smoke test suite: 206 passed, 0 failed (`npm run smoke`).

## Milestone 3: In-World Distractions & Patient Imaging (QA report)

- **Mechanics verified**: Combat helpers (Omar, Alan, Donald) become distracted at round start according to `BALANCE.distractions.chancePerRound = 0.18`. While distracted or imaging, helpers cease combat attacks and patient cleaning, and steer toward world markers.
- **Player intervention verified**: Proximity intervention within 75 px (`interventionRange`) reactivates distracted helpers immediately after a brief grace window, restoring combat and follow behavior.
- **Donald patient imaging verified**: Donald can be assigned to the X-ray room for 20 s (`xrayImagingMs = 20000`), during which his penetrating combat beam is held. Upon timeout or signature recall, Donald announces scan completion and returns to the provider.
- **Visual feedback & dialogue verified**: Pulsing in-world markers and labels render at assignment points; in-character dialogue lines are delivered on arrival, reactivation, and scan completion; HUD banners notify the player.
- **Persistence verified**: In-progress distractions and patient imaging assignments serialize kind, label, coordinates, and remaining ms in `ShiftSave.distractions`, verified across save & quit / continue shift cycles.
- **Test execution summary**:
  - TypeScript type check: Passed with 0 errors (`tsc --project tsconfig.tests.json`).
  - Unit tests: 21 test files, 139 passed (`npm run test:unit`).
  - Web bundle & worker checks: 6 passed (`npm run test:bundle`).
  - Playwright browser regression: 90 passed across Chromium and WebKit (`npm run test:regression`).
  - Legacy smoke test suite: 206 passed, 0 failed (`npm run smoke`).

## Milestone 2: Random Timed Trainees (QA report)

- **Mechanics verified**: 67% slowdown (`statMult = 0.33`) applied across movement speed, action/attack cadence (interval ÷ 0.33, or ~3.03× duration), and raw output/damage. Compounding DPS and copays/sec tested and confirmed at ~10.89% of baseline.
- **Eligibility verified**: Omar, Selina, and Elaine successfully receive trainees; Alan and Donald reject assignments deterministically in unit and E2E tests.
- **Visual feedback & dialogue verified**: Amber tint `0xffd54f` active during trainee shadowing; in-character arrival/completion speech bubbles delivered; HUD banners announced (`[NAME] HAS A TRAINEE` and `[NAME]'S TRAINEE SIGNED OFF`).
- **Persistence verified**: Remaining duration serialized in `ShiftSave.trainees` and restored across save & quit / continue shift cycles without rerolling or dropping timers.
- **Test execution summary**:
  - TypeScript type check: Passed with 0 errors (`tsc --project tsconfig.tests.json`).
  - Unit tests: 20 test files, 134 passed (`npm run test:unit`).
  - Web bundle & worker checks: 6 passed (`npm run test:bundle`).
  - Playwright browser regression: 82 passed across Chromium and WebKit (`npm run test:regression`).
  - Legacy smoke test suite: 206 passed, 0 failed (`npm run smoke`).

## Remaining expansion work

Random distractions & interventions, Alexandra, Flu Season, the shared online leaderboard and puzzle mode are separate milestones. This report does not claim they are implemented. Rally can clear a combat helper's interruption flag; the random distraction event generator remains separate. Second abilities for the four original providers were not part of this new-provider approval.

Janeen leads at equivalent equipment/upgrades; unlimited health snacks prevent an absolute health comparison against arbitrarily different runs. Numbers are an initial balance pass validated by deterministic tests, not a substitute for physical-iPhone playtesting or player feedback. Local simulator/browser checks do not establish hardware performance on every supported iPhone.

## October 27 deployment follow-up

PR #61 merged successfully and main CI passed. Its Pages gate stopped at three Linux WebKit cases: a native-start timeout and two intentional-outage console messages using the Linux wording "Connection terminated unexpectedly". Native commands now cancel an older menu sleep timer and enqueue the scene change before Phaser's synchronous wake tick. The outage-only diagnostic filter recognizes that wording; failed asset requests and runtime exceptions remain checked. Browser coverage now waits for the native loop to sleep before opening the board and starting a shift.

The full simulator rerun also exposed stale WKWebView dynamic viewport CSS after rotation: the viewport was 874 by 402 while the parent remained 874 pixels tall. Both orientations now explicitly size the game container from the measured viewport. Unit and browser assertions cover landscape parent dimensions; the unchanged real-WKWebView geometry assertion passes. The initial failed simulator run stalled collecting diagnostics and was stopped after its seven test results were logged.

Final local repair validation: 122 unit, 70 Chromium/WebKit regression, 206 legacy smoke, 6 artifact/worker, 36 Swift and 7 simulator tests passed; type checks, production build and sealed-bundle verification passed. Logs: `/private/tmp/moshi-resume-final-web.log`, `/private/tmp/moshi-resume-swift.log`, `/private/tmp/moshi-resume-ios-final.log`. Tested source fingerprint: `6dbb5056fff19f69d64e4136cf1a19fd7ef45d554f280461577ce4b823b888bd`. This follow-up changes native wake/rotation handling and test diagnostics, with no new gameplay features.

## Pages smoke-runner cleanup

PR #62 merged and main CI passed. Its first Pages run had one Linux WebKit offline-art request failure; 20 repeated unchanged Mac WebKit offline checks passed. The unchanged Pages rerun passed all 70 Chromium/WebKit cases, then exceeded the 45-minute build limit during legacy smoke. GitHub's check annotation confirms the time limit; the completed log recorded passing checks through the front desk with no smoke assertion failures (`/private/tmp/moshi-pages-timeout.log`). The local Linux browser-image download stalled, so no local Linux reproduction of the intermittent image error was established.

The smoke runner retained its completed primary game page and portrait context while later scenarios ran. Those live shifts continued rendering in the background. It now closes the completed primary page before debug checks, closes that context after debug checks, and closes the portrait context immediately after its assertions. All 206 assertions, the Retina device scale and the workflow time limit remain intact. Failed Pages runs now retain `test-results` artifacts for seven days, including available browser traces.

The complete local web gate was rerun with `CI=1`, the installed Chrome executable and CI's threefold smoke waits: type checks/build passed, 122 unit, 70 browser, 206 smoke and 6 bundle/worker checks passed. Log: `/private/tmp/moshi-ci-cleanup-web.log`. Workflow YAML parsed successfully and sealed-bundle verification passed. Production fingerprint remains `6dbb5056fff19f69d64e4136cf1a19fd7ef45d554f280461577ce4b823b888bd`; the previously passing 36 Swift and 7 simulator checks cover this identical game bundle. They were not rerun for the test-runner/workflow-only cleanup.

## Ubuntu dependency-download reliability

PR #63 merged after both CI runs passed. Two fresh Pages runners then spent minutes slowly downloading Ubuntu libraries from `azure.archive.ubuntu.com`; the first was cancelled after more than 17 minutes. Similar mirror stalls are documented in [runner-images issue 14594](https://github.com/actions/runner-images/issues/14594). Linux build jobs now pin Ubuntu 24.04, use Ubuntu's official HTTPS archive through the existing runner mirror list, and bound APT retries and connection timeouts. Browser installation has a ten-minute step limit; dependency errors still fail the build. `scripts/ci-apt.sh` refuses execution outside a root Ubuntu 24.04 GitHub Actions environment and checks the expected mirror-list layout before writing anything.

Local validation: both workflow YAML files and shell syntax parsed; the helper refused the local Mac. An actual amd64 Ubuntu 24.04 container with the runner's mirror-list layout recognized the retry/timeout settings, verified signed HTTPS indexes and downloaded the fonts and codec packages implicated in the stalled setup. The minimal image needed its standard signed CA package installed before HTTPS validation; certificate and archive-signature verification stayed enabled. Validation log: `/private/tmp/moshi-apt-container.log`. Host APT files were untouched. The complete web gate passed again with CI timing: 122 unit, 70 browser, 206 smoke and 6 bundle/worker checks, plus type/build and sealed-bundle checks (`/private/tmp/moshi-apt-final-web.log`). Production fingerprint remains `6dbb5056fff19f69d64e4136cf1a19fd7ef45d554f280461577ce4b823b888bd`; the existing native test results still cover the identical game and Swift sources.

Pages `40542701435` verified the Ubuntu mirror fix in CI (browser dependency installation and all 70 Chromium/WebKit regressions passed), then failed at the patient-violation check in `scripts/smoke-test.mjs` because the preceding exam-table check left `scene.waves.phase` in `'intermission'` with `nextRoundAt` 2 seconds ahead and Eugene in `exam1`; when that timer advanced the wave into round 5 (a boss round), `PatientDirector` immediately retired wandering patients. The patient-violation setup in `scripts/smoke-test.mjs` now explicitly holds an active non-boss round in the waiting room. Pages `40549976401` also showed that the 21-second (`70 × 300 ms` with `SLOW = 3`) opening spray hold can drain the 480 mL reserve jug via `autoRefill` and leave Eugene vulnerable before line 345's invulnerability guard; `scripts/smoke-test.mjs` now sets `invulnerableUntil` when the opening germs spawn and keeps the bottle/reserve ready for the explicit Refill button check.

## Milestone 1: Helper Call-Outs & Attendance

- Implemented independent attendance roll for room-waiting helpers (`Omar`, `Alan`, `Donald`) via `rollAttendance()` in `src/core/attendance.ts`.
- Structured attendance odds based on provider affinity in `src/config/balance.ts`: Janeen/Dhiwya 3%, Lucien/Jason 6%, Ken 10%, Kaya/Raj/Lidiya 15%, Eugene/Dharma 22%, Amanda 40%.
- Drafted 4 unique, doctor-specific humorous reasons for all 11 providers in `src/data/callOuts.ts`, plus fallback reasons.
- Room silhouettes still appear in locked rooms; opening the room reveals absence and triggers `GameEvents.HelperCalledOut`, displaying a distinct HUD banner.
- Absence state persists across shift save and restore cycles via `ShiftSave.absent`.
- Added unit tests (`tests/unit/attendance.test.ts`), e2e Playwright tests (`tests/e2e/callout.spec.ts`), and `?callout=` query debugging support.

## Reviewable change list

1. Added seven approved providers, shared procedural art, provider-specific dialogue and their first/second specials.
2. Added the shared Providers menu and confirmed NPS second-ability purchases; moved roster selection out of the web title and iOS Play list.
3. Added capsule projectiles, medication bonuses, seed-based scrub palettes/companion, Raj-only vending/pantry persistence, rally expiry and gag/apex stats.
4. Included the tested existing-provider helper-affinity foundation, leaderboard-name validation preparation and asynchronous smoke assertion correction.
5. Added balance documentation, approved art previews, production screenshots, 16 additional provider/PSR unit cases and 24 new-provider browser cases across both engines. Final totals: 121 unit, 70 browser, 206 smoke, 6 artifact/worker, 36 Swift and 7 simulator tests passed.
