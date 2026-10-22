import Foundation

/// Everything the native screens show, as the bundled game reports it (`snapshot()` in src/core/native.ts).
/// Decoding is forgiving: a missing field falls back to an empty value, so an older or newer game build
/// never leaves the app without a menu.
public struct GameSnapshot: Codable, Equatable, Sendable {
    public var version: String
    public var settings: GameSettings
    public var pals: [Pal]
    public var difficulties: [Difficulty]
    public var totals: Totals
    public var progress: ProgressSummary
    public var achievements: [Achievement]
    public var atlas: [AtlasEntry]
    public var today: TodaysShift
    public var savedShift: SavedShift?
    /// PNG data URLs keyed by texture name (`eugene-held`, `germ-basic`). Sent once per launch of the game.
    public var art: [String: String]

    public init(
        version: String = "",
        settings: GameSettings = GameSettings(),
        pals: [Pal] = [],
        difficulties: [Difficulty] = [],
        totals: Totals = Totals(),
        progress: ProgressSummary = ProgressSummary(),
        achievements: [Achievement] = [],
        atlas: [AtlasEntry] = [],
        today: TodaysShift = TodaysShift(),
        savedShift: SavedShift? = nil,
        art: [String: String] = [:]
    ) {
        self.version = version
        self.settings = settings
        self.pals = pals
        self.difficulties = difficulties
        self.totals = totals
        self.progress = progress
        self.achievements = achievements
        self.atlas = atlas
        self.today = today
        self.savedShift = savedShift
        self.art = art
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        version = try c.decodeIfPresent(String.self, forKey: .version) ?? ""
        settings = try c.decodeIfPresent(GameSettings.self, forKey: .settings) ?? GameSettings()
        pals = try c.decodeIfPresent([Pal].self, forKey: .pals) ?? []
        difficulties = try c.decodeIfPresent([Difficulty].self, forKey: .difficulties) ?? []
        totals = try c.decodeIfPresent(Totals.self, forKey: .totals) ?? Totals()
        progress = try c.decodeIfPresent(ProgressSummary.self, forKey: .progress) ?? ProgressSummary()
        achievements = try c.decodeIfPresent([Achievement].self, forKey: .achievements) ?? []
        atlas = try c.decodeIfPresent([AtlasEntry].self, forKey: .atlas) ?? []
        today = try c.decodeIfPresent(TodaysShift.self, forKey: .today) ?? TodaysShift()
        savedShift = try c.decodeIfPresent(SavedShift.self, forKey: .savedShift)
        art = try c.decodeIfPresent([String: String].self, forKey: .art) ?? [:]
    }

    public func pal(id: String) -> Pal? { pals.first { $0.id == id } }
    public func difficulty(id: String) -> Difficulty? { difficulties.first { $0.id == id } }

    /// The PNG bytes of a texture the game sent, if any.
    public func artData(_ key: String) -> Data? {
        guard let url = art[key], let comma = url.firstIndex(of: ",") else { return nil }
        return Data(base64Encoded: String(url[url.index(after: comma)...]))
    }
}

public struct GameSettings: Codable, Equatable, Sendable {
    public var autoAim: Bool
    public var sound: Bool
    public var music: Bool
    public var autoRefill: Bool
    public var reducedMotion: Bool
    /// The Pal on shift (`eugene`, `kaya`, `lucien`, `ken`).
    public var character: String
    /// `walkIn`, `urgent` or `trauma`.
    public var difficulty: String

    public init(autoAim: Bool = true, sound: Bool = true, music: Bool = true, autoRefill: Bool = true,
                reducedMotion: Bool = false, character: String = "eugene", difficulty: String = "urgent") {
        self.autoAim = autoAim
        self.sound = sound
        self.music = music
        self.autoRefill = autoRefill
        self.reducedMotion = reducedMotion
        self.character = character
        self.difficulty = difficulty
    }
}

