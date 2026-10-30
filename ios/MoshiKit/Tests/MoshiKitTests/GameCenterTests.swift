import XCTest
@testable import MoshiKit

final class GameCenterLedgerTests: XCTestCase {
    private func makeLedger() -> GameCenterLedger {
        GameCenterLedger(defaults: UserDefaults(suiteName: "MoshiKitTests-\(UUID().uuidString)") ?? .standard)
    }

    private func snapshot(urgent: Int = 0, trauma: Int = 0, unlocked: [String] = []) -> GameSnapshot {
        GameSnapshot(
            difficulties: [
                Difficulty(id: "walkIn", name: "Walk-In", blurb: ""),
                Difficulty(id: "urgent", name: "Urgent", blurb: "", bestScore: urgent),
                Difficulty(id: "trauma", name: "Trauma Center", blurb: "", bestScore: trauma),
            ],
            achievements: ["firstShift", "bossDown"].map { Achievement(id: $0, name: $0, how: "", unlocked: unlocked.contains($0)) }
        )
    }

    func testNewProgressIsPendingAndEmptyRecordsAreSkipped() {
        let pending = makeLedger().pending(for: snapshot(urgent: 1200, unlocked: ["bossDown"]))
        XCTAssertEqual(pending.scores, [GameCenterScore(leaderboardID: "moshi.best.urgent", value: 1200)])
        XCTAssertEqual(pending.achievementIDs, ["moshi.ach.bossDown"])
    }

    func testOnlyReportedProgressIsForgottenAndHigherBestsComeBack() {
        let ledger = makeLedger()
        let first = ledger.pending(for: snapshot(urgent: 1200, trauma: 300, unlocked: ["bossDown"]))
        ledger.markReported(scores: first.scores.filter { $0.leaderboardID == "moshi.best.urgent" })
        ledger.markReported(achievementIDs: first.achievementIDs)

        let retry = ledger.pending(for: snapshot(urgent: 1200, trauma: 300, unlocked: ["bossDown"]))
        XCTAssertEqual(retry.scores, [GameCenterScore(leaderboardID: "moshi.best.trauma", value: 300)])
        XCTAssertTrue(retry.achievementIDs.isEmpty)

        let better = ledger.pending(for: snapshot(urgent: 1500, trauma: 300, unlocked: ["bossDown"]))
        XCTAssertTrue(better.scores.contains(GameCenterScore(leaderboardID: "moshi.best.urgent", value: 1500)))
    }

    func testReportsSurviveARelaunch() {
        let defaults = UserDefaults(suiteName: "MoshiKitTests-\(UUID().uuidString)") ?? .standard
        let pending = GameCenterLedger(defaults: defaults).pending(for: snapshot(urgent: 900, unlocked: ["firstShift"]))
        let ledger = GameCenterLedger(defaults: defaults)
        ledger.markReported(scores: pending.scores)
        ledger.markReported(achievementIDs: pending.achievementIDs)
        XCTAssertTrue(GameCenterLedger(defaults: defaults).pending(for: snapshot(urgent: 900, unlocked: ["firstShift"])).isEmpty)
    }
}
