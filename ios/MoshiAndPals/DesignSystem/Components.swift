import SwiftUI

/// The big filled button.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Typography.button)
            .foregroundStyle(Theme.Palette.onBrand)
            .frame(maxWidth: .infinity, minHeight: Theme.Size.minTouch + 8)
            .padding(.horizontal, Theme.Spacing.m)
            .background(Theme.Palette.brand.opacity(isEnabled ? 1 : 0.4), in: RoundedRectangle(cornerRadius: Theme.Radius.m, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(Theme.Motion.standard, value: configuration.isPressed)
    }
}

/// A tinted, lighter button for secondary actions.
struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Typography.button)
            .foregroundStyle(Theme.Palette.brand)
            .frame(maxWidth: .infinity, minHeight: Theme.Size.minTouch)
            .padding(.horizontal, Theme.Spacing.m)
            .background(Theme.Palette.brand.opacity(0.14), in: RoundedRectangle(cornerRadius: Theme.Radius.m, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(Theme.Motion.standard, value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}
