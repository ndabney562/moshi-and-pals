import Foundation
import Observation

/// The Settings tab. Game settings go to the game's own save (so the in-game pause menu agrees);
/// haptics are an app preference.
@MainActor
@Observable
public final class SettingsViewModel {
    public let store: GameStore

    public init(store: GameStore) {
        self.store = store
    }

    private var settings: GameSettings { store.snapshot.settings }

    public var sound: Bool {
        get { settings.sound }
        set { store.update(SettingsPatch(sound: newValue)) }
    }

    public var music: Bool {
        get { settings.music }
        set { store.update(SettingsPatch(music: newValue)) }
    }

    public var autoAim: Bool {
        get { settings.autoAim }
        set { store.update(SettingsPatch(autoAim: newValue)) }
    }

    public var autoRefill: Bool {
        get { settings.autoRefill }
        set { store.update(SettingsPatch(autoRefill: newValue)) }
    }

    public var reducedMotion: Bool {
        get { settings.reducedMotion }
        set { store.update(SettingsPatch(reducedMotion: newValue)) }
    }

    public var haptics: Bool {
        get { store.hapticsEnabled }
        set {
            store.hapticsEnabled = newValue
            store.selectionFeedback()
        }
    }

    /// The bundled game's build ("v0.31.0 (abc1234)"), or "Loading…" before it reports in.
    public var gameVersion: String {
        store.snapshot.version.isEmpty ? "Loading…" : store.snapshot.version
    }
}
