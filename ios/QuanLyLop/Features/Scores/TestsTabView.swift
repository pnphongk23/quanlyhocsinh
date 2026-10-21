import SwiftUI

/// Tab "Bài kiểm tra" (`TestsTab.tsx`): list of tests with the missing-score pill, plus
/// the empty state that leads to creating the first test.
struct TestsTabView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var showingCreate = false

    init(classID: String, data: I4FeatureStore = .demo) {
        self.classID = classID
        self.data = data
    }

    private var tests: [TestDefinition] { data.tests(in: classID) }
    private var students: [Student] { data.activeStudents(in: classID) }
    private var klass: Classroom? { data.classes.first { $0.id == classID } }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if tests.isEmpty {
                emptyState
            } else {
                if data.canWriteScores { newButton }
                list
            }
        }
        .navigationDestination(isPresented: $showingCreate) {
            TestEditorView(data: data, classID: classID)
        }
        .task { await data.configure(auth: auth) }
    }

    private var newButton: some View {
        HStack {
            Spacer(minLength: 0)
            AppButton(title: String(localized: "feature.scores.bai.moi"), variant: .secondary) { showingCreate = true }
        }
    }

    private var list: some View {
        VStack(spacing: 8) {
            ForEach(tests) { test in
                NavigationLink {
                    TestScoresView(classID: classID, testID: test.id, data: data)
                } label: {
                    row(test)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func row(_ test: TestDefinition) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(test.name)
                    .appText(AppTextStyle(size: 18, weight: .bold, lineHeight: 27))
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
                Text(String.localizedStringWithFormat(String(localized: "feature.scores.ngay.thang.iem"), String(describing: (I4Format.dayMonthLong(test.date))), String(describing: (test.maxScore))))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            pill(for: test)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    @ViewBuilder
    private func pill(for test: TestDefinition) -> some View {
        let missing = ScoreRules.missingCount(testID: test.id, students: students, scores: data.scores)
        if missing > 0 {
            AppPill(title: String.localizedStringWithFormat(String(localized: "feature.scores.con.em.chua.co.iem"), String(describing: (missing))), tone: .warning)
        } else {
            AppPill(title: String(localized: "feature.scores.u.iem"), tone: .success)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 30, weight: .regular))
                .foregroundStyle(AppColors.primaryInk)
                .frame(width: 72, height: 72)
                .background(AppColors.primarySoft, in: Circle())
            VStack(spacing: 8) {
                Text(String(localized: "feature.scores.chua.co.bai.kiem.tra"))
                    .appText(AppTextStyle(size: 20, weight: .bold, lineHeight: 30))
                    .foregroundStyle(AppColors.text)
                Text(String(localized: "feature.scores.tao.bai.kiem.tra.au.tien.sau.o.nhap.iem.cho.ca.l"))
                    .appText(AppText.body)
                    .foregroundStyle(AppColors.muted)
                    .multilineTextAlignment(.center)
            }
            if data.canWriteScores {
                AppButton(title: String(localized: "feature.scores.tao.bai.kiem.tra"), size: .large) { showingCreate = true }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 20)
        .padding(.vertical, 24)
        .multilineTextAlignment(.center)
    }
}

/// Page "Điểm số" of one test (`TestScoresPage.tsx`): score box per student, sticky save bar,
/// "⋯" options sheet, edit sheet and the delete/archive confirmation.
struct TestScoresView: View {
    let classID: String
    let testID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var drafts: [String: String] = [:]
    @State private var error: String?
    @State private var showingOptions = false
    @State private var showingEdit = false
    @State private var deletion: TestDeletion?
    @State private var focusStudentID: String?
    @State private var savedNotice: String?

    init(classID: String, testID: String, data: I4FeatureStore = .demo, focusStudentID: String? = nil) {
        self.classID = classID
        self.testID = testID
        self.data = data
        _focusStudentID = State(initialValue: focusStudentID)
    }

    private var test: TestDefinition? {
        data.tests.first { $0.id == testID && !$0.archived }
    }

    private var students: [Student] { data.activeStudents(in: classID) }
    private var klass: Classroom? { data.classes.first { $0.id == classID } }

    private var values: [String: String] {
        var merged: [String: String] = [:]
        for student in students {
            merged[student.id] = drafts[student.id]
                ?? ScoreRules.inputText(data.score(testID: testID, studentID: student.id)?.value)
        }
        return merged
    }

    private var invalidCount: Int {
        guard let test else { return 0 }
        return values.values.filter { ScoreRules.isInvalid($0, max: test.maxScore) }.count
    }

    private var dirty: Bool {
        guard let test else { return false }
        return students.contains { student in
            guard let draft = drafts[student.id] else { return false }
            let stored = ScoreRules.inputText(data.score(testID: test.id, studentID: student.id)?.value)
            return draft != stored
        }
    }

    var body: some View {
        Group {
            if let test {
                page(test)
            } else {
                AppEmptyState(title: String(localized: "feature.scores.khong.tim.thay.bai.kiem.tra")) {
                    AppButton(title: String(localized: "feature.scores.ve.danh.sach.bai.kiem.tra"), variant: .secondary) { dismiss() }
                }
                .padding(.horizontal, 20)
            }
        }
        .background(AppColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task { await data.configure(auth: auth) }
    }

    private func page(_ test: TestDefinition) -> some View {
        VStack(spacing: 0) {
            header(test)
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    testCard(test)
                    if !data.canWriteScores {
                        I4Banner(text: String(localized: "feature.scores.ban.chi.co.quyen.xem.iem.cua.lop.nay"), horizontal: 12, vertical: 10)
                    }
                    if let savedNotice {
                        I4Banner(text: savedNotice, horizontal: 12, vertical: 10)
                    }
                    columns
                    studentList(test)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 12)
            }
            saveBar(test)
        }
        .sheet(isPresented: $showingOptions) { optionsSheet }
        .sheet(isPresented: $showingEdit) {
            TestFormSheet(data: data, classID: classID, existing: test)
        }
        .overlay {
            if let deletion {
                deleteDialog(test, deletion)
            }
        }
    }

    private func header(_ test: TestDefinition) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.backward")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppColors.text)
                    .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(String(localized: "feature.scores.quay.lai"))
            VStack(alignment: .leading, spacing: 2) {
                Text(klass?.name ?? String(localized: "feature.scores.lop.hoc"))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
                    .lineLimit(1)
                Text(String(localized: "feature.scores.iem.so"))
                    .appText(AppText.title)
                    .foregroundStyle(AppColors.text)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if data.canWriteScores {
                Button { showingOptions = true } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 20, weight: .regular))
                        .foregroundStyle(AppColors.muted)
                        .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(String(localized: "feature.scores.tuy.chon.bai.kiem.tra"))
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(AppColors.background)
    }

    private func testCard(_ test: TestDefinition) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(test.name)
                    .appText(AppTextStyle(size: 18, weight: .bold, lineHeight: 27))
                    .foregroundStyle(AppColors.text)
                Text(String.localizedStringWithFormat(String(localized: "feature.scores.ngay.thang.iem"), String(describing: (I4Format.dayMonthLong(test.date))), String(describing: (test.maxScore))))
                    .appText(AppText.muted)
                    .foregroundStyle(AppColors.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Button { dismiss() } label: {
                HStack(spacing: 4) {
                    Text(String(localized: "feature.scores.oi.bai")).appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5))
                    Image(systemName: "chevron.down").font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(AppColors.primaryInk)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var columns: some View {
        HStack(spacing: 8) {
            Text(String(localized: "feature.scores.hoc.sinh")).appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(String(localized: "feature.scores.iem")).appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .frame(width: 64, alignment: .center)
        }
        .foregroundStyle(AppColors.muted)
        .padding(.leading, 12)
        .padding(.trailing, 4)
        .padding(.top, -4)
    }

    private func studentList(_ test: TestDefinition) -> some View {
        VStack(spacing: 8) {
            ForEach(students, id: \.id) { student in
                row(student, test: test)
            }
        }
    }

    private func row(_ student: Student, test: TestDefinition) -> some View {
        let raw = values[student.id] ?? ""
        let invalid = ScoreRules.isInvalid(raw, max: test.maxScore)
        let missing = ScoreRules.isEmpty(raw)
        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(student.name)
                        .appText(AppTextStyle(size: 16, weight: .medium, lineHeight: 24))
                        .foregroundStyle(AppColors.text)
                    if missing {
                        Text(String(localized: "feature.scores.chua.co.iem"))
                            .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                            .foregroundStyle(AppColors.warning)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                scoreField(student, invalid: invalid, missing: missing)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .frame(minHeight: 56)
            if invalid {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle").font(.system(size: 13))
                    Text(String.localizedStringWithFormat(String(localized: "feature.scores.iem.tu.0.en"), String(describing: (test.maxScore))))
                        .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                }
                .foregroundStyle(AppColors.error)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
        }
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(invalid ? AppColors.error : .clear, lineWidth: 2))
    }

    private func scoreField(_ student: Student, invalid: Bool, missing: Bool) -> some View {
        TextField("–", text: binding(student))
            .keyboardType(.decimalPad)
            .multilineTextAlignment(.center)
            .font(.system(size: 17, weight: .bold))
            .foregroundStyle(textColor(invalid: invalid, missing: missing))
            .frame(width: 64, height: 44)
            .background(fieldBackground(invalid: invalid, missing: missing),
                        in: RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(fieldBorder(invalid: invalid, missing: missing),
                                  style: StrokeStyle(lineWidth: 1.5, dash: missing ? [4, 3] : [])))
            .disabled(!data.canWriteScores)
            .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.scores.iem.75e72810"), String(describing: (student.name))))
    }

    private func binding(_ student: Student) -> Binding<String> {
        Binding(
            get: { values[student.id] ?? "" },
            set: { newValue in
                drafts[student.id] = newValue
                savedNotice = nil
            }
        )
    }

    private func textColor(invalid: Bool, missing: Bool) -> Color {
        if invalid { return AppColors.error }
        return missing ? AppColors.muted : AppColors.text
    }

    private func fieldBackground(invalid: Bool, missing: Bool) -> Color {
        missing || invalid ? AppColors.surface : AppColors.background
    }

    private func fieldBorder(invalid: Bool, missing: Bool) -> Color {
        if invalid { return AppColors.error }
        return missing ? AppColors.inputBorderStrong : .clear
    }

    private func saveBar(_ test: TestDefinition) -> some View {
        VStack(spacing: 8) {
            if let error {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle").font(.system(size: 16))
                    Text(error)
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Button(String(localized: "feature.scores.thu.lai")) { save(test) }
                        .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        .foregroundStyle(AppColors.onPrimary)
                        .padding(.horizontal, 16)
                        .frame(minHeight: AppMetrics.tap)
                        .background(AppColors.error, in: RoundedRectangle(cornerRadius: 12))
                }
                .foregroundStyle(AppColors.error)
                .padding(.leading, 16)
                .padding(.trailing, 8)
                .frame(minHeight: 52)
                .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: 12))
            }
            if invalidCount > 0 {
                Text(String(localized: "feature.scores.sua.1.o.loi.e.luu.iem"))
                    .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                    .foregroundStyle(AppColors.error)
            } else if !dirty {
                Text(String(localized: "feature.scores.chua.co.thay.oi.e.luu"))
                    .appText(AppTextStyle(size: 14, weight: .regular, lineHeight: 21))
                    .foregroundStyle(AppColors.muted)
            }
            Button { save(test) } label: {
                Text(String(localized: "feature.scores.luu.iem"))
                    .appText(AppTextStyle(size: 16, weight: .semiBold, lineHeight: 24))
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(dirty && invalidCount == 0 ? AppColors.primary : AppColors.inputBorder,
                                in: RoundedRectangle(cornerRadius: 12))
                    .foregroundStyle(dirty && invalidCount == 0 ? AppColors.onPrimary : AppColors.muted)
            }
            .buttonStyle(.plain)
            .disabled(!dirty || invalidCount > 0 || !data.canWriteScores)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(AppColors.background)
    }

    private func save(_ test: TestDefinition) {
        let changed = drafts
        Task {
            error = await data.saveScores(test: test, values: changed)
            if error == nil {
                drafts.removeAll()
                savedNotice = String(localized: "feature.scores.a.luu.iem")
            }
        }
    }

    private var optionsSheet: some View {
        AppSheet(title: String(localized: "feature.scores.tuy.chon.bai.kiem.tra")) {
            VStack(spacing: 10) {
                AppButton(title: String(localized: "feature.scores.sua.bai"), variant: .secondary, size: .medium) {
                    showingOptions = false
                    showingEdit = true
                }
                AppButton(title: String(localized: "feature.scores.xoa.bai"), variant: .danger, size: .medium) {
                    showingOptions = false
                    if let open = self.test {
                        deletion = ScoreRules.deletionMode(hasScores: hasScores(open))
                    }
                }
            }
            .frame(maxWidth: .infinity)
        } footer: {
            EmptyView()
        } close: {
            showingOptions = false
        }
    }

    private func hasScores(_ test: TestDefinition) -> Bool {
        data.scores.contains { $0.testId == test.id && $0.value != nil }
    }

    private func deleteDialog(_ test: TestDefinition, _ mode: TestDeletion) -> some View {
        I4Dialog(title: mode.title, content: {
            Text(mode.message)
                .appText(AppTextStyle(size: 16, weight: .regular, lineHeight: 24))
                .foregroundStyle(AppColors.muted)
        }, actions: {
            VStack(spacing: 8) {
                AppButton(title: mode.actionLabel, variant: .danger, size: .large) {
                    deletion = nil
                    Task {
                        let message = await data.deleteTest(test)
                        if let message { savedNotice = message }
                        if !data.tests(in: classID).contains(where: { $0.id == test.id }) { dismiss() }
                    }
                }
                AppButton(title: String(localized: "feature.scores.giu.bai"), variant: .neutral, size: .large) { deletion = nil }
            }
        }, dismiss: { deletion = nil })
    }
}

