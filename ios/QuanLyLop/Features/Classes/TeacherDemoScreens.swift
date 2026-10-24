import SwiftUI

#if DEBUG
/// Synthetic teacher data and screen list for the prototype comparison shots.
///
/// Only compiled in Debug (Staging) and only reached from `QuanLyLopTests/Classes`
/// or a future `SIMCTL_CHILD_QLH_DEMO_SCREEN=teacher-*` entry point. Nothing in the
/// normal launch path reads it, and Production is a release build.
@MainActor
enum TeacherDemoData {
    static let classID = "demo-class-6a"
    static let today = TeacherFormat.todayISO()

    static func data() -> TeacherFeatureData {
        let sessions = makeSessions()
        return TeacherFeatureData(previewClasses: [classroom],
                                  previewStudents: students,
                                  previewSessions: sessions,
                                  previewAttendance: attendance(for: sessions),
                                  displayName: String(localized: "feature.classes.co.lan"))
    }

    static func emptyData() -> TeacherFeatureData {
        TeacherFeatureData(previewClasses: [], previewStudents: [], previewSessions: [])
    }

    static let classroom = Classroom(id: classID, name: String(localized: "feature.classes.tieng.anh.giao.tiep.6a"),
                                     status: .active, weekdays: [1, 3], startTime: "18:00", version: 1)

    private static let roster: [(name: String, phone: String?)] = [
        (String(localized: "feature.classes.nguyen.minh.anh"), "0900000002"),
        (String(localized: "feature.classes.tran.gia.bao"), "0900000002"),
        (String(localized: "feature.classes.le.khanh.chi"), "09xx xxx xxx"),
        (String(localized: "feature.classes.pham.uc.dung"), "09xx xxx xxx"),
        (String(localized: "feature.classes.hoang.thu.ha"), nil),
        (String(localized: "feature.classes.vu.quang.huy"), "09xx xxx xxx"),
        (String(localized: "feature.classes.ang.ngoc.lan"), "09xx xxx xxx"),
        (String(localized: "feature.classes.bui.tuan.kiet"), "09xx xxx xxx"),
        (String(localized: "feature.classes.ngo.bao.ngoc"), "09xx xxx xxx"),
    ]

    static var students: [Student] {
        var items: [Student] = roster.enumerated().map { index, entry in
            Student(id: "demo-student-\(index)", classId: classID, name: entry.name,
                    parentPhone: entry.phone, enrolledAt: addDays(-50), leftAt: nil,
                    status: .active, version: 1)
        }
        items.append(Student(id: "demo-student-left", classId: classID, name: String(localized: "feature.classes.o.hai.nam"),
                             parentPhone: "09xx xxx xxx", enrolledAt: addDays(-50),
                             leftAt: addDays(-12), status: .left, version: 2))
        return items
    }

    /// Five weeks of Monday/Wednesday sessions: 8 held, the 19/10 one still planned, a
    /// cancelled makeup and one extra session in the future (mirrors the prototype seed).
    static func makeSessions() -> [ClassSession] {
        let pastOffsets = [-30, -28, -23, -21, -16, -14, -9, -7]
        var items: [ClassSession] = pastOffsets.enumerated().map { index, offset in
            ClassSession(id: "demo-session-\(index)", classId: classID, date: addDays(offset),
                         startTime: "18:00", origin: .recurring, status: .held,
                         version: 1, sessionNumber: index + 1)
        }
        items.append(ClassSession(id: "demo-session-8", classId: classID, date: addDays(-2),
                                  startTime: "18:00", origin: .recurring, status: .planned,
                                  version: 1, sessionNumber: 9))
        items.append(ClassSession(id: "demo-session-cancelled", classId: classID, date: addDays(-5),
                                  startTime: "18:00", origin: .manual, isMakeup: true,
                                  status: .cancelled, note: String(localized: "feature.classes.buoi.bu.bi.huy"), version: 1))
        items.append(ClassSession(id: "demo-session-extra", classId: classID, date: addDays(4),
                                  startTime: "17:00", origin: .manual, status: .planned,
                                  version: 1, sessionNumber: 10))
        return items
    }

