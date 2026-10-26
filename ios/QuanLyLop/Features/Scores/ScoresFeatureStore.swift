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
    /// Batches deleted in this session: a read that was already in flight must not write them back.
    var deletedBatchIDs: Set<String> = []
    /// Complete session list per class from the server; the sync cache only holds a window around today.
    @Published var fullSessions: [String: [ClassSession]] = [:]
    /// Why a class's full session list could not be read (no attendance permission, offline), by class id.
    /// While set, a new report range cannot be picked, but the batches still load.
    @Published var sessionListFailure: [String: String] = [:]
    /// Server previews of reports (`missing` and `ready` as the server computes them), by report id.
    @Published var previews: [String: ReportSnapshot] = [:]
    @Published private(set) var canReadScores = false
    @Published private(set) var canWriteScores = false
    @Published private(set) var canReadCommentsReports = false
    @Published private(set) var canWriteCommentsReports = false
    @Published private(set) var isReady = false
    @Published var errorMessage: String?
    /// The test just created, until the screen that created it has opened its score entry ("Tạo bài và nhập điểm").
    @Published var createdTestID: String?

    /// Sessions whose `slip.send` is waiting for the server's answer.
    private(set) var sendingSessionIDs: Set<String> = []

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
        guard store != nil else { return String(localized: "feature.scores.khong.luu.uoc.iem") }
        for (studentID, raw) in values {
            guard students.contains(where: { $0.id == studentID }) else { continue }
            if ScoreRules.isInvalid(raw) { return String(localized: "scores.invalid.range", table: "Teacher") }
        }
        for (studentID, raw) in values {
            guard let student = students.first(where: { $0.id == studentID }) else { continue }
            guard await writeScore(test: test, student: student, value: Self.parseScore(raw)) else {
                return String(localized: "feature.scores.khong.luu.uoc.iem")
            }
        }
        await syncIfNeeded()
        await refresh()
        return nil
    }

    /// Value the "Gán điểm mặc định" button writes for every student.
    static let defaultScore = 15.0

    /// Sets the default score for each given student, overwriting what was entered. Every change is
    /// queued like a normal score edit; the sync engine pushes the queue in batches of 50.
    func assignDefaultScore(test: TestDefinition, students targets: [Student]) async -> String? {
        guard store != nil else { return String(localized: "feature.scores.khong.luu.uoc.iem") }
        for student in targets {
            guard await writeScore(test: test, student: student, value: Self.defaultScore) else {
                return String(localized: "feature.scores.khong.luu.uoc.iem")
            }
        }
        await syncIfNeeded()
        await refresh()
        return nil
    }

    /// Queues one score change; false when the local write fails. Unchanged values are skipped.
    private func writeScore(test: TestDefinition, student: Student, value: Double?) async -> Bool {
        guard let store else { return false }
        let old = score(testID: test.id, studentID: student.id)
        if old?.value == value { return true }
        let row = Score(testId: test.id, studentId: student.id, value: value,
                        version: old?.version ?? 0, updatedAt: Self.now)
        let command = PendingCommand(recordKey: key("score", test.id, student.id),
                                     baseVersion: old?.version ?? 0,
                                     kind: "score.set",
                                     payload: scorePayload(test: test, student: student, value: value))
        do { try await store.write(row, forKey: command.recordKey, enqueueing: command); return true }
        catch { return false }
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

    /// `classID` is the class the teacher is viewing; the store holds every class of the workspace, so a new test cannot
    /// take its class from the store itself.
    func saveTest(classID: String, name: String, date: String, existing: TestDefinition? = nil) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.bai.kiem.tra") }
        do {
            if let existing {
                let row = TestDefinition(id: existing.id, classId: existing.classId, name: name,
                                         date: date, archived: false, version: existing.version)
                let payload = object(["id": .string(row.id), "name": .string(name), "date": .string(date)])
                let command = PendingCommand(recordKey: key("test", row.id), baseVersion: existing.version,
                                             kind: "test.update", payload: payload)
                try await store.write(row, forKey: command.recordKey, enqueueing: command)
            } else {
                let id = UUID().uuidString.lowercased()
                let row = TestDefinition(id: id, classId: classID, name: name, date: date)
                let payload = object(["id": .string(id), "class_id": .string(classID),
                                      "name": .string(name), "date": .string(date)])
                let command = PendingCommand(recordKey: key("test", id), baseVersion: 0,
                                             kind: "test.create", payload: payload)
                try await store.write(row, forKey: command.recordKey, enqueueing: command)
                createdTestID = id
            }
            await syncIfNeeded()
            await refresh()
            return nil
        } catch {
            return String(localized: "feature.scores.khong.luu.uoc.bai.kiem.tra")
        }
    }

    /// The server decides physical deletion versus archiving; hide the row either way.
    /// Returns the confirmation copy so the dialog can say which outcome applies.
    func deleteTest(_ test: TestDefinition) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.xoa.uoc.bai.kiem.tra") }
        let hasScores = scores.contains { $0.testId == test.id && $0.value != nil }
        do {
            let row = TestDefinition(id: test.id, classId: test.classId, name: test.name, date: test.date,
                                     archived: true, version: test.version)
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

    /// What the teacher chose on a slip: the five criteria with their sentence (generated, or hand-written), or only a note
    /// on an old three-star slip (those keep their stars and sentence).
    enum SlipGrading: Equatable {
        /// `hwManual` is nil when the teacher did not touch the homework criterion: the slip keeps its flag and
        /// `slip.set` does not send one.
        case criteria(Int, comment: String, hwManual: Bool? = nil)
        /// Only the note changed on a five-criteria slip: the criteria, stars and stored sentence stay as saved.
        case noteOnly
        case legacy
    }

    func saveSlip(sessionID: String, student: Student, grading: SlipGrading, note: String) async -> String? {
        guard let store, let write = slipWrite(sessionID: sessionID, student: student, grading: grading, note: note)
        else { return String(localized: "feature.scores.khong.luu.uoc.phieu.buoi.hoc") }
        do {
            try await store.write(write.row, forKey: write.command.recordKey, enqueueing: write.command)
            await syncIfNeeded()
            await refresh()
            return nil
        } catch { return String(localized: "feature.scores.khong.luu.uoc.phieu.buoi.hoc") }
    }

    /// The slip row and the `slip.set` that save `grading` on top of the slip as currently loaded; nil when the
    /// grading needs a slip (or stars) the student does not have.
    private func slipWrite(sessionID: String, student: Student, grading: SlipGrading,
                           note: String) -> (row: SessionSlip, command: PendingCommand)? {
        let old = slip(sessionID: sessionID, studentID: student.id)
        var fields: [String: JSONValue] = [
            "session_id": .string(sessionID),
            "student_id": .string(student.id),
            "note": .string(note)
        ]
        let row: SessionSlip
        switch grading {
        case .criteria(let criteria, let comment, let hwManual):
            let bits = criteria & SlipRules.allCriteria
            fields["criteria"] = .number(Double(bits))
            // The server only stores the sentence, so every criteria write carries one.
            fields["comment"] = .string(comment)
            if let hwManual { fields["hw_manual"] = .bool(hwManual) }
            row = SessionSlip(sessionId: sessionID, studentId: student.id, stars: SlipRules.stars(criteria: bits),
                              criteria: bits, comment: comment, scale: SessionSlip.currentScale,
                              hwManual: hwManual ?? old?.hwManual ?? false, note: note,
                              status: old?.status ?? .draft, sentAt: old?.sentAt,
                              version: old?.version ?? 0, updatedAt: Self.now)
        case .noteOnly:
            guard let old else { return nil }
            row = SessionSlip(sessionId: sessionID, studentId: student.id, stars: old.stars, criteria: old.criteria,
                              comment: old.comment, scale: old.scale, hwManual: old.hwManual, note: note,
                              status: old.status, sentAt: old.sentAt, version: old.version, updatedAt: Self.now)
        case .legacy:
            guard let old, let stars = old.stars else { return nil }
            fields["stars"] = .number(Double(stars))
            row = SessionSlip(sessionId: sessionID, studentId: student.id, stars: stars, criteria: old.criteria,
                              comment: old.comment, scale: old.scale, hwManual: old.hwManual, note: note, status: old.status,
                              sentAt: old.sentAt, version: old.version, updatedAt: Self.now)
        }
        let command = PendingCommand(recordKey: key("slip", sessionID, student.id),
                                     baseVersion: old?.version ?? 0, kind: "slip.set", payload: object(fields))
        return (row, command)
    }

    /// Saves every default slip in one go: the list is read once, each plan is checked, and all the slips and their
    /// `slip.set` commands are written in one transaction (so offline they queue like any edit) before a single sync.
    /// The criteria are as given, the sentence generated from them, and the homework flag back to following the grades.
    /// A slip that was sent, or is being sent right now, is left alone: the state is read again just before the
    /// write, so a plan made from an older view of the list never overwrites it.
    func saveDefaultSlips(sessionID: String, slips plans: [CommentsRules.DefaultSlip]) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.phieu.buoi.hoc") }
        guard !sendingSessionIDs.contains(sessionID) else { return nil }
        await refresh()
        guard !sendingSessionIDs.contains(sessionID) else { return nil }
        var entries: [(value: SessionSlip, key: String, command: PendingCommand?)] = []
        for plan in plans {
            guard slip(sessionID: sessionID, studentID: plan.studentID)?.status != .sent,
                  let student = students.first(where: { $0.id == plan.studentID }) else { continue }
            guard let write = slipWrite(sessionID: sessionID, student: student,
                                        grading: .criteria(plan.criteria, comment: plan.comment, hwManual: false),
                                        note: plan.note)
            else { return String(localized: "feature.scores.khong.luu.uoc.phieu.buoi.hoc") }
            entries.append((write.row, write.command.recordKey, write.command))
        }
        guard !entries.isEmpty else { return nil }
        do {
            try await store.writeAll(entries)
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

    /// Sends the given students' slips and waits for the server's answer. Only slips that exist are sent; a
    /// student without one is never asked for. An old unscored draft carries its default sentence along.
    /// The `slip.send` command goes straight to the server and is never written to the outbox, so an
    /// unconfirmed send leaves nothing behind that could be replayed later; the slips stay as they were.
    /// The local state follows what the server reports as `sent` and `skipped`.
    func sendSlips(sessionID: String, studentIDs: [String]) async -> SendOutcome {
        guard let api, let store else { return .failed(String(localized: "feature.scores.khong.xep.hang.uoc.phieu")) }
        sendingSessionIDs.insert(sessionID)
        defer { sendingSessionIDs.remove(sessionID) }
        let failure = SendOutcome.failed(String(localized: "comments.send.failed", table: "Teacher"))
        // Edits still waiting in the outbox must reach the server first, or it would send older criteria and notes.
        // With an empty outbox there is nothing to push and the send itself tells the server's state, so the
        // round trips are skipped.
        if !((try? await store.pendingCommands()) ?? []).isEmpty {
            guard await syncIfNeeded() else { return failure }
        }
        await refresh()
        let chosen = studentIDs.filter { id in slip(sessionID: sessionID, studentID: id)?.status != .sent }
        guard !chosen.isEmpty else { return .failed(String(localized: "comments.send.nothing", table: "Teacher")) }
        let slipKeys = Set(chosen.map { key("slip", sessionID, $0) })
        let waiting = (try? await store.pendingCommands()) ?? []
        if waiting.contains(where: { slipKeys.contains($0.recordKey) }) { return failure }

        var fields: [String: JSONValue] = [
            "session_id": .string(sessionID),
            "student_ids": .array(chosen.map { JSONValue.string($0) })
        ]
        // An old unscored draft has no stars to send, so it carries the default; the server only stores the sentence.
        let defaults = sendDefaults(sessionID: sessionID, studentIDs: chosen)
        if !defaults.isEmpty {
            fields["defaults"] = .array(defaults.map {
                .object(["student_id": .string($0.studentID), "criteria": .number(Double($0.criteria)),
                         "comment": .string($0.comment)])
            })
        }
        let payload = object(fields)
        let baseVersion = chosen.compactMap { slip(sessionID: sessionID, studentID: $0)?.version }.first ?? 0
        let command = SyncCommand(id: UUID(), type: "slip.send", baseVersion: baseVersion, createdAt: .now, payload: payload)
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
        let sentRows = chosen.filter { sentIDs.contains($0) }.compactMap { id -> (value: SessionSlip, key: String, command: PendingCommand?)? in
            guard let slip = slip(sessionID: sessionID, studentID: id) else { return nil }
            let row = SessionSlip(sessionId: slip.sessionId, studentId: slip.studentId, stars: slip.stars,
                                  criteria: slip.criteria, comment: slip.comment, scale: slip.scale, hwManual: slip.hwManual,
                                  note: slip.note,
                                  status: .sent, sentAt: Self.now, version: slip.version, updatedAt: Self.now)
            return (row, key("slip", sessionID, id), nil)
        }
        try? await store.writeAll(sentRows)
        let notSent = chosen.filter { !sentIDs.contains($0) }.count
        // A pull is only needed when the local rows might not match the server: slips it scored from a default,
        // or slips it left out. When every slip went and none was scored by the server, the rows written above
        // are already the real state.
        if !defaults.isEmpty || notSent > 0 { await syncIfNeeded() }
        await refresh()
        let sentCount = chosen.filter { sentIDs.contains($0) }.count
        return notSent == 0 ? .sent(sentCount) : .partial(sent: sentCount, notSent: notSent)
    }

    private func sendDefaults(sessionID: String, studentIDs: [String]) -> [CommentsRules.DefaultSlip] {
        guard let session = session(id: sessionID) else { return [] }
        let previous = HomeworkRules.previousSession(sessions(in: session.classId), before: session)
        return CommentsRules.sendDefaults(
            studentIDs: studentIDs,
            slip: { slip(sessionID: sessionID, studentID: $0) },
            sections: previous.map { sections(sessionID: $0.id) } ?? [], grades: grades)
    }

    // MARK: - Homework

    func saveSection(sessionID: String, kind: HomeworkKind, title: String, description: String,
                     section: HomeworkSection? = nil) async -> String? {
        guard let store else { return String(localized: "feature.scores.khong.luu.uoc.phan.bai.tap") }
        let id = section?.id ?? UUID().uuidString.lowercased()
        let row = HomeworkSection(id: id, classId: session(id: sessionID)?.classId ?? section?.classId ?? classID, sessionId: sessionID, kind: kind, title: title,
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
            await refresh()
            await regradeNextSessionSlip(of: section, student: student)
            await syncIfNeeded()
            await refresh()
        } catch { errorMessage = String(localized: "feature.scores.khong.luu.uoc.ket.qua.cham") }
    }

    /// The server no longer recomputes a slip when homework is graded again, so the app does: the student's draft
    /// slip in the next session that was not hand-set follows the new result, with its sentence written again.
    private func regradeNextSessionSlip(of section: HomeworkSection, student: Student) async {
        guard let graded = session(id: section.sessionId),
              let next = HomeworkRules.gradingPlan(sessions(in: graded.classId), after: graded).session,
              let change = HomeworkRules.regradedSlip(slip: slip(sessionID: next.id, studentID: student.id),
                                                      sections: sections(sessionID: graded.id), grades: grades,
                                                      studentID: student.id) else { return }
        _ = await saveSlip(sessionID: next.id, student: student,
                           grading: .criteria(change.criteria, comment: change.comment),
                           note: slip(sessionID: next.id, studentID: student.id)?.note ?? "")
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
