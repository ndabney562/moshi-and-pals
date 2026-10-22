import Foundation
import Observation

/// Where a Pal stands on the shift picker.
public enum PalStatus: Equatable, Sendable {
    case onShift
    case available
    /// Not hired yet, and there are enough NPS Scores to hire them.
    case hireable(price: Int)
    /// Not hired yet, and this many more NPS Scores are needed.
    case locked(needMore: Int)
}

/// The Play tab: who's on shift, the difficulty, and the ways into a shift.
@MainActor
@Observable
public final class PlayViewModel {
    public let store: GameStore
    /// A Pal waiting for the player to confirm hiring them.
    public var pendingHire: Pal?

    public init(store: GameStore) {
        self.store = store
    }

    private var snapshot: GameSnapshot { store.snapshot }

    // MARK: Pals

    public var pals: [Pal] { snapshot.pals }
    public var nps: Int { snapshot.progress.nps }

    /// The Pal on shift (Dr. Moshkovich if the saved one isn't hired).
    public var selectedPal: Pal? {
        if let pal = snapshot.pal(id: snapshot.settings.character), pal.unlocked { return pal }
        return pals.first { $0.unlocked } ?? pals.first
    }

    public func status(of pal: Pal) -> PalStatus {
        if pal.unlocked { return pal.id == selectedPal?.id ? .onShift : .available }
        return nps >= pal.price ? .hireable(price: pal.price) : .locked(needMore: pal.price - nps)
    }

    /// Tapping a Pal: puts a hired one on shift, or asks to hire one the player can afford.
    public func choose(_ pal: Pal) {
        switch status(of: pal) {
        case .available:
            store.update(SettingsPatch(character: pal.id))
            store.selectionFeedback()
        case .hireable:
            pendingHire = pal
        case .onShift, .locked:
            break
        }
    }

    /// Hires the Pal waiting for confirmation and puts them on shift.
    public func confirmHire() {
        guard let pal = pendingHire else { return }
        pendingHire = nil
        store.hire(pal.id)
        store.update(SettingsPatch(character: pal.id))
    }

    // MARK: Difficulty

    public var difficulties: [Difficulty] { snapshot.difficulties }

    public var selectedDifficultyID: String {
        get { snapshot.settings.difficulty }
        set {
            guard newValue != snapshot.settings.difficulty, snapshot.difficulty(id: newValue) != nil else { return }
            store.update(SettingsPatch(difficulty: newValue))
            store.selectionFeedback()
        }
    }

    public var selectedDifficulty: Difficulty? { snapshot.difficulty(id: snapshot.settings.difficulty) }

    // MARK: Shifts

    /// "Round 4 · Urgent" for the shift kept with SAVE & QUIT, or nil if there isn't one.
    public var savedShiftSummary: String? {
        guard let saved = snapshot.savedShift else { return nil }
        return "Round \(saved.round) · \(saved.daily ? "Today's Shift" : saved.difficulty)"
    }

    public var today: TodaysShift { snapshot.today }

    /// Today's best, or what the first finished Today's Shift earns.
    public var todaySummary: String {
        if today.finished > 0 { return "Today's best: \(today.bestScore.formatted()) · round \(today.bestRound)" }
        return today.firstFinishCme > 0 ? "New today · +\(today.firstFinishCme) CME" : "New today"
    }

    public var credits: Int { snapshot.progress.credits }
    public var bank: Int { snapshot.progress.bank }

    public func startShift() { store.startShift(.normal) }
    public func startToday() { store.startShift(.daily) }
    public func continueShift() { store.startShift(.resume) }
    public func openBoard() { store.open(.board) }
    public func openLocker() { store.open(.locker) }
}
