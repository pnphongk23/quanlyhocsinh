import Foundation

/// The two roles an admin can add staff under and whose permissions can be edited (api-spec mục 11).
enum StaffRoleKey: String, Codable, Sendable, CaseIterable {
    case teacher, assistant
}

struct StaffRoleRef: Codable, Sendable, Equatable {
    let id: String
    let name: String
    let systemKey: String?
}

struct StaffMember: Codable, Sendable, Equatable, Identifiable {
    enum Kind: String, Codable, Sendable { case member, pending }
    enum Status: String, Codable, Sendable { case active, disabled, pending }

    let id: String
    let kind: Kind
    let userId: String?
    let displayName: String
    let phone: String
    let role: StaffRoleRef
    let classIds: [String]
    let status: Status
    let isSelf: Bool
    let version: Int?

    var isAdmin: Bool { role.systemKey == "admin" }
    var roleKey: StaffRoleKey? { role.systemKey.flatMap(StaffRoleKey.init(rawValue:)) }
}

struct StaffList: Decodable, Sendable { let items: [StaffMember] }

struct StaffClass: Decodable, Sendable, Equatable, Identifiable {
    let id: String
    let name: String
}

struct StaffClassList: Decodable, Sendable { let items: [StaffClass] }

struct AddStaffRequest: Encodable, Sendable {
    let phone: String
    let displayName: String
    let role: StaffRoleKey
    let classIds: [String]
}

/// Only the fields that changed are sent (`nil` is omitted from the JSON).
struct UpdateStaffRequest: Encodable, Sendable {
    var role: StaffRoleKey?
    var classIds: [String]?
    var status: String?
    var displayName: String?
    var baseVersion: Int?
}

/// The five permission groups an admin can set for the teacher and assistant roles.
enum StaffPermissionGroup: String, CaseIterable, Sendable, Identifiable {
    case classes, students, sessionsAttendance = "sessions_attendance", scores, commentsReports = "comments_reports"
    var id: String { rawValue }
}

struct StaffPermissionSet: Codable, Sendable, Equatable {
    var classes: PermissionLevel?
    var students: PermissionLevel?
    var sessionsAttendance: PermissionLevel?
    var scores: PermissionLevel?
    var commentsReports: PermissionLevel?

    subscript(group: StaffPermissionGroup) -> PermissionLevel? {
        get {
            switch group {
            case .classes: classes
            case .students: students
            case .sessionsAttendance: sessionsAttendance
            case .scores: scores
            case .commentsReports: commentsReports
            }
        }
        set {
            switch group {
            case .classes: classes = newValue
            case .students: students = newValue
            case .sessionsAttendance: sessionsAttendance = newValue
            case .scores: scores = newValue
            case .commentsReports: commentsReports = newValue
            }
        }
    }
}

struct StaffRolePermissions: Decodable, Sendable, Equatable, Identifiable {
    let role: StaffRoleRef
    var permissions: StaffPermissionSet
    var id: String { role.id }
    var roleKey: StaffRoleKey? { role.systemKey.flatMap(StaffRoleKey.init(rawValue:)) }
}

struct StaffRolePermissionsList: Decodable, Sendable { let items: [StaffRolePermissions] }

struct UpdatePermissionsRequest: Encodable, Sendable { let permissions: StaffPermissionSet }
