import Foundation

/// Session numbers are computed on the device: the `class_session` snapshot carries no `session_number`.
/// Same rule as the server (`worker/src/db/sessions.ts`): a non-cancelled session is numbered by how many
/// non-cancelled sessions of its class start at or before it; a cancelled session has no number.
/// Ties on `(date, start_time)` are not broken by id, so such sessions share the server's number.
enum SessionNumbering {
    static func numbered(_ sessions: [ClassSession]) -> [ClassSession] {
        var keysByClass: [String: [String]] = [:]
        for session in sessions where session.status != .cancelled {
            keysByClass[session.classId, default: []].append(key(session))
        }
        for classId in keysByClass.keys { keysByClass[classId]?.sort() }
        return sessions.map { session in
            guard session.status != .cancelled, let keys = keysByClass[session.classId] else { return session.withSessionNumber(nil) }
            return session.withSessionNumber(upperBound(of: key(session), in: keys))
        }
    }

    // Date and time are fixed-width ISO strings, so string order is chronological order.
    private static func key(_ session: ClassSession) -> String { session.date + "T" + session.startTime }

    /// Count of sorted `keys` that are `<= value`.
    private static func upperBound(of value: String, in keys: [String]) -> Int {
        var low = 0, high = keys.count
        while low < high {
            let mid = (low + high) / 2
            if keys[mid] <= value { low = mid + 1 } else { high = mid }
        }
        return low
    }
}
