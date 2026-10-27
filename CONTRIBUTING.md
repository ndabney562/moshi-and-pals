# Contributing

Thanks for helping! Moshi and Pals is Noah's game, so new characters, names and jokes go through him first. Please open an issue before starting anything big.

## Ground rules

- **Keep it playable.** Every change should leave the game working on the web and in the app.
- **Numbers and content live in data.** Tuning goes in `src/config/` and content in `src/data/`, never hard-coded in systems.
- **No real brands or photos.** Don't use real CityMD names or logos, Call of Duty assets, or team logos. Reference photos of real people stay out of the repo.
- **No secrets.** Don't commit keys or tokens. Signing teams and bundle IDs stay local (see the README).

## Before you open a PR

Web game:

```
npx playwright install chromium webkit
npm run test:all
```

iPhone app (on a Mac with Xcode 16 and Node 22):

```
swift test --package-path ios/MoshiKit
xcodebuild test -project ios/MoshiAndPals.xcodeproj -scheme MoshiAndPals -destination 'platform=iOS Simulator,name=iPhone 16'   # UI tests
```

GitHub Actions runs the fast Linux web gate on pushes and pull requests (`ci.yml`). The full web gate is required by Pages deployment; the heavy macOS/iOS workflow (`ios.yml`) is manual. Run `npm run smoke:quick` for the short local mobile lane.

## Style

- **Swift:** MVVM. Logic and view models go in `ios/MoshiKit`, with unit tests. Views go in `ios/MoshiAndPals/Features`.
- **Design:** take colors, type, spacing and motion from `DesignSystem/Theme.swift`, not literals. Every control needs a VoiceOver label, and text must work at large Dynamic Type sizes. No force unwraps.
- **TypeScript:** match the code around you. Short comments that explain why.
- **Docs:** update `docs/CHANGELOG.md`, and `docs/BALANCE.md` when numbers change.
- **Commits:** small, focused commits with plain-English messages.
