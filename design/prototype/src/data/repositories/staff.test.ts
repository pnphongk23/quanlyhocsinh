import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { replaceStore } from "../store";
import { MEMBER_IDS, ROLE_IDS } from "../defaults";
import {
  cancelInvite,
  createRole,
  getMember,
  inviteMember,
  listMembers,
  resendInvite,
  roleDisplayKind,
  roleMemberCount,
  setMemberClasses,
  setMemberDisabled,
  setMemberRole,
  updateRole,
} from "./staff";

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

/** Đặt vai trò đang dùng thành một membership không phải Admin. */
function actAs(memberId: string): void {
  const state = createSeed();
  state.auth = { email: "test@example.test", memberIds: [memberId] };
  state.activeMemberId = memberId;
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

describe("Role phụ huynh", () => {
  it("chỉ nhận nhóm cho phép và tối đa mức Đọc", () => {
    const role = createRole({
      name: "  Phụ huynh mới  ",
      kind: "guardian",
      permissions: {
        classes: "write",
        students: "read",
        sessions_attendance: "write",
        scores: "read",
        lectures: "write",
        comments_reports: "write",
      },
    });
    expect(role.name).toBe("Phụ huynh mới");
    expect(role.system).toBe(false);
    expect(role.permissions).toEqual({
      classes: "none",
      students: "none",
      sessions_attendance: "read",
      scores: "read",
      lectures: "read",
      comments_reports: "read",
    });
  });

  it("updateRole cũng ép lại giới hạn phụ huynh", () => {
    const role = createRole({
      name: "Phụ huynh cũ",
      kind: "guardian",
      permissions: { lectures: "read" },
    });
    const updated = updateRole(role.id, {
      permissions: { lectures: "write", classes: "write", scores: "write" },
    });
    expect(updated.permissions.lectures).toBe("read");
    expect(updated.permissions.classes).toBe("none");
    expect(updated.permissions.scores).toBe("read");
  });
});

describe("Role hệ thống", () => {
  it("không sửa được role Admin", () => {
    expect(() => updateRole(ROLE_IDS.admin, { name: "Siêu Admin" })).toThrow(
      "Không thể sửa vai trò hệ thống.",
    );
    expect(() => updateRole(ROLE_IDS.admin, { permissions: {} })).toThrow(
      "Không thể sửa vai trò hệ thống.",
    );
  });
});

describe("Admin cuối cùng", () => {
  it("không vô hiệu hoá Admin cuối cùng", () => {
    expect(() => setMemberDisabled(MEMBER_IDS.lanAdmin, true)).toThrow(
      "Phải còn ít nhất một Admin đang hoạt động.",
    );
    expect(() => setMemberRole(MEMBER_IDS.lanAdmin, ROLE_IDS.teacher)).toThrow(
      "Phải còn ít nhất một Admin đang hoạt động.",
    );
    expect(getMember(MEMBER_IDS.lanAdmin)?.status).toBe("active");
  });

  it("cho vô hiệu hoá khi đã có Admin khác đang hoạt động", () => {
    setMemberRole(MEMBER_IDS.trang, ROLE_IDS.admin);
    setMemberDisabled(MEMBER_IDS.lanAdmin, true);
    expect(getMember(MEMBER_IDS.lanAdmin)?.status).toBe("disabled");
    expect(roleMemberCount(ROLE_IDS.admin)).toBe(2);
  });
});

describe("Mọi hàm ghi cần Admin", () => {
  it("từ chối khi vai trò đang dùng không phải Admin", () => {
    actAs(MEMBER_IDS.trang);
    expect(() =>
      inviteMember({
        name: "Cô Hoa",
        phone: "0900000005",
        roleId: ROLE_IDS.teacher,
        classIds: ["ielts"],
      }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
    expect(() => setMemberClasses(MEMBER_IDS.minh, ["6a"])).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    expect(() => createRole({ name: "X", kind: "staff", permissions: {} })).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
  });
});

describe("Lời mời nhân sự", () => {
  it("mời, gửi lại và huỷ lời mời", () => {
    const before = listMembers().length;
    const member = inviteMember({
      name: "  Cô Hoa  ",
      phone: "0900000005",
      roleId: ROLE_IDS.teacher,
      classIds: ["6a"],
    });
    expect(member).toMatchObject({
      name: "Cô Hoa",
      roleId: ROLE_IDS.teacher,
      classIds: ["6a"],
      status: "invited",
    });
    expect(listMembers()).toHaveLength(before + 1);
    expect(getMember(member.id)?.invitedAt).toBeTruthy();

    const firstInvite = getMember(member.id)!.invitedAt;
    vi.setSystemTime(new Date("2026-10-20T10:00:00.000Z"));
    resendInvite(member.id);
    expect(getMember(member.id)!.invitedAt).not.toBe(firstInvite);

    cancelInvite(member.id);
    expect(getMember(member.id)).toBeUndefined();
  });

  it("chỉ huỷ được lời mời đang chờ", () => {
    expect(() => cancelInvite(MEMBER_IDS.minh)).toThrow(
      "Chỉ huỷ được lời mời đang chờ.",
    );
  });

  it("gán lớp và đổi vai trò thành viên", () => {
    setMemberClasses(MEMBER_IDS.minh, ["ielts"]);
    expect(getMember(MEMBER_IDS.minh)?.classIds).toEqual(["ielts"]);
    expect(() => setMemberClasses(MEMBER_IDS.minh, ["khong-co"])).toThrow(
      "Không tìm thấy lớp.",
    );
    setMemberRole(MEMBER_IDS.minh, ROLE_IDS.assistant);
    expect(getMember(MEMBER_IDS.minh)?.roleId).toBe(ROLE_IDS.assistant);
  });
});

describe("Danh sách thành viên nhân sự", () => {
  it("chỉ trả membership nhân sự, không lẫn membership phụ huynh", () => {
    const ids = listMembers().map((member) => member.id);
    expect(ids).not.toContain(MEMBER_IDS.lanGuardian);
    expect(ids).toEqual(
      expect.arrayContaining([
        MEMBER_IDS.lanAdmin,
        MEMBER_IDS.lanTeacher,
        MEMBER_IDS.minh,
        MEMBER_IDS.trang,
        MEMBER_IDS.mai,
      ]),
    );
    // Membership phụ huynh vẫn còn trong workspace (màn chọn vai trò dùng).
    expect(getMember(MEMBER_IDS.lanGuardian)?.studentIds).toEqual([
      "6a-student-1",
      "6a-student-8",
    ]);
    expect(roleMemberCount(ROLE_IDS.guardian)).toBe(1);
  });
});

describe("Nhãn loại vai trò", () => {
  it("trả nhãn tiếng Việt", () => {
    expect(roleDisplayKind("staff")).toBe("Nhân sự");
    expect(roleDisplayKind("guardian")).toBe("Phụ huynh");
  });
});
