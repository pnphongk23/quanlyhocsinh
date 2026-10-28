import type { MeResponse } from "../api/types";
import { api, clearMembershipCache, clearUserCache } from "../sync";
import { activateSession, activateMembershipCache, clearSession, getSession, setActiveMembershipId, setSessionUserEmail, updateMe } from "./session";
import { beginLogout, cancelLogout, clearLogoutLock } from "../outbox";
import { getStore } from "../store";
import { ApiError, rateLimitMessage, type PhoneCheckNext } from "../api/client";
import { rememberEmail } from "./rememberedEmail";

export async function login(phone: string, password: string): Promise<{ activeMembershipId: string | null; membershipCount: number }> {
  const result = await api.request("POST /auth/login", { body: { phone, password, device_label: typeof navigator === "undefined" ? "Web" : navigator.userAgent.slice(0, 80) } });
  const me = await api.request("GET /me", { authToken: result.token });
  await clearLogoutLock(result.user.id);
  await activateSession(result.token, result.user, me, result.active_membership_id, me.memberships.length === 0);
  const active = me.memberships.find((membership) => membership.id === me.active_membership_id && membership.status === "active");
  const activeMemberships = me.memberships.filter((membership) => membership.status === "active");
  if (!active && activeMemberships.length === 1) {
    try { await switchMembership(activeMemberships[0].id, me); } catch { /* Keep the authenticated session if automatic selection is unavailable. */ }
  }
  return { activeMembershipId: getSession()?.activeMembershipId ?? null, membershipCount: me.memberships.length };
}
export async function registerTeacher(phone: string, password: string, displayName: string, workspaceName: string, email?: string): Promise<void> {
  const result = await api.request("POST /auth/register", { body: { phone, password, display_name: displayName, workspace_name: workspaceName, ...(email ? { email } : {}) } });
    const me = await api.request("GET /me", { authToken: result.token }); await clearLogoutLock(result.user.id); await activateSession(result.token, result.user, me, result.active_membership_id);
}
/** Bước 1 của đăng nhập: máy chủ cho biết số này đi tiếp đăng nhập, phụ huynh đặt mật khẩu hay đăng ký giáo viên. */
export async function checkPhone(phone: string): Promise<PhoneCheckNext> {
  return (await api.request("POST /auth/phone-check", { body: { phone }, anonymous: true })).next;
}
export async function registerParent(phone: string, password: string, displayName?: string, email?: string): Promise<void> {
  const result = await api.request("POST /auth/register-guardian", { body: { phone, password, ...(displayName ? { display_name: displayName } : {}), ...(email ? { email } : {}) } });
    const me = await api.request("GET /me", { authToken: result.token });
    await clearLogoutLock(result.user.id);
    await activateSession(result.token, result.user, me, result.active_membership_id, true);
}
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.request("POST /auth/change-password", { body: { current_password: currentPassword, new_password: newPassword } });
  if (getSession()) void api.request("GET /me").then(updateMe).catch(() => undefined);
}
/** Lưu hoặc xoá email khôi phục; cần mật khẩu hiện tại. Thành công thì máy nhớ (hoặc quên) email theo SĐT. */
export async function setAccountEmail(email: string | null, currentPassword: string): Promise<void> {
  const result = await api.request("PUT /me/email", { body: { email, current_password: currentPassword } });
  const phone = getSession()?.user.phone;
  if (phone) rememberEmail(phone, result.email);
  setSessionUserEmail(result.email);
}
export const lookupPasswordReset = (phone: string) => api.request("POST /auth/password-reset/lookup", { body: { phone }, anonymous: true });
export const requestPasswordReset = (phone: string, email: string) => api.request("POST /auth/password-reset/request", { body: { phone, email }, anonymous: true });
/** Đổi mật khẩu bằng token một lần; máy chủ thu hồi mọi phiên nên phiên cục bộ (nếu có) bị xoá. */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await api.request("POST /auth/password-reset/confirm", { body: { token, new_password: newPassword }, anonymous: true });
  if (getSession()) await clearSession();
}
export async function logout(): Promise<void> {
  const userId = getSession()?.user.id;
  if (!userId) { await clearSession(); return; }
  await beginLogout(userId);
  try {
    await api.request("POST /auth/logout");
    await clearUserCache(userId);
    await clearSession();
  } catch (error) {
    await cancelLogout(userId);
    throw error;
  }
}
export async function switchMembership(membershipId: string, latestMe?: MeResponse): Promise<void> {
  const current = getSession(); if (!current) throw new Error("Bạn cần đăng nhập.");
  const sourceMe = latestMe ?? current.me;
  const membership = sourceMe.memberships.find((entry) => entry.id === membershipId && entry.status === "active");
  if (!membership) throw new Error("Không tìm thấy vai trò đang hoạt động.");
  const response = await api.request("PUT /session/membership", { body: { membership_id: membershipId } });
  if (getSession() !== current) return;
  if (response.active_membership_id !== membershipId) throw new Error("Máy chủ chưa xác nhận việc đổi vai trò.");
  if (latestMe) {
    const previous = current.me.memberships.find((entry) => entry.id === current.activeMembershipId);
    if (previous && previous.id !== membershipId) await clearMembershipCache(`${current.user.id}:${previous.workspace.id}:${previous.id}`);
    if (getSession() !== current) return;
    await updateMe({ ...latestMe, active_membership_id: membershipId });
    return;
  }
  setActiveMembershipId(membershipId); await activateMembershipCache(membershipId);
}
export async function refreshSession(): Promise<void> {
  const current = getSession();
  if (!current) return;
  const me = await api.request("GET /me");
  if (getSession() !== current) return;
    await updateMe(me);
}
export function authFailureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const reason = error.error.details?.reason;
    if (error.status === 409 && reason === "phone_registered") return "Số điện thoại đã có tài khoản. Hãy đăng nhập.";
    if (error.status === 422 && (reason === "weak_password" || error.error.code === "weak_password")) return "Mật khẩu phải có ít nhất 8 ký tự.";
    if (error.status === 422 && error.error.details?.fields && typeof error.error.details.fields === "object" && "phone" in error.error.details.fields) return "Số điện thoại không hợp lệ.";
    if (error.status === 429 || error.error.code === "rate_limited") return rateLimitMessage(error);
    return ({ invalid_credentials: "Số điện thoại hoặc mật khẩu chưa đúng.", account_disabled: "Tài khoản đã bị vô hiệu hoá.", password_change_required: "Bạn cần đổi mật khẩu để tiếp tục." } as Record<string, string>)[error.error.code] ?? "Không thể hoàn thành yêu cầu.";
  }
  return "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.";
}
export function authRedirect(role: "staff" | "guardian"): string {
  const session = getSession(); if (!session) return "/dang-nhap";
  const active = session.me.memberships.find((m) => m.id === session.activeMembershipId && m.status === "active");
    if (!active) return session.guardianAccount ? (role === "guardian" ? "" : "/ph") : session.me.memberships.some((membership) => membership.status === "active") ? "/chon-vai-tro" : "/dang-nhap";
  const isGuardian = active.role.scope_kind === "linked_students";
  if ((role === "guardian") !== isGuardian) return isGuardian ? "/ph" : "/lop";
  return "";
}
export function hasActiveSession(): boolean { return Boolean(getSession() && (getStore().activeMemberId || getSession()?.guardianAccount)); }
