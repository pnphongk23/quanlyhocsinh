import Foundation
import SwiftUI

/// Data and offline-first writes for the I-8C screens (scores, homework, comments, reports).
/// Reads what Teacher A already caches in `SQLiteStore` and keeps every write in the outbox.
@MainActor
final class I4FeatureStore: ObservableObject {
    @Published private(set) var classes: [Classroom] = []
    @Published private(set) var students: [Student] = []
    @Published private(set) var sessions: [ClassSession] = []
    @Published private(set) var attendance: [Attendance] = []
    @Published private(set) var tests: [TestDefinition] = []
    @Published private(set) var scores: [Score] = []
    @Published private(set) var slips: [SessionSlip] = []
    @Published private(set) var sections: [HomeworkSection] = []
    @Published private(set) var grades: [HomeworkGrade] = []
    @Published private(set) var publications: [ReportPublication] = []
    @Published private(set) var reports: [StudentReport] = []
    @Published private(set) var batches: [ReportBatch] = []
    @Published private(set) var hiddenSectionIDs: Set<String> = []
    /// Complete session list per class from the server; the sync cache only holds a window around today.
    @Published var fullSessions: [String: [ClassSession]] = [:]
    /// Server previews of reports (`missing` and `ready` as the server computes them), by report id.
    @Published var previews: [String: ReportSnapshot] = [:]
    @Published private(set) var canReadScores = false
    @Published private(set) var canWriteScores = false
    @Published private(set) var canReadCommentsReports = false
    @Published private(set) var canWriteCommentsReports = false
    @Published private(set) var isReady = false
    @Published var errorMessage: String?

    private(set) var store: SQLiteStore?
    private(set) var api: (any APIClient)?
    private var deviceID: String { DeviceIdentity.current() }

    init(store: SQLiteStore? = nil, api: (any APIClient)? = nil) {
        self.store = store
        self.api = api
    }

#if DEBUG
    /// Screenshot harness only: synthetic roster with report permissions, no store or network.
    init(demoClasses: [Classroom], students: [Student], sessions: [ClassSession], attendance: [Attendance]) {
        self.classes = demoClasses
        self.students = students
        self.sessions = sessions
        self.attendance = attendance
        canReadCommentsReports = true
        canWriteCommentsReports = true
        isReady = true
    }
#endif

    init(auth: AuthModel) {
        _ = bind(auth: auth)
    }

    var classID: String { classes.first?.id ?? "fixture-class" }
    var defaultSession: ClassSession? { sessions.first(where: { $0.status != .cancelled }) }

    func configure(auth: AuthModel) async {
        guard let (activeStore, activeAPI) = bind(auth: auth) else { return }
        do { try await SyncCoordinator(api: activeAPI, store: activeStore, deviceId: deviceID).synchronize() }
        catch { errorMessage = String(localized: "feature.scores.khong.the.ong.bo.du.lieu.vui.long.thu.lai") }
        await refresh()
    }

    private func bind(auth: AuthModel) -> (SQLiteStore, URLSessionAPIClient)? {
        guard let activeStore = auth.activeStoreForLogout as? SQLiteStore,
              let membership = auth.activeMembership,
              case .success(let configuration) = AppConfiguration.load() else { return nil }
        let activeAPI = URLSessionAPIClient(configuration: configuration,
                                             tokenStore: KeychainTokenStore(service: configuration.tokenStoreService))
        store = activeStore
        api = activeAPI
        canReadScores = allows(membership, group: "scores", write: false)
        canWriteScores = allows(membership, group: "scores", write: true)
        canReadCommentsReports = allows(membership, group: "comments_reports", write: false)
        canWriteCommentsReports = allows(membership, group: "comments_reports", write: true)
        return (activeStore, activeAPI)
    }

    func refresh() async {
        guard let store else { return }
        do {
            classes = try await store.records(Classroom.self, entity: "class")
            students = try await store.records(Student.self, entity: "student")
            sessions = try await store.classSessions()
            attendance = try await store.records(Attendance.self, entity: "attendance")
            tests = try await store.records(TestDefinition.self, entity: "test")
            scores = try await store.records(Score.self, entity: "score")
            slips = try await store.records(SessionSlip.self, entity: "slip")
            sections = try await store.records(HomeworkSection.self, entity: "homework_section")
            grades = try await store.records(HomeworkGrade.self, entity: "homework_grade")
            publications = try await store.recordsSkippingInvalid(ReportPublication.self, entity: "report_publication").values
            reports = try await store.records(StudentReport.self, entity: "report")
            batches = try await store.records(ReportBatch.self, entity: "report_batch")
            isReady = true
        } catch {
            errorMessage = String(localized: "feature.scores.khong.tai.uoc.du.lieu.a.luu")
        }
    }

