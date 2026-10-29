import Foundation

/// Pure rules of "Nhập danh sách": paste or CSV text becomes preview rows. Nothing here touches the
/// network, storage or logs; names and phone numbers only live in the values it returns.
/// The rules mirror `golden-import-cases.json` (the same file the web build reads).
enum StudentImportRules {
    enum Flag: String, Sendable, Hashable {
        case missingName = "missing_name"
        case invalidPhone = "invalid_phone"
        case suspiciousName = "suspicious_name"
        case duplicateInPaste = "duplicate_in_paste"
        case sameNameDifferentPhone = "same_name_different_phone"
    }

    enum Status: String, Sendable, Hashable {
        case add
        case skipExisting = "skip_existing"
        case skipDuplicateInPaste = "skip_duplicate_in_paste"
        case needsFix = "needs_fix"
    }

    enum Warning: String, Sendable, Hashable { case under20 = "under_20" }

    /// What the teacher can edit in the preview: the raw name and the raw phone text of one line.
    struct Candidate: Identifiable, Equatable, Sendable {
        let id: Int
        var name: String
        var phoneText: String
    }

    /// A student already in the class, for the duplicate rules.
    struct Existing: Equatable, Sendable {
        var fullName: String
        var guardianPhone: String?
    }

    struct Row: Identifiable, Equatable, Sendable {
        let id: Int
        /// Normalised name; nil when the line has none.
        var name: String?
        /// `+84` and nine digits, or nil when missing or invalid.
        var guardianPhone: String?
        var phoneText: String
        var flags: [Flag]
        var status: Status
    }

    struct Plan: Equatable, Sendable {
        var rows: [Row]
        var addCount: Int
        var warnings: [Warning]
    }

    // MARK: - Parse

