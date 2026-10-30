# HANDOFF

**Goal:** Take Moshi and Pals (v0.33.0) from "works" to a professional,
App Store-ready iPhone game. Owner: Noah. Ask him before anything creative,
irreversible or public-facing.

**Read first:** CLAUDE.md, README.md, docs/ROADMAP.md, docs/REMASTER-v2-QA.md,
docs/MY_CONTRIBUTIONS.md. CHANGELOG.md and BALANCE.md live in `docs/` (CLAUDE.md
wrongly says root). `AGENTS.md` and `docs/GEMINI-BENCHMARK-WORKFLOW.md` are
referenced by CLAUDE.md but do not exist in the repo.

## Done
- Phase 0 audit (Oct 30, 2026, from commit c4dc551). App Store gaps found:
  1. No `PrivacyInfo.xcprivacy`, so uploads get rejected (ITMS-91053). **Fixed** on
     `feat/appstore-readiness`.
  2. `DEVELOPMENT_TEAM` is empty in the Xcode project. Noah has to set it.
  3. The app icon is a single 1024 px universal PNG. That's valid for Xcode 15+.
  4. The online leaderboard (`src/core/leaderboard.ts` + `worker/`) is off by
     default (`DEFAULT_API_URL = ''`). `worker/wrangler.toml` has the placeholder
     `database_id`. Turning it on needs a privacy policy, a data label and
     UGC-name moderation (Guideline 1.2), or a switch to Game Center.
  5. No App Store metadata yet: screenshots, description, privacy policy URL,
     support URL, age rating.

- Phase 1, Game Center (Noah said "whatever you think"; Claude chose Game
  Center over the Cloudflare leaderboard). Gemini CLI reviewed the design (run
  with `--skip-trust` from a scratch folder, since the repo isn't a trusted
  folder for it). Adopted: mark reported only after success; Today's Shift
  stays off. Its tip about achievement banners was not adopted, because the game
  HUD already shows unlocks.
  - `ios/MoshiKit/.../Store/GameCenterLedger.swift` works out what's pending,
    with 3 unit tests.
  - `ios/MoshiAndPals/Services/GameCenterService.swift` handles sign-in,
    submitting and the dashboard.
  - `RootView` reports on every snapshot change. Progress has a Game Center
    button that shows only when signed in.
  - `ios/Config/MoshiAndPals.entitlements` holds the Game Center entitlement,
    set as CODE_SIGN_ENTITLEMENTS for the app.
  - `docs/GAME-CENTER.md` lists the IDs to create in App Store Connect.

## In progress
- Nothing.

## Next step (exact)
1. [Noah] Set the Team in Xcode, and create the Game Center IDs in
   `docs/GAME-CENTER.md`. Then test on a real phone: sign-in can't be checked in
   an unsigned simulator build.
2. [Any agent] Phase 2: a draft App Store listing (description, keywords, age
   rating answers, privacy policy text) for Noah to approve. Nothing gets
   published without him.
3. [Any agent] Phase 3: a first-run onboarding review. Get a Gemini second
   opinion first.

## Blockers
- `DEVELOPMENT_TEAM` and an Apple Developer account (Noah).
- The second-opinion review process doc is missing (`docs/GEMINI-BENCHMARK-WORKFLOW.md`).

## Last test result
- Oct 30, 2026, Node 24.22.1, after `npm ci`: `npm run test:all` exit 0. Unit:
  173/173 passed. Playwright: 126 passed. Smoke: 206 passed, 0 failed.
- iOS simulator build (Xcode 27.1, iPhone 18 Pro): BUILD SUCCEEDED, and
  `PrivacyInfo.xcprivacy` is in `MoshiAndPals.app`.
- Phase 1, Oct 30, 2026: `swift test --package-path ios/MoshiKit` gives 39
  passed, 0 failed. `xcodebuild test` on the iPhone 18 Pro simulator (iOS 27,
  CODE_SIGNING_ALLOWED=NO) succeeded: 6 passed, 1 skipped (the optional
  screenshot test). The web game was not changed, so the web gate wasn't rerun.
  Not covered: a real Game Center sign-in and submission. That needs a signed
  build and the App Store Connect IDs.

## Last commit
- See `git log feat/appstore-readiness -1`. It's based on c4dc551.

## Agent / model + time
- Claude Code (claude-opus-5-5), Oct 30, 2026.
