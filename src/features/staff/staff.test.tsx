import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MeResponse, RolePermissionsItem, StaffMember } from "../../data/api/types";
import { ApiError } from "../../data/api/client";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../data/sync", () => ({ api: { request }, syncNow: vi.fn(), scheduleSync: vi.fn(), clearUserCache: vi.fn(async () => undefined) }));

import StaffPage from "./StaffPage";
import { activateSession, clearSession, getSession } from "../../data/auth/session";
import { registerParent } from "../../data/auth";
import { landingPathForSession } from "../auth/landingPath";
import { getStore, replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";

const dialogProto = Object.getPrototypeOf(document.createElement("dialog")) as HTMLDialogElement;
if (typeof dialogProto.showModal !== "function") {
  dialogProto.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  dialogProto.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
}

const user = { id: "u-admin", phone: "+84900000001", display_name: "Cô Lan", must_change_password: false };
const full = { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "write", comments_reports: "write" } as const;
const adminMembership = { id: "m-admin", status: "active" as const, scope_epoch: 1, workspace: { id: "w1", name: "Lớp cô Lan" }, role: { id: "r-admin", name: "Admin", system_key: "admin", scope_kind: "workspace" as const }, permissions: full };
const teacherMembership = { ...adminMembership, id: "m-teacher", role: { id: "r-teacher", name: "Giáo viên", system_key: "teacher", scope_kind: "assigned_classes" as const }, class_ids: ["c1"] };
const guardianMembership = { ...adminMembership, id: "m-guardian", role: { id: "r-g", name: "Phụ huynh", system_key: null, scope_kind: "linked_students" as const }, students: [] };
const me = (memberships: MeResponse["memberships"], active: string | null): MeResponse => ({ user, active_membership_id: active, memberships });

const staff = (patch: Partial<StaffMember> & Pick<StaffMember, "id">): StaffMember => ({
  kind: "member", user_id: "u", display_name: "Cô Hoa", phone: "+84900000002", role: { id: "r-teacher", name: "Giáo viên", system_key: "teacher" },
  class_ids: [], status: "active", is_self: false, created_at: "2026-10-28T00:00:00Z", version: 3, ...patch,
});
const perms = (): RolePermissionsItem[] => [
  { role: { id: "r-teacher", name: "Giáo viên", system_key: "teacher" }, permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", comments_reports: "write" } },
  { role: { id: "r-asst", name: "Trợ giảng", system_key: "assistant" }, permissions: { classes: "read", students: "read", sessions_attendance: "write", scores: "read", comments_reports: "write" } },
];
let members: StaffMember[];
const apiError = (status: number, code: string, details?: Record<string, unknown>) => new ApiError(status, { code, message: "x", request_id: "t", details });

async function startAs(memberships: MeResponse["memberships"], active: string) {
  await clearSession();
  await activateSession("tok", user, me(memberships, active), active);
  replaceStore({ ...getStore(), classes: createSeed().classes.slice(0, 2) });
}
const renderPage = () => render(<MemoryRouter><StaffPage /></MemoryRouter>);
const calls = (endpoint: string) => request.mock.calls.filter(([e]) => e === endpoint);

beforeEach(() => {
  members = [
    staff({ id: "m-admin", display_name: "Cô Lan", role: { id: "r-admin", name: "Admin", system_key: "admin" }, is_self: true }),
    staff({ id: "m-hoa", display_name: "Cô Hoa", class_ids: [] }),
    staff({ id: "p-1", kind: "pending", user_id: null, display_name: "Thầy Nam", status: "pending", role: { id: "r-asst", name: "Trợ giảng", system_key: "assistant" } }),
  ];
  request.mockReset().mockImplementation(async (endpoint: string) => {
    if (endpoint === "GET /staff") return { items: members };
    if (endpoint === "GET /roles/permissions") return { items: perms() };
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
});

describe("Nhân sự (Admin)", () => {
  it("non-admin gets no access and never calls the staff API", async () => {
    await startAs([teacherMembership], "m-teacher");
    renderPage();
    expect(await screen.findByText(/không có quyền xem mục nhân sự/i)).toBeTruthy();
    expect(calls("GET /staff")).toHaveLength(0);
  });

  it("lists staff with role and pending status, and the two-role permission matrix", async () => {
    await startAs([adminMembership], "m-admin");
    renderPage();
    expect(await screen.findByText("Cô Hoa")).toBeTruthy();
    expect(screen.getByText("Chờ đặt mật khẩu")).toBeTruthy();
    expect(screen.getByText("Cô Lan (bạn)")).toBeTruthy();
    const asst = screen.getByRole("region", { name: "Quyền Trợ giảng" });
    expect(within(asst).getAllByRole("tablist")).toHaveLength(5);
    expect(screen.getByRole("region", { name: "Quyền Giáo viên" })).toBeTruthy();
  });

  it("adds a person by phone with name, role and classes", async () => {
    await startAs([adminMembership], "m-admin");
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      if (endpoint === "POST /staff") return staff({ id: "p-2", kind: "pending", status: "pending" });
      throw new Error(endpoint);
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Thêm nhân sự" }));
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0900000007" } });
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Cô Mai" } });
    fireEvent.click(screen.getByRole("tab", { name: "Trợ giảng", selected: false }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));
    await waitFor(() => expect(calls("POST /staff")).toHaveLength(1));
    const body = (calls("POST /staff")[0][1] as { body: Record<string, unknown> }).body;
    expect(body).toMatchObject({ phone: "+84900000007", display_name: "Cô Mai", role: "assistant" });
    expect(body.class_ids).toEqual([createSeed().classes[0].id]);
  });

  it("explains a disabled duplicate instead of a generic error", async () => {
    await startAs([adminMembership], "m-admin");
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      throw apiError(409, "conflict", { reason: "staff_exists", status: "disabled", id: "m-hoa" });
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Thêm nhân sự" }));
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0900000002" } });
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Cô Hoa" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));
    expect(await screen.findByText(/đang bị tắt quyền/i)).toBeTruthy();
  });

  it("edits role with base_version, disables, and cancels a pending declaration", async () => {
    await startAs([adminMembership], "m-admin");
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      if (endpoint.startsWith("PATCH /staff/")) return staff({ id: "m-hoa" });
      if (endpoint.startsWith("DELETE /staff/")) return undefined;
      throw new Error(endpoint);
    });
    renderPage();
    fireEvent.click((await screen.findByText("Cô Hoa")).closest("button")!);
    fireEvent.click(screen.getByRole("tab", { name: "Trợ giảng", selected: false }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(calls("PATCH /staff/m-hoa")).toHaveLength(1));
    expect((calls("PATCH /staff/m-hoa")[0][1] as { body: unknown }).body).toEqual({ role: "assistant", base_version: 3 });

    fireEvent.click((await screen.findByText("Cô Hoa")).closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Tắt quyền" }));
    await waitFor(() => expect(calls("PATCH /staff/m-hoa")).toHaveLength(2));
    expect((calls("PATCH /staff/m-hoa")[1][1] as { body: unknown }).body).toEqual({ status: "disabled", base_version: 3 });

    fireEvent.click((await screen.findByText("Thầy Nam")).closest("button")!);
    expect(screen.queryByRole("button", { name: "Tắt quyền" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Huỷ khai báo" }));
    await waitFor(() => expect(calls("DELETE /staff/p-1")).toHaveLength(1));
  });

  it("does not offer to disable or edit yourself", async () => {
    await startAs([adminMembership], "m-admin");
    renderPage();
    fireEvent.click((await screen.findByText("Cô Lan (bạn)")).closest("button")!);
    expect(screen.queryByRole("button", { name: "Tắt quyền" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lưu" })).toBeNull();
  });

  it("saves only the changed permission groups of a role", async () => {
    await startAs([adminMembership], "m-admin");
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      if (endpoint === "PUT /roles/assistant/permissions") return { ...perms()[1], permissions: { ...perms()[1].permissions, scores: "write", comments_reports: "none" } };
      throw new Error(endpoint);
    });
    renderPage();
    const asst = await screen.findByRole("region", { name: "Quyền Trợ giảng" });
    fireEvent.click(within(within(asst).getByRole("tablist", { name: "Trợ giảng: Điểm" })).getByRole("tab", { name: "Sửa" }));
    fireEvent.click(within(within(asst).getByRole("tablist", { name: "Trợ giảng: Nhận xét và báo cáo" })).getByRole("tab", { name: "Không" }));
    fireEvent.click(within(asst).getByRole("button", { name: "Lưu quyền" }));
    await waitFor(() => expect(calls("PUT /roles/assistant/permissions")).toHaveLength(1));
    expect((calls("PUT /roles/assistant/permissions")[0][1] as { body: unknown }).body).toEqual({ permissions: { scores: "write", comments_reports: "none" } });
  });

  it("explains a last-admin conflict", async () => {
    await startAs([adminMembership], "m-admin");
    members = [...members, staff({ id: "m-admin-2", display_name: "Thầy An", role: { id: "r-admin", name: "Admin", system_key: "admin" } })];
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      throw apiError(409, "conflict", { reason: "last_admin" });
    });
    renderPage();
    fireEvent.click((await screen.findByText("Thầy An")).closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Tắt quyền" }));
    expect(await screen.findByText("Phải còn ít nhất một Admin.")).toBeTruthy();
  });
});

describe("Nhân sự: thu hồi quyền và trạng thái", () => {
  it("drops the list and editor when a write returns 403", async () => {
    await startAs([adminMembership], "m-admin");
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      if (endpoint === "GET /me") return me([adminMembership], "m-admin");
      throw apiError(403, "forbidden", { reason: "admin_required" });
    });
    renderPage();
    fireEvent.click((await screen.findByText("Cô Hoa")).closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Tắt quyền" }));
    await waitFor(() => expect(screen.queryByText("Cô Hoa")).toBeNull());
    expect(screen.queryByText("+84900000002")).toBeNull();
    expect(screen.getByRole("alert").textContent).toMatch(/Chỉ Admin/);
  });

  it("reloads when the active membership changes", async () => {
    await startAs([adminMembership, { ...adminMembership, id: "m-admin-b" }], "m-admin");
    renderPage();
    await screen.findByText("Cô Hoa");
    expect(calls("GET /staff")).toHaveLength(1);
    const { updateMe } = await import("../../data/auth/session");
    await updateMe(me([adminMembership, { ...adminMembership, id: "m-admin-b" }], "m-admin-b"));
    await waitFor(() => expect(calls("GET /staff")).toHaveLength(2));
  });

  it("locks the matrix cells while a save is in flight", async () => {
    await startAs([adminMembership], "m-admin");
    let release: () => void = () => undefined;
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "GET /staff") return { items: members };
      if (endpoint === "GET /roles/permissions") return { items: perms() };
      await new Promise<void>((r) => { release = r; });
      return { ...perms()[1], permissions: { ...perms()[1].permissions, scores: "write" } };
    });
    renderPage();
    const asst = await screen.findByRole("region", { name: "Quyền Trợ giảng" });
    fireEvent.click(within(within(asst).getByRole("tablist", { name: "Trợ giảng: Điểm" })).getByRole("tab", { name: "Sửa" }));
    fireEvent.click(within(asst).getByRole("button", { name: "Lưu quyền" }));
    await waitFor(() => expect(within(asst).getByRole("tablist", { name: "Trợ giảng: Học sinh" }).querySelector("[aria-disabled=true]")).toBeTruthy());
    release();
  });
});

describe("Đặt mật khẩu lần đầu của nhân sự", () => {
  const registerResponse = (memberships: MeResponse["memberships"], active: string | null) => ({ token: "tok", expires_at: "2099-01-01T00:00:00Z", user, memberships, active_membership_id: active });

  it("two roles (staff and guardian) with no active membership go to the role picker", async () => {
    await clearSession();
    const both = [teacherMembership, guardianMembership];
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/register-guardian") return registerResponse(both, null);
      if (endpoint === "GET /me") return me(both, null);
      throw new Error(endpoint);
    });
    await registerParent("+84900000001", "fixture-password");
    expect(getSession()?.activeMembershipId).toBeNull();
    expect(landingPathForSession(getSession())).toBe("/chon-vai-tro");
    expect(calls("PUT /session/membership")).toHaveLength(0);
  });

  it("a single staff role is selected automatically", async () => {
    await clearSession();
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/register-guardian") return registerResponse([teacherMembership], null);
      if (endpoint === "GET /me") return me([teacherMembership], null);
      if (endpoint === "PUT /session/membership") return { active_membership_id: "m-teacher", device_registration_cleared: true };
      throw new Error(endpoint);
    });
    await registerParent("+84900000001", "fixture-password");
    expect(getSession()?.activeMembershipId).toBe("m-teacher");
    expect(landingPathForSession(getSession())).toBe("/lop");
  });
});
