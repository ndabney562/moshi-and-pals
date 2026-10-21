import Foundation
import WebKit

/// Serves the bundled web build (the `Game` folder in the app) at `moshi://app/`. A custom scheme rather than
/// file:// gives the game a stable origin, so its saves in localStorage persist, and lets its ES modules load.
final class BundledGameSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "moshi"
    static let host = "app"
    /// The page the app opens: the game in native mode.
    static let startURL = URL(string: "\(scheme)://\(host)/index.html?native")

    private let root: URL

    /// `root` is the folder holding index.html.
    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    /// The bundled game folder, or nil if the build didn't include it (see scripts/ios-bundle-web.sh).
    nonisolated static func bundledRoot(in bundle: Bundle = .main) -> URL? {
        guard let url = bundle.resourceURL?.appendingPathComponent("Game", isDirectory: true),
              FileManager.default.fileExists(atPath: url.appendingPathComponent("index.html").path) else { return nil }
        return url
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let file = fileURL(for: url),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let headers = [
            "Content-Type": Self.mimeType(for: file.pathExtension),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        guard let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers) else {
            task.didFailWithError(URLError(.badServerResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        // Files are read in one go; nothing to cancel
    }

    /// The file for a request, refusing anything that would leave the game folder.
    private func fileURL(for url: URL) -> URL? {
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/") else { return nil }
        return file
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json"
        case "webmanifest": return "application/manifest+json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg": return "image/svg+xml"
        case "webp": return "image/webp"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "ogg": return "audio/ogg"
        default: return "application/octet-stream"
        }
    }
}
