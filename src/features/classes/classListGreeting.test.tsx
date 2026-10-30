import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MeResponse } from "../../data/api/types";

vi.mock("../../data/sync", () => ({ api: { request: vi.fn() }, syncNow: vi.fn(), refreshNow: vi.fn(async () => ({ status: "ok" })), scheduleSync: vi.fn(), clearUserCache: vi.fn(async () => undefined) }));

import ClassListPage from "./ClassListPage";
import { activateSession, clearSession } from "../../data/auth/session";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import { greetingFor, initialsOf } from "../../shared/personName";

const full = { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "write", comments_reports: "write", send_comments: "write" } as const;
const membership = {
  id: "m-teacher", status: "active" as const, scope_epoch: 1, workspace: { id: "w1", name: "Lớp học" },
  role: { id: "r-teacher", name: "Giáo viên", system_key: "teacher", scope_kind: "assigned_classes" as const },
  permissions: full, class_ids: [] as string[],
};

async function startAs(displayName: string) {
  const user = { id: "u1", phone: "+84900000001", display_name: displayName, must_change_password: false };
  const me: MeResponse = { user, active_membership_id: membership.id, memberships: [membership] };
  await clearSession();
  await activateSession("tok", user, me, membership.id);
  replaceStore({ ...createSeed(), classes: [] });
}
const renderPage = () => render(<MemoryRouter><ClassListPage /></MemoryRouter>);

describe("lời chào ở trang Lớp", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("chào theo tên đang đăng nhập, avatar là chữ cái đầu, không thêm cô/thầy", async () => {
    await startAs("Nguyễn Thu Hà");
    renderPage();
    expect(screen.getByText("Xin chào, Nguyễn Thu Hà")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cài đặt" }).textContent).toBe("TH");
    expect(screen.queryByText(/cô Lan/i)).toBeNull();
  });

  it("không có tên thì chỉ chào và avatar là biểu tượng", async () => {
    await startAs("  ");
    renderPage();
    expect(screen.getByText("Xin chào")).toBeTruthy();
    const avatar = screen.getByRole("link", { name: "Cài đặt" });
    expect(avatar.textContent).toBe("");
    expect(avatar.querySelector("svg")).not.toBeNull();
  });
});

describe("tên hiển thị", () => {
  it("greetingFor và initialsOf xử lý tên rỗng và tên một từ", () => {
    expect(greetingFor(undefined)).toBe("Xin chào");
    expect(greetingFor("Thu")).toBe("Xin chào, Thu");
    expect(initialsOf("")).toBe("");
    expect(initialsOf("Thu")).toBe("T");
    expect(initialsOf(" an  nhiên ")).toBe("AN");
  });
});
