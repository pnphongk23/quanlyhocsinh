import SwiftUI

// MARK: - Tạo lớp mới (`NewClassPage.tsx`)

struct TeacherNewClassView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var data: TeacherFeatureData
    @State private var name = ""
    @State private var weekdays: Set<Int> = []
    @State private var time = "18:30"
    @State private var showingTime = false
    @State private var timeSelection = Date.now
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: 16) {
                header
                TeacherField(label: "Tên lớp", text: $name, placeholder: "Ví dụ: IELTS Foundation",
                             identifier: "class.name")
                weekdayField
                timeField
                Text("Mỗi bài kiểm tra có thang điểm riêng, mặc định 15; sửa được khi tạo bài.")
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                studentNote
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, 96)
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .bottom) { stickyBar }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { syncTimeSelection() }
    }

    private var header: some View {
        HStack(spacing: 4) {
            TeacherIconButton(systemImage: "chevron.backward", label: "Quay lại") { dismiss() }
            Text("Tạo lớp mới")
                .appText(AppText.titleCompact)
                .foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
        }
        .padding(.bottom, 4)
    }

    private var weekdayField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Ngày học trong tuần").appText(AppText.label).foregroundStyle(AppColors.text)
            HStack(spacing: 8) {
                ForEach(Self.weekdayLabels, id: \.value) { day in weekdayButton(day) }
            }
        }
    }

    private func weekdayButton(_ day: (value: Int, label: String)) -> some View {
        let active = weekdays.contains(day.value)
        return Button {
            if active { weekdays.remove(day.value) } else { weekdays.insert(day.value) }
        } label: {
            Text(day.label)
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(active ? AppColors.onPrimary : AppColors.text)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                .background(active ? AppColors.primary : AppColors.surface,
                            in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }

    private var timeField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Giờ bắt đầu").appText(AppText.label).foregroundStyle(AppColors.text)
            Button { showingTime.toggle() } label: {
                HStack {
                    Text(time)
                        .appText(AppText.body)
                        .foregroundStyle(AppColors.text)
                    Spacer(minLength: 0)
                    Image(systemName: "clock")
                        .font(.system(size: 18, weight: .regular))
                        .foregroundStyle(AppColors.text)
                }
                .padding(.horizontal, 16)
                .frame(minHeight: AppMetrics.inputHeight)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
                .overlay(
                    RoundedRectangle(cornerRadius: AppRadius.control)
                        .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Giờ bắt đầu")
            if showingTime {
                DatePicker("", selection: $timeSelection, displayedComponents: .hourAndMinute)
                    .datePickerStyle(.wheel)
                    .labelsHidden()
                    .onChange(of: timeSelection) { _, newValue in
                        time = newValue.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
                    }
            }
        }
    }

    private var studentNote: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Thêm học sinh vào lớp").appText(AppText.label).foregroundStyle(AppColors.text)
            Text("Sau khi tạo lớp, mở lớp rồi vào mục Học sinh để thêm từng em. Học sinh học nhiều lớp vẫn có điểm danh và điểm riêng cho từng lớp.")
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
    }

    private var stickyBar: some View {
        AppButton(title: saving ? "Đang lưu…" : "Tạo lớp", size: .large) { Task { await save() } }
            .disabled(saving)
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.vertical, 8)
            .background(AppColors.background)
    }

    private func syncTimeSelection() {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        var components = DateComponents()
        components.hour = parts.first ?? 18
        components.minute = parts.dropFirst().first ?? 30
        timeSelection = Calendar.current.date(from: components) ?? .now
    }

    private func save() async {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !weekdays.isEmpty else {
            error = "Nhập tên lớp, chọn ít nhất một ngày và kiểm tra giờ học."
            return
        }
        saving = true
        defer { saving = false }
        do {
            try await data.createClass(name: name, weekdays: weekdays.sorted(), time: time)
            dismiss()
        } catch {
            self.error = "Không tạo được lớp. Vui lòng thử lại."
        }
    }

    static let weekdayLabels: [(value: Int, label: String)] = [
        (1, "T2"), (2, "T3"), (3, "T4"), (4, "T5"), (5, "T6"), (6, "T7"), (7, "CN"),
    ]
}

