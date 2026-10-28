import XCTest
@testable import MoshiKit

final class BridgeMessageTests: XCTestCase {
    private func decode(_ json: String) throws -> BridgeMessage {
        try BridgeMessage.decode(Data(json.utf8))
    }

    func testSimpleMessages() throws {
        XCTAssertEqual(try decode(#"{"type":"ready"}"#), .ready)
        XCTAssertEqual(try decode(#"{"type":"playing"}"#), .playing)
        XCTAssertEqual(try decode(#"{"type":"exit"}"#), .exit)
        XCTAssertEqual(try decode(#"{"type":"haptic","kind":"purge"}"#), .haptic(.purge))
    }

    func testUnknownTypesAndKindsAreIgnoredNotFatal() throws {
        XCTAssertEqual(try decode(#"{"type":"confetti"}"#), .unknown("confetti"))
        XCTAssertEqual(try decode(#"{"type":"haptic","kind":"earthquake"}"#), .unknown("haptic"))
    }

    func testMalformedJSONThrows() {
        XCTAssertThrowsError(try decode(#"{"kind":"purge"}"#))
        XCTAssertThrowsError(try decode("not json"))
    }

    func testSnapshotAsTheGameSendsIt() throws {
        let json = """
        {"type":"snapshot","version":"v0.31.0 (abc1234)",
         "settings":{"autoAim":false,"sound":true,"music":false,"autoRefill":true,"reducedMotion":false,"character":"kaya","difficulty":"trauma"},
         "pals":[{"id":"eugene","name":"Eugene","short":"EUGENE","blurb":"Honk","price":0,"unlocked":true}],
         "difficulties":[{"id":"urgent","name":"Urgent","blurb":"As intended","bestScore":1200,"bestRound":11,"bestStreak":40}],
         "totals":{"runs":3,"totalKills":250},
         "progress":{"credits":4,"nps":12,"bank":300},
         "achievements":[{"id":"firstKill","name":"Hand Hygiene Compliant","how":"Disinfect a germ","unlocked":true}],
         "atlas":[{"id":"basic","name":"Basic Germ","note":"Round.","kills":30,"need":25,"unlocked":true}],
         "today":{"date":"2026-10-21","mods":[{"id":"fullMoon","name":"Full Moon","icon":"🌕","blurb":"Weird."}],"bestScore":0,"bestRound":0,"finished":0,"firstFinishCme":2},
         "savedShift":null,
         "art":{"eugene-held":"data:image/png;base64,iVBORw0KGgo="}}
        """
        guard case .snapshot(let snap) = try decode(json) else { return XCTFail("expected a snapshot") }
        XCTAssertEqual(snap.version, "v0.31.0 (abc1234)")
        XCTAssertEqual(snap.settings.character, "kaya")
        XCTAssertFalse(snap.settings.autoAim)
        XCTAssertEqual(snap.difficulty(id: "urgent")?.bestRound, 11)
        XCTAssertEqual(snap.totals.totalKills, 250)
        XCTAssertEqual(snap.today.mods.first?.icon, "🌕")
        XCTAssertNil(snap.savedShift)
        XCTAssertEqual(snap.artData("eugene-held"), Data([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        XCTAssertNil(snap.artData("germ-basic"))
    }

    func testSnapshotWithMissingFieldsFallsBackToEmpty() throws {
        guard case .snapshot(let snap) = try decode(#"{"type":"snapshot"}"#) else { return XCTFail("expected a snapshot") }
        XCTAssertEqual(snap, GameSnapshot())
    }

    func testDecodesWebKitMessageBodies() throws {
        let body: [String: Any] = ["type": "haptic", "kind": "hit"]
        XCTAssertEqual(try BridgeMessage.decode(body: body), .haptic(.hit))
        XCTAssertThrowsError(try BridgeMessage.decode(body: "ready"))
        XCTAssertThrowsError(try BridgeMessage.decode(body: [1, 2]))
    }
}

final class BridgeCommandTests: XCTestCase {
    func testJavaScriptForEachCommand() {
        XCTAssertEqual(BridgeCommand.start(.daily).javaScript, #"window.moshiNative && window.moshiNative.start({"kind":"daily"});"#)
        XCTAssertEqual(BridgeCommand.open(.board).javaScript, #"window.moshiNative && window.moshiNative.open("board");"#)
        XCTAssertEqual(BridgeCommand.open(.providers).javaScript, #"window.moshiNative && window.moshiNative.open("providers");"#)
        XCTAssertEqual(BridgeCommand.hire(palID: "ken").javaScript, #"window.moshiNative && window.moshiNative.hire("ken");"#)
        XCTAssertEqual(BridgeCommand.refresh.javaScript, "window.moshiNative && window.moshiNative.refresh();")
    }

    func testSettingsSendOnlyWhatChanged() {
        let js = BridgeCommand.setSettings(SettingsPatch(sound: false, difficulty: "walkIn")).javaScript
        XCTAssertEqual(js, #"window.moshiNative && window.moshiNative.setSettings({"difficulty":"walkIn","sound":false});"#)
    }

    func testArgumentsCannotBreakOutOfTheCall() {
        let js = BridgeCommand.hire(palID: #"x"); alert(1); ("#).javaScript
        XCTAssertEqual(js, #"window.moshiNative && window.moshiNative.hire("x\"); alert(1); (");"#)
    }

    func testNavigationCommands() {
        XCTAssertTrue(BridgeCommand.start(.normal).isNavigation)
        XCTAssertTrue(BridgeCommand.open(.locker).isNavigation)
        XCTAssertFalse(BridgeCommand.refresh.isNavigation)
        XCTAssertFalse(BridgeCommand.hire(palID: "kaya").isNavigation)
    }

    func testPatchAppliesOnlySetFields() {
        let patched = SettingsPatch(music: false, character: "ken").applied(to: GameSettings())
        XCTAssertFalse(patched.music)
        XCTAssertEqual(patched.character, "ken")
        XCTAssertTrue(patched.sound)
        XCTAssertEqual(patched.difficulty, "urgent")
    }
}

final class HapticTests: XCTestCase {
    func testThrottleDropsRepeatsOfTheSameKind() {
        var throttle = HapticThrottle()
        XCTAssertTrue(throttle.allow(.hit, at: 10))
        XCTAssertFalse(throttle.allow(.hit, at: 10.05))
        XCTAssertTrue(throttle.allow(.purge, at: 10.05), "other kinds aren't held back")
        XCTAssertTrue(throttle.allow(.hit, at: 10.2))
    }

    func testStyles() {
        XCTAssertEqual(HapticKind.death.style, .notification(.error))
        XCTAssertEqual(HapticKind.purge.style, .impact(.heavy))
        XCTAssertEqual(HapticKind.achievement.style, .notification(.success))
    }
}
