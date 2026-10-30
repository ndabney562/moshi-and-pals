import XCTest
@testable import MoshiKit

@MainActor
final class RecordingSink: GameCommandSending {
    var sent: [BridgeCommand] = []
    func send(_ command: BridgeCommand) { sent.append(command) }
}

final class RecordingHaptics: HapticPlaying {
    var played: [HapticStyle] = []
    func play(_ style: HapticStyle) { played.append(style) }
}

@MainActor
func makeStore(
    snapshot: GameSnapshot? = .sample,
    haptics: RecordingHaptics? = nil,
    now: @escaping () -> TimeInterval = { 0 }
) -> (GameStore, RecordingSink, MemorySnapshotCache) {
    let cache = MemorySnapshotCache(snapshot)
    let defaults = UserDefaults(suiteName: "MoshiKitTests-\(UUID().uuidString)") ?? .standard
    let store = GameStore(cache: cache, preferences: AppPreferences(defaults: defaults), haptics: haptics, clock: now)
    let sink = RecordingSink()
    store.attach(sink)
    return (store, sink, cache)
}

@MainActor
final class GameStoreTests: XCTestCase {
    func testPlayingOnlyFollowsTheRealGameMessageAndClearsOnReset() {
        let (store, _, _) = makeStore()
        store.receive(.ready)
        XCTAssertFalse(store.isShiftRunning)
        store.receive(.playing)
        XCTAssertTrue(store.isShiftRunning)
        store.receive(.exit)
        XCTAssertFalse(store.isShiftRunning)
        store.receive(.playing)
        store.gameDidReset()
        XCTAssertFalse(store.isShiftRunning)
    }

    func testStartsFromTheCachedSnapshot() {
        let (store, _, _) = makeStore()
        XCTAssertTrue(store.hasContent)
        XCTAssertEqual(store.snapshot.pals.count, 4)
        let (empty, _, _) = makeStore(snapshot: nil)
        XCTAssertFalse(empty.hasContent)
    }

    func testCommandsWaitForTheGame() {
        let (store, sink, _) = makeStore()
        store.update(SettingsPatch(sound: false))
        store.update(SettingsPatch(music: false))
        XCTAssertTrue(sink.sent.isEmpty)
        store.receive(.ready)
        XCTAssertEqual(sink.sent, [.setSettings(SettingsPatch(sound: false)), .setSettings(SettingsPatch(music: false))])
        store.refreshAfterReady()
        XCTAssertEqual(sink.sent.last, .refresh, "once ready, commands go straight through")
    }

    func testSnapshotsAreCached() {
        let (store, _, cache) = makeStore(snapshot: nil)
        var next = GameSnapshot.sample
        next.totals.runs = 99
        store.receive(.snapshot(next))
        XCTAssertEqual(store.snapshot.totals.runs, 99)
        XCTAssertEqual(cache.stored?.totals.runs, 99)
    }

    func testTheGameAsksForTheSettingsSheetAndGameCenter() {
        let (store, _, _) = makeStore()
        var gameCenterOpened = 0
        store.onOpenGameCenter = { gameCenterOpened += 1 }
        store.receive(.ready)
        XCTAssertFalse(store.isSettingsPresented)
        store.receive(.openSettings)
        XCTAssertTrue(store.isSettingsPresented)
        store.receive(.openGameCenter)
        XCTAssertEqual(gameCenterOpened, 1)
        store.receive(.playing)
        store.gameDidReset()
        XCTAssertFalse(store.isSettingsPresented, "a reloaded game comes back to its title with no sheet over it")
        XCTAssertFalse(store.isGameReady)
    }

    func testGameCenterRequestsWithNoHandlerAreHarmless() {
        let (store, _, _) = makeStore()
        store.receive(.openGameCenter)
        XCTAssertFalse(store.isSettingsPresented)
    }

    func testHapticsRespectTheSwitchAndTheThrottle() {
        let haptics = RecordingHaptics()
        var time: TimeInterval = 0
        let (store, _, _) = makeStore(haptics: haptics, now: { time })
        store.receive(.haptic(.hit))
        store.receive(.haptic(.hit))
        XCTAssertEqual(haptics.played, [.impact(.medium)])
        time = 1
        store.hapticsEnabled = false
        store.receive(.haptic(.death))
        store.selectionFeedback()
        XCTAssertEqual(haptics.played.count, 1)
    }

    func testSettingsUpdateRightAway() {
        let (store, _, _) = makeStore()
        store.update(SettingsPatch(music: false))
        XCTAssertFalse(store.snapshot.settings.music)
    }

    func testHapticsPreferenceIsSaved() {
        let defaults = UserDefaults(suiteName: "MoshiKitTests-\(UUID().uuidString)") ?? .standard
        let store = GameStore(cache: MemorySnapshotCache(), preferences: AppPreferences(defaults: defaults))
        XCTAssertTrue(store.hapticsEnabled)
        store.hapticsEnabled = false
        XCTAssertFalse(AppPreferences(defaults: defaults).hapticsEnabled)
    }

    func testFileCacheRoundTrips() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("moshi-\(UUID().uuidString)/snapshot.json")
        let cache = FileSnapshotCache(url: url)
        XCTAssertNil(cache.load())
        cache.save(.sample)
        XCTAssertEqual(cache.load(), .sample)
        try? FileManager.default.removeItem(at: url.deletingLastPathComponent())
    }
}

private extension GameStore {
    func refreshAfterReady() { send(.refresh) }
}
