import type {
  Member,
  PermissionGroup,
  PermissionLevel,
  Role,
  RoleKind,
} from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requireOnline } from "./helpers";
import { isAdmin } from "./access";
import {
  emptyPermissions,
  GUARDIAN_GROUP_IDS,
  PERMISSION_GROUP_IDS,
} from "../defaults";

function requireAdmin(): void {
  if (!isAdmin()) throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

function requireRole(id: string): Role {
  const role = getStore().roles.find((item) => item.id === id);
  if (!role) throw new Error("Không tìm thấy vai trò.");
  return role;
}

function requireMember(id: string): Member {
  const member = getStore().members.find((item) => item.id === id);
  if (!member) throw new Error("Không tìm thấy thành viên.");
  return member;
}

function activeAdminCount(): number {
  const state = getStore();
  const adminRoleIds = new Set(
    state.roles.filter((role) => role.system).map((role) => role.id),
  );
  return state.members.filter(
    (member) => member.status !== "disabled" && adminRoleIds.has(member.roleId),
  ).length;
}

/** Phụ huynh chỉ được bật nhóm cho phép và tối đa mức Đọc. */
function sanitizePermissions(
  kind: RoleKind,
  input: Partial<Record<PermissionGroup, PermissionLevel>>,
): Record<PermissionGroup, PermissionLevel> {
  const permissions = emptyPermissions();
  for (const group of PERMISSION_GROUP_IDS) {
    const level = input[group];
    if (!level || level === "none") continue;
    if (kind === "guardian") {
      if (!GUARDIAN_GROUP_IDS.includes(group)) continue;
      permissions[group] = level === "write" ? "read" : level;
    } else {
      permissions[group] = level;
    }
  }
  return permissions;
}

/**
 * Thành viên NHÂN SỰ của workspace (role.kind === "staff").
 * Membership phụ huynh không thuộc màn Nhân sự; màn chọn vai trò và màn phụ
 * huynh dùng `listMyMemberships()` / `repositories/guardian.ts`.
 */
export function listMembers(): Member[] {
  const state = getStore();
  const staffRoleIds = new Set(
    state.roles.filter((role) => role.kind === "staff").map((role) => role.id),
  );
  return state.members.filter((member) => staffRoleIds.has(member.roleId));
}

export function getMember(id: string): Member | undefined {
  return getStore().members.find((item) => item.id === id);
}

export function inviteMember(input: {
  name: string;
  phone: string;
  roleId: string;
  classIds: string[];
}): Member {
  requireAdmin();
  requireOnline();
  const name = input.name.trim();
  if (!name) throw new Error("Nhập tên thành viên.");
  if (!input.phone.trim()) throw new Error("Nhập số điện thoại.");
  requireRole(input.roleId);
  const state = getStore();
  for (const classId of input.classIds)
    if (!state.classes.some((item) => item.id === classId))
      throw new Error("Không tìm thấy lớp.");
  const item: Member = {
    id: crypto.randomUUID(),
    name,
    phone: input.phone.trim(),
    roleId: input.roleId,
    classIds: [...input.classIds],
    status: "invited",
    invitedAt: new Date().toISOString(),
  };
  commit("members", item.id, (draft) => {
    draft.members.push(item);
  });
  return item;
}

export function resendInvite(memberId: string): void {
  requireAdmin();
  requireOnline();
  const member = requireMember(memberId);
  if (member.status !== "invited")
    throw new Error("Chỉ gửi lại được lời mời đang chờ.");
  commit("members", memberId, (draft) => {
    const target = draft.members.find((item) => item.id === memberId);
    if (target) target.invitedAt = new Date().toISOString();
  });
}

export function cancelInvite(memberId: string): void {
  requireAdmin();
  const member = requireMember(memberId);
  if (member.status !== "invited")
    throw new Error("Chỉ huỷ được lời mời đang chờ.");
  commit("members", memberId, (draft) => {
    draft.members = draft.members.filter((item) => item.id !== memberId);
  });
}

export function setMemberClasses(memberId: string, classIds: string[]): void {
  requireAdmin();
  requireMember(memberId);
  const state = getStore();
  for (const classId of classIds)
    if (!state.classes.some((item) => item.id === classId))
      throw new Error("Không tìm thấy lớp.");
  commit("members", memberId, (draft) => {
    const target = draft.members.find((item) => item.id === memberId);
    if (target) target.classIds = [...classIds];
  });
}

export function setMemberRole(memberId: string, roleId: string): void {
  requireAdmin();
  const member = requireMember(memberId);
  const role = requireRole(roleId);
  const currentRole = getStore().roles.find((item) => item.id === member.roleId);
  if (currentRole?.system && !role.system && activeAdminCount() <= 1)
    throw new Error("Phải còn ít nhất một Admin đang hoạt động.");
  commit("members", memberId, (draft) => {
    const target = draft.members.find((item) => item.id === memberId);
    if (target) target.roleId = roleId;
  });
}

export function setMemberDisabled(memberId: string, disabled: boolean): void {
  requireAdmin();
  const member = requireMember(memberId);
  const role = getStore().roles.find((item) => item.id === member.roleId);
  if (disabled && role?.system && activeAdminCount() <= 1)
    throw new Error("Phải còn ít nhất một Admin đang hoạt động.");
  commit("members", memberId, (draft) => {
    const target = draft.members.find((item) => item.id === memberId);
    if (target) target.status = disabled ? "disabled" : "active";
  });
}

export function listRoles(): Role[] {
  return getStore().roles;
}

export function getRole(id: string): Role | undefined {
  return getStore().roles.find((item) => item.id === id);
}

export function createRole(input: {
  name: string;
  kind: RoleKind;
  permissions: Partial<Record<PermissionGroup, PermissionLevel>>;
}): Role {
  requireAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Nhập tên vai trò.");
  const item: Role = {
    id: crypto.randomUUID(),
    name,
    kind: input.kind,
    system: false,
    permissions: sanitizePermissions(input.kind, input.permissions),
  };
  commit("roles", item.id, (draft) => {
    draft.roles.push(item);
  });
  return item;
}

export function updateRole(
  id: string,
  input: {
    name?: string;
    permissions?: Partial<Record<PermissionGroup, PermissionLevel>>;
  },
): Role {
  requireAdmin();
  const current = requireRole(id);
  if (current.system) throw new Error("Không thể sửa vai trò hệ thống.");
  const name = input.name === undefined ? current.name : input.name.trim();
  if (!name) throw new Error("Nhập tên vai trò.");
  const permissions =
    input.permissions === undefined
      ? current.permissions
      : sanitizePermissions(current.kind, input.permissions);
  commit("roles", id, (draft) => {
    const target = draft.roles.find((item) => item.id === id);
    if (target) {
      target.name = name;
      target.permissions = permissions;
    }
  });
  return { ...current, name, permissions };
}

export function roleMemberCount(roleId: string): number {
  return getStore().members.filter((member) => member.roleId === roleId).length;
}

export function roleDisplayKind(kind: RoleKind): string {
  return kind === "guardian" ? "Phụ huynh" : "Nhân sự";
}
