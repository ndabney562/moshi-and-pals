# Notes for Claude

- Moshi and Pals: TypeScript + Phaser 3.90 + Vite, iPhone-first, deployed to GitHub Pages from `main`.
- Build one milestone at a time with Noah; ask for his creative input at the milestone it belongs to (see docs/MY_CONTRIBUTIONS.md). Keep the game playable after every change.
- Tuning numbers go in `src/config/`, content in `src/data/`, never hard-coded in systems.
- Before pushing: `npm run build && npm run smoke` (uses /opt/pw-browsers Chromium; set CHROMIUM_PATH elsewhere).
- Keep docs/ concise; update CHANGELOG.md and BALANCE.md when behavior or numbers change.
- Fictional clinic only: no real CityMD names, logos, or floor plans. No Call of Duty assets or names.
