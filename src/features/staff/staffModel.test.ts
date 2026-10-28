import { describe, expect, it } from "vitest";
import type { StaffMember } from "../../data/api/types";
import { changedPermissions, sameClassSet, statusBadge } from "./staffModel";

const base: StaffMember = {
  id: "m1", kind: "member", user_id: "u1", display_name: "Cô Lan", phone: "+84900000007",
  role: { id: "r", name: "Trợ giảng", system_key: "assistant" }, class_ids: [], status: "active", is_self: false, created_at: "2026-10-28T00:00:00Z", version: 1,
};

describe("staffModel", () => {
  it("labels pending and disabled people, not active ones", () => {
    expect(statusBadge(base)).toBeNull();
    expect(statusBadge({ ...base, status: "pending" })?.label).toBe("Chờ đặt mật khẩu");
    expect(statusBadge({ ...base, status: "disabled" })?.label).toBe("Đã tắt quyền");
  });
  it("sends only the changed permission groups", () => {
    const saved = { classes: "read", students: "read", sessions_attendance: "write", scores: "read", comments_reports: "write" } as const;
    expect(changedPermissions(saved, { ...saved, scores: "write", comments_reports: "none" })).toEqual({ scores: "write", comments_reports: "none" });
    expect(changedPermissions(saved, { ...saved })).toEqual({});
  });
  it("compares class sets ignoring order", () => {
    expect(sameClassSet(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameClassSet(["a"], ["a", "b"])).toBe(false);
  });
});
