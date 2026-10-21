import Foundation
import Observation

public enum AchievementFilter: String, CaseIterable, Identifiable, Sendable {
    case all = "All"
    case unlocked = "Unlocked"
    case locked = "Locked"

    public var id: String { rawValue }
}

/// The Progress tab: records per difficulty, lifetime totals, achievements and the Microbiology Atlas.
@MainActor
@Observable
public final class ProgressViewModel {
    public let store: GameStore
    public var filter: AchievementFilter = .all

    public init(store: GameStore) {
        self.store = store
    }

    private var snapshot: GameSnapshot { store.snapshot }

    public var records: [Difficulty] { snapshot.difficulties }
    public var totals: Totals { snapshot.totals }
    public var currencies: ProgressSummary { snapshot.progress }

    public var achievements: [Achievement] {
        switch filter {
        case .all: return snapshot.achievements
        case .unlocked: return snapshot.achievements.filter(\.unlocked)
        case .locked: return snapshot.achievements.filter { !$0.unlocked }
        }
    }

    public var unlockedCount: Int { snapshot.achievements.filter(\.unlocked).count }
    public var achievementCount: Int { snapshot.achievements.count }

    /// 0...1 of achievements unlocked.
    public var completion: Double {
        achievementCount == 0 ? 0 : Double(unlockedCount) / Double(achievementCount)
    }

    public var atlas: [AtlasEntry] { snapshot.atlas }
    public var atlasUnlockedCount: Int { snapshot.atlas.filter(\.unlocked).count }
}