// MARK: - Chi tiết lớp (`ClassSpaceLayout.tsx`)

struct TeacherClassDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var selected = "buoi-hoc"
    @State private var showingMenu = false
    @State private var showingEdit = false
    @State private var showingSchedule = false
    @State private var error: String?

    init(classID: String, data: TeacherFeatureData, i4Data: I4FeatureStore, menuOpen: Bool = false) {
        self.classID = classID
        _data = Bindable(data)
        self.i4Data = i4Data
        _showingMenu = State(initialValue: menuOpen)
    }

    private var klass: Classroom? { data.classroom(id: classID) }

    private var tabs: [TeacherTextTabs.Item] {
        var items: [TeacherTextTabs.Item] = []
        if data.canReadAttendance { items.append(.init(id: "buoi-hoc", label: "Buổi học")) }
        if data.canReadScores {
            items.append(.init(id: "bai-kiem-tra", label: "Bài kiểm tra"))
            items.append(.init(id: "diem", label: "Điểm"))
        }
        if data.canReadStudents { items.append(.init(id: "hoc-sinh", label: "Học sinh")) }
        if data.canReadReports { items.append(.init(id: "bao-cao", label: "Báo cáo")) }
        return items
    }

    var body: some View {
        VStack(spacing: 0) {
            if !data.canReadClasses {
                AppEmptyState(title: "Bạn không có quyền xem lớp này")
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            } else if let klass {
                header(klass)
                tabBody
            } else {
                AppEmptyState(title: "Không tìm thấy lớp")
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            }
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .topTrailing) {
            if showingMenu, let klass {
                menuOverlay(klass)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showingEdit) {
            if let klass {
                TeacherEditClassView(classID: klass.id, data: data) { showingSchedule = true }
            }
        }
        .sheet(isPresented: $showingSchedule) {
            if let klass { TeacherEditScheduleView(klass: klass, data: data) }
        }
    }

    private func header(_ klass: Classroom) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                TeacherIconButton(systemImage: "chevron.backward", label: "Quay lại") { dismiss() }
                Text(klass.name)
                    .appText(AppText.titleCompact)
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if data.canWriteClasses {
                    TeacherIconButton(systemImage: "ellipsis", label: "Tuỳ chọn lớp",
                                      tint: AppColors.muted) { showingMenu = true }
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 4)
            TeacherTextTabs(items: tabs, selection: selected, fontSize: 13, fillsWidth: false) { selected = $0 }
        }
        .background(AppColors.surface)
    }

    @ViewBuilder private var tabBody: some View {
        if let error { TeacherErrorBanner(message: error).padding(.horizontal, TeacherMetrics.screenPaddingHorizontal) }
        switch selected {
        case "hoc-sinh":
            TeacherStudentsView(classID: classID, data: data)
        case "bai-kiem-tra":
            TestsTabView(classID: classID, data: i4Data)
        case "diem":
            ScoreGridTabView(classID: classID, data: i4Data)
        case "bao-cao":
            MonthlyReportView(classID: classID, data: i4Data)
        default:
            TeacherSessionsView(classID: classID, data: data, i4Data: i4Data)
        }
    }

    private func menuOverlay(_ klass: Classroom) -> some View {
        ZStack(alignment: .topTrailing) {
            AppColors.scrim.ignoresSafeArea().onTapGesture { showingMenu = false }
            TeacherOptionsMenu(items: menuItems(klass),
                               note: klass.status == .archived ? "Lớp này đã lưu trữ." : nil) {
                showingMenu = false
            }
            .padding(.top, 104)
            .padding(.trailing, 12)
        }
    }

    private func menuItems(_ klass: Classroom) -> [TeacherMenuItem] {
        [
            TeacherMenuItem(label: "Sửa lớp", systemImage: "pencil") {
                showingMenu = false
                showingEdit = true
            },
            TeacherMenuItem(label: "Sửa lịch học", systemImage: "calendar") {
                showingMenu = false
                showingSchedule = true
            },
            TeacherMenuItem(label: "Lưu trữ lớp", systemImage: "archivebox", danger: true) {
                showingMenu = false
                Task { await archive(klass) }
            },
        ]
    }

    private func archive(_ klass: Classroom) async {
        do {
            try await data.archiveClass(klass)
            error = nil
        } catch {
            self.error = "Không lưu trữ được lớp."
        }
    }
}