    // MARK: - Reads

    func tests(in classID: String) -> [TestDefinition] {
        tests.filter { $0.classId == classID && !$0.archived }.sorted { $0.date > $1.date }
    }

    func activeStudents(in classID: String) -> [Student] {
        students.filter { $0.classId == classID && $0.status == .active }
            .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func students(enrolledOn session: ClassSession) -> [Student] {
        students.filter {
            $0.classId == session.classId && $0.enrolledAt <= session.date
                && ($0.leftAt == nil || $0.leftAt! >= session.date)
        }
        .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func students(leftBefore session: ClassSession) -> [Student] {
        students.filter {
            $0.classId == session.classId && $0.enrolledAt <= session.date
                && $0.leftAt != nil && $0.leftAt! < session.date
        }
        .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    func session(id: String) -> ClassSession? { sessions.first { $0.id == id } }

    func sessions(in classID: String) -> [ClassSession] {
        sessions.filter { $0.classId == classID }.sorted { ($0.date, $0.startTime) < ($1.date, $1.startTime) }
    }

    func score(testID: String, studentID: String) -> Score? {
        scores.first { $0.testId == testID && $0.studentId == studentID }
    }

    func slip(sessionID: String, studentID: String) -> SessionSlip? {
        slips.first { $0.sessionId == sessionID && $0.studentId == studentID }
    }

    func slips(sessionID: String) -> [SessionSlip] {
        slips.filter { $0.sessionId == sessionID }
    }

    func sections(sessionID: String) -> [HomeworkSection] {
        sections.filter { $0.sessionId == sessionID && !hiddenSectionIDs.contains($0.id) }
            .sorted { $0.kind.sortOrder < $1.kind.sortOrder }
    }

    func grade(sectionID: String, studentID: String) -> HomeworkGrade? {
        grades.first { $0.sectionId == sectionID && $0.studentId == studentID }
    }

    func grades(sectionID: String) -> [HomeworkGrade] {
        grades.filter { $0.sectionId == sectionID }
    }

    func attendance(sessionID: String, studentID: String) -> Attendance? {
        attendance.first { $0.sessionId == sessionID && $0.studentId == studentID }
    }

    func batches(in classID: String) -> [ReportBatch] {
        ReportRangeRules.sorted(batches.filter { $0.classId == classID })
    }

    func batch(id: String) -> ReportBatch? { batches.first { $0.id == id } }

    func reports(batchID: String) -> [StudentReport] {
        reports.filter { $0.batchId == batchID }
    }

    func report(id: String) -> StudentReport? { reports.first { $0.id == id } }

    func report(studentID: String, batchID: String) -> StudentReport? {
        reports.first { $0.studentId == studentID && $0.batchId == batchID }
    }

    // MARK: - Scores

    /// Saves every changed score of one test. Returns the first validation error, if any.
    func saveScores(test: TestDefinition, values: [String: String]) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.iem") }
        for (studentID, raw) in values {
            guard let student = students.first(where: { $0.id == studentID }) else { continue }
            if ScoreRules.isInvalid(raw, max: test.maxScore) {
                return String.localizedStringWithFormat(String(localized: "feature.scores.iem.phai.tu.0.en"), String(describing: (test.maxScore)))
            }
            let parsed = Self.parseScore(raw)
            let old = score(testID: test.id, studentID: student.id)
            if old?.value == parsed { continue }
            if old == nil && parsed == nil { continue }
            let row = Score(testId: test.id, studentId: student.id, value: parsed,
                            version: old?.version ?? 0, updatedAt: Self.now)
            let command = PendingCommand(recordKey: key("score", test.id, student.id),
                                         baseVersion: old?.version ?? 0,
                                         kind: "score.set",
                                         payload: scorePayload(test: test, student: student, value: parsed))
            do { try await store.write(row, forKey: command.recordKey, enqueueing: command) }
            catch { return String(localized: "feature.scores.khong.luu.uoc.iem") }
        }
        await syncIfNeeded()
        await refresh()
        return nil
    }

    static func parseScore(_ raw: String) -> Double? {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        return Double(trimmed.replacingOccurrences(of: ",", with: "."))
    }

    private func scorePayload(test: TestDefinition, student: Student, value: Double?) -> JSONValue {
        let storedValue = value.map(JSONValue.number) ?? .null
        return object([
            "test_id": .string(test.id),
            "student_id": .string(student.id),
            "value": storedValue
        ])
    }

    func saveTest(name: String, date: String, max: Int, existing: TestDefinition? = nil) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.bai.kiem.tra") }
        do {
            if let existing {
                let highest = scores.filter { $0.testId == existing.id }.compactMap(\.value).max()
                try existing.validateNewMaximum(max, highestScore: highest)
                let row = try TestDefinition(id: existing.id, classId: existing.classId, name: name,
                                             date: date, maxScore: max, archived: false,
                                             version: existing.version)
                let payload = testUpdatePayload(row, name: name, date: date, max: max)
                let command = PendingCommand(recordKey: key("test", row.id), baseVersion: existing.version,
                                             kind: "test.update", payload: payload)
                try await store.write(row, forKey: command.recordKey, enqueueing: command)
            } else {
                let id = UUID().uuidString.lowercased()
                let row = try TestDefinition(id: id, classId: classID, name: name, date: date, maxScore: max)
                let payload = testCreatePayload(id: id, name: name, date: date, max: max)
                let command = PendingCommand(recordKey: key("test", id), baseVersion: 0,
                                             kind: "test.create", payload: payload)
                try await store.write(row, forKey: command.recordKey, enqueueing: command)
            }
            await syncIfNeeded()
            await refresh()
            return nil
        } catch ModelError.invalidMaxScore {
            return String(localized: "feature.scores.iem.toi.a.phai.tu.1.en.1000")
        } catch ModelError.scoreOutsideRange {
            return String(localized: "feature.scores.khong.ha.uoc.iem.toi.a.xuong.duoi.iem.cao.nhat.a")
        } catch {
            return String(localized: "feature.scores.khong.luu.uoc.bai.kiem.tra")
        }
    }

    private func testUpdatePayload(_ row: TestDefinition, name: String, date: String, max: Int) -> JSONValue {
        object([
            "id": .string(row.id),
            "name": .string(name),
            "date": .string(date),
            "max": .number(Double(max))
        ])
    }

    private func testCreatePayload(id: String, name: String, date: String, max: Int) -> JSONValue {
        object([
            "id": .string(id),
            "class_id": .string(classID),
            "name": .string(name),
            "date": .string(date),
            "max": .number(Double(max))
        ])
    }

    /// The server decides physical deletion versus archiving; hide the row either way.
    /// Returns the confirmation copy so the dialog can say which outcome applies.
    func deleteTest(_ test: TestDefinition) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.xoa.uoc.bai.kiem.tra") }
        let hasScores = scores.contains { $0.testId == test.id && $0.value != nil }
        do {
            let row = try TestDefinition(id: test.id, classId: test.classId, name: test.name, date: test.date,
                                         maxScore: test.maxScore, archived: true, version: test.version)
            let payload = object(["id": .string(test.id)])
            let command = PendingCommand(recordKey: key("test", test.id), baseVersion: test.version,
                                         kind: "test.delete", payload: payload)
            try await store.write(row, forKey: command.recordKey, enqueueing: command)
            await syncIfNeeded()
            await refresh()
            return hasScores ? String(localized: "feature.scores.bai.kiem.tra.a.uoc.luu.tru") : String(localized: "feature.scores.bai.kiem.tra.a.uoc.xoa")
        } catch { return String(localized: "feature.scores.khong.xoa.uoc.bai.kiem.tra") }
    }