extension ScoreRules {
    /// Raw text of a saved score (`String(6)` → "6", `String(7.5)` → "7.5").
    static func inputText(_ value: Double?) -> String {
        guard let value else { return "" }
        return value == value.rounded() ? String(Int(value)) : String(value)
    }
}

/// Full page "Tạo bài kiểm tra" (`NewTestPage.tsx`).
struct TestEditorView: View {
    @ObservedObject var data: I4FeatureStore
    let classID: String
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var date = I4Format.todayISO()
    @State private var max = "15"
    @State private var error: String?
    @State private var saving = false

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    AppTextField(label: String(localized: "feature.scores.ten.bai.kiem.tra"), text: $name, placeholder: String(localized: "feature.scores.vi.du.unit.6.test"))
                    dateField
                    AppTextField(label: String(localized: "feature.scores.iem.toi.a"), text: $max, keyboard: .numberPad)
                    Text(String(localized: "feature.scores.moi.bai.co.thang.iem.rieng.mac.inh.15.sua.uoc.lu"))
                        .appText(AppText.muted)
                        .foregroundStyle(AppColors.muted)
                    if let error {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle").font(.system(size: 16))
                            Text(error).appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                        }
                        .foregroundStyle(AppColors.error)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 8) {
                AppButton(title: String(localized: "feature.scores.tao.bai.va.nhap.iem"), size: .large) { save() }
                    .disabled(saving)
                AppButton(title: String(localized: "feature.scores.huy"), variant: .ghost, size: .medium) { dismiss() }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 12)
            .background(AppColors.background)
        }
        .background(AppColors.background.ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }

    private var header: some View {
        HStack(spacing: 12) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.backward")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AppColors.text)
                    .frame(width: AppMetrics.tap, height: AppMetrics.tap)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.button))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(String(localized: "feature.scores.quay.lai"))
            Text(String(localized: "feature.scores.tao.bai.kiem.tra"))
                .appText(AppText.title)
                .foregroundStyle(AppColors.text)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 12)
    }

    private var dateField: some View {
        VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
            Text(String(localized: "feature.scores.ngay.kiem.tra")).appText(AppText.label).foregroundStyle(AppColors.text)
            HStack {
                DatePicker("", selection: dateBinding, displayedComponents: .date)
                    .labelsHidden()
                    .datePickerStyle(.compact)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .frame(minHeight: AppMetrics.inputHeight)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.control))
            .overlay(
                RoundedRectangle(cornerRadius: AppRadius.control)
                    .strokeBorder(AppColors.inputBorder, lineWidth: AppMetrics.borderWidth))
        }
    }

    private var dateBinding: Binding<Date> {
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        return Binding(
            get: { parser.date(from: date) ?? .now },
            set: { date = parser.string(from: $0) }
        )
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            error = String(localized: "feature.scores.nhap.ten.bai.kiem.tra")
            return
        }
        guard let maximum = Int(max.trimmingCharacters(in: .whitespaces)) else {
            error = String(localized: "feature.scores.iem.toi.a.phai.tu.1.en.1000")
            return
        }
        saving = true
        Task {
            let failure = await data.saveTest(name: trimmed, date: date, max: maximum)
            saving = false
            if let failure {
                error = failure
            } else {
                dismiss()
            }
        }
    }
}

