import SwiftUI

struct TeacherRootView: View {
    @Environment(AuthModel.self) private var auth
    @State private var data = TeacherFeatureData()
    @State private var i4Data = I4FeatureStore()
    @State private var tab = TeacherTab.classes

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack {
                TeacherClassListView(data: data, i4Data: i4Data)
            }
            .tabItem { Label("Lớp", systemImage: "rectangle.stack") }
            .tag(TeacherTab.classes)

            NavigationStack {
                TeacherCalendarView(data: data, i4Data: i4Data)
            }
            .tabItem { Label("Lịch", systemImage: "calendar") }
            .tag(TeacherTab.calendar)

            NavigationStack {
                TeacherSettingsView(data: data)
            }
            .tabItem { Label("Cài đặt", systemImage: "gearshape") }
            .tag(TeacherTab.settings)
        }
        .tint(AppColors.primary)
        .task {
            await data.configure(auth: auth)
            await i4Data.configure(auth: auth)
        }
    }
}

private enum TeacherTab: Hashable { case classes, calendar, settings }
private struct ClassRoute: Hashable { let id: String }

private struct TeacherClassListView: View {
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var showingCreate = false
    @State private var query = ""

    private var classes: [Classroom] {
        data.classes.filter { $0.status == .active && (query.isEmpty || $0.name.localizedCaseInsensitiveContains(query)) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if let error = data.errorMessage { TeacherInlineError(message: error) }
                if !data.canReadClasses {
                    AppEmptyState(title: "Bạn không có quyền xem lớp")
                } else if !data.isReady {
                    AppEmptyState(title: "Đang tải lớp học")
                } else if classes.isEmpty {
                    AppEmptyState(title: "Chưa có lớp học") {
                        if data.canWriteClasses { AppButton(title: "Tạo lớp đầu tiên", size: .medium) { showingCreate = true } }
                    }
                } else {
                    if let today = todaySession, let todayClass = data.classroom(id: today.classId) {
                        todayCard(session: today, classroom: todayClass)
                    }
                    searchField
                    if classes.isEmpty {
                        AppEmptyState(title: "Không tìm thấy lớp")
                    }
                    ForEach(classes, id: \.id) { klass in classRow(klass) }
                }
            }
            .padding(16)
        }
        .background(AppColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .safeAreaInset(edge: .bottom) {
            if data.canWriteClasses {
                AppButton(title: "Tạo lớp mới", systemImage: "plus", size: .large) { showingCreate = true }
                    .padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 4)
                    .background(AppColors.background)
            }
        }
        .navigationDestination(for: ClassRoute.self) { route in
            TeacherClassDetailView(classID: route.id, data: data, i4Data: i4Data)
        }
        .sheet(isPresented: $showingCreate) { TeacherClassFormView(data: data) }
        .refreshable { await data.refresh() }
    }

    private var todaySession: ClassSession? {
        data.sessions.first { $0.date == TeacherFeatureData.todayString && $0.status == .planned }
    }

    private var header: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Xin chào, \(data.displayName)").appText(AppText.muted).foregroundStyle(AppColors.muted)
                Text("Lớp của tôi").appText(AppText.title).foregroundStyle(AppColors.text)
            }
            Spacer()
            avatar
        }
    }

    private var avatar: some View {
        Text(initials)
            .appText(AppText.label).foregroundStyle(AppColors.primaryInk)
            .frame(width: AppMetrics.tap, height: AppMetrics.tap)
            .background(AppColors.primarySoft, in: Circle())
    }

    private var initials: String {
        let words = data.displayName.split(separator: " ").suffix(2)
        let letters = words.compactMap(\.first).map(String.init)
        return letters.joined().uppercased()
    }

    private var searchField: some View {
        TextField("Tìm lớp", text: $query)
            .appText(AppText.body)
            .padding(.horizontal, 14).frame(height: 48)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
    }

    private func todayCard(session: ClassSession, classroom: Classroom) -> some View {
        NavigationLink(value: ClassRoute(id: classroom.id)) {
            HStack(spacing: 12) {
                todayCardTitle(session: session, classroom: classroom)
                Spacer()
                Text("Điểm danh").appText(AppText.buttonSmall)
                    .foregroundStyle(AppColors.primaryInk)
                    .padding(.horizontal, 12).padding(.vertical, 10)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .foregroundStyle(AppColors.onPrimary)
            .padding(16)
            .background(AppColors.primary, in: RoundedRectangle(cornerRadius: AppRadius.card))
        }
        .buttonStyle(.plain)
    }

    private func todayCardTitle(session: ClassSession, classroom: Classroom) -> some View {
        let startTime = classroom.startTime ?? session.startTime
        let date = TeacherDateFormat.display(session.date)
        return VStack(alignment: .leading, spacing: 3) {
            Text("Hôm nay · \(startTime)").appText(AppText.muted)
            Text("\(classroom.name) · \(date)").appText(AppText.subheading)
        }
    }

    private func classRow(_ klass: Classroom) -> some View {
        NavigationLink(value: ClassRoute(id: klass.id)) {
            AppCard {
                VStack(alignment: .leading, spacing: 12) {
                    Text(klass.name).appText(AppText.heading).foregroundStyle(AppColors.text)
                    HStack(spacing: 8) {
                        AppChip(title: studentCountTitle(klass))
                        AppChip(title: attendanceTitle(klass))
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func studentCountTitle(_ klass: Classroom) -> String {
        let active = data.students(in: klass.id).filter { $0.status == .active }.count
        return "\(active) học sinh"
    }

    private func attendanceTitle(_ klass: Classroom) -> String {
        let rate = data.attendanceRate(in: klass.id).map { "\($0)%" } ?? "—"
        return "Chuyên cần \(rate)"
    }
}

private struct TeacherClassFormView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var data: TeacherFeatureData
    let existing: Classroom?
    @State private var name = ""
    @State private var weekdays: Set<Int> = []
    @State private var time = Date.now
    @State private var error: String?
    @State private var saving = false

    init(data: TeacherFeatureData, existing: Classroom? = nil) {
        self.data = data; self.existing = existing
        _name = State(initialValue: existing?.name ?? "")
        _weekdays = State(initialValue: Set(existing?.weekdays ?? []))
        let parts = (existing?.startTime ?? "18:30").split(separator: ":").compactMap { Int($0) }
        var components = DateComponents(); components.hour = parts.first ?? 18; components.minute = parts.dropFirst().first ?? 30
        _time = State(initialValue: Calendar.current.date(from: components) ?? .now)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Tên lớp", text: $name)
                        .accessibilityIdentifier("class.name")
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Ngày học lặp lại").appText(AppText.label)
                        HStack(spacing: 6) {
                            ForEach(Array(zip([2,3,4,5,6,7,1], ["T2","T3","T4","T5","T6","T7","CN"])), id: \.0) { day, label in
                                let selected = weekdays.contains(day)
                                Button(label) { if selected { weekdays.remove(day) } else { weekdays.insert(day) } }
                                    .font(.system(size: 13, weight: .semibold))
                                    .frame(maxWidth: .infinity, minHeight: 40)
                                    .background(selected ? AppColors.primarySoft : AppColors.background, in: RoundedRectangle(cornerRadius: 10))
                                    .foregroundStyle(selected ? AppColors.primaryInk : AppColors.muted)
                            }
                        }
                    }
                    DatePicker("Giờ bắt đầu", selection: $time, displayedComponents: .hourAndMinute)
                    Text("Mỗi bài kiểm tra có thang điểm riêng, mặc định 15; sửa được khi tạo bài.")
                        .appText(AppText.muted).foregroundStyle(AppColors.muted)
                }
                if let error { Text(error).foregroundStyle(AppColors.error).appText(AppText.muted) }
                Section {
                    Button(saving ? "Đang lưu…" : existing == nil ? "Tạo lớp" : "Lưu thay đổi") { Task { await save() } }
                        .disabled(saving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || weekdays.isEmpty)
                }
            }
            .navigationTitle(existing == nil ? "Tạo lớp mới" : "Sửa lớp")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Đóng") { dismiss() } } }
        }
        .presentationDetents([.large])
    }

    private func save() async {
        saving = true; defer { saving = false }
        let timeText = time.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
        do {
            if let existing { try await data.updateClass(existing, name: name, weekdays: Array(weekdays), time: timeText) }
            else { try await data.createClass(name: name, weekdays: Array(weekdays), time: timeText) }
            dismiss()
        } catch { self.error = "Không lưu được lớp. Vui lòng thử lại." }
    }
}

