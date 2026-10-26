import XCTest
@testable import QuanLyLop

final class CommentsRulesTests: XCTestCase {
    private func student(_ id: String, _ name: String) -> Student {
        Student(id: id, classId: "c", name: name, parentPhone: nil, enrolledAt: "2026-09-01",
                leftAt: nil, status: .active, version: 1)
    }

    /// `stars` nil means no slip yet.
    private func row(_ id: String, _ name: String, stars: Int?, sent: Bool,
                     attendance: AttendanceStatus? = nil, graded: Int = 0, total: Int = 0) -> I4TicketRow {
        let slip = stars.map {
            SessionSlip(sessionId: "s", studentId: id, stars: $0, criteria: (1 << $0) - 1, note: "",
                        status: sent ? .sent : .draft,
                        sentAt: sent ? "2026-10-19T11:00:00.000Z" : nil,
                        version: 1, updatedAt: "2026-10-19T11:00:00.000Z")
        }
        return I4TicketRow(student: student(id, name), slip: slip, attendance: attendance,
                           previousHomework: I4HomeworkSummary(total: total, graded: graded),
                           previousDate: "2026-10-14", previousHadSections: true)
    }

    func testCountsAndLabelsOfTheTwoFilters() {
        let rows = [
            row("a", "An", stars: 5, sent: true, graded: 2, total: 2),
            row("b", "Bình", stars: nil, sent: false),
            row("c", "Chi", stars: 2, sent: false)
        ]
        let counts = CommentsRules.counts(rows)
        XCTAssertEqual(counts.all, 3)
        XCTAssertEqual(counts.unsent, 2)
        XCTAssertEqual(TicketFilter.allCases, [.all, .unsent])
        XCTAssertEqual(CommentsRules.filterLabel(.all, counts), "Tất cả (3)")
        XCTAssertEqual(CommentsRules.filterLabel(.unsent, counts), "Chưa gửi (2)")
        XCTAssertEqual(CommentsRules.filtered(rows, .unsent).map(\.student.id), ["b", "c"])
        XCTAssertEqual(CommentsRules.filtered(rows, .all).count, 3)
    }

    func testSendableIsEveryUnsentSlipPlusAttendedStudentsWithoutOne() {
        let rows = [
            row("sent", "An", stars: 5, sent: true, attendance: .present),
            row("draft", "Bình", stars: 3, sent: false, attendance: .absent),
            row("present", "Chi", stars: nil, sent: false, attendance: .present),
            row("late", "Dũng", stars: nil, sent: false, attendance: .late),
            row("absent", "Em", stars: nil, sent: false, attendance: .absent),
            row("unmarked", "Giang", stars: nil, sent: false)
        ]
        XCTAssertEqual(CommentsRules.sendable(rows).map(\.student.id), ["draft", "present", "late"])
        XCTAssertEqual(CommentsRules.withoutSlip(rows).map(\.student.id), ["absent", "unmarked"])
        XCTAssertEqual(rows.filter(\.getsDefaultSlip).map(\.student.id), ["present", "late"])
    }

    func testSendMatrixCoversEveryAttendanceWithAndWithoutADraftSlip() {
        let statuses: [(name: String, value: AttendanceStatus?, attended: Bool)] = [
            ("present", .present, true), ("late", .late, true), ("absent", .absent, false),
            ("unmarked", nil, false)
        ]
        var rows: [I4TicketRow] = []
        var expectedSendable: [String] = []
        var expectedWithoutSlip: [String] = []
        var expectedDefault: [String] = []
        for status in statuses {
            let bare = "\(status.name)-none"
            let draft = "\(status.name)-draft"
            rows.append(row(bare, bare, stars: nil, sent: false, attendance: status.value))
            rows.append(row(draft, draft, stars: 2, sent: false, attendance: status.value))
            expectedSendable.append(draft)
            if status.attended {
                expectedSendable.append(bare)
                expectedDefault.append(bare)
            } else {
                expectedWithoutSlip.append(bare)
            }
        }
        rows.append(row("already-sent", "Đã gửi", stars: 3, sent: true, attendance: .present))

        XCTAssertEqual(Set(CommentsRules.sendable(rows).map(\.student.id)), Set(expectedSendable))
        XCTAssertEqual(CommentsRules.sendable(rows).count, expectedSendable.count)
        XCTAssertEqual(Set(CommentsRules.withoutSlip(rows).map(\.student.id)), Set(expectedWithoutSlip))
        XCTAssertEqual(CommentsRules.withoutSlip(rows).count, expectedWithoutSlip.count)
        XCTAssertEqual(Set(rows.filter(\.getsDefaultSlip).map(\.student.id)), Set(expectedDefault))
        XCTAssertEqual(rows.filter(\.getsDefaultSlip).count, expectedDefault.count)
        XCTAssertFalse(CommentsRules.sendable(rows).map(\.student.id).contains("already-sent"))
        XCTAssertFalse(CommentsRules.withoutSlip(rows).map(\.student.id).contains("already-sent"))
    }

    func testAnOpenedSlipOfAnAbsentStudentIsStillSent() {
        let rows = [row("a", "An", stars: 0, sent: false, attendance: .absent)]
        XCTAssertEqual(CommentsRules.sendable(rows).map(\.student.id), ["a"])
    }

    func testUngradedNoticeCountsOnlySlipsThatWillBeSent() {
        let notice = CommentsRules.ungradedNotice([
            row("c", "Chi", stars: 1, sent: false, graded: 1, total: 3),
            row("d", "Dũng", stars: 2, sent: false, graded: 2, total: 2),
            row("e", "Em", stars: nil, sent: false, attendance: .absent, graded: 0, total: 2)
        ])
        XCTAssertEqual(notice.students, 1)
        XCTAssertEqual(notice.parts, 2)
    }

    func testBadgeCopyFollowsSlipStatus() {
        let time = I4Format.time("2026-10-19T11:00:00.000Z") ?? ""
        XCTAssertEqual(CommentsRules.badge(row("a", "An", stars: 5, sent: true)).label, "Đã gửi · \(time)")
        XCTAssertEqual(CommentsRules.badge(row("a", "An", stars: 5, sent: true)).tone, .success)
        XCTAssertEqual(CommentsRules.badge(row("b", "Bình", stars: nil, sent: false)).label, "Chưa gửi")
        XCTAssertEqual(CommentsRules.badge(row("b", "Bình", stars: nil, sent: false)).tone, .neutral)
    }

    func testHomeworkLineCopy() {
        let ungraded = CommentsRules.homeworkLine(row("c", "Chi", stars: 1, sent: false, graded: 1, total: 3))
        XCTAssertEqual(ungraded.text, "BTVN ngày 14/10: 2 phần Chưa chấm")
        XCTAssertTrue(ungraded.warning)

        let graded = CommentsRules.homeworkLine(row("a", "An", stars: 5, sent: true, graded: 3, total: 3))
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
        XCTAssertEqual(CommentsRules.sendGate(.ready), .go)
        XCTAssertEqual(CommentsRules.sendGate(.needsNetwork), .blocked)
        XCTAssertEqual(CommentsRules.sendGate(.nothingToSend), .alreadySent, "a second press after sending sends nothing")
    }
}
