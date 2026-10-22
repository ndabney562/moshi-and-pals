import SwiftUI

/// The big filled button (Start Shift, Clock In).
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

/// A rounded surface that groups related content.
struct Card<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            content
        }
        .padding(Theme.Spacing.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.l, style: .continuous))
    }
}

/// A section title above a card.
struct SectionHeader: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(Theme.Typography.title)
                .foregroundStyle(Theme.Palette.textPrimary)
                .accessibilityAddTraits(.isHeader)
            Spacer()
            if let trailing {
                Text(trailing)
                    .font(Theme.Typography.headline)
                    .foregroundStyle(Theme.Palette.highlight)
            }
        }
    }
}

/// A number with a label under it (records, lifetime totals).
struct StatTile: View {
    let value: String
    let label: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.xxs) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(Theme.Palette.brand)
                .accessibilityHidden(true)
            Text(value)
                .font(Theme.Typography.stat)
                .foregroundStyle(Theme.Palette.textPrimary)
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            Text(label)
                .font(Theme.Typography.caption)
                .foregroundStyle(Theme.Palette.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.Spacing.s)
        .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.m, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label): \(value)")
    }
}

/// A picture the game drew (a Pal or a germ), or an SF Symbol until the game has sent it.
struct GameArt: View {
    let data: Data?
    let placeholder: String
    var rotation: Angle = .zero

    var body: some View {
        if let data, let image = UIImage(data: data) {
            Image(uiImage: image)
                .resizable()
                .interpolation(.high)
                .scaledToFit()
                .rotationEffect(rotation)
                .accessibilityHidden(true)
        } else {
            Image(systemName: placeholder)
                .resizable()
                .scaledToFit()
                .padding(Theme.Spacing.s)
                .foregroundStyle(Theme.Palette.textSecondary)
                .accessibilityHidden(true)
        }
    }
}
