# HANDOFF

**Goal:** Take Moshi and Pals (v0.33.0) from "works" to an App Store-ready
iPhone game. Owner: Noah. Ask him before anything creative, irreversible or
public-facing.

**Read first:** CLAUDE.md, AGENTS.md, PROJECT.md, docs/ROADMAP.md,
docs/MY_CONTRIBUTIONS.md, docs/APP-STORE.md. History: docs/HANDOFF-ARCHIVE.md.

## Done
- Step 1, menus option A: PR #92 merged to main (f80d936, Oct 30, 2026) after
  iOS CI went green on the macos-26 runner with the newest Xcode. The old
  Xcode 16.4 + iOS 26 simulator mismatch lost or crashed synthesized taps;
  macos-15 runners were unavailable during a GitHub Actions incident.
- Step 2, App Store compliance: draft PR #93, now based on main. Privacy policy,
  build number = commit count, logos painted off Kaya's cap (Noah approved),
  docs/APP-STORE.md. Noah has consent from every real person in the game.

## In progress
- #93's CI on main. Noah said to merge approved PRs when green.

## Next step (exact)
1. [Claude] When #93's checks (web + iOS) are green: `gh pr ready 93` and
   `gh pr merge 93 --merge`. Then check the privacy page is live at
   https://ndabney562.github.io/moshi-and-pals/privacy.html (Pages deploy).
2. [Claude] Ask Noah before deleting merged branches (step 4 hygiene).
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
