import SwiftUI

/// Prototype `src/shared/SaveStatus/SaveStatus.tsx` + `.mobileSaveStatus` in `shell.module.css`:
/// one error pill above the content (`margin: 8px 20px 0`, 13px/600, `--color-error-soft`).
///
/// Nothing renders in any other state, so there is no permanent sync chip
/// (`offline-plan.md`; spec mục 5.3 "chỉ hiện lỗi").
struct SaveStatusBanner: View {
    let state: SaveState

    var body: some View {
        if state == .error {
            HStack(spacing: 0) {
                AppPill(title: String(localized: "status.save.error"), tone: .error)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityIdentifier("saveStatus.error")
            .accessibilityAddTraits(.updatesFrequently)
            .transition(.opacity)
        }
    }
}

#Preview("Lỗi lưu") {
    VStack {
        SaveStatusBanner(state: .error)
        Spacer()
    }
    .background(AppColors.background)
}

#Preview("Bình thường") {
    VStack { SaveStatusBanner(state: .synced); Spacer() }
}
