import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { MeResponse } from "../../data/api/types";
import { ApiError } from "../../data/api/client";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../data/sync", () => ({ api: { request }, syncNow: vi.fn(), scheduleSync: vi.fn(), clearUserCache: vi.fn() }));
vi.mock("../../data/outbox", () => ({ beginLogout: vi.fn(), cancelLogout: vi.fn(), clearLogoutLock: vi.fn().mockResolvedValue(undefined), pendingCommandCount: vi.fn().mockResolvedValue(0) }));

import RegisterPage from "./RegisterPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import SettingsPage from "../settings/SettingsPage";
import { clearSession, getSession } from "../../data/auth/session";
import { login, logout } from "../../data/auth";
import { rememberedEmailFor } from "../../data/auth/rememberedEmail";

const dialogProto = Object.getPrototypeOf(document.createElement("dialog")) as HTMLDialogElement;
if (typeof dialogProto.showModal !== "function") {
  dialogProto.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  dialogProto.close = function close(this: HTMLDialogElement) { this.removeAttribute("open"); };
}

const apiError = (status: number, code: string, details?: Record<string, unknown>) => new ApiError(status, { code, message: code, request_id: "t", ...(details ? { details } : {}) } as never);
const membership: MeResponse["memberships"][number] = { id: "staff-1", workspace: { id: "w1", name: "Lớp của cô Lan" }, role: { id: "r1", name: "Giáo viên", system_key: null, scope_kind: "workspace" }, status: "active", scope_epoch: 1, permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "read", comments_reports: "write" } };
let account = { id: "user-1", phone: "+84900000001", display_name: "Cô Lan", must_change_password: false, email: "co.lan@example.com" as string | null };
const me = (): MeResponse => ({ user: account, active_membership_id: membership.id, memberships: [membership] });
const loginResponse = () => ({ token: "t0k3n", expires_at: "2099-01-01T00:00:00Z", user: account, memberships: [membership], active_membership_id: membership.id });
const defaults = async (endpoint: string) => {
  if (endpoint === "POST /auth/login" || endpoint === "POST /auth/register") return loginResponse();
  if (endpoint === "GET /me") return me();
  if (endpoint === "POST /auth/logout") return undefined;
  throw new Error(`Unexpected endpoint: ${endpoint}`);
};
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const slow = { timeout: 4000 };

beforeEach(async () => {
  localStorage.clear();
  await clearSession();
  account = { id: "user-1", phone: "+84900000001", display_name: "Cô Lan", must_change_password: false, email: "co.lan@example.com" };
  request.mockReset().mockImplementation(defaults);
});

describe("register with optional email", () => {
  const fill = () => {
    type("Tên hiển thị", "Cô Lan"); type("Tên không gian làm việc", "Lớp của cô Lan"); type("Số điện thoại", "900 000 001");
    type("Mật khẩu", "Matkhau!123"); type("Nhập lại mật khẩu", "Matkhau!123");
  };
  const page = () => render(<MemoryRouter initialEntries={["/dang-ky"]}><Routes><Route path="/dang-ky" element={<RegisterPage/>}/><Route path="/lop" element={<h1>Khung nhân sự</h1>}/></Routes></MemoryRouter>);

  it("sends the email when given and remembers it for the phone", async () => {
    page(); fill(); type(/Email/, "  Co.Lan@Example.com ");
    click("Tạo không gian làm việc");
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/register", expect.objectContaining({ body: expect.objectContaining({ email: "Co.Lan@Example.com" }) })), slow);
    await screen.findByRole("heading", { name: "Khung nhân sự" }, slow);
    expect(rememberedEmailFor("+84900000001")).toBe("co.lan@example.com");
  });

  it("leaves the email out when empty", async () => {
    page(); fill(); click("Tạo không gian làm việc");
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/register", expect.objectContaining({ body: expect.not.objectContaining({ email: expect.anything() }) })), slow);
  });

  it("shows invalid_email at the email field and keeps the form", async () => {
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/register") throw apiError(422, "validation_failed", { fields: { email: "invalid_email" } }); return defaults(endpoint); });
    page(); fill(); type(/Email/, "ten@khong-hop-le.com"); click("Tạo không gian làm việc");
    const alert = await screen.findByRole("alert", {}, slow);
    expect(alert).toHaveTextContent("Email chưa đúng định dạng.");
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/Email/)).toHaveValue("ten@khong-hop-le.com");
  });
});

