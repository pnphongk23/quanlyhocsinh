import SwiftUI

/// Demo-backed feature context. I-2/I-3 can inject the authenticated SQLiteStore and APIClient
/// without changing any screen entry-point signature.
@MainActor
final class I4FeatureStore: ObservableObject {
    static let demo = I4FeatureStore()

    @Published private(set) var classes: [Classroom] = []
    @Published private(set) var students: [Student] = []
    @Published private(set) var sessions: [ClassSession] = []
    @Published private(set) var tests: [TestDefinition] = []
    @Published private(set) var scores: [Score] = []
    @Published private(set) var slips: [SessionSlip] = []
    @Published private(set) var sections: [HomeworkSection] = []
    @Published private(set) var grades: [HomeworkGrade] = []
    @Published private(set) var publications: [ReportPublication] = []
    @Published private(set) var hiddenSectionIDs: Set<String> = []
    @Published private(set) var canReadScores = true
    @Published private(set) var canWriteScores = true
    @Published private(set) var canReadCommentsReports = true
    @Published private(set) var canWriteCommentsReports = true
    @Published var errorMessage: String?

    private(set) var store: SQLiteStore
    private(set) var api: any APIClient
    private(set) var isDemo: Bool
    private let membershipID = "fixture-member"
    private let deviceID = "fixture-device"

    init(store: SQLiteStore? = nil, api: (any APIClient)? = nil, isDemo: Bool = true) {
        let scope = CacheScope(userId: "fixture-user", workspaceId: "fixture-workspace", membershipId: "fixture-member")
        self.store = store ?? (try! SQLiteStore.open(scope: scope))
        self.api = api ?? (try! StubAPIClient.demo(baseURL: URL(string: "https://staging.invalid/v1")!, membershipId: "fixture-member"))
        self.isDemo = isDemo
        Task { await bootstrap() }
    }

    var classID: String { classes.first?.id ?? "fixture-class" }
    var defaultSession: ClassSession? { sessions.first(where: { $0.status != .cancelled }) }

    func configure(auth: AuthModel) async {
        guard let activeStore = auth.activeStoreForLogout as? SQLiteStore,
              case .success(let configuration) = AppConfiguration.load() else { return }
        store = activeStore
        api = URLSessionAPIClient(configuration: configuration,
                                  tokenStore: KeychainTokenStore(service: "vn.quanlylop.\(configuration.environment.rawValue)"))
        isDemo = false
        if let membership = auth.activeMembership {
            canReadScores = allows(membership, group: "scores", write: false)
            canWriteScores = allows(membership, group: "scores", write: true)
            canReadCommentsReports = allows(membership, group: "comments_reports", write: false)
            canWriteCommentsReports = allows(membership, group: "comments_reports", write: true)
        }
        do { try await SyncCoordinator(api: api, store: activeStore, deviceId: deviceID).synchronize() }
        catch { errorMessage = "Không thể đồng bộ dữ liệu. Vui lòng thử lại." }
        await refresh()
    }

    func refresh() async {
        do {
            classes = try await store.records(Classroom.self, entity: "class")
            students = try await store.records(Student.self, entity: "student")
            sessions = try await store.records(ClassSession.self, entity: "class_session")
            tests = try await store.records(TestDefinition.self, entity: "test")
            scores = try await store.records(Score.self, entity: "score")
            slips = try await store.records(SessionSlip.self, entity: "slip")
            sections = try await store.records(HomeworkSection.self, entity: "homework_section")
            grades = try await store.records(HomeworkGrade.self, entity: "homework_grade")
            publications = try await store.records(ReportPublication.self, entity: "report_publication")
        } catch { errorMessage = "Không tải được dữ liệu đã lưu." }
    }

    private func bootstrap() async {
        do {
            if try await store.position() == nil {
                let manifest = try await api.send(.init(method: .get, path: "sync/snapshot", query: ["membership_id": membershipID]), as: SnapshotManifest.self)
                var rows: [String: [JSONValue]] = [:]
                for entity in manifest.entities {
                    let page = try await api.send(.init(method: .get, path: "sync/snapshot/" + entity,
                        query: ["membership_id": membershipID, "limit": "300"]), as: SnapshotPage.self)
                    rows[entity] = page.items
                }
                try await store.installSnapshot(rows, position: SyncPosition(cursor: manifest.cursor, epoch: manifest.epoch))
            }
            await refresh()
        } catch { errorMessage = "Không tải được dữ liệu mẫu." }
    }