private struct TeacherClassDetailView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var selected = "buoi-hoc"
    @State private var showingStudents = false
    @State private var showingEdit = false
    @State private var showingNewSession = false
    @State private var confirmingArchive = false

    private var tabs: [(String, String)] {
        var result: [(String, String)] = []
        if data.canReadAttendance { result.append(("buoi-hoc", "Buổi học")) }
        if data.canReadStudents { result.append(("hoc-sinh", "Học sinh")) }
        if data.canReadAttendance { result.append(("diem-danh", "Điểm danh")) }
        if data.canReadScores { result.append(("bai-kiem-tra", "Bài kiểm tra")); result.append(("bang-diem", "Bảng điểm")) }
        if data.canReadReports { result.append(("bao-cao", "Báo cáo")) }
        return result
    }
    private var klass: Classroom? { data.classroom(id: classID) }

    var body: some View {
        VStack(spacing: 0) {
            if !data.canReadClasses {
                AppEmptyState(title: "Bạn không có quyền xem lớp")
            } else if let klass {
                detailHeader(klass)
                tabStrip
                AppColors.border.frame(height: 1)
                tabContent
            } else {
                AppEmptyState(title: "Không tìm thấy lớp")
            }
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showingStudents) { TeacherStudentsView(classID: classID, data: data) }
        .sheet(isPresented: $showingEdit) { if let klass { TeacherClassFormView(data: data, existing: klass) } }
        .sheet(isPresented: $showingNewSession) { TeacherOneOffSessionForm(classID: classID, data: data) }
        .confirmationDialog("Lưu trữ lớp này?", isPresented: $confirmingArchive, titleVisibility: .visible) {
            Button("Lưu trữ lớp", role: .destructive) { Task { if let klass { try? await data.archiveClass(klass) } } }
            Button("Huỷ", role: .cancel) {}
        } message: { Text("Lớp sẽ được chuyển khỏi danh sách lớp đang mở.") }
    }

    private func detailHeader(_ klass: Classroom) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(klass.name).appText(AppText.titleCompact).foregroundStyle(AppColors.text)
                Text("\(activeStudentCount) học sinh")
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            Spacer()
            headerMenu
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }

    private var activeStudentCount: Int {
        data.students(in: classID).filter { $0.status == .active }.count
    }

    private var headerMenu: some View {
        Menu {
            if data.canWriteClasses {
                Button("Sửa lớp", systemImage: "pencil") { showingEdit = true }
                Button("Lưu trữ lớp", systemImage: "archivebox", role: .destructive) { confirmingArchive = true }
            }
            if data.canWriteStudents { Button("Thêm học sinh", systemImage: "person.badge.plus") { showingStudents = true } }
        } label: {
            Image(systemName: "ellipsis.circle").font(.title3).foregroundStyle(AppColors.primary)
        }
    }

    private var tabStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 20) {
                ForEach(tabs, id: \.0) { tab in tabButton(tab) }
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
        }
    }

    private func tabButton(_ tab: (String, String)) -> some View {
        Button(tab.1) { selected = tab.0 }
            .appText(AppText.label)
            .foregroundStyle(selected == tab.0 ? AppColors.primary : AppColors.muted)
            .overlay(alignment: .bottom) {
                if selected == tab.0 { AppColors.primary.frame(height: 2).offset(y: 10) }
            }
    }

    @ViewBuilder private var tabContent: some View {
        switch selected {
        case "buoi-hoc": TeacherSessionsView(classID: classID, data: data, i4Data: i4Data, add: { showingNewSession = true })
        case "hoc-sinh": TeacherStudentsView(classID: classID, data: data)
        case "diem-danh": TeacherSessionPickerView(classID: classID, data: data, i4Data: i4Data, attendance: true)
        case "bai-kiem-tra": TestsTabView(classID: classID, data: i4Data)
        case "bang-diem": ScoreGridTabView(classID: classID, data: i4Data)
        default: MonthlyReportView(classID: classID, data: i4Data)
        }
    }
}

