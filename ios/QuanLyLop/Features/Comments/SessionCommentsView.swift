import SwiftUI

/// Tab "Nhận xét" of a session (`CommentsPanel.tsx` + `CommentTicketSheet.tsx`).
struct SessionCommentsView: View {
    let sessionID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var filter: TicketFilter = .all
    @State private var target: TicketTarget?
    @State private var showingSend = false
    @State private var sendError: String?
    @State private var sendController = AppSaveController()
    @State private var saveStatusSource: AppSaveStatusSource?
    @State private var dismissSendAfterSuccess = false

    init(sessionID: String, data: I4FeatureStore = I4FeatureStore()) {
        self.sessionID = sessionID
        self.data = data
    }

    private var session: ClassSession? { data.session(id: sessionID) }
    private var sessionInline: String {
        SessionLabel.inline(for: session)
    }

    private var previousSession: ClassSession? {
        guard let session else { return nil }
        return HomeworkRules.previousSession(data.sessions(in: session.classId), before: session)
    }

    private var rows: [I4TicketRow] {
        guard let session else { return [] }
        let previous = previousSession
        let sections = previous.map { data.sections(sessionID: $0.id) } ?? []
        return data.students(enrolledOn: session).map { student in
            I4TicketRow(
                student: student,
                slip: data.slip(sessionID: sessionID, studentID: student.id),
                attendance: data.attendance(sessionID: sessionID, studentID: student.id)?.status,
                previousHomework: HomeworkRules.summary(sections: sections, grades: data.grades,
                                                        studentID: student.id),
                previousDate: previous?.date,
                previousHadSections: previous != nil
            )
        }
    }

    private var counts: (all: Int, unsent: Int) { CommentsRules.counts(rows) }
    private var visibleRows: [I4TicketRow] { CommentsRules.filtered(rows, filter) }
    private var sendableRows: [I4TicketRow] { CommentsRules.sendable(rows) }

