import MoshiKit
import SwiftUI

/// The Play tab: the poster, who's on shift, difficulty, Today's Shift, and the way into a shift.
struct PlayView: View {
    @Environment(GameStore.self) private var store
    @State private var model: PlayViewModel?

    var body: some View {
        Group {
            if let model {
                PlayContent(model: model)
            } else {
                Color.clear
            }
        }
        .navigationTitle("Moshi and Pals")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if model == nil { model = PlayViewModel(store: store) }
        }
    }
}

private struct PlayContent: View {
    @Bindable var model: PlayViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.Spacing.l) {
                Poster()

                if model.pals.isEmpty {
                    FirstLaunchCard()
                } else {
                    shiftButtons
                    Button("Providers · Select / Unlock Abilities") { model.openProviders() }
                        .buttonStyle(.borderedProminent)
                        .accessibilityIdentifier("providersButton")
                    DifficultyCard(model: model)
                    TodaysShiftCard(model: model)
                    BetweenShiftsCard(model: model)
                }
            }
            .padding(.horizontal, Theme.Spacing.m)
            .padding(.bottom, Theme.Spacing.xl)
        }
        .background(Theme.Palette.background)
        .confirmationDialog(
            hireTitle,
            isPresented: Binding(get: { model.pendingHire != nil }, set: { if !$0 { model.pendingHire = nil } }),
            titleVisibility: .visible
        ) {
            Button("Hire for \(model.pendingHire?.price ?? 0) NPS") { model.confirmHire() }
            Button("Not Now", role: .cancel) { model.pendingHire = nil }
        } message: {
            Text(model.pendingHire?.blurb ?? "")
        }
    }

    private var hireTitle: String {
        "Hire \(model.pendingHire?.name ?? "")?"
    }

    private var shiftButtons: some View {
        VStack(spacing: Theme.Spacing.s) {
            if let saved = model.savedShiftSummary {
                Button(action: model.continueShift) {
                    Label("Continue Shift · \(saved)", systemImage: "arrow.uturn.forward.circle.fill")
                }
                .buttonStyle(.secondary)
                .accessibilityIdentifier("continueShiftButton")
            }
            Button(action: model.startShift) {
                VStack(spacing: 2) {
                    Label("Start Shift", systemImage: "play.fill")
                    if let pal = model.selectedPal, let difficulty = model.selectedDifficulty {
                        Text("\(pal.name) · \(difficulty.name)")
                            .font(Theme.Typography.caption)
                            .opacity(0.9)
                    }
                }
                .padding(.vertical, Theme.Spacing.xs)
            }
            .buttonStyle(.primary)
            .accessibilityIdentifier("startShiftButton")
        }
    }
}

/// Noah's title poster, from the bundled game.
private struct Poster: View {
    private static let image: UIImage? = {
        guard let url = Bundle.main.url(forResource: "title", withExtension: "jpg", subdirectory: "Game/assets") else { return nil }
        return UIImage(contentsOfFile: url.path)
    }()

    var body: some View {
        ZStack {
            Theme.Palette.hero
            if let image = Self.image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Text("Moshi and Pals")
                    .font(Theme.Typography.display)
                    .foregroundStyle(Theme.Palette.onHero)
            }
        }
        .frame(height: Theme.Size.heroHeight)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.l, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Moshi and Pals poster: Dr. Moshkovich and the Pals versus the germs")
        .accessibilityAddTraits(.isImage)
    }
}

private struct FirstLaunchCard: View {
    var body: some View {
        Card {
            HStack(spacing: Theme.Spacing.s) {
                ProgressView()
                Text("Getting the clinic ready…")
                    .font(Theme.Typography.headline)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Who's on shift

private struct PalPicker: View {
    let model: PlayViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            SectionHeader(title: "Who's on Shift", trailing: "⭐ \(model.nps) NPS")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.Spacing.s) {
                    ForEach(model.pals) { pal in
                        PalCard(pal: pal, status: model.status(of: pal), art: model.store.snapshot.artData(pal.artKey)) {
                            model.choose(pal)
                        }
                    }
                }
                .padding(.vertical, Theme.Spacing.xxs)
            }
            if let pal = model.selectedPal {
                Text(pal.blurb)
                    .font(Theme.Typography.callout)
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .animation(Theme.Motion.standard, value: pal.id)
            }
        }
    }
}

private struct PalCard: View {
    let pal: Pal
    let status: PalStatus
    let art: Data?
    let action: () -> Void