private struct TeacherSessionsView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    let add: () -> Void
    private var sessions: [ClassSession] { data.sessions(in: classID) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let current = sessions.first(where: { $0.date >= TeacherFeatureData.todayString }) {
                    Text("Buổi hiện tại").appText(AppText.label).foregroundStyle(AppColors.muted)
                    TeacherSessionCard(session: current, data: data, i4Data: i4Data)
                }
                Text("Các buổi đã qua").appText(AppText.label).foregroundStyle(AppColors.muted)
                ForEach(sessions.filter { $0.date < TeacherFeatureData.todayString }.reversed()) { session in TeacherSessionCard(session: session, data: data, i4Data: i4Data) }
                if sessions.isEmpty { AppEmptyState(title: "Lớp chưa có buổi học") { Text("Buổi học tự sinh theo lịch lặp của lớp. Bạn có thể thêm buổi lẻ ngoài lịch nếu cần.") } }
            }.padding(16)
        }
        .safeAreaInset(edge: .bottom) {
            if data.canWriteAttendance {
                AppButton(title: "Thêm buổi lẻ", systemImage: "plus", size: .large, action: add)
                    .padding(16).background(AppColors.background)
            }
        }
    }
}

private struct TeacherSessionCard: View {
    let session: ClassSession
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var showingDetail = false
    @State private var confirmCancel = false
    var body: some View {
        AppCard {
            VStack(alignment: .leading, spacing: 12) {
                cardHeader
                cardActions
            }
        }
        .sheet(isPresented: $showingDetail) { TeacherSessionDetailView(session: session, data: data, i4Data: i4Data) }
        .confirmationDialog("Huỷ buổi học?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Huỷ buổi học", role: .destructive) { Task { try? await data.cancel(session) } }
            Button("Giữ buổi học", role: .cancel) {}
        }
    }

    private var cardHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("\(sessionPrefix) · \(TeacherDateFormat.display(session.date))")
                    .appText(AppText.subheading)
                Text("\(session.startTime) · \(originLabel)")
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            Spacer()
            if session.status == .cancelled { AppPill(title: "Đã huỷ", tone: .warning) }
        }
    }

    private var originLabel: String {
        session.origin == .manual ? "Buổi lẻ" : "Lịch lặp"
    }

    private var cardActions: some View {
        HStack(spacing: 8) {
            AppButton(title: openSessionTitle, variant: .secondary) { showingDetail = true }
                .disabled(session.status == .cancelled || session.date > TeacherFeatureData.todayString)
            if data.canWriteAttendance && session.status == .planned {
                AppButton(title: "Huỷ buổi", variant: .danger) { confirmCancel = true }
                    .disabled(session.date < TeacherFeatureData.todayString)
            }
        }
    }

    private var openSessionTitle: String {
        if session.status == .cancelled { return "Xem buổi" }
        return session.date <= TeacherFeatureData.todayString ? "Điểm danh" : "Xem buổi"
    }
    private var sessionPrefix: String {
        if session.origin == .manual { return "Buổi lẻ" }
        return session.sessionNumber.map { "Buổi \($0)" } ?? "Buổi học"
    }
}

