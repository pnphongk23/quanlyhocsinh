import SwiftUI
import XCTest
@testable import QuanLyLop

/// The "Chọn con" sheet with 1, 4 and 8 children and long names: every row keeps a 44 pt tap height, nothing is wider
/// than the screen, and the sheet grows with the number of children. Set `QLH_PICKER_DIR` to also write PNGs.
@MainActor
final class GuardianChildPickerTests: XCTestCase {
    private func items(_ count: Int) -> [GuardianChildPickerSheet.Item] {
        let names = ["Nguyễn Hoàng Minh Châu Anh", "Trần Gia Bảo", "Lê Thị Phương Thảo Nguyên Hạnh Phúc", "Phạm An",
                     "Đặng Quốc Khánh Duy", "Vũ Ngọc Diệp", "Bùi Thanh Tùng", "Hoàng Mai Linh Chi"]
        let classes = ["Tiếng Anh giao tiếp nâng cao lớp 6A buổi tối", "Ngữ pháp 7B", "IELTS Foundation", "Starters 1"]
        return (0..<count).map { .init(id: "c\($0)", name: names[$0 % names.count], className: classes[$0 % classes.count]) }
    }

    private func sheet(_ count: Int) -> some View {
        GuardianChildPickerSheet(children: items(count), selectedID: "c0", select: { _ in }, close: {})
            .frame(width: 390)
            .background(AppColors.surface)
    }

    private func height(_ count: Int) -> CGSize {
        let rows = GuardianChildPickerSheet(children: items(count), selectedID: "c0", select: { _ in }, close: {}).rows
            .frame(width: 390 - 48)
        let host = UIHostingController(rootView: rows)
        return host.sizeThatFits(in: CGSize(width: 390, height: 4000))
    }

    func testSheetFitsTheScreenWidthAndGrowsWithTheNumberOfChildren() {
        let one = height(1), four = height(4), eight = height(8)
        for size in [one, four, eight] { XCTAssertLessThanOrEqual(size.width, 390) }
        XCTAssertLessThan(one.height, four.height)
        XCTAssertLessThan(four.height, eight.height)
        let perRow = (eight.height - four.height) / 4
        XCTAssertGreaterThanOrEqual(perRow, AppMetrics.tap + AppSpace.s8, "each row keeps the tap height plus the gap")
    }

    func testRenderPickerSheets() throws {
        guard let directory = ProcessInfo.processInfo.environment["QLH_PICKER_DIR"] else {
            throw XCTSkip("QLH_PICKER_DIR not set: screenshot run only")
        }
        let folder = URL(fileURLWithPath: directory, isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        for count in [1, 4, 8] {
            try TeacherScreenshotTests.snapshot(sheet(count), to: folder.appendingPathComponent("child-picker-\(count).png"))
        }
    }
}

final class GuardianScheduleRulesTests: XCTestCase {
    private func row(_ id: String, _ date: String, _ time: String = "18:00", status: SessionStatus = .planned) -> GuardianSessionRow {
        GuardianSessionRow(session: ClassSession(id: id, classId: "c", date: date, startTime: time, origin: .recurring, status: status),
                           attendance: nil, sentSlip: nil)
    }

    func testUpcomingStartsToday_keepsCancelledAndIsSoonestFirst() {
        let rows = [row("old", "2026-10-20"), row("later", "2026-11-05"), row("today", "2026-10-29", status: .cancelled),
                    row("soon", "2026-10-31")]
        let upcoming = GuardianScheduleRules.upcoming(rows, today: "2026-10-29")
        XCTAssertEqual(upcoming.map(\.id), ["today", "soon", "later"])
        XCTAssertEqual(GuardianScheduleRules.upcoming(rows, today: "2026-10-29", limit: 2).map(\.id), ["today", "soon"])
    }

    func testByDateGroupsSessionsOfTheSameDayByTime() {
        let grouped = GuardianScheduleRules.byDate([row("b", "2026-10-30", "19:00"), row("a", "2026-10-30", "17:00"),
                                                    row("c", "2026-10-31")])
        XCTAssertEqual(grouped["2026-10-30"]?.map(\.id), ["a", "b"])
        XCTAssertEqual(grouped.count, 2)
    }

    func testADayHasADotExactlyWhenItsListIsNotEmpty_includingTheSelectedDayWithNoSession() {
        let grouped = GuardianScheduleRules.byDate([row("a", "2026-10-30"), row("b", "2026-10-31", status: .cancelled)])
        for date in ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"] {
            XCTAssertEqual(GuardianScheduleRules.hasSessions(on: date, in: grouped), !(grouped[date] ?? []).isEmpty, date)
        }
        XCTAssertFalse(GuardianScheduleRules.hasSessions(on: "2026-10-29", in: grouped), "today without a session has no dot")
        XCTAssertTrue(GuardianScheduleRules.hasSessions(on: "2026-10-31", in: grouped), "a cancelled session still counts")
    }
}

final class StateColorTokenTests: XCTestCase {
    func testSelectedAndStatusBadgesAreSolidWithWhiteText() {
        XCTAssertEqual(AppState.selectedBg, AppColors.primary)
        XCTAssertEqual(AppState.selectedFg, AppColors.onPrimary)
        XCTAssertEqual(AppState.successBg, AppColors.success)
        XCTAssertEqual(AppState.errorBg, AppColors.error)
        XCTAssertEqual(AppState.pendingBg, AppColors.warning)
        for fg in [AppState.successFg, AppState.errorFg, AppState.pendingFg] { XCTAssertEqual(fg, AppColors.onPrimary) }
    }

    func testStatusCardsKeepTheSoftFillWithAStrongBorderAndText() {
        XCTAssertEqual(AppState.cardSuccessBg, AppColors.successSoft)
        XCTAssertEqual(AppState.cardSuccessBorder, AppColors.success)
        XCTAssertEqual(AppState.cardSuccessFg, AppColors.success)
        XCTAssertEqual(AppState.cardErrorBg, AppColors.errorSoft)
        XCTAssertEqual(AppState.cardErrorBorder, AppColors.error)
        XCTAssertEqual(AppState.cardPendingBg, AppColors.warningSoft)
        XCTAssertEqual(AppState.cardPendingFg, AppColors.warning)
    }
}

final class TeacherScheduleDotTests: XCTestCase {
    func testADayHasADotExactlyWhenItsListIsNotEmpty() {
        let grouped = ["2026-10-30": [1], "2026-10-31": [2, 3], "2026-11-01": []]
        for date in ["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"] {
            XCTAssertEqual(TeacherScheduleView.marksDay(date, in: grouped), !(grouped[date] ?? []).isEmpty, date)
        }
        XCTAssertFalse(TeacherScheduleView.marksDay("2026-10-29", in: grouped))
    }
}
