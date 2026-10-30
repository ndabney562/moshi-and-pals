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

## In progress
- Nothing.

## Next step (exact)
1. [Noah] Pick the next phase. Options are listed in the final message of the
   Oct 30 session. Main open decision: Game Center vs the Cloudflare
   leaderboard. Get a second-opinion review before building either.
2. [Any agent] After merging, run `npm ci && npm run test:all`, then do an
   Xcode archive with Noah's team set.

## Blockers
- `DEVELOPMENT_TEAM` and an Apple Developer account (Noah).
- The second-opinion review process doc is missing (`docs/GEMINI-BENCHMARK-WORKFLOW.md`).

## Last test result
- Oct 30, 2026, Node 24.22.1, after `npm ci`: `npm run test:all` exit 0. Unit:
  173/173 passed. Playwright: 126 passed. Smoke: 206 passed, 0 failed.
- iOS simulator build (Xcode 27.1, iPhone 18 Pro): BUILD SUCCEEDED, and
  `PrivacyInfo.xcprivacy` is in `MoshiAndPals.app`. Swift tests were not rerun
  because no Swift code changed.

## Last commit
- See `git log feat/appstore-readiness -1`. It's based on c4dc551.

## Agent / model + time
- Claude Code (claude-opus-5-5), Oct 30, 2026.