private struct TeacherSessionPickerView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    var attendance = false
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(data.sessions(in: classID).reversed()) { session in
                    TeacherSessionCard(session: session, data: data, i4Data: i4Data)
                }
            }.padding(16)
        }
    }
}

private struct TeacherSessionDetailView: View {
    let session: ClassSession
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var tab = "Điểm danh"
    private let tabs = ["Điểm danh", "Nhận xét", "Bài tập về nhà"]
    var body: some View {
        VStack(spacing: 0) {
            detailHeader
            AppSegmented(options: tabs.map { .init(value: $0, label: $0) }, value: tab) { tab = $0 }
                .padding(.horizontal, 16).padding(.bottom, 10)
            AppColors.border.frame(height: 1)
            Group {
                switch tab {
                case "Nhận xét": SessionCommentsView(sessionID: session.id, data: i4Data)
                case "Bài tập về nhà": SessionHomeworkView(sessionID: session.id, data: i4Data)
                default: TeacherAttendanceView(session: session, data: data)
                }
            }
        }
        .background(AppColors.background.ignoresSafeArea())
        .presentationDetents([.large])
    }

    private var detailHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(sessionHeading).appText(AppText.heading)
                Text("\(TeacherDateFormat.display(session.date)) · \(session.startTime)")
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            Spacer()
            AppPill(title: statusTitle, tone: statusTone)
        }.padding(16)
    }

    private var sessionHeading: String {
        if session.origin == .manual { return "Buổi lẻ" }
        return session.sessionNumber.map { "Buổi \($0)" } ?? "Buổi học"
    }

    private var statusTitle: String {
        switch session.status {
        case .cancelled: "Đã huỷ"
        case .held: "Đã học"
        case .planned: "Sắp tới"
        }
    }

    private var statusTone: AppPill.Tone {
        session.status == .cancelled ? .warning : .neutral
    }
}

