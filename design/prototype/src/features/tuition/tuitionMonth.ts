import type { Session, StoreState, Student } from "../../data/types";
import type { PillTone } from "../../shared/ui";
import { tuitionSessions } from "../../data/tuition";

/** Một buổi đã diễn ra (hoặc đã huỷ) của học sinh trong tháng, kèm lý do tính phí. */
export interface TuitionMonthRow {
  session: Session;
  charged: boolean;
  makeup: boolean;
  /** Nhãn điểm danh/trạng thái buổi, dùng cho pill. */
  label: string;
  tone: PillTone;
  /** Vì sao buổi này có/không được tính phí, ví dụ "Không tính · Buổi huỷ". */
  note: string;
}

/** Cùng quy tắc với inEnrollment trong data/tuition.ts (hàm đó là private). */
function inEnrollment(student: Student, date: string): boolean {
  return date >= student.enrolledAt && (!student.leftAt || date <= student.leftAt);
}

/**
 * Mọi buổi trong tháng của học sinh để hiển thị trên phiếu học phí: buổi đã
 * diễn ra và buổi huỷ, kể cả buổi không tính phí (có phép, vắng không phép,
 * học bù bị tắt tính phí). Danh sách buổi tính phí lấy từ tuitionSessions để
 * số tiền luôn khớp với phiếu.
 */
export function tuitionMonthRows(
  state: StoreState,
  studentId: string,
  month: string,
): TuitionMonthRow[] {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) return [];
  const fee = state.classFees.find((item) => item.classId === student.classId);
  const chargedIds = new Set(
    tuitionSessions(state, studentId, month).map((row) => row.session.id),
  );

  const rows: TuitionMonthRow[] = [];
  for (const session of state.sessions) {
    if (
      session.classId !== student.classId ||
      !inEnrollment(student, session.date) ||
      session.date.slice(0, 7) !== month ||
      session.status === "planned"
    )
      continue;
    const makeup = session.makeup === true;
    const charged = chargedIds.has(session.id);
    const record = state.attendance.find(
      (item) => item.sessionId === session.id && item.studentId === studentId,
    );

    if (session.status === "cancelled") {
      rows.push({
        session,
        charged: false,
        makeup,
        label: "Buổi huỷ",
        tone: "error",
        note: "Không tính · Buổi huỷ",
      });
      continue;
    }

    if (!record) {
      rows.push({
        session,
        charged,
        makeup,
        label: "Chưa điểm danh",
        tone: "neutral",
        note: charged ? "Tính phí" : "Không tính · Chưa điểm danh",
      });
      continue;
    }

    if (record.status === "present" || record.status === "late") {
      const label = record.status === "present" ? "Có mặt" : "Muộn";
      const tone: PillTone = record.status === "present" ? "success" : "warning";
      rows.push({
        session,
        charged,
        makeup,
        label,
        tone,
        note: charged
          ? "Tính phí"
          : makeup && fee && !fee.chargeMakeup
            ? "Không tính · Lớp không tính phí học bù"
            : "Không tính",
      });
      continue;
    }

    if (record.status === "excused") {
      rows.push({
        session,
        charged,
        makeup,
        label: "Vắng có phép",
        tone: "primary",
        note: "Không tính · Có phép",
      });
      continue;
    }

    rows.push({
      session,
      charged,
      makeup,
      label: "Vắng",
      tone: "error",
      note: charged ? "Tính phí · Vắng không phép" : "Không tính · Vắng không phép",
    });
  }

  return rows.sort(
    (a, b) =>
      a.session.date.localeCompare(b.session.date) ||
      a.session.id.localeCompare(b.session.id),
  );
}
