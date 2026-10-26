import Foundation
import Observation

/// Sends commands to the running game (the WKWebView host in the app; a recorder in tests).
@MainActor
public protocol GameCommandSending: AnyObject {
    func send(_ command: BridgeCommand)
}

/// The app's single source of truth: the game's latest snapshot, whether the game is up, and which game
/// screen (if any) is showing. Screens read it through their view models; the game host feeds it messages.
@MainActor
@Observable
public final class GameStore {
    public private(set) var snapshot: GameSnapshot
    /// The game has booted and takes commands. Commands sent before then wait.
    public private(set) var isGameReady = false
    public private(set) var isShiftRunning = false
    #if DEBUG
    public var layoutDiagnostic = ""
    #endif
    /// The game screen showing full screen, or nil for the native menus.
    public var presentedScreen: GameScreen?
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
        case .snapshot(var next):
            // Pictures come once per launch of the game; later snapshots keep them
            if next.art.isEmpty { next.art = snapshot.art }
            snapshot = next
            cache.save(next)
        case .exit:
            isShiftRunning = false
            presentedScreen = nil
        case .haptic(let kind):
            guard hapticsEnabled, throttle.allow(kind, at: clock()) else { return }
            haptics?.play(kind.style)
        case .unknown:
            break
        }
    }

    /// The game's page went away (it crashed or is reloading): back to the menus until it reports in again.
    public func gameDidReset() {
        isGameReady = false
        isShiftRunning = false
        presentedScreen = nil
    }

    // MARK: To the game

    public func send(_ command: BridgeCommand) {
        if isGameReady, let sink {
            sink.send(command)
        } else {
            // Only the last start or open counts (a double tap before the game is up starts one shift)
            if command.isNavigation { queued.removeAll { $0.isNavigation } }
            queued.append(command)
        }
    }

    public func startShift(_ kind: ShiftKind) {
        presentedScreen = .shift
        send(.start(kind))
    }

    /// Opens the Residency Board or the Equipment Locker.
    public func open(_ screen: GameScreen) {
        presentedScreen = screen
        send(.open(screen))
    }

    public func hire(_ palID: String) {
        send(.hire(palID: palID))
    }

    public func update(_ patch: SettingsPatch) {
        snapshot.settings = patch.applied(to: snapshot.settings)
        send(.setSettings(patch))
    }

    /// A light tap for native controls (picking a Pal, toggles), if haptics are on.
    public func selectionFeedback() {
        guard hapticsEnabled else { return }
        haptics?.play(.selection)
    }
}