private struct TeacherAttendanceView: View {
    let session: ClassSession
    @Bindable var data: TeacherFeatureData
    @State private var drafts: [String: TeacherAttendanceDraft] = [:]
    @State private var saving = false
    @State private var localError: String?
    private var roster: [Student] { data.students(in: session.classId).filter { TeacherFeatureData.student($0, isEnrolledOn: session.date) } }
    private let cycleOrder: [AttendanceStatus] = [.present, .absent, .late, .excused]

    private func draft(for student: Student) -> TeacherAttendanceDraft {
        if let draft = drafts[student.id] { return draft }
        let stored = data.attendanceFor(sessionID: session.id, studentID: student.id)
        return TeacherAttendanceDraft(status: stored?.status ?? .present, lateAt: stored?.lateAt, note: stored?.note ?? "")
    }

    private func update(_ student: Student, _ change: (inout TeacherAttendanceDraft) -> Void) {
        var value = draft(for: student)
        change(&value)
        drafts[student.id] = value
    }

    private func cycle(_ student: Student) {
        let current = draft(for: student).status
        let index = cycleOrder.firstIndex(of: current) ?? 0
        update(student) { $0.status = cycleOrder[(index + 1) % cycleOrder.count] }
    }

    private var absentCount: Int { roster.filter { draft(for: $0).status == .absent }.count }

    private func save() {
        saving = true
        Task {
            defer { saving = false }
            do { try await data.saveAttendance(session: session, drafts: drafts); drafts.removeAll(); localError = nil }
            catch { localError = "Không lưu được điểm danh. Vui lòng thử lại." }
        }
    }

    private func attendanceCard(index: Int, student: Student) -> some View {
        let existing = data.attendanceFor(sessionID: session.id, studentID: student.id)
        let row = draft(for: student)
        let displayed = data.canWriteAttendance ? row.status : existing?.status
        return AppCard {
            VStack(alignment: .leading, spacing: 10) {
                attendanceCardHeader(index: index, student: student, displayed: displayed)
                if data.canWriteAttendance {
                    attendanceControls(student: student, row: row)
                }
            }
        }
    }

