import SwiftUI
import UIKit

/// The design system: every color, type style, spacing step, corner radius and animation the app uses.
/// Colors adapt to light and dark mode and to Increase Contrast; type follows Dynamic Type.
enum Theme {
    // MARK: Colors

    enum Palette {
        /// Primary buttons and selection (the game's teal). 5:1 or better against its text in both modes.
        static let brand = dynamic(light: 0x1F7A70, dark: 0x3CC4B4, lightHigh: 0x145A52, darkHigh: 0x6FE0D2)
        /// Text and icons on `brand`.
        static let onBrand = dynamic(light: 0xFFFFFF, dark: 0x062220)
        /// Gold for records and NPS Scores (the title screen's yellow). Readable as text in both modes.
        static let highlight = dynamic(light: 0x7A5800, dark: 0xFFE66D, lightHigh: 0x5C4200, darkHigh: 0xFFF0A0)
        /// The clinic's deep teal, behind the poster and the game.
        static let hero = Color(rgb: 0x0D2B2E)
        /// Text on `hero`.
        static let onHero = Color(rgb: 0xE8FFF9)

        static let background = Color(uiColor: .systemGroupedBackground)
        static let surface = Color(uiColor: .secondarySystemGroupedBackground)
        static let textPrimary = Color(uiColor: .label)
        static let textSecondary = Color(uiColor: .secondaryLabel)
        static let separator = Color(uiColor: .separator)
        static let success = Color(uiColor: .systemGreen)
        static let locked = Color(uiColor: .systemGray)

        private static func dynamic(light: UInt32, dark: UInt32, lightHigh: UInt32? = nil, darkHigh: UInt32? = nil) -> Color {
            Color(uiColor: UIColor { traits in
                let high = traits.accessibilityContrast == .high
                if traits.userInterfaceStyle == .dark {
                    return UIColor(rgb: high ? (darkHigh ?? dark) : dark)
                }
                return UIColor(rgb: high ? (lightHigh ?? light) : light)
            })
        }
    }

    // MARK: Type (all scale with Dynamic Type)

    enum Typography {
        static let display = Font.system(.largeTitle, design: .rounded, weight: .heavy)
        static let title = Font.system(.title2, design: .rounded, weight: .bold)
        static let headline = Font.system(.headline, design: .rounded, weight: .semibold)
        static let body = Font.system(.body)
        static let callout = Font.system(.callout)
        static let caption = Font.system(.caption)
        static let stat = Font.system(.title, design: .rounded, weight: .bold).monospacedDigit()
        static let button = Font.system(.headline, design: .rounded, weight: .bold)
    }

    // MARK: Spacing (a 4-point scale)

    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let s: CGFloat = 12
        static let m: CGFloat = 16
        static let l: CGFloat = 24
        static let xl: CGFloat = 32
    }

    enum Radius {
        static let s: CGFloat = 10
        static let m: CGFloat = 16
        static let l: CGFloat = 24
    }

    enum Size {
        /// Apple's minimum touch target.
        static let minTouch: CGFloat = 44
        static let palPortrait: CGFloat = 72
        static let heroHeight: CGFloat = 220
    }

    // MARK: Motion

    enum Motion {
        static let standard = Animation.snappy(duration: 0.3)
        static let gentle = Animation.smooth(duration: 0.45)
        static let bounce = Animation.spring(response: 0.35, dampingFraction: 0.6)
    }
}

extension Color {
    init(rgb: UInt32) {
        self.init(uiColor: UIColor(rgb: rgb))
    }
}

extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}
