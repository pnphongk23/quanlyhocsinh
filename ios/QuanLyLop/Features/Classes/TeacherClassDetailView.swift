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
    @State private var saveController = AppSaveController()
    @State private var operationID: ClientGeneratedID?

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: 16) {
                TeacherField(label: String(localized: "feature.classes.ten.lop"), text: $name, placeholder: String(localized: "feature.classes.vi.du.ielts.foundation"),
                             identifier: "class.name")
                weekdayField
                timeField
                Text(String(localized: "feature.classes.moi.bai.kiem.tra.co.thang.iem.rieng.mac.inh.15.s"))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                studentNote
                if let error {
                    Text(error).appText(AppText.muted).foregroundStyle(AppColors.error)
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, TeacherMetrics.cardPadding)
        }
        .background(AppColors.background.ignoresSafeArea())
        .safeAreaInset(edge: .bottom, spacing: 0) { stickyBar }
        .toolbar(.hidden, for: .tabBar)
        .navigationTitle(String(localized: "feature.classes.tao.lop.moi"))
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { syncTimeSelection() }
    }

    private var weekdayField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.classes.ngay.hoc.trong.tuan")).appText(AppText.label).foregroundStyle(AppColors.text)
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
                  .foregroundStyle(active ? AppState.selectedFg : AppColors.text)
                  .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                  .background(active ? AppState.selectedBg : AppColors.surface,
                              in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? [.isSelected] : [])
    }

    private var timeField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(String(localized: "feature.classes.gio.bat.au")).appText(AppText.label).foregroundStyle(AppColors.text)
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
            .accessibilityLabel(String(localized: "feature.classes.gio.bat.au"))
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
            Text(String(localized: "feature.classes.them.hoc.sinh.vao.lop")).appText(AppText.label).foregroundStyle(AppColors.text)
            Text(String(localized: "feature.classes.sau.khi.tao.lop.mo.lop.roi.vao.muc.hoc.sinh.e.th"))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
    }

    private var stickyBar: some View {
        VStack(spacing: TeacherMetrics.listGap) {
            AppSaveButton(title: String(localized: "feature.classes.tao.lop"), controller: saveController,
                          onSuccess: { dismiss() }) {
                try await save()
            }
            .frame(maxWidth: .infinity)
            saveStatus
        }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.vertical, TeacherMetrics.listGap)
            .background(AppColors.background)
    }

    private func syncTimeSelection() {
        let parts = time.split(separator: ":").compactMap { Int($0) }
        var components = DateComponents()
        components.hour = parts.first ?? 18
        components.minute = parts.dropFirst().first ?? 30
        timeSelection = Calendar.current.date(from: components) ?? .now
    }

    private func save() async throws {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !weekdays.isEmpty else {
            error = String(localized: "feature.classes.nhap.ten.lop.chon.it.nhat.mot.ngay.va.kiem.tra.g")
            throw TeacherDataFailure.unavailable
        }
        if operationID == nil { operationID = ClientGeneratedID() }
        do {
            try await data.createClass(id: operationID!.rawValue, name: name, weekdays: weekdays.sorted(), time: time)
            error = nil
        } catch {
            self.error = String(localized: "feature.classes.khong.tao.uoc.lop.vui.long.thu.lai")
            throw error
        }
    }

    private var saveStatus: some View {
        Group {
            if saveController.error != nil { AppSaveStatus(kind: .error) }
            else if let source = data.saveStatusSource, source.kind == .error { AppSaveStatus(kind: .error) }
        }
    }

    static let weekdayLabels: [(value: Int, label: String)] = [
        (1, "T2"), (2, "T3"), (3, "T4"), (4, "T5"), (5, "T6"), (6, "T7"), (7, "CN"),
    ]
}

// MARK: - Chi tiết lớp (`ClassSpaceLayout.tsx`)

struct TeacherClassDetailView: View {
    let classID: String
    @Bindable var data: TeacherFeatureData
    @ObservedObject var i4Data: I4FeatureStore
    @State private var selected = "buoi-hoc"
    @State private var showingEdit = false
    @State private var showingSchedule = false
    @State private var error: String?

    init(classID: String, data: TeacherFeatureData, i4Data: I4FeatureStore) {
        self.classID = classID
        _data = Bindable(data)
        self.i4Data = i4Data
    }

    private var klass: Classroom? { data.classroom(id: classID) }

    private var tabs: [TeacherTextTabs.Item] {
        var items: [TeacherTextTabs.Item] = []
        if data.canReadAttendance { items.append(.init(id: "buoi-hoc", label: String(localized: "feature.classes.buoi.hoc"))) }
        if data.canReadScores {
            items.append(.init(id: "bai-kiem-tra", label: String(localized: "feature.classes.bai.kiem.tra")))
            items.append(.init(id: "diem", label: String(localized: "feature.classes.iem")))
        }
        if data.canReadStudents { items.append(.init(id: "hoc-sinh", label: String(localized: "feature.classes.hoc.sinh"))) }
        if data.canReadReports { items.append(.init(id: "bao-cao", label: String(localized: "feature.classes.bao.cao"))) }
        return items
    }