// MARK: - Sửa lớp (`EditClassModal.tsx`)

struct TeacherEditClassView: View {
    @Environment(\.dismiss) private var dismiss
    let classID: String
    @Bindable var data: TeacherFeatureData
    var editSchedule: () -> Void
    @State private var name = ""
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                TeacherField(label: "Tên lớp", text: $name, identifier: "class.edit.name")
                AppButton(title: "Sửa lịch học", variant: .secondary, size: .large) {
                    dismiss()
                    editSchedule()
                }
                if let error { Text(error).appText(AppText.muted).foregroundStyle(AppColors.error) }
                AppButton(title: saving ? "Đang lưu…" : "Lưu thay đổi", size: .large) { Task { await save() } }
                    .disabled(saving)
                Spacer(minLength: 0)
            }
            .padding(24)
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle("Sửa lớp")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Đóng") { dismiss() } }
            }
        }
        .onAppear { name = data.classroom(id: classID)?.name ?? "" }
    }

    private func save() async {
        guard let klass = data.classroom(id: classID) else { return }
        saving = true
        defer { saving = false }
        do {
            try await data.updateClass(klass, name: name,
                                       weekdays: klass.weekdays ?? [],
                                       time: klass.startTime ?? "18:00")
            dismiss()
        } catch {
            self.error = "Không lưu được lớp."
        }
    }
}

// MARK: - Sửa lịch học (`EditClassSchedule.tsx`)

struct TeacherEditScheduleView: View {
    @Environment(\.dismiss) private var dismiss
    let klass: Classroom
    @Bindable var data: TeacherFeatureData
    @State private var weekdays: Set<Int> = []
    @State private var time = "18:00"
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Ngày học trong tuần").appText(AppText.label).foregroundStyle(AppColors.text)
                HStack(spacing: 8) {
                    ForEach(TeacherNewClassView.weekdayLabels, id: \.value) { day in dayButton(day) }
                }
                TeacherField(label: "Giờ bắt đầu", text: $time, placeholder: "18:00")
                if let error { Text(error).appText(AppText.muted).foregroundStyle(AppColors.error) }
                AppButton(title: saving ? "Đang lưu…" : "Lưu lịch học", size: .large) { Task { await save() } }
                    .disabled(saving)
                Spacer(minLength: 0)
            }
            .padding(24)
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle("Sửa lịch học")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Đóng") { dismiss() } }
            }
        }
        .onAppear {
            weekdays = Set(klass.weekdays ?? [])
            time = klass.startTime ?? "18:00"
        }
    }

    private func dayButton(_ day: (value: Int, label: String)) -> some View {
        let active = weekdays.contains(day.value)
        return Button {
            if active { weekdays.remove(day.value) } else { weekdays.insert(day.value) }
        } label: {
            Text(day.label)
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                .foregroundStyle(active ? AppColors.onPrimary : AppColors.text)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                .background(active ? AppColors.primary : AppColors.surface,
                            in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
    }

    private func save() async {
        guard !weekdays.isEmpty else {
            error = "Chọn ít nhất một ngày học trong tuần."
            return
        }
        saving = true
        defer { saving = false }
        do {
            try await data.updateClass(klass, name: klass.name, weekdays: weekdays.sorted(), time: time)
            dismiss()
        } catch {
            self.error = "Không lưu được lịch học."
        }
    }
}
