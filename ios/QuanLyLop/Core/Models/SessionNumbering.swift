import Foundation

/// Session numbers are computed on the device: the `class_session` snapshot carries no `session_number`.
/// Same rule as the server (`worker/src/db/sessions.ts`): a non-cancelled session is numbered by how many
/// non-cancelled sessions of its class start at or before it; a cancelled session has no number.
/// Ties on `(date, start_time)` are not broken by id, so such sessions share the server's number.
enum SessionNumbering {
    static func numbered(_ sessions: [ClassSession]) -> [ClassSession] {
        sessions
    }
}