/// Modal "Sửa bài kiểm tra" (`EditTestModal`).
struct TestFormSheet: View {
    @ObservedObject var data: I4FeatureStore
    let classID: String
    let existing: TestDefinition
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var date: String
    @State private var max: String
    @State private var error: String?

    init(data: I4FeatureStore, classID: String, existing: TestDefinition) {
        self.data = data
        self.classID = classID
        self.existing = existing
        _name = State(initialValue: existing.name)
        _date = State(initialValue: existing.date)
        _max = State(initialValue: String(existing.maxScore))
    }

    var body: some View {
        AppSheet(title: String(localized: "feature.scores.sua.bai.kiem.tra")) {
            VStack(spacing: 14) {
                AppTextField(label: String(localized: "feature.scores.ten.bai.kiem.tra"), text: $name)
                AppTextField(label: String(localized: "feature.scores.ngay.kiem.tra"), text: $date, placeholder: "YYYY-MM-DD")
                AppTextField(label: String(localized: "feature.scores.iem.toi.a"), text: $max, keyboard: .numberPad)
                if let error {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle").font(.system(size: 16))
                        Text(error).appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21))
                    }
                    .foregroundStyle(AppColors.error)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(AppColors.errorSoft, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        } footer: {
            AppButton(title: String(localized: "feature.scores.luu.thay.oi"), size: .large) { save() }
        } close: {
            dismiss()
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            error = String(localized: "feature.scores.nhap.ten.bai.kiem.tra")
            return
        }
        guard let maximum = Int(max.trimmingCharacters(in: .whitespaces)) else {
            error = String(localized: "feature.scores.iem.toi.a.phai.tu.1.en.1000")
            return
        }
        Task {
            if let failure = await data.saveTest(name: trimmed, date: date, max: maximum, existing: existing) {
                error = failure
            } else {
                dismiss()
            }
        }
    }
}
