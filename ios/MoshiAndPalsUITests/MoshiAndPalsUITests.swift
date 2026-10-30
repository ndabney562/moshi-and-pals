import XCTest

/// `-ui-testing` runs the app with a stand-in for the web page (buttons that send the messages its title screen
/// would), so the native pieces can be checked without the web game's timing. `-web-integration` runs the real
/// bundled game and checks its title screen comes up with every menu, starts a shift and survives a relaunch.
final class MoshiAndPalsUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    private func launch(dark: Bool = false) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-ui-testing"] + (dark ? ["-ui-dark"] : [])
        app.launch()
        return app
    }

    @MainActor
    func testTheGearOpensSettingsAndDoneClosesThem() {
        let app = launch()
        let gear = app.buttons["webSettingsGear"]
        XCTAssertTrue(gear.waitForExistence(timeout: 10))
        gear.tap()
        let sound = app.switches["soundToggle"]
        XCTAssertTrue(sound.waitForExistence(timeout: 5))
        XCTAssertEqual(sound.value as? String, "1")
        // Tap the switch itself (its right edge), not the label
        sound.coordinate(withNormalizedOffset: CGVector(dx: 0.93, dy: 0.5)).tap()
        XCTAssertEqual(sound.value as? String, "0")
        // (The Haptics section is below the fold of a landscape sheet, so the list hasn't built it yet.)
        app.buttons["settingsDoneButton"].tap()
        XCTAssertTrue(waitForDisappearance(sound))
        XCTAssertTrue(gear.isHittable, "the game is back in front")
    }

    @MainActor
    func testShiftsStartAndEndInTheGame() {
        let app = launch()
        let screen = app.staticTexts["gameScreen"]
        XCTAssertTrue(screen.waitForExistence(timeout: 10))
        XCTAssertEqual(screen.label, "Game: title")
        app.buttons["webStartShift"].tap()
        XCTAssertTrue(app.buttons["webEndShift"].waitForExistence(timeout: 5))
        XCTAssertEqual(screen.label, "Game: shift")
        app.buttons["webEndShift"].tap()
        XCTAssertTrue(app.buttons["webStartShift"].waitForExistence(timeout: 5))
        XCTAssertEqual(screen.label, "Game: title")
    }

    @MainActor
    func testTheLeaderboardTabLeavesTheGameInFront() {
        // Tests never sign in to Game Center; the request must be harmless without it
        let app = launch()
        let tab = app.buttons["webLeaderboardTab"]
        XCTAssertTrue(tab.waitForExistence(timeout: 10))
        tab.tap()
        XCTAssertTrue(app.staticTexts["gameScreen"].isHittable)
        XCTAssertFalse(app.switches["soundToggle"].exists)
    }

    @MainActor
    func testRealBundledGameBootsToItsTitleStartsAShiftAndRelaunches() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-web-integration"]
        app.launch()
        // CI's macOS runner needs ~40 s just to launch the app, then the web game boots
        let status = app.staticTexts["realGameStatus"]
        XCTAssertTrue(status.waitForExistence(timeout: 90))
        XCTAssertTrue(waitForLabel(status, "Web game ready", timeout: 90), "The real game must boot to its title screen and report ready")

        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(web.frame.width, web.frame.height, "The app is landscape from the start")

        // Every title-screen feature is on the web title the app shows
        let title = app.staticTexts["webTitleDiagnostic"]
        XCTAssertTrue(title.waitForExistence(timeout: 10))
        let texts = try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(title.label.data(using: .utf8))) as? [String])
        for feature in ["START SHIFT", "TODAY'S SHIFT", "PROVIDERS", "LOCKER", "BOARD", "ATLAS", "LEADERBOARD", "⚙️", "▾"] {
            XCTAssertTrue(texts.contains { $0.contains(feature) }, "\(feature) missing from the title screen: \(texts)")
        }

        // Tap START SHIFT where the page says the pill is. CI's starved runner can lose a synthesized touch before
        // the web content process sees it, so tap again until the page has counted one; then the fade-out and
        // GameScene boot get up to 90 s there.
        let input = app.staticTexts["webInputDiagnostic"]
        XCTAssertTrue(waitForValue(input, timeout: 30) { Self.inputReport($0)?.startShiftOffset != nil },
                      "The title must report where START SHIFT is: \(input.exists ? input.label : "no diagnostic")")
        var report = try XCTUnwrap(Self.inputReport(input.label))
        var taps = 0
        while report.touches == 0 && taps < 5 {
            web.coordinate(withNormalizedOffset: try XCTUnwrap(report.startShiftOffset)).press(forDuration: 0.1)
            taps += 1
            _ = waitForValue(input, timeout: 10) { (Self.inputReport($0)?.touches ?? 0) > 0 }
            report = try XCTUnwrap(Self.inputReport(input.label))
        }
        XCTAssertGreaterThan(report.touches, 0, "The page saw no touch after \(taps) taps at \(String(describing: report.startShift))")
        XCTAssertTrue(waitForLabel(status, "Shift in progress", timeout: 90),
                      "A tap on START SHIFT must start a shift (\(taps) taps, the page saw \(report.touches); status: \(status.label))")

        let diagnostic = app.staticTexts["webLayoutDiagnostic"]
        XCTAssertTrue(diagnostic.waitForExistence(timeout: 10))
        let geometry = XCTAttachment(string: diagnostic.label)
        geometry.name = "web-layout-geometry"
        geometry.lifetime = .keepAlways
        add(geometry)
        let data = try XCTUnwrap(diagnostic.label.data(using: .utf8))
        let layout = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let canvas = try XCTUnwrap(layout["canvas"] as? [String: Double])
        let viewport = try XCTUnwrap(layout["inner"] as? [Double])
        XCTAssertEqual(layout["portrait"] as? String, "", "The page is landscape, no portrait CSS")
        XCTAssertGreaterThan(try XCTUnwrap(canvas["width"]), try XCTUnwrap(canvas["height"]))
        XCTAssertLessThanOrEqual(try XCTUnwrap(canvas["bottom"]), viewport[1] + 2)
        XCTAssertLessThanOrEqual(try XCTUnwrap(canvas["right"]), viewport[0] + 2)
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "native-game"
        attachment.lifetime = .keepAlways
        add(attachment)
        app.terminate()
        app.launch()
        XCTAssertTrue(status.waitForExistence(timeout: 90))
        XCTAssertTrue(waitForLabel(status, "Web game ready", timeout: 90))
    }

    /// README screenshots (CI runs this with TEST_RUNNER_SCREENSHOTS=1 and commits them to docs/screenshots).
    @MainActor
    func testScreenshots() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["SCREENSHOTS"] == "1", "Only when asked for screenshots")
        for dark in [false, true] {
            let app = launch(dark: dark)
            let mode = dark ? "dark" : "light"
            XCTAssertTrue(app.buttons["webSettingsGear"].waitForExistence(timeout: 10))
            app.buttons["webSettingsGear"].tap()
            XCTAssertTrue(app.switches["soundToggle"].waitForExistence(timeout: 5))
            snap(app, "settings-\(mode)")
            app.terminate()
        }
    }

    @MainActor
    private func snap(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    /// What the real game reports through `webInputDiagnostic` (WebGameHost, `-web-integration` builds).
    private struct InputReport: Decodable {
        let touches: Int
        let startShift: [Double]?
        var startShiftOffset: CGVector? {
            guard let startShift, startShift.count == 2 else { return nil }
            return CGVector(dx: startShift[0], dy: startShift[1])
        }
    }

    private static func inputReport(_ label: String) -> InputReport? {
        label.data(using: .utf8).flatMap { try? JSONDecoder().decode(InputReport.self, from: $0) }
    }

    /// Polls an element's label until `condition` holds (the game's diagnostics refresh about once a second).
    @MainActor
    private func waitForValue(_ element: XCUIElement, timeout: TimeInterval, _ condition: (String) -> Bool) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while true {
            if element.exists, condition(element.label) { return true }
            if Date() >= deadline { return false }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
    }

    /// Waits for an element's label (the game's messages aren't instant).
    @MainActor
    private func waitForLabel(_ element: XCUIElement, _ label: String, timeout: TimeInterval = 5) -> Bool {
        let predicate = NSPredicate(format: "label == %@", label)
        return XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: predicate, object: element)], timeout: timeout) == .completed
    }

    @MainActor
    private func waitForDisappearance(_ element: XCUIElement, timeout: TimeInterval = 5) -> Bool {
        let predicate = NSPredicate(format: "exists == false")
        return XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: predicate, object: element)], timeout: timeout) == .completed
    }
}
