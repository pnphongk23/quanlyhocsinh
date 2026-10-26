import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import type { MeResponse } from "../../data/api/types";
import { ApiError } from "../../data/api/client";

const { request, beginLogout, cancelLogout, clearLogoutLock, pendingCommandCount, clearUserCache } = vi.hoisted(() => ({ request: vi.fn(), beginLogout: vi.fn(), cancelLogout: vi.fn(), clearLogoutLock: vi.fn(), pendingCommandCount: vi.fn(), clearUserCache: vi.fn() }));
vi.mock("../../data/sync", () => ({ api: { request }, syncNow: vi.fn(), scheduleSync: vi.fn(), clearUserCache }));
vi.mock("../../data/outbox", () => ({ beginLogout, cancelLogout, clearLogoutLock, pendingCommandCount }));

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import RolePickerPage from "./RolePickerPage";
import SettingsPage from "../settings/SettingsPage";
import ChangePasswordPage from "../settings/ChangePasswordPage";
import { clearSession, getSession } from "../../data/auth/session";
import { login, logout } from "../../data/auth";
import { accountRoutes } from "../../roles/account/routes";

// jsdom chưa cài `showModal`/`close` cho <dialog>; chỉ cần đủ để Modal mở/đóng.
const dialogProto = Object.getPrototypeOf(document.createElement("dialog")) as HTMLDialogElement;
if (typeof dialogProto.showModal !== "function") {
  dialogProto.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  dialogProto.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
}

const memberships: MeResponse["memberships"] = [
  { id: "staff-1", workspace: { id: "w1", name: "Lớp của cô Lan" }, role: { id: "r1", name: "Giáo viên", system_key: null, scope_kind: "workspace" as const }, status: "active" as const, scope_epoch: 1, permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "read", comments_reports: "write" } },
  { id: "guardian-1", workspace: { id: "w2", name: "Lớp của cô Mai" }, role: { id: "r2", name: "Phụ huynh", system_key: null, scope_kind: "linked_students" as const }, status: "active" as const, scope_epoch: 1, permissions: { classes: "none", students: "none", sessions_attendance: "read", scores: "read", lectures: "none", comments_reports: "read" } },
];
const user = { id: "user-1", phone: "+84900000001", display_name: "Cô Lan", must_change_password: false };
let activeMembershipId: string | null = memberships[0].id;
let registeredTeacher = false;
let rejectLogin = false;
let served: MeResponse["memberships"] = memberships;
const me = (): MeResponse => ({ user, active_membership_id: activeMembershipId, memberships: served });
const loginResponse = () => ({ token: "test-token", expires_at: "2099-01-01T00:00:00Z", user, memberships: served, active_membership_id: activeMembershipId });
function Harness({ initial = "/dang-nhap" }: { initial?: string }) {
  return <MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="/dang-nhap" element={<LoginPage/>}/><Route path="/dang-ky" element={<RegisterPage/>}/>
    <Route path="/chon-vai-tro" element={<RolePickerPage/>}/><Route path="/lop" element={<h1>Khung nhân sự</h1>}/><Route path="/ph" element={<h1>Khung phụ huynh</h1>}/>
    <Route path="/cai-dat" element={<><SettingsPage/><Link to="/cai-dat/doi-mat-khau">Đổi mật khẩu</Link></>}/><Route path="/cai-dat/doi-mat-khau" element={<ChangePasswordPage/>}/>
  </Routes></MemoryRouter>;
}

