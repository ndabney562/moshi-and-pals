# HANDOFF

**Goal:** Take Moshi and Pals (now v0.35.0) from "works" to an App Store-ready
iPhone game. Owner: Noah. Ask him before anything creative, irreversible or
public-facing.

**Read first:** CLAUDE.md, AGENTS.md, PROJECT.md, docs/ROADMAP.md,
docs/MY_CONTRIBUTIONS.md, docs/APP-STORE.md. History: docs/HANDOFF-ARCHIVE.md.

## Done
- Step 1, menus option A: PR #92 merged to main (f80d936, Oct 30, 2026) after
  iOS CI went green on the macos-26 runner with the newest Xcode. The old
  Xcode 16.4 + iOS 26 simulator mismatch lost or crashed synthesized taps;
  macos-15 runners were unavailable during a GitHub Actions incident.
- Step 2, App Store compliance: PR #93 merged (487894d). Privacy policy,
  build number = commit count, logos painted off Kaya's cap (Noah approved),
  docs/APP-STORE.md. Noah has consent from every real person in the game.
- Step 3, polish and weight: PR #94 merged to main (24dca68, Oct 30, 2026).
  Lazy menu art, JPEG portraits and social card, bundle size budgets.
- Step 4, hygiene: PR #95 merged (ca80e45, Oct 30, 2026). v0.35.0, versioned
  CHANGELOG, one-off docs in docs/archive/. Live on Pages: version.json says
  v0.35.0 (ca80e45); privacy.html returns 200.
- Janeen and Amanda's numbers are intentional (Noah).
- Branches: Noah deleted 67 stale remote branches (Oct 30, 2026). Their
  commit IDs are in ~/Desktop/AI.Stuff/Local.Stuff/moshi-branch-backup-2026-10-30.txt
  (outside the repo) for restoring any of them.

## In progress
- Nothing. Waiting on Noah for Apple setup and screenshot scenes.

## Next step (exact)
1. [Noah] Team in Xcode, Game Center IDs, TestFlight (docs/APP-STORE.md).
2. [Claude] Screenshots for the App Store (6.9" and 6.5" landscape); Noah picks
   the scenes.

## Blockers
- Apple Developer account and `DEVELOPMENT_TEAM` (Noah).

## Last test result
- `chore/hygiene`, Oct 30, 2026, Noah's Mac: build OK (3,434 KB); unit
  172/172; smoke 207/0; MoshiKit 29/29; xcodebuild test (iPhone 18 Pro
  simulator) 5 passed, 1 skipped; built app reports 0.35.0.
- `feat/polish-weight`, Oct 30, 2026, Noah's Mac: build OK (3,434 KB bundle);
  unit 172/172; bundle 7/7 (new size-budget test); Playwright 128 passed
  (Chromium + WebKit, after fixing the PWA spec); smoke 207/0; xcodebuild test
  5 passed, 1 skipped. WebKit cold start to title on this Mac: median ~0.8 s
  before and after (localhost, so download size barely shows).
- `feat/app-store-compliance`, Oct 30, 2026, Noah's Mac: build OK; unit
  172/172; smoke 207 passed, 0 failed; MoshiKit 29/29; xcodebuild test 5
  passed, 1 skipped; built app's CFBundleVersion 295 = commit count.

## Last commit
- `git log feat/app-store-compliance -1` (PR #93); #92 head is 99f0847.

## Agent / model + time
- Claude Code (claude-opus-5-5), Oct 30, 2026.