    private var showsFooter: Bool {
        guard let session else { return false }
        return data.canReadCommentsReports && session.status != .cancelled && !rows.isEmpty
            && data.canWriteCommentsReports
    }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: 12) {
                content
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, 4)
            .padding(.bottom, TeacherMetrics.cardPadding)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if showsFooter { footer }
        }
        .sheet(item: $target) { target in
            ticketSheet(target)
        }
        .overlay {
            if showingSend { sendDialog }
        }
        .task {
            await data.configure(auth: auth)
            if let store = data.store {
                let source = AppSaveStatusSource(store: store)
                await source.refresh()
                saveStatusSource = source
            }
        }
        .onChange(of: sendController.phase) { oldPhase, newPhase in
            if oldPhase == .saved, newPhase == .idle, dismissSendAfterSuccess {
                closeSend()
                dismissSendAfterSuccess = false
            }
        }
        .onChange(of: SyncStatusCenter.shared.state) { _, _ in
            Task { await saveStatusSource?.refresh() }
        }
    }

    @ViewBuilder
    private var content: some View {
        if !data.canReadCommentsReports {
            AppEmptyState(title: String(localized: "feature.comments.ban.khong.co.quyen.xem.nhan.xet")) {
                Text(String(localized: "feature.comments.lien.he.admin.neu.ban.can.quyen.truy.cap")).appText(AppText.body)
            }
        } else if let session {
            if session.status == .cancelled {
                AppEmptyState(title: String(localized: "feature.comments.buoi.hoc.a.huy.nen.khong.co.phieu.buoi.hoc"))
            } else if rows.isEmpty {
                AppEmptyState(title: String(localized: "feature.comments.khong.co.hoc.sinh.e.nhan.xet"))
            } else {
                if let saveStatusSource { AppSaveStatus(kind: saveStatusSource.kind.errorOnly) }
                filters
                list
            }
        } else {
            AppEmptyState(title: String(localized: "feature.comments.khong.tim.thay.buoi.hoc.e.nhan.xet"))
        }
    }

    private var filters: some View {
        HStack(spacing: 6) {
            ForEach(TicketFilter.allCases, id: \.self) { option in
                Button { filter = option } label: {
                    AppChip(title: CommentsRules.filterLabel(option, counts), selected: filter == option)
                        .frame(minHeight: AppMetrics.tap)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(filter == option ? [.isSelected] : [])
            }
        }
    }

    private var list: some View {
        VStack(spacing: 8) {
            if visibleRows.isEmpty {
                AppEmptyState(title: String(localized: "feature.comments.khong.co.hoc.sinh.trong.muc.nay"), size: .compact)
            }
            ForEach(visibleRows) { row in
                ticketCard(row)
            }
        }
    }

    private func ticketCard(_ row: I4TicketRow) -> some View {
        let badge = CommentsRules.badge(row)
        let line = CommentsRules.homeworkLine(row)
        return Button { open(row.student) } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    I4Avatar(name: row.student.name)
                    Text(row.student.name)
                        .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                        .foregroundStyle(AppColors.text)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    AppPill(title: badge.label, tone: badge.tone)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(AppColors.placeholder)
                }
                starsLine(row)
                Text(line.text)
                    .appText(AppTextStyle(size: 13, weight: line.warning ? .semiBold : .regular, lineHeight: 19.5))
                    .foregroundStyle(line.warning ? AppColors.warning : AppColors.muted)
            }
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func starsLine(_ row: I4TicketRow) -> some View {
        if let slip = row.slip, let stars = slip.stars {
            HStack(spacing: 8) {
                Text(String(repeating: "★", count: stars))
                    .font(.system(size: 16))
                    .foregroundStyle(I4Style.star)
                Text(String.localizedStringWithFormat(String(localized: "comments.card.stars", table: "Teacher"),
                                                      stars, slip.scale))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                    .foregroundStyle(AppColors.muted)
            }
            .frame(minHeight: 20)
        } else {
            Text(String(localized: row.getsDefaultSlip ? "comments.card.defaultSlip" : "comments.card.noSlip",
                        table: "Teacher"))
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
                .frame(minHeight: 20)
        }
    }

    /// Gửi phiếu cả lớp luôn ghim đáy màn, không cuộn theo danh sách.
    private var sendAvailability: CommentsRules.SendAvailability {
        CommentsRules.sendAvailability(sendableCount: sendableRows.count,
                                       isOnline: ConnectivityMonitor.shared.isOnline)
    }

    private var footer: some View {
        TeacherPinnedBar {
            if sendAvailability == .needsNetwork {
                Text(String(localized: "comments.send.needs_network", table: "Teacher"))
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                    .foregroundStyle(AppColors.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("comment.sendClass.disabledReason")
            }
            AppButton(
                title: String.localizedStringWithFormat(String(localized: "feature.comments.gui.phieu.ca.lop"), String(describing: (sendableRows.count))),
                systemImage: "paperplane",
                size: .large
            ) { showingSend = true }
                .disabled(sendAvailability != .ready)
                .accessibilityIdentifier("comment.sendClass")
        }
    }

    private var sendDialog: some View {
        let ungraded = CommentsRules.ungradedNotice(rows)
        let skipped = CommentsRules.withoutSlip(rows.filter { !$0.isSent })
        let previousLabel = CommentsRules.previousLabel(date: rows.first?.previousDate)
        return I4Dialog(title: String.localizedStringWithFormat(String(localized: "feature.comments.gui.phieu.buoi"), sessionInline), content: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    statCard(value: "\(sendableRows.count)", label: String(localized: "feature.comments.ticketsToSend"),
                             foreground: AppColors.primaryInk, background: AppColors.primarySoft)
                    statCard(value: "\(skipped.count)", label: String(localized: "comments.send.skippedStat", table: "Teacher"),
                             foreground: AppColors.warning, background: AppColors.warningSoft)
                }
                if ungraded.parts > 0 {
                    warningText(String.localizedStringWithFormat(String(localized: "feature.comments.em.phan.btvn.con.chua.cham.van.gui.uoc.phu.huynh"), String(describing: (ungraded.students)), String(describing: (ungraded.parts)), String(describing: (previousLabel))))
                }
                  let homeworkSuffix = ungraded.parts > 0
                      ? String.localizedStringWithFormat(String(localized: "feature.comments.homeworkResultSuffix"), previousLabel)
                      : String(localized: "feature.comments.sentencePeriod")
                  Text(LocalizedStringKey(String.localizedStringWithFormat(String(localized: "feature.comments.phu.huynh.nhan.mot.thong.bao.cho.buoi.nay.gom.sa"), homeworkSuffix)))
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                    .foregroundStyle(AppColors.muted)
                if !skipped.isEmpty {
                    warningText(String.localizedStringWithFormat(String(localized: "comments.send.skipped", table: "Teacher"), skipped.map(\.student.name).joined(separator: ", ")))
                }
                if let sendError {
                    Text(sendError)
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.error)
                }
            }
        }, actions: {
            VStack(spacing: 8) {
                AppSaveButton(
                    title: sendError == nil
                        ? String.localizedStringWithFormat(String(localized: "feature.comments.gui.phieu"), String(describing: (sendableRows.count)))
                        : String(localized: "comments.send.retry", table: "Teacher"),
                    controller: sendController
                ) { try await send() }
                AppButton(title: String(localized: "feature.comments.quay.lai"), variant: .neutral, size: .large) { closeSend() }
            }
        }, dismiss: { closeSend() })
    }

    /// A send failure is explained inside the dialog only; it is dropped with the dialog so it can
    /// never outlive the attempt it belongs to.
    private func closeSend() {
        showingSend = false
        sendError = nil
    }

    private func statCard(value: String, label: String, foreground: Color, background: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .appText(AppTextStyle(size: 24, weight: .bold, lineHeight: 27.6))
            Text(label)
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
        }
        .foregroundStyle(foreground)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private func warningText(_ text: String) -> some View {
        Text(text)
            .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
            .foregroundStyle(AppColors.warning)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.warningSoft, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private func open(_ student: Student) {
        guard let session else { return }
        target = TicketTarget(session: session, student: student)
    }

    private func send() async throws {
        guard sendAvailability == .ready else {
            let message = String(localized: "comments.send.needs_network", table: "Teacher")
            sendError = message
            throw I4SaveFailure(message: message)
        }
        let ids = sendableRows.map(\.student.id)
        let outcome = await data.sendSlips(sessionID: sessionID, studentIDs: ids)
        switch outcome {
        case .sent:
            dismissSendAfterSuccess = true
            sendError = nil
            await saveStatusSource?.refresh()
        case .partial(_, let notSent):
            let message = String.localizedStringWithFormat(String(localized: "comments.send.partial", table: "Teacher"), notSent)
            sendError = message
            await saveStatusSource?.refresh()
            throw I4SaveFailure(message: message)
        case .failed(let message):
            sendError = message
            throw I4SaveFailure(message: message)
        }
    }

    // MARK: - Ticket sheet

    private func ticketSheet(_ target: TicketTarget) -> some View {
        let slip = data.slip(sessionID: target.session.id, studentID: target.student.id)
        let previous = HomeworkRules.previousSession(data.sessions(in: target.session.classId), before: target.session)
        let sections = previous.map { data.sections(sessionID: $0.id) } ?? []
        return I4TicketSheet(
            session: target.session,
            student: target.student,
            slip: slip,
            previousDate: previous?.date,
            sections: sections,
            grades: data.grades,
            canWrite: data.canWriteCommentsReports,
            saveStatusSource: saveStatusSource,
            onClose: { self.target = nil },
            onGoHomework: { self.target = nil },
            onSave: { grading, note in
                await data.saveSlip(sessionID: target.session.id, student: target.student,
                                    grading: grading, note: note)
            }
        )
    }
}