    func saveScore(test: TestDefinition, student: Student, value: Double?) async {
        do {
            try test.validate(score: value)
            let old = scores.first { $0.testId == test.id && $0.studentId == student.id }
            let row = Score(testId: test.id, studentId: student.id, value: value, version: old?.version ?? 0, updatedAt: Self.now)
            let payload = object(["test_id": .string(test.id), "student_id": .string(student.id), "value": value.map(JSONValue.number) ?? .null])
            let command = PendingCommand(recordKey: key("score", test.id, student.id), baseVersion: old?.version ?? 0, kind: "score.set", payload: payload)
            try await store.write(row, forKey: command.recordKey, enqueueing: command); await syncIfNeeded(); await refresh()
        } catch { errorMessage = "Điểm phải từ 0 đến \(test.maxScore)." }
    }

    func saveTest(name: String, date: String, max: Int, existing: TestDefinition? = nil) async {
        do {
            if let existing {
                let highest = scores.filter { $0.testId == existing.id }.compactMap(\.value).max()
                try existing.validateNewMaximum(max, highestScore: highest)
                let row = try TestDefinition(id: existing.id, classId: existing.classId, name: name, date: date, maxScore: max, archived: false, version: existing.version)
                let command = PendingCommand(recordKey: key("test", row.id), baseVersion: existing.version, kind: "test.update", payload: object(["id": .string(row.id), "name": .string(name), "date": .string(date), "max": .number(Double(max))]))
                try await store.write(row, forKey: command.recordKey, enqueueing: command)
            } else {
                let id = UUID().uuidString.lowercased()
                let row = try TestDefinition(id: id, classId: classID, name: name, date: date, maxScore: max)
                let command = PendingCommand(recordKey: key("test", id), baseVersion: 0, kind: "test.create", payload: object(["id": .string(id), "class_id": .string(classID), "name": .string(name), "date": .string(date), "max": .number(Double(max))]))
                try await store.write(row, forKey: command.recordKey, enqueueing: command)
            }
            await syncIfNeeded(); await refresh()
        } catch { errorMessage = "Không lưu được bài kiểm tra. Kiểm tra điểm tối đa và điểm đã nhập." }
    }

    func deleteTest(_ test: TestDefinition) async {
        do {
            let hasScores = scores.contains { $0.testId == test.id && $0.value != nil }
            let kind = hasScores ? "archived" : "deleted"
            // Hide optimistically in both cases; the server decides physical deletion vs archive.
            let row = try TestDefinition(id: test.id, classId: test.classId, name: test.name, date: test.date, maxScore: test.maxScore, archived: true, version: test.version)
            let command = PendingCommand(recordKey: key("test", test.id), baseVersion: test.version, kind: "test.delete", payload: object(["id": .string(test.id)]))
            try await store.write(row, forKey: command.recordKey, enqueueing: command)
            if !hasScores { errorMessage = "Bài kiểm tra đã được đưa vào hàng đợi xoá." }
            else { errorMessage = "Bài kiểm tra đã được lưu trữ." }
            _ = kind; await syncIfNeeded(); await refresh()
        } catch { errorMessage = "Không xoá được bài kiểm tra." }
    }

    func saveSlip(sessionID: String, student: Student, stars: Stars?, note: String) async {
        let old = slips.first { $0.sessionId == sessionID && $0.studentId == student.id }
        let row = SessionSlip(sessionId: sessionID, studentId: student.id, stars: stars, note: note, status: old?.status ?? .draft, sentAt: old?.sentAt, version: old?.version ?? 0, updatedAt: Self.now)
        let command = PendingCommand(recordKey: key("slip", sessionID, student.id), baseVersion: old?.version ?? 0, kind: "slip.set", payload: object(["session_id": .string(sessionID), "student_id": .string(student.id), "stars": stars.map { .number(Double($0.rawValue)) } ?? .null, "note": .string(note)]))
          do { try await store.write(row, forKey: command.recordKey, enqueueing: command); await syncIfNeeded(); await refresh() }
        catch { errorMessage = "Không lưu được phiếu buổi học." }
    }

