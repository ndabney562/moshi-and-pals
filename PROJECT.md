# Project

- **Repo URL:** https://github.com/ndabney562/moshi-and-pals (public: never commit secrets or personal data)
- **Branch:** main (deploys to GitHub Pages). Work on feature branches, one draft PR per step.
- **Test command:** `npm run build && npm run test:unit && npm run smoke`; when `ios/` changes, also
  `swift test --package-path ios/MoshiKit` and `xcodebuild test -project ios/MoshiAndPals.xcodeproj -scheme MoshiAndPals -destination "id=<booted simulator>" CODE_SIGNING_ALLOWED=NO`.
  Don't run smoke and xcodebuild at the same time.
- **Stack:** Phaser 3.90, TypeScript, Vite, Vitest, Playwright, SwiftUI (iOS, `ios/`)