    var body: some View {
        VStack(spacing: 0) {
            if !data.canReadClasses {
                AppEmptyState(title: String(localized: "feature.classes.ban.khong.co.quyen.xem.lop.nay"))
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            } else if klass != nil {
                contentTabs
                tabBody
            } else {
                AppEmptyState(title: String(localized: "feature.classes.khong.tim.thay.lop"))
                    .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(AppColors.background.ignoresSafeArea())
        .navigationTitle(klass?.name ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let klass, data.canWriteClasses {
                ToolbarItem(placement: .topBarTrailing) {
                    classMenu(klass)
                }
            }
        }
        .sheet(isPresented: $showingEdit) {
            if let klass {
                TeacherEditClassView(classID: klass.id, data: data) { showingSchedule = true }
            }
        }
        .sheet(isPresented: $showingSchedule) {
            if let klass { TeacherEditScheduleView(klass: klass, data: data) }
        }
    }

    private var contentTabs: some View {
        TeacherTextTabs(items: tabs, selection: selected, fontSize: 13, fillsWidth: false) { selected = $0 }
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

    private func classMenu(_ klass: Classroom) -> some View {
        Menu {
            if klass.status == .archived {
                Text(String(localized: "feature.classes.lop.nay.a.luu.tru"))
            } else {
                Button { showingEdit = true } label: {
                    Label(String(localized: "feature.classes.sua.lop"), systemImage: "pencil")
                }
                Button { showingSchedule = true } label: {
                    Label(String(localized: "feature.classes.sua.lich.hoc"), systemImage: "calendar")
                }
                Button(role: .destructive) { Task { await archive(klass) } } label: {
                    Label(String(localized: "feature.classes.luu.tru.lop"), systemImage: "archivebox")
                }
            }
        } label: {
            Image(systemName: "ellipsis")
        }
        .accessibilityLabel(String(localized: "feature.classes.tuy.chon.lop"))
    }

    private func archive(_ klass: Classroom) async {
        do {
            try await data.archiveClass(klass)
            error = nil
        } catch {
            self.error = String(localized: "feature.classes.khong.luu.tru.uoc.lop")
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
    @State private var saveController = AppSaveController()

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                TeacherField(label: String(localized: "feature.classes.ten.lop"), text: $name, identifier: "class.edit.name")
                AppButton(title: String(localized: "feature.classes.sua.lich.hoc"), variant: .secondary, size: .large) {
                    dismiss()
                    editSchedule()
                }
                if let error { Text(error).appText(AppText.muted).foregroundStyle(AppColors.error) }
                AppSaveButton(title: String(localized: "feature.classes.luu.thay.oi"), controller: saveController,
                              onSuccess: { dismiss() }) {
                    try await save()
                }
                .frame(maxWidth: .infinity)
                if saveController.error != nil { AppSaveStatus(kind: .error) }
                else if let source = data.saveStatusSource { AppSaveStatus(kind: source.kind) }
                Spacer(minLength: 0)
            }
            .padding(24)
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle(String(localized: "feature.classes.sua.lop"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button(String(localized: "feature.classes.ong")) { dismiss() } }
            }
        }
        .onAppear { name = data.classroom(id: classID)?.name ?? "" }
    }

    private func save() async throws {
        guard let klass = data.classroom(id: classID) else { throw TeacherDataFailure.unavailable }
        do {
            try await data.updateClass(klass, name: name,
                                       weekdays: klass.weekdays ?? [],
                                       time: klass.startTime ?? "18:00")
            error = nil
        } catch {
            self.error = String(localized: "feature.classes.khong.luu.uoc.lop")
            throw error
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
    @State private var saveController = AppSaveController()

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text(String(localized: "feature.classes.ngay.hoc.trong.tuan")).appText(AppText.label).foregroundStyle(AppColors.text)
                HStack(spacing: 8) {
                    ForEach(TeacherNewClassView.weekdayLabels, id: \.value) { day in dayButton(day) }
                }
                TeacherField(label: String(localized: "feature.classes.gio.bat.au"), text: $time, placeholder: "18:00")
                if let error { Text(error).appText(AppText.muted).foregroundStyle(AppColors.error) }
                AppSaveButton(title: String(localized: "feature.classes.luu.lich.hoc"), controller: saveController,
                              onSuccess: { dismiss() }) {
                    try await save()
                }
                .frame(maxWidth: .infinity)
                if saveController.error != nil { AppSaveStatus(kind: .error) }
                else if let source = data.saveStatusSource { AppSaveStatus(kind: source.kind) }
                Spacer(minLength: 0)
            }
            .padding(24)
            .background(AppColors.background.ignoresSafeArea())
            .navigationTitle(String(localized: "feature.classes.sua.lich.hoc"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button(String(localized: "feature.classes.ong")) { dismiss() } }
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
                  .foregroundStyle(active ? AppState.selectedFg : AppColors.text)
                  .frame(maxWidth: .infinity, minHeight: AppMetrics.tap)
                  .background(active ? AppState.selectedBg : AppColors.surface,
                              in: RoundedRectangle(cornerRadius: AppRadius.button))
        }
        .buttonStyle(.plain)
    }

    private func save() async throws {
        guard !weekdays.isEmpty else {
            error = String(localized: "feature.classes.chon.it.nhat.mot.ngay.hoc.trong.tuan")
            throw TeacherDataFailure.unavailable
        }
        do {
              try await data.updateClass(klass, name: klass.name, weekdays: weekdays.sorted(), time: time)
              error = nil
          } catch {
            self.error = String(localized: "feature.classes.khong.luu.uoc.lich.hoc")
            throw error
        }
    }
}