    /// Minh Anh is absent in the last two held sessions, so the “Cần chú ý” card has a row.
    static func attendance(for sessions: [ClassSession]) -> [Attendance] {
        let held = sessions.filter { $0.status == .held }.sorted { $0.date < $1.date }
        let warned = held.suffix(2).map(\.id)
        var rows: [Attendance] = []
        for session in held {
            for (index, student) in students.enumerated() {
                let status: AttendanceStatus = (index == 0 && warned.contains(session.id)) ? .absent : .present
                rows.append(Attendance(sessionId: session.id, studentId: student.id, status: status,
                                       note: "", lateAt: nil, version: 1,
                                       updatedAt: "\(session.date)T11:00:00Z"))
            }
        }
        return rows
    }

    static func addDays(_ amount: Int) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh") ?? .current
        let base = calendar.date(byAdding: .day, value: amount, to: .now) ?? .now
        let parts = calendar.dateComponents([.year, .month, .day], from: base)
        return TeacherFormat.iso(year: parts.year ?? 2026, month: parts.month ?? 1, day: parts.day ?? 1)
    }
}

/// One row per comparison screen; `frame` keeps the 390×844 prototype viewport.
@MainActor
enum TeacherDemoScreen: String, CaseIterable {
    case classList = "class-list"
    case classListEmpty = "class-list-empty"
    case newClass = "new-class"
    case classDetail = "class-detail"
    case classDetailMenu = "class-detail-menu"
    case sessions = "sessions"
    case attendance = "attendance"
    case attendanceLocked = "attendance-locked"
    case sessionCancelled = "session-cancelled"
    case students = "students"
    case studentsAdd = "students-add"
    case studentsOptions = "students-options"
    case studentsEmpty = "students-empty"
    case scheduleDay = "schedule-day"
    case scheduleMonth = "schedule-month"
    case scheduleEmpty = "schedule-empty"

    var group: String {
        switch self {
        case .attendance, .attendanceLocked, .sessionCancelled: "attendance"
        default: "classes"
        }
    }

    @ViewBuilder
    func view(data: TeacherFeatureData, index: Int) -> some View {
        switch self {
        case .classList:
            TeacherClassListView(data: data, i4Data: I4FeatureStore())
        case .classListEmpty:
            TeacherClassListView(data: TeacherDemoData.emptyData(), i4Data: I4FeatureStore())
        case .newClass:
            TeacherNewClassView(data: data)
        case .classDetail:
            TeacherClassDetailView(classID: TeacherDemoData.classID, data: data, i4Data: I4FeatureStore())
        case .classDetailMenu:
            TeacherClassDetailView(classID: TeacherDemoData.classID, data: data,
                                   i4Data: I4FeatureStore())
        case .sessions:
            TeacherSessionsView(classID: TeacherDemoData.classID, data: data, i4Data: I4FeatureStore())
        case .attendance:
            TeacherSessionDetailView(classID: TeacherDemoData.classID, sessionID: "demo-session-8",
                                     data: data, i4Data: I4FeatureStore())
        case .attendanceLocked:
            TeacherSessionDetailView(classID: TeacherDemoData.classID, sessionID: "demo-session-extra",
                                     data: data, i4Data: I4FeatureStore())
        case .sessionCancelled:
            TeacherSessionDetailView(classID: TeacherDemoData.classID, sessionID: "demo-session-cancelled",
                                     data: data, i4Data: I4FeatureStore())
        case .students:
            TeacherStudentsView(classID: TeacherDemoData.classID, data: data)
        case .studentsAdd:
            TeacherAddStudentSheet(classID: TeacherDemoData.classID, data: data)
        case .studentsOptions:
            TeacherStudentOptionsSheet(student: data.students(in: TeacherDemoData.classID)[0],
                                       editPhone: {}, markLeft: {}, close: {})
        case .studentsEmpty:
            TeacherStudentsView(classID: "empty-class", data: TeacherDemoData.emptyData())
        case .scheduleDay:
            TeacherScheduleView(data: data, i4Data: I4FeatureStore())
        case .scheduleMonth:
            TeacherScheduleView(data: data, i4Data: I4FeatureStore(), initialView: "month")
        case .scheduleEmpty:
            TeacherScheduleView(data: TeacherDemoData.emptyData(), i4Data: I4FeatureStore())
        }
    }
}
#endif
