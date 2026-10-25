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

    private enum Grid {
        static let headerHeight: CGFloat = 84
        static let rowHeight: CGFloat = 60
        static let nameWidth: CGFloat = 136
        static let testWidth: CGFloat = 132
    }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: 8) {
                if tests.isEmpty {
                    emptyState
                } else {
                    if data.canWriteScores { newButton }
                    tableCard
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, TeacherMetrics.contentGap * 2)
        }
        .background(AppColors.background.ignoresSafeArea())
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

    /// Both columns size every row from `Grid`, so a name and its scores share one baseline.
    private var tableCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 0) {
                studentColumn
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 0) {
                        ForEach(tests) { test in testColumn(test) }
                    }
                    .padding(.trailing, 8)
                }
            }
            Text(String.localizedStringWithFormat(String(localized: "feature.scores.hien.thi.hoc.sinh.ang.hoc.va.hoc.sinh.a.nghi.nha"), String(describing: (activeCount)), String(describing: (leftCount))))
                .appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .padding(.top, 12)
        }
        .padding(.leading, 16)
        .padding(.vertical, 14)
        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private var studentColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(String(localized: "feature.scores.hoc.sinh"))
                .appText(AppTextStyle(size: 13, weight: .semiBold, lineHeight: 19.5))
                .foregroundStyle(AppColors.muted)
                .padding(.horizontal, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(height: Grid.headerHeight)
                .overlay(alignment: .bottom) { AppColors.border.frame(height: 1) }
            ForEach(students, id: \.id) { student in
                studentCell(student)
            }
        }
        .frame(width: Grid.nameWidth)
    }

    private func studentCell(_ student: Student) -> some View {
        let active = student.status == .active
        return VStack(alignment: .leading, spacing: 0) {
            Text(student.name)
                .appText(AppTextStyle(size: 14, weight: .medium, lineHeight: 20))
                .foregroundStyle(AppColors.text)
                .lineLimit(2)
                .opacity(active ? 1 : 0.62)
            if !active {
                Text(String(localized: "feature.scores.a.nghi"))
                    .appText(AppTextStyle(size: 12, weight: .semiBold, lineHeight: 16))
                    .foregroundStyle(AppColors.muted)
            }
        }
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: Grid.rowHeight)
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
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                    Text(I4Format.dayMonth(test.date))
                        .appText(AppTextStyle(size: 12, weight: .regular, lineHeight: 18))
                        .foregroundStyle(AppColors.muted)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, 6)
                .frame(maxWidth: .infinity)
                .frame(height: Grid.headerHeight)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .overlay(alignment: .bottom) { AppColors.border.frame(height: 1) }
            ForEach(students, id: \.id) { student in
                scoreCell(test, student)
            }
        }
        .frame(width: Grid.testWidth)
    }

    private func scoreCell(_ test: TestDefinition, _ student: Student) -> some View {
        let value = data.score(testID: test.id, studentID: student.id)?.value
        return NavigationLink {
            TestScoresView(classID: classID, testID: test.id, data: data, focusStudentID: student.id)
        } label: {
            Group {
                if let value {
                    Text(I4Format.score(value))
                        .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5))
                        .foregroundStyle(AppColors.text)
                } else {
                    Text(I4Format.score(nil))
                        .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
                        .foregroundStyle(AppColors.placeholder)
                }
            }
            .monospacedDigit()
            .frame(maxWidth: .infinity)
            .frame(height: Grid.rowHeight)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { AppColors.divider.frame(height: 1) }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localizedStringWithFormat(String(localized: "feature.scores.nhap.iem.cho"), String(describing: (test.name)), String(describing: (student.name))))
    }

    private var emptyState: some View {
        AppEmptyState(
            title: String(localized: "feature.scores.chua.co.bai.kiem.tra"),
            description: String(localized: "feature.scores.tao.bai.kiem.tra.au.tien.sau.o.nhap.iem.cho.ca.l"),
            size: .compact,
            actionTitle: String(localized: "feature.scores.tao.bai.kiem.tra"),
            action: { showingCreate = true }
        )
        .padding(.horizontal, 16)
    }
}
