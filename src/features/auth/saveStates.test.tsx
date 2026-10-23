import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MeResponse } from "../../data/api/types";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../data/sync", () => ({ api: { request }, syncNow: vi.fn(), scheduleSync: vi.fn(), clearUserCache: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../data/outbox", () => ({ beginLogout: vi.fn(), cancelLogout: vi.fn(), clearLogoutLock: vi.fn().mockResolvedValue(undefined), pendingCommandCount: vi.fn().mockResolvedValue(0) }));

import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import SettingsPage from "../settings/SettingsPage";
import ChangePasswordPage from "../settings/ChangePasswordPage";
import { clearSession } from "../../data/auth/session";
import { login } from "../../data/auth";

const staff: MeResponse["memberships"][number] = { id: "staff-1", workspace: { id: "w1", name: "Lớp của cô Lan" }, role: { id: "r1", name: "Giáo viên", system_key: null, scope_kind: "workspace" as const }, status: "active" as const, scope_epoch: 1, permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "read", comments_reports: "write" } };
const user = { id: "user-1", phone: "+84900000001", display_name: "Cô Lan", must_change_password: false };
const me = (): MeResponse => ({ user, active_membership_id: staff.id, memberships: [staff] });
const sessionResponse = () => ({ token: "test-token", expires_at: "2099-01-01T00:00:00Z", user, memberships: [staff], active_membership_id: staff.id });

let release: (() => void) | null = null;
const slow = <T,>(value: T) => new Promise<T>((resolve) => { release = () => resolve(value); });

function Harness({ initial }: { initial: string }) {
  return <MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="/dang-nhap" element={<LoginPage/>}/><Route path="/dang-ky" element={<RegisterPage/>}/>
    <Route path="/lop" element={<h1>Khung nhân sự</h1>}/>
    <Route path="/cai-dat" element={<SettingsPage/>}/><Route path="/cai-dat/doi-mat-khau" element={<ChangePasswordPage/>}/>
  </Routes></MemoryRouter>;
}
const calls = (endpoint: string) => request.mock.calls.filter(([name]) => name === endpoint).length;
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(async () => {
  await clearSession(); release = null; request.mockReset();
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
});

describe("save states of account forms", () => {
  it("login stays disabled until the phone and password are valid, then sends once while busy", async () => {
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/login") return slow(sessionResponse());
      if (endpoint === "GET /me") return me();
      throw new Error(endpoint);
    });
    render(<Harness initial="/dang-nhap"/>);
    const submit = () => screen.getByRole("button", { name: /^(Đăng nhập|Đang đăng nhập…)$/ });
    expect(submit()).toBeDisabled();
    type("Số điện thoại", "900 000"); type("Mật khẩu", "secret");
    expect(submit()).toBeDisabled();
    type("Số điện thoại", "900 000 001");
    expect(submit()).toBeEnabled();
    fireEvent.click(submit()); fireEvent.click(submit());
    await waitFor(() => expect(submit()).toHaveAttribute("aria-busy", "true"));
    expect(calls("POST /auth/login")).toBe(1);
    release?.();
    expect(await screen.findByRole("heading", { name: "Khung nhân sự" })).toBeInTheDocument();
    expect(calls("POST /auth/login")).toBe(1);
  });

  it("register is disabled for an invalid form and a double click creates one account", async () => {
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/register") return slow(sessionResponse());
      if (endpoint === "GET /me") return me();
      throw new Error(endpoint);
    });
    render(<Harness initial="/dang-ky"/>);
    const submit = () => screen.getByRole("button", { name: /^(Tạo không gian làm việc|Đang tạo…)$/ });
    expect(submit()).toBeDisabled();
    type("Tên hiển thị", "Cô Lan"); type("Tên không gian làm việc", "Lớp của cô Lan");
    type("Số điện thoại", "900 000 001"); type("Mật khẩu", "Matkhau!123");
    type("Nhập lại mật khẩu", "khac-nhau");
    expect(submit()).toBeDisabled();
    type("Nhập lại mật khẩu", "Matkhau!123");
    expect(submit()).toBeEnabled();
    fireEvent.click(submit()); fireEvent.click(submit());
    await waitFor(() => expect(submit()).toHaveAttribute("aria-busy", "true"));
    expect(calls("POST /auth/register")).toBe(1);
    release?.();
    expect(await screen.findByRole("heading", { name: "Khung nhân sự" })).toBeInTheDocument();
    expect(calls("POST /auth/register")).toBe(1);
  });

  it("change password needs a valid, different password and sends once while busy", async () => {
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/login") return sessionResponse();
      if (endpoint === "GET /me") return me();
      if (endpoint === "POST /auth/change-password") return slow({ must_change_password: false });
      throw new Error(endpoint);
    });
    await login("+84900000001", "x");
    render(<Harness initial="/cai-dat/doi-mat-khau"/>);
    const submit = () => screen.getByRole("button", { name: /Lưu mật khẩu mới|Đang lưu/ });
    expect(submit()).toBeDisabled();
    type("Mật khẩu hiện tại", "old-password"); type("Mật khẩu mới", "old-password"); type("Nhập lại mật khẩu mới", "old-password");
    expect(submit()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("khác mật khẩu hiện tại");
    type("Mật khẩu mới", "new-password!"); type("Nhập lại mật khẩu mới", "new-password!");
    expect(submit()).toBeEnabled();
    fireEvent.click(submit()); fireEvent.click(submit());
    await waitFor(() => expect(submit()).toHaveAttribute("aria-busy", "true"));
    expect(calls("POST /auth/change-password")).toBe(1);
    release?.();
    await waitFor(() => expect(calls("POST /auth/change-password")).toBe(1));
  });

  it("desktop settings clears the fields after saving and returns the button to disabled", async () => {
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    request.mockImplementation(async (endpoint: string) => {
      if (endpoint === "POST /auth/login") return sessionResponse();
      if (endpoint === "GET /me") return me();
      if (endpoint === "POST /auth/change-password") return { must_change_password: false };
      throw new Error(endpoint);
    });
    await login("+84900000001", "x");
    render(<Harness initial="/cai-dat"/>);
    const submit = () => screen.getByRole("button", { name: /Lưu mật khẩu mới|Đang lưu/ });
    expect(submit()).toBeDisabled();
    type("Mật khẩu hiện tại", "old-password"); type("Mật khẩu mới", "new-password!"); type("Nhập lại mật khẩu mới", "new-password!");
    expect(submit()).toBeEnabled();
    fireEvent.click(submit());
    expect(await screen.findByText("Đã lưu mật khẩu mới.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu hiện tại")).toHaveValue("");
    expect(submit()).toBeDisabled();
    expect(calls("POST /auth/change-password")).toBe(1);
  });
});
