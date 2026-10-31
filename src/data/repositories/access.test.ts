import { describe, expect, it } from "vitest";
import { permissionAllows } from "./access";

const core = {
  classes: "write",
  students: "write",
  sessions_attendance: "write",
  scores: "write",
  lectures: "write",
  comments_reports: "write",
} as const;

describe("send-comments access", () => {
  it.each([
    ["Admin", { ...core, send_comments: "write" }, true],
    ["Giáo viên", { ...core, send_comments: "write" }, true],
    ["Trợ giảng", { ...core, send_comments: "none" }, false],
    ["Phụ huynh", { ...core, comments_reports: "read", send_comments: "none" }, false],
    ["máy chủ cũ với quyền nhận xét Sửa", core, true],
    ["máy chủ cũ không có quyền nhận xét Sửa", { ...core, comments_reports: "read" }, false],
  ] as const)("checks %s permissions", (_role, permissions, expected) => {
    expect(permissionAllows(permissions, "send_comments", "write")).toBe(expected);
  });

  it("treats the send permission as write-only", () => {
    expect(permissionAllows({ ...core, send_comments: "write" }, "send_comments", "read")).toBe(false);
  });
});
