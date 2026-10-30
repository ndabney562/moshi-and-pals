import GameKit
import MoshiKit
import OSLog
import UIKit

private let log = Logger(subsystem: "MoshiAndPals", category: "gameCenter")

/// Signs the player in to Game Center and sends it new bests and unlocks from each snapshot.
/// Signed out (or Game Center turned off) it does nothing; the game plays the same either way.
@MainActor
@Observable
final class GameCenterService {
    private(set) var isAuthenticated = false

    @ObservationIgnored private let ledger: GameCenterLedger
    @ObservationIgnored private var latest: GameSnapshot?
    @ObservationIgnored private var isReporting = false

    init(ledger: GameCenterLedger = GameCenterLedger()) {
        self.ledger = ledger
    }

    /// GameKit calls the handler now and again whenever the sign-in changes.
    func start() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            Task { @MainActor in
                guard let self else { return }
                if let viewController {
                    Self.present(viewController)
                    return
                }
                if let error { log.info("Game Center sign-in: \(error.localizedDescription, privacy: .public)") }
                self.isAuthenticated = GKLocalPlayer.local.isAuthenticated
                if let latest = self.latest { self.report(latest) }
            }
        }
    }

    /// Sends what Game Center hasn't confirmed yet. Failures stay pending for the next snapshot.
    func report(_ snapshot: GameSnapshot) {
        latest = snapshot
        guard isAuthenticated, !isReporting else { return }
        let pending = ledger.pending(for: snapshot)
        guard !pending.isEmpty else { return }
        isReporting = true
        Task {
            for score in pending.scores {
                do {
                    try await GKLeaderboard.submitScore(score.value, context: 0, player: GKLocalPlayer.local,
                                                        leaderboardIDs: [score.leaderboardID])
                    ledger.markReported(scores: [score])
                } catch {
                    log.error("Score \(score.leaderboardID, privacy: .public) not sent: \(error.localizedDescription, privacy: .public)")
                }
            }
            // One at a time, so an achievement missing from App Store Connect can't hold back the others.
            for id in pending.achievementIDs {
                let achievement = GKAchievement(identifier: id)
                achievement.percentComplete = 100
                do {
                    try await GKAchievement.report([achievement])
                    ledger.markReported(achievementIDs: [id])
                } catch {
                    log.error("Achievement \(id, privacy: .public) not sent: \(error.localizedDescription, privacy: .public)")
                }
            }
            isReporting = false
            if let latest, latest != snapshot { report(latest) }
        }
    }

    /// Apple's Game Center dashboard: leaderboards and achievements.
    func showDashboard() {
        GKAccessPoint.shared.trigger(state: .dashboard) {}
    }

    private static func present(_ viewController: UIViewController) {
        let window = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)
        var top = window?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        top?.present(viewController, animated: true)
    }
}
