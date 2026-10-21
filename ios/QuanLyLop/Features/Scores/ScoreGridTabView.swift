import SwiftUI

/// Tab "Điểm" (`ScoreGridTab.tsx`): a horizontal table with the student column pinned while
/// the test columns scroll. A cell opens the score page focused on that student.
struct ScoreGridTabView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var showingCreate = false

    init(classID: String, data: I4FeatureStore = I4FeatureStore()) {
        self.classID = classID
        self.data = data
    }

    private var tests: [TestDefinition] {
        data.tests.filter { $0.classId == classID && !$0.archived }
            .sorted { $0.date < $1.date }
    }

    /// Active students first, then those who left (`orderScoreGridStudents`).
    private var students: [Student] {
        let roster = data.students.filter { $0.classId == classID }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        return roster.filter { $0.status == .active } + roster.filter { $0.status != .active }
    }

    private var activeCount: Int { students.filter { $0.status == .active }.count }
    private var leftCount: Int { students.count - activeCount }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if tests.isEmpty {
                emptyState
            } else {
                if data.canWriteScores { newButton }
                tableCard
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
            AppButton(title: String(localized: "feature.scores.bai.kiem.tra.moi"), variant: .secondary) { showingCreate = true }
        }
    }

    private var tableCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 0) {
                studentColumn
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 0) {
                        ForEach(tests) { test in testColumn(test) }
                    }
                }
            }
            Text(String.localizedStringWithFormat(String(localized: "feature.scores.hien.thi.hoc.sinh.ang.hoc.va.hoc.sinh.a.nghi.nha"), String(describing: (activeCount)), String(describing: (leftCount))))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .padding(.top, 12)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var studentColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(String(localized: "feature.scores.hoc.sinh"))
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .padding(8)
                .frame(height: 60, alignment: .topLeading)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(alignment: .bottom) { AppColors.border.frame(height: 1) }
            ForEach(students, id: \.id) { student in
                studentCell(student)
            }
        }
        .frame(width: 136)
    }

    private func studentCell(_ student: Student) -> some View {
        HStack(spacing: 0) {
            Text(student.name)
                .appText(AppTextStyle(size: 15, weight: .medium, lineHeight: 22.5))
                .foregroundStyle(AppColors.text)
                .lineLimit(1)
                .opacity(student.status == .active ? 1 : 0.62)
            if student.status != .active {
                Text(String(localized: "feature.scores.a.nghi"))
                    .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                    .foregroundStyle(AppColors.muted)
                    .padding(.leading, 8)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .frame(height: 56)
        .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
    }

    private func testColumn(_ test: TestDefinition) -> some View {
        VStack(spacing: 0) {
            NavigationLink {
                TestScoresView(classID: classID, testID: test.id, data: data)
            } label: {
                VStack(spacing: 2) {
                    Text(test.name)
                        .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                        .foregroundStyle(AppColors.text)
                        .lineLimit(1)
                    Text("\(I4Format.dayMonth(test.date)) · thang \(test.maxScore)")
                        .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                        .foregroundStyle(AppColors.muted)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 60, alignment: .top)
                .padding(8)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .overlay(alignment: .bottom) { AppColors.border.frame(height: 1) }
            ForEach(students, id: \.id) { student in
                scoreCell(test, student)
            }
        }
        .frame(width: 148)
    }

    private func scoreCell(_ test: TestDefinition, _ student: Student) -> some View {
        let value = data.score(testID: test.id, studentID: student.id)?.value
        return NavigationLink {
            TestScoresView(classID: classID, testID: test.id, data: data, focusStudentID: student.id)
        } label: {
            VStack(spacing: 2) {
                if let value {
                    Text(I4Format.score(value))
                        .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                        .foregroundStyle(AppColors.text)
                } else {
                    Text("–")
                        .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.muted)
                        .frame(width: 64, height: 44)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(AppColors.inputBorderStrong,
                                              style: StrokeStyle(lineWidth: 1.5, dash: [4, 3])))
                    Text(String(localized: "feature.scores.chua.co.iem"))
                        .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 18))
                        .foregroundStyle(AppColors.warning)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .frame(height: 56)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.scores.nhap.iem.cho"), String(describing: (test.name)), String(describing: (student.name))))
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
