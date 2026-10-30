import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MeResponse } from "../../data/api/types";

vi.mock("../../data/sync", () => ({ api: { request: vi.fn() }, syncNow: vi.fn(), scheduleSync: vi.fn(), clearUserCache: vi.fn(async () => undefined) }));

import SettingsPage from "./SettingsPage";
import { activateSession, clearSession } from "../../data/auth/session";

const perms = { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "write", comments_reports: "write", send_comments: "none" } as const;
const membership = (systemKey: string, scope: "workspace" | "assigned_classes") => ({
  id: "m1", status: "active" as const, scope_epoch: 1, workspace: { id: "w1", name: "Lớp học" },
  role: { id: "r1", name: systemKey === "admin" ? "Admin" : "Trợ giảng", system_key: systemKey, scope_kind: scope },
  permissions: perms, class_ids: [] as string[],
});

async function startAs(displayName: string, m: ReturnType<typeof membership>) {
  const user = { id: "u1", phone: "+84900000001", display_name: displayName, must_change_password: false };
  const me: MeResponse = { user, active_membership_id: m.id, memberships: [m] };
  await clearSession();
  await activateSession("tok", user, me, m.id);
}
const renderPage = () => render(<MemoryRouter><SettingsPage /></MemoryRouter>);

describe("hồ sơ ở Cài đặt khi tên rỗng", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("nhân sự chưa có tên: không ghi 'Chưa đăng nhập' hay 'GV', có ghi chú Admin đặt tên", async () => {
    await startAs("", membership("assistant", "assigned_classes"));
    renderPage();
    expect(screen.queryByText("Chưa đăng nhập")).toBeNull();
    expect(screen.queryByText("GV")).toBeNull();
    expect(screen.getAllByText("Chưa đặt tên").length).toBeGreaterThan(0);
    expect(screen.getByText("Admin đặt tên cho bạn")).toBeTruthy();
  });

  it("có tên: hiện tên và chữ cái đầu", async () => {
    await startAs("Nguyễn Thu Hà", membership("assistant", "assigned_classes"));
    renderPage();
    expect(screen.getAllByText("Nguyễn Thu Hà").length).toBeGreaterThan(0);
    expect(screen.getByText("TH")).toBeTruthy();
    expect(screen.queryByText("Chưa đặt tên")).toBeNull();
  });

  it("Admin không thấy ghi chú 'Admin đặt tên cho bạn'", async () => {
    await startAs("", membership("admin", "workspace"));
    renderPage();
    expect(screen.queryByText("Admin đặt tên cho bạn")).toBeNull();
  });
});
