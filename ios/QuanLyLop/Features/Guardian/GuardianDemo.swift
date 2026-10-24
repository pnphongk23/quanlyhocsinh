import Foundation

/// Synthetic guardian data for comparison screenshots only.
///
/// Enabled by `SIMCTL_CHILD_QLH_DEMO_SCREEN=guardian|guardian-empty|settings|settings-blocked|change-password`
/// (see `DemoScreens`), which is how `simctl launch` reaches the guardian shell without
/// a live account. Debug builds only; Production is a release build and never sees data.
enum GuardianDemo {
    static var dashboard: GuardianDashboard? {
        #if DEBUG
        guard let name = DemoFlag.screen else { return nil }
        if name == "guardian-empty" { return GuardianDashboard(children: []) }
        return build()
        #else
        return nil
        #endif
    }

    #if DEBUG
    private static func build() -> GuardianDashboard {
        let classA = "demo-class-6a"
        let classB = "demo-class-6a-b"
        let bao = Student(id: "demo-student-bao", classId: classA, name: String(localized: "feature.guardian.tran.gia.bao"),
                          parentPhone: nil, enrolledAt: "2026-09-01", leftAt: nil,
                          status: .active, version: 1)
        let ngoc = Student(id: "demo-student-ngoc", classId: classB, name: String(localized: "feature.guardian.tran.bao.ngoc"),
                           parentPhone: nil, enrolledAt: "2026-09-01", leftAt: nil,
                           status: .active, version: 1)

        let sessions = [
            session("bao-5", classA, "2026-10-05", 5, .held),
            session("bao-6", classA, "2026-10-07", 6, .held),
            session("bao-7", classA, "2026-10-12", 7, .held),
            session("bao-8", classA, "2026-10-14", 8, .held),
            ClassSession(id: "bao-makeup", classId: classA, date: "2026-10-16", startTime: "18:00",
                         origin: .manual, isMakeup: true, status: .cancelled, note: nil, version: 1),
            ClassSession(id: "bao-9", classId: classA, date: "2026-10-19", startTime: "18:00",
                         origin: .recurring, isMakeup: false, status: .planned, note: nil,
                         version: 1, sessionNumber: 9)
        ]
        let attendances = [
            attendance("bao-5", .present), attendance("bao-6", .present),
            attendance("bao-7", .present), attendance("bao-8", .excused)
        ]
        let tests = [
            try? TestDefinition(id: "test-speaking", classId: classA, name: String(localized: "feature.guardian.noi"), date: "2026-10-12", maxScore: 10),
            try? TestDefinition(id: "test-listening", classId: classA, name: "Nghe", date: "2026-10-07", maxScore: 10),
            try? TestDefinition(id: "test-grammar", classId: classA, name: String(localized: "feature.guardian.ngu.phap"), date: "2026-10-05", maxScore: 10)
        ].compactMap { $0 }
        let scores = [
            Score(testId: "test-speaking", studentId: bao.id, value: 10, version: 1, updatedAt: "2026-10-12T11:00:00.000Z"),
            Score(testId: "test-listening", studentId: bao.id, value: 9, version: 1, updatedAt: "2026-10-07T11:00:00.000Z"),
            Score(testId: "test-grammar", studentId: bao.id, value: 8, version: 1, updatedAt: "2026-10-05T11:00:00.000Z")
        ]
        let slips = [
            slip("bao-5", .three, ""),
            slip("bao-6", .two, ""),
            slip("bao-7", .one, String(localized: "feature.guardian.con.chua.tap.trung.o.phan.luyen.noi")),
            slip("bao-8", .three, String(localized: "feature.guardian.hom.nay.con.xung.phong.ke.chuyen.truoc.lop.rat.t"))
        ]
        let sections = [
            HomeworkSection(id: "hw-7-vocab", classId: classA, sessionId: "bao-7", kind: .vocabulary,
                            title: String(localized: "feature.guardian.unit.5.12.tu.chu.e.food"), description: String(localized: "feature.guardian.hoc.nghia.va.cach.oc.chep.moi.tu.2.lan.vao.vo"), version: 1),
            HomeworkSection(id: "hw-7-exercise", classId: classA, sessionId: "bao-7", kind: .exercise,
                            title: "Workbook trang 38–39", description: String(localized: "feature.guardian.lam.bai.1.en.4"), version: 1),
            HomeworkSection(id: "hw-8-vocab", classId: classA, sessionId: "bao-8", kind: .vocabulary,
                            title: String(localized: "feature.guardian.unit.6.15.tu.chu.e.travel"), description: String(localized: "feature.guardian.hoc.nghia.va.cach.oc.chep.moi.tu.2.lan.vao.vo"), version: 1),
            HomeworkSection(id: "hw-8-speaking", classId: classA, sessionId: "bao-8", kind: .speaking,
                            title: String(localized: "feature.guardian.ke.ve.chuyen.i.gan.nhat"), description: String(localized: "feature.guardian.noi.khoang.1.phut.nho.bo.me.nghe.va.gop.y"), version: 1),
            HomeworkSection(id: "hw-8-exercise", classId: classA, sessionId: "bao-8", kind: .exercise,
                            title: "Workbook trang 40–41", description: String(localized: "feature.guardian.lam.bai.1.en.5"), version: 1),
            HomeworkSection(id: "hw-9-reading", classId: classA, sessionId: "bao-9", kind: .reading,
                            title: "Unit 6 · Reading", description: String(localized: "feature.guardian.oc.oan.van.trang.42.hai.lan"), version: 1)
        ]
        let grades = [
            HomeworkGrade(sectionId: "hw-7-vocab", studentId: bao.id, level: .excellent, version: 1, updatedAt: "2026-10-14T11:00:00.000Z"),
            HomeworkGrade(sectionId: "hw-7-exercise", studentId: bao.id, level: .done, version: 1, updatedAt: "2026-10-14T11:00:00.000Z")
        ]
        let snapshot = ReportSnapshot(
            studentId: bao.id, month: "2026-10",
            range: ReportRange(fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00", fromNumber: 1, toNumber: 8,
                               label: ReportRangeRules.labels(fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00",
                                                              fromNumber: 1, toNumber: 8).label),
            attendance: AttendanceSummary(present: 3, late: 0, excused: 1, absent: 0, heldSessions: 4),
            // Thứ tự bài kiểm tra trong báo cáo theo thứ tự giáo viên đã tạo (ảnh 10 của P1):
            // Ngữ pháp, Nghe, Nói — không sắp lại theo ngày như tab Điểm số.
            tests: [
                ReportTest(testId: "test-grammar", name: String(localized: "feature.guardian.ngu.phap"), date: "2026-10-05", max: 10, value: 8),
                ReportTest(testId: "test-listening", name: "Nghe", date: "2026-10-07", max: 10, value: 9),
                ReportTest(testId: "test-speaking", name: String(localized: "feature.guardian.noi"), date: "2026-10-12", max: 10, value: 10)
            ],
            stars: StarsSummary(three: 2, two: 1, one: 1),
            homework: [
                HomeworkSummary(kind: .vocabulary, excellent: 1, done: 0, notDone: 0),
                HomeworkSummary(kind: .exercise, excellent: 0, done: 1, notDone: 0)
            ],
            // Ảnh 15 của P1: "Điều cô muốn chia sẻ" lấy từ nhận xét chung của báo cáo đã phát hành.
            generalComment: String(localized: "feature.guardian.thang.nay.con.tien.bo.ro.ky.nang.nghe.va.tu.tin"),
            ready: true)
        let publications = [
            ReportPublication(id: "publication-1", reportId: "demo-report-bao", classId: classA,
                              studentId: bao.id, month: "2026-10", publicationNo: 2,
                              publishedAt: "2026-10-21T02:00:00.000Z", snapshot: snapshot)
        ]

        let baoData = GuardianChildData(
            student: bao, className: String(localized: "feature.guardian.tieng.anh.giao.tiep.6a"), sessions: sessions,
            attendances: attendances, tests: tests, scores: scores, slips: slips,
            homeworkSections: sections, homeworkGrades: grades, publications: publications)

        let ngocSessions = [session("ngoc-5", classB, "2026-10-05", 5, .held),
                            session("ngoc-6", classB, "2026-10-07", 6, .held)]
        let ngocData = GuardianChildData(
            student: ngoc, className: String(localized: "feature.guardian.tieng.anh.giao.tiep.6a"),
            sessions: ngocSessions,
            attendances: [attendance("ngoc-5", .present), attendance("ngoc-6", .present)],
            tests: [], scores: [], slips: [], homeworkSections: [], homeworkGrades: [],
            publications: [])

        // Prototype default: the first linked child (ảnh 15 selects “Gia Bảo” first).
        return GuardianDashboard(children: [baoData, ngocData])
    }

    private static func session(_ id: String, _ classID: String, _ date: String,
                                _ number: Int, _ status: SessionStatus) -> ClassSession {
        ClassSession(id: id, classId: classID, date: date, startTime: "18:00",
                     origin: .recurring, isMakeup: false, status: status, note: nil,
                     version: 1, sessionNumber: number)
    }

    private static func attendance(_ sessionID: String, _ status: AttendanceStatus) -> Attendance {
        Attendance(sessionId: sessionID, studentId: "demo-student-bao", status: status,
                   note: "", lateAt: nil, version: 1, updatedAt: "2026-10-20T11:00:00.000Z")
    }

    private static func slip(_ sessionID: String, _ stars: Stars, _ note: String) -> SessionSlip {
        SessionSlip(sessionId: sessionID, studentId: "demo-student-bao", stars: stars,
                    note: note, status: .sent, sentAt: "2026-10-20T11:00:00.000Z",
                    version: 1, updatedAt: "2026-10-20T11:00:00.000Z")
    }
    #endif
}