    /// Lines to candidates: sequence numbers and blank lines dropped, one name and one phone cell per line.
    static func parse(_ text: String) -> [Candidate] {
        var result: [Candidate] = []
        let lines = text.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
            .split(separator: "\n", omittingEmptySubsequences: false)
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty else { continue }
            var cells = cells(of: stripSequenceNumber(trimmed))
            if cells.count > 1, let first = cells.first, matches(first, "^\\d{1,3}[.):]?$") { cells.removeFirst() }
            var phoneIndex: Int?
            for (index, cell) in cells.enumerated() where isPhoneLike(cell) { phoneIndex = index; break }
            var phoneText = ""
            var nameCells = cells
            if let phoneIndex {
                phoneText = cells[phoneIndex]
                nameCells.remove(at: phoneIndex)
            } else if cells.count == 1, let split = splitTrailingPhone(cells[0]) {
                nameCells = [split.name]
                phoneText = split.phone
            }
            let name = collapse(nameCells.filter { !$0.isEmpty }.joined(separator: " "))
                .trimmingCharacters(in: CharacterSet(charactersIn: ",;: "))
            guard !name.isEmpty || !phoneText.isEmpty else { continue }
            result.append(Candidate(id: result.count, name: name, phoneText: phoneText))
        }
        return result
    }

    // MARK: - Analyse

    /// Flags and statuses for the current candidates. `forceAdd` holds ids of rows the teacher chose to add anyway
    /// although the same student is already in the class.
    static func analyze(_ candidates: [Candidate], existing: [Existing], forceAdd: Set<Int> = []) -> Plan {
        let roster = existing.map { (key: matchKey($0.fullName), phone: $0.guardianPhone.flatMap(normalizedPhone)) }
        var seen: [(key: String, phone: String?)] = []
        var rows: [Row] = []
        for candidate in candidates {
            let name = normalizedName(candidate.name)
            let phoneText = candidate.phoneText.trimmingCharacters(in: .whitespacesAndNewlines)
            var phone: String?
            var flags: [Flag] = []
            if name.isEmpty { flags.append(.missingName) }
            if !phoneText.isEmpty {
                phone = normalizedPhone(phoneText)
                if phone == nil { flags.append(.invalidPhone) }
            }
            if !name.isEmpty, isSuspicious(name) { flags.append(.suspiciousName) }
            let key = matchKey(name)
            var status: Status = flags.isEmpty ? .add : .needsFix
            if flags.isEmpty {
                if seen.contains(where: { $0.key == key && $0.phone == phone }) {
                    flags.append(.duplicateInPaste)
                    status = .skipDuplicateInPaste
                } else {
                    let sameName = roster.filter { $0.key == key }
                    if let phone, sameName.contains(where: { $0.phone == phone }) {
                        status = forceAdd.contains(candidate.id) ? .add : .skipExisting
                    } else if !sameName.isEmpty {
                        flags.append(.sameNameDifferentPhone)
                    }
                }
            }
            if !name.isEmpty { seen.append((key, phone)) }
            rows.append(Row(id: candidate.id, name: name.isEmpty ? nil : name, guardianPhone: phone,
                            phoneText: phoneText, flags: flags, status: status))
        }
        let addCount = rows.filter { $0.status == .add }.count
        return Plan(rows: rows, addCount: addCount,
                    warnings: existing.count + addCount < 20 ? [.under20] : [])
    }

    /// Parse and analyse in one call (the golden cases use this).
    static func plan(_ text: String, existing: [Existing] = [], existingCount: Int? = nil) -> Plan {
        var plan = analyze(parse(text), existing: existing)
        if let existingCount { plan.warnings = existingCount + plan.addCount < 20 ? [.under20] : [] }
        return plan
    }

    // MARK: - Names

    /// Collapse spaces, first letter of each word upper-case, the rest lower-case.
    static func normalizedName(_ raw: String) -> String {
        let text = collapse(raw.precomposedStringWithCanonicalMapping.lowercased())
        var result = ""
        var previousIsLetter = false
        for character in text {
            result += character.isLetter && !previousIsLetter ? character.uppercased() : String(character)
            previousIsLetter = character.isLetter
        }
        return result
    }

    /// Key for comparing names: no diacritics, đ as d, case-insensitive.
    static func matchKey(_ raw: String) -> String {
        collapse(raw.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "vi"))
            .replacingOccurrences(of: "đ", with: "d").replacingOccurrences(of: "Đ", with: "d"))
            .lowercased()
    }

    private static let strangeCharacters = CharacterSet(charactersIn: "@#$%^&*_=+<>{}[]|\\/~")

    private static func isSuspicious(_ name: String) -> Bool {
        name.unicodeScalars.contains { CharacterSet.decimalDigits.contains($0) || strangeCharacters.contains($0) }
    }

    // MARK: - Phones

    /// `+84` and nine digits for `0…`, `84…`, `+84…` with spaces, dots, dashes or brackets between digits.
    static func normalizedPhone(_ raw: String) -> String? {
        let compact = raw.filter { !$0.isWhitespace && !"-().".contains($0) }
        let digits: Substring
        if compact.hasPrefix("+84") { digits = compact.dropFirst(3) }
        else if compact.hasPrefix("84") { digits = compact.dropFirst(2) }
        else if compact.hasPrefix("0") { digits = compact.dropFirst(1) }
        else { return nil }
        guard digits.count == 9, digits.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
        return "+84" + digits
    }

    /// A cell is phone-like when it keeps eight or more digits (and an optional leading plus) after removing separators.
    static func isPhoneLike(_ cell: String) -> Bool {
        let compact = cell.filter { !$0.isWhitespace && !"-().".contains($0) }
        return matches(compact, "^\\+?\\d{8,}$")
    }

    // MARK: - Lines

    private static func stripSequenceNumber(_ line: String) -> String {
        for pattern in ["^\\d{1,3}\\s*[.):\\-](?!\\d)\\s*", "^\\d{1,3}\\s+(?=\\p{L})"] {
            if let range = line.range(of: pattern, options: .regularExpression) {
                return String(line[range.upperBound...])
            }
        }
        return line
    }

    private static func cells(of line: String) -> [String] {
        let separator: Character?
        if line.contains("\t") { separator = "\t" }
        else if line.contains(";") { separator = ";" }
        else if line.range(of: ",(?!\\d)", options: .regularExpression) != nil { separator = "," }
        else { separator = nil }
        guard let separator else { return [collapse(line)] }
        var parts: [String] = []
        var current = ""
        let characters = Array(line)
        for (index, character) in characters.enumerated() {
            let splits = character == separator
                && !(separator == "," && index + 1 < characters.count && characters[index + 1].isNumber)
            if splits { parts.append(current); current = "" } else { current.append(character) }
        }
        parts.append(current)
        return parts.map(collapse)
    }

    /// "Nguyễn Minh Châu 0911 222 333" → name and trailing phone, when the end of the line holds eight or more digits.
    private static func splitTrailingPhone(_ line: String) -> (name: String, phone: String)? {
        let allowed = Set("0123456789 .-()+")
        var start = line.endIndex
        while start > line.startIndex {
            let previous = line.index(before: start)
            guard allowed.contains(line[previous]) else { break }
            start = previous
        }
        let tail = line[start...].trimmingCharacters(in: CharacterSet(charactersIn: " .-()"))
        guard isPhoneLike(tail) else { return nil }
        return (collapse(String(line[..<start])), tail)
    }

    private static func collapse(_ text: String) -> String {
        text.split(whereSeparator: \.isWhitespace).joined(separator: " ")
    }

    private static func matches(_ text: String, _ pattern: String) -> Bool {
        text.range(of: pattern, options: .regularExpression) != nil
    }
}