describe("email in settings", () => {
  const open = async () => {
    await login("+84900000001", "x");
    render(<MemoryRouter initialEntries={["/cai-dat"]}><Routes><Route path="/cai-dat" element={<SettingsPage/>}/><Route path="/dang-nhap" element={<h1>Đăng nhập</h1>}/></Routes></MemoryRouter>);
  };

  it("shows the saved email and why it exists", async () => {
    await open();
    const section = screen.getByRole("region", { name: "Email khôi phục" });
    expect(within(section).getByText("co.lan@example.com")).toBeInTheDocument();
    expect(within(section).getByText("Email chỉ dùng để lấy lại mật khẩu.")).toBeInTheDocument();
  });

  it("needs the current password to save and reports a wrong password at the password field", async () => {
    await open();
    click("Sửa email");
    type("Email", "moi@example.com");
    expect(screen.getByRole("button", { name: "Lưu email" })).toBeDisabled();
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "PUT /me/email") throw apiError(401, "invalid_credentials"); return defaults(endpoint); });
    type("Mật khẩu hiện tại", "sai-mat-khau");
    click("Lưu email");
    expect(await screen.findByText("Mật khẩu hiện tại chưa đúng.", {}, slow)).toBeInTheDocument();
    expect(screen.getByLabelText("Mật khẩu hiện tại")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveValue("moi@example.com");
    expect(rememberedEmailFor("+84900000001")).toBe("co.lan@example.com");
  });

  it("tells the user to retry later on 429", async () => {
    await open();
    click("Sửa email"); type("Email", "moi@example.com"); type("Mật khẩu hiện tại", "x");
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "PUT /me/email") throw apiError(429, "rate_limited"); return defaults(endpoint); });
    click("Lưu email");
    expect(await screen.findByText("Bạn thử quá nhiều lần. Hãy chờ khoảng 1 phút rồi thử lại.", {}, slow)).toBeInTheDocument();
  });

  it("saves a new email, updates the display and the remembered email", async () => {
    await open();
    request.mockImplementation(async (endpoint: string, options?: { body?: { email: string } }) => { if (endpoint === "PUT /me/email") return { email: options?.body?.email }; return defaults(endpoint); });
    click("Sửa email"); type("Email", "Moi@Example.com"); type("Mật khẩu hiện tại", "Matkhau!123");
    click("Lưu email");
    await waitFor(() => expect(request).toHaveBeenCalledWith("PUT /me/email", { body: { email: "Moi@Example.com", current_password: "Matkhau!123" } }), slow);
    await waitFor(() => expect(getSession()?.user.email).toBe("Moi@Example.com"), slow);
    expect(rememberedEmailFor("+84900000001")).toBe("Moi@Example.com");
    expect(await screen.findByText("Moi@Example.com", {}, slow)).toBeInTheDocument();
  });

  it("removes the email with the password and forgets it on this device", async () => {
    await open();
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "PUT /me/email") return { email: null }; return defaults(endpoint); });
    click("Xoá email"); expect(screen.queryByLabelText("Email")).toBeNull();
    type("Mật khẩu hiện tại", "Matkhau!123");
    fireEvent.click(screen.getAllByRole("button", { name: "Xoá email" })[0]);
    await waitFor(() => expect(request).toHaveBeenCalledWith("PUT /me/email", { body: { email: null, current_password: "Matkhau!123" } }), slow);
    await waitFor(() => expect(rememberedEmailFor("+84900000001")).toBe(""), slow);
    expect(await screen.findByText("Chưa có", {}, slow)).toBeInTheDocument();
  });
});

describe("email remembered per phone", () => {
  it("keeps each account's email under its own phone and survives logout", async () => {
    await login("+84900000001", "x");
    account = { id: "user-2", phone: "+84911111111", display_name: "Mẹ Minh", must_change_password: false, email: "me.minh@example.com" };
    await login("+84911111111", "x");
    expect(rememberedEmailFor("+84911111111")).toBe("me.minh@example.com");
    expect(rememberedEmailFor("+84900000001")).toBe("co.lan@example.com");
    expect(rememberedEmailFor("0922 222 222")).toBe("");
    await logout();
    expect(getSession()).toBeNull();
    expect(rememberedEmailFor("+84 911 111 111")).toBe("me.minh@example.com");
  });

  it("drops the entry when /me reports no email, and ignores servers that omit the field", async () => {
    await login("+84900000001", "x");
    account = { ...account, email: null };
    await login("+84900000001", "x");
    expect(rememberedEmailFor("+84900000001")).toBe("");
    localStorage.setItem("qlh.account-email.v1", JSON.stringify({ "+84900000001": "giu@example.com" }));
    const { email: _omitted, ...legacy } = account;
    void _omitted;
    request.mockImplementation(async (endpoint: string) => endpoint === "GET /me" ? { ...me(), user: legacy } : endpoint === "POST /auth/login" ? { ...loginResponse(), user: legacy } : defaults(endpoint));
    await login("+84900000001", "x");
    expect(rememberedEmailFor("+84900000001")).toBe("giu@example.com");
  });
});

