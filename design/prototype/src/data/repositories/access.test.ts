import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS, ROLE_IDS } from "../defaults";
import type { Member, Role } from "../types";
import {
  can,
  getActiveMember,
  getActiveRole,
  isAdmin,
  linkedStudentIds,
  listMyMemberships,
  requirePermission,
  switchRole,
} from "./access";
import { listClasses } from "./classes";
import { getStudent } from "./students";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

/** Thêm một membership vào phiên đăng nhập để test đổi vai trò. */
function withMembership(memberId: string): void {
  const state = createSeed();
  state.auth = { email: "test@example.test", memberIds: [...state.auth!.memberIds, memberId] };
  replaceStore(state);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Phạm vi dữ liệu theo vai trò", () => {
  it("Admin thấy mọi lớp, thành viên chỉ thấy lớp được gán", () => {
    expect(isAdmin()).toBe(true);
    expect(getActiveMember()?.id).toBe(MEMBER_IDS.lanAdmin);
    expect(listClasses().map((item) => item.id)).toEqual(["6a", "ielts"]);

    switchRole(MEMBER_IDS.lanTeacher);
    expect(isAdmin()).toBe(false);
    expect(getActiveRole()?.name).toBe("Giáo viên");
    expect(listClasses().map((item) => item.id)).toEqual(["6a"]);

    withMembership(MEMBER_IDS.trang);
    switchRole(MEMBER_IDS.trang);
    expect(listClasses().map((item) => item.id)).toEqual(["ielts"]);
  });

  it("liệt kê đúng membership của phiên và từ chối vai trò ngoài phiên", () => {
    expect(listMyMemberships().map((item) => item.member.id)).toEqual([
      MEMBER_IDS.lanAdmin,
      MEMBER_IDS.lanTeacher,
      MEMBER_IDS.lanGuardian,
    ]);
    expect(listMyMemberships()[0].role.kind).toBe("staff");
    expect(listMyMemberships()[2].role.kind).toBe("guardian");
    expect(listMyMemberships()[2].member.studentIds).toEqual([
      "6a-student-1",
      "6a-student-8",
    ]);
    expect(() => switchRole(MEMBER_IDS.minh)).toThrow(
      "Không thể đổi sang vai trò này.",
    );
  });
});

describe("can() theo nhóm quyền", () => {
  it("Admin luôn có mọi quyền", () => {
    expect(can("classes", "write")).toBe(true);
    expect(can("students", "read")).toBe(true);
    expect(can("lectures", "read")).toBe(true);
    expect(can("comments_reports", "write")).toBe(true);
  });

  it("Sửa bao gồm Đọc và tôn trọng ma trận của vai trò", () => {
    withMembership(MEMBER_IDS.trang);
    switchRole(MEMBER_IDS.trang);
    expect(can("sessions_attendance", "write")).toBe(true);
    expect(can("sessions_attendance", "read")).toBe(true);
    expect(can("students", "read")).toBe(true);
    expect(can("students", "write")).toBe(false);
    expect(can("classes", "write")).toBe(false);
    expect(can("classes", "read")).toBe(false);
    expect(can("scores", "write")).toBe(false);
  });

  it("requirePermission báo đúng câu khi thiếu quyền", () => {
    withMembership(MEMBER_IDS.trang);
    switchRole(MEMBER_IDS.trang);
    expect(() => requirePermission("classes", "write")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  });
});

describe("Role phụ huynh", () => {
  it("can() không bao giờ cho ghi, chỉ đọc nhóm được phép", () => {
    const state = createSeed();
    const role: Role = {
      id: "role-guardian-test",
      name: "Phụ huynh test",
      kind: "guardian",
      system: false,
      permissions: {
        classes: "read",
        students: "write",
        sessions_attendance: "write",
        scores: "read",
        lectures: "write",
        comments_reports: "none",
      },
    };
    const member: Member = {
      id: "member-guardian-test",
      name: "Phụ huynh test",
      phone: "0900000009",
      roleId: role.id,
      classIds: ["6a"],
      status: "active",
      invitedAt: null,
    };
    state.roles.push(role);
    state.members.push(member);
    state.auth = { email: "guardian@example.test", memberIds: [member.id] };
    state.activeMemberId = member.id;
    replaceStore(state);

    expect(can("classes", "read")).toBe(true);
    expect(can("classes", "write")).toBe(false);
    expect(can("sessions_attendance", "read")).toBe(true);
    expect(can("sessions_attendance", "write")).toBe(false);
    expect(can("lectures", "read")).toBe(true);
    expect(can("lectures", "write")).toBe(false);
    expect(can("students", "write")).toBe(false);
    expect(can("comments_reports", "read")).toBe(false);
  });

  it("không dùng được quyền Admin dù role trùng tên", () => {
    const state = createSeed();
    state.roles.push({
      id: "role-guardian-admin",
      name: "Admin",
      kind: "guardian",
      system: false,
      permissions: {
        classes: "write",
        students: "write",
        sessions_attendance: "write",
        scores: "write",
        lectures: "write",
        comments_reports: "write",
      },
    });
    state.members.push({
      id: "member-guardian-admin",
      name: "Phụ huynh Admin",
      phone: "0900000010",
      roleId: "role-guardian-admin",
      classIds: ["6a"],
      status: "active",
      invitedAt: null,
    });
    state.auth = { email: "g2@example.test", memberIds: ["member-guardian-admin"] };
    state.activeMemberId = "member-guardian-admin";
    replaceStore(state);

    expect(isAdmin()).toBe(false);
    expect(getActiveRole()?.name).toBe("Admin");
    expect(can("classes", "write")).toBe(false);
  });
});

describe("Đổi vai trò", () => {
  it("cập nhật activeMemberId và giữ nguyên khi thiếu phiên", () => {
    switchRole(MEMBER_IDS.lanTeacher);
    expect(getStore().activeMemberId).toBe(MEMBER_IDS.lanTeacher);
    getStore();
    expect(getActiveRole()?.name).toBe("Giáo viên");
    expect(ROLE_IDS.admin).toBe("role-admin");
  });
});

describe("Membership phụ huynh trong seed", () => {
  it("chỉ đọc dữ liệu của con được liên kết, không thấy lớp hay học sinh khác", () => {
    switchRole(MEMBER_IDS.lanGuardian);
    expect(isAdmin()).toBe(false);
    expect(getActiveRole()?.kind).toBe("guardian");
    expect([...linkedStudentIds()]).toEqual([
      "6a-student-1",
      "6a-student-8",
    ]);
    expect(getStudent("6a-student-1")?.name).toBe("Trần Gia Bảo");
    expect(getStudent("6a-student-8")?.name).toBe("Ngô Bảo Ngọc");
    expect(getStudent("6a-student-0")).toBeUndefined();
    // Phạm vi lớp của phụ huynh rỗng: dữ liệu lớp đọc qua phạm vi học sinh.
    expect(listClasses()).toEqual([]);
    expect(can("comments_reports", "read")).toBe(true);
    expect(can("comments_reports", "write")).toBe(false);
  });
});
