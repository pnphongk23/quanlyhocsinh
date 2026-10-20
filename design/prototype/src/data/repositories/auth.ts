import type { AuthSession } from "../types";
import { getStore, updateStore } from "../store";
export const getAuthSession = (): AuthSession | null => getStore().auth;
export function login(email: string, password: string): AuthSession {
  if (!email.trim() || !password)
    throw new Error("Nhập email và mật khẩu bất kỳ để dùng thử.");
  const state = getStore();
  // Prototype: một người dùng thử sở hữu các membership trùng tên với thành
  // viên đầu tiên. Cô Lan có hai membership (Admin và Giáo viên); mặc định
  // chọn membership đầu tiên nên đăng nhập là Admin.
  const members = state.members.filter((member) => member.status !== "disabled");
  const primaryName = members[0]?.name;
  const memberIds = primaryName
    ? members.filter((member) => member.name === primaryName).map((member) => member.id)
    : [];
  const session: AuthSession = { email: email.trim(), memberIds };
  updateStore((d) => {
    d.auth = session;
    d.activeMemberId = memberIds[0] ?? null;
  });
  return session;
}
export function logout(): void {
  if (getStore().pending.length)
    throw new Error(
      "Còn thay đổi chưa đồng bộ. Vui lòng chờ đồng bộ trước khi đăng xuất.",
    );
  updateStore((d) => {
    d.auth = null;
    d.activeMemberId = null;
  });
}
