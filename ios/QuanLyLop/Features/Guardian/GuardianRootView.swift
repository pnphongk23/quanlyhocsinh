import SwiftUI

private enum GuardianTab: String, CaseIterable, Identifiable {
    case overview = "Tổng quan"
    case attendance = "Điểm danh"
    case scores = "Điểm số"
    case comments = "Nhận xét"
    case reports = "Báo cáo"

    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .overview: "house"
        case .attendance: "calendar"
        case .scores: "chart.bar"
        case .comments: "text.bubble"
        case .reports: "doc.text"
        }
    }
}

struct GuardianRootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model: GuardianDashboard?
    @State private var selectedChildID: String?
    @State private var selectedTab: GuardianTab = .overview
    @State private var selectedMonth: String?
    @State private var selectedSlip: GuardianSlipDetail?
    @State private var errorMessage: String?
    @State private var isLoading = true

    private var child: GuardianChildData? {
        guard let model else { return nil }
        return model.children.first(where: { $0.student.id == (selectedChildID ?? model.children.first?.student.id) })
    }

    var body: some View {
        VStack(spacing: 0) {
            Group {
                if isLoading && model == nil {
                    AppSpinner()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage, model == nil {
                    AppErrorState(message: errorMessage, retry: { Task { await load() } })
                        .padding(24)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let child {
                    page(for: child)
                } else {
                    ContentUnavailableView(
                        "Chưa có con nào được liên kết",
                        systemImage: "person.crop.circle.badge.questionmark",
                        description: Text("Liên hệ giáo viên nếu bạn cần xem dữ liệu của con.")
                    )
                    .padding(24)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            tabBar
        }
        .background(AppColors.background.ignoresSafeArea())
        .preferredColorScheme(.light)
        .task { await load() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await load() } }
        }
          .sheet(item: $selectedSlip) { detail in
            NavigationStack {
                slipDetail(detail)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("Đóng") { selectedSlip = nil }
                                .foregroundStyle(AppColors.primaryInk)
                        }
                    }
            }
            .presentationDetents([.medium, .large])
        }
    }

    @ViewBuilder
    private func page(for child: GuardianChildData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                pageHeader(child)
                if let model, model.children.count > 1 { childPicker(model.children) }
                switch selectedTab {
                case .overview: overview(child)
                case .attendance: attendance(child)
                case .scores: scores(child)
                case .comments: comments(child)
                case .reports: reports(child)
                }
                if let errorMessage {
                    Text(errorMessage).appText(AppText.fieldError).foregroundStyle(AppColors.error)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 16)
        }
          .scrollIndicators(.hidden)
          .background(AppColors.background)
          .refreshable { await load() }
    }

    private func pageHeader(_ child: GuardianChildData) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(child.student.name).appText(AppText.muted).foregroundStyle(AppColors.muted)
            Text(selectedTab.rawValue).appText(AppText.titleCompact).foregroundStyle(AppColors.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func childPicker(_ children: [GuardianChildData]) -> some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(children) { item in
                    Button {
                        selectedChildID = item.student.id
                        selectedMonth = nil
                    } label: {
                        HStack(spacing: 8) {
                            Text(String(item.student.name.prefix(1)))
                                .font(AppFont.font(size: 12, weight: .bold))
                                .frame(width: 24, height: 24)
                                .background(selectedChildID == item.student.id ? AppColors.surface : AppColors.primarySoft, in: Circle())
                            Text(item.student.name).appText(AppText.segment)
                        }
                        .foregroundStyle(selectedChildID == item.student.id ? AppColors.onPrimary : AppColors.text)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(selectedChildID == item.student.id ? AppColors.primary : AppColors.surface, in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(GuardianTab.allCases) { tab in
                Button { selectedTab = tab; selectedMonth = nil } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.symbol).font(.system(size: 18, weight: .medium))
                        Text(tab.rawValue).appText(AppText.caption)
                            .lineLimit(1).minimumScaleFactor(0.8)
                    }
                    .foregroundStyle(selectedTab == tab ? AppColors.primaryInk : AppColors.muted)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 6)
        .background(AppColors.surface.shadow(color: .black.opacity(0.06), radius: 8, y: -2))
    }

    @ViewBuilder
    private func overview(_ child: GuardianChildData) -> some View {
        let month = currentMonth(for: child)
        let rows = child.attendanceRows(in: month)
        let attended = rows.filter { $0.status == .present || $0.status == .late }.count
        let late = rows.filter { $0.status == .late }.count
        let excused = rows.filter { $0.status == .excused }.count
        HStack(spacing: 8) {
            AppCard {
                Text("Đi học").appText(AppText.muted).foregroundStyle(AppColors.muted)
                Text("\(attended)/\(rows.count)").appText(AppText.title).foregroundStyle(AppColors.text)
                Text("buổi · \(late) muộn, \(excused) có phép").appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
        }
        if let latest = child.sentSlips.first {
            Button { selectedSlip = child.detail(for: latest) } label: {
                AppCard {
                    HStack {
                        Text("Nhận xét mới nhất").appText(AppText.subheading).foregroundStyle(AppColors.text)
                        Spacer()
                        Text("Buổi \(latest.session.sessionNumber ?? 0) ›").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    }
                    stars(latest.slip.stars)
                    Text(latest.slip.stars?.template ?? "").appText(AppText.body).foregroundStyle(AppColors.text)
                    if !latest.slip.note.isEmpty { noteBlock("Ghi chú", latest.slip.note) }
                }
            }
            .buttonStyle(.plain)
        }
        let recentScores = child.scoreRows(in: month).prefix(3)
        AppCard {
            HStack {
                Text("Điểm gần đây").appText(AppText.subheading).foregroundStyle(AppColors.text)
                Spacer()
                Button("Xem tất cả") { selectedTab = .scores }
                    .appText(AppText.muted).foregroundStyle(AppColors.primaryInk)
            }
            if recentScores.isEmpty {
                Text("Chưa có điểm trong tháng này.").appText(AppText.muted).foregroundStyle(AppColors.muted)
            } else {
                ForEach(Array(recentScores), id: \.test.id) { row in scoreRow(row) }
            }
        }
        .padding(.top, 0)
    }

    private func attendance(_ child: GuardianChildData) -> some View {
        let month = currentMonth(for: child)
        let rows = child.attendanceRows(in: month)
        let counts = AttendanceStatus.allCases.map { status in rows.filter { $0.status == status }.count }
        return VStack(spacing: 12) {
            monthPicker(month, months: child.months) { selectedMonth = $0 }
            HStack(spacing: 6) {
                ForEach(Array(AttendanceStatus.allCases.enumerated()), id: \.offset) { index, status in
                    VStack(spacing: 2) {
                        Text("\(counts[index])").appText(AppText.heading).foregroundStyle(AppColors.text)
                        Text(status.guardianLabel).appText(AppText.caption).foregroundStyle(AppColors.muted)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.row))
                }
            }
            if rows.isEmpty {
                Text("Chưa có buổi học nào trong tháng này.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(rows, id: \.session.id) { row in
                    AppListRow {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Buổi \(row.session.sessionNumber ?? 0) · \(GuardianFormat.dayMonth(row.session.date))")
                                .appText(AppText.label).foregroundStyle(AppColors.text)
                            if row.status == .late, let time = row.attendance?.lateAt, !time.isEmpty {
                                Text("Đến muộn \(time)").appText(AppText.caption).foregroundStyle(AppColors.muted)
                            }
                            if let note = row.attendance?.note, !note.isEmpty {
                                Text("Ghi chú: \(note)").appText(AppText.caption).foregroundStyle(AppColors.muted)
                            }
                        }
                        Spacer(minLength: 4)
                        if let status = row.status { AppPill(title: status.guardianLabel, tone: status.guardianTone) }
                        else { Text("Chưa điểm danh").appText(AppText.caption).foregroundStyle(AppColors.muted) }
                    }
                }
            }
        }
    }

    private func scores(_ child: GuardianChildData) -> some View {
        let month = currentMonth(for: child)
        let rows = child.scoreRows(in: month)
        return VStack(spacing: 12) {
            monthPicker(month, months: child.months) { selectedMonth = $0 }
            AppCard {
                HStack {
                    Text("Điểm từng bài").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    Spacer()
                    Text("\(rows.filter { $0.score?.value != nil }.count) bài có điểm")
                        .appText(AppText.muted).foregroundStyle(AppColors.muted)
                }
                if rows.isEmpty {
                    Text("Chưa có bài kiểm tra nào trong tháng này.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                } else {
                    ForEach(rows, id: \.test.id) { scoreRow($0) }
                }
            }
        }
    }

    private func comments(_ child: GuardianChildData) -> some View {
        VStack(spacing: 12) {
            if child.sentSlips.isEmpty {
                Text("Chưa có phiếu buổi học.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            ForEach(child.sentSlips) { item in
                Button { selectedSlip = child.detail(for: item) } label: {
                    AppCard {
                        HStack {
                            Text("Buổi \(item.session.sessionNumber ?? 0) · \(GuardianFormat.dayMonth(item.session.date))")
                                .appText(AppText.label).foregroundStyle(AppColors.text)
                            Spacer()
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(AppColors.muted)
                        }
                        stars(item.slip.stars)
                        Text(item.slip.stars?.template ?? "").appText(AppText.muted).foregroundStyle(AppColors.text).lineLimit(3)
                          let homework = child.homework(for: item.session)
                          if !homework.isEmpty {
                            Text("BTVN buổi trước: \(homework.count) phần").appText(AppText.caption).foregroundStyle(AppColors.muted)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func reports(_ child: GuardianChildData) -> some View {
        let month = currentReportMonth(for: child)
          if let publication = child.latestReport(in: month) {
              let report = publication.snapshot
              let starMaximum = max(report.stars.three, report.stars.two, report.stars.one)
            VStack(spacing: 12) {
                AppCard {
                    HStack {
                        Text("Báo cáo tháng \(GuardianFormat.monthNumber(month))").appText(AppText.heading).foregroundStyle(AppColors.text)
                        Spacer()
                    }
                }
                HStack(spacing: 4) {
                    Text(GuardianFormat.monthLabel(month)).appText(AppText.segment)
                        .foregroundStyle(AppColors.text).frame(maxWidth: .infinity, minHeight: 44)
                        .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.segment))
                    Text("3 tháng gần nhất").appText(AppText.segment)
                        .foregroundStyle(AppColors.muted).frame(maxWidth: .infinity, minHeight: 44)
                }
                .padding(4).background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.control))
                HStack(spacing: 8) {
                    reportStat("Chuyên cần", "\(report.attendance.present + report.attendance.late)/\(report.attendance.heldSessions) buổi", "\(report.attendance.late) muộn")
                    reportStat("Bài kiểm tra", "\(report.tests.filter { $0.value != nil }.count)/\(report.tests.count) bài", "đã có điểm")
                }
                AppCard {
                    HStack {
                        Text("Nhận xét theo sao").appText(AppText.subheading).foregroundStyle(AppColors.text)
                        Spacer()
                        Text("\(report.stars.three + report.stars.two + report.stars.one) buổi có phiếu")
                            .appText(AppText.caption).foregroundStyle(AppColors.muted)
                    }
                    Text("Tính trên các phiếu đã gửi.").appText(AppText.caption).foregroundStyle(AppColors.muted)
                      starBar("3 sao", count: report.stars.three, maximum: starMaximum)
                      starBar("2 sao", count: report.stars.two, maximum: starMaximum)
                      starBar("1 sao", count: report.stars.one, maximum: starMaximum)
                }
                AppCard {
                    Text("Bài tập về nhà").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    Text("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành").appText(AppText.caption).foregroundStyle(AppColors.muted)
                    if report.homework.isEmpty {
                        Text("Chưa có kết quả bài tập đã gửi trong tháng này.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    } else {
                        HStack {
                            Text("Phần").frame(maxWidth: .infinity, alignment: .leading)
                            Text("Tốt").frame(width: 42, alignment: .trailing)
                            Text("Hoàn thành").frame(width: 82, alignment: .trailing)
                            Text("Chưa").frame(width: 42, alignment: .trailing)
                        }.appText(AppText.caption).foregroundStyle(AppColors.muted)
                        ForEach(report.homework, id: \.kind) { row in
                            HStack {
                                Text(row.kind.guardianLabel).frame(maxWidth: .infinity, alignment: .leading)
                                Text("\(row.excellent)").foregroundStyle(AppColors.success).frame(width: 42, alignment: .trailing)
                                Text("\(row.done)").foregroundStyle(AppColors.primaryInk).frame(width: 82, alignment: .trailing)
                                Text("\(row.notDone)").foregroundStyle(AppColors.error).frame(width: 42, alignment: .trailing)
                            }.appText(AppText.caption).foregroundStyle(AppColors.text)
                        }
                    }
                    Text("Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.").appText(AppText.caption).foregroundStyle(AppColors.muted)
                }
                AppCard {
                    Text("Điểm từng bài").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    if report.tests.isEmpty {
                        Text("Không có bài kiểm tra trong tháng này.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    } else {
                        ForEach(report.tests, id: \.testId) { row in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(row.name).appText(AppText.body).foregroundStyle(AppColors.text)
                                    Text(GuardianFormat.dayMonth(row.date)).appText(AppText.caption).foregroundStyle(AppColors.muted)
                                }
                                Spacer()
                            Text(row.value.map { String(format: "%.1f/%d", $0, row.max) } ?? "Chưa có điểm")
                                    .appText(AppText.label).foregroundStyle(AppColors.text)
                            }
                        }
                    }
                }
                  if publication.hasPdf {
                      AppButton(title: "Tải PDF về máy", systemImage: "arrow.down.to.line", size: .large) { }
                          .disabled(true)
                          .accessibilityHint("Tải PDF đã phát hành sẽ được nối khi API hỗ trợ tệp nhị phân trong Core.")
                }
            }
        } else {
            AppCard {
                Text("Cô chưa phát hành báo cáo tháng này").appText(AppText.subheading).foregroundStyle(AppColors.text)
                Text("Báo cáo hiện ở đây sau khi cô phát hành cho phụ huynh.").appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
        }
    }

    private func slipDetail(_ detail: GuardianSlipDetail) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Buổi \(detail.session.sessionNumber ?? 0) · \(GuardianFormat.dayMonth(detail.session.date))")
                    .appText(AppText.titleCompact).foregroundStyle(AppColors.text)
                AppCard {
                    Text("Nhận xét của giáo viên").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    stars(detail.slip.stars)
                    Text(detail.slip.stars?.template ?? "").appText(AppText.body).foregroundStyle(AppColors.text)
                    if !detail.slip.note.isEmpty { noteBlock("Ghi chú", detail.slip.note) }
                }
                AppCard {
                    Text("Kết quả BTVN buổi trước").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    if detail.previousHomework.isEmpty {
                        Text("Buổi này không có kết quả BTVN đã gửi.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    } else {
                        ForEach(detail.previousHomework) { homework in homeworkRow(homework, showGrade: true) }
                    }
                }
                AppCard {
                    Text("BTVN mới").appText(AppText.subheading).foregroundStyle(AppColors.text)
                    if detail.assignedHomework.isEmpty {
                        Text("Buổi này không giao bài tập về nhà.").appText(AppText.muted).foregroundStyle(AppColors.muted)
                    } else {
                        ForEach(detail.assignedHomework) { homework in homeworkRow(homework, showGrade: false) }
                    }
                }
            }.padding(16)
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
    }

    private func homeworkRow(_ row: GuardianHomeworkData, showGrade: Bool) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: row.kind.symbol).foregroundStyle(AppColors.primaryInk)
                .frame(width: 36, height: 36).background(AppColors.primarySoft, in: RoundedRectangle(cornerRadius: AppRadius.chip))
            VStack(alignment: .leading, spacing: 2) {
                Text(row.kind.guardianLabel.uppercased()).appText(AppText.caption).foregroundStyle(AppColors.primaryInk)
                Text(row.title).appText(AppText.label).foregroundStyle(AppColors.text)
                if !row.description.isEmpty { Text(row.description).appText(AppText.caption).foregroundStyle(AppColors.muted) }
            }
            Spacer()
            if showGrade {
                Text(row.level?.guardianLabel ?? "Chưa chấm").appText(AppText.caption).foregroundStyle(row.level?.tone ?? AppColors.muted)
            }
        }
        .padding(.vertical, 8)
    }

    private func monthPicker(_ month: String, months: [String], onChange: @escaping (String) -> Void) -> some View {
        let available = months.isEmpty ? [month] : months.sorted()
        let index = available.firstIndex(of: month) ?? max(0, available.count - 1)
        return HStack {
            Button { if index > 0 { onChange(available[index - 1]) } } label: { Image(systemName: "chevron.left").frame(width: 40, height: 40) }
                .disabled(index == 0)
            Spacer()
            Text(GuardianFormat.monthLabel(month)).appText(AppText.segment).foregroundStyle(AppColors.text)
            Spacer()
            Button { if index < available.count - 1 { onChange(available[index + 1]) } } label: { Image(systemName: "chevron.right").frame(width: 40, height: 40) }
                .disabled(index >= available.count - 1)
        }
        .foregroundStyle(AppColors.primaryInk)
        .padding(4)
        .background(AppColors.surface, in: Capsule())
    }

    private func reportStat(_ title: String, _ value: String, _ detail: String) -> some View {
        AppCard {
            Text(title).appText(AppText.muted).foregroundStyle(AppColors.muted)
            Text(value).appText(AppText.heading).foregroundStyle(AppColors.text)
            Text(detail).appText(AppText.caption).foregroundStyle(AppColors.muted)
        }
    }

    private func starBar(_ label: String, count: Int, maximum: Int) -> some View {
        HStack {
            Text(label).appText(AppText.caption).foregroundStyle(Color(red: 0.90, green: 0.65, blue: 0.04))
                .frame(width: 52, alignment: .leading)
            GeometryReader { proxy in
                Capsule().fill(AppColors.background).overlay(alignment: .leading) {
                    Capsule().fill(Color(red: 0.90, green: 0.65, blue: 0.04))
                        .frame(width: maximum == 0 ? 0 : proxy.size.width * CGFloat(count) / CGFloat(maximum))
                }
            }.frame(height: 12)
            Text("\(count) buổi").appText(AppText.caption).foregroundStyle(AppColors.text)
                .frame(width: 52, alignment: .trailing)
        }.frame(height: 20)
    }

    private func scoreRow(_ row: GuardianScoreRow) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(row.test.name).appText(AppText.body).foregroundStyle(AppColors.text)
                Text(GuardianFormat.dayMonth(row.test.date)).appText(AppText.caption).foregroundStyle(AppColors.muted)
            }
            Spacer()
            Text(row.score?.value.map { String(format: "%.1f/%d", $0, row.test.maxScore) } ?? "Chưa có điểm")
                .appText(AppText.label).foregroundStyle(AppColors.text)
        }
        .padding(.vertical, 8)
    }

    private func stars(_ value: Stars?) -> some View {
        HStack(spacing: 2) {
            ForEach(1...3, id: \.self) { index in
                Image(systemName: index <= (value?.rawValue ?? 0) ? "star.fill" : "star")
                    .font(.system(size: 16)).foregroundStyle(Color(red: 0.90, green: 0.65, blue: 0.04))
            }
        }
        .accessibilityLabel(value.map { "\($0.rawValue) sao" } ?? "Chưa có sao")
    }

    private func noteBlock(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).appText(AppText.caption).foregroundStyle(AppColors.muted)
            Text(value).appText(AppText.muted).foregroundStyle(AppColors.text)
        }
        .padding(10).frame(maxWidth: .infinity, alignment: .leading)
        .background(AppColors.background, in: RoundedRectangle(cornerRadius: AppRadius.chip))
    }

    private func currentMonth(for child: GuardianChildData) -> String {
        if let selectedMonth, child.months.contains(selectedMonth) { return selectedMonth }
        return child.months.last ?? GuardianFormat.currentMonth
    }

    private func currentReportMonth(for child: GuardianChildData) -> String {
        child.reportMonths.first ?? GuardianFormat.currentMonth
    }

    @MainActor
    private func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let next = try await GuardianRepository.load()
            model = next
            if let selectedChildID, !next.children.contains(where: { $0.student.id == selectedChildID }) {
                self.selectedChildID = nil
            }
            if self.selectedChildID == nil { self.selectedChildID = next.children.first?.student.id }
            errorMessage = nil
        } catch {
            errorMessage = "Không tải được dữ liệu của con. Vui lòng thử lại."
        }
    }
}

#Preview {
    GuardianRootView()
}
