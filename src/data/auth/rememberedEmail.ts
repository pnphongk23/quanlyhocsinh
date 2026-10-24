const KEY = "qlh.account-email.v1";

/** "+84 900 000 001", "0900000001" và "+84900000001" cùng về một khoá "+84900000001". */
export function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
  return `+84${digits}`;
}

function readAll(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
  } catch { return {}; }
}

/** Email máy nhớ cho đúng SĐT này; SĐT khác không bao giờ nhận email của tài khoản khác. */
export function rememberedEmailFor(phone: string): string {
  const email = readAll()[phoneKey(phone)];
  return typeof email === "string" ? email : "";
}

/** `undefined` (máy chủ cũ chưa trả email): giữ nguyên; `null`/rỗng: xoá mục của SĐT. */
export function rememberEmail(phone: string, email: string | null | undefined): void {
  if (email === undefined || typeof localStorage === "undefined") return;
  const all = readAll();
  const key = phoneKey(phone);
  if (email) all[key] = email; else delete all[key];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* bộ nhớ đầy: bỏ qua, chỉ mất gợi ý điền sẵn */ }
}
