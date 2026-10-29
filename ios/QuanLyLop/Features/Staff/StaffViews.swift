import SwiftUI

// MARK: - Danh sách nhân sự (admin, `MembersPage` của prototype)

enum StaffEditor: Identifiable, Equatable {
    case add
    case edit(StaffMember)
    var id: String {
        switch self { case .add: "add"; case .edit(let member): member.id }
    }
}

enum StaffLabel {
    static func role(_ role: StaffRoleRef) -> String {
        switch role.systemKey {
        case "admin": String(localized: "feature.staff.quan.tri.vien")
        case "teacher": String(localized: "feature.staff.giao.vien")
        case "assistant": String(localized: "feature.staff.tro.giang")
        default: role.name
        }
    }

    static func role(_ key: StaffRoleKey) -> String {
        key == .teacher ? String(localized: "feature.staff.giao.vien") : String(localized: "feature.staff.tro.giang")
    }

    static func status(_ status: StaffMember.Status) -> (text: String, tone: TeacherStatusPill.Tone) {
        switch status {
        case .active: (String(localized: "feature.staff.ang.hoat.ong"), .success)
        case .pending: (String(localized: "feature.staff.cho.dang.nhap"), .warning)
        case .disabled: (String(localized: "feature.staff.a.vo.hieu.hoa"), .neutral)
        }
    }

    static func group(_ group: StaffPermissionGroup) -> String {
        switch group {
        case .classes: String(localized: "feature.staff.lop")
        case .students: String(localized: "feature.staff.hoc.sinh")
        case .sessionsAttendance: String(localized: "feature.staff.buoi.hoc.va.diem.danh")
        case .scores: String(localized: "feature.staff.diem")
        case .commentsReports: String(localized: "feature.staff.nhan.xet.va.bao.cao")
        case .sendComments: SendCommentsText.group
        }
    }

    static func level(_ level: PermissionLevel) -> String {
        switch level {
        case .none: String(localized: "feature.staff.khong")
        case .read: String(localized: "feature.staff.oc")
        case .write: String(localized: "feature.staff.sua")
        }
    }

    static func assignment(_ member: StaffMember) -> String {
        if member.isAdmin { return String(localized: "feature.staff.tat.ca.cac.lop") }
        let count = member.classIds.count
        if count == 0 { return String(localized: "feature.staff.chua.gan.lop") }
        return String.localizedStringWithFormat(String(localized: "feature.staff.so.lop.duoc.gan"), count)
    }
}

struct StaffListView: View {
    let store: StaffStore
    @State private var editor: StaffEditor?

