import XCTest
@testable import MoshiKit

@MainActor
final class PlayViewModelTests: XCTestCase {
    func testPalStatuses() throws {
        let (store, _, _) = makeStore()
        let vm = PlayViewModel(store: store)
        let pals = Dictionary(uniqueKeysWithValues: vm.pals.map { ($0.id, $0) })
        XCTAssertEqual(vm.status(of: try XCTUnwrap(pals["eugene"])), .onShift)
        XCTAssertEqual(vm.status(of: try XCTUnwrap(pals["kaya"])), .available)
        XCTAssertEqual(vm.status(of: try XCTUnwrap(pals["lucien"])), .hireable(price: 45))
        XCTAssertEqual(vm.status(of: try XCTUnwrap(pals["ken"])), .locked(needMore: 10))
    }

    func testChoosingAHiredPalPutsThemOnShift() throws {
        let (store, sink, _) = makeStore()
        store.receive(.ready)
        let vm = PlayViewModel(store: store)
        vm.choose(try XCTUnwrap(store.snapshot.pal(id: "kaya")))
        XCTAssertEqual(vm.selectedPal?.id, "kaya")
        XCTAssertEqual(sink.sent, [.setSettings(SettingsPatch(character: "kaya"))])
    }

    func testHiringAsksFirst() throws {
        let (store, sink, _) = makeStore()
        store.receive(.ready)
        let vm = PlayViewModel(store: store)
        vm.choose(try XCTUnwrap(store.snapshot.pal(id: "ken")))
        XCTAssertNil(vm.pendingHire, "can't afford Ken")
        vm.choose(try XCTUnwrap(store.snapshot.pal(id: "lucien")))
        XCTAssertEqual(vm.pendingHire?.id, "lucien")
        XCTAssertTrue(sink.sent.isEmpty)
        vm.confirmHire()
        XCTAssertNil(vm.pendingHire)
        XCTAssertEqual(sink.sent, [.hire(palID: "lucien"), .setSettings(SettingsPatch(character: "lucien"))])
    }

    func testALockedSavedPalFallsBackToAHiredOne() {
        var snap = GameSnapshot.sample
        snap.settings.character = "ken"
        let (store, _, _) = makeStore(snapshot: snap)
        XCTAssertEqual(PlayViewModel(store: store).selectedPal?.id, "eugene")
    }

    func testDifficulty() {
        let (store, sink, _) = makeStore()
        store.receive(.ready)
        let vm = PlayViewModel(store: store)
        vm.selectedDifficultyID = "nightmare"
        vm.selectedDifficultyID = "urgent"
        XCTAssertTrue(sink.sent.isEmpty, "unknown and unchanged difficulties aren't sent")
        vm.selectedDifficultyID = "trauma"
        XCTAssertEqual(vm.selectedDifficulty?.name, "Trauma Center")
        XCTAssertEqual(sink.sent, [.setSettings(SettingsPatch(difficulty: "trauma"))])
    }

    func testShiftSummaries() {
        let (store, _, _) = makeStore()
        let vm = PlayViewModel(store: store)
        XCTAssertEqual(vm.savedShiftSummary, "Round 4 · Urgent")
        XCTAssertEqual(vm.todaySummary, "New today · +2 CME")

        var snap = GameSnapshot.sample
        snap.savedShift = SavedShift(round: 7, difficulty: "Urgent", daily: true, character: "kaya")
        snap.today.finished = 1
        snap.today.bestScore = 640
        snap.today.bestRound = 6
        store.receive(.snapshot(snap))
        XCTAssertEqual(vm.savedShiftSummary, "Round 7 · Today's Shift")
        XCTAssertEqual(vm.todaySummary, "Today's best: 640 · round 6")

        snap.savedShift = nil
        store.receive(.snapshot(snap))
        XCTAssertNil(vm.savedShiftSummary)
    }

    func testShiftButtons() {
        let (store, sink, _) = makeStore()
        store.receive(.ready)
        let vm = PlayViewModel(store: store)
        vm.continueShift()
        vm.startToday()
        vm.openLocker()
        XCTAssertEqual(sink.sent, [.start(.resume), .start(.daily), .open(.locker)])
        XCTAssertEqual(store.presentedScreen, .locker)
    }
}

@MainActor
final class ProgressViewModelTests: XCTestCase {
    func testAchievementFilters() {
        let (store, _, _) = makeStore()
        let vm = ProgressViewModel(store: store)
        XCTAssertEqual(vm.achievements.count, 4)
        vm.filter = .unlocked
        XCTAssertEqual(vm.achievements.map(\.id), ["firstKill", "perfectPour"])
        vm.filter = .locked
        XCTAssertEqual(vm.achievements.map(\.id), ["honk", "spotless"])
        XCTAssertEqual(vm.completion, 0.5, accuracy: 0.0001)
    }

    func testEmptyProgress() {
        let (store, _, _) = makeStore(snapshot: nil)
        let vm = ProgressViewModel(store: store)
        XCTAssertEqual(vm.completion, 0)
        XCTAssertEqual(vm.atlasUnlockedCount, 0)
    }

    func testAtlas() {
        let (store, _, _) = makeStore()
        let vm = ProgressViewModel(store: store)
        XCTAssertEqual(vm.atlasUnlockedCount, 1)
        XCTAssertEqual(vm.atlas[1].fraction, 12.0 / 25.0, accuracy: 0.0001)
        XCTAssertEqual(vm.atlas[0].fraction, 1)
    }
}

@MainActor
final class SettingsViewModelTests: XCTestCase {
    func testTogglesGoToTheGame() {
        let (store, sink, _) = makeStore()
        store.receive(.ready)
        let vm = SettingsViewModel(store: store)
        vm.sound = false
        vm.autoAim = false
        vm.reducedMotion = true
        XCTAssertFalse(vm.sound)
        XCTAssertEqual(sink.sent, [
            .setSettings(SettingsPatch(sound: false)),
            .setSettings(SettingsPatch(autoAim: false)),
            .setSettings(SettingsPatch(reducedMotion: true)),
        ])
    }

    func testHapticsStayInTheApp() {
        let (store, sink, _) = makeStore()
        store.receive(.ready)
        let vm = SettingsViewModel(store: store)
        vm.haptics = false
        XCTAssertFalse(store.hapticsEnabled)
        XCTAssertTrue(sink.sent.isEmpty)
    }

    func testVersion() {
        let (store, _, _) = makeStore(snapshot: nil)
        XCTAssertEqual(SettingsViewModel(store: store).gameVersion, "Loading…")
        store.receive(.snapshot(.sample))
        XCTAssertEqual(SettingsViewModel(store: store).gameVersion, "v0.32.0 (sample)")
    }
}
