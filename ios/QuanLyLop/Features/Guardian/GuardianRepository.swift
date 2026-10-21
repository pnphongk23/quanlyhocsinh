import Foundation
import SwiftUI

struct GuardianDashboard: Sendable {
    let children: [GuardianChildData]
}

struct GuardianChildData: Sendable, Identifiable {
    let student: Student
    let className: String
    let sessions: [ClassSession]
    let attendances: [Attendance]
    let tests: [TestDefinition]
    let scores: [Score]
    let slips: [SessionSlip]
    let homeworkSections: [HomeworkSection]
    let homeworkGrades: [HomeworkGrade]
    let publications: [ReportPublication]

    var id: String { student.id }
    var months: [String] {
        Set(sessions.filter { $0.status == .held }.map { String($0.date.prefix(7)) }
            + tests.map { String($0.date.prefix(7)) }).sorted()
    }
    var reportMonths: [String] { Set(publications.map(\.month)).sorted(by: >) }
    var sentSlips: [GuardianSentSlip] {
        slips.filter { $0.studentId == student.id && $0.status == .sent }
            .compactMap { slip in sessions.first(where: { $0.id == slip.sessionId }).map { GuardianSentSlip(session: $0, slip: slip) } }
            .sorted { $0.session.date > $1.session.date }
    }

    func attendanceRows(in month: String) -> [GuardianAttendanceRow] {
        sessions.filter { $0.status == .held && $0.date.hasPrefix(month) }
            .sorted { $0.date > $1.date }
            .map { session in
                let attendance = attendances.first { $0.studentId == student.id && $0.sessionId == session.id }
                return GuardianAttendanceRow(session: session, attendance: attendance)
            }
    }

    func scoreRows(in month: String) -> [GuardianScoreRow] {
        tests.filter { !$0.archived && $0.date.hasPrefix(month) }
            .sorted { $0.date > $1.date }
            .map { test in
                GuardianScoreRow(test: test, score: scores.first { $0.studentId == student.id && $0.testId == test.id })
            }
    }

    func homework(for gradingSession: ClassSession) -> [GuardianHomeworkData] {
        guard let gradingIndex = sessions.firstIndex(where: { $0.id == gradingSession.id }) else { return [] }
        let gradingSessionID = gradingSession.id
        let sent = slips.contains { $0.studentId == student.id && $0.sessionId == gradingSessionID && $0.status == .sent }
        guard sent else { return [] }
        let previousSession = sessions[..<gradingIndex].last(where: { $0.status != .cancelled })
        guard let previousSession else { return [] }
        return homeworkSections.filter { $0.sessionId == previousSession.id }
            .sorted { $0.kind.rawValue < $1.kind.rawValue }
            .map { section in
                let grade = homeworkGrades.first { $0.studentId == student.id && $0.sectionId == section.id }
                return GuardianHomeworkData(section: section, level: grade?.level)
            }
    }

    func assignedHomework(for session: ClassSession) -> [GuardianHomeworkData] {
        homeworkSections.filter { $0.sessionId == session.id }
            .sorted { $0.kind.rawValue < $1.kind.rawValue }
            .map { GuardianHomeworkData(section: $0, level: nil) }
    }

    func detail(for item: GuardianSentSlip) -> GuardianSlipDetail {
        let previous = homework(for: item.session)
        return GuardianSlipDetail(session: item.session, slip: item.slip,
            previousHomework: previous,
            assignedHomework: assignedHomework(for: item.session))
    }

    func latestReport(in month: String) -> ReportPublication? {
        publications.filter { $0.month == month && $0.studentId == student.id }
            .max { $0.publicationNo < $1.publicationNo }
    }
}

struct GuardianSentSlip: Identifiable, Sendable {
    let session: ClassSession
    let slip: SessionSlip
    var id: String { session.id }
}

struct GuardianAttendanceRow: Identifiable, Sendable {
    let session: ClassSession
    let attendance: Attendance?
    var id: String { session.id }
    var status: AttendanceStatus? { attendance?.status }
}

struct GuardianScoreRow: Identifiable, Sendable {
    let test: TestDefinition
    let score: Score?
    var id: String { test.id }
}

struct GuardianHomeworkData: Identifiable, Sendable {
    let section: HomeworkSection
    let level: HomeworkLevel?
    var id: String { section.id }
    var kind: HomeworkKind { section.kind }
    var title: String { section.title }
    var description: String { section.description }
}

struct GuardianSlipDetail: Identifiable, Sendable {
    let session: ClassSession
    let slip: SessionSlip
    let previousHomework: [GuardianHomeworkData]
    let assignedHomework: [GuardianHomeworkData]
    var id: String { session.id }
}

private struct GuardianMeResponse: Decodable, Sendable {
    struct User: Decodable, Sendable { let id: String }
    let user: User
    let activeMembershipId: String?
    let memberships: [Membership]
}