public struct Pal: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var short: String
    public var blurb: String
    /// NPS Scores to hire them (0 = always on shift).
    public var price: Int
    public var unlocked: Bool

    public init(id: String, name: String, short: String, blurb: String, price: Int, unlocked: Bool) {
        self.id = id
        self.name = name
        self.short = short
        self.blurb = blurb
        self.price = price
        self.unlocked = unlocked
    }

    /// The game's texture for their portrait.
    public var artKey: String { "\(id)-held" }
}

/// A difficulty and this device's records on it.
public struct Difficulty: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var blurb: String
    public var bestScore: Int
    public var bestRound: Int
    public var bestStreak: Int

    public init(id: String, name: String, blurb: String, bestScore: Int = 0, bestRound: Int = 0, bestStreak: Int = 0) {
        self.id = id
        self.name = name
        self.blurb = blurb
        self.bestScore = bestScore
        self.bestRound = bestRound
        self.bestStreak = bestStreak
    }

    public var hasPlayed: Bool { bestRound > 0 || bestScore > 0 }
}

public struct Totals: Codable, Equatable, Sendable {
    public var runs: Int
    public var totalKills: Int

    public init(runs: Int = 0, totalKills: Int = 0) {
        self.runs = runs
        self.totalKills = totalKills
    }
}

/// Between-shift currencies: CME Credits (Residency Board), NPS Scores (hiring Pals), banked Copays (Locker).
public struct ProgressSummary: Codable, Equatable, Sendable {
    public var credits: Int
    public var nps: Int
    public var bank: Int

    public init(credits: Int = 0, nps: Int = 0, bank: Int = 0) {
        self.credits = credits
        self.nps = nps
        self.bank = bank
    }
}

public struct Achievement: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var how: String
    public var unlocked: Bool

    public init(id: String, name: String, how: String, unlocked: Bool) {
        self.id = id
        self.name = name
        self.how = how
        self.unlocked = unlocked
    }
}

/// A Microbiology Atlas page: unlocked after enough kills of that germ.
public struct AtlasEntry: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var note: String
    public var kills: Int
    public var need: Int
    public var unlocked: Bool

    public init(id: String, name: String, note: String, kills: Int, need: Int, unlocked: Bool) {
        self.id = id
        self.name = name
        self.note = note
        self.kills = kills
        self.need = need
        self.unlocked = unlocked
    }

    public var artKey: String { "germ-\(id)" }
    /// 0...1 toward unlocking.
    public var fraction: Double { need > 0 ? min(1, Double(kills) / Double(need)) : 1 }
}

public struct Modifier: Codable, Equatable, Identifiable, Sendable {
    public var id: String
    public var name: String
    public var icon: String
    public var blurb: String

    public init(id: String, name: String, icon: String, blurb: String) {
        self.id = id
        self.name = name
        self.icon = icon
        self.blurb = blurb
    }
}

/// Today's Shift: the daily challenge, the same two modifiers for everyone on a date.
public struct TodaysShift: Codable, Equatable, Sendable {
    public var date: String
    public var mods: [Modifier]
    public var bestScore: Int
    public var bestRound: Int
    public var finished: Int
    public var firstFinishCme: Int

    public init(date: String = "", mods: [Modifier] = [], bestScore: Int = 0, bestRound: Int = 0, finished: Int = 0, firstFinishCme: Int = 0) {
        self.date = date
        self.mods = mods
        self.bestScore = bestScore
        self.bestRound = bestRound
        self.finished = finished
        self.firstFinishCme = firstFinishCme
    }
}

/// A shift kept with SAVE & QUIT.
public struct SavedShift: Codable, Equatable, Sendable {
    public var round: Int
    /// The difficulty's display name.
    public var difficulty: String
    public var daily: Bool
    public var character: String

    public init(round: Int, difficulty: String, daily: Bool, character: String) {
        self.round = round
        self.difficulty = difficulty
        self.daily = daily
        self.character = character
    }
}
