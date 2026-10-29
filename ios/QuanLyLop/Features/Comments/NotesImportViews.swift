import SwiftUI

/// Paste box and options of "Nhập từ ghi chú". The text lives only in this sheet's state and goes away with it.
struct NotesImportSheet: View {
    let onAnalyze: (String, NotesImportRules.Options) -> Void
    let close: () -> Void

    @State private var text: String
    @State private var includePraise = false
    @State private var createDefaults = true
    @State private var includeSent = false

    init(initialText: String = "", onAnalyze: @escaping (String, NotesImportRules.Options) -> Void, close: @escaping () -> Void) {
        _text = State(initialValue: initialText)
        self.onAnalyze = onAnalyze
        self.close = close
    }

    var body: some View {
        TeacherSheet(title: NotesImportText.title, content: { content }, footer: { footer },
                     detents: [.large], close: close)
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: AppSpace.s12) {
            Text(NotesImportText.pasteLabel).appText(AppText.label).foregroundStyle(AppColors.text)
            TextEditor(text: $text)
                .appText(AppText.body)
                .foregroundStyle(AppColors.text)
                .scrollContentBackground(.hidden)
                .padding(AppSpace.s12)
                .frame(minHeight: 200)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(RoundedRectangle(cornerRadius: AppRadius.control)
                    .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
                .accessibilityIdentifier("notes.text")
            Text(NotesImportText.pasteHint).appText(AppText.muted).foregroundStyle(AppColors.muted)
            option(NotesImportText.optionDefaults, isOn: $createDefaults, id: "notes.defaults")
            option(NotesImportText.optionPraise, isOn: $includePraise, id: "notes.praise")
            option(NotesImportText.optionSent, isOn: $includeSent, id: "notes.sent")
        }
    }

    private func option(_ title: String, isOn: Binding<Bool>, id: String) -> some View {
        Toggle(isOn: isOn) {
            Text(title).appText(AppText.body).foregroundStyle(AppColors.text)
        }
        .tint(AppColors.primary)
        .frame(minHeight: AppMetrics.tap)
        .accessibilityIdentifier(id)
    }

    private var footer: some View {
        AppButton(title: NotesImportText.analyze, variant: .primary, size: .large) {
            onAnalyze(text, .init(includePraise: includePraise, includeSent: includeSent, createDefaultsForRest: createDefaults))
        }
        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        .accessibilityIdentifier("notes.analyze")
    }
}

/// Banner above "Theo tiêu chí" while a notes draft is open: what will change and what needs the teacher's eye.
struct NotesImportReview: View {
    let draft: NotesImportDraft
    let handEdited: Int

    var body: some View {
        VStack(alignment: .leading, spacing: AppSpace.s8) {
            Text(NotesImportText.banner).appText(AppText.label).foregroundStyle(AppState.cardPendingFg)
            Text(NotesImportText.bannerNote).appText(AppText.muted).foregroundStyle(AppState.cardPendingFg)
            Text(NotesImportText.counts(changing: draft.changingCount, new: draft.newCount))
                .appText(AppText.label).foregroundStyle(AppColors.text)
                .accessibilityIdentifier("notes.counts")
            if draft.skippedCount > 0 {
                Text(NotesImportText.skipped(draft.skippedCount)).appText(AppText.muted).foregroundStyle(AppColors.muted)
                    .accessibilityIdentifier("notes.skipped")
            }
            if draft.hasSentSkipped {
                Text(NotesImportText.sentSkippedHint).appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            if handEdited > 0 {
                Text(NotesImportText.handEdited(handEdited)).appText(AppText.muted).foregroundStyle(AppState.cardPendingFg)
            }
            ForEach(draft.ambiguous, id: \.raw) { item in
                warning(NotesImportText.ambiguousTitle, NotesImportText.ambiguousLine(item.raw, item.candidates))
            }
            list(NotesImportText.unmatchedTitle, draft.unmatched)
            list(NotesImportText.excludedTitle, draft.excluded)
            list(NotesImportText.absentTitle, draft.absentNames)
            list(NotesImportText.wholeClassTitle, draft.wholeClassPhrases)
            list(NotesImportText.reviewTitle, draft.needsReviewPhrases)
            list(NotesImportText.unparsedTitle, draft.result.unparsedLines)
        }
        .padding(AppSpace.s12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .appStatusCard(.pending, radius: AppRadius.row)
        .accessibilityIdentifier("notes.banner")
    }

    @ViewBuilder private func list(_ title: String, _ items: [String]) -> some View {
        if !items.isEmpty { warning(title, items.joined(separator: ", ")) }
    }

    private func warning(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: AppSpace.s2) {
            Text(title).appText(AppText.caption).foregroundStyle(AppColors.muted)
            Text(detail).appText(AppText.muted).foregroundStyle(AppColors.text)
        }
    }
}

#if DEBUG
/// Screenshot harness only: synthetic students, no store, no network.
struct NotesImportDemo: View {
    let kind: String
    @State private var draft: NotesImportDraft?
    @State private var text = NotesImportDemoData.text
    private let rows: [I4TicketRow]

    init(kind: String) {
        self.kind = kind
        let rows = NotesImportDemoData.names.enumerated().map { index, name in
            I4TicketRow(student: Student(id: "s\(index)", classId: "c", name: name, parentPhone: nil, enrolledAt: "2026-09-01",
                                         leftAt: nil, status: .active, version: 1),
                        slip: nil, attendance: index == 3 ? .absent : nil,
                        previousHomework: I4HomeworkSummary(total: 0, graded: 0), previousDate: nil, previousHadSections: false)
        }
        self.rows = rows
        let roster = NotesImportRoster.build(rows: rows, others: [], sections: [], grades: [])
        let options = NotesImportRules.Options(createDefaultsForRest: true)
        let result = NotesImportRules.analyze(NotesImportDemoData.text, students: roster, options: options)
        _draft = State(initialValue: kind == "notes-review" ? NotesImportDraft(result: result, students: roster, options: options) : nil)
    }

    var body: some View {
        if kind == "notes-input" {
            Color.clear.sheet(isPresented: .constant(true)) {
                NotesImportSheet(initialText: NotesImportDemoData.text, onAnalyze: { _, _ in }, close: {})
            }
        } else {
            ScrollView {
                CriteriaModeView(rows: rows, sections: [], grades: [], canWrite: true, save: { _, _, _ in nil }, draft: $draft)
                    .padding(AppSpace.s16)
            }
            .background(AppColors.background)
        }
    }
}
#endif
