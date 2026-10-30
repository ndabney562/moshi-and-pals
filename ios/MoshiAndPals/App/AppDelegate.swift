import AVFoundation
import UIKit

/// The whole app is landscape: the game's title screen, menus and shifts are one web page drawn sideways.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Game sound follows the silent switch and mixes with the player's own music
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        return true
    }

    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        .landscape
    }
}
