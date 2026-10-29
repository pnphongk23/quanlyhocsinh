import type { StaffMember, StaffPermissions, StaffRoleKey } from "../../data/api/types";
import type { PillTone } from "../../shared/ui";

export const ASSIGNABLE_ROLES: { value: StaffRoleKey; label: string }[] = [
  { value: "teacher", label: "Giáo viên" },
  { value: "assistant", label: "Trợ giảng" },
];

export const LEVEL_OPTIONS = [
  { value: "none", label: "Không" },
  { value: "read", label: "Đọc" },
  { value: "write", label: "Sửa" },
];

export const SEND_COMMENTS_OPTIONS = [
  { value: "none", label: "Không" },
  { value: "write", label: "Sửa" },
];

export function isAssignableRole(key: string | null): key is StaffRoleKey {
  return key === "teacher" || key === "assistant";
}

export function statusBadge(member: StaffMember): { label: string; tone: PillTone } | null {
  if (member.status === "pending") return { label: "Chờ đặt mật khẩu", tone: "warning" };
  if (member.status === "disabled") return { label: "Đã tắt quyền", tone: "neutral" };
  return null;
}

/** Chỉ gửi những nhóm đã đổi so với bản đã lưu. */
export function changedPermissions(saved: StaffPermissions, draft: StaffPermissions): Partial<StaffPermissions> {
  const diff: Partial<StaffPermissions> = {};
  for (const key of ["classes", "students", "sessions_attendance", "scores", "comments_reports"] as const) {
    if (draft[key] !== saved[key]) diff[key] = draft[key];
  }
  if (draft.send_comments !== saved.send_comments) diff.send_comments = draft.send_comments;
  return diff;
}

export function withSendCommentsFallback(permissions: StaffPermissions): StaffPermissions {
  const sendComments = permissions.send_comments as "none" | "write" | undefined;
  return {
    ...permissions,
    send_comments: sendComments ?? (permissions.comments_reports === "write" ? "write" : "none"),
  };
}

export function sameClassSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}
