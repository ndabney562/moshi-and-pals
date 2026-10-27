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

## Remaining expansion work

Call-out scheduling, random timed trainees, random distractions, Alexandra, Flu Season, the shared online leaderboard and puzzle mode are separate milestones. This report does not claim they are implemented. Rally can clear a combat helper's interruption flag; the random distraction event generator remains separate. Second abilities for the four original providers were not part of this new-provider approval.

Janeen leads at equivalent equipment/upgrades; unlimited health snacks prevent an absolute health comparison against arbitrarily different runs. Numbers are an initial balance pass validated by deterministic tests, not a substitute for physical-iPhone playtesting or player feedback. Local simulator/browser checks do not establish hardware performance on every supported iPhone.

## Reviewable change list

1. Added seven approved providers, shared procedural art, provider-specific dialogue and their first/second specials.
2. Added the shared Providers menu and confirmed NPS second-ability purchases; moved roster selection out of the web title and iOS Play list.
3. Added capsule projectiles, medication bonuses, seed-based scrub palettes/companion, Raj-only vending/pantry persistence, rally expiry and gag/apex stats.
4. Included the tested existing-provider helper-affinity foundation, leaderboard-name validation preparation and asynchronous smoke assertion correction.
5. Added balance documentation, approved art previews, production screenshots, 16 additional provider/PSR unit cases and 24 new-provider browser cases across both engines. Final totals: 121 unit, 70 browser, 206 smoke, 6 artifact/worker, 36 Swift and 7 simulator tests passed.
