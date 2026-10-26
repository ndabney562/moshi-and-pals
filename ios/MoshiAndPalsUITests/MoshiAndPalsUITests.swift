import XCTest

/// Runs the app with `-ui-testing`: sample progress and a stand-in for the game, so the native screens can be
/// checked without the web game's timing.
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
    func testStartingAShiftShowsTheGameAndEndingItComesBack() {
        let app = launch()
        let start = app.buttons["startShiftButton"]
        XCTAssertTrue(start.waitForExistence(timeout: 10))
        start.tap()

        let game = app.staticTexts["gameScreen"]
        XCTAssertTrue(game.waitForExistence(timeout: 5))
        XCTAssertEqual(game.label, "Game: shift")

        app.buttons["endShiftButton"].tap()
        XCTAssertTrue(start.waitForExistence(timeout: 5))
    }

    @MainActor
    func testPickingAPalPutsThemOnShift() {
        let app = launch()
        let kaya = app.buttons["palCard-kaya"]
        XCTAssertTrue(kaya.waitForExistence(timeout: 10))
        XCTAssertEqual(kaya.value as? String, "Ready")
        kaya.tap()
        XCTAssertTrue(waitForValue(kaya, "On shift"))
        XCTAssertEqual(app.buttons["palCard-eugene"].value as? String, "Ready")
    }

    @MainActor
    func testHiringAPalAsksFirst() {
        let app = launch()
        let lucien = app.buttons["palCard-lucien"]
        XCTAssertTrue(lucien.waitForExistence(timeout: 10))
        lucien.tap()
        let hire = app.buttons["Hire for 45 NPS"]
        XCTAssertTrue(hire.waitForExistence(timeout: 5))
        hire.tap()
        XCTAssertTrue(waitForValue(lucien, "On shift"), "value is \(String(describing: lucien.value))")
    }

    @MainActor
    func testAchievementsCanBeFiltered() {
        let app = launch()
        app.tabBars.buttons["Progress"].tap()
        let link = app.buttons["achievementsLink"]
        XCTAssertTrue(link.waitForExistence(timeout: 5))
        link.tap()
        XCTAssertTrue(app.staticTexts["Hand Hygiene Compliant"].waitForExistence(timeout: 5))
        app.segmentedControls.buttons["Locked"].tap()
        XCTAssertTrue(app.staticTexts["HRRRNNNKKK"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["Hand Hygiene Compliant"].exists)
    }

    @MainActor
    func testSettingsToggle() {
        let app = launch()
        app.tabBars.buttons["Settings"].tap()
        let sound = app.switches["soundToggle"]
        XCTAssertTrue(sound.waitForExistence(timeout: 5))
        XCTAssertEqual(sound.value as? String, "1")
        // Tap the switch itself (its right edge), not the label
        sound.coordinate(withNormalizedOffset: CGVector(dx: 0.93, dy: 0.5)).tap()
        XCTAssertEqual(sound.value as? String, "0")
    }

    @MainActor
    func testBetweenShiftsOpensTheBoard() {
        let app = launch()
        let board = app.buttons["boardButton"]
        let scrolled = scrollTo(board, in: app)
        XCTAssertTrue(scrolled)
        board.tap()
        let game = app.staticTexts["gameScreen"]
        XCTAssertTrue(game.waitForExistence(timeout: 5))
        XCTAssertEqual(game.label, "Game: board")
    }

    @MainActor
    func testRealBundledGameBootsReceivesStartAndRelaunches() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-web-integration"]
        app.launch()
        let start = app.buttons["startShiftButton"]
        XCTAssertTrue(start.waitForExistence(timeout: 45), "Real web snapshot must populate the native menu")
        start.tap()
        let status = app.staticTexts["realGameStatus"]
        XCTAssertTrue(status.waitForExistence(timeout: 10))
        let playing = NSPredicate(format: "label == %@", "Shift in progress")
        XCTAssertEqual(XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: playing, object: status)], timeout: 30), .completed)
        let web = app.webViews.firstMatch
        XCTAssertTrue(web.waitForExistence(timeout: 10))
        XCTAssertGreaterThan(web.frame.width, web.frame.height, "Native game viewport must finish rotating to landscape")
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
        XCTAssertEqual(layout["portrait"] as? String, "", "Portrait CSS must clear after native rotation")
        XCTAssertGreaterThan(try XCTUnwrap(canvas["width"]), try XCTUnwrap(canvas["height"]))
        XCTAssertLessThanOrEqual(try XCTUnwrap(canvas["bottom"]), viewport[1] + 2)
        XCTAssertLessThanOrEqual(try XCTUnwrap(canvas["right"]), viewport[0] + 2)
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "remaster-native-game"
        attachment.lifetime = .keepAlways
        add(attachment)
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["startShiftButton"].waitForExistence(timeout: 45))
    }

    /// README screenshots (CI runs this with TEST_RUNNER_SCREENSHOTS=1 and commits them to docs/screenshots).
    @MainActor
    func testScreenshots() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["SCREENSHOTS"] == "1", "Only when asked for screenshots")
        for dark in [false, true] {
            let app = launch(dark: dark)
            let mode = dark ? "dark" : "light"
            XCTAssertTrue(app.buttons["startShiftButton"].waitForExistence(timeout: 10))
            snap(app, "play-\(mode)")
            app.tabBars.buttons["Progress"].tap()
            XCTAssertTrue(app.buttons["achievementsLink"].waitForExistence(timeout: 5))
            snap(app, "progress-\(mode)")
            app.buttons["achievementsLink"].tap()
            XCTAssertTrue(app.staticTexts["Hand Hygiene Compliant"].waitForExistence(timeout: 5))
            snap(app, "achievements-\(mode)")
            app.tabBars.buttons["Settings"].tap()
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

    /// Waits for an element's accessibility value (the dialog's dismissal and the store update aren't instant).
    @MainActor
    private func waitForValue(_ element: XCUIElement, _ value: String, timeout: TimeInterval = 5) -> Bool {
        let predicate = NSPredicate(format: "value == %@", value)
        return XCTWaiter().wait(for: [XCTNSPredicateExpectation(predicate: predicate, object: element)], timeout: timeout) == .completed
    }

    /// Swipes up until `element` is on screen (or gives up).
    @MainActor
    private func scrollTo(_ element: XCUIElement, in app: XCUIApplication) -> Bool {
        for _ in 0..<8 where !(element.exists && element.isHittable) {
            app.swipeUp()
        }
        return element.exists && element.isHittable
    }
}