    // MARK: - Session slips (comments)

    func saveSlip(sessionID: String, student: Student, stars: Stars?, note: String) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.phieu.buoi.hoc") }
        let old = slip(sessionID: sessionID, studentID: student.id)
        let row = SessionSlip(sessionId: sessionID, studentId: student.id, stars: stars, note: note,
                              status: old?.status ?? .draft, sentAt: old?.sentAt,
                              version: old?.version ?? 0, updatedAt: Self.now)
        let payload = object([
            "session_id": .string(sessionID),
            "student_id": .string(student.id),
            "stars": stars.map { .number(Double($0.rawValue)) } ?? .null,
            "note": .string(note)
        ])
        let command = PendingCommand(recordKey: key("slip", sessionID, student.id),
                                     baseVersion: old?.version ?? 0, kind: "slip.set", payload: payload)
        do {
            try await store.write(row, forKey: command.recordKey, enqueueing: command)
            await syncIfNeeded()
            await refresh()
            return nil
        } catch { return String(localized: "feature.scores.khong.luu.uoc.phieu.buoi.hoc") }
    }

    enum SendOutcome: Equatable {
        case sent(Int)
        /// The server sent some slips and left others out (stars removed, or already sent elsewhere).
        case partial(sent: Int, notSent: Int)
        case failed(String)
    }

    /// Sends every starred, not-yet-sent slip of the session and waits for the server's answer.
    /// The `slip.send` command goes straight to the server and is never written to the outbox, so an
    /// unconfirmed send leaves nothing behind that could be replayed later; the slips stay as they were.
    /// The local state follows what the server reports as `sent` and `skipped`.
    func sendSlips(sessionID: String, studentIDs: [String]) async -> SendOutcome {
        guard let api, let store else { return .failed(String(localized: "feature.scores.khong.xep.hang.uoc.phieu")) }
        let failure = SendOutcome.failed(String(localized: "comments.send.failed", table: "Teacher"))
        // Edits still waiting in the outbox must reach the server first, or it would send older stars and notes.
        guard await syncIfNeeded() else { return failure }
        await refresh()
        let chosen = slips(sessionID: sessionID).filter {
            studentIDs.contains($0.studentId) && $0.stars != nil && $0.status != .sent
        }
        guard let first = chosen.first else { return .failed(String(localized: "feature.scores.chon.sao.cho.it.nhat.mot.hoc.sinh")) }
        let slipKeys = Set(chosen.map { key("slip", sessionID, $0.studentId) })
        let waiting = (try? await store.pendingCommands()) ?? []
        if waiting.contains(where: { slipKeys.contains($0.recordKey) }) { return failure }

        let payload = object([
            "session_id": .string(sessionID),
            "student_ids": .array(chosen.map { JSONValue.string($0.studentId) })
        ])
        let command = SyncCommand(id: UUID(), type: "slip.send", baseVersion: first.version, createdAt: .now, payload: payload)
        let request = PushRequest(membershipId: store.scope.membershipId, deviceId: deviceID, commands: [command])
        let result: CommandResult?
        do {
            let response = try await api.send(try .json(method: .post, path: "sync/push", body: request), as: PushResponse.self)
            result = response.results.first { $0.id == command.id }
        } catch {
            // The answer may have been lost after the server applied it; a pull shows the real state.
            await syncIfNeeded()
            await refresh()
            return failure
        }
        guard let result, result.status == .applied else {
            await refresh()
            return failure
        }

        let sentIDs = Set(result.sent ?? [])
        for slip in chosen where sentIDs.contains(slip.studentId) {
            let row = SessionSlip(sessionId: slip.sessionId, studentId: slip.studentId, stars: slip.stars, note: slip.note,
                                  status: .sent, sentAt: Self.now, version: slip.version, updatedAt: Self.now)
            try? await store.write(row, forKey: key("slip", sessionID, slip.studentId), enqueueing: nil)
        }
        await syncIfNeeded()
        await refresh()
        let notSent = chosen.count - chosen.filter { sentIDs.contains($0.studentId) }.count
        return notSent == 0 ? .sent(chosen.count) : .partial(sent: chosen.count - notSent, notSent: notSent)
    }

    // MARK: - Homework

    func saveSection(sessionID: String, kind: HomeworkKind, title: String, description: String,
                     section: HomeworkSection? = nil) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.phan.bai.tap") }
        let id = section?.id ?? UUID().uuidString.lowercased()
        let row = HomeworkSection(id: id, classId: classID, sessionId: sessionID, kind: kind, title: title,
                                  description: description, version: section?.version ?? 0)
        let payload = sectionPayload(sessionID: sessionID, id: id, kind: kind, title: title,
                                     description: description, isNew: section == nil)
        let command = PendingCommand(recordKey: key("homework_section", id),
                                     baseVersion: section?.version ?? 0,
                                     kind: section == nil ? "homework.assign" : "homework.section.upsert",
                                     payload: payload)
        do {
            try await store.write(row, forKey: command.recordKey, enqueueing: command)
            await syncIfNeeded()
            await refresh()
            return nil
        } catch { return String(localized: "feature.scores.khong.luu.uoc.phan.bai.tap") }
    }

    private func sectionPayload(sessionID: String, id: String, kind: HomeworkKind, title: String,
                                description: String, isNew: Bool) -> JSONValue {
        let item = object([
            "id": .string(id),
            "kind": .string(kind.rawValue),
            "title": .string(title),
            "description": .string(description)
        ])
        if isNew {
            return object(["session_id": .string(sessionID), "sections": .array([item])])
        }
        return object([
            "id": .string(id),
            "session_id": .string(sessionID),
            "kind": .string(kind.rawValue),
            "title": .string(title),
            "description": .string(description)
        ])
    }

    func deleteSection(_ section: HomeworkSection) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.xoa.uoc.phan.bai.tap") }
        let graded = grades.contains { $0.sectionId == section.id && $0.level != nil }
        guard !graded else { return String(localized: "feature.scores.a.cham.cho.hoc.sinh.nen.khong.xoa.uoc") }
        let payload = object(["id": .string(section.id)])
        let command = PendingCommand(recordKey: key("homework_section", section.id),
                                     baseVersion: section.version,
                                     kind: "homework.section.delete", payload: payload)
        do {
            try await store.write(section, forKey: command.recordKey, enqueueing: command)
            hiddenSectionIDs.insert(section.id)
            await syncIfNeeded()
            await refresh()
            return nil
        } catch { return String(localized: "feature.scores.khong.xoa.uoc.phan.bai.tap") }
    }

    func grade(_ section: HomeworkSection, student: Student, level: HomeworkLevel?) async {
        guard let store else { return }
        let old = grade(sectionID: section.id, studentID: student.id)
        let row = HomeworkGrade(sectionId: section.id, studentId: student.id, level: level,
                                version: old?.version ?? 0, updatedAt: Self.now)
        let payload = object([
            "section_id": .string(section.id),
            "student_id": .string(student.id),
            "level": level.map { .string($0.rawValue) } ?? .null
        ])
        let command = PendingCommand(recordKey: key("homework_grade", section.id, student.id),
                                     baseVersion: old?.version ?? 0, kind: "homework.grade.set",
                                     payload: payload)
        do {
            try await store.write(row, forKey: command.recordKey, enqueueing: command)
            await syncIfNeeded()
            await refresh()
        } catch { errorMessage = String(localized: "feature.scores.khong.luu.uoc.ket.qua.cham") }
    }

    /// Marks one level for every student of the session in a single list action.
    func gradeAll(_ section: HomeworkSection, students: [Student], level: HomeworkLevel) async {
        for student in students {
            await grade(section, student: student, level: level)
        }
    }

    // MARK: - Helpers

    func key(_ entity: String, _ a: String, _ b: String = "") -> String {
        RecordKey(entity: entity, k1: a, k2: b).storageKey
    }

    private func object(_ values: [String: JSONValue]) -> JSONValue { .object(values) }

    private static var now: String { ISO8601DateFormatter().string(from: .now) }

    @discardableResult
    private func syncIfNeeded() async -> Bool {
        guard let api, let store else { return false }
        do {
            try await SyncCoordinator(api: api, store: store, deviceId: deviceID).synchronize()
            errorMessage = nil
            return true
        } catch {
            errorMessage = String(localized: "feature.scores.a.luu.tren.thiet.bi.khong.the.ong.bo.luc.nay")
            return false
        }
    }

    private func allows(_ membership: Membership, group: String, write: Bool) -> Bool {
        if membership.role.scopeKind == .workspace { return true }
        guard let level = membership.permissions?[group] else { return false }
        return level == .write || (!write && level == .read)
    }
}

extension HomeworkKind {
    /// `Luyện từ vựng → Luyện đọc → Luyện nói → Bài tập`.
    var sortOrder: Int {
        switch self {
        case .vocabulary: 0
        case .reading: 1
        case .speaking: 2
        case .exercise: 3
        }
    }

    var label: String {
        switch self {
        case .vocabulary: String(localized: "feature.scores.luyen.tu.vung")
        case .reading: String(localized: "feature.scores.luyen.oc")
        case .speaking: String(localized: "feature.scores.luyen.noi")
        case .exercise: String(localized: "feature.scores.bai.tap")
        }
    }

    var systemImage: String {
        switch self {
        case .vocabulary: "textformat"
        case .reading: "book"
        case .speaking: "mic"
        case .exercise: "pencil"
        }
    }
}
