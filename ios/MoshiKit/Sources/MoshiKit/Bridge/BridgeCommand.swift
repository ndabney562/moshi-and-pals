import Foundation

/// The kind of shift to start.
public enum ShiftKind: String, Codable, Sendable {
    case normal
    /// Today's Shift.
    case daily
    /// The shift kept with SAVE & QUIT.
    case resume
}

/// Screens of the game the app opens full screen.
public enum GameScreen: String, Codable, Identifiable, Sendable {
    case shift
    case board
    case locker

    public var id: String { rawValue }
}

/// Settings the app may change (only the keys set are sent).
public struct SettingsPatch: Encodable, Equatable, Sendable {
    public var autoAim: Bool?
    public var sound: Bool?
    public var music: Bool?
    public var autoRefill: Bool?
    public var reducedMotion: Bool?
    public var character: String?
    public var difficulty: String?

    public init(autoAim: Bool? = nil, sound: Bool? = nil, music: Bool? = nil, autoRefill: Bool? = nil,
                reducedMotion: Bool? = nil, character: String? = nil, difficulty: String? = nil) {
        self.autoAim = autoAim
        self.sound = sound
        self.music = music
        self.autoRefill = autoRefill
        self.reducedMotion = reducedMotion
        self.character = character
        self.difficulty = difficulty
    }

    /// Applies the patch to local settings, so the screens update before the game confirms.
    public func applied(to settings: GameSettings) -> GameSettings {
        var s = settings
        if let autoAim { s.autoAim = autoAim }
        if let sound { s.sound = sound }
        if let music { s.music = music }
        if let autoRefill { s.autoRefill = autoRefill }
        if let reducedMotion { s.reducedMotion = reducedMotion }
        if let character { s.character = character }
        if let difficulty { s.difficulty = difficulty }
        return s
    }
}

/// A request to the bundled game (`window.moshiNative` in src/core/native.ts).
public enum BridgeCommand: Equatable, Sendable {
    case start(ShiftKind)
    case open(GameScreen)
    case hire(palID: String)
    case setSettings(SettingsPatch)
    case refresh

    /// Starts a shift or opens a screen.
    public var isNavigation: Bool {
        switch self {
        case .start, .open: return true
        default: return false
        }
    }

    /// The JavaScript that runs it. Arguments are JSON-encoded, so no value can break out of the call.
    /// Does nothing if the game hasn't installed its bridge (a page that failed to load).
    public var javaScript: String {
        let call: String
        switch self {
        case .start(let kind):
            call = "start(\(Self.json(["kind": kind.rawValue])))"
        case .open(let screen):
            call = "open(\(Self.json(screen.rawValue)))"
        case .hire(let id):
            call = "hire(\(Self.json(id)))"
        case .setSettings(let patch):
            call = "setSettings(\(Self.json(patch)))"
        case .refresh:
            call = "refresh()"
        }
        return "window.moshiNative && window.moshiNative.\(call);"
    }

    private static func json<T: Encodable>(_ value: T) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        guard let data = try? encoder.encode(value), let text = String(data: data, encoding: .utf8) else { return "null" }
        return text
    }
}
