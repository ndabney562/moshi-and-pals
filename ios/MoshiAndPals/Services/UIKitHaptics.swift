import MoshiKit
import UIKit

/// Plays MoshiKit haptic styles on the Taptic Engine. Generators are kept and prepared so taps land on time.
final class UIKitHaptics: HapticPlaying {
    private let light = UIImpactFeedbackGenerator(style: .light)
    private let medium = UIImpactFeedbackGenerator(style: .medium)
    private let heavy = UIImpactFeedbackGenerator(style: .heavy)
    private let notification = UINotificationFeedbackGenerator()
    private let selection = UISelectionFeedbackGenerator()

    func play(_ style: HapticStyle) {
        switch style {
        case .impact(.light):
            light.impactOccurred()
            light.prepare()
        case .impact(.medium):
            medium.impactOccurred()
            medium.prepare()
        case .impact(.heavy):
            heavy.impactOccurred()
            heavy.prepare()
        case .notification(let kind):
            switch kind {
            case .success: notification.notificationOccurred(.success)
            case .warning: notification.notificationOccurred(.warning)
            case .error: notification.notificationOccurred(.error)
            }
            notification.prepare()
        case .selection:
            selection.selectionChanged()
            selection.prepare()
        }
    }
}