/// Vietnamese copy of the import screen, kept out of `Features/` like the other text enums.
enum StudentImportText {
    static let entry = "Nhập danh sách"
    static let title = "Nhập danh sách học sinh"
    static let pasteLabel = "Dán danh sách"
    static let pasteHint = "Mỗi dòng một học sinh: tên và số điện thoại phụ huynh (có thể dán từ Excel hoặc Google Sheets)."
    static let pickFile = "Chọn tệp .csv"
    static let preview = "Xem trước"
    static let back = "Sửa lại danh sách"
    static let needNetwork = "Cần có mạng"
    static let needNetworkHint = "Thêm học sinh cần có mạng. Hãy kết nối rồi thử lại."
    static let nameField = "Họ và tên"
    static let phoneField = "Số điện thoại phụ huynh"
    static let remove = "Bỏ dòng"
    static let edit = "Sửa"
    static let done = "Xong"
    static let addAnyway = "Vẫn thêm"
    static let skipAgain = "Bỏ qua"
    static let noPhone = "Chưa có số điện thoại"
    static let emptyPreview = "Chưa có dòng nào hợp lệ để xem trước."
    static let fileError = "Không đọc được tệp. Hãy chọn tệp .csv dạng chữ."
    static let retryRest = "Thử lại phần còn lại"
    static let finish = "Xong"
    static let stoppedOffline = "Mất mạng, đã dừng. Các em chưa tạo sẽ được thử lại, không tạo trùng."

    static func add(_ count: Int) -> String { "Thêm \(count) học sinh" }
    static func summary(add: Int, skipped: Int, fix: Int) -> String {
        var parts = ["\(add) sẽ thêm"]
        if skipped > 0 { parts.append("\(skipped) bỏ qua") }
        if fix > 0 { parts.append("\(fix) cần sửa") }
        return parts.joined(separator: " · ")
    }
    static func progress(_ done: Int, of total: Int) -> String { "Đã tạo \(done)/\(total)" }
    static func failedCount(_ count: Int) -> String { "\(count) học sinh chưa tạo được" }
    static func under20(total: Int) -> String {
        "Lớp sẽ có \(total) học sinh, ít hơn 20. Bạn vẫn có thể thêm."
    }

    static func label(_ flag: StudentImportRules.Flag) -> String {
        switch flag {
        case .missingName: "Thiếu tên"
        case .invalidPhone: "Số điện thoại sai định dạng"
        case .suspiciousName: "Tên có số hoặc ký tự lạ"
        case .duplicateInPaste: "Trùng dòng trên"
        case .sameNameDifferentPhone: "Trùng tên với em đã có (số khác hoặc chưa có số)"
        }
    }

    static let alreadyInClass = "Đã có trong lớp"
}
