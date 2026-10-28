import Foundation

public extension GameSnapshot {
    /// A believable snapshot for SwiftUI previews, UI tests and unit tests (the game itself is not running).
    static let sample = GameSnapshot(
        version: "v0.32.0 (sample)",
        settings: GameSettings(character: "eugene", difficulty: "urgent"),
        pals: [
            Pal(id: "eugene", name: "Eugene", short: "EUGENE", blurb: "SINUS PURGE: a honk that blasts germs away", price: 0, unlocked: true),
            Pal(id: "kaya", name: "Kaya", short: "KAYA", blurb: "CODE BLUE: a sprint that bowls germs over", price: 30, unlocked: true),
            Pal(id: "lucien", name: "Lucien", short: "LUCIEN", blurb: "CLEAN FIELD: a sterile zone that slows and burns germs", price: 45, unlocked: false),
            Pal(id: "ken", name: "Ken", short: "KEN", blurb: "FILE A GRIEVANCE: sends Diamond to HR", price: 60, unlocked: false),
        ],
        difficulties: [
            Difficulty(id: "walkIn", name: "Walk-In", blurb: "Softer germs, gentler bumps, better Copays", bestScore: 420, bestRound: 6, bestStreak: 18),
            Difficulty(id: "urgent", name: "Urgent", blurb: "The shift as intended", bestScore: 980, bestRound: 9, bestStreak: 31),
            Difficulty(id: "trauma", name: "Trauma Center", blurb: "Tougher germs that hit harder and keep coming"),
        ],
        totals: Totals(runs: 23, totalKills: 1_874),
        progress: ProgressSummary(credits: 12, nps: 50, bank: 640),
        achievements: [
            Achievement(id: "firstKill", name: "Hand Hygiene Compliant", how: "Disinfect your first germ", unlocked: true),
            Achievement(id: "perfectPour", name: "Steady Hands", how: "Land a Perfect Pour", unlocked: true),
            Achievement(id: "honk", name: "HRRRNNNKKK", how: "Hit 5 germs with one Sinus Purge", unlocked: false),
            Achievement(id: "spotless", name: "Spotless Record", how: "Finish a round without getting hurt", unlocked: false),
        ],
        atlas: [
            AtlasEntry(id: "basic", name: "Basic Germ", note: "Coccus vulgaris. Round, cheerful, everywhere.", kills: 310, need: 25, unlocked: true),
            AtlasEntry(id: "sprinter", name: "Viral Sprinter", note: "A virus with somewhere to be.", kills: 12, need: 25, unlocked: false),
            AtlasEntry(id: "diamond", name: "Diamond", note: "Practice Manager. Leads with policy.", kills: 0, need: 1, unlocked: false),
        ],
        today: TodaysShift(
            date: "2026-10-21",
            mods: [
                Modifier(id: "fluSeason", name: "Flu Season", icon: "🤧", blurb: "Viral Sprinters come in twice as often, from round 1"),
                Modifier(id: "fullMoon", name: "Full Moon", icon: "🌕", blurb: "Everything is weird tonight. Nobody can explain it."),
            ],
            firstFinishCme: 2
        ),
        savedShift: SavedShift(round: 4, difficulty: "Urgent", daily: false, character: "eugene")
    )
}