    func sendSlips(sessionID: String) async {
        let selected = slips.filter { $0.sessionId == sessionID && $0.stars != nil }
        guard let first = selected.first else { errorMessage = "Chọn sao cho ít nhất một học sinh."; return }
        let payload = object(["session_id": .string(sessionID), "student_ids": .array(selected.map { .string($0.studentId) })])
        let command = PendingCommand(recordKey: key("slip", sessionID, first.studentId), baseVersion: first.version, kind: "slip.send", payload: payload)
          do { try await store.write(first, forKey: command.recordKey, enqueueing: command); await syncIfNeeded(); if isDemo { errorMessage = "Phiếu đã xếp hàng; sẽ gửi khi có kết nối." } }
        catch { errorMessage = "Không xếp hàng được phiếu." }
    }

    func saveSection(sessionID: String, kind: HomeworkKind, title: String, description: String, section: HomeworkSection? = nil) async {
        let id = section?.id ?? UUID().uuidString.lowercased()
        let row = HomeworkSection(id: id, classId: classID, sessionId: sessionID, kind: kind, title: title, description: description, version: section?.version ?? 0)
        let item = object(["id": .string(id), "kind": .string(kind.rawValue), "title": .string(title), "description": .string(description)])
        let payload = section == nil
            ? object(["session_id": .string(sessionID), "sections": .array([item])])
            : object(["id": .string(id), "session_id": .string(sessionID), "kind": .string(kind.rawValue), "title": .string(title), "description": .string(description)])
        let command = PendingCommand(recordKey: key("homework_section", id), baseVersion: section?.version ?? 0,
                                     kind: section == nil ? "homework.assign" : "homework.section.upsert", payload: payload)
          do { try await store.write(row, forKey: command.recordKey, enqueueing: command); await syncIfNeeded(); await refresh() }
        catch { errorMessage = "Không lưu được phần bài tập." }
    }

    func deleteSection(_ section: HomeworkSection) async {
        guard !grades.contains(where: { $0.sectionId == section.id && $0.level != nil }) else {
            errorMessage = "Không thể xoá phần đã có kết quả chấm."; return
        }
        let command = PendingCommand(recordKey: key("homework_section", section.id), baseVersion: section.version,
                                     kind: "homework.section.delete", payload: object(["id": .string(section.id)]))
        do {
              try await store.write(section, forKey: command.recordKey, enqueueing: command)
              hiddenSectionIDs.insert(section.id)
              await syncIfNeeded(); errorMessage = "Đã xếp hàng xoá phần bài tập."; await refresh()
        } catch { errorMessage = "Không xoá được phần bài tập." }
    }

    func grade(_ section: HomeworkSection, student: Student, level: HomeworkLevel?) async {
        let old = grades.first { $0.sectionId == section.id && $0.studentId == student.id }
        let row = HomeworkGrade(sectionId: section.id, studentId: student.id, level: level, version: old?.version ?? 0, updatedAt: Self.now)
        let command = PendingCommand(recordKey: key("homework_grade", section.id, student.id), baseVersion: old?.version ?? 0, kind: "homework.grade.set", payload: object(["section_id": .string(section.id), "student_id": .string(student.id), "level": level.map { .string($0.rawValue) } ?? .null]))
          do { try await store.write(row, forKey: command.recordKey, enqueueing: command); await syncIfNeeded(); await refresh() }
        catch { errorMessage = "Không lưu được kết quả chấm." }
    }

    func publish(student: Student, month: String, comment: String, snapshot: ReportSnapshot) async {
        do {
            struct PublishResponse: Decodable, Sendable {
                let reportId: String
                let publicationNo: Int
                let publishedAt: String
                let snapshot: ReportSnapshot
            }
            let draft = try APIEndpoint.json(method: .put, path: "students/\(student.id)/reports/\(month)", body: ["general_comment": comment])
            let _: JSONValue = try await api.send(draft, as: JSONValue.self)
            let response = try await api.send(.init(method: .post, path: "students/\(student.id)/reports/\(month)/publish"), as: PublishResponse.self)
            let pdf = I4PDFRenderer.render(snapshot: response.snapshot, studentName: student.name)
            let url = FileManager.default.temporaryDirectory.appending(path: "bao-cao-\(month)-\(student.id)-\(response.publicationNo).pdf")
            try pdf.write(to: url, options: .atomic)
            // APIClient currently only sends JSON bodies; publishing succeeds but the PDF upload
            // contract needs a binary application/pdf request in Core/Networking.
            _ = snapshot
            errorMessage = "Đã phát hành báo cáo. PDF đã tạo trên thiết bị; chưa tải lên máy chủ."
        } catch { errorMessage = "Không thể phát hành lúc này. Kiểm tra kết nối rồi thử lại." }
    }

