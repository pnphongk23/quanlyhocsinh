import type {
  ClassStaff,
  Member,
  SessionSubstitute,
  StaffPosition,
} from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { captureClassBaseStaff, captureSessionBaseStaff } from "../teaching";
import { requireClass, requireSession } from "./helpers";
import { isAdmin } from "./access";

function requireAdmin(): void {
  if (!isAdmin()) throw new Error("Bạn không có quyền thực hiện thao tác này.");
}

/** Chỉ nhân sự (role.kind "staff") đang hoạt động mới được phân công. */
function requireActiveStaff(memberId: string): Member {
  const state = getStore();
  const member = state.members.find((item) => item.id === memberId);
  if (!member) throw new Error("Không tìm thấy thành viên.");
  const role = state.roles.find((item) => item.id === member.roleId);
  if (role?.kind !== "staff" || member.status !== "active")
    throw new Error("Chỉ chọn được nhân sự đang hoạt động.");
  return member;
}

export function listClassStaff(classId: string): ClassStaff[] {
  return getStore().classStaff.filter((item) => item.classId === classId);
}

/**
 * Ghi toàn bộ phân công của một lớp trong một commit duy nhất: giữ phân công
 * gốc của các buổi đã diễn ra trước, kiểm tra nhân sự đang hoạt động, tối đa
 * một giáo viên chính, không trùng vị trí và không vừa chính vừa trợ giảng.
 */
export function setClassStaff(
  classId: string,
  assignments: Array<{ memberId: string; position: StaffPosition }>,
): ClassStaff[] {
  requireAdmin();
  requireClass(classId);
  const seen = new Set<string>();
  let mainCount = 0;
  for (const item of assignments) {
    requireActiveStaff(item.memberId);
    if (seen.has(item.memberId))
      throw new Error("Mỗi nhân sự chỉ được giữ một vị trí trong lớp.");
    seen.add(item.memberId);
    if (item.position === "main") {
      mainCount += 1;
      if (mainCount > 1) throw new Error("Mỗi lớp chỉ có một giáo viên chính.");
    }
  }
  const rows: ClassStaff[] = assignments.map((item) => ({
    classId,
    memberId: item.memberId,
    position: item.position,
  }));
  commit("classStaff", classId, (draft) => {
    captureClassBaseStaff(draft, classId);
    draft.classStaff = draft.classStaff.filter(
      (item) => item.classId !== classId,
    );
    draft.classStaff.push(...rows);
    for (const row of rows) {
      const member = draft.members.find((item) => item.id === row.memberId);
      if (member && !member.classIds.includes(classId))
        member.classIds.push(classId);
    }
  });
  return rows;
}

/**
 * Phân công một nhân sự vào lớp theo vị trí.
 * Mỗi lớp chỉ có một giáo viên chính: gán chính mới thì bỏ chính cũ.
 * Gán vào lớp thì tự thêm lớp vào member.classIds (phạm vi thấy lớp).
 */
export function assignClassStaff(
  classId: string,
  memberId: string,
  position: StaffPosition,
): void {
  requireAdmin();
  requireClass(classId);
  requireActiveStaff(memberId);
  commit("classStaff", `${classId}:${memberId}`, (draft) => {
    captureClassBaseStaff(draft, classId);
    if (position === "main")
      draft.classStaff = draft.classStaff.filter(
        (item) =>
          !(
            item.classId === classId &&
            item.position === "main" &&
            item.memberId !== memberId
          ),
      );
    const existing = draft.classStaff.find(
      (item) => item.classId === classId && item.memberId === memberId,
    );
    if (existing) existing.position = position;
    else draft.classStaff.push({ classId, memberId, position });
    const member = draft.members.find((item) => item.id === memberId);
    if (member && !member.classIds.includes(classId))
      member.classIds.push(classId);
  });
}

/** Gỡ phân công; không gỡ lớp khỏi member.classIds (vẫn thấy lớp). */
export function removeClassStaff(classId: string, memberId: string): void {
  requireAdmin();
  commit("classStaff", `${classId}:${memberId}`, (draft) => {
    captureClassBaseStaff(draft, classId);
    draft.classStaff = draft.classStaff.filter(
      (item) => !(item.classId === classId && item.memberId === memberId),
    );
  });
}

/**
 * Đổi người dạy một buổi (kể cả buổi lẻ học bù chưa có người dạy,
 * originalMemberId = null). Cùng buổi + vị trí + người gốc thì cập nhật lại.
 */
export function substituteSession(input: {
  sessionId: string;
  position: StaffPosition;
  originalMemberId: string | null;
  substituteMemberId: string;
  reason: string;
}): SessionSubstitute {
  requireAdmin();
  const session = requireSession(input.sessionId);
  if (session.status === "cancelled")
    throw new Error("Không đổi người dạy buổi đã hủy.");
  requireActiveStaff(input.substituteMemberId);
  const reason = input.reason.trim();
  if (!reason) throw new Error("Nhập lý do.");
  const existing = getStore().sessionSubstitutes.find(
    (item) =>
      item.sessionId === input.sessionId &&
      item.position === input.position &&
      item.originalMemberId === input.originalMemberId,
  );
  if (existing) {
    commit("sessionSubstitutes", existing.id, (draft) => {
      captureSessionBaseStaff(draft, input.sessionId);
      const target = draft.sessionSubstitutes.find(
        (item) => item.id === existing.id,
      );
      if (target) {
        target.substituteMemberId = input.substituteMemberId;
        target.reason = reason;
      }
    });
    return {
      ...existing,
      substituteMemberId: input.substituteMemberId,
      reason,
    };
  }
  const item: SessionSubstitute = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    position: input.position,
    originalMemberId: input.originalMemberId,
    substituteMemberId: input.substituteMemberId,
    reason,
    createdAt: new Date().toISOString(),
  };
  commit("sessionSubstitutes", item.id, (draft) => {
    captureSessionBaseStaff(draft, input.sessionId);
    draft.sessionSubstitutes.push(item);
  });
  return item;
}

export function clearSubstitute(substituteId: string): void {
  requireAdmin();
  commit("sessionSubstitutes", substituteId, (draft) => {
    draft.sessionSubstitutes = draft.sessionSubstitutes.filter(
      (item) => item.id !== substituteId,
    );
  });
}

export function listSubstitutes(sessionId: string): SessionSubstitute[] {
  return getStore().sessionSubstitutes.filter(
    (item) => item.sessionId === sessionId,
  );
}
