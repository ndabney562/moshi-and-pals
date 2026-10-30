import Foundation
import Observation

/// Sends commands to the running game (the WKWebView host in the app; a recorder in tests).
@MainActor
public protocol GameCommandSending: AnyObject {
    func send(_ command: BridgeCommand)
}

/// The app's single source of truth: the game's latest snapshot, whether the game is up or in a shift, and
/// what the game has asked the app to show. The game host feeds it messages; the Settings sheet reads it.
@MainActor
@Observable
public final class GameStore {
    public private(set) var snapshot: GameSnapshot
    /// The game's title screen is up and it takes commands. Commands sent before then wait.
    public private(set) var isGameReady = false
    public private(set) var isShiftRunning = false
    #if DEBUG
    public var layoutDiagnostic = ""
    /// The texts on the game's title screen (`-web-integration` builds), to check the web menus are all there.
    public var titleDiagnostic = ""
    #endif
    /// The game asked for the Settings sheet (the title's gear); the sheet clears it when dismissed.
    public var isSettingsPresented = false
    /// Runs when the game asks for Game Center (the LEADERBOARD tab). The app sets it; nil does nothing.
    @ObservationIgnored public var onOpenGameCenter: (() -> Void)?
    public var hapticsEnabled: Bool {
        didSet { preferences.hapticsEnabled = hapticsEnabled }
    }

    @ObservationIgnored private weak var sink: GameCommandSending?
    @ObservationIgnored private var queued: [BridgeCommand] = []
    @ObservationIgnored private let cache: SnapshotCaching
    @ObservationIgnored private let preferences: AppPreferences
    @ObservationIgnored private let haptics: HapticPlaying?
    @ObservationIgnored private var throttle = HapticThrottle()
    @ObservationIgnored private let clock: () -> TimeInterval

    public init(
        cache: SnapshotCaching,
        preferences: AppPreferences = AppPreferences(),
        haptics: HapticPlaying? = nil,
        clock: @escaping () -> TimeInterval = { ProcessInfo.processInfo.systemUptime }
    ) {
        self.cache = cache
        self.preferences = preferences
        self.haptics = haptics
        self.clock = clock
        snapshot = cache.load() ?? GameSnapshot()
        hapticsEnabled = preferences.hapticsEnabled
    }

    /// True once there's something to show (from the cache or the game).
    public var hasContent: Bool { !snapshot.pals.isEmpty }

    public func attach(_ sink: GameCommandSending) {
        self.sink = sink
    }

    // MARK: From the game

    public func receive(_ message: BridgeMessage) {
        switch message {
        case .ready:
            isShiftRunning = false
            isGameReady = true
            let pending = queued
            queued.removeAll()
            pending.forEach { sink?.send($0) }
        case .playing:
            isShiftRunning = true
        case .snapshot(let next):
            snapshot = next
            cache.save(next)
        case .exit:
            isShiftRunning = false
        case .openSettings:
            isSettingsPresented = true
        case .openGameCenter:
            onOpenGameCenter?()
        case .haptic(let kind):
            guard hapticsEnabled, throttle.allow(kind, at: clock()) else { return }
            haptics?.play(kind.style)
        case .unknown:
            break
        }
    }

    /// The game's page went away (it crashed or is reloading): nothing to show until it reports in again.
    public func gameDidReset() {
        isGameReady = false
        isShiftRunning = false
        isSettingsPresented = false
    }

    // MARK: To the game

    public func send(_ command: BridgeCommand) {
        if isGameReady, let sink {
            sink.send(command)
        } else {
            queued.append(command)
        }
    }

    public func update(_ patch: SettingsPatch) {
        snapshot.settings = patch.applied(to: snapshot.settings)
        send(.setSettings(patch))
    }

    /// A light tap for native controls (toggles), if haptics are on.
    public func selectionFeedback() {
        guard hapticsEnabled else { return }
        haptics?.play(.selection)
    }
}
