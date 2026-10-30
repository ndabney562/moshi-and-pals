import MoshiKit
import SwiftUI

/// The Progress tab: lifetime totals, records per difficulty, achievements and the Microbiology Atlas.
struct ProgressScreen: View {
    @Environment(GameStore.self) private var store
    @State private var model: ProgressViewModel?

    var body: some View {
        Group {
            if let model {
                ProgressContent(model: model)
            } else {
                Color.clear
            }
        }
        .navigationTitle("Progress")
        .onAppear {
            if model == nil { model = ProgressViewModel(store: store) }
        }
    }
}

private struct ProgressContent: View {
    let model: ProgressViewModel
    @Environment(GameCenterService.self) private var gameCenter: GameCenterService?

    private let columns = [GridItem(.adaptive(minimum: 140), spacing: Theme.Spacing.s)]

    var body: some View {
        List {
            Section {
                LazyVGrid(columns: columns, spacing: Theme.Spacing.s) {
                    StatTile(value: model.totals.runs.formatted(), label: "Shifts worked", symbol: "clock.fill")
                    StatTile(value: model.totals.totalKills.formatted(), label: "Germs disinfected", symbol: "bubbles.and.sparkles.fill")
                    StatTile(value: model.currencies.credits.formatted(), label: "CME Credits", symbol: "graduationcap.fill")
                    StatTile(value: model.currencies.nps.formatted(), label: "NPS Scores", symbol: "star.fill")
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            } header: {
                Text("Lifetime")
            }

            Section("Records") {
                ForEach(model.records) { record in
                    RecordRow(record: record)
                }
            }

            Section {
                NavigationLink {
                    AchievementsView(model: model)
                } label: {
                    HStack(spacing: Theme.Spacing.s) {
                        Gauge(value: model.completion) {
                            EmptyView()
                        }
                        .gaugeStyle(.accessoryCircularCapacity)
                        .tint(Theme.Palette.brand)
                        .scaleEffect(0.6)
                        .frame(width: 36, height: 36)
                        .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Achievements")
                                .font(Theme.Typography.headline)
                            Text("\(model.unlockedCount) of \(model.achievementCount) unlocked")
                                .font(Theme.Typography.caption)
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                    }
                }
                .accessibilityIdentifier("achievementsLink")

                NavigationLink {
                    AtlasView(model: model)
                } label: {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Microbiology Atlas")
                                .font(Theme.Typography.headline)
                            Text("\(model.atlasUnlockedCount) of \(model.atlas.count) pages")
                                .font(Theme.Typography.caption)
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                    } icon: {
                        Image(systemName: "book.closed.fill")
                            .foregroundStyle(Theme.Palette.brand)
                    }
                }
                .accessibilityIdentifier("atlasLink")

                if let gameCenter, gameCenter.isAuthenticated {
                    Button {
                        gameCenter.showDashboard()
                    } label: {
                        Label {
                            Text("Game Center")
                                .font(Theme.Typography.headline)
                        } icon: {
                            Image(systemName: "gamecontroller.fill")
                                .foregroundStyle(Theme.Palette.brand)
                        }
                    }
                    .accessibilityIdentifier("gameCenterLink")
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

private struct RecordRow: View {
    let record: Difficulty

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(record.name)
                    .font(Theme.Typography.headline)
                Text(record.hasPlayed ? "Round \(record.bestRound) · streak \(record.bestStreak)" : "Not played yet")
                    .font(Theme.Typography.caption)
                    .foregroundStyle(Theme.Palette.textSecondary)
            }
            Spacer()
            Text(record.bestScore.formatted())
                .font(Theme.Typography.stat)
                .foregroundStyle(record.hasPlayed ? Theme.Palette.highlight : Theme.Palette.textSecondary)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(record.name)
        .accessibilityValue(record.hasPlayed
            ? "Best score \(record.bestScore), round \(record.bestRound), streak \(record.bestStreak)"
            : "Not played yet")
    }
}

struct AchievementsView: View {
    @Bindable var model: ProgressViewModel

    var body: some View {
        List {
            Section {
                Picker("Show", selection: $model.filter) {
                    ForEach(AchievementFilter.allCases) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
            Section {
                ForEach(model.achievements) { achievement in
                    HStack(spacing: Theme.Spacing.s) {
                        Image(systemName: achievement.unlocked ? "checkmark.seal.fill" : "lock.fill")
                            .font(.title3)
                            .foregroundStyle(achievement.unlocked ? Theme.Palette.highlight : Theme.Palette.locked)
                            .frame(width: 32)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(achievement.name)
                                .font(Theme.Typography.headline)
                            Text(achievement.how)
                                .font(Theme.Typography.callout)
                                .foregroundStyle(Theme.Palette.textSecondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityValue(achievement.unlocked ? "Unlocked" : "Locked")
                }
            } footer: {
                if model.achievements.isEmpty {
                    Text(model.filter == .unlocked ? "Nothing yet. Go disinfect something!" : "All done. Impressive.")
                }
            }
        }
        .animation(Theme.Motion.standard, value: model.filter)
        .navigationTitle("Achievements")
    }
}

struct AtlasView: View {
    let model: ProgressViewModel

    var body: some View {
        List(model.atlas) { entry in
            HStack(alignment: .top, spacing: Theme.Spacing.s) {
                GameArt(data: model.store.snapshot.artData(entry.artKey), placeholder: "allergens")
                    .frame(width: 48, height: 48)
                    .opacity(entry.unlocked ? 1 : 0.3)
                VStack(alignment: .leading, spacing: Theme.Spacing.xxs) {
                    Text(entry.unlocked ? entry.name : "???")
                        .font(Theme.Typography.headline)
                    if entry.unlocked {
                        Text(entry.note)
                            .font(Theme.Typography.callout)
                            .foregroundStyle(Theme.Palette.textSecondary)
                    } else {
                        ProgressView(value: entry.fraction)
                            .tint(Theme.Palette.brand)
                        Text("\(entry.kills) of \(entry.need) disinfected")
                            .font(Theme.Typography.caption)
                            .foregroundStyle(Theme.Palette.textSecondary)
                    }
                }
            }
            .padding(.vertical, Theme.Spacing.xxs)
            .accessibilityElement(children: .combine)
        }
        .navigationTitle("Microbiology Atlas")
    }
}

#Preview {
    NavigationStack { ProgressScreen() }
        .environment(GameStore(cache: MemorySnapshotCache(.sample)))
}
