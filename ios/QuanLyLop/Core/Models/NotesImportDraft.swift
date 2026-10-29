import Foundation

/// One slip the notes import writes: the criteria not met, the note, and whether the homework criterion was set by hand.
struct NotesImportSave: Equatable, Sendable {
    let studentID: String
    let unmetMask: Int
    let note: String
    /// nil keeps the slip's own flag.
    let hwManual: Bool?
    /// False on an existing slip whose criteria stay as they are: only the note is written.
    let criteriaChanged: Bool
}

/// What the teacher sees in "Theo tiêu chí" after pasting notes: the suggested slips, still editable chip by chip.
/// Nothing is written until the teacher saves; the draft lives in screen memory only.
struct NotesImportDraft: Equatable, Sendable {
    struct Entry: Equatable, Sendable {
        var unmet: Int
        let baseUnmet: Int
        var appendNote: [String]
        let isNew: Bool
        var hwManual: Bool
        /// The teacher tapped the homework chip, so the criterion is hand-set even if it ends where it began.
        var hwTouched = false
        let existingNote: String

        /// Whether saving would write something for this student.
        var hasEffect: Bool { isNew || unmet != baseUnmet || !appendNote.isEmpty || hwTouched }
    }

    let result: NotesImportRules.Result
    let options: NotesImportRules.Options
    private(set) var entries: [String: Entry]
    private let students: [String: NotesImportRules.Student]

    init(result: NotesImportRules.Result, students roster: [NotesImportRules.Student], options: NotesImportRules.Options) {
        self.result = result
        self.options = options
        students = Dictionary(uniqueKeysWithValues: roster.map { ($0.id, $0) })
        var entries: [String: Entry] = [:]
        for change in result.changes {
            guard let student = students[change.studentId] else { continue }
            entries[change.studentId] = Entry(unmet: change.uncheckedAfterMask, baseUnmet: Self.base(student),
                                              appendNote: change.appendNote, isNew: change.isNewSlip,
                                              hwManual: change.hwManual, existingNote: student.slip?.note ?? "")
        }
        for slip in result.defaultSlips ?? [] {
            guard let student = students[slip.studentId] else { continue }
            entries[slip.studentId] = Entry(unmet: slip.uncheckedAfterMask, baseUnmet: Self.base(student), appendNote: [],
                                            isNew: true, hwManual: false, existingNote: "")
        }
        self.entries = entries
    }

    private static func base(_ student: NotesImportRules.Student) -> Int {
        student.slip?.unmetMask ?? (student.homeworkNotDone ? 1 << NotesImportRules.homeworkIndex : 0)
    }

    /// Slips that exist and would change, and slips that would be created.
    var changingCount: Int { entries.values.filter { !$0.isNew && $0.hasEffect }.count }
    var newCount: Int { entries.values.filter(\.isNew).count }
    var effectCount: Int { changingCount + newCount }

    /// Slips left out for a reason the teacher can act on (sent, waiting to send) or cannot (old scale).
    var skippedCount: Int {
        result.skipped.filter { [.legacyScale, .sentSlip, .queuedSend].contains($0.reason) }.count
    }

    var hasSentSkipped: Bool {
        !options.includeSent && result.skipped.contains { [.sentSlip, .queuedSend].contains($0.reason) }
    }

    /// The criteria not met the chip shows for this student, or nil when the draft does not touch them.
    func unmet(for studentID: String) -> Int? { entries[studentID]?.unmet }

    /// A chip tap inside the draft: the criterion flips, nothing is written.
    mutating func toggle(studentID: String, criterion: Int) {
        guard let student = students[studentID], !(student.slip?.isLegacy ?? false) else { return }
        var entry = entries[studentID] ?? Entry(unmet: Self.base(student), baseUnmet: Self.base(student), appendNote: [],
                                                isNew: student.slip == nil, hwManual: false,
                                                existingNote: student.slip?.note ?? "")
        entry.unmet ^= 1 << criterion
        if criterion == NotesImportRules.homeworkIndex { entry.hwManual = true; entry.hwTouched = true }
        entries[studentID] = entry
    }

    /// Sent slips are editable in the draft only when the teacher asked for it.
    func isEditable(studentID: String) -> Bool {
        guard let student = students[studentID] else { return false }
        guard let slip = student.slip else { return true }
        if slip.isLegacy { return false }
        return slip.state == .draft || options.includeSent
    }

    /// Slips whose hand-written sentence would be written again from the criteria.
    func handEditedCount(isHandEdited: (String) -> Bool) -> Int {
        entries.filter { $0.value.hasEffect && $0.value.unmet != $0.value.baseUnmet && !$0.value.isNew && isHandEdited($0.key) }.count
    }

