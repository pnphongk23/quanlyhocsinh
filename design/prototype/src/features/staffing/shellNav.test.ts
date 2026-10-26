import { describe, expect, it } from "vitest";
import { desktopNav } from "../../app/TeacherShell";
import type { PermissionGroup, PermissionLevel } from "../../data/types";

const NONE: Record<PermissionGroup, PermissionLevel> = {
  classes: "none",
  students: "none",
  sessions_attendance: "none",
  scores: "none",
  lectures: "none",
  comments_reports: "none",
};

const teacher = {
  classes: "write",
  students: "write",
  sessions_attendance: "write",
  scores: "write",
  lectures: "write",
  comments_reports: "write",
} as Record<PermissionGroup, PermissionLevel>;

const assistant = {
  ...NONE,
  students: "read",
  sessions_attendance: "write",
  scores: "read",
  lectures: "read",
} as Record<PermissionGroup, PermissionLevel>;

function can(permissions: Record<PermissionGroup, PermissionLevel>) {
  return (group: PermissionGroup, level: "read" | "write") =>
    level === "write"
      ? permissions[group] === "write"
      : permissions[group] === "read" || permissions[group] === "write";
}

function labels(links: Array<{ label: string }>): string[] {
  return links.map((link) => link.label);
}

describe("lối vào sidebar desktop theo quyền và cờ MVP", () => {
  it("Admin chỉ thấy các mục MVP và Cài đặt", () => {
    const links = desktopNav(can(teacher), true, true, "member-lan-admin", "6a");
    expect(labels(links)).toEqual([
      "Lớp",
      "Điểm danh",
      "Điểm số",
      "Học sinh",
      "Báo cáo",
      "Cài đặt",
    ]);
    // Cờ Lương đang tắt: không còn lối vào bảng lương.
    expect(links.some((link) => link.to.startsWith("/luong"))).toBe(false);
  });

  it("Giáo viên không có mục quản trị, không có lối vào Lương khi cờ tắt", () => {
    const links = desktopNav(can(teacher), false, true, "member-minh", "6a");
    expect(labels(links)).toEqual([
      "Lớp",
      "Điểm danh",
      "Điểm số",
      "Học sinh",
      "Báo cáo",
      "Cài đặt",
    ]);
    expect(labels(links)).not.toContain("Lương");
    expect(labels(links)).not.toContain("Lương của tôi");
    expect(links.some((link) => link.to.startsWith("/luong"))).toBe(false);
    expect(labels(links)).not.toContain("Nhân sự");
    expect(labels(links)).not.toContain("Vai trò");
    expect(labels(links)).not.toContain("Học phí");
    expect(labels(links)).not.toContain("Phân công");
  });

  it("Trợ giảng chỉ thấy mục role cho phép đọc", () => {
    const links = desktopNav(can(assistant), false, true, "member-trang", "ielts");
    expect(labels(links)).toEqual([
      "Lớp",
      "Điểm danh",
      "Điểm số",
      "Học sinh",
      "Cài đặt",
    ]);
    expect(labels(links)).not.toContain("Báo cáo");
    expect(labels(links)).not.toContain("Lương của tôi");
  });

  it("gắn lớp đang mở vào các mục con của Lớp; chưa chọn lớp thì ẩn hẳn", () => {
    const scoped = desktopNav(can(teacher), true, true, "member-lan-admin", "6a");
    expect(scoped.find((link) => link.label === "Điểm danh")?.to).toBe(
      "/lop/6a/diem-danh",
    );
    expect(scoped.filter((link) => link.child).map((link) => link.label)).toEqual([
      "Điểm danh",
      "Điểm số",
      "Học sinh",
      "Báo cáo",
    ]);
    const unselected = desktopNav(can(teacher), true, true, "member-lan-admin", null);
    expect(unselected.map((link) => link.label)).toEqual(["Lớp", "Cài đặt"]);
  });
});
