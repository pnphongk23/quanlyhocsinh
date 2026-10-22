import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import type { MeResponse } from "../../data/api/types";

const { request, assertCanLogout } = vi.hoisted(() => ({ request: vi.fn(), assertCanLogout: vi.fn() }));
vi.mock("../../data/sync", () => ({ api: { request }, syncNow: vi.fn() }));
vi.mock("../../data/outbox", () => ({ assertCanLogout }));

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import RolePickerPage from "./RolePickerPage";
import SettingsPage from "../settings/SettingsPage";
import ChangePasswordPage from "../settings/ChangePasswordPage";
import { clearSession, getSession } from "../../data/auth/session";
import { login } from "../../data/auth";
import { accountRoutes } from "../../roles/account/routes";

const memberships: MeResponse["memberships"] = [
  { id: "staff-1", workspace: { id: "w1", name: "Lớp của cô Lan" }, role: { id: "r1", name: "Giáo viên", system_key: null, scope_kind: "workspace" as const }, status: "active" as const, scope_epoch: 1, permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "read", comments_reports: "write" } },
  { id: "guardian-1", workspace: { id: "w2", name: "Lớp của cô Mai" }, role: { id: "r2", name: "Phụ huynh", system_key: null, scope_kind: "linked_students" as const }, status: "active" as const, scope_epoch: 1, permissions: { classes: "none", students: "none", sessions_attendance: "read", scores: "read", lectures: "none", comments_reports: "read" } },
];
const user = { id: "user-1", phone: "+84900000001", display_name: "Cô Lan", must_change_password: false };
let activeMembershipId: string | null = memberships[0].id;
const me = (): MeResponse => ({ user, active_membership_id: activeMembershipId, memberships });
const loginResponse = () => ({ token: "test-token", expires_at: "2099-01-01T00:00:00Z", user, memberships, active_membership_id: activeMembershipId });
function Harness({ initial = "/dang-nhap" }: { initial?: string }) {
  return <MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="/dang-nhap" element={<LoginPage/>}/><Route path="/dang-ky" element={<RegisterPage/>}/>
    <Route path="/chon-vai-tro" element={<RolePickerPage/>}/><Route path="/lop" element={<h1>Khung nhân sự</h1>}/><Route path="/ph" element={<h1>Khung phụ huynh</h1>}/>
    <Route path="/cai-dat" element={<><SettingsPage/><Link to="/cai-dat/doi-mat-khau">Đổi mật khẩu</Link></>}/><Route path="/cai-dat/doi-mat-khau" element={<ChangePasswordPage/>}/>
  </Routes></MemoryRouter>;
}

beforeEach(async () => {
  await clearSession(); activeMembershipId = memberships[0].id; request.mockReset(); assertCanLogout.mockReset().mockResolvedValue(undefined);
  request.mockImplementation(async (endpoint: string, options?: { body?: { membership_id: string } }) => {
    if (endpoint === "POST /auth/login" || endpoint === "POST /auth/register") return loginResponse();
    if (endpoint === "GET /me") return me();
    if (endpoint === "PUT /session/membership") { activeMembershipId = options?.body?.membership_id ?? activeMembershipId; return { active_membership_id: activeMembershipId, device_registration_cleared: true }; }
    if (endpoint === "POST /auth/change-password") return { must_change_password: false };
    if (endpoint === "POST /auth/logout") return undefined;
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
});

describe("account and auth screens", () => {
  it("shows login errors and routes successful login to role selection", async () => {
    request.mockImplementationOnce(async () => { throw new Error("Số điện thoại hoặc mật khẩu chưa đúng."); });
    const { rerender } = render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "900 000 001" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Số điện thoại hoặc mật khẩu chưa đúng.");
    rerender(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "900 000 001" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("heading", { name: "Chọn vai trò" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("POST /auth/login", expect.objectContaining({ body: expect.objectContaining({ phone: "+84900000001" }) }));
  });

  it("registers a teacher through the workspace API", async () => {
    render(<Harness initial="/dang-ky"/>);
    fireEvent.change(screen.getByLabelText("Tên hiển thị"), { target: { value: "Cô Lan" } });
    fireEvent.change(screen.getByLabelText("Tên không gian làm việc"), { target: { value: "Lớp của cô Lan" } });
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "900 000 001" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Matkhau!123" } });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), { target: { value: "Matkhau!123" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo không gian làm việc" }));
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/register", expect.objectContaining({ body: expect.objectContaining({ workspace_name: "Lớp của cô Lan" }) })));
    expect(await screen.findByRole("heading", { name: "Khung nhân sự" })).toBeInTheDocument();
  });

  it("switches membership online, updates password, and has no mandatory-change route", async () => {
    // Establish a session through the real login page before opening account routes.
    const { unmount } = render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "900 000 001" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("heading", { name: "Chọn vai trò" })).toBeInTheDocument(); unmount();
    const roleView = render(<Harness initial="/chon-vai-tro"/>);
    fireEvent.click(screen.getByRole("button", { name: /Phụ huynh/ }));
    expect(await screen.findByRole("heading", { name: "Khung phụ huynh" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("PUT /session/membership", { body: { membership_id: "guardian-1" } });
    roleView.unmount();
    expect(accountRoutes.some(route => route.path === "/doi-mat-khau-bat-buoc")).toBe(false);
    await clearSession(); activeMembershipId = memberships[0].id; await login("+84900000001", "x"); expect(getSession()).not.toBeNull();
    render(<Harness initial="/cai-dat/doi-mat-khau"/>);
    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), { target: { value: "new-password!" } });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu mới"), { target: { value: "new-password!" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu mật khẩu mới" }));
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/change-password", expect.objectContaining({ body: { current_password: "old-password", new_password: "new-password!" } })));
  });

  it("keeps a signed-out visitor on login and blocks logout when outbox has pending work", async () => {
    const signedOutView = render(<Harness initial="/cai-dat/doi-mat-khau"/>);
    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    signedOutView.unmount();
    await login("+84900000001", "x");
    assertCanLogout.mockRejectedValueOnce(new Error("Còn 1 thay đổi chưa đồng bộ."));
    render(<Harness initial="/cai-dat"/>); fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Còn 1 thay đổi chưa đồng bộ."); expect(request).not.toHaveBeenCalledWith("POST /auth/logout", expect.anything());
  });

  it("ships a Vietnamese standalone manifest with both maskable icon sizes", () => {
    const manifest = JSON.parse(readFileSync(`${process.cwd()}/public/manifest.webmanifest`, "utf8"));
    expect(manifest.name).toBe("Quản lý lớp tiếng Anh");
    expect(manifest.lang).toBe("vi"); expect(manifest.theme_color).toBe("#2F5BEA"); expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map((icon: { sizes: string; purpose: string }) => [icon.sizes, icon.purpose])).toEqual([["192x192", "any maskable"], ["512x512", "any maskable"]]);
  });
});
