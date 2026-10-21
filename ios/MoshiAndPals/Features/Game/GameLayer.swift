import MoshiKit
import SwiftUI
import WebKit

/// The game itself, full screen: the web view, a short "scrubbing in" cover while it gets going, or an
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

            if store.presentedScreen != nil && !store.isGameReady && isWeb {
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
    @Environment(GameStore.self) private var store

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
            Button("Back to the menu") { store.presentedScreen = nil }
                .buttonStyle(.primary)
                .frame(maxWidth: 320)
        }
        .foregroundStyle(Theme.Palette.onHero)
        .padding(Theme.Spacing.xl)
    }
}

/// The UI tests' game: names the screen it stands in for and leaves like the real one does.
private struct StandInGameView: View {
    @Environment(GameStore.self) private var store

    var body: some View {
        VStack(spacing: Theme.Spacing.m) {
            Text(store.presentedScreen.map { "Game: \($0.rawValue)" } ?? "")
                .font(Theme.Typography.title)
                .foregroundStyle(Theme.Palette.onHero)
                .accessibilityIdentifier("gameScreen")
            Button("End Shift") { store.receive(.exit) }
                .buttonStyle(.primary)
                .frame(maxWidth: 320)
                .accessibilityIdentifier("endShiftButton")
        }
        .padding(Theme.Spacing.xl)
    }
}
