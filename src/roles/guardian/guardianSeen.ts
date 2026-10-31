import { getSession } from "../../data/auth/session";

/**
 * Phiếu buổi học phụ huynh đã mở xem (chấm "Mới" ở danh sách buổi). Chỉ là
 * trạng thái hiển thị trên máy này, không ghi vào dữ liệu và không đổi quyền.
 */
const SEEN_KEY = "guardian-seen-sessions-v1";

function scopedKey(): string {
  // Không chia trạng thái đã xem giữa người dùng hoặc membership trên cùng máy.
  // Không có phiên (fixture/dev) thì dùng khoá local riêng cho chế độ đó.
  const session = getSession();
  return `${SEEN_KEY}:${session?.user.id ?? "local"}:${session?.activeMembershipId ?? "none"}`;
}

function readAll(): Record<string, string[]> {
  try {
    const raw = globalThis.localStorage?.getItem(scopedKey());
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string[]>)
      : {};
  } catch {
    return {};
  }
}

export function seenSessionIds(studentId: string): Set<string> {
  const ids = readAll()[studentId];
  return new Set(Array.isArray(ids) ? ids : []);
}

export function markSessionSeen(studentId: string, sessionId: string): void {
  try {
    const all = readAll();
    const ids = new Set(all[studentId] ?? []);
    if (ids.has(sessionId)) return;
    ids.add(sessionId);
      globalThis.localStorage?.setItem(
        scopedKey(),
        JSON.stringify({ ...all, [studentId]: [...ids] }),
      );
  } catch {
    // Trình duyệt chặn lưu trữ: chấm "Mới" chỉ hiện lại ở lần mở sau.
  }
}
