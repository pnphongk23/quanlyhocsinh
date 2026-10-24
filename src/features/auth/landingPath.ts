import type { WebSession } from "../../data/auth/session";

/**
 * Đích sau đăng nhập theo số vai trò đang hoạt động: từ hai vai trở lên mới
 * hiện màn chọn vai trò; một vai vào thẳng khung của vai đó; không có vai nào
 * (phụ huynh chưa có con) vào khung phụ huynh, nơi hiện màn "chưa có con".
 */
export function landingPathForSession(session: WebSession | null): string {
  const active = (session?.me.memberships ?? []).filter((item) => item.status === "active");
  if (active.length >= 2) return "/chon-vai-tro";
  if (active.length === 0) return "/ph";
  return active[0].role.scope_kind === "linked_students" ? "/ph" : "/lop";
}

/**
 * Đích của route "/": như `landingPathForSession`, nhưng nhiều vai trò mà vai
 * đang dùng còn hoạt động thì vào thẳng khung của vai đó, không hỏi lại.
 */
export function rootPathForSession(session: WebSession | null): string {
  const active = (session?.me.memberships ?? []).find(
    (item) => item.id === session?.activeMembershipId && item.status === "active",
  );
  if (!active) return landingPathForSession(session);
  return active.role.scope_kind === "linked_students" ? "/ph" : "/lop";
}
