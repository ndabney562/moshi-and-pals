import MoshiKit
import SwiftUI

/// The Settings sheet, opened by the gear on the game's title screen. Sound, music and gameplay switches are
/// the same ones as the in-game pause menu; haptics are the app's own.
struct SettingsSheet: View {
    @Environment(GameStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var model: SettingsViewModel?

    var body: some View {
        NavigationStack {
            Group {
                if let model {
                    SettingsForm(model: model)
                } else {
                    Color.clear
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .accessibilityIdentifier("settingsDoneButton")
                }
            }
        }
        .onAppear {
            if model == nil { model = SettingsViewModel(store: store) }
        }
    }
}

private struct SettingsForm: View {
    @Bindable var model: SettingsViewModel

    private var appVersion: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }

    var body: some View {
        Form {
            Section("Sound") {
                Toggle(isOn: $model.sound) { Label("Sound effects", systemImage: "speaker.wave.2.fill") }
                    .accessibilityIdentifier("soundToggle")
                Toggle(isOn: $model.music) { Label("Music", systemImage: "music.note") }
                    .accessibilityIdentifier("musicToggle")
            }
            Section {
                Toggle(isOn: $model.autoAim) { Label("Auto-aim", systemImage: "scope") }
                Toggle(isOn: $model.autoRefill) { Label("Auto-refill", systemImage: "drop.fill") }
                Toggle(isOn: $model.reducedMotion) { Label("No screen shake", systemImage: "iphone.radiowaves.left.and.right") }
            } header: {
                Text("Gameplay")
            } footer: {
                Text("Auto-aim sprays at the nearest germ you can see. Auto-refill starts a refill when you spray an empty bottle.")
            }
            Section {
                Toggle(isOn: $model.haptics) { Label("Haptics", systemImage: "hand.tap.fill") }
                    .accessibilityIdentifier("hapticsToggle")
            } header: {
                Text("Feel")
            } footer: {
                Text("Taps when you're hit, honk a Sinus Purge, meet a boss or unlock something.")
            }
            Section("About") {
                LabeledContent("App", value: appVersion)
                LabeledContent("Game", value: model.gameVersion)
                if let url = URL(string: "https://ndabney562.github.io/moshi-and-pals/") {
                    Link(destination: url) {
                        Label("Play in the browser", systemImage: "safari")
                    }
                }
                if let url = URL(string: "https://ndabney562.github.io/moshi-and-pals/privacy.html") {
                    Link(destination: url) {
                        Label("Privacy Policy", systemImage: "hand.raised")
                    }
                    .accessibilityIdentifier("privacyPolicyLink")
                }
            }
        }
    }
}

#Preview {
    SettingsSheet()
        .environment(GameStore(cache: MemorySnapshotCache(.sample)))
}
