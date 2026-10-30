import Foundation
import Observation

/// Admin-only staff and role-permission calls (api-spec mục 11). Every call needs the network: nothing here is queued.
@MainActor
@Observable
final class StaffStore {
    enum Phase: Equatable { case idle, loading, loaded, failed(String) }

    private(set) var members: [StaffMember] = []
    private(set) var classes: [StaffClass] = []
    private(set) var roles: [StaffRolePermissions] = []
    private(set) var phase: Phase = .idle
    private(set) var permissionsPhase: Phase = .idle

    private let api: any APIClient
    private(set) var isDemo = false
    private var permissionTail: Task<Void, Never>?
    /// Called after a change that may alter the signed-in admin's own role or status, so the app rereads `/me`.
    private let didChangeSelf: @MainActor () async -> Void

    init(api: any APIClient, didChangeSelf: @escaping @MainActor () async -> Void = {}) {
        self.api = api
        self.didChangeSelf = didChangeSelf
    }

    var activeCount: Int { members.filter { $0.status == .active }.count }

    func className(_ id: String) -> String? { classes.first { $0.id == id }?.name }

    func load() async {
        guard !isDemo else { return }
        phase = .loading
        do {
            members = try await api.send(.init(method: .get, path: "staff"), as: StaffList.self).items
            // The class picker is optional: staff can still be listed and edited when the class list fails.
            classes = (try? await api.send(.init(method: .get, path: "classes", query: ["status": "active"]),
                                           as: StaffClassList.self).items) ?? classes
            phase = .loaded
        } catch {
            phase = .failed(Self.message(for: error))
        }
    }

