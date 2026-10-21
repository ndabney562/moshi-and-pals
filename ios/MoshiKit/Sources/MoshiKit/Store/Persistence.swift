import Foundation

/// Keeps the last snapshot, so the menus have content the moment the app opens (before the game boots).
public protocol SnapshotCaching {
    func load() -> GameSnapshot?
    func save(_ snapshot: GameSnapshot)
}

/// A JSON file (Application Support by default). Failures are quiet: the cache is only a head start.
public final class FileSnapshotCache: SnapshotCaching {
    private let url: URL

    public init(url: URL) {
        self.url = url
    }

    /// `snapshot.json` in the app's Application Support folder.
    public static func standard() -> FileSnapshotCache {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        return FileSnapshotCache(url: base.appendingPathComponent("snapshot.json"))
    }

    public func load() -> GameSnapshot? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(GameSnapshot.self, from: data)
    }

    public func save(_ snapshot: GameSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
    }
}

public final class MemorySnapshotCache: SnapshotCaching {
    public private(set) var stored: GameSnapshot?

    public init(_ snapshot: GameSnapshot? = nil) {
        stored = snapshot
    }

    public func load() -> GameSnapshot? { stored }
    public func save(_ snapshot: GameSnapshot) { stored = snapshot }
}

/// App-only preferences (the game's own settings live in the game's save).
public final class AppPreferences {
    private let defaults: UserDefaults
    private enum Key {
        static let haptics = "haptics.enabled"
    }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    /// Haptics on (default) or off.
    public var hapticsEnabled: Bool {
        get { defaults.object(forKey: Key.haptics) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Key.haptics) }
    }
}
