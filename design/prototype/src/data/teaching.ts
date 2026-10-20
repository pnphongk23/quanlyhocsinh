import type { Session, StaffPosition, StoreState } from "./types";

/** Một buổi dạy của một thành viên, kèm vai trò trong buổi đó. */
export interface TeachingEntry {
  session: Session;
  classId: string;
  position: StaffPosition;
  /** own: được gán lớp; substitute: dạy thay; replaced: bị thay ở buổi này. */
  kind: "own" | "substitute" | "replaced";
  /** Người thay (khi kind "replaced") hoặc người bị thay (khi kind "substitute"). */
  otherMemberId: string | null;
  /** Chỉ buổi đã diễn ra và không phải người bị thay mới được tính công. */
  counted: boolean;
}

/**
 * Phân công gốc của một buổi. Buổi đã diễn ra dùng bản chụp trong
 * `sessionStaffBase` để phân công lại lớp sau này không làm đổi lịch sử;
 * buổi chưa diễn ra (hoặc dữ liệu cũ chưa có bản chụp) dùng phân công lớp.
 */
export function sessionBaseStaff(
  state: StoreState,
  session: Session,
): Array<{ position: StaffPosition; memberId: string }> {
  const stored = state.sessionStaffBase.filter(
    (item) => item.sessionId === session.id,
  );
  if (stored.length > 0)
    return stored.map((item) => ({
      position: item.position,
      memberId: item.memberId,
    }));
  return state.classStaff
    .filter((item) => item.classId === session.classId)
    .map((item) => ({ position: item.position, memberId: item.memberId }));
}

/** Chụp phân công gốc của một buổi đã diễn ra nếu chưa có (thuần, dùng trong commit). */
export function captureSessionBaseStaff(
  draft: StoreState,
  sessionId: string,
): void {
  const session = draft.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== "held") return;
  if (draft.sessionStaffBase.some((item) => item.sessionId === sessionId))
    return;
  for (const row of draft.classStaff.filter(
    (item) => item.classId === session.classId,
  ))
    draft.sessionStaffBase.push({
      sessionId,
      position: row.position,
      memberId: row.memberId,
    });
}

/**
 * Chụp phân công gốc cho mọi buổi đã diễn ra của một lớp trước khi đổi phân
 * công, để bảng lương nháp của các tháng cũ giữ đúng người đã dạy.
 */
export function captureClassBaseStaff(draft: StoreState, classId: string): void {
  for (const session of draft.sessions) {
    if (session.classId !== classId) continue;
    captureSessionBaseStaff(draft, session.id);
  }
}

/**
 * Người dạy hiệu lực của một buổi: phân công gốc của buổi rồi áp dụng dạy thay.
 * Người thay thế đúng vị trí của người bị thay; riêng buổi học bù/buổi lẻ
 * (originalMemberId null) thì người thay dạy thay toàn bộ vị trí đó của buổi.
 * Buổi đã huỷ giữ nguyên phân công gốc.
 */
export function sessionStaff(
  state: StoreState,
  sessionId: string,
): Array<{ position: StaffPosition; memberId: string }> {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return [];
  const staff = sessionBaseStaff(state, session);
  if (session.status === "cancelled") return staff;
  for (const substitute of state.sessionSubstitutes.filter(
    (item) => item.sessionId === sessionId,
  )) {
    const replacement = {
      position: substitute.position,
      memberId: substitute.substituteMemberId,
    };
    if (substitute.originalMemberId === null) {
      // Buổi học bù/buổi lẻ: người thay dạy cả vị trí đó nên bỏ người được gán lớp.
      for (let i = staff.length - 1; i >= 0; i--)
        if (staff[i].position === substitute.position) staff.splice(i, 1);
      staff.push(replacement);
      continue;
    }
    const index = staff.findIndex(
      (item) =>
        item.position === substitute.position &&
        item.memberId === substitute.originalMemberId,
    );
    if (index >= 0) staff[index] = replacement;
    else staff.push(replacement);
  }
  return staff;
}

/**
 * Mọi buổi trong khoảng ngày (chuỗi YYYY-MM-DD, so sánh chuỗi) mà thành viên
 * tham gia với vai trò own/substitute/replaced, sắp theo ngày rồi giờ tăng dần.
 */
export function teachingEntries(
  state: StoreState,
  memberId: string,
  from: string,
  to: string,
): TeachingEntry[] {
  const entries: TeachingEntry[] = [];
  for (const session of state.sessions) {
    if (session.date < from || session.date > to) continue;
    // Buổi huỷ không đổi người dạy nên bỏ qua mọi dạy thay của buổi.
    const substitutes =
      session.status === "cancelled"
        ? []
        : state.sessionSubstitutes.filter(
            (item) => item.sessionId === session.id,
          );
    const substitute = substitutes.find(
      (item) => item.substituteMemberId === memberId,
    );
    if (substitute) {
      entries.push({
        session,
        classId: session.classId,
        position: substitute.position,
        kind: "substitute",
        otherMemberId: substitute.originalMemberId,
        counted: session.status === "held",
      });
      continue;
    }
    const base = sessionBaseStaff(state, session);
    const own = base.find((item) => item.memberId === memberId);
    if (!own) continue;
    const replacedBy = substitutes.find(
      (item) => item.originalMemberId === memberId,
    );
    if (
      substitutes.some(
        (item) =>
          item.originalMemberId === null && item.position === own.position,
      )
    ) {
      // Buổi học bù/buổi lẻ do người khác dạy toàn bộ vị trí: người được gán
      // lớp không dạy buổi đó.
      continue;
    }
    if (replacedBy) {
      entries.push({
        session,
        classId: session.classId,
        position: own.position,
        kind: "replaced",
        otherMemberId: replacedBy.substituteMemberId,
        counted: false,
      });
    } else {
      entries.push({
        session,
        classId: session.classId,
        position: own.position,
        kind: "own",
        otherMemberId: null,
        counted: session.status === "held",
      });
    }
  }
  return entries.sort((a, b) =>
    `${a.session.date} ${a.session.time ?? ""}`.localeCompare(
      `${b.session.date} ${b.session.time ?? ""}`,
    ),
  );
}
