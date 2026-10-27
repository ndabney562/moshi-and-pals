import MoshiKit
import OSLog
import UIKit
import WebKit

private let log = Logger(subsystem: "MoshiAndPals", category: "game")

/// Runs the bundled game in one long-lived WKWebView for the app's whole life, relays its messages to the
/// store, and runs the store's commands in it. The game idles (its loop asleep) while the menus are showing.
@MainActor
final class WebGameHost: NSObject, GameCommandSending {
    private(set) var webView: WKWebView?
    private let store: GameStore
    private let root: URL?

    init(store: GameStore, root: URL? = BundledGameSchemeHandler.bundledRoot(), ephemeral: Bool = false) {
        self.store = store
        self.root = root
        super.init()
        guard let root else { return }

        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundledGameSchemeHandler(root: root), forURLScheme: BundledGameSchemeHandler.scheme)
        config.userContentController.add(WeakMessageHandler(self), name: "moshi")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = ephemeral ? .nonPersistent() : .default()

        let view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = true
        view.backgroundColor = UIColor(rgb: 0x0D2B2E)
        view.scrollView.backgroundColor = UIColor(rgb: 0x0D2B2E)
        view.scrollView.isScrollEnabled = false
        view.scrollView.bounces = false
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.allowsLinkPreview = false
        view.navigationDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { view.isInspectable = true }
        #endif
        webView = view
        store.attach(self)
        load()
    }

    /// False when the build has no game files (Node.js wasn't found while building).
    var hasGame: Bool { root != nil }

    private func load() {
        guard let url = BundledGameSchemeHandler.startURL else { return }
        webView?.load(URLRequest(url: url))
    }

    func send(_ command: BridgeCommand) {
        webView?.evaluateJavaScript(command.javaScript) { _, error in
            if let error { log.error("Game command failed: \(error.localizedDescription, privacy: .public)") }
        }
    }

    fileprivate func receive(_ body: Any) {
        do {
            let message = try BridgeMessage.decode(body: body)
            store.receive(message)
            #if DEBUG
            if message == .playing && ProcessInfo.processInfo.arguments.contains("-web-integration") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in
                    guard let view = self?.webView else { return }
                    view.evaluateJavaScript("JSON.stringify({inner:[innerWidth,innerHeight],visual:[visualViewport.width,visualViewport.height],portrait:document.body.className,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),parent:document.getElementById('game').getBoundingClientRect().toJSON()})") { [weak self] value, _ in
                        self?.store.layoutDiagnostic = value as? String ?? "unavailable"
                    }
                }
            }
            #endif
        } catch {
            log.error("Unreadable message from the game: \(String(describing: error), privacy: .public)")
        }
    }
}

extension WebGameHost: WKNavigationDelegate {
    /// iOS can stop a backgrounded web page to save memory: start it again and go back to the menus.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        store.gameDidReset()
        load()
    }

    /// Links out of the game (none today) open in Safari rather than replacing it.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
        if url.scheme == BundledGameSchemeHandler.scheme {
            decisionHandler(.allow)
        } else {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }
    }
}

/// WKUserContentController keeps its handlers alive; this breaks the cycle back to the host.
private final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var host: WebGameHost?

    init(_ host: WebGameHost) {
        self.host = host
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        let body = message.body
        MainActor.assumeIsolated {
            host?.receive(body)
        }
    }
}