    var saves: [NotesImportSave] {
        entries.sorted { $0.key < $1.key }.compactMap { id, entry in
            guard entry.hasEffect else { return nil }
            let note = ([entry.existingNote.trimmingCharacters(in: .whitespacesAndNewlines)] + entry.appendNote)
                .filter { !$0.isEmpty }.joined(separator: " ")
            return NotesImportSave(studentID: id, unmetMask: entry.unmet, note: note,
                                   hwManual: entry.hwManual ? true : nil,
                                   criteriaChanged: entry.isNew || entry.unmet != entry.baseUnmet || entry.hwTouched)
        }
    }

    // MARK: Review lines

    /// Names the teacher still has to decide on, with the students they could mean.
    var ambiguous: [(raw: String, candidates: [String])] {
        result.lines.flatMap(\.names).filter { $0.status == .ambiguous }
            .map { ($0.raw, $0.studentIds.compactMap { students[$0]?.fullName }) }
    }
    var unmatched: [String] { result.lines.flatMap(\.names).filter { $0.status == .unmatched }.map(\.raw) }
    var excluded: [String] { result.lines.flatMap(\.names).filter { $0.status == .excluded }.map(\.raw) }
    var absentNames: [String] {
        result.lines.flatMap(\.names).filter { $0.warnings?.contains("absent") == true }.map(\.raw)
    }
    var wholeClassPhrases: [String] {
        result.lines.filter { $0.flags.contains(.wholeClass) }.map(\.phrase)
    }
    /// Phrases that went to the free-text note only, for the teacher to read.
    var needsReviewPhrases: [String] {
        var seen = Set<String>()
        return result.lines.filter { $0.flags.contains(.needsReview) && !$0.flags.contains(.wholeClass) }
            .map(\.phrase).filter { seen.insert($0).inserted }
    }
}

/// Fixed Vietnamese text of "Nhập từ ghi chú".
enum NotesImportText {
    static let entry = "Nhập từ ghi chú"
    static let title = "Nhập từ ghi chú"
    static let pasteLabel = "Dán ghi chú"
    static let pasteHint = "Mỗi dòng: lý do, dấu hai chấm, rồi tên các em. Ví dụ: Mất tập trung: Thu, Tươi"
    static let analyze = "Xem gợi ý"
    static let optionDefaults = "Tạo phiếu mặc định cho các em còn lại"
    static let optionPraise = "Thêm câu khen vào nhận xét"
    static let optionSent = "Cho sửa cả phiếu đã gửi hoặc chờ gửi"
    static let banner = "Gợi ý từ ghi chú, kiểm tra rồi Lưu"
    static let bannerNote = "Chạm chip để đổi. Chưa có gì được ghi cho tới khi bạn bấm Lưu."
    static let save = "Lưu"
    static let discard = "Bỏ gợi ý"
    static let saving = "Đang lưu…"
    static let ambiguousTitle = "Trùng tên, chưa chọn được"
    static let ambiguousHint = "Chạm chip của em đúng để đánh dấu."
    static let unmatchedTitle = "Không tìm thấy"
    static let excludedTitle = "Đã nghỉ hoặc chưa vào lớp vào ngày này"
    static let absentTitle = "Em vắng buổi này"
    static let wholeClassTitle = "Cả lớp: không tự áp, hãy chạm chọn"
    static let reviewTitle = "Cần xem: vào phần nhận xét riêng"
    static let unparsedTitle = "Dòng không có dấu hai chấm"
    static let sentSkippedHint = "Có phiếu đã gửi hoặc chờ gửi. Bật “Cho sửa cả phiếu đã gửi” để đưa vào."

    static func counts(changing: Int, new: Int) -> String { "\(changing) phiếu sẽ đổi, \(new) phiếu mới" }
    static func skipped(_ count: Int) -> String { "\(count) phiếu bỏ qua" }
    static func queued(_ count: Int) -> String { "\(count) phiếu đã lưu trên máy, chờ đồng bộ với máy chủ" }
    static func sentSince(_ count: Int) -> String { "\(count) phiếu bỏ qua vì đã gửi từ lúc xem gợi ý" }
    static func handEdited(_ count: Int) -> String { "\(count) phiếu có câu sửa tay sẽ được viết lại từ tiêu chí" }
    static func saved(_ saved: Int, failed: Int) -> String {
        failed == 0 ? "Đã lưu \(saved) phiếu" : "Đã lưu \(saved), \(failed) phiếu lỗi"
    }
    static let failedNames = "Phiếu lỗi: "
    static let failedHint = "Máy chủ chưa nhận các phiếu này. Bấm thử lại để gửi lại đúng các phiếu đó."
    static let retry = "Thử lại phiếu lỗi"
    static let dismissResult = "Đóng"
    static func ambiguousLine(_ raw: String, _ candidates: [String]) -> String { "\(raw): \(candidates.joined(separator: " / "))" }
}
