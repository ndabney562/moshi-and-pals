import MoshiKit
import SwiftUI

/// The game sits underneath everything (it keeps running, asleep, so shifts start instantly); the tabs cover it
/// until a shift, the board or the locker opens.
struct RootView: View {
    let game: GameLayerKind
    @Environment(GameStore.self) private var store
    @State private var tab: AppTab = .play

    private var isPlaying: Bool { store.presentedScreen != nil }

    var body: some View {
        ZStack {
            GameLayer(kind: game)
                .ignoresSafeArea()
                .accessibilityHidden(!isPlaying)
                .allowsHitTesting(isPlaying)

            if !isPlaying {
                MainTabs(selection: $tab)
                    .transition(.opacity)
            }
        }
        .animation(Theme.Motion.gentle, value: isPlaying)
        .statusBarHidden(isPlaying)
        .persistentSystemOverlays(isPlaying ? .hidden : .automatic)
        .onChange(of: isPlaying, initial: true) { _, playing in
            Orientation.lock(playing ? .landscape : .portrait)
        }
        .tint(Theme.Palette.brand)
    }
}

enum AppTab: Hashable {
    case play, progress, settings
}

struct MainTabs: View {
    @Binding var selection: AppTab

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack { PlayView() }
                .tabItem { Label("Play", systemImage: "gamecontroller.fill") }
                .tag(AppTab.play)
            NavigationStack { ProgressScreen() }
                .tabItem { Label("Progress", systemImage: "trophy.fill") }
                .tag(AppTab.progress)
            NavigationStack { SettingsView() }
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(AppTab.settings)
        }
        .background(Theme.Palette.background)
    }
}
