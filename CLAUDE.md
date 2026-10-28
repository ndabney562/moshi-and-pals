# Notes for Claude

- Read `AGENTS.md` and `docs/GEMINI-BENCHMARK-WORKFLOW.md` for the user's standing
  preference: involve Gemini in substantial comparative design reviews, retain
  the top-down mobile game, and verify its suggestions against the actual code.

- Moshi and Pals: TypeScript + Phaser 3.90 + Vite, iPhone-first, deployed to GitHub Pages from `main`.
- The native iPhone app lives in `ios/` (SwiftUI, MVVM, logic in the `ios/MoshiKit` package). It bundles the same web build and talks to it through `src/core/native.ts`. CI: `.github/workflows/ios.yml` on macOS. There's no Swift toolchain on Linux, so CI is the only check for Swift changes.
- Build one milestone at a time with Noah; ask for his creative input at the milestone it belongs to (see docs/MY_CONTRIBUTIONS.md). Keep the game playable after every change.
- Tuning numbers go in `src/config/`, content in `src/data/`, never hard-coded in systems.
- Before pushing: `npm run build && npm run smoke` (uses /opt/pw-browsers Chromium; set CHROMIUM_PATH elsewhere).
- Keep docs/ concise; update CHANGELOG.md and BALANCE.md when behavior or numbers change.
- No real CityMD names or logos. The map may follow the real clinic's floor plan (Noah's call, Oct 2026; keep the photos out of the repo). No Call of Duty assets or names.
- The Pals are Noah's coworkers, playable by his call (Oct 2026): Kaya and Lucien. Keep their photos out of the repo; no team logos on their art.
