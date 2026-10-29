import SwiftUI

/// "Theo tiêu chí": five groups of chips, one chip per student enrolled on the session date. A chip tap saves that
/// student's slip at once (offline it queues like any slip edit).
struct CriteriaModeView: View {
    let rows: [I4TicketRow]
    let sections: [HomeworkSection]
    let grades: [HomeworkGrade]
    let canWrite: Bool
    /// Saves one tap; returns an error text, nil when it was written.
    let save: (String, I4FeatureStore.SlipGrading, String) async -> String?

    @State private var busy: Set<String> = []
    @State private var acknowledged: Set<CriteriaModeRules.Warning> = []
    @State private var pending: PendingTap?
    @State private var failure: String?

    private struct PendingTap: Identifiable {
        let studentID: String
        let criterion: Int
        let warnings: [CriteriaModeRules.Warning]
        var id: String { "\(studentID):\(criterion)" }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpace.s16) {
            Text(CriteriaModeText.hint)
                .appText(AppText.muted)
                .foregroundStyle(AppColors.muted)
            if let failure {
                Text(failure).appText(AppText.label).foregroundStyle(AppColors.error)
            }
            ForEach(0..<SlipRules.criteriaCount, id: \.self) { criterion in
                group(criterion)
            }
        }
        .alert(CriteriaModeText.warningTitle, isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } })) {
            Button(CriteriaModeText.confirm) {
                guard let tap = pending else { return }
                acknowledged.formUnion(tap.warnings)
                pending = nil
                commit(studentID: tap.studentID, criterion: tap.criterion)
            }
            Button(CriteriaModeText.cancel, role: .cancel) { pending = nil }
        } message: {
            Text(pending?.warnings.map { $0 == .sent ? CriteriaModeText.sentWarning : CriteriaModeText.handEditedWarning }
                .joined(separator: "\n\n") ?? "")
        }
    }

    private func group(_ criterion: Int) -> some View {
        let chips = CriteriaModeRules.chips(rows: rows, criterion: criterion, sections: sections, grades: grades)
        return VStack(alignment: .leading, spacing: AppSpace.s12) {
            HStack(alignment: .firstTextBaseline, spacing: AppSpace.s8) {
                VStack(alignment: .leading, spacing: AppSpace.s2) {
                    Text(SlipSheetText.criterion(criterion)).appText(AppText.subheading).foregroundStyle(AppColors.text)
                    if CriteriaModeRules.followsGrades(criterion: criterion) {
                        Text(CriteriaModeText.followsGrades).appText(AppText.caption).foregroundStyle(AppColors.muted)
                    }
                }
                Spacer(minLength: 0)
                AppPill(title: CriteriaModeText.unmetCount(CriteriaModeRules.unmetCount(chips)),
                        tone: CriteriaModeRules.unmetCount(chips) == 0 ? .success : .warning)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 132), spacing: AppSpace.s8, alignment: .top)],
                      alignment: .leading, spacing: AppSpace.s8) {
                ForEach(chips) { chip in
                    chipButton(chip, criterion: criterion)
                }
            }
        }
        .padding(AppMetrics.cardPaddingHorizontal)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        .accessibilityIdentifier("criteria.group.\(criterion)")
    }

    private func chipButton(_ chip: CriteriaModeRules.Chip, criterion: Int) -> some View {
        let mark = chip.isLegacy ? CriteriaModeText.legacyMark
            : chip.isSent ? CriteriaModeText.sentMark
            : chip.isAbsent ? CriteriaModeText.absentMark : nil
        return Button { tap(chip, criterion: criterion) } label: {
            VStack(spacing: AppSpace.s2) {
                Text(chip.name)
                    .appText(AppText.chip)
                    .foregroundStyle(chip.unmet ? AppState.selectedFg : AppColors.text)
                    .lineLimit(1)
                if let mark {
                    Text(mark).appText(AppText.caption).foregroundStyle(AppColors.muted)
                }
            }
            .padding(.horizontal, AppMetrics.chipPaddingHorizontal)
            .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
            .background(chip.unmet ? AppState.selectedBg : AppColors.background,
                        in: RoundedRectangle(cornerRadius: AppRadius.chip))
            .opacity(chip.isLegacy || chip.isAbsent ? AppState.disabledOpacity : 1)
        }
        .buttonStyle(.plain)
        .disabled(!canWrite || !chip.isEditable || busy.contains(chip.studentID))
        .accessibilityAddTraits(chip.unmet ? [.isSelected] : [])
        .accessibilityIdentifier("criteria.chip.\(criterion).\(chip.studentID)")
    }

    private func tap(_ chip: CriteriaModeRules.Chip, criterion: Int) {
        let slip = rows.first { $0.student.id == chip.studentID }?.slip
        let needed = CriteriaModeRules.warnings(slip: slip, acknowledged: acknowledged)
        if needed.isEmpty {
            commit(studentID: chip.studentID, criterion: criterion)
        } else {
            pending = PendingTap(studentID: chip.studentID, criterion: criterion, warnings: needed)
        }
    }

    private func commit(studentID: String, criterion: Int) {
        guard let row = rows.first(where: { $0.student.id == studentID }),
              let grading = CriteriaModeRules.tapGrading(slip: row.slip, criterion: criterion, sections: sections,
                                                         grades: grades, studentID: studentID)
        else { return }
        busy.insert(studentID)
        failure = nil
        Task {
            let error = await save(studentID, grading, row.slip?.note ?? "")
            busy.remove(studentID)
            failure = error
        }
    }
}
