#if DEBUG
import Foundation

extension StaffStore {
    /// Screenshot harness only: synthetic staff, classes and permissions with no network.
    convenience init(demo: Bool) {
        self.init(api: StubAPIClient(baseURL: URL(string: "https://staging.invalid")!))
        func role(_ key: String, _ name: String) -> StaffRoleRef { .init(id: "role_\(key)", name: name, systemKey: key) }
        func member(_ id: String, _ kind: StaffMember.Kind, _ name: String, _ phone: String, _ key: String, _ roleName: String,
                    _ classIds: [String], _ status: StaffMember.Status, isSelf: Bool = false) -> StaffMember {
            StaffMember(id: id, kind: kind, userId: kind == .member ? "usr_\(id)" : nil, displayName: name, phone: phone,
                        role: role(key, roleName), classIds: classIds, status: status, isSelf: isSelf, version: 1)
        }
        let members = [
            member("m1", .member, "Cô Thu Hà", "+84900000001", "admin", "Admin", [], .active, isSelf: true),
            member("m2", .member, "Cô Lan", "+84900000002", "teacher", "Giáo viên", ["c1", "c2"], .active),
            member("m3", .member, "Thầy Minh", "+84900000003", "assistant", "Trợ giảng", ["c1"], .active),
            member("p1", .pending, "Cô Mai", "+84900000004", "assistant", "Trợ giảng", [], .pending),
            member("m4", .member, "Cô Hoa", "+84900000005", "teacher", "Giáo viên", ["c2"], .disabled),
        ]
        let classes = [StaffClass(id: "c1", name: "Tiếng Anh giao tiếp 6A"), StaffClass(id: "c2", name: "Ngữ pháp 7B")]
        let roles = [
            StaffRolePermissions(role: role("teacher", "Giáo viên"),
                                 permissions: StaffPermissionSet(classes: .write, students: .write, sessionsAttendance: .write,
                                                                 scores: .write, commentsReports: .write, sendComments: .write)),
            StaffRolePermissions(role: role("assistant", "Trợ giảng"),
                                 permissions: StaffPermissionSet(classes: .read, students: .read, sessionsAttendance: .write,
                                                                 scores: .read, commentsReports: .write, sendComments: PermissionLevel.none)),
        ]
        seedDemo(members: members, classes: classes, roles: roles)
    }
}
#endif