describe("forgot password", () => {
  const page = (path = "/quen-mat-khau") => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/quen-mat-khau" element={<ForgotPasswordPage/>}/><Route path="/dang-nhap" element={<h1>Đăng nhập</h1>}/></Routes></MemoryRouter>);
  const lookup = (result: object | Error) => request.mockImplementation(async (endpoint: string) => {
    if (endpoint === "POST /auth/password-reset/lookup") { if (result instanceof Error) throw result; return result; }
    if (endpoint === "POST /auth/password-reset/request") return { sent: true };
    return defaults(endpoint);
  });
  const next = async (phone = "900 000 001") => { type("Số điện thoại", phone); click("Tiếp tục"); };

  it("reports that no account uses the phone, and offers no way to add an email", async () => {
    lookup({ account: false, has_email: false, email_masked: null }); page(); await next();
    expect(await screen.findByText("Không có tài khoản dùng số điện thoại này.", {}, slow)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
  });

  it("sends the operator message when the account has no email", async () => {
    lookup({ account: true, has_email: false, email_masked: null }); page(); await next();
    expect(await screen.findByText(/liên hệ người vận hành/i, {}, slow)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi link" })).toBeNull();
  });

  it("asks to confirm the masked email, sends the typed email and shows the 30 minute notice", async () => {
    lookup({ account: true, has_email: true, email_masked: "c***@example.com" }); page(); await next();
    expect(await screen.findByText("Gửi link đặt lại mật khẩu tới c***@example.com?", {}, slow)).toBeInTheDocument();
    expect(screen.getByLabelText("Nhập email đã lưu")).toHaveValue("");
    type("Nhập email đã lưu", "co.lan@example.com"); click("Gửi link");
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/password-reset/request", { body: { phone: "+84900000001", email: "co.lan@example.com" }, anonymous: true }), slow);
    expect(await screen.findByText(/Đã gửi link, hạn 30 phút/, {}, slow)).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("POST /auth/password-reset/lookup", { body: { phone: "+84900000001" }, anonymous: true });
  });

  it("prefills the remembered email only for the matching phone", async () => {
    localStorage.setItem("qlh.account-email.v1", JSON.stringify({ "+84900000001": "co.lan@example.com" }));
    lookup({ account: true, has_email: true, email_masked: "c***@example.com" });
    page("/quen-mat-khau?sdt=%2B84911111111"); click("Tiếp tục");
    await screen.findByLabelText("Nhập email đã lưu", {}, slow);
    expect(screen.getByLabelText("Nhập email đã lưu")).toHaveValue("");
    expect(document.body.textContent).not.toContain("co.lan@example.com");
    type("Số điện thoại", "900 000 001");
    expect(screen.queryByLabelText("Nhập email đã lưu")).toBeNull();
    click(/Tiếp tục/);
    expect(await screen.findByLabelText("Nhập email đã lưu", {}, slow)).toHaveValue("co.lan@example.com");
  });

  it("shows email_mismatch at the email field and keeps the typed value", async () => {
    lookup({ account: true, has_email: true, email_masked: "c***@example.com" }); page(); await next();
    await screen.findByLabelText("Nhập email đã lưu", {}, slow);
      request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/password-reset/request") throw apiError(422, "validation_error", { fields: { email: "email_mismatch" } }); return defaults(endpoint); });
      type("Nhập email đã lưu", "khac@example.com"); click("Gửi link");
      expect(await screen.findByText("Email không khớp email đã lưu.", {}, slow)).toBeInTheDocument();
      expect(screen.getByLabelText("Nhập email đã lưu")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Nhập email đã lưu")).toHaveValue("khac@example.com");
    });

    it("shows invalid_email from the email field details", async () => {
      lookup({ account: true, has_email: true, email_masked: "c***@example.com" }); page(); await next();
      await screen.findByLabelText("Nhập email đã lưu", {}, slow);
      request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/password-reset/request") throw apiError(422, "validation_error", { fields: { email: "invalid_email" } }); return defaults(endpoint); });
      type("Nhập email đã lưu", "valid@example.com"); click("Gửi link");
      expect(await screen.findByText("Email chưa đúng định dạng.", {}, slow)).toBeInTheDocument();
      expect(screen.getByLabelText("Nhập email đã lưu")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Nhập email đã lưu")).toHaveValue("valid@example.com");
    });

  it.each([[429, "rate_limited", "Bạn thử quá nhiều lần. Hãy chờ khoảng 1 phút rồi thử lại."], [503, "mail_unavailable", "Chưa gửi được email lúc này. Hãy thử lại sau ít phút."]])("shows %i when sending the link", async (status, code, message) => {
    lookup({ account: true, has_email: true, email_masked: "c***@example.com" }); page(); await next();
    await screen.findByLabelText("Nhập email đã lưu", {}, slow);
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/password-reset/request") throw apiError(status, code); return defaults(endpoint); });
    type("Nhập email đã lưu", "co.lan@example.com"); click("Gửi link");
    expect(await screen.findByText(message, {}, slow)).toBeInTheDocument();
  });

  it("shows 429 on the phone lookup", async () => {
    lookup(apiError(429, "rate_limited")); page(); await next();
    expect(await screen.findByText("Bạn thử quá nhiều lần. Hãy chờ khoảng 1 phút rồi thử lại.", {}, slow)).toBeInTheDocument();
  });
});

describe("reset password page", () => {
  const page = () => render(<MemoryRouter initialEntries={["/dat-lai-mat-khau"]}><Routes><Route path="/dat-lai-mat-khau" element={<ResetPasswordPage/>}/><Route path="/quen-mat-khau" element={<h1>Quên mật khẩu?</h1>}/><Route path="/dang-nhap" element={<h1>Đăng nhập</h1>}/></Routes></MemoryRouter>);
  const withHash = (hash: string) => window.history.replaceState(null, "", `/dat-lai-mat-khau${hash}`);
  const fillAndSend = () => { type("Mật khẩu mới", "Matkhau!456"); type("Nhập lại mật khẩu mới", "Matkhau!456"); click("Đặt lại mật khẩu"); };

  it("reads the token from the hash, removes it from the URL, and clears the local session on success", async () => {
    await login("+84900000001", "x");
    request.mockImplementation(async (endpoint: string) => endpoint === "POST /auth/password-reset/confirm" ? { ok: true } : defaults(endpoint));
    withHash("#token=abc123");
    page();
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("abc123");
    fillAndSend();
    await waitFor(() => expect(request).toHaveBeenCalledWith("POST /auth/password-reset/confirm", { body: { token: "abc123", new_password: "Matkhau!456" }, anonymous: true }), slow);
    expect(await screen.findByText("Đã đổi mật khẩu, mọi thiết bị đã đăng xuất.", {}, slow)).toBeInTheDocument();
    expect(getSession()).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Đăng nhập" }));
    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("explains an expired or used link and goes back to forgot password", async () => {
    request.mockImplementation(async (endpoint: string) => { if (endpoint === "POST /auth/password-reset/confirm") throw apiError(400, "token_invalid"); return defaults(endpoint); });
    withHash("#token=old"); page(); fillAndSend();
    expect(await screen.findByText("Link hết hạn hoặc đã dùng.", {}, slow)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Quên mật khẩu" }));
    expect(await screen.findByRole("heading", { name: "Quên mật khẩu?" })).toBeInTheDocument();
  });

  it("treats a page opened without a token as an expired link and calls nothing", async () => {
    withHash(""); page();
    expect(screen.getByText("Link hết hạn hoặc đã dùng.")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it("requires matching passwords of at least 8 characters before sending", async () => {
    withHash("#token=xyz"); page();
    type("Mật khẩu mới", "ngan"); type("Nhập lại mật khẩu mới", "ngan");
    expect(screen.getByRole("button", { name: "Đặt lại mật khẩu" })).toBeDisabled();
    type("Mật khẩu mới", "Matkhau!456"); type("Nhập lại mật khẩu mới", "Khac!456789");
    expect(screen.getByText("Mật khẩu nhập lại không khớp.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đặt lại mật khẩu" })).toBeDisabled();
    request.mockImplementation(async (endpoint: string) => endpoint === "POST /auth/password-reset/confirm" ? { ok: true } : defaults(endpoint));
    type("Nhập lại mật khẩu mới", "Matkhau!456"); click("Đặt lại mật khẩu");
    await screen.findByText("Đã đổi mật khẩu, mọi thiết bị đã đăng xuất.", {}, slow);
  });
});
