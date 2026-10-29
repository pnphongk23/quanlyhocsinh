import Foundation

/// Pure rules of "Nhập từ ghi chú": lines such as `reason: name, name` become slip changes for the students of one
/// session. No network, storage or logging; the same file `golden-notes-cases.json` drives the web and iOS tests.
enum NotesImportRules {
    /// Criterion keys in bit order (bit 0 ... bit 4 of a slip's criteria).
    static let criterionKeys = ["attention", "notes", "participation", "order", "homework"]
    static let homeworkIndex = 4

    enum Attendance: String, Sendable { case present, late, absent, notMarked = "not_marked" }
    enum Enrollment: String, Sendable { case active, left, notEnrolledYet = "not_enrolled_yet" }
    enum SlipState: String, Sendable { case draft, sent, queuedSend = "queued_send" }

    struct SlipInfo: Equatable, Sendable {
        var state: SlipState
        var isLegacy: Bool
        /// Criteria not met right now, as bits.
        var unmetMask: Int
        var note: String
    }

    struct Student: Equatable, Sendable {
        var id: String
        var fullName: String
        var attendance: Attendance
        var enrollment: Enrollment
        var slip: SlipInfo?
        /// Last session's homework leaves the homework criterion unmet (used for a slip that does not exist yet).
        var homeworkNotDone: Bool
    }

    struct Options: Equatable, Sendable {
        var includePraise = false
        var includeSent = false
        var createDefaultsForRest = false
    }

    enum Tier: String, Codable, Sendable { case t1 = "T1", t2 = "T2", t3 = "T3", t4 = "T4" }
    enum NameStatus: String, Codable, Sendable {
        case matched, ambiguous, excluded, unmatched, wholeClass = "whole_class", held
    }
    enum NameReason: String, Codable, Sendable { case left, notEnrolledYet = "not_enrolled_yet", noMatch = "no_match" }
    enum LineFlag: String, Codable, Sendable {
        case needsReview = "needs_review", multiCriteria = "multi_criteria", praise, wholeClass = "whole_class"
    }
    enum SkipReason: String, Codable, Sendable {
        case legacyScale = "legacy_scale", sentSlip = "sent_slip", queuedSend = "queued_send"
        case praiseNotApplied = "praise_not_applied", noChange = "no_change", absent
    }

    struct NameMatch: Equatable, Encodable, Sendable {
        var raw: String
        var status: NameStatus
        var studentIds: [String]
        var tier: Tier?
        var reason: NameReason?
        var warnings: [String]?
    }

    struct Line: Equatable, Encodable, Sendable {
        var phrase: String
        /// Index into `criterionKeys`.
        var criterion: Int?
        var flags: [LineFlag]
        var names: [NameMatch]

