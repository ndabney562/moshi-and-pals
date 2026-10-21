import AVFoundation
import UIKit

/// Menus are portrait (iPhone-first); the game is landscape. The root view switches this when a game screen
/// opens or closes.
final class AppDelegate: NSObject, UIApplicationDelegate {
    static var orientationLock: UIInterfaceOrientationMask = .portrait

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Game sound follows the silent switch and mixes with the player's own music
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        return true
    }

    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        Self.orientationLock
    }
}

enum Orientation {
    /// Locks the app to `mask` and turns the screen now if it isn't already.
    @MainActor
    static func lock(_ mask: UIInterfaceOrientationMask) {
        guard AppDelegate.orientationLock != mask else { return }
        AppDelegate.orientationLock = mask
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        for scene in scenes {
            scene.windows.first { $0.isKeyWindow }?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
            scene.requestGeometryUpdate(.iOS(interfaceOrientations: mask)) { _ in
                // Refused (e.g. on iPad multitasking): the game turns itself sideways instead
            }
        }
    }
}
