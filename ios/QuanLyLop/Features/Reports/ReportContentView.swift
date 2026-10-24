import SwiftUI

/// The report as the parent receives it, drawn from a snapshot: attendance, scores per test (no
/// average), 3/2/1-star counts, homework per part and the general comment.
struct ReportContentView: View {
    let snapshot: ReportSnapshot
    let comment: String

    private var starTotal: Int { snapshot.stars.three + snapshot.stars.two + snapshot.stars.one }

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
            facts
            starsBlock
            homeworkBlock
            testsBlock
            commentBlock
        }
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.listGap) { content() }
            .padding(TeacherMetrics.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
    }

    private func note(_ text: String, size: CGFloat = 14) -> some View {
        Text(text).appText(AppTextStyle(size: size, weight: .regular, lineHeight: size * 1.5)).foregroundStyle(AppColors.muted)
    }

    private var facts: some View {
        let attended = snapshot.attendance.present + snapshot.attendance.late
        let graded = snapshot.tests.filter { $0.value != nil }.count
        return card {
            HStack(spacing: TeacherMetrics.listGap) {
                ReportFactCard(label: String(localized: "feature.reports.chuyen.can"),
                               value: String.localizedStringWithFormat(String(localized: "feature.reports.buoi"), String(describing: attended), String(describing: snapshot.attendance.heldSessions)),
                               detail: ReportRules.attendanceDetail(snapshot.attendance))
                ReportFactCard(label: String(localized: "feature.reports.bai.kiem.tra"),
                               value: String.localizedStringWithFormat(String(localized: "feature.reports.bai"), String(describing: graded), String(describing: snapshot.tests.count)),
                               detail: String(localized: "feature.reports.a.co.iem"))
            }
        }
    }

    private var starsBlock: some View {
        let stars = snapshot.stars
        let maxCount = max(1, stars.three, stars.two, stars.one)
        return AppSection(title: String(localized: "feature.reports.nhan.xet.theo.sao")) {
            card {
                note(String.localizedStringWithFormat(String(localized: "feature.reports.buoi.co.phieu"), String(describing: starTotal)), size: 15)
                note(String(localized: "feature.reports.tinh.tren.cac.phieu.a.gui"))
                if starTotal == 0 {
                    note(String(localized: "reports.stars.none", table: "Reports"))
                } else {
                    starRow(3, count: stars.three, maxCount: maxCount)
                    starRow(2, count: stars.two, maxCount: maxCount)
                    starRow(1, count: stars.one, maxCount: maxCount)
                }
            }
        }
    }

    private func starRow(_ level: Int, count: Int, maxCount: Int) -> some View {
        HStack(spacing: TeacherMetrics.contentGap) {
            Text(String(repeating: "★", count: level))
                .font(.system(size: 20)).foregroundStyle(I4Style.starBar).lineLimit(1)
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(AppColors.divider)
                    Capsule().fill(I4Style.starBar)
                        .frame(width: geometry.size.width * CGFloat(count) / CGFloat(maxCount))
                }
            }
            .frame(height: 10)
            Text(String.localizedStringWithFormat(String(localized: "feature.reports.buoi.d5e8f7ce"), String(describing: count)))
                .appText(AppTextStyle(size: 16, weight: .bold, lineHeight: 24)).foregroundStyle(AppColors.text)
                .frame(minWidth: 60, alignment: .trailing)
        }
        .frame(minHeight: 32)
    }

    private var homeworkBlock: some View {
        AppSection(title: String(localized: "feature.reports.bai.tap.ve.nha")) { card {
            note(String(localized: "feature.reports.tot.hoan.thanh.tot.chua.chua.hoan.thanh"))
            if snapshot.homework.isEmpty {
                note(String(localized: "reports.homework.none", table: "Reports"))
            } else {
                HStack(spacing: TeacherMetrics.listGap) {
                    Text(String(localized: "feature.reports.phan")).frame(maxWidth: .infinity, alignment: .leading)
                    Text(String(localized: "feature.reports.tot")).frame(width: 46, alignment: .trailing)
                    Text(String(localized: "feature.reports.hoan.thanh")).frame(width: 82, alignment: .trailing)
                    Text(String(localized: "feature.reports.chua")).frame(width: 46, alignment: .trailing)
                }
                .appText(AppTextStyle(size: 14, weight: .semiBold, lineHeight: 21)).foregroundStyle(AppColors.muted)
                ForEach(snapshot.homework, id: \.kind) { homeworkRow($0) }
            }
            note(String(localized: "feature.reports.chi.tinh.ket.qua.a.gui.khong.tinh.phan.chua.cham"), size: 13)
        } }
    }

    private func homeworkRow(_ item: HomeworkSummary) -> some View {
        HStack(spacing: TeacherMetrics.listGap) {
            Text(item.kind.label)
                .appText(AppTextStyle(size: 15, weight: .semiBold, lineHeight: 22.5)).foregroundStyle(AppColors.text)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text("\(item.excellent)").foregroundStyle(AppColors.success).frame(width: 46, alignment: .trailing)
            Text("\(item.done)").foregroundStyle(AppColors.primary).frame(width: 82, alignment: .trailing)
            Text("\(item.notDone)").foregroundStyle(AppColors.error).frame(width: 46, alignment: .trailing)
        }
        .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5))
        .padding(.vertical, 10)
        .overlay(alignment: .bottom) { AppColors.divider.frame(height: AppMetrics.hairline) }
    }

    private var testsBlock: some View {
        AppSection(title: String(localized: "feature.reports.iem.tung.bai")) { card {
            if snapshot.tests.isEmpty {
                note(String(localized: "reports.tests.none", table: "Reports"))
            } else {
                ForEach(snapshot.tests, id: \.testId) { test in
                    HStack(spacing: TeacherMetrics.contentGap) {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(test.name)
                                .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 22.5)).foregroundStyle(AppColors.text)
                            note(I4Format.date(test.date), size: 13)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Text(test.value.map { "\(I4Format.score($0))/\(test.max)" } ?? String(localized: "feature.reports.noScore"))
                            .appText(AppTextStyle(size: 15, weight: .bold, lineHeight: 22.5)).foregroundStyle(AppColors.text)
                    }
                    .frame(minHeight: AppMetrics.tap)
                    .padding(.vertical, 5)
                    .overlay(alignment: .bottom) { AppColors.divider.frame(height: AppMetrics.hairline) }
                }
            }
            note(String(localized: "feature.reports.bai.chua.co.iem.can.cham.truoc.khi.phat.hanh"), size: 13)
        } }
    }

    private var commentBlock: some View {
        AppSection(title: String(localized: "feature.reports.nhan.xet.chung")) { card {
            if comment.isEmpty {
                note(String(localized: "feature.reports.chua.co.nhan.xet.chung"))
            } else {
                Text(comment)
                    .appText(AppTextStyle(size: 15, weight: .regular, lineHeight: 23.25)).foregroundStyle(AppColors.text)
            }
        } }
    }
}

struct ReportFactCard: View {
    let label: String
    let value: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: AppMetrics.fieldGap) {
            Text(label).appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2)).foregroundStyle(AppColors.muted)
            Text(value).appText(AppTextStyle(size: 18, weight: .bold, lineHeight: 23.4)).foregroundStyle(AppColors.text)
            if !detail.isEmpty {
                Text(detail).appText(AppTextStyle(size: 13, weight: .regular, lineHeight: 18.2)).foregroundStyle(AppColors.muted)
            }
        }
        .padding(.horizontal, TeacherMetrics.contentGap)
        .padding(.vertical, TeacherMetrics.listGap)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.row))
    }
}
