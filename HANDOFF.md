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
- Step 3 (polish and weight): branch `feat/polish-weight`, draft PR. Noah has the
  title before/after preview. Merge when CI is green (Noah's standing OK).
- Step 4 (hygiene) next. Branch facts gathered Oct 30, 2026: 68 remote branches
  besides main; 64 merged; 3 unmerged but superseded (`rename-moshimonsters`,
  `pal-lines` = v0.16.2, `claude/project-thread-ujfa6a` = v0.28.1). Ask Noah
  before deleting any. Janeen and Amanda's numbers are intentional (Noah).

## Next step (exact)
1. [Claude] Merge the polish PR when green. Then step 4 on a new branch: version
   0.35.0 in package.json and MARKETING_VERSION (4 places in the pbxproj), group
   the unversioned CHANGELOG headings into v0.34.0 (milestones 1 to 6, menu
   remaster, Spore Pod) and v0.35.0 (App Store work and this polish), move
   one-off QA/audit docs to docs/archive/. Ask Noah about deleting branches.
2. [Noah] Team in Xcode, Game Center IDs, TestFlight (docs/APP-STORE.md).
3. [Claude] Screenshots for the App Store (6.9" and 6.5" landscape).

## Blockers
- Apple Developer account and `DEVELOPMENT_TEAM` (Noah).

## Last test result
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
