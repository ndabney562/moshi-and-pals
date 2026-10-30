import MoshiKit
import SwiftUI
import WebKit

/// The game itself, full screen: the web view, a short "scrubbing in" cover while it boots, or an
/// explanation if this build has no game files.
struct GameLayer: View {
    let kind: GameLayerKind
    @Environment(GameStore.self) private var store

    var body: some View {
        ZStack {
            Theme.Palette.hero

            switch kind {
            case .web(let host):
                if let webView = host.webView {
                    WebViewContainer(webView: webView)
                        .accessibilityLabel("Moshi and Pals game")
                        .accessibilityHint("A touch game: move with the left thumb, spray with the right.")
                        .accessibilityAddTraits(.allowsDirectInteraction)
                } else {
                    MissingGameView()
                }
            case .standIn:
                StandInGameView()
            }

            if ProcessInfo.processInfo.arguments.contains("-web-integration") {
                #if DEBUG
                Text(store.layoutDiagnostic)
                    .frame(width: 1, height: 1).clipped()
                    .accessibilityIdentifier("webLayoutDiagnostic")
                Text(store.titleDiagnostic)
                    .frame(width: 1, height: 1).clipped()
                    .accessibilityIdentifier("webTitleDiagnostic")
                Text(store.inputDiagnostic)
                    .frame(width: 1, height: 1).clipped()
                    .accessibilityIdentifier("webInputDiagnostic")
                #endif
                Text(store.isShiftRunning ? "Shift in progress" : store.isGameReady ? "Web game ready" : "Web game loading")
                    .font(.caption)
                    .accessibilityIdentifier("realGameStatus")
                    .allowsHitTesting(false)
                    .frame(maxHeight: .infinity, alignment: .top)
            }

            if !store.isGameReady && isWeb {
                ScrubbingInView()
                    .transition(.opacity)
            }
        }
        .animation(Theme.Motion.standard, value: store.isGameReady)
    }

    private var isWeb: Bool {
        if case .web(let host) = kind { return host.hasGame }
        return false
    }
}

/// Hosts the one long-lived WKWebView. A plain container keeps SwiftUI from ever tearing the web view down.
private struct WebViewContainer: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor(rgb: 0x0D2B2E)
        webView.frame = container.bounds
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        container.addSubview(webView)
        return container
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        if webView.superview !== uiView {
            webView.frame = uiView.bounds
            uiView.addSubview(webView)
        }
    }
}

private struct ScrubbingInView: View {
    var body: some View {
        VStack(spacing: Theme.Spacing.m) {
            ProgressView()
                .controlSize(.large)
                .tint(Theme.Palette.onHero)
            Text("Scrubbing in…")
                .font(Theme.Typography.headline)
                .foregroundStyle(Theme.Palette.onHero)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.Palette.hero)
        .accessibilityElement(children: .combine)
    }
}

/// Shown only by a build made without Node.js (the game files are bundled by scripts/ios-bundle-web.sh).
private struct MissingGameView: View {
    var body: some View {
        VStack(spacing: Theme.Spacing.m) {
            Image(systemName: "shippingbox")
                .font(.system(size: 44))
                .accessibilityHidden(true)
            Text("The game files weren't bundled")
                .font(Theme.Typography.title)
            Text("Install Node.js 22 (brew install node), then build again in Xcode.")
                .font(Theme.Typography.body)
                .multilineTextAlignment(.center)
        }
        .foregroundStyle(Theme.Palette.onHero)
        .padding(Theme.Spacing.xl)
    }
}

/// The UI tests' game: a stand-in for the web page, with buttons that send the messages its title screen would.
private struct StandInGameView: View {
    @Environment(GameStore.self) private var store

    var body: some View {
        VStack(spacing: Theme.Spacing.m) {
            Text(store.isShiftRunning ? "Game: shift" : "Game: title")
                .font(Theme.Typography.title)
                .foregroundStyle(Theme.Palette.onHero)
                .accessibilityIdentifier("gameScreen")
            HStack(spacing: Theme.Spacing.s) {
                Button("Settings") { store.receive(.openSettings) }
                    .accessibilityIdentifier("webSettingsGear")
                Button("Leaderboard") { store.receive(.openGameCenter) }
                    .accessibilityIdentifier("webLeaderboardTab")
                Button(store.isShiftRunning ? "End Shift" : "Start Shift") { store.receive(store.isShiftRunning ? .exit : .playing) }
                    .accessibilityIdentifier(store.isShiftRunning ? "webEndShift" : "webStartShift")
            }
            .buttonStyle(.secondary)
        }
        .padding(Theme.Spacing.xl)
    }
}
