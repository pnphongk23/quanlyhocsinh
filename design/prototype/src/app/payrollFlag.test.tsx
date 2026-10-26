import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter } from "react-router-dom";
import { createSeed } from "../data/seed";
import { replaceStore } from "../data/store";
import type { PermissionGroup, PermissionLevel } from "../data/types";
import SettingsPage from "../features/settings/SettingsPage";
import { features } from "../shared/features";
import { routes } from "./routes";
import { desktopNav } from "./TeacherShell";

const teacher = {
  classes: "write",
  students: "write",
  sessions_attendance: "write",
  scores: "write",
  lectures: "write",
  comments_reports: "write",
} as Record<PermissionGroup, PermissionLevel>;

function can(permissions: Record<PermissionGroup, PermissionLevel>) {
  return (group: PermissionGroup, level: "read" | "write") =>
    level === "write"
      ? permissions[group] === "write"
      : permissions[group] === "read" || permissions[group] === "write";
}

/** Đường dẫn cuối cùng sau khi router chạy xong loader chuyển hướng. */
async function finalPath(entry: string): Promise<string> {
  return finalPathTo(entry, "/lop");
}

async function finalPathTo(entry: string, expected: string): Promise<string> {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  await vi.waitFor(() =>
    expect(router.state.location.pathname).toBe(expected),
  );
  return router.state.location.pathname;
}

describe("cờ Lương (features.payroll)", () => {
  it("đang tắt trong prototype", () => {
    expect(features.payroll).toBe(false);
  });

  it("sidebar desktop của Admin chỉ còn các mục MVP", () => {
    const links = desktopNav(can(teacher), true, true, "member-lan-admin", "6a");
    const labels = links.map((link) => link.label);
    expect(labels).not.toContain("Lương");
    expect(labels).not.toContain("Lương của tôi");
    expect(links.some((link) => link.to.startsWith("/luong"))).toBe(false);
    expect(labels).toEqual(["Lớp", "Điểm danh", "Điểm số", "Học sinh", "Báo cáo", "Cài đặt"]);
  });

  it("sidebar desktop của nhân sự ẩn Lịch dạy ngoài MVP", () => {
    const links = desktopNav(can(teacher), false, true, "member-minh", "6a");
    const labels = links.map((link) => link.label);
    expect(labels).not.toContain("Lương");
    expect(labels).not.toContain("Lương của tôi");
    expect(links.some((link) => link.to.startsWith("/luong"))).toBe(false);
    expect(labels).not.toContain("Lịch dạy");
  });

  it("Cài đặt không còn lối vào Lương hay Lịch dạy", () => {
    replaceStore(createSeed());
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(html).not.toContain("/luong");
    expect(html).not.toContain("Lương");
    expect(html).not.toContain("Lịch dạy");
    expect(html).not.toContain("Phân công");
    expect(html).not.toContain("Học phí");
    expect(html).not.toContain("Nhân sự");
    expect(html).not.toContain("Báo cáo điểm");
  });

  it("truy cập thẳng /luong chuyển về /lop", async () => {
    expect(await finalPath("/luong")).toBe("/lop");
  });

  it("truy cập thẳng /luong/:memberId chuyển về /lop", async () => {
    expect(await finalPath("/luong/member-minh")).toBe("/lop");
  });

  it("đường dẫn con của /luong cũng chuyển về /lop", async () => {
    expect(await finalPath("/luong/member-minh/sua")).toBe("/lop");
  });
});

describe("cờ Bài giảng (features.lectures)", () => {
  it("đang tắt trong prototype", () => {
    expect(features.lectures).toBe(false);
  });

  it("sidebar desktop không còn mục Bài giảng", () => {
    const links = desktopNav(can(teacher), true, true, "member-lan-admin", "6a");
    expect(links.map((l) => l.label)).not.toContain("Bài giảng");
    expect(links.some((l) => l.to.startsWith("/bai-giang"))).toBe(false);
  });

  it("/bai-giang chuyển về /lop", async () => {
    expect(await finalPath("/bai-giang")).toBe("/lop");
  });
});

describe("ẩn các mục ngoài MVP", () => {
  it("đang tắt các cờ ngoài MVP", () => {
    expect(features.staffing).toBe(false);
    expect(features.tuition).toBe(false);
    expect(features.scoreReports).toBe(false);
  });

  it("route nhân sự, học phí và báo cáo điểm tổng hợp về /lop", async () => {
    replaceStore(createSeed());
    for (const path of [
      "/nhan-su",
      "/nhan-su/member-minh",
      "/nhan-su/moi",
      "/phan-cong",
      "/lich-day",
      "/vai-tro",
      "/vai-tro/moi",
      "/hoc-phi",
      "/hoc-phi/6a-student-0",
      "/lop/6a/bao-cao-diem",
      "/lop/6a/bao-cao-diem/6a-student-0",
    ]) {
      expect(await finalPath(path)).toBe("/lop");
    }
  });
});
