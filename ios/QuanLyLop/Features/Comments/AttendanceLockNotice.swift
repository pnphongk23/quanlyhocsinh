import SwiftUI

/// Top of the comments tab while attendance is unfinished: the tab is view-only and says what is missing.
struct AttendanceLockNotice: View {
    let unmarked: Int
    let goToAttendance: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpace.s8) {
            // One spoken element for the message; the button below stays its own control.
            VStack(alignment: .leading, spacing: AppSpace.s8) {
                Text(String(localized: "comments.locked.title", table: "Teacher"))
                    .appText(AppText.subheading)
                    .foregroundStyle(AppState.cardInfoFg)
                Text(String.localizedStringWithFormat(String(localized: "comments.locked.detail", table: "Teacher"), unmarked))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            .accessibilityElement(children: .combine)
            if let goToAttendance {
                // The card is already `primarySoft`, so the secondary action sits on the surface fill.
                AppButton(title: String(localized: "comments.locked.action", table: "Teacher"), variant: .surface,
                          action: goToAttendance)
                    .accessibilityIdentifier("comment.locked.goAttendance")
            }
        }
        .padding(AppSpace.s12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .appStatusCard(.info, radius: AppRadius.row)
        .accessibilityIdentifier("comment.locked")
    }
}