    private func key(_ entity: String, _ a: String, _ b: String = "") -> String { RecordKey(entity: entity, k1: a, k2: b).storageKey }
    private func object(_ values: [String: JSONValue]) -> JSONValue { .object(values) }
    private static var now: String { ISO8601DateFormatter().string(from: .now) }
    private func syncIfNeeded() async {
        guard !isDemo else { return }
        do { try await SyncCoordinator(api: api, store: store, deviceId: deviceID).synchronize(); errorMessage = nil }
        catch { errorMessage = "Đã lưu trên thiết bị; không thể đồng bộ lúc này." }
    }
    private func allows(_ membership: Membership, group: String, write: Bool) -> Bool {
        if membership.role.scopeKind == .workspace { return true }
        guard let level = membership.permissions?[group] else { return false }
        return level == .write || (!write && level == .read)
    }
}

struct TestsTabView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var showCreate = false
    @State private var showScoreGrid = false
    @State private var selectedTestID = ""
    @State private var editing: TestDefinition?
    @State private var deleting: TestDefinition?
    init(classID: String, data: I4FeatureStore = .demo) { self.classID = classID; self.data = data }
    private var tests: [TestDefinition] { data.tests.filter { $0.classId == classID && !$0.archived }.sorted { $0.date > $1.date } }
    var body: some View {
        NavigationStack {
            ScrollView { VStack(alignment: .leading, spacing: 12) {
                HStack { Text("Bài kiểm tra").appText(AppText.title); Spacer(); AppButton(title: "+ Bài mới", variant: .secondary) { showCreate = true } }
                if tests.isEmpty { AppEmptyState(title: "Chưa có bài kiểm tra") }
                ForEach(tests) { test in AppCard { VStack(alignment: .leading, spacing: 8) {
                    HStack { Text(test.name).appText(AppText.subheading); Spacer(); Text("\(test.maxScore) điểm").appText(AppText.caption).foregroundStyle(AppColors.muted) }
                    Text("Ngày \(test.date)").appText(AppText.muted)
                      HStack { AppButton(title: "Nhập điểm", variant: .primary) { selectedTestID = test.id; showScoreGrid = true }; AppButton(title: "Sửa bài", variant: .secondary) { editing = test }; AppButton(title: "Xoá bài", variant: .danger) { deleting = test } }
                } } }
                if let message = data.errorMessage { Text(message).appText(AppText.muted).foregroundStyle(AppColors.error) }
            }.padding(16) }
            .background(AppColors.background)
              .sheet(isPresented: $showCreate) { TestEditor(data: data, classID: classID) }
              .sheet(isPresented: $showScoreGrid) { ScoreGridTabView(classID: classID, data: data, initialTestID: selectedTestID) }
            .sheet(item: $editing) { test in ScoreEntry(data: data, test: test) }
            .confirmationDialog("Xoá hoặc lưu trữ bài kiểm tra?", item: $deleting) { test in
                Button(data.scores.contains(where: { $0.testId == test.id && $0.value != nil }) ? "Lưu trữ bài" : "Xoá bài", role: .destructive) { Task { await data.deleteTest(test) } }
                Button("Giữ bài", role: .cancel) {}
            } message: { test in Text(data.scores.contains(where: { $0.testId == test.id && $0.value != nil }) ? "Bài có điểm sẽ được lưu trữ và ẩn khỏi bảng điểm, báo cáo." : "Bài chưa có điểm sẽ bị xoá hẳn.") }
            .task { await data.configure(auth: auth) }
        }
    }
}

