// swift-tools-version: 5.10
import PackageDescription

// The app's logic: models of the game's saves, the bridge to the bundled game, and the view models.
// No UIKit or SwiftUI here, so `swift test` runs it on a Mac without a simulator.
let package = Package(
    name: "MoshiKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "MoshiKit", targets: ["MoshiKit"]),
    ],
    targets: [
        .target(name: "MoshiKit"),
        .testTarget(name: "MoshiKitTests", dependencies: ["MoshiKit"]),
    ]
)
