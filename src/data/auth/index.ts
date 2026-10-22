import { api } from "../sync";
import { activateSession, activateMembershipCache, clearSession, getSession, setActiveMembershipId, updateMe } from "./session";
import { assertCanLogout } from "../outbox";
import { getStore } from "../store";
import { ApiError } from "../api/client";

export async function login(phone: string, password: string): Promise<{ activeMembershipId: string | null; membershipCount: number }> {
  const result = await api.request("POST /auth/login", { body: { phone, password, device_label: typeof navigator === "undefined" ? "Web" : navigator.userAgent.slice(0, 100) } });
  const me = await api.request("GET /me", { authToken: result.token });
  await activateSession(result.token, result.user, me, result.active_membership_id);
  return { activeMembershipId: result.active_membership_id, membershipCount: result.memberships.length };
}
export async function registerTeacher(phone: string, password: string, displayName: string, workspaceName: string): Promise<void> {
  const result = await api.request("POST /auth/register", { body: { phone, password, display_name: displayName, workspace_name: workspaceName } });
  const me = await api.request("GET /me"); await activateSession(result.token, result.user, me, result.active_membership_id);
}
export async function registerParent(phone: string, password: string, displayName: string): Promise<void> {
  const result = await api.request("POST /auth/register-guardian", { body: { phone, password, display_name: displayName } });
  const me = await api.request("GET /me");
  await activateSession(result.token, result.user, me, result.active_membership_id);
}
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.request("POST /auth/change-password", { body: { current_password: currentPassword, new_password: newPassword } });
  if (getSession()) await updateMe(await api.request("GET /me"));
}
export async function logout(): Promise<void> {
  await assertCanLogout(); await api.request("POST /auth/logout"); await clearSession();
}
export async function switchMembership(membershipId: string): Promise<void> {
  const current = getSession(); if (!current) throw new Error("Bạn cần đăng nhập.");
  const membership = current.me.memberships.find((entry) => entry.id === membershipId && entry.status === "active");
  if (!membership) throw new Error("Không tìm thấy vai trò đang hoạt động.");
  const response = await api.request("PUT /session/membership", { body: { membership_id: membershipId } });
  if (response.active_membership_id !== membershipId) throw new Error("Máy chủ chưa xác nhận việc đổi vai trò.");
  setActiveMembershipId(membershipId); await activateMembershipCache(membershipId);
}
export async function refreshSession(): Promise<void> { if (getSession()) await updateMe(await api.request("GET /me")); }
export function authFailureMessage(error: unknown): string {
  if (error instanceof ApiError) return ({ invalid_credentials: "Số điện thoại hoặc mật khẩu chưa đúng.", rate_limited: "Bạn thử đăng nhập quá nhiều lần. Hãy chờ rồi thử lại.", account_disabled: "Tài khoản đã bị vô hiệu hoá.", password_change_required: "Bạn cần đổi mật khẩu để tiếp tục." } as Record<string, string>)[error.error.code] ?? "Không thể hoàn thành yêu cầu.";
  return error instanceof Error ? error.message : "Không thể hoàn thành yêu cầu.";
}
export function authRedirect(role: "staff" | "guardian"): string {
  const session = getSession(); if (!session) return "/dang-nhap";
  const active = session.me.memberships.find((m) => m.id === session.activeMembershipId && m.status === "active");
  if (!active) return session.me.memberships.length > 1 ? "/chon-vai-tro" : "/dang-nhap";
  const isGuardian = active.role.scope_kind === "linked_students";
  if ((role === "guardian") !== isGuardian) return isGuardian ? "/ph" : "/lop";
  return "";
}
export function hasActiveSession(): boolean { return Boolean(getSession() && getStore().activeMemberId); }