    @discardableResult
    func add(phone: String, name: String, role: StaffRoleKey, classIds: [String]) async throws -> StaffMember {
        guard let domestic = AuthFormat.normalizedPhone(phone) else { throw StaffInputError.invalidPhone }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw StaffInputError.missingName }
        let body = AddStaffRequest(phone: domestic, displayName: trimmed, role: role, classIds: classIds)
        let member = try await api.send(try .json(method: .post, path: "staff", body: body), as: StaffMember.self)
        merge(member)
        return member
    }

    @discardableResult
    func update(_ member: StaffMember, role: StaffRoleKey? = nil, classIds: [String]? = nil,
                status: String? = nil, displayName: String? = nil) async throws -> StaffMember {
        let body = UpdateStaffRequest(role: role, classIds: classIds, status: status, displayName: displayName,
                                      baseVersion: member.version)
        let updated = try await api.send(try .json(method: .patch, path: "staff/\(member.id)", body: body),
                                         as: StaffMember.self)
        merge(updated)
        if member.isSelf { await didChangeSelf() }
        return updated
    }

    func deletePending(_ member: StaffMember) async throws {
        _ = try await api.send(.init(method: .delete, path: "staff/\(member.id)"), as: EmptyResponse.self)
        members.removeAll { $0.id == member.id }
    }

    func loadPermissions() async {
        guard !isDemo else { return }
        permissionsPhase = .loading
        do {
            roles = try await api.send(.init(method: .get, path: "roles/permissions"),
                                       as: StaffRolePermissionsList.self).items
            permissionsPhase = .loaded
        } catch {
            permissionsPhase = .failed(Self.message(for: error))
        }
    }

    func setLevel(_ key: StaffRoleKey, group: StaffPermissionGroup, level: PermissionLevel) async throws {
        var change = StaffPermissionSet()
        change[group] = level
        let body = UpdatePermissionsRequest(permissions: change)
        let path = "roles/\(key.rawValue)/permissions"
        let request = try APIEndpoint.json(method: .put, path: path, body: body)
        // Taps run one after another, so the last response is always the newest server state.
        let previous = permissionTail
        let call = Task { @MainActor in
            _ = await previous?.value
            return try await api.send(request, as: StaffRolePermissions.self)
        }
        permissionTail = Task { _ = try? await call.value }
        let updated = try await call.value
        if let index = roles.firstIndex(where: { $0.roleKey == key }) { roles[index] = updated } else { roles.append(updated) }
    }

    private func merge(_ member: StaffMember) {
        if let index = members.firstIndex(where: { $0.id == member.id }) { members[index] = member }
        else { members.append(member) }
    }

    static func sorted(_ members: [StaffMember]) -> [StaffMember] {
        func rank(_ status: StaffMember.Status) -> Int {
            switch status { case .active: 0; case .pending: 1; case .disabled: 2 }
        }
        return members.sorted {
            (rank($0.status), $0.isUnnamed ? 1 : 0, $0.displayName.localizedLowercase)
                < (rank($1.status), $1.isUnnamed ? 1 : 0, $1.displayName.localizedLowercase)
        }
    }

    /// "+84 900 000 007" becomes "+84 900 ••• 007": the list shows only part of the number.
    nonisolated static func maskedPhone(_ raw: String) -> String {
        let digits = AuthFormat.national(raw)
        guard digits.count == 9 else { return raw }
        return "+84 \(digits.prefix(3)) ••• \(digits.suffix(3))"
    }

    /// The 422 text for the name field, or nil when the failure is about something else.
    static func nameError(for error: Error) -> String? {
        guard let failure = error as? APIFailure, case .server(422, let detail, _) = failure else { return nil }
        switch detail.details?["fields"]?["display_name"]?.string {
        case "required": return String(localized: "feature.staff.vui.long.nhap.ten")
        case "must_be_at_most_100": return String(localized: "feature.staff.ten.toi.a.100.ky.tu")
        default: return nil
        }
    }

    static func message(for error: Error) -> String {
        if let input = error as? StaffInputError {
            switch input {
            case .invalidPhone: return String(localized: "feature.staff.so.dien.thoai.chua.dung")
            case .missingName: return String(localized: "feature.staff.vui.long.nhap.ten")
            }
        }
        guard let failure = error as? APIFailure else { return String(localized: "feature.staff.khong.the.ket.noi.dich.vu") }
        switch failure {
        case .offline, .missingToken, .invalidURL:
            return String(localized: "feature.staff.can.ket.noi.mang.de.thuc.hien")
        case .server(let status, let detail, _):
            let reason = detail.details?["reason"]?.string
            switch (status, reason ?? detail.code) {
            case (409, "staff_exists"): return String(localized: "feature.staff.so.nay.da.la.nhan.su.cua.lop")
            case (409, "last_admin"): return String(localized: "feature.staff.phai.con.it.nhat.mot.quan.tri.vien")
            case (409, "role_not_editable"): return String(localized: "feature.staff.vai.tro.nay.khong.chinh.duoc")
            case (409, "not_pending"): return String(localized: "feature.staff.nguoi.nay.da.co.tai.khoan")
            case (409, "version_conflict"): return String(localized: "feature.staff.du.lieu.da.thay.doi.tai.lai.va.thu.lai")
            case (403, "admin_required"): return String(localized: "feature.staff.chi.quan.tri.vien.moi.lam.duoc")
            case (404, _): return String(localized: "feature.staff.khong.tim.thay.nhan.su.nay")
            case (422, _):
                switch detail.details?["fields"]?["phone"]?.string {
                case "invalid_phone": return String(localized: "feature.staff.so.dien.thoai.chua.dung")
                default: return String(localized: "feature.staff.thong.tin.chua.hop.le")
                }
            default: return detail.localizedMessage
            }
        case .decoding:
            return String(localized: "feature.staff.du.lieu.nhan.su.khong.doc.duoc")
        default:
            return String(localized: "feature.staff.khong.the.ket.noi.dich.vu")
        }
    }
}

enum StaffInputError: Error, Equatable { case invalidPhone, missingName }

enum StaffNameRules {
    static let maxLength = 100
}

#if DEBUG
extension StaffStore {
    /// Screenshot harness only: loads synthetic data with no network.
    func seedDemo(members: [StaffMember], classes: [StaffClass], roles: [StaffRolePermissions]) {
        self.members = members
        self.classes = classes
        self.roles = roles
        phase = .loaded
        permissionsPhase = .loaded
        isDemo = true
    }
}
#endif