struct TicketTarget: Identifiable {
    let session: ClassSession
    let student: Student
    var id: String { "\(session.id):\(student.id)" }
}

/// The bottom sheet of one student (`CommentTicketSheet.tsx`).
struct I4TicketSheet: View {
    let session: ClassSession
    let student: Student
    let slip: SessionSlip?
    let previousDate: String?
    let sections: [HomeworkSection]
    let grades: [HomeworkGrade]
    let canWrite: Bool
    let saveStatusSource: AppSaveStatusSource?
    let onClose: () -> Void
    let onGoHomework: () -> Void
    let onSave: (I4FeatureStore.SlipGrading, String) async -> String?

    /// Criteria met; a new slip starts with all five, the homework one following last session's grades.
    @State private var criteria: Int
    /// The teacher set the homework criterion by hand on this open sheet.
    @State private var homeworkTouched = false
    /// The teacher ticked or unticked a criterion on this open sheet; until then a save only changes the note.
    @State private var criteriaTouched = false
    @State private var note: String = ""
    @State private var error: String?
    @State private var saveController = AppSaveController()
    @FocusState private var noteFocused: Bool

    init(session: ClassSession, student: Student, slip: SessionSlip?,
         previousDate: String?, sections: [HomeworkSection], grades: [HomeworkGrade],
         canWrite: Bool, saveStatusSource: AppSaveStatusSource?,
         onClose: @escaping () -> Void, onGoHomework: @escaping () -> Void,
         onSave: @escaping (I4FeatureStore.SlipGrading, String) async -> String?) {
        self.session = session
        self.student = student
        self.slip = slip
        self.previousDate = previousDate
        self.sections = sections
        self.grades = grades
        self.canWrite = canWrite
        self.saveStatusSource = saveStatusSource
        self.onClose = onClose
        self.onGoHomework = onGoHomework
        self.onSave = onSave
        let bits = HomeworkRules.openingCriteria(slip: slip, sections: sections, grades: grades, studentID: student.id)
        initialCriteria = bits
        _criteria = State(initialValue: bits)
        _note = State(initialValue: slip?.note ?? "")
    }