struct ScoreGridTabView: View {
    let classID: String
    @ObservedObject var data: I4FeatureStore
    @Environment(AuthModel.self) private var auth
    @State private var selectedID = ""
    @State private var drafts: [String: String] = [:]
    init(classID: String, data: I4FeatureStore = .demo, initialTestID: String = "") { self.classID = classID; self.data = data; _selectedID = State(initialValue: initialTestID) }
    private var tests: [TestDefinition] { data.tests.filter { $0.classId == classID && !$0.archived }.sorted { $0.date > $1.date } }
    private var test: TestDefinition? { tests.first { $0.id == selectedID } ?? tests.first }
    var body: some View {
        VStack(spacing: 12) {
            Text("Điểm số").appText(AppText.title).frame(maxWidth: .infinity, alignment: .leading)
            if tests.isEmpty { AppEmptyState(title: "Chưa có bài kiểm tra") }
            else {
                ScrollView(.horizontal, showsIndicators: false) { HStack { ForEach(tests) { item in AppButton(title: item.name, variant: (test?.id == item.id ? .primary : .secondary)) { selectedID = item.id } } } }
                if let test {
                    AppCard { VStack(alignment: .leading, spacing: 8) { Text(test.name).appText(AppText.subheading); Text("Thang \(test.maxScore) điểm").appText(AppText.muted) } }
                    ScrollView { VStack(spacing: 8) { ForEach(data.students.filter { $0.classId == classID && $0.status == .active }) { student in
                        let score = data.scores.first { $0.testId == test.id && $0.studentId == student.id }
                        AppListRow { VStack(alignment: .leading) { Text(student.name).appText(AppText.body); if score?.value == nil && drafts[student.id] == nil { Text("Chưa có điểm").appText(AppText.caption).foregroundStyle(AppColors.muted) } }; Spacer(); TextField("–", text: Binding(get: { drafts[student.id] ?? score?.value.map(String.init) ?? "" }, set: { drafts[student.id] = $0 })).keyboardType(.decimalPad).multilineTextAlignment(.trailing).frame(width: 76).textFieldStyle(.roundedBorder).accessibilityLabel("Điểm \(student.name)") }
                    } } }
                    AppButton(title: "Lưu điểm", size: .large) { Task { for (id, raw) in drafts { guard let student = data.students.first(where: { $0.id == id }) else { continue }; let value = raw.isEmpty ? nil : Double(raw.replacingOccurrences(of: ",", with: ".")); await data.saveScore(test: test, student: student, value: value) }; drafts.removeAll() } }
                }
            }
            if let message = data.errorMessage { Text(message).appText(AppText.muted).foregroundStyle(AppColors.error) }
        }.padding(16).background(AppColors.background)
            .task { await data.configure(auth: auth) }
    }
}

private struct TestEditor: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var data: I4FeatureStore
    let classID: String
    @State private var name = ""
    @State private var date = String(ISO8601DateFormatter().string(from: .now).prefix(10))
    @State private var max = "15"
    var body: some View { AppSheet(title: "Tạo bài kiểm tra", content: { VStack(spacing: 14) { AppTextField(label: "Tên bài kiểm tra", text: $name, placeholder: "Ví dụ: Unit 6 Test"); AppTextField(label: "Ngày kiểm tra", text: $date, placeholder: "YYYY-MM-DD"); AppTextField(label: "Điểm tối đa", text: $max, keyboard: .numberPad); Text("Mỗi bài có thang điểm riêng, mặc định 15.").appText(AppText.muted) } }, footer: { AppButton(title: "Tạo bài và nhập điểm", size: .large) { Task { await data.saveTest(name: name, date: date, max: Int(max) ?? 15); dismiss() } } }, close: { dismiss() }) }
}

private struct ScoreEntry: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var data: I4FeatureStore
    let test: TestDefinition
    @State private var name: String
    @State private var date: String
    @State private var max: String
    init(data: I4FeatureStore, test: TestDefinition) { self.data = data; self.test = test; _name = State(initialValue: test.name); _date = State(initialValue: test.date); _max = State(initialValue: String(test.maxScore)) }
    var body: some View { AppSheet(title: "Sửa bài kiểm tra", content: { VStack(spacing: 14) { AppTextField(label: "Tên bài kiểm tra", text: $name); AppTextField(label: "Ngày kiểm tra", text: $date); AppTextField(label: "Điểm tối đa", text: $max, keyboard: .numberPad) } }, footer: { AppButton(title: "Lưu thay đổi", size: .large) { Task { await data.saveTest(name: name, date: date, max: Int(max) ?? 15, existing: test); dismiss() } } }, close: { dismiss() }) }
}
