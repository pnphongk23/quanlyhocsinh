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

    private enum CodingKeys: String, CodingKey {
        case id, kind, userId, displayName, phone, role, classIds, status, isSelf, version
    }

    let id: String
    let kind: Kind
    let userId: String?
    /// Empty when the server sends `null`: an account that never set a name (`isUnnamed`).
    let displayName: String
    let phone: String
    let role: StaffRoleRef
    let classIds: [String]
    let status: Status
    let isSelf: Bool
    let version: Int?

    var isUnnamed: Bool { displayName.isEmpty }
    var isAdmin: Bool { role.systemKey == "admin" }
    var roleKey: StaffRoleKey? { role.systemKey.flatMap(StaffRoleKey.init(rawValue:)) }
}

extension StaffMember {
    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        id = try values.decode(String.self, forKey: .id)
        kind = try values.decode(Kind.self, forKey: .kind)
        userId = try values.decodeIfPresent(String.self, forKey: .userId)
        phone = try values.decode(String.self, forKey: .phone)
        displayName = try values.decodeIfPresent(String.self, forKey: .displayName)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        role = try values.decode(StaffRoleRef.self, forKey: .role)
        classIds = try values.decodeIfPresent([String].self, forKey: .classIds) ?? []
        status = try values.decode(Status.self, forKey: .status)
        isSelf = try values.decodeIfPresent(Bool.self, forKey: .isSelf) ?? false
        version = try values.decodeIfPresent(Int.self, forKey: .version)
    }
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

/// The permission groups an admin can set for the teacher and assistant roles: five with features, then
/// "Gửi nhận xét", which only takes none or write.
enum StaffPermissionGroup: String, CaseIterable, Sendable, Identifiable {
    case classes, students, sessionsAttendance = "sessions_attendance", scores, commentsReports = "comments_reports"
    case sendComments = "send_comments"
    var id: String { rawValue }

    /// Levels the admin can pick for this group.
    var levels: [PermissionLevel] { self == .sendComments ? [.none, .write] : [.none, .read, .write] }
}

struct StaffPermissionSet: Codable, Sendable, Equatable {
    var classes: PermissionLevel?
    var students: PermissionLevel?
    var sessionsAttendance: PermissionLevel?
    var scores: PermissionLevel?
    var commentsReports: PermissionLevel?
    var sendComments: PermissionLevel?

    subscript(group: StaffPermissionGroup) -> PermissionLevel? {
        get {
            switch group {
            case .classes: classes
            case .students: students
            case .sessionsAttendance: sessionsAttendance
            case .scores: scores
            case .commentsReports: commentsReports
            case .sendComments: sendComments
            }
        }
        set {
            switch group {
            case .classes: classes = newValue
            case .students: students = newValue
            case .sessionsAttendance: sessionsAttendance = newValue
            case .scores: scores = newValue
            case .commentsReports: commentsReports = newValue
            case .sendComments: sendComments = newValue
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
