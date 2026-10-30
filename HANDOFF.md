# HANDOFF

**Goal:** Take Moshi and Pals (v0.33.0) from "works" to a professional,
App Store-ready iPhone game. Owner: Noah. Ask him before anything creative,
irreversible or public-facing.

**Read first:** CLAUDE.md, AGENTS.md, README.md, docs/ROADMAP.md,
docs/MY_CONTRIBUTIONS.md. CHANGELOG.md and BALANCE.md live in `docs/`.

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

- Menus option A (Oct 30, 2026, branch `feat/menus-option-a`, draft PR). The
  app shows the web title and menus; `?native` boots to Title and `toTitle()`
  returns there. SwiftUI keeps the Settings sheet (the title's gear posts
  `openSettings`), Game Center (the LEADERBOARD tab and game-over button post
  `openGameCenter`), haptics and the landscape lock. PlayView, ProgressScreen
  and their view models are deleted; `start`/`open`/`hire` and the art in the
  snapshot are gone from the bridge. New tests: every title feature reachable in
  `?native` (Playwright + smoke); iOS UI test boots the real game to its title,
  checks all menu texts, taps START SHIFT and relaunches.

- Step 2, App Store compliance (Oct 30, 2026, branch `feat/app-store-compliance`,
  draft PR stacked on #92). Privacy policy `public/privacy.html`, linked from
  Settings → About (UI test `testSettingsLinksToThePrivacyPolicy`). Build
  number = commit count via `scripts/ios-build-number.sh` (Xcode build phase
  "Stamp the build number"; ios.yml fetches full history). Noah clarified the
  cap belongs to Kaya, not Ken (the poster was already right); the team logo
  and side brand mark are painted out of `title.jpg` and `social-card.png`
  (OpenCV inpaint, cap kept). `docs/APP-STORE.md` is the checklist.

## In progress
- PR #92 (menus option A): iOS CI is red for a CI-environment reason, not a
  game bug. The workflow's simulator picker takes the newest iOS runtime (iOS
  26.2, iPhone 17 Pro) while the runner's default Xcode is 16.4 (iOS 18.5 SDK).
  That unsupported pairing breaks synthesized touches into the WKWebView: run 1
  (8f8a46e) tapped START SHIFT with no effect; run 2 (d30cbaf, after the test
  learned to tap where the page reports the pill and re-tap) crashed the app in
  UIKit's gesture graph (`UIGestureGraphEdge`, SIGABRT) on the press. Both
  runs passed locally on Xcode 27.1. Crash report:
  xcresult artifact of run 41068034369.
  **Fix pushed Oct 30, 2026 (Noah said go):** in
  `.github/workflows/ios.yml` set `DEVELOPER_DIR` to the newest Xcode on the
  image (`ls -d /Applications/Xcode_*.app | sort -V | tail -1`, 26.3 today) so
  the toolchain matches the iOS 26 runtime, or make the picker choose an iOS
  18.x runtime. Prefer the first: Noah builds with Xcode 27.1 locally.
  Keep d30cbaf's test changes (they give better failure messages).

- Step 2 PR: waiting for Noah to approve the painted cap (preview sent) and
  merge after #92.

## Next step (exact)
1. [Noah] Review and merge the menus option A PR. Then on a real phone: tap the
   gear (Settings sheet), tap LEADERBOARD (Game Center), play a shift.
2. [Any agent] Step 2 of Noah's plan: App Store compliance. Privacy policy page
   on GitHub Pages linked from Settings → About, build number from the CI run
   number, docs/APP-STORE.md checklist. Noah supplies or approves the title art
   without the NBA logo on Ken's cap.
3. [Noah] Set the Team in Xcode and create the Game Center IDs in
   `docs/GAME-CENTER.md`. Sign-in can't be checked in an unsigned simulator
   build.
4. [Any agent] Step 3: polish and weight (title-art seams at iPhone landscape
   width, crowded top nav, PNG → WebP/JPEG with CI size budgets, lazy menu art,
   WebKit cold start). Then step 4 hygiene (version bump, trim docs, stale
   branches: ask Noah before deleting) and step 5 (ask Noah about Janeen and
   Amanda's numbers).

## Blockers
- `DEVELOPMENT_TEAM` and an Apple Developer account (Noah).

## Last test result
- Step 2 branch, Oct 30, 2026, on Noah's Mac: build OK (14 bundle files incl.
  privacy.html); unit 172/172; smoke 207/0; MoshiKit 29/29; xcodebuild test 5
  passed, 1 skipped; the built app's CFBundleVersion is 295 = commit count.
- CI-fix commit on `feat/menus-option-a`, Oct 30, 2026, on Noah's Mac:
  `npm run build` OK; unit 172/172; smoke 207 passed, 0 failed; `swift test`
  (MoshiKit) 29/29; `xcodebuild test` on the booted iPhone simulator (Xcode
  27.1): 4 UI tests passed, 1 skipped, the real-game test in 28 s.
- Menus option A, Oct 30, 2026, on Noah's Mac: `npm run build` OK; unit
  172/172; Playwright native, mobile, leaderboard and menu-design specs 40/40
  (Chromium + WebKit); full smoke: see the PR description. `swift test`
  (MoshiKit) 29/29. `xcodebuild test` on the iPhone simulator (Xcode 27.1): 4 UI
  tests passed, 1 skipped (screenshots), including the real bundled game
  booting to its title with every menu and starting a shift from it.
- Earlier (main at 2fcf6fd): `npm run test:all` exit 0. Unit 173/173.
  Playwright 126 passed. Smoke 206 passed, 0 failed.
- iOS simulator build (Xcode 27.1, iPhone 18 Pro): BUILD SUCCEEDED, and
  `PrivacyInfo.xcprivacy` is in `MoshiAndPals.app`.
- Phase 1, Oct 30, 2026: `swift test --package-path ios/MoshiKit` gives 39
  passed, 0 failed. `xcodebuild test` on the iPhone 18 Pro simulator (iOS 27,
  CODE_SIGNING_ALLOWED=NO) succeeded: 6 passed, 1 skipped (the optional
  screenshot test). The web game was not changed, so the web gate wasn't rerun.
  Not covered: a real Game Center sign-in and submission. That needs a signed
  build and the App Store Connect IDs.

## Last commit
- See `git log feat/menus-option-a -1`. It's based on main at 2fcf6fd.

## Agent / model + time
- Claude Code (claude-fable-5-1), Oct 30, 2026.
