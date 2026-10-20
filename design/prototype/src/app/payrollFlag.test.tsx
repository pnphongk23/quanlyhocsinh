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
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  // Khởi tạo router chạy loader ở nền: chờ tới khi chuyển hướng xong.
  await vi.waitFor(() =>
    expect(router.state.location.pathname).toBe("/lop"),
  );
  return router.state.location.pathname;
}

describe("cờ Lương (features.payroll)", () => {
  it("đang tắt trong prototype", () => {
    expect(features.payroll).toBe(false);
  });

  it("sidebar desktop của Admin không còn mục Lương", () => {
    const links = desktopNav(can(teacher), true, true, "member-lan-admin", "6a");
    const labels = links.map((link) => link.label);
    expect(labels).not.toContain("Lương");
    expect(labels).not.toContain("Lương của tôi");
    expect(links.some((link) => link.to.startsWith("/luong"))).toBe(false);
    // Lịch dạy vẫn còn khi cờ Lương tắt.
    expect(labels).toContain("Lịch dạy");
  });

  it("sidebar desktop của nhân sự không còn mục Lương của tôi", () => {
    const links = desktopNav(can(teacher), false, true, "member-minh", "6a");
    const labels = links.map((link) => link.label);
    expect(labels).not.toContain("Lương");
    expect(labels).not.toContain("Lương của tôi");
    expect(links.some((link) => link.to.startsWith("/luong"))).toBe(false);
    expect(labels).toContain("Lịch dạy");
  });

  it("Cài đặt không còn thẻ dẫn tới Lương, vẫn còn Lịch dạy", () => {
    replaceStore(createSeed());
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(html).not.toContain("/luong");
    expect(html).not.toContain("Lương");
    expect(html).toContain("Lịch dạy");
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