    private func attendanceCardHeader(index: Int, student: Student, displayed: AttendanceStatus?) -> some View {
        HStack {
            Text("\(index + 1). \(student.name)").appText(AppText.subheading)
            Spacer()
            if let displayed { displayed.pill }
        }
    }

    @ViewBuilder
    private func attendanceControls(student: Student, row: TeacherAttendanceDraft) -> some View {
        Button(action: { cycle(student) }) {
            HStack {
                Text(row.status.label)
                Spacer()
                Image(systemName: "arrow.triangle.2.circlepath")
            }
            .appText(AppText.label).foregroundStyle(AppColors.primaryInk)
            .padding(12).background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.control))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(student.name): \(row.status.label). Bấm để đổi")
        if row.status == .late {
            TextField("Đến lúc", text: lateAtBinding(student: student, row: row))
                .keyboardType(.numbersAndPunctuation)
                .accessibilityLabel("Giờ đến muộn của \(student.name)")
            TextField("Ghi chú", text: noteBinding(student: student, row: row))
        }
    }

    private func lateAtBinding(student: Student, row: TeacherAttendanceDraft) -> Binding<String> {
        Binding(get: { row.lateAt ?? "" }, set: { newValue in update(student) { $0.lateAt = newValue } })
    }

    private func noteBinding(student: Student, row: TeacherAttendanceDraft) -> Binding<String> {
        Binding(get: { row.note }, set: { newValue in update(student) { $0.note = newValue } })
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if session.date > TeacherFeatureData.todayString {
                    AppCard { Text("Điểm danh mở vào ngày học.").appText(AppText.muted).foregroundStyle(AppColors.muted) }
                } else if !TeacherFeatureData.allowsAttendance(for: session, today: TeacherFeatureData.todayString) {
                    AppCard { Text("Buổi học đã huỷ.").appText(AppText.muted).foregroundStyle(AppColors.muted) }
                } else if !data.canReadAttendance {
                    AppEmptyState(title: "Bạn không có quyền xem điểm danh")
                } else if roster.isEmpty {
                    AppEmptyState(title: "Lớp chưa có học sinh")
                } else {
                    if let localError { TeacherInlineError(message: localError) }
                    if data.canWriteAttendance {
                        HStack {
                            Text("\(absentCount) vắng mặt").appText(AppText.muted).foregroundStyle(AppColors.muted)
                            Spacer()
                            AppButton(title: "Tất cả có mặt", variant: .secondary) {
                                for student in roster { update(student) { $0.status = .present } }
                            }
                        }
                    }
                    ForEach(Array(roster.enumerated()), id: \.element.id) { index, student in
                        attendanceCard(index: index, student: student)
                    }
                }
            }.padding(16)
        }
        .safeAreaInset(edge: .bottom) {
            if data.canWriteAttendance && TeacherFeatureData.allowsAttendance(for: session, today: TeacherFeatureData.todayString) && !roster.isEmpty {
                AppButton(title: saving ? "Đang lưu…" : "Lưu điểm danh", size: .large, action: save)
                    .disabled(saving)
                    .padding(16).background(AppColors.background)
            }
        }
    }
}