        enum CodingKeys: String, CodingKey { case phrase, criterion, flags, names }
        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(phrase, forKey: .phrase)
            if let criterion { try container.encode(criterionKeys[criterion], forKey: .criterion) }
            else { try container.encodeNil(forKey: .criterion) }
            try container.encode(flags, forKey: .flags)
            try container.encode(names, forKey: .names)
        }
    }

    struct Change: Equatable, Encodable, Sendable {
        var studentId: String
        var slipState: String
        var isNewSlip: Bool
        /// Criteria the text asks to mark as not met, as bits (some may already be unmet on an existing slip).
        var uncheckMask: Int
        var appendNote: [String]
        var hwManual: Bool
        var uncheckedAfterMask: Int

        var starsAfter: Int { SlipRules.criteriaCount - uncheckedAfterMask.nonzeroBitCount }

        enum CodingKeys: String, CodingKey {
            case studentId, slipState, isNewSlip, uncheck, appendNote, hwManual, uncheckedAfter, starsAfter
        }
        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(studentId, forKey: .studentId)
            try container.encode(slipState, forKey: .slipState)
            try container.encode(isNewSlip, forKey: .isNewSlip)
            try container.encode(keys(uncheckMask), forKey: .uncheck)
            try container.encode(appendNote, forKey: .appendNote)
            try container.encode(hwManual, forKey: .hwManual)
            try container.encode(keys(uncheckedAfterMask), forKey: .uncheckedAfter)
            try container.encode(starsAfter, forKey: .starsAfter)
        }
    }

    struct Skipped: Equatable, Encodable, Sendable {
        var studentId: String
        var reason: SkipReason
    }

    struct DefaultSlip: Equatable, Encodable, Sendable {
        var studentId: String
        var uncheckedAfterMask: Int
        var starsAfter: Int { SlipRules.criteriaCount - uncheckedAfterMask.nonzeroBitCount }

        enum CodingKeys: String, CodingKey { case studentId, uncheckedAfter, starsAfter }
        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode(studentId, forKey: .studentId)
            try container.encode(keys(uncheckedAfterMask), forKey: .uncheckedAfter)
            try container.encode(starsAfter, forKey: .starsAfter)
        }
    }

    struct Result: Equatable, Encodable, Sendable {
        var lines: [Line]
        var unparsedLines: [String]
        var changes: [Change]
        var skipped: [Skipped]
        var warnings: [String]
        var defaultSlips: [DefaultSlip]?
        var defaultSlipsDeferred: [String]?
        var defaultSlipsSkipped: [Skipped]?
    }

    private static func keys(_ mask: Int) -> [String] {
        criterionKeys.enumerated().filter { mask & (1 << $0.offset) != 0 }.map(\.element)
    }

    // MARK: - Dictionary (high confidence only)

    private static let dictionary: [(criterion: Int, phrases: [String])] = [
        (0, ["mat tap trung", "khong chu y", "lo dang", "chua chu y"]),
        (3, ["noi chuyen rieng", "lam on", "dua nghich", "mat trat tu"]),
        (4, ["chua hoan thanh bai tap", "chua hoan thanh btvn", "khong lam bai tap", "khong lam btvn",
             "chua lam bai tap", "chua lam btvn"]),
    ]
    private static let praiseKeywords = ["phat bieu", "hang hai", "tien bo", "xuat sac", "rat tot", "lam tot"]
    private static let negationWords: Set<String> = ["khong", "chua", "it"]
    private static let wholeClassKeywords = ["ca lop", "tat ca", "con lai", "hau het"]

    // MARK: - Text helpers

    /// No diacritics, lower case, đ as d, every other non-letter and non-digit a space, spaces collapsed.
    static func normalize(_ text: String) -> String {
        var result = ""
        for scalar in text.decomposedStringWithCanonicalMapping.unicodeScalars {
            if scalar.properties.generalCategory == .nonspacingMark { continue }
            let character = Character(scalar).lowercased()
            let mapped = character == "đ" ? "d" : character
            if mapped.allSatisfy({ $0.isLetter || $0.isNumber }) { result += mapped } else { result += " " }
        }
        return words(result).joined(separator: " ")
    }

    private static func words(_ text: String) -> [String] { text.split(whereSeparator: \.isWhitespace).map(String.init) }

    private static func collapse(_ text: String) -> String { words(text).joined(separator: " ") }

    private static func levenshtein(_ a: [Character], _ b: [Character]) -> Int {
        var previous = Array(0...b.count)
        for (i, ca) in a.enumerated() {
            var current = [i + 1]
            for (j, cb) in b.enumerated() {
                current.append(min(previous[j + 1] + 1, current[j] + 1, previous[j] + (ca == cb ? 0 : 1)))
            }
            previous = current
        }
        return previous[b.count]
    }

    /// "Quên mang vở" -> "Quên mang vở."; a phrase already ending in . ! ? keeps it.
    private static func sentence(_ phrase: String) -> String {
        var text = collapse(phrase)
        if let first = text.first { text = first.uppercased() + text.dropFirst() }
        if let last = text.last, !".!?".contains(last) { text += "." }
        return text
    }

    // MARK: - Analyse

    static func analyze(_ text: String, students: [Student], options: Options = Options()) -> Result {
        var lines: [Line] = []
        var unparsed: [String] = []
        for raw in text.precomposedStringWithCanonicalMapping.replacingOccurrences(of: "\r", with: "\n")
            .split(separator: "\n", omittingEmptySubsequences: false) {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty else { continue }
            guard let colon = line.firstIndex(of: ":") else { unparsed.append(line); continue }
            let phrase = collapse(String(line[..<colon]))
            guard !phrase.isEmpty else { unparsed.append(line); continue }
            lines.append(parseLine(phrase: phrase, names: String(line[line.index(after: colon)...]), students: students))
        }

        var warnings: [String] = []
        if lines.contains(where: { $0.flags.contains(.wholeClass) }) { warnings.append("whole_class") }
        if !unparsed.isEmpty { warnings.append("unparsed_lines") }

        let (changes, skipped) = buildChanges(lines: lines, students: students, options: options)
        var result = Result(lines: lines, unparsedLines: unparsed, changes: changes, skipped: skipped, warnings: warnings)
        if options.createDefaultsForRest {
            let defaults = buildDefaults(lines: lines, changes: changes, students: students)
            result.defaultSlips = defaults.slips
            result.defaultSlipsDeferred = defaults.deferred
            result.defaultSlipsSkipped = defaults.skipped
        }
        return result
    }

    private static func parseLine(phrase: String, names: String, students: [Student]) -> Line {
        let normalizedPhrase = normalize(phrase)
        var criteria = Set<Int>()
        for entry in dictionary where entry.phrases.contains(where: { normalizedPhrase.contains($0) }) {
            criteria.insert(entry.criterion)
        }
        var criterion: Int?
        var flags: [LineFlag] = []
        if criteria.count == 1 { criterion = criteria.first }
        else if criteria.count > 1 { flags = [.multiCriteria, .needsReview] }
        else if praiseKeywords.contains(where: { normalizedPhrase.contains($0) })
                    && Set(words(normalizedPhrase)).isDisjoint(with: negationWords) {
            flags = [.praise]
        } else {
            flags = [.needsReview]
        }

        let items = splitNames(names)
        let isWholeClass = items.contains { item in
            let key = normalize(item)
            return wholeClassKeywords.contains { key.contains($0) }
        }
        var matches: [NameMatch] = []
        if isWholeClass {
            flags.append(.wholeClass)
            for item in items {
                let key = normalize(item)
                let whole = wholeClassKeywords.contains { key.contains($0) }
                matches.append(NameMatch(raw: item, status: whole ? .wholeClass : .held, studentIds: []))
            }
        } else {
            matches = items.map { match($0, students: students) }
        }
        return Line(phrase: phrase, criterion: criterion, flags: flags, names: matches)
    }

    private static func splitNames(_ text: String) -> [String] {
        let joined = text.replacingOccurrences(of: "\\s+và\\s+", with: ",", options: [.regularExpression, .caseInsensitive])
        return joined.split(whereSeparator: { ",;/".contains($0) }).map { collapse(String($0)) }.filter { !$0.isEmpty }
    }

    // MARK: Name matching

    private static func candidates(_ query: String, in pool: [Student]) -> (tier: Tier, found: [Student])? {
        let queryWords = words(query)
        guard !queryWords.isEmpty else { return nil }
        let normalized = pool.map { (student: $0, words: words(normalize($0.fullName))) }
        let t1 = normalized.filter { $0.words == queryWords }.map(\.student)
        if !t1.isEmpty { return (.t1, t1) }
        if queryWords.count == 1 {
            let t2 = normalized.filter { $0.words.last == queryWords[0] }.map(\.student)
            if !t2.isEmpty { return (.t2, t2) }
        } else {
            let t3 = normalized.filter { entry in
                guard entry.words.count >= queryWords.count else { return false }
                return (0...(entry.words.count - queryWords.count)).contains {
                    Array(entry.words[$0..<($0 + queryWords.count)]) == queryWords
                }
            }.map(\.student)
            if !t3.isEmpty { return (.t3, t3) }
        }
        if queryWords.count == 1, queryWords[0].count >= 4 {
            let query = Array(queryWords[0])
            let t4 = normalized.filter { entry in
                guard let given = entry.words.last else { return false }
                return levenshtein(query, Array(given)) == 1
            }.map(\.student)
            if !t4.isEmpty { return (.t4, t4) }
        }
        return nil
    }

    private static func match(_ raw: String, students: [Student]) -> NameMatch {
        let query = normalize(raw)
        if let hit = candidates(query, in: students.filter { $0.enrollment == .active }) {
            if hit.found.count == 1, let student = hit.found.first {
                return NameMatch(raw: raw, status: .matched, studentIds: [student.id], tier: hit.tier,
                                 warnings: student.attendance == .absent ? ["absent"] : nil)
            }
            return NameMatch(raw: raw, status: .ambiguous, studentIds: hit.found.map(\.id), tier: hit.tier)
        }
        if let hit = candidates(query, in: students.filter { $0.enrollment != .active }), let first = hit.found.first {
            return NameMatch(raw: raw, status: .excluded, studentIds: hit.found.map(\.id),
                             reason: first.enrollment == .left ? .left : .notEnrolledYet)
        }
        return NameMatch(raw: raw, status: .unmatched, studentIds: [], reason: .noMatch)
    }

    // MARK: Changes

    private struct Collected {
        var requested = 0
        var notes: [String] = []
        var praiseIgnored = false
    }

    private static func buildChanges(lines: [Line], students: [Student], options: Options) -> ([Change], [Skipped]) {
        var collected: [String: Collected] = [:]
        var existingNotes: [String: String] = [:]
        for student in students { existingNotes[student.id] = normalize(student.slip?.note ?? "") }
        var seenNotes: [String: [String]] = [:]

        for line in lines where !line.flags.contains(.wholeClass) {
            var seenInLine = Set<String>()
            for name in line.names where name.status == .matched {
                guard let id = name.studentIds.first, seenInLine.insert(id).inserted else { continue }
                var entry = collected[id] ?? Collected()
                if let criterion = line.criterion { entry.requested |= 1 << criterion }
                else if line.flags.contains(.praise) && !options.includePraise { entry.praiseIgnored = true }
                else {
                    let text = sentence(line.phrase)
                    let key = normalize(text)
                    let haystack = ([existingNotes[id] ?? ""] + (seenNotes[id] ?? [])).joined(separator: " ")
                    if !haystack.contains(key) {
                        entry.notes.append(text)
                        seenNotes[id, default: []].append(key)
                    }
                }
                collected[id] = entry
            }
        }

        var changes: [Change] = []
        var skipped: [Skipped] = []
        for student in students.sorted(by: { $0.id < $1.id }) {
            guard let entry = collected[student.id] else { continue }
            if let slip = student.slip {
                if slip.isLegacy { skipped.append(Skipped(studentId: student.id, reason: .legacyScale)); continue }
                if slip.state != .draft && !options.includeSent {
                    skipped.append(Skipped(studentId: student.id, reason: slip.state == .sent ? .sentSlip : .queuedSend))
                    continue
                }
            }
            let base = student.slip?.unmetMask ?? (student.homeworkNotDone ? 1 << homeworkIndex : 0)
            let uncheck = entry.requested
            let isNew = student.slip == nil
            guard entry.requested & ~base != 0 || !entry.notes.isEmpty || (isNew && entry.requested != 0) else {
                let onlyPraise = entry.praiseIgnored && entry.requested == 0
                skipped.append(Skipped(studentId: student.id, reason: onlyPraise ? .praiseNotApplied : .noChange))
                continue
            }
            changes.append(Change(studentId: student.id, slipState: student.slip?.state.rawValue ?? "none",
                                  isNewSlip: isNew, uncheckMask: uncheck, appendNote: entry.notes,
                                  hwManual: entry.requested & (1 << homeworkIndex) != 0,
                                  uncheckedAfterMask: base | entry.requested))
        }
        return (changes, skipped)
    }

    private static func buildDefaults(lines: [Line], changes: [Change], students: [Student])
        -> (slips: [DefaultSlip], deferred: [String], skipped: [Skipped]) {
        let changed = Set(changes.map(\.studentId))
        var ambiguous = Set<String>()
        for line in lines { for name in line.names where name.status == .ambiguous { ambiguous.formUnion(name.studentIds) } }
        var slips: [DefaultSlip] = []
        var deferred: [String] = []
        var skipped: [Skipped] = []
        for student in students.sorted(by: { $0.id < $1.id })
        where student.enrollment == .active && student.slip == nil && !changed.contains(student.id) {
            if student.attendance == .absent { skipped.append(Skipped(studentId: student.id, reason: .absent)) }
            else if ambiguous.contains(student.id) { deferred.append(student.id) }
            else { slips.append(DefaultSlip(studentId: student.id, uncheckedAfterMask: student.homeworkNotDone ? 1 << homeworkIndex : 0)) }
        }
        return (slips, deferred, skipped)
    }
}
