import Foundation

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

    /// Applies the patch to local settings, so the sheet updates before the game confirms.
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

/// A request to the bundled game (`window.moshiNative` in src/core/native.ts). The game's own title screen
/// starts shifts and opens menus; the app only changes settings and asks for a fresh snapshot.
public enum BridgeCommand: Equatable, Sendable {
    case setSettings(SettingsPatch)
    case refresh

    /// The JavaScript that runs it. Arguments are JSON-encoded, so no value can break out of the call.
    /// Does nothing if the game hasn't installed its bridge (a page that failed to load).
    public var javaScript: String {
        let call: String
        switch self {
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