private struct TeacherStudentsView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @State private var showingAdd = false
    @State private var selectedStudent: Student?
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(data.students(in: classID)) { student in
                    studentCard(student)
                }
                if data.students(in: classID).isEmpty { AppEmptyState(title: "Chưa có học sinh") }
            }.padding(16)
        }
        .safeAreaInset(edge: .bottom) {
            if data.canWriteStudents {
                AppButton(title: "Thêm học sinh", systemImage: "plus", size: .large) { showingAdd = true }
                    .padding(16).background(AppColors.background)
            }
        }
        .sheet(isPresented: $showingAdd) { TeacherAddStudentForm(classID: classID, data: data) }
        .sheet(item: $selectedStudent) { student in TeacherParentPhoneForm(student: student, data: data) }
    }

    private func studentCard(_ student: Student) -> some View {
        AppCard {
            VStack(alignment: .leading, spacing: 8) {
                studentCardHeader(student)
                Text(studentSubtitle(student))
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
                if data.canWriteStudents { studentMenu(student) }
            }
        }
    }

    private func studentCardHeader(_ student: Student) -> some View {
        HStack {
            Text(student.name).appText(AppText.subheading)
            Spacer()
            if student.status == .left { AppPill(title: "Đã nghỉ", tone: .neutral) }
        }
    }

    private func studentSubtitle(_ student: Student) -> String {
        if student.status == .left { return "Đã nghỉ học" }
        return "Phụ huynh · \(student.parentPhone ?? "Chưa có SĐT")"
    }

    private func studentMenu(_ student: Student) -> some View {
        Menu("Thao tác") {
            Button("Sửa SĐT phụ huynh") { selectedStudent = student }
            if student.parentPhone != nil { Button("Cấp mật khẩu") { Task { await issuePassword(student) } } }
            if student.status == .active { Button("Đánh dấu nghỉ", role: .destructive) { Task { try? await data.markLeft(student) } } }
        }
    }
    private func issuePassword(_ student: Student) async {
        do { let temporaryPassword = try await data.issueGuardianPassword(for: student); await MainActor.run { selectedStudent = nil; PasswordReveal.showOnce(temporaryPassword) } }
        catch { await MainActor.run { selectedStudent = nil; PasswordReveal.showError() } }
    }
}

private struct TeacherAddStudentForm: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    @Bindable var data: TeacherFeatureData
    @State private var name = ""
    @State private var phone = ""
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                TextField("Tên học sinh", text: $name).textContentType(.name)
                TextField("SĐT phụ huynh", text: $phone).keyboardType(.phonePad)
                if let error { Text(error).foregroundStyle(AppColors.error) }
                Button("Thêm học sinh") { submit() }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .navigationTitle("Thêm học sinh")
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Đóng") { dismiss() } } }
        }
    }

    private func submit() {
        Task {
            do {
                try await data.addStudent(to: classID, name: name, parentPhone: phone)
                dismiss()
            } catch { self.error = "Không thêm được học sinh." }
        }
    }
}

private struct TeacherParentPhoneForm: View {
    @Environment(\.dismiss) private var dismiss
    let student: Student
    @Bindable var data: TeacherFeatureData
    @State private var phone: String
    @State private var error: String?
    init(student: Student, data: TeacherFeatureData) { self.student = student; self.data = data; _phone = State(initialValue: student.parentPhone ?? "") }
    var body: some View {
        NavigationStack {
            Form {
                TextField("SĐT phụ huynh", text: $phone).keyboardType(.phonePad)
                if let error { Text(error).foregroundStyle(AppColors.error) }
                Button("Lưu SĐT") { submit() }
            }
            .navigationTitle("Sửa SĐT phụ huynh")
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Đóng") { dismiss() } } }
        }
    }

    private func submit() {
        Task {
            do {
                try await data.updateStudent(student, parentPhone: phone)
                dismiss()
            } catch { self.error = "Không cập nhật được SĐT." }
        }
    }
}

@MainActor private enum PasswordReveal {
    static func showOnce(_ password: String) {
        let alert = UIAlertController(title: "Mật khẩu tạm", message: "\(password)\n\nHãy gửi mật khẩu cho phụ huynh. Mật khẩu này chỉ hiển thị một lần.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Đã hiểu", style: .default))
        UIApplication.shared.visibleController?.present(alert, animated: true)
    }
    static func showError() {
        let alert = UIAlertController(title: "Không cấp được mật khẩu", message: "SĐT này không tự đặt lại được hoặc phụ huynh chưa có SĐT.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Đóng", style: .default))
        UIApplication.shared.visibleController?.present(alert, animated: true)
    }
}