enum GuardianRepository {
    static func load() async throws -> GuardianDashboard {
        let result = AppConfiguration.load()
        guard case .success(let configuration) = result else { throw APIFailure.invalidURL }
        let tokenStore = KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)")
        guard try await tokenStore.token() != nil else { throw APIFailure.missingToken }
        let api = URLSessionAPIClient(configuration: configuration, tokenStore: tokenStore)
        let identity = try await api.send(.init(method: .get, path: "me"), as: GuardianMeResponse.self)
        guard let membershipID = identity.activeMembershipId,
              let membership = identity.memberships.first(where: { $0.id == membershipID }),
              membership.role.scopeKind == .linkedStudents else { throw APIFailure.badStatus(code: 403) }

        let scope = CacheScope(userId: identity.user.id, workspaceId: membership.workspace.id, membershipId: membership.id)
        let store = try SQLiteStore.open(scope: scope)
        let sync = SyncCoordinator(api: api, store: store, deviceId: "ios-guardian")
        do { try await sync.synchronize() } catch {
            guard try await store.position() != nil else { throw error }
        }

        async let childrenTask = store.records(Student.self, entity: "student")
        async let classesTask = store.records(Classroom.self, entity: "class")
        async let sessionsTask = store.records(ClassSession.self, entity: "class_session")
        async let attendanceTask = store.records(Attendance.self, entity: "attendance")
        async let testsTask = store.records(TestDefinition.self, entity: "test")
        async let scoresTask = store.records(Score.self, entity: "score")
        async let slipsTask = store.records(SessionSlip.self, entity: "slip")
        async let sectionsTask = store.records(HomeworkSection.self, entity: "homework_section")
        async let gradesTask = store.records(HomeworkGrade.self, entity: "homework_grade")
        async let publicationTask = store.records(ReportPublication.self, entity: "report_publication")

        let (children, classes, sessions, attendances, tests, scores, slips, sections, grades, publications) = try await (
            childrenTask, classesTask, sessionsTask, attendanceTask, testsTask,
            scoresTask, slipsTask, sectionsTask, gradesTask, publicationTask
        )
        let classNames = Dictionary(uniqueKeysWithValues: classes.map { ($0.id, $0.name) })
          var childData: [GuardianChildData] = []
          for student in children {
              let studentSessions = sessions.filter { session in
                  guard session.classId == student.classId, session.date >= student.enrolledAt else { return false }
                  return student.leftAt.map { session.date <= $0 } ?? true
              }.sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
              let studentAttendances = attendances.filter { $0.studentId == student.id }
              let studentTests = tests.filter { $0.classId == student.classId }
              let studentScores = scores.filter { $0.studentId == student.id }
              let studentSlips = slips.filter { $0.studentId == student.id }
              let studentSections = sections.filter { $0.classId == student.classId }
              let studentGrades = grades.filter { $0.studentId == student.id }
              let studentPublications = publications.filter { $0.studentId == student.id }
              childData.append(GuardianChildData(
                  student: student,
                  className: classNames[student.classId] ?? "",
                  sessions: studentSessions,
                  attendances: studentAttendances,
                  tests: studentTests,
                  scores: studentScores,
                  slips: studentSlips,
                  homeworkSections: studentSections,
                  homeworkGrades: studentGrades,
                  publications: studentPublications
              ))
          }
        return GuardianDashboard(children: childData.sorted { $0.student.name.localizedStandardCompare($1.student.name) == .orderedAscending })
    }
}

enum GuardianFormat {
    static let currentMonth = String(ISO8601DateFormatter().string(from: .now).prefix(7))
    static func dayMonth(_ value: String) -> String {
        let parts = value.split(separator: "-")
        guard parts.count == 3 else { return value }
        return "\(parts[2])/\(parts[1])"
    }
    static func monthNumber(_ value: String) -> Int { Int(value.dropFirst(5)) ?? 0 }
    static func monthLabel(_ value: String) -> String { "Tháng \(monthNumber(value))" }
}

extension AttendanceStatus {
    var guardianLabel: String {
        switch self { case .present: "có mặt"; case .late: "muộn"; case .excused: "có phép"; case .absent: "vắng" }
    }
    var guardianTone: AppPill.Tone {
        switch self { case .present: .success; case .late: .warning; case .excused: .neutral; case .absent: .error }
    }
}

extension HomeworkKind {
    var guardianLabel: String {
        switch self { case .vocabulary: "Luyện từ vựng"; case .reading: "Luyện đọc"; case .speaking: "Luyện nói"; case .exercise: "Bài tập" }
    }
    var symbol: String {
        switch self { case .vocabulary: "character.book.closed"; case .reading: "book"; case .speaking: "waveform"; case .exercise: "pencil.and.list.clipboard" }
    }
}

extension HomeworkLevel {
    var guardianLabel: String {
        switch self { case .excellent: "Hoàn thành tốt"; case .done: "Hoàn thành"; case .notDone: "Chưa hoàn thành" }
    }
    var tone: Color {
        switch self { case .excellent: AppColors.success; case .done: AppColors.primaryInk; case .notDone: AppColors.error }
    }
}