    init(store: StaffStore, initialEditor: StaffEditor? = nil) {
        self.store = store
        _editor = State(initialValue: initialEditor)
    }

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
                NavigationLink {
                    StaffPermissionsView(store: store)
                } label: {
                    permissionsEntry
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("staff.permissions-entry")
                content
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, TeacherMetrics.fabContentInset)
        }
        .background(AppColors.background.ignoresSafeArea())
        .overlay(alignment: .bottomTrailing) {
            Button { editor = .add } label: { TeacherFab(title: String(localized: "feature.staff.them.nhan.su")) }
                .buttonStyle(.plain)
                .accessibilityIdentifier("staff.add")
                .padding(.trailing, TeacherMetrics.fabTrailingInset)
                .padding(.bottom, TeacherMetrics.fabBottomInset)
        }
        .navigationTitle(String(localized: "feature.staff.nhan.su"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await store.load() }
        .refreshable { await store.load() }
        .sheet(item: $editor) { editor in
            StaffFormSheet(store: store, editor: editor) { self.editor = nil }
        }
    }

    private var permissionsEntry: some View {
        AppListRow {
            VStack(alignment: .leading, spacing: AppSpace.s2) {
                Text(String(localized: "feature.staff.phan.quyen")).appText(AppText.subheading).foregroundStyle(AppColors.text)
                Text(String(localized: "feature.staff.quyen.cua.giao.vien.va.tro.giang"))
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").foregroundStyle(AppColors.muted)
        }
    }

    @ViewBuilder private var content: some View {
        if store.members.isEmpty, case .failed(let message) = store.phase {
            TeacherErrorBanner(message: message) { Task { await store.load() } }
        } else if store.members.isEmpty, store.phase != .loaded {
            HStack(spacing: AppSpace.s12) {
                AppSpinner()
                Text(String(localized: "feature.staff.ang.tai.nhan.su")).appText(AppText.body).foregroundStyle(AppColors.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, AppSpace.s24)
        } else {
            if case .failed(let message) = store.phase {
                TeacherErrorBanner(message: message) { Task { await store.load() } }
            }
            Text(String.localizedStringWithFormat(String(localized: "feature.staff.so.nhan.su.dang.hoat.dong"),
                                                  store.members.count, store.activeCount))
                .appText(AppText.muted).foregroundStyle(AppColors.muted)
            VStack(spacing: TeacherMetrics.listGap) {
                ForEach(StaffStore.sorted(store.members)) { member in
                    Button { editor = .edit(member) } label: { row(member) }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("staff.row.\(member.id)")
                }
            }
        }
    }

    private func row(_ member: StaffMember) -> some View {
        let status = StaffLabel.status(member.status)
        return AppListRow {
            StaffAvatar(member: member)
            VStack(alignment: .leading, spacing: AppSpace.s2) {
                HStack(spacing: AppSpace.s8) {
                    if member.isUnnamed {
                        Text(String(localized: "feature.staff.chua.at.ten")).appText(AppText.subheading).foregroundStyle(AppColors.muted)
                    } else {
                        Text(member.displayName).appText(AppText.subheading).foregroundStyle(AppColors.text)
                    }
                    Spacer(minLength: 0)
                    TeacherStatusPill(text: status.text, tone: status.tone)
                }
                Text(StaffStore.maskedPhone(member.phone)).appText(AppText.muted).foregroundStyle(AppColors.muted)
                Text("\(StaffLabel.role(member.role)) · \(StaffLabel.assignment(member))")
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
            }
        }
        .opacity(member.status == .disabled ? AppState.disabledOpacity : 1)
    }
}

// MARK: - Thêm / sửa nhân sự

struct StaffFormSheet: View {
    let store: StaffStore
    let editor: StaffEditor
    let close: () -> Void

    @State private var name = ""
    @State private var phone = ""
    /// Nil only while editing an admin who has not picked a new role.
    @State private var role: StaffRoleKey? = .assistant
    @State private var classIds: Set<String> = []
    @State private var saveController = AppSaveController()
    @State private var actionError: String?
    @State private var confirming = false

    private var member: StaffMember? {
        if case .edit(let member) = editor { member } else { nil }
    }
    private var isPending: Bool { member?.kind == .pending }
    private var isAdmin: Bool { member?.isAdmin ?? false }
    /// An existing account keeps the name it has; only the admin's declaration (add or pending) is editable.
    private var nameEditable: Bool { member == nil || isPending }

    var body: some View {
        TeacherSheet(title: member == nil ? String(localized: "feature.staff.them.nhan.su")
                                          : String(localized: "feature.staff.sua.nhan.su"),
                     content: { form },
                     footer: { footer },
                     detents: [.large],
                     close: close)
        .onAppear(perform: load)
        .confirmationDialog(confirmTitle, isPresented: $confirming, titleVisibility: .visible) {
            Button(confirmAction, role: .destructive) { Task { await toggleStatus() } }
            Button(String(localized: "feature.staff.huy"), role: .cancel) {}
        }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: TeacherMetrics.contentGap) {
            if let error = actionError ?? saveController.error.map(StaffStore.message(for:)) {
                TeacherErrorBanner(message: error)
            }
            if nameEditable {
                TeacherField(label: String(localized: "feature.staff.ten"), text: $name, identifier: "staff.name")
            } else if let member {
                readOnly(String(localized: "feature.staff.ten"),
                         member.isUnnamed ? String(localized: "feature.staff.chua.at.ten") : member.displayName)
            }
            if let member {
                readOnly(String(localized: "feature.staff.so.dien.thoai"), AuthFormat.phone(member.phone))
            } else {
                TeacherField(label: String(localized: "feature.staff.so.dien.thoai"), text: $phone,
                             placeholder: "0900 000 000", keyboard: .phonePad, identifier: "staff.phone")
            }
            VStack(alignment: .leading, spacing: AppSpace.s8) {
                Text(String(localized: "feature.staff.vai.tro")).appText(AppText.label).foregroundStyle(AppColors.text)
                AppSegmented(options: StaffRoleKey.allCases.map { .init(value: $0.rawValue, label: StaffLabel.role($0)) },
                             value: role?.rawValue ?? "") { value in
                    if let key = StaffRoleKey(rawValue: value) { role = key }
                }
                .accessibilityIdentifier("staff.role")
            }
            if !isAdmin { classPicker }
            if let member, !isPending { statusButton(member) }
            if let member, isPending { cancelDeclaration(member) }
        }
        .padding(.bottom, AppSpace.s16)
    }

    private func readOnly(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: AppSpace.s8) {
            Text(label).appText(AppText.label).foregroundStyle(AppColors.text)
            Text(value).appText(AppText.body).foregroundStyle(AppColors.text)
                .padding(.horizontal, AppSpace.s16)
                .frame(maxWidth: .infinity, minHeight: AppMetrics.inputHeight, alignment: .leading)
                .background(AppColors.neutralSoft, in: RoundedRectangle(cornerRadius: AppRadius.control))
        }
    }

    private var classPicker: some View {
        VStack(alignment: .leading, spacing: AppSpace.s8) {
            Text(String(localized: "feature.staff.lop.uoc.gan")).appText(AppText.label).foregroundStyle(AppColors.text)
            if store.classes.isEmpty {
                Text(String(localized: "feature.staff.chua.co.lop.nao")).appText(AppText.muted).foregroundStyle(AppColors.muted)
            } else {
                VStack(alignment: .leading, spacing: AppSpace.s8) {
                    ForEach(store.classes) { klass in
                        Button {
                            if classIds.contains(klass.id) { classIds.remove(klass.id) } else { classIds.insert(klass.id) }
                        } label: {
                            AppChip(title: klass.name, selected: classIds.contains(klass.id))
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("staff.class.\(klass.id)")
                    }
                }
            }
        }
    }

    private func statusButton(_ member: StaffMember) -> some View {
        let disable = member.status == .active
        return AppButton(title: disable ? String(localized: "feature.staff.vo.hieu.hoa") : String(localized: "feature.staff.bat.lai"),
                         variant: disable ? .danger : .secondary, size: .medium) {
            if disable { confirming = true } else { Task { await toggleStatus() } }
        }
        .accessibilityIdentifier("staff.status")
    }

    private func cancelDeclaration(_ member: StaffMember) -> some View {
        AppButton(title: String(localized: "feature.staff.huy.ban.khai"), variant: .danger, size: .medium) {
            confirming = true
        }
        .accessibilityIdentifier("staff.cancel-declaration")
    }

    private var confirmTitle: String {
        isPending ? String(localized: "feature.staff.huy.ban.khai.nhan.su.nay")
                  : String(localized: "feature.staff.vo.hieu.hoa.nhan.su.nay")
    }
    private var confirmAction: String {
        isPending ? String(localized: "feature.staff.huy.ban.khai") : String(localized: "feature.staff.vo.hieu.hoa")
    }

    private var footer: some View {
        AppSaveButton(title: member == nil ? String(localized: "feature.staff.them.nhan.su") : String(localized: "feature.staff.luu"),
                      controller: saveController, isEnabled: canSave, identifier: "staff.save",
                      onSuccess: { close() }) {
            actionError = nil
            if let member {
                _ = try await store.update(member, role: roleChange(member),
                                           classIds: isAdmin ? nil : classChange(member),
                                           displayName: isPending && name.trimmingCharacters(in: .whitespaces) != member.displayName
                                               ? name.trimmingCharacters(in: .whitespaces) : nil)
            } else {
                try await store.add(phone: phone, name: name, role: role ?? .assistant, classIds: orderedClassIds)
            }
        }
    }

    private var canSave: Bool {
        if member == nil { return !name.trimmingCharacters(in: .whitespaces).isEmpty && !phone.isEmpty }
        return !(nameEditable && name.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    private var orderedClassIds: [String] { store.classes.map(\.id).filter(classIds.contains) }

    private func roleChange(_ member: StaffMember) -> StaffRoleKey? { role == member.roleKey ? nil : role }

    /// The assigned set is replaced as a whole, so it is sent only when the picker changed it.
    private func classChange(_ member: StaffMember) -> [String]? {
        Set(member.classIds) == classIds ? nil : orderedClassIds + classIds.subtracting(store.classes.map(\.id)).sorted()
    }

    private func load() {
        guard let member else { return }
        name = member.displayName
        role = member.roleKey
        classIds = Set(member.classIds)
    }

    private func toggleStatus() async {
        guard let member else { return }
        actionError = nil
        do {
            if isPending { try await store.deletePending(member) }
            else { _ = try await store.update(member, status: member.status == .active ? "disabled" : "active") }
            close()
        } catch {
            actionError = StaffStore.message(for: error)
        }
    }
}

// MARK: - Ma trận quyền của Giáo viên và Trợ giảng

struct StaffPermissionsView: View {
    let store: StaffStore
    @State private var error: String?

    var body: some View {
        TeacherScroll {
            VStack(alignment: .leading, spacing: AppMetrics.sectionGap) {
                Text(String(localized: "feature.staff.quan.tri.vien.luon.co.moi.quyen"))
                    .appText(AppText.muted).foregroundStyle(AppColors.muted)
                if let error { TeacherErrorBanner(message: error) }
                if store.roles.isEmpty, case .failed(let message) = store.permissionsPhase {
                    TeacherErrorBanner(message: message) { Task { await store.loadPermissions() } }
                } else if store.roles.isEmpty, store.permissionsPhase != .loaded {
                    HStack(spacing: AppSpace.s12) {
                        AppSpinner()
                        Text(String(localized: "feature.staff.ang.tai.quyen")).appText(AppText.body).foregroundStyle(AppColors.muted)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, AppSpace.s24)
                } else {
                    ForEach(store.roles) { role in roleSection(role) }
                }
            }
            .padding(.horizontal, TeacherMetrics.screenPaddingHorizontal)
            .padding(.top, TeacherMetrics.screenPaddingTop)
            .padding(.bottom, TeacherMetrics.contentGap * 2)
        }
        .background(AppColors.background.ignoresSafeArea())
        .navigationTitle(String(localized: "feature.staff.phan.quyen"))
        .navigationBarTitleDisplayMode(.inline)
        .task { await store.loadPermissions() }
        .refreshable { await store.loadPermissions() }
    }

    private func roleSection(_ role: StaffRolePermissions) -> some View {
        AppSection(title: StaffLabel.role(role.role)) {
            VStack(spacing: TeacherMetrics.listGap) {
                ForEach(StaffPermissionGroup.allCases) { group in
                    VStack(alignment: .leading, spacing: AppSpace.s8) {
                        Text(StaffLabel.group(group)).appText(AppText.label).foregroundStyle(AppColors.text)
                        if group == .sendComments {
                            Text(SendCommentsText.hint).appText(AppText.muted).foregroundStyle(AppColors.muted)
                        }
                        AppSegmented(options: group.levels.map { .init(value: $0.rawValue, label: StaffLabel.level($0)) },
                                     value: (role.permissions[group] ?? .none).rawValue) { value in
                            guard let key = role.roleKey, let level = PermissionLevel(rawValue: value) else { return }
                            Task { await set(key, group, level) }
                        }
                        .accessibilityIdentifier("staff.permission.\(role.role.systemKey ?? "").\(group.rawValue)")
                    }
                    .padding(TeacherMetrics.cardPadding)
                    .background(AppColors.surface, in: RoundedRectangle(cornerRadius: AppRadius.card))
                }
            }
        }
    }

    private func set(_ key: StaffRoleKey, _ group: StaffPermissionGroup, _ level: PermissionLevel) async {
        error = nil
        do { try await store.setLevel(key, group: group, level: level) }
        catch { self.error = StaffStore.message(for: error) }
    }
}

/// Owns the store for the Nhân sự pages so rebuilding Cài đặt does not reload the list.
struct StaffEntryView: View {
    @State private var store: StaffStore

    init(model: AuthModel) { _store = State(initialValue: model.makeStaffStore()) }

    var body: some View { StaffListView(store: store) }
}

/// Initials for a named member; a person glyph when the account never set a name.
private struct StaffAvatar: View {
    let member: StaffMember

    var body: some View {
        if member.isUnnamed {
            Image(systemName: "person.fill")
                .foregroundStyle(AppColors.muted)
                .frame(width: AppMetrics.tap - AppSpace.s4, height: AppMetrics.tap - AppSpace.s4)
                .background(AppColors.primarySoft, in: Circle())
                .accessibilityHidden(true)
        } else {
            TeacherAvatar(name: member.displayName)
        }
    }
}
