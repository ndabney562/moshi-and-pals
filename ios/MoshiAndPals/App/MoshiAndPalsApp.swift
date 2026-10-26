import MoshiKit
import SwiftUI

@main
@MainActor
struct MoshiAndPalsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var environment = AppEnvironment.make()

    var body: some Scene {
        WindowGroup {
            RootView(game: environment.game)
                .environment(environment.store)
                .preferredColorScheme(environment.colorScheme)
        }
    }
}

/// What the app runs on: the real game in a web view, or (for UI tests) a stand-in with sample data.
@MainActor
struct AppEnvironment {
    let store: GameStore
    let game: GameLayerKind
    /// The store only holds its game weakly, so the stand-in is kept here.
    var standIn: StandInGame?
    /// Forced by UI tests (`-ui-dark`) for dark mode screenshots; nil follows the system.
    var colorScheme: ColorScheme?

    static func make(arguments: [String] = ProcessInfo.processInfo.arguments) -> AppEnvironment {
        if arguments.contains("-ui-testing") {
            let defaults = UserDefaults(suiteName: "ui-testing") ?? .standard
            defaults.removePersistentDomain(forName: "ui-testing")
            let store = GameStore(cache: MemorySnapshotCache(.sample), preferences: AppPreferences(defaults: defaults))
            let fake = StandInGame(store: store)
            store.attach(fake)
            store.receive(.ready)
            return AppEnvironment(store: store, game: .standIn, standIn: fake, colorScheme: arguments.contains("-ui-dark") ? .dark : nil)
        }
        if arguments.contains("-web-integration") {
            let store = GameStore(cache: MemorySnapshotCache())
            return AppEnvironment(store: store, game: .web(WebGameHost(store: store, ephemeral: true)))
        }
        let store = GameStore(cache: FileSnapshotCache.standard(), haptics: UIKitHaptics())
        return AppEnvironment(store: store, game: .web(WebGameHost(store: store)))
    }
}

enum GameLayerKind {
    case web(WebGameHost)
    case standIn
}

/// Accepts commands and does nothing: the UI tests' game.
@MainActor
final class StandInGame: GameCommandSending {
    private let store: GameStore

    init(store: GameStore) {
        self.store = store
    }

    func send(_ command: BridgeCommand) {
        if case .hire(let id) = command {
            var snapshot = store.snapshot
            if let i = snapshot.pals.firstIndex(where: { $0.id == id }) {
                snapshot.progress.nps -= snapshot.pals[i].price
                snapshot.pals[i].unlocked = true
            }
            store.receive(.snapshot(snapshot))
        }
    }
}
