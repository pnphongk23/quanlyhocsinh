import XCTest
@testable import QuanLyLop

final class CommentsRulesTests: XCTestCase {
    private func student(_ id: String, _ name: String) -> Student {
        Student(id: id, classId: "c", name: name, parentPhone: nil, enrolledAt: "2026-09-01",
                leftAt: nil, status: .active, version: 1)
    }

    private func row(_ id: String, _ name: String, stars: Stars?, sent: Bool,
                     graded: Int = 0, total: Int = 0) -> I4TicketRow {
        let slip = SessionSlip(sessionId: "s", studentId: id, stars: stars, note: "",
                               status: sent ? .sent : .draft,
                               sentAt: sent ? "2026-10-19T11:00:00.000Z" : nil,
                               version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        return I4TicketRow(student: student(id, name), slip: slip,
                           previousHomework: I4HomeworkSummary(total: total, graded: graded),
                           previousDate: "2026-10-14", previousHadSections: true)
    }

    func testCountsAndLabels() {
        let rows = [
            row("a", "An", stars: .three, sent: true, graded: 2, total: 2),
            row("b", "Bình", stars: nil, sent: false),
            row("c", "Chi", stars: .two, sent: false)
        ]
        let counts = CommentsRules.counts(rows)
        XCTAssertEqual(counts.all, 3)
        XCTAssertEqual(counts.none, 1)
        XCTAssertEqual(counts.unsent, 2)
        XCTAssertEqual(CommentsRules.filterLabel(.all, counts), "Tất cả (3)")
        XCTAssertEqual(CommentsRules.filterLabel(.none, counts), "Chưa chọn sao (1)")
        XCTAssertEqual(CommentsRules.filterLabel(.unsent, counts), "Chưa gửi (2)")
        XCTAssertEqual(CommentsRules.filtered(rows, .none).map(\.student.id), ["b"])
        XCTAssertEqual(CommentsRules.filtered(rows, .unsent).map(\.student.id), ["b", "c"])
        XCTAssertEqual(CommentsRules.filtered(rows, .all).count, 3)
    }

    func testSendableRequiresStarsAndNotSent() {
        let rows = [
            row("a", "An", stars: .three, sent: true),
            row("b", "Bình", stars: nil, sent: false),
            row("c", "Chi", stars: .one, sent: false)
        ]
        XCTAssertEqual(CommentsRules.sendable(rows).map(\.student.id), ["c"])
        let notice = CommentsRules.ungradedNotice([
            row("c", "Chi", stars: .one, sent: false, graded: 1, total: 3),
            row("d", "Dũng", stars: .two, sent: false, graded: 2, total: 2),
            row("e", "Em", stars: nil, sent: false, graded: 0, total: 2)
        ])
        // Only slips that will actually be sent count toward the reminder.
        XCTAssertEqual(notice.students, 1)
        XCTAssertEqual(notice.parts, 2)
    }

    func testBadgeCopyFollowsSlipStatus() {
        let time = I4Format.time("2026-10-19T11:00:00.000Z") ?? ""
        XCTAssertEqual(CommentsRules.badge(row("a", "An", stars: .three, sent: true)).label, "Đã gửi · \(time)")
        XCTAssertEqual(CommentsRules.badge(row("a", "An", stars: .three, sent: true)).tone, .success)
        XCTAssertEqual(CommentsRules.badge(row("b", "Bình", stars: nil, sent: false)).label, "Chưa gửi")
        XCTAssertEqual(CommentsRules.badge(row("b", "Bình", stars: nil, sent: false)).tone, .neutral)
    }

    func testHomeworkLineCopy() {
        let ungraded = CommentsRules.homeworkLine(row("c", "Chi", stars: .one, sent: false, graded: 1, total: 3))
        XCTAssertEqual(ungraded.text, "BTVN ngày 14/10: 2 phần Chưa chấm")
        XCTAssertTrue(ungraded.warning)

        let graded = CommentsRules.homeworkLine(row("a", "An", stars: .three, sent: true, graded: 3, total: 3))
        XCTAssertEqual(graded.text, "BTVN ngày 14/10: 3/3 phần đã chấm")
        XCTAssertFalse(graded.warning)

        let noneGiven = I4TicketRow(student: student("d", "Dũng"), slip: nil,
                                    previousHomework: I4HomeworkSummary(total: 0, graded: 0),
                                    previousDate: "2026-10-14", previousHadSections: true)
        XCTAssertEqual(CommentsRules.homeworkLine(noneGiven).text, "Buổi trước không giao BTVN")

        let first = I4TicketRow(student: student("e", "Em"), slip: nil,
                                previousHomework: I4HomeworkSummary(total: 0, graded: 0),
                                previousDate: nil, previousHadSections: false)
        XCTAssertEqual(CommentsRules.homeworkLine(first).text, "Buổi đầu · chưa có BTVN buổi trước")
    }

    /// The three sample sentences are fixed by `docs/spec.md` mục 4; compare every character.
    func testStarTemplatesMatchTheSpecVerbatim() {
        XCTAssertEqual(Stars.three.template,
                       "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!")
        XCTAssertEqual(Stars.two.template,
                       "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.")
        XCTAssertEqual(Stars.one.template,
                       "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.")
    }

    func testSendAvailabilityLocksOfflineAndNeverQueues() {
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 3, isOnline: true), .ready)
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 0, isOnline: true), .nothingToSend)
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 3, isOnline: false), .needsNetwork)
        XCTAssertEqual(CommentsRules.sendAvailability(sendableCount: 0, isOnline: false), .needsNetwork)
    }
}
