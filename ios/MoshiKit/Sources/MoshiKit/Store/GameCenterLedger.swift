import Foundation

/// A best score for one Game Center leaderboard.
public struct GameCenterScore: Equatable, Sendable {
    public var leaderboardID: String
    public var value: Int

    public init(leaderboardID: String, value: Int) {
        self.leaderboardID = leaderboardID
        self.value = value
    }
}

/// What Game Center hasn't been told yet.
public struct GameCenterPending: Equatable, Sendable {
    public var scores: [GameCenterScore]
    public var achievementIDs: [String]

    public var isEmpty: Bool { scores.isEmpty && achievementIDs.isEmpty }
}

/// Remembers what Game Center has confirmed, so each snapshot only sends a higher best or a new unlock.
/// Game Center IDs follow the game's own: one leaderboard per difficulty (`moshi.best.urgent`) and one
/// achievement per achievement (`moshi.ach.<id>`). They must match App Store Connect. Today's Shift isn't
/// sent: it resets at local midnight, Game Center's recurring leaderboards don't.
public final class GameCenterLedger {
    private let defaults: UserDefaults
    private enum Key {
        static let scores = "gameCenter.scores"
        static let achievements = "gameCenter.achievements"
    }

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    public static func leaderboardID(difficulty: String) -> String { "moshi.best.\(difficulty)" }
    public static func achievementID(_ id: String) -> String { "moshi.ach.\(id)" }

    private var reportedScores: [String: Int] {
        get { defaults.dictionary(forKey: Key.scores) as? [String: Int] ?? [:] }
        set { defaults.set(newValue, forKey: Key.scores) }
    }

    private var reportedAchievements: Set<String> {
        get { Set(defaults.stringArray(forKey: Key.achievements) ?? []) }
        set { defaults.set(newValue.sorted(), forKey: Key.achievements) }
    }

    public func pending(for snapshot: GameSnapshot) -> GameCenterPending {
        let scores = reportedScores
        let achievements = reportedAchievements
        return GameCenterPending(
            scores: snapshot.difficulties
                .map { GameCenterScore(leaderboardID: Self.leaderboardID(difficulty: $0.id), value: $0.bestScore) }
                .filter { $0.value > (scores[$0.leaderboardID] ?? 0) },
            achievementIDs: snapshot.achievements
                .filter(\.unlocked)
                .map { Self.achievementID($0.id) }
                .filter { !achievements.contains($0) }
        )
    }

    /// Call only once Game Center has accepted them; anything not marked is sent again with the next snapshot.
    public func markReported(scores: [GameCenterScore]) {
        var reported = reportedScores
        for score in scores { reported[score.leaderboardID] = max(score.value, reported[score.leaderboardID] ?? 0) }
        reportedScores = reported
    }

    public func markReported(achievementIDs: [String]) {
        reportedAchievements = reportedAchievements.union(achievementIDs)
    }
}
