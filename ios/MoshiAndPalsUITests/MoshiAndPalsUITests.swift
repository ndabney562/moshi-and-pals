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
        XCTAssertEqual(kaya.value as? String, "On shift")
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
        XCTAssertEqual(lucien.value as? String, "On shift")
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

    /// Swipes up until `element` is on screen (or gives up).
    @MainActor
    private func scrollTo(_ element: XCUIElement, in app: XCUIApplication) -> Bool {
        for _ in 0..<8 where !(element.exists && element.isHittable) {
            app.swipeUp()
        }
        return element.exists && element.isHittable
    }
}
