import MoshiKit
import SwiftUI

/// The game fills the screen: its own title screen, menus and shifts. SwiftUI adds only what the web can't do:
/// the Settings sheet (the title's gear asks for it) and Game Center (the LEADERBOARD tab asks for it).
struct RootView: View {
    let game: GameLayerKind
    @Environment(GameStore.self) private var store
    @Environment(GameCenterService.self) private var gameCenter: GameCenterService?

    var body: some View {
        @Bindable var store = store
        GameLayer(kind: game)
            .ignoresSafeArea()
            .statusBarHidden()
            .persistentSystemOverlays(.hidden)
            .sheet(isPresented: $store.isSettingsPresented) {
                SettingsSheet()
            }
            .onAppear {
                store.onOpenGameCenter = { gameCenter?.showDashboard() }
            }
            .onChange(of: store.snapshot, initial: true) { _, snapshot in
                gameCenter?.report(snapshot)
            }
            .tint(Theme.Palette.brand)
    }
}