beforeEach(async () => {
  await clearSession(); served = memberships; activeMembershipId = memberships[0].id; registeredTeacher = false; rejectLogin = false; request.mockReset(); clearUserCache.mockReset().mockResolvedValue(undefined); beginLogout.mockReset().mockResolvedValue(undefined); cancelLogout.mockReset().mockResolvedValue(undefined); clearLogoutLock.mockReset().mockResolvedValue(undefined); pendingCommandCount.mockReset().mockResolvedValue(0);
  request.mockImplementation(async (endpoint: string, options?: { body?: { membership_id: string } }) => {
    if (endpoint === "POST /auth/phone-check") return { next: "login" };
    if (endpoint === "POST /auth/login") { if (rejectLogin) { rejectLogin = false; throw new ApiError(401, { code: "invalid_credentials", message: "Sai thông tin", request_id: "test" }); } return loginResponse(); }
    if (endpoint === "POST /auth/register") {
      activeMembershipId = memberships[0].id;
      registeredTeacher = true;
      return { ...loginResponse(), memberships: [memberships[0]], active_membership_id: activeMembershipId };
    }
    if (endpoint === "GET /me") {
      if (registeredTeacher) {
        registeredTeacher = false;
        return { user, active_membership_id: memberships[0].id, memberships: [memberships[0]] };
      }
      return me();
    }
    if (endpoint === "PUT /session/membership") { activeMembershipId = options?.body?.membership_id ?? activeMembershipId; return { active_membership_id: activeMembershipId, device_registration_cleared: true }; }
    if (endpoint === "POST /auth/change-password") return { must_change_password: false };
    if (endpoint === "POST /auth/logout") return undefined;
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
});

/** Bước 1 của đăng nhập: nhập SĐT, Tiếp tục, chờ ô mật khẩu. */
async function enterPhone(value: string) {
  fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
  await screen.findByLabelText("Mật khẩu");
}

describe("account and auth screens", () => {
  it("shows login errors and routes successful login to role selection", async () => {
    rejectLogin = true;
    const { rerender } = render(<Harness/>);
    await enterPhone("0900 000 001");
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Số điện thoại hoặc mật khẩu chưa đúng.");
    rerender(<Harness/>);
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByRole("heading", { name: "Chọn vai trò" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("POST /auth/login", expect.objectContaining({ body: expect.objectContaining({ phone: "+84900000001" }) }));
  });

  async function loginAs(roles: MeResponse["memberships"], active: string | null) {
    served = roles; activeMembershipId = active;
    render(<Harness/>);
    await enterPhone("0900 000 001");
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "correct horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  }

  it("skips the role picker when the account has no role and opens the guardian frame", async () => {
    await loginAs([], null);
    expect(await screen.findByRole("heading", { name: "Khung phụ huynh" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chọn vai trò" })).not.toBeInTheDocument();
  });

  it("sends a signed-in account without roles from the picker to the guardian frame", async () => {
    served = []; activeMembershipId = null;
    await login("+84900000001", "x");
    render(<Harness initial="/chon-vai-tro"/>);
    expect(await screen.findByRole("heading", { name: "Khung phụ huynh" })).toBeInTheDocument();
  });

  it("goes straight to the only role without showing the picker", async () => {
    await loginAs([memberships[0]], memberships[0].id);
    expect(await screen.findByRole("heading", { name: "Khung nhân sự" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chọn vai trò" })).not.toBeInTheDocument();
  });

  it("selects the only role itself when the server has no active membership yet", async () => {
    served = [memberships[1]]; activeMembershipId = null;
    await login("+84900000001", "x");
    render(<Harness initial="/chon-vai-tro"/>);
    expect(await screen.findByRole("heading", { name: "Khung phụ huynh" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chọn vai trò" })).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("PUT /session/membership", expect.objectContaining({ body: { membership_id: "guardian-1" } }));
  });

  it("shows the picker with the plural wording only for two or more roles", async () => {
    await loginAs(memberships, null);
    expect(await screen.findByRole("heading", { name: "Chọn vai trò" })).toBeInTheDocument();
    expect(screen.getByText(/có hơn một vai trò/)).toBeInTheDocument();
  });

  it("login phone step has no app-name line, role copy or register links", () => {
    render(<Harness/>);
    expect(screen.queryByText("Quản lý lớp tiếng Anh")).toBeNull();
    expect(screen.queryByText(/Dành cho giáo viên và phụ huynh/)).toBeNull();
    expect(screen.queryByText(/Tạo tài khoản/)).toBeNull();
    expect(screen.queryByLabelText("Mật khẩu")).toBeNull();
  });

  it.each(["0900000001", "+84 900 000 001", "84900000001", "(0900) 000-001"])("normalizes %s before asking the server", async (typed) => {
    render(<Harness/>);
    await enterPhone(typed);
    expect(request).toHaveBeenCalledWith("POST /auth/phone-check", expect.objectContaining({ body: { phone: "+84900000001" } }));
  });

  it("reports a malformed phone only after Tiếp tục and does not call the server", async () => {
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "12 34" } });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Số điện thoại không hợp lệ.");
    expect(request).not.toHaveBeenCalledWith("POST /auth/phone-check", expect.anything());
  });

  it("shows the rate-limit message from the phone check", async () => {
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/phone-check") throw new ApiError(429, { code: "rate_limited", message: "x", request_id: "t" }); throw new Error(endpoint); });
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0900000001" } });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("quá nhiều lần");
  });

  it("password step offers Đổi số back to the phone step and Quên mật khẩu with the number", async () => {
    render(<Harness/>);
    await enterPhone("0900 000 001");
    expect(screen.getByRole("link", { name: "Quên mật khẩu?" })).toHaveAttribute("href", "/quen-mat-khau?sdt=%2B84900000001");
    fireEvent.click(screen.getByRole("button", { name: "Đổi số" }));
    expect(screen.queryByLabelText("Mật khẩu")).toBeNull();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeInTheDocument();
  });

  it("a declared parent phone opens the set-password screen and registers as a guardian without a name", async () => {
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/phone-check") return { next: "guardian_setup" };
      if (endpoint === "POST /auth/register-guardian") return { ...loginResponse(), memberships: [memberships[1]], active_membership_id: memberships[1].id };
      if (endpoint === "GET /me") return { user, active_membership_id: memberships[1].id, memberships: [memberships[1]] };
      throw new Error(endpoint);
    });
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "0900 000 001" } });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByRole("heading", { name: "Đặt mật khẩu" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tên hiển thị")).toBeNull();
    expect(screen.getByLabelText("Số điện thoại")).toHaveValue("900 000 001");
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Matkhau!123" } });
    fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), { target: { value: "Matkhau!123" } });
    fireEvent.click(screen.getByRole("button", { name: "Vào ứng dụng" }));
    expect(await screen.findByRole("heading", { name: "Khung phụ huynh" })).toBeInTheDocument();
    const call = request.mock.calls.find(([name]) => name === "POST /auth/register-guardian");
    expect(call?.[1].body).toEqual({ phone: "+84900000001", password: "Matkhau!123" });
  });

  it("an unknown phone opens teacher registration with the phone filled in", async () => {
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/phone-check") return { next: "teacher_register" }; throw new Error(endpoint); });
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "+84 900 000 001" } });
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(await screen.findByRole("heading", { name: "Tạo không gian làm việc" })).toBeInTheDocument();
    expect(screen.getByLabelText("Số điện thoại")).toHaveValue("900 000 001");
    expect(screen.queryByText("Phụ huynh")).toBeNull();
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
    await enterPhone("0900 000 001");
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

  it("gives a guardian a back button from mobile settings to the guardian frame", async () => {
    served = [memberships[1]]; activeMembershipId = "guardian-1";
    await login("+84900000001", "x");
    render(<Harness initial="/cai-dat"/>);
    expect(await screen.findByRole("link", { name: "Quay lại" })).toHaveAttribute("href", "/ph");
  });

  it("keeps a signed-out visitor on login and blocks logout when outbox has pending work", async () => {
    const signedOutView = render(<Harness initial="/cai-dat/doi-mat-khau"/>);
    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
    signedOutView.unmount();
    await login("+84900000001", "x");
    pendingCommandCount.mockResolvedValue(1);
    render(<Harness initial="/cai-dat"/>); fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(await screen.findByText(/Còn 1 thay đổi chưa đồng bộ/)).toBeInTheDocument();
    expect(screen.getByLabelText("Chưa thể đăng xuất")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalledWith("POST /auth/logout", expect.anything());
  });

  it("clears the user cache only after the server confirms logout", async () => {
    await login("+84900000001", "fixture-password");
    let confirmLogout!: (value: undefined) => void;
    request.mockImplementationOnce(() => new Promise<undefined>((resolve) => { confirmLogout = resolve; }));

    const pendingLogout = logout();
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/logout"));
      expect(beginLogout).toHaveBeenCalledWith(user.id);
    expect(clearUserCache).not.toHaveBeenCalled();

    confirmLogout(undefined);
    await pendingLogout;
    expect(clearUserCache).toHaveBeenCalledWith(user.id);
  });

  it("ships a Vietnamese standalone manifest with the primary and maskable icons", () => {
    const manifest = JSON.parse(readFileSync(`${process.cwd()}/public/manifest.webmanifest`, "utf8"));
    expect(manifest.name).toBe("Quản lý lớp tiếng Anh");
    expect(manifest.lang).toBe("vi");
    expect(manifest.theme_color).toBe("#2f5bea");
    expect(manifest.background_color).toBe("#2f5bea");
    expect(manifest.display).toBe("standalone");
    expect(
      manifest.icons.map((icon: { sizes: string; purpose: string }) => [icon.sizes, icon.purpose]),
    ).toEqual([["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]]);
  });
});