    private var isOnShift: Bool { status == .onShift }
    private var isLocked: Bool {
        if case .locked = status { return true }
        return false
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: Theme.Spacing.xs) {
                ZStack {
                    Circle()
                        .fill(Theme.Palette.hero)
                    GameArt(data: art, placeholder: "person.fill", rotation: .degrees(-90))
                        .padding(Theme.Spacing.xxs)
                        .opacity(pal.unlocked ? 1 : 0.35)
                    if !pal.unlocked {
                        Image(systemName: "lock.fill")
                            .font(.title3)
                            .foregroundStyle(Theme.Palette.onHero)
                    }
                }
                .frame(width: Theme.Size.palPortrait, height: Theme.Size.palPortrait)
                .overlay {
                    Circle().strokeBorder(isOnShift ? Theme.Palette.highlight : .clear, lineWidth: 4)
                }
                Text(pal.short.capitalized)
                    .font(Theme.Typography.headline)
                    .foregroundStyle(Theme.Palette.textPrimary)
                Text(caption)
                    .font(Theme.Typography.caption)
                    .foregroundStyle(isOnShift ? Theme.Palette.highlight : Theme.Palette.textSecondary)
            }
            .padding(Theme.Spacing.s)
            .frame(minWidth: 104)
            .background(Theme.Palette.surface, in: RoundedRectangle(cornerRadius: Theme.Radius.m, style: .continuous))
            .scaleEffect(isOnShift ? 1.03 : 1)
            .animation(Theme.Motion.bounce, value: isOnShift)
        }
        .buttonStyle(.plain)
        .disabled(isLocked)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(pal.name)
        .accessibilityValue(caption)
        .accessibilityHint(hint)
        .accessibilityAddTraits(isOnShift ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier("palCard-\(pal.id)")
    }

    private var caption: String {
        switch status {
        case .onShift: return "On shift"
        case .available: return "Ready"
        case .hireable(let price): return "Hire · \(price) NPS"
        case .locked(let needMore): return "Need \(needMore) more NPS"
        }
    }

    private var hint: String {
        switch status {
        case .available: return "Puts them on shift."
        case .hireable: return "Hires them with NPS Scores."
        case .onShift, .locked: return ""
        }
    }
}

// MARK: - Difficulty

private struct DifficultyCard: View {
    @Bindable var model: PlayViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            SectionHeader(title: "Difficulty")
            Card {
                Picker("Difficulty", selection: $model.selectedDifficultyID) {
                    ForEach(model.difficulties) { difficulty in
                        Text(difficulty.name).tag(difficulty.id)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("difficultyPicker")
                if let difficulty = model.selectedDifficulty {
                    Text(difficulty.blurb)
                        .font(Theme.Typography.callout)
                        .foregroundStyle(Theme.Palette.textSecondary)
                    Label {
                        Text(difficulty.hasPlayed
                             ? "Best \(difficulty.bestScore.formatted()) · round \(difficulty.bestRound)"
                             : "No shifts worked yet")
                    } icon: {
                        Image(systemName: "rosette")
                    }
                    .font(Theme.Typography.headline)
                    .foregroundStyle(Theme.Palette.highlight)
                }
            }
        }
    }
}

// MARK: - Today's Shift

private struct TodaysShiftCard: View {
    let model: PlayViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            SectionHeader(title: "Today's Shift")
            Card {
                Text("Everyone works the same shift today, always on Urgent.")
                    .font(Theme.Typography.callout)
                    .foregroundStyle(Theme.Palette.textSecondary)
                ForEach(model.today.mods) { mod in
                    HStack(alignment: .top, spacing: Theme.Spacing.s) {
                        Text(mod.icon)
                            .font(.title2)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(mod.name)
                                .font(Theme.Typography.headline)
                            Text(mod.blurb)
                                .font(Theme.Typography.callout)
                                .foregroundStyle(Theme.Palette.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .accessibilityElement(children: .combine)
                }
                Text(model.todaySummary)
                    .font(Theme.Typography.headline)
                    .foregroundStyle(Theme.Palette.highlight)
                Button(action: model.startToday) {
                    Label("Clock In", systemImage: "calendar.badge.clock")
                }
                .buttonStyle(.secondary)
                .accessibilityIdentifier("clockInButton")
            }
        }
    }
}

// MARK: - Between shifts

private struct BetweenShiftsCard: View {
    let model: PlayViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.s) {
            SectionHeader(title: "Between Shifts")
            Card {
                row("Residency Board", detail: "\(model.credits) CME Credits · Specialties, staff, Atlas", symbol: "graduationcap.fill",
                    id: "boardButton", action: model.openBoard)
                Divider()
                row("Equipment Locker", detail: "$\(model.bank.formatted()) banked · tool upgrades", symbol: "archivebox.fill",
                    id: "lockerButton", action: model.openLocker)
            }
        }
    }

    private func row(_ title: String, detail: String, symbol: String, id: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Theme.Spacing.s) {
                Image(systemName: symbol)
                    .font(.title3)
                    .foregroundStyle(Theme.Palette.brand)
                    .frame(width: 32)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(Theme.Typography.headline)
                        .foregroundStyle(Theme.Palette.textPrimary)
                    Text(detail)
                        .font(Theme.Typography.caption)
                        .foregroundStyle(Theme.Palette.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.Palette.textSecondary)
                    .accessibilityHidden(true)
            }
            .frame(minHeight: Theme.Size.minTouch)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier(id)
    }
}

#Preview {
    let store = GameStore(cache: MemorySnapshotCache(.sample))
    return NavigationStack { PlayView() }
        .environment(store)
}
