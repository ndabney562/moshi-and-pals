# HANDOFF

**Goal:** Take Moshi and Pals (v0.33.0) from "works" to an App Store-ready
iPhone game. Owner: Noah. Ask him before anything creative, irreversible or
public-facing.

**Read first:** CLAUDE.md, AGENTS.md, PROJECT.md, docs/ROADMAP.md,
docs/MY_CONTRIBUTIONS.md, docs/APP-STORE.md. History: docs/HANDOFF-ARCHIVE.md.

## Done
- Step 1, menus option A: PR #92 (web title and menus in the app). Its iOS CI
  fix builds with the newest Xcode on the runner so it matches the iOS 26
  simulator; the old mismatch lost or crashed synthesized taps.
- Step 2, App Store compliance: draft PR #93, stacked on #92. Privacy policy,
  build number = commit count, logos painted off Kaya's cap (Noah approved),
  docs/APP-STORE.md. Noah has consent from every real person in the game.

## In progress
- #92's iOS CI re-run (run 41096525987) is waiting for a GitHub macOS runner
  ("capacity constraints"); the first attempt was never picked up.

## Next step (exact)
1. [Claude] When run 41096525987 finishes: if green, tell Noah to merge #92;
   if red, read its xcresult artifact and fix on `feat/menus-option-a`. If it
   is still queued after an hour, try `runs-on: macos-26` in ios.yml.
2. [Noah] Merge #92. [Claude] Retarget #93 to main (`gh pr edit 93 --base main`),
   confirm its CI, then Noah merges.
3. [Noah] Set the Team in Xcode, create the Game Center IDs from
   docs/GAME-CENTER.md, then the TestFlight steps in docs/APP-STORE.md.
4. [Claude] Step 3, polish and weight: title-art seams at iPhone landscape
   width, crowded top nav, PNG → WebP/JPEG with CI size budgets, lazy menu art,
   WebKit cold start. Then step 4 hygiene (ask Noah before deleting branches)
   and step 5 (ask Noah about Janeen and Amanda's numbers).

## Blockers
- Apple Developer account and `DEVELOPMENT_TEAM` (Noah).

## Last test result
- `feat/app-store-compliance`, Oct 30, 2026, Noah's Mac: build OK; unit
  172/172; smoke 207 passed, 0 failed; MoshiKit 29/29; xcodebuild test 5
  passed, 1 skipped; built app's CFBundleVersion 295 = commit count.

## Last commit
- `git log feat/app-store-compliance -1` (PR #93); #92 head is 99f0847.

## Agent / model + time
- Claude Code (claude-opus-5-5), Oct 30, 2026.