    private static let homeworkIndex = SlipRules.criteriaCount - 1
    private let initialCriteria: Int

    /// An old three-star slip keeps its stars and sentence; only its note can change.
    private var isLegacy: Bool { slip?.isLegacy == true && slip?.stars != nil }
    private var stars: Int { SlipRules.stars(criteria: criteria) }
    /// The homework criterion follows the grades until the teacher sets it by hand (now or on an earlier save).
    private var homeworkIsManual: Bool { homeworkTouched || slip?.hwManual == true }
    /// Nothing to save when the slip exists and nothing was changed.
    private var hasUnsavedChanges: Bool {
        slip == nil || criteria != initialCriteria || note != (slip?.note ?? "") || homeworkTouched
    }

    private var badge: (label: String, tone: AppPill.Tone) {
        if slip?.status == .sent { return (String(localized: "feature.comments.a.gui"), .success) }
        return (String(localized: "feature.comments.chua.gui"), .neutral)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: TeacherMetrics.slipSheetGap) {
                    header
                    if slip?.status == .sent {
                        Text(String(localized: "feature.comments.phu.huynh.thay.thay.oi.ngay"))
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            .foregroundStyle(AppColors.success)
                            .frame(maxWidth: .infinity)
                    }
                    if isLegacy {
                        legacyBox
                        noteField
                        homeworkBlock
                    } else {
                        scoreBox
                        criteriaGrid
                        mergedComment
                    }
                    if let error {
                        Text(error)
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            .foregroundStyle(AppColors.error)
                    }
                    if let saveStatusSource { AppSaveStatus(kind: saveStatusSource.kind.errorOnly) }
                }
                .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
                .padding(.bottom, 12)
                .contentShape(Rectangle())
                .onTapGesture { noteFocused = false }
            }
            .scrollDismissesKeyboard(.interactively)
        }
          .background(AppColors.surface)
          .safeAreaInset(edge: .bottom, spacing: 0) {
              if canWrite {
                  TeacherPinnedBar {
                      HStack(spacing: TeacherMetrics.contentGap) {
                          if hasUnsavedChanges { unsavedStatus }
                          AppSaveButton(title: String(localized: "feature.comments.luu"), controller: saveController, identifier: "comment.save") {
                              try await save()
                          }
                      }
                  }
              }
          }
          .presentationDetents([.large])
          .presentationDragIndicator(.hidden)
          .onChange(of: saveController.phase) { oldPhase, newPhase in
              if oldPhase == .saved, newPhase == .idle { onClose() }
          }
          .onChange(of: SyncStatusCenter.shared.state) { _, _ in
              Task { await saveStatusSource?.refresh() }
          }
    }

    private var header: some View {
        VStack(spacing: 12) {
            Capsule()
                .fill(AppColors.border)
                .frame(width: 44, height: 4)
                .frame(maxWidth: .infinity)
                .padding(.top, 8)
            HStack(spacing: 10) {
                I4Avatar(name: student.name, diameter: 44, fontSize: 14)
                VStack(alignment: .leading, spacing: 2) {
                    Text(student.name)
                        .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 25))
                        .foregroundStyle(AppColors.text)
                        .lineLimit(1)
                    Text(String.localizedStringWithFormat(String(localized: "comments.sheet.subtitle", table: "Teacher"), SessionLabel.title(for: session)))
                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                        .foregroundStyle(AppColors.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                AppPill(title: badge.label, tone: badge.tone)
            }
        }
    }

    private var unsavedStatus: some View {
        HStack(spacing: TeacherMetrics.slipChipGap) {
            Circle().fill(AppState.pendingFg).frame(width: TeacherMetrics.slipUnsavedDotSize, height: TeacherMetrics.slipUnsavedDotSize)
            Text(SlipSheetText.unsaved)
                .appText(AppText.label)
                .foregroundStyle(AppState.pendingFg)
        }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("comment.unsaved")
    }

    private var scoreBox: some View {
        HStack(spacing: TeacherMetrics.contentGap) {
            AppMascot(pose: .forStars(stars), height: AppMetrics.emptyMascotCompact)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    ForEach(0..<SlipRules.criteriaCount, id: \.self) { index in
                        Image(systemName: "star.fill")
                            .font(.system(size: TeacherMetrics.slipScoreStarSize))
                            .foregroundStyle(index < stars ? AppColors.warning : AppColors.border)
                    }
                }
                Text(SlipSheetText.scoreLine(stars: stars, canWrite: canWrite))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                    .accessibilityIdentifier("comment.stars")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, TeacherMetrics.slipScorePaddingHorizontal)
        .padding(.vertical, TeacherMetrics.slipScorePaddingVertical)
        .background(AppColors.neutralSoft, in: RoundedRectangle(cornerRadius: AppRadius.card))
        .accessibilityElement(children: .combine)
    }

    private var criteriaGrid: some View {
        VStack(spacing: TeacherMetrics.slipChipGap) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: TeacherMetrics.slipChipGap), GridItem(.flexible())],
                      spacing: TeacherMetrics.slipChipGap) {
                ForEach(0..<Self.homeworkIndex, id: \.self) { index in criterionChip(index) }
            }
            criterionChip(Self.homeworkIndex)
        }
    }

    private func criterionChip(_ index: Int) -> some View {
        let met = SlipRules.isMet(criteria, index: index)
        let isHomework = index == Self.homeworkIndex
        return Button {
            guard canWrite else { return }
            criteria = SlipRules.toggled(criteria, index: index)
            criteriaTouched = true
            if isHomework { homeworkTouched = true }
            error = nil
        } label: {
            HStack(spacing: TeacherMetrics.slipChipGap) {
                ZStack {
                    Circle()
                        .fill(met ? AppColors.primary : AppColors.surface)
                    Circle()
                        .strokeBorder(met ? AppColors.primary : AppColors.inputBorderStrong, lineWidth: 2)
                    if met {
                        Image(systemName: "checkmark")
                            .font(.system(size: TeacherMetrics.slipChipTickGlyphSize, weight: .bold))
                            .foregroundStyle(AppColors.onPrimary)
                    }
                }
                .frame(width: TeacherMetrics.slipChipTickSize, height: TeacherMetrics.slipChipTickSize)
                Text(SlipSheetText.criterion(index))
                    .appText(AppText.label)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                if isHomework {
                    Spacer(minLength: 0)
                    if !homeworkIsManual { AppPill(title: SlipSheetText.followsGrades, tone: .neutral) }
                }
            }
            .foregroundStyle(met ? AppState.selectedFg : AppColors.muted)
            .padding(.horizontal, TeacherMetrics.slipChipPaddingHorizontal)
            .frame(maxWidth: .infinity, minHeight: AppMetrics.tap, alignment: .leading)
            .background(met ? AppState.selectedBg : AppColors.surface,
                        in: RoundedRectangle(cornerRadius: AppRadius.control))
            .overlay {
                if !met {
                    RoundedRectangle(cornerRadius: AppRadius.control)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.hairline)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!canWrite)
        .accessibilityIdentifier("comment.criterion.\(index)")
        .accessibilityAddTraits(met ? [.isSelected] : [])
    }

    /// The sentence generated from the ticked criteria; it follows every tick and is never edited by hand.
    private var generatedSentence: String { SlipRules.generatedSentence(criteria: criteria) }

    /// Until a criterion is touched the slip shows its saved sentence (an old hand-written one included);
    /// after that the sentence follows the ticks.
    private var shownSentence: String {
        if !criteriaTouched, let stored = slip?.comment, !isLegacy { return stored }
        return generatedSentence
    }

    private var mergedComment: some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.sheetSectionGap) {
            Text(SlipSheetText.commentTitle)
                .appText(AppText.segment)
                .foregroundStyle(AppColors.text)
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(SlipSheetText.autoLabel)
                        .appText(AppText.caption)
                        .foregroundStyle(AppColors.muted)
                    Text(shownSentence)
                        .appText(AppText.chip)
                        .foregroundStyle(AppColors.text)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityIdentifier("comment.sentence")
                }
                .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
                .padding(.vertical, TeacherMetrics.commentBoxPadding)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.neutralSoft)
                TextField(SlipSheetText.notePlaceholder, text: $note, axis: .vertical)
                    .appText(AppText.chip)
                    .foregroundStyle(AppColors.text)
                    .focused($noteFocused)
                    .disabled(!canWrite)
                    .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
                    .padding(.vertical, TeacherMetrics.commentBoxPadding)
                    .frame(maxWidth: .infinity, minHeight: TeacherMetrics.slipNoteMinHeight, alignment: .topLeading)
                    .accessibilityIdentifier("comment.note")
            }
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: AppRadius.control))
            .overlay {
                RoundedRectangle(cornerRadius: AppRadius.control)
                    .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.hairline)
            }
        }
    }

    private var legacyBox: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(String(repeating: "★", count: slip?.stars ?? 0))
                    .font(.system(size: 16))
                    .foregroundStyle(I4Style.star)
                Text(String.localizedStringWithFormat(String(localized: "comments.card.stars", table: "Teacher"),
                                                      slip?.stars ?? 0, slip?.scale ?? SessionSlip.legacyScale))
                    .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                    .foregroundStyle(AppColors.text)
            }
            HStack(spacing: 12) {
                AppMascot(pose: .forStars(slip?.stars, scale: slip?.scale ?? SessionSlip.legacyScale), height: AppMetrics.ticketMascot)
                Text(slip.map(SlipRules.sentence(for:)) ?? "")
                    .appText(AppTextStyle(size: 16, weight: .regular, lineHeight: 24.8))
                    .foregroundStyle(AppColors.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
            Text(String(localized: "slip.sheet.legacy", table: "Teacher"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
        }
    }

    private var noteField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
                Text(String(localized: "feature.comments.ghi.chu"))
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                Text(String(localized: "feature.comments.khong.bat.buoc"))
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            }
            TextField(String(localized: "feature.comments.ghi.chu.them.cho.phu.huynh"), text: $note, axis: .vertical)
                .lineLimit(2...5)
                .font(.system(size: 15))
                .foregroundStyle(AppColors.text)
                .padding(12)
                .frame(maxWidth: .infinity, minHeight: TeacherMetrics.rowMinHeight, alignment: .topLeading)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .focused($noteFocused)
                .disabled(!canWrite)
                .accessibilityIdentifier("comment.note")
        }
    }

    private var homeworkBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                Text(previousDate == nil ? String(localized: "feature.comments.previousHomework") : CommentsRules.homeworkPrefix(date: previousDate))
                    .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                Text(String(localized: "feature.comments.chi.oc"))
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            }
            if sections.isEmpty {
                Text(previousDate == nil
                     ? String(localized: "feature.comments.buoi.au.chua.co.btvn.buoi.truoc")
                     : String(localized: "feature.comments.buoi.truoc.khong.giao.btvn"))
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            } else {
                ForEach(sections, id: \.id) { section in
                    homeworkRow(section)
                }
            }
            if canWrite {
                Button { onGoHomework() } label: {
                    HStack(spacing: 4) {
                        Text(String(localized: "feature.comments.cham.o.tab.bai.tap.ve.nha"))
                            .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                        Image(systemName: "chevron.right").font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundStyle(AppColors.primaryInk)
                    .frame(minHeight: AppMetrics.tap)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.top, 12)
        .overlay(alignment: .top) { AppColors.divider.frame(height: AppMetrics.hairline) }
    }

    private func homeworkRow(_ section: HomeworkSection) -> some View {
        let level = grades.first { $0.sectionId == section.id && $0.studentId == student.id }?.level
        return HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(section.kind.label)
                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
            Text(level?.label ?? String(localized: "feature.comments.chua.cham"))
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(level?.foreground ?? AppColors.warning)
        }
    }

    private func save() async throws {
        let note = self.note
        let grading: I4FeatureStore.SlipGrading = isLegacy
            ? .legacy
            : (slip != nil && !criteriaTouched
               ? .noteOnly
               : .criteria(criteria, comment: generatedSentence, hwManual: homeworkTouched ? true : nil))
        if let failure = await onSave(grading, note) {
            error = failure
            throw I4SaveFailure(message: failure)
        }
        await saveStatusSource?.refresh()
    }
}
