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

    /// Criteria met; a new slip starts with all five.
    @State private var criteria: Int
    /// The edited sentence; nil while the sentence follows the stars.
    @State private var commentOverride: String?
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
        let current = slip.flatMap { $0.isLegacy ? nil : $0 }
        _criteria = State(initialValue: current?.criteria ?? SlipRules.allCriteria)
        _commentOverride = State(initialValue: current?.comment)
        _note = State(initialValue: slip?.note ?? "")
    }

    /// An old three-star slip keeps its stars and sentence; only its note can change.
    private var isLegacy: Bool { slip?.isLegacy == true && slip?.stars != nil }
    private var stars: Int { SlipRules.stars(criteria: criteria) }
    private var defaultSentence: String { SlipRules.defaultSentence(stars: stars) }

    private var badge: (label: String, tone: AppPill.Tone) {
        if slip?.status == .sent { return (String(localized: "feature.comments.a.gui"), .success) }
        return (String(localized: "feature.comments.chua.gui"), .neutral)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    if slip?.status == .sent {
                        Text(String(localized: "feature.comments.phu.huynh.thay.thay.oi.ngay"))
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            .foregroundStyle(AppColors.success)
                            .frame(maxWidth: .infinity)
                    }
                    if isLegacy {
                        legacyBox
                    } else {
                        criteriaList
                        commentBox
                    }
                    noteField
                    homeworkBlock
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
                      AppSaveButton(title: String(localized: "feature.comments.luu"), controller: saveController,
                                      isEnabled: isLegacy || !commentTooLong, identifier: "comment.save") {
                          try await save()
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

    private var criteriaList: some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.sheetSectionGap) {
            HStack {
                Text(String(localized: "slip.sheet.criteria", table: "Teacher"))
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                Spacer(minLength: 0)
                Text(String(repeating: "★", count: stars))
                    .font(.system(size: 16))
                    .foregroundStyle(I4Style.star)
                Text(String.localizedStringWithFormat(String(localized: "slip.sheet.stars", table: "Teacher"), stars))
                    .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                    .foregroundStyle(AppColors.text)
                    .accessibilityIdentifier("comment.stars")
            }
            ForEach(0..<SlipRules.criteriaCount, id: \.self) { index in
                let met = SlipRules.isMet(criteria, index: index)
                Button { if canWrite { criteria = SlipRules.toggled(criteria, index: index); error = nil } } label: {
                    HStack(spacing: TeacherMetrics.criterionRowGap) {
                        Image(systemName: met ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 22))
                            .foregroundStyle(met ? AppColors.primaryInk : AppColors.placeholder)
                        Text(SlipRules.criterionTitle(index))
                            .appText(AppTextStyle(size: 16, weight: .regular, lineHeight: 24))
                            .foregroundStyle(AppColors.text)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.horizontal, AppMetrics.cardPaddingHorizontal)
                    .frame(maxWidth: .infinity, minHeight: TeacherMetrics.rowMinHeight, alignment: .leading)
                    .background(met ? AppState.selectedBg : AppColors.background,
                                in: RoundedRectangle(cornerRadius: AppRadius.button))
                }
                .buttonStyle(.plain)
                .disabled(!canWrite)
                .accessibilityIdentifier("comment.criterion.\(index)")
                .accessibilityAddTraits(met ? [.isSelected] : [])
            }
        }
    }

    private var commentText: Binding<String> {
        Binding(get: { commentOverride ?? defaultSentence }, set: { commentOverride = $0 })
    }

    private var commentTooLong: Bool { SlipRules.isCommentTooLong(commentOverride ?? defaultSentence) }

    private var showsUseDefault: Bool {
        guard let commentOverride else { return false }
        return commentOverride != defaultSentence
    }

    private var commentBox: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "slip.sheet.comment", table: "Teacher"))
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
            HStack(alignment: .top, spacing: 12) {
                AppMascot(pose: .forStars(stars), height: AppMetrics.ticketMascot)
                TextField(String(localized: "slip.sheet.comment", table: "Teacher"), text: commentText, axis: .vertical)
                    .lineLimit(2...6)
                    .font(.system(size: 16))
                    .foregroundStyle(AppColors.text)
                    .focused($noteFocused)
                    .disabled(!canWrite)
                    .accessibilityIdentifier("comment.sentence")
            }
            .padding(TeacherMetrics.commentBoxPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
            if canWrite {
                commentCounter
            }
            if canWrite && showsUseDefault {
                Button { commentOverride = nil } label: {
                    Text(String(localized: "slip.sheet.useDefault", table: "Teacher"))
                        .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.primaryInk)
                        .frame(minHeight: AppMetrics.tap)
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("comment.useDefault")
            }
        }
    }

    private var commentCounter: some View {
        let length = SlipRules.commentLength(commentOverride ?? defaultSentence)
        return VStack(alignment: .leading, spacing: TeacherMetrics.sheetSectionGap) {
            if commentTooLong {
                Text(String.localizedStringWithFormat(String(localized: "slip.sheet.commentTooLong", table: "Teacher"), SlipRules.maxCommentLength))
                    .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                    .foregroundStyle(AppColors.error)
                    .accessibilityIdentifier("comment.tooLong")
            }
            Text(String.localizedStringWithFormat(String(localized: "slip.sheet.commentCounter", table: "Teacher"), length, SlipRules.maxCommentLength))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(commentTooLong ? AppColors.error : AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityIdentifier("comment.counter")
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
        if commentTooLong, !isLegacy {
            let message = String.localizedStringWithFormat(String(localized: "slip.sheet.commentTooLong", table: "Teacher"), SlipRules.maxCommentLength)
            error = message
            throw I4SaveFailure(message: message)
        }
        let note = self.note
        let grading: I4FeatureStore.SlipGrading = isLegacy
            ? .legacy
            : .criteria(criteria, comment: commentOverride.flatMap { SlipRules.normalizedComment($0, stars: stars) })
        if let failure = await onSave(grading, note) {
            error = failure
            throw I4SaveFailure(message: failure)
        }
        await saveStatusSource?.refresh()
    }
}
