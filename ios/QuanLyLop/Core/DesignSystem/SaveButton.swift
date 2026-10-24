import SwiftUI
import UIKit

/// Save button with the four states of rules.md mục 6: default, loading (same size, label hidden,
/// spinner, at least 400 ms), success (check + "Đã lưu" for 1.6 s) and error (back to default, the
/// error is in `controller.error` for the screen to show; nothing is cleared or closed).
///
///     AppSaveButton(title: "Lưu", controller: controller, isEnabled: canSave) { try await store.save() }
struct AppSaveButton: View {
    let title: String
    let controller: AppSaveController
    var variant: AppButtonStyle.Variant = .primary
    var size: AppButtonStyle.Size = .large
    var isEnabled = true
    var onSuccess: @MainActor () -> Void = {}
    let work: @MainActor () async throws -> Void

    var body: some View {
        Button {
            Task {
                guard await controller.submit(work) else { return }
                await controller.waitForSuccessHold()
                onSuccess()
            }
        } label: {
            ZStack {
                // Every state sits in the layout so the button never changes width.
                Text(title).opacity(controller.phase == .idle ? 1 : 0)
                HStack(spacing: AppMetrics.saveFeedbackGap) {
                    Image(systemName: "checkmark")
                    Text(String(localized: "ds.save.saved", table: "DesignSystem"))
                }
                .opacity(controller.phase == .saved ? 1 : 0)
                Text(String(localized: "ds.save.saved", table: "DesignSystem")).hidden()
                AppSpinner(tint: spinnerTint, ring: spinnerRing)
                    .opacity(controller.phase == .saving ? 1 : 0)
            }
        }
        .buttonStyle(AppButtonStyle(variant: variant, size: size, phase: controller.phase))
        .disabled(!isEnabled || controller.phase == .saving)
        .accessibilityLabel(accessibilityText)
        .accessibilityAddTraits(controller.phase == .saving ? .updatesFrequently : [])
    }

    private var spinnerTint: Color { variant == .primary ? AppColors.onPrimary : AppColors.primary }
    private var spinnerRing: Color { spinnerTint.opacity(0.3) }

    private var accessibilityText: String {
        switch controller.phase {
        case .idle: title
        case .saving: String(localized: "ds.save.saving", table: "DesignSystem")
        case .saved: String(localized: "ds.save.saved", table: "DesignSystem")
        }
    }
}