private struct TeacherOneOffSessionForm: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    @Bindable var data: TeacherFeatureData
    @State private var date = Date.now
    @State private var time = Date.now
    @State private var makeup = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Ngày học", selection: $date, displayedComponents: .date)
                DatePicker("Giờ bắt đầu", selection: $time, displayedComponents: .hourAndMinute)
                Toggle("Buổi học bù", isOn: $makeup)
                if let error { Text(error).foregroundStyle(AppColors.error) }
                Button("Thêm buổi lẻ") { submit() }
            }.navigationTitle("Thêm buổi lẻ").toolbar { ToolbarItem(placement: .topBarLeading) { Button("Đóng") { dismiss() } } }
        }
    }

    private func submit() {
        let day = date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
        let timeText = time.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
        Task {
            do {
                try await data.addOneOffSession(classID: classID, date: day, time: timeText, makeup: makeup)
                dismiss()
            } catch { self.error = "Không thêm được buổi học." }
        }
    }
}

private struct TeacherCalendarView: View {
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var date = Date.now
    @State private var mode = "Tháng"
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Lịch").appText(AppText.title).foregroundStyle(AppColors.text)
                calendarModePicker
                datePicker
                ForEach(matchingSessions) { session in
                    TeacherSessionCard(session: session, data: data, i4Data: i4Data)
                }
                if matchingSessions.isEmpty { emptyCalendarState }
            }.padding(16)
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationBarHidden(true)
    }

    private var calendarModePicker: some View {
        AppSegmented(options: [.init(value: "Tháng", label: "Tháng"),
                               .init(value: "Ngày", label: "Ngày")], value: mode) { mode = $0 }
    }

    private var datePicker: some View {
        Group {
            if mode == "Ngày" {
                DatePicker("Ngày", selection: $date, displayedComponents: .date).datePickerStyle(.compact)
            } else {
                DatePicker("Tháng", selection: $date, displayedComponents: .date).datePickerStyle(.graphical)
            }
        }
    }

    private var selectedDay: String {
        date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
    }

    private var selectedMonth: String {
        String(selectedDay.prefix(7))
    }

    private var matchingSessions: [ClassSession] {
        data.sessions.filter { mode == "Ngày" ? $0.date == selectedDay : $0.date.hasPrefix(selectedMonth) }
    }

    private var emptyCalendarState: some View {
        AppEmptyState(title: mode == "Ngày" ? "Không có buổi học" : "Tháng này chưa có buổi học")
    }
}

private struct TeacherSettingsView: View {
    @Bindable var data: TeacherFeatureData
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Cài đặt").appText(AppText.title).foregroundStyle(AppColors.text)
                AppCard { HStack { Text("Vai trò").appText(AppText.label); Spacer(); Text(data.roleName).appText(AppText.muted).foregroundStyle(AppColors.muted) } }
                AppCard { HStack { Text("Ngôn ngữ").appText(AppText.label); Spacer(); Text("Tiếng Việt").appText(AppText.muted).foregroundStyle(AppColors.muted) } }
            }.padding(16)
        }.background(AppColors.background.ignoresSafeArea()).navigationBarHidden(true)
    }
}

private struct TeacherInlineError: View {
    let message: String
    var body: some View {
        Text(message)
            .appText(AppText.muted).foregroundStyle(AppColors.error)
            .padding(12).frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: AppRadius.row))
    }
}

private enum TeacherDateFormat {
    static func display(_ value: String) -> String {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: value) else { return value }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "EEEE, d/M"
        return formatter.string(from: date)
    }
}

private extension UIApplication {
    var visibleController: UIViewController? {
        connectedScenes.compactMap { $0 as? UIWindowScene }.flatMap(\.windows).first(where: \.isKeyWindow)?.rootViewController?.topPresented
    }
}
private extension UIViewController {
    var topPresented: UIViewController { presentedViewController?.topPresented ?? self }
}
