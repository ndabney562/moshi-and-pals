import Foundation

/// Game moments the game asks the Taptic Engine to mark (`watchForHaptics` in src/core/native.ts).
public enum HapticKind: String, Codable, CaseIterable, Sendable {
    case hit
    case purge
    case boss
    case bossDefeated
    case roundCompleted
    case unlock
    case pickup
    case achievement
    case death

    /// How each one feels.
    public var style: HapticStyle {
        switch self {
        case .hit: return .impact(.medium)
        case .purge: return .impact(.heavy)
        case .pickup, .unlock: return .impact(.light)
        case .boss: return .notification(.warning)
        case .bossDefeated, .roundCompleted, .achievement: return .notification(.success)
        case .death: return .notification(.error)
        }
    }

    /// The shortest gap between two of the same kind, so a swarm of hits doesn't buzz nonstop.
    public var minimumInterval: TimeInterval {
        switch self {
        case .hit, .pickup: return 0.15
        default: return 0.05
        }
    }
}

public enum HapticStyle: Equatable, Sendable {
    public enum Impact: Sendable { case light, medium, heavy }
    public enum Notification: Sendable { case success, warning, error }

    case impact(Impact)
    case notification(Notification)
    case selection
}

/// Plays haptics (UIKit on device; a recorder in tests).
public protocol HapticPlaying: AnyObject {
    func play(_ style: HapticStyle)
}

/// Drops a haptic that comes too soon after the last of its kind.
public struct HapticThrottle: Sendable {
    private var lastPlayed: [HapticKind: TimeInterval] = [:]

    public init() {}

    /// True if `kind` may play at `time` (seconds, any monotonic clock); records it if so.
    public mutating func allow(_ kind: HapticKind, at time: TimeInterval) -> Bool {
        if let last = lastPlayed[kind], time - last < kind.minimumInterval { return false }
        lastPlayed[kind] = time
        return true
    }
}
