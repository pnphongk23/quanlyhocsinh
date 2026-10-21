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
    @State private var toast: String?

    init(sessionID: String, data: I4FeatureStore = .demo) {
        self.sessionID = sessionID
        self.data = data
    }

    private var session: ClassSession? { data.session(id: sessionID) }

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
                previousHomework: HomeworkRules.summary(sections: sections, grades: data.grades,
                                                        studentID: student.id),
                previousSessionNumber: previous?.sessionNumber,
                previousHadSections: previous != nil
            )
        }
    }

    private var leftStudents: [Student] {
        guard let session else { return [] }
        return data.students(leftBefore: session)
    }

    private var counts: (all: Int, none: Int, unsent: Int) { CommentsRules.counts(rows) }
    private var visibleRows: [I4TicketRow] { CommentsRules.filtered(rows, filter) }
    private var sendableRows: [I4TicketRow] { CommentsRules.sendable(rows) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content
        }
        .sheet(item: $target) { target in
            ticketSheet(target)
        }
        .overlay {
            if showingSend { sendDialog }
        }
        .task { await data.configure(auth: auth) }
    }

    @ViewBuilder
    private var content: some View {
        if !data.canReadCommentsReports {
            AppEmptyState(title: "Bạn không có quyền xem nhận xét") {
                Text("Liên hệ Admin nếu bạn cần quyền truy cập.").appText(AppText.body)
            }
        } else if let session {
            if session.status == .cancelled {
                AppEmptyState(title: "Buổi học đã hủy nên không có phiếu buổi học")
            } else if rows.isEmpty && leftStudents.isEmpty {
                AppEmptyState(title: "Không có học sinh để nhận xét")
            } else {
                if !leftStudents.isEmpty { infoBanner(session) }
                filters
                if let sendError {
                    I4Banner(text: sendError, tone: .error, systemImage: "exclamationmark.triangle",
                             horizontal: 16, vertical: 12)
                }
                list
                if data.canWriteCommentsReports { footer }
            }
        } else {
            AppEmptyState(title: "Không tìm thấy buổi học để nhận xét")
        }
    }

    private func infoBanner(_ session: ClassSession) -> some View {
        I4Banner(text: "Phiếu của buổi chỉ gồm em đang học vào ngày đó. Buổi \(session.sessionNumber ?? 0) có \(rows.count) em.")
    }

    private var filters: some View {
        HStack(spacing: 6) {
            ForEach(TicketFilter.allCases, id: \.self) { option in
                Button { filter = option } label: {
                    Text(CommentsRules.filterLabel(option, counts))
                        .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                        .foregroundStyle(filter == option ? AppColors.onPrimary : AppColors.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .padding(.horizontal, 10)
                        .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                        .background(filter == option ? AppColors.primary : AppColors.surface,
                                    in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(filter == option ? [.isSelected] : [])
            }
        }
    }

    private var list: some View {
        VStack(spacing: 8) {
            if visibleRows.isEmpty {
                AppEmptyState(title: "Không có học sinh trong mục này")
            }
            ForEach(visibleRows) { row in
                ticketCard(row)
            }
            if filter == .all {
                ForEach(leftStudents, id: \.id) { student in
                    leftCard(student)
                }
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
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func starsLine(_ row: I4TicketRow) -> some View {
        if let stars = row.stars {
            HStack(spacing: 2) {
                Text(String(repeating: "★", count: stars.rawValue))
                    .font(.system(size: 16))
                    .foregroundStyle(I4Style.star)
            }
            .frame(minHeight: 20)
        } else {
            Text("Chưa chọn sao")
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(AppColors.warning)
                .frame(minHeight: 20)
        }
    }

    private func leftCard(_ student: Student) -> some View {
        let oldSession = oldTicketSession(for: student)
        return VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                I4Avatar(name: student.name)
                Text(student.name)
                    .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                AppPill(title: "Đã rời lớp · \(I4Format.dayMonth(student.leftAt ?? session?.date ?? ""))",
                        tone: .neutral)
            }
            Text("Không có phiếu từ buổi \(session?.sessionNumber ?? 0). Phiếu buổi \((session?.sessionNumber ?? 0) - 1) trở về trước vẫn giữ.")
                .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                .foregroundStyle(AppColors.muted)
            if let oldSession {
                Button {
                    target = TicketTarget(session: oldSession, student: student)
                } label: {
                    Text("Xem phiếu cũ của em")
                        .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.primaryInk)
                        .frame(minHeight: AppMetrics.tap)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
        .overlay(
            RoundedRectangle(cornerRadius: AppRadius.card)
                .strokeBorder(AppColors.inputBorderStrong, style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
    }

    private var footer: some View {
        VStack(spacing: 8) {
            if let toast { I4Toast(text: toast) }
            Button { showingSend = true } label: {
                HStack(spacing: 8) {
                    Image(systemName: "paperplane").font(.system(size: 16, weight: .regular))
                    Text("Gửi phiếu cả lớp (\(sendableRows.count))")
                        .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                }
                .foregroundStyle(sendableRows.isEmpty ? AppColors.placeholder : AppColors.onPrimary)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.buttonHeightLarge)
                .background(sendableRows.isEmpty ? AppColors.neutralSoft : AppColors.primary,
                            in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .buttonStyle(.plain)
            .disabled(sendableRows.isEmpty)
        }
        .padding(.top, 4)
    }

    private var sendDialog: some View {
        let ungraded = CommentsRules.ungradedNotice(rows)
        let skipped = rows.filter { $0.stars == nil }
        let previousLabel = rows.first?.previousSessionNumber.map { "buổi \($0)" } ?? "buổi trước"
        return I4Dialog(title: "Gửi phiếu buổi \(session?.sessionNumber ?? 0)?", content: {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    statCard(value: "\(sendableRows.count)", label: "phiếu sẽ gửi",
                             foreground: AppColors.primaryInk, background: AppColors.primarySoft)
                    statCard(value: "\(skipped.count)", label: "em chưa chọn sao",
                             foreground: AppColors.warning, background: AppColors.warningSoft)
                }
                if ungraded.parts > 0 {
                    warningText("\(ungraded.students) em · \(ungraded.parts) phần BTVN \(previousLabel) còn “Chưa chấm”. Vẫn gửi được. Phụ huynh thấy “Chưa chấm” cho tới khi bạn chấm; chấm xong thì thấy ngay.")
                }
                Text("Phụ huynh nhận **một thông báo** cho buổi này, gồm sao, câu mẫu, ghi chú\(ungraded.parts > 0 ? " và kết quả BTVN \(previousLabel)." : ".")")
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                    .foregroundStyle(AppColors.muted)
                if !skipped.isEmpty {
                    warningText("Chưa gửi được: \(skipped.map(\.student.name).joined(separator: ", ")). Chọn sao rồi gửi lại sau.")
                }
                if let sendError {
                    Text(sendError)
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.error)
                }
            }
        }, actions: {
            VStack(spacing: 8) {
                AppButton(title: "Gửi \(sendableRows.count) phiếu", size: .large) { send() }
                AppButton(title: "Quay lại", variant: .neutral, size: .large) { showingSend = false }
            }
        }, dismiss: { showingSend = false })
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

    private func oldTicketSession(for student: Student) -> ClassSession? {
        guard let session else { return nil }
        let candidates = data.slips
            .filter { $0.studentId == student.id && data.session(id: $0.sessionId)?.classId == session.classId }
            .compactMap { data.session(id: $0.sessionId) }
            .filter { ($0.date, $0.startTime) <= (session.date, session.startTime) }
        return HomeworkRules.ordered(candidates).last
    }

    private func send() {
        let ids = sendableRows.map(\.student.id)
        let sessionID = self.sessionID
        Task {
            let outcome = await data.sendSlips(sessionID: sessionID, studentIDs: ids)
            switch outcome {
            case .sent:
                showingSend = false
                sendError = nil
                toast = nil
            case .queued:
                showingSend = false
                sendError = nil
                toast = "Sẽ gửi khi có mạng"
            case .failed(let message):
                sendError = message
            }
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
            previousSessionNumber: previous?.sessionNumber,
            sections: sections,
            grades: data.grades,
            canWrite: data.canWriteCommentsReports,
            onClose: { self.target = nil },
            onGoHomework: { self.target = nil },
            onSave: { stars, note in
                if let failure = await data.saveSlip(sessionID: target.session.id, student: target.student,
                                                     stars: stars, note: note) {
                    return failure
                }
                self.target = nil
                return nil
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
    let previousSessionNumber: Int?
    let sections: [HomeworkSection]
    let grades: [HomeworkGrade]
    let canWrite: Bool
    let onClose: () -> Void
    let onGoHomework: () -> Void
    let onSave: (Stars?, String) async -> String?

    @State private var stars: Stars?
    @State private var note: String = ""
    @State private var error: String?
    @State private var saving = false

    init(session: ClassSession, student: Student, slip: SessionSlip?,
         previousSessionNumber: Int?, sections: [HomeworkSection], grades: [HomeworkGrade],
         canWrite: Bool, onClose: @escaping () -> Void, onGoHomework: @escaping () -> Void,
         onSave: @escaping (Stars?, String) async -> String?) {
        self.session = session
        self.student = student
        self.slip = slip
        self.previousSessionNumber = previousSessionNumber
        self.sections = sections
        self.grades = grades
        self.canWrite = canWrite
        self.onClose = onClose
        self.onGoHomework = onGoHomework
        self.onSave = onSave
        _stars = State(initialValue: slip?.stars)
        _note = State(initialValue: slip?.note ?? "")
    }

    private var badge: (label: String, tone: AppPill.Tone) {
        if slip?.status == .sent { return ("Đã gửi", .success) }
        return ("Chưa gửi", .neutral)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    if slip?.status == .sent {
                        Text("Phụ huynh thấy thay đổi ngay")
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            .foregroundStyle(AppColors.success)
                            .frame(maxWidth: .infinity)
                    } else if canWrite {
                        draftHint
                    }
                    starPicker
                    templateBox
                    noteField
                    homeworkBlock
                    if let error {
                        Text(error)
                            .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                            .foregroundStyle(AppColors.error)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 12)
            }
            if canWrite {
                AppButton(title: "Lưu", size: .large) { save() }
                    .disabled(saving)
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 20)
                    .overlay(alignment: .top) { AppColors.border.frame(height: 1) }
            }
        }
        .background(AppColors.surface)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
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
                    Text("Nhận xét buổi \(session.sessionNumber ?? 0) · \(I4Format.dayMonth(session.date))")
                        .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                        .foregroundStyle(AppColors.muted)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                AppPill(title: badge.label, tone: badge.tone)
            }
        }
    }

    private var draftHint: some View {
        HStack(alignment: .center, spacing: 8) {
            Text("Nháp, chưa lưu")
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                .foregroundStyle(AppColors.warning)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(AppColors.warningSoft, in: Capsule())
            Text("Sao và ghi chú được giữ khi bạn đóng sheet.")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2))
                .foregroundStyle(AppColors.muted)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var starPicker: some View {
        HStack(spacing: 8) {
            ForEach(Stars.allCases, id: \.self) { option in
                Button { if canWrite { stars = option; error = nil } } label: {
                    Text(String(repeating: "★", count: option.rawValue))
                        .font(.system(size: 16))
                        .foregroundStyle(I4Style.star)
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(stars == option ? AppColors.warningSoft : AppColors.background,
                                    in: RoundedRectangle(cornerRadius: AppRadius.button))
                        .overlay(
                            RoundedRectangle(cornerRadius: AppRadius.button)
                                .strokeBorder(stars == option ? I4Style.star : .clear, lineWidth: 2))
                }
                .buttonStyle(.plain)
                .disabled(!canWrite)
                .accessibilityLabel("\(option.rawValue) sao")
                .accessibilityAddTraits(stars == option ? [.isSelected] : [])
            }
        }
    }

    private var templateBox: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(stars?.template ?? "Chọn mức sao để xem câu mẫu gửi phụ huynh.")
                .appText(AppTextStyle(size: 16, weight: .regular, lineHeight: 24.8))
                .foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 6) {
                Image(systemName: "lock").font(.system(size: 12, weight: .regular))
                Text("Câu mẫu cố định theo mức sao")
                    .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
            }
            .foregroundStyle(AppColors.muted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
    }

    private var noteField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
                Text("Ghi chú")
                    .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                Text("· không bắt buộc")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            }
            TextField("Ghi chú thêm cho phụ huynh…", text: $note, axis: .vertical)
                .lineLimit(2...5)
                .font(.system(size: 15))
                .foregroundStyle(AppColors.text)
                .padding(12)
                .frame(maxWidth: .infinity, minHeight: 56, alignment: .topLeading)
                .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.button))
                .disabled(!canWrite)
        }
    }

    private var homeworkBlock: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 0) {
                Text(previousSessionNumber.map { "BTVN buổi \($0)" } ?? "BTVN buổi trước")
                    .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                    .foregroundStyle(AppColors.text)
                Text(" · chỉ đọc")
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            }
            if sections.isEmpty {
                Text(previousSessionNumber == nil
                     ? "Buổi đầu · chưa có BTVN buổi trước"
                     : "Buổi trước không giao BTVN")
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
                        Text("Chấm ở tab Bài tập về nhà")
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
        .overlay(alignment: .top) { AppColors.divider.frame(height: 1) }
    }

    private func homeworkRow(_ section: HomeworkSection) -> some View {
        let level = grades.first { $0.sectionId == section.id && $0.studentId == student.id }?.level
        return HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(section.kind.label)
                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
            Text(level?.label ?? "Chưa chấm")
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                .foregroundStyle(level?.foreground ?? AppColors.warning)
        }
    }

    private func save() {
        guard !saving else { return }
        saving = true
        let stars = self.stars
        let note = self.note
        Task {
            let failure = await onSave(stars, note)
            saving = false
            if let failure { error = failure }
        }
    }
}
