import type {
  Attendance,
  Comment,
  HomeworkKind,
  HomeworkLevel,
  HomeworkSection,
  Session,
  StarLevel,
  StoreState,
  Student,
} from "./types";

/** Nhãn tiếng Việt của bốn loại phần BTVN (spec mục 4). */
export const HOMEWORK_KIND_LABELS: Record<HomeworkKind, string> = {
  vocabulary: "Luyện từ vựng",
  reading: "Luyện đọc",
  speaking: "Luyện nói",
  exercise: "Bài tập",
};

/** Thứ tự cố định của bốn loại phần BTVN. */
export const HOMEWORK_KINDS: HomeworkKind[] = [
  "vocabulary",
  "reading",
  "speaking",
  "exercise",
];

/** Nhãn ba mức chấm BTVN. */
export const HOMEWORK_LEVEL_LABELS: Record<HomeworkLevel, string> = {
  excellent: "Hoàn thành tốt",
  done: "Hoàn thành",
  not_done: "Chưa hoàn thành",
};

/** Thứ tự hiển thị ba mức chấm. */
export const HOMEWORK_LEVELS: HomeworkLevel[] = [
  "excellent",
  "done",
  "not_done",
];

const kindRank = (kind: HomeworkKind) => HOMEWORK_KINDS.indexOf(kind);

/** Buổi sắp theo ngày rồi giờ; buổi học bù/ngoài lịch vẫn so theo ngày. */
export function compareSessions(a: Session, b: Session): number {
  return `${a.date} ${a.time ?? "00:00"}`.localeCompare(
    `${b.date} ${b.time ?? "00:00"}`,
  );
}

/** Các buổi của cùng lớp, sắp theo ngày rồi giờ. */
export function classSessions(sessions: Session[], classId: string): Session[] {
  return sessions
    .filter((session) => session.classId === classId)
    .sort(compareSessions);
}

/**
 * Buổi kế tiếp CHƯA HỦY của lớp sau buổi `sessionId` — đây là buổi chấm BTVN
 * giao ở buổi `sessionId`. Buổi bị hủy bị bỏ qua; không còn buổi nào thì null
 * (UI hiện "Chưa có buổi chấm").
 */
export function gradingSessionFor(
  sessions: Session[],
  sessionId: string,
): Session | null {
  const current = sessions.find((session) => session.id === sessionId);
  if (!current) return null;
  const after = classSessions(sessions, current.classId).filter(
    (session) => compareSessions(session, current) > 0,
  );
  return after.find((session) => session.status !== "cancelled") ?? null;
}

/**
 * Buổi chấm kèm danh sách buổi bị hủy đã bỏ qua, để UI báo
 * "Ngày 19/10 đã bị hủy, BTVN ngày 18/10 chấm vào ngày 20/10".
 */
export function gradingSessionPlan(
  sessions: Session[],
  sessionId: string,
): { session: Session | null; cancelled: Session[] } {
  const current = sessions.find((session) => session.id === sessionId);
  if (!current) return { session: null, cancelled: [] };
  const after = classSessions(sessions, current.classId).filter(
    (session) => compareSessions(session, current) > 0,
  );
  const cancelled: Session[] = [];
  for (const session of after) {
    if (session.status === "cancelled") {
      cancelled.push(session);
      continue;
    }
    return { session, cancelled };
  }
  return { session: null, cancelled };
}

/**
 * Buổi gần nhất TRƯỚC buổi `sessionId` mà không bị hủy — nơi đã giao BTVN
 * đang chấm ở buổi `sessionId`. Buổi đầu tiên của lớp trả null.
 */
export function previousHomeworkSession(
  sessions: Session[],
  sessionId: string,
): Session | null {
  const current = sessions.find((session) => session.id === sessionId);
  if (!current) return null;
  const before = classSessions(sessions, current.classId).filter(
    (session) => compareSessions(session, current) < 0,
  );
  for (let index = before.length - 1; index >= 0; index--)
    if (before[index].status !== "cancelled") return before[index];
  return null;
}

/** Học sinh đang học vào ngày của buổi: vào lớp ≤ ngày buổi ≤ rời lớp. */
export function studentsOnSession(
  state: StoreState,
  session: Session,
): Student[] {
  return state.students.filter(
    (student) =>
      student.classId === session.classId &&
      student.enrolledAt <= session.date &&
      (!student.leftAt || session.date <= student.leftAt),
  );
}

/**
 * Học sinh đã rời lớp trước ngày buổi. Phiếu cũ của các em vẫn giữ; UI hiện
 * thẻ riêng ngoài danh sách phiếu ("Đã rời lớp · 18/10").
 */
export function leftStudentsForSession(
  state: StoreState,
  sessionId: string,
): Student[] {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return [];
  return state.students.filter(
    (student) =>
      student.classId === session.classId &&
      student.leftAt !== null &&
      student.leftAt < session.date &&
      student.enrolledAt <= session.date,
  );
}

/** Các phần BTVN của một buổi, sắp theo thứ tự Luyện từ vựng → Bài tập. */
export function homeworkSectionsFor(
  state: StoreState,
  sessionId: string,
): HomeworkSection[] {
  return state.homeworkSections
    .filter((section) => section.sessionId === sessionId)
    .sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
}

/** Mức chấm của một em ở một phần; null = Chưa chấm. */
export function homeworkGradeLevel(
  state: StoreState,
  sectionId: string,
  studentId: string,
): HomeworkLevel | null {
  const grade = state.homeworkGrades.find(
    (item) => item.sectionId === sectionId && item.studentId === studentId,
  );
  return grade?.level ?? null;
}

/** Các loại phần chưa giao ở buổi này ("còn 1 loại" khi bấm Thêm phần). */
export function missingHomeworkKinds(
  state: StoreState,
  sessionId: string,
): HomeworkKind[] {
  const used = new Set(
    state.homeworkSections
      .filter((section) => section.sessionId === sessionId)
      .map((section) => section.kind),
  );
  return HOMEWORK_KINDS.filter((kind) => !used.has(kind));
}

export type TicketStatus = "none" | "draft" | "queued" | "sent";

/** Trạng thái phiếu hiển thị trên danh sách nhận xét. */
export function ticketStatusOf(comment: Comment | null): TicketStatus {
  if (!comment || comment.stars === null) return "none";
  if (comment.status === "sent") return "sent";
  return comment.sendQueued ? "queued" : "draft";
}

export type HomeworkPreviousState = "first" | "none-given" | "has";

/** Tóm tắt BTVN buổi trước của một em (dùng ở danh sách phiếu). */
export interface HomeworkSummary {
  state: HomeworkPreviousState;
  /** Buổi đã giao bài (buổi trước chưa hủy); null ở buổi đầu. */
  session: Session | null;
  totalSections: number;
  gradedSections: number;
  ungradedSections: number;
}

export interface TicketRow {
  student: Student;
  comment: Comment | null;
  stars: StarLevel | null;
  attended: boolean;
  status: TicketStatus;
  sentAt: string | null;
  previousHomework: HomeworkSummary;
}

/** Tóm tắt BTVN buổi trước (đã giao ở buổi `givingSession`) cho một em. */
export function homeworkSummaryFor(
  state: StoreState,
  givingSession: Session | null,
  studentId: string,
): HomeworkSummary {
  if (!givingSession)
    return {
      state: "first",
      session: null,
      totalSections: 0,
      gradedSections: 0,
      ungradedSections: 0,
    };
  const sections = homeworkSectionsFor(state, givingSession.id);
  if (!sections.length)
    return {
      state: "none-given",
      session: givingSession,
      totalSections: 0,
      gradedSections: 0,
      ungradedSections: 0,
    };
  const gradedSections = sections.filter(
    (section) => homeworkGradeLevel(state, section.id, studentId) !== null,
  ).length;
  return {
    state: "has",
    session: givingSession,
    totalSections: sections.length,
    gradedSections,
    ungradedSections: sections.length - gradedSections,
  };
}

/**
 * Dữ liệu danh sách phiếu của một buổi: học sinh đang học vào ngày buổi
 * (kể cả em đang ở trạng thái đã nghỉ nhưng còn học ở ngày đó), phiếu hiện có
 * và tóm tắt BTVN buổi trước của từng em.
 */
export function buildTicketRows(
  state: StoreState,
  sessionId: string,
): TicketRow[] {
  const session = state.sessions.find((item) => item.id === sessionId);
  // Buổi đã hủy không có phiếu.
  if (!session || session.status === "cancelled") return [];
  const giving = previousHomeworkSession(state.sessions, sessionId);
  return studentsOnSession(state, session).map((student) => {
    const comment =
      state.comments.find(
        (item) =>
          item.sessionId === sessionId && item.studentId === student.id,
      ) ?? null;
      return {
        student,
        comment,
        stars: comment?.stars ?? 5,
        attended: state.attendance.some((item) => item.sessionId === sessionId && item.studentId === student.id && (item.status === "present" || item.status === "late")),
        status: comment ? ticketStatusOf(comment) : "draft",
      sentAt: comment?.sentAt ?? null,
      previousHomework: homeworkSummaryFor(state, giving, student.id),
    };
  });
}

/** Số em × phần BTVN buổi trước còn "Chưa chấm" (hộp xác nhận gửi phiếu). */
export interface UngradedHomeworkNotice {
  /** Các em còn ít nhất một phần chưa chấm. */
  students: Student[];
  /** Tổng số lượt (em × phần) chưa chấm. */
  ungradedParts: number;
}

/**
 * Đếm số phần BTVN buổi trước còn "Chưa chấm" của các em sẽ gửi phiếu.
 * Không truyền `studentIds` thì tính cho cả lớp đang học ở buổi này.
 */
export function ungradedHomeworkNotice(
  state: StoreState,
  sessionId: string,
  studentIds?: string[],
): UngradedHomeworkNotice {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return { students: [], ungradedParts: 0 };
  const giving = previousHomeworkSession(state.sessions, sessionId);
  if (!giving) return { students: [], ungradedParts: 0 };
  const wanted = studentIds ? new Set(studentIds) : null;
  const roster = studentsOnSession(state, session).filter(
    (student) => !wanted || wanted.has(student.id),
  );
  const students: Student[] = [];
  let ungradedParts = 0;
  for (const student of roster) {
    const summary = homeworkSummaryFor(state, giving, student.id);
    if (!summary.ungradedSections) continue;
    students.push(student);
    ungradedParts += summary.ungradedSections;
  }
  return { students, ungradedParts };
}

export interface HomeworkSectionProgress {
  section: HomeworkSection;
  total: number;
  graded: number;
  ungraded: number;
}

export interface HomeworkGradingRow {
  student: Student;
  /** true khi em vắng (hoặc có phép) ở buổi giao bài; vẫn chấm bình thường. */
  absentAtGiving: boolean;
  /** Trạng thái điểm danh ở buổi giao bài; null khi chưa điểm danh. */
  givingAttendance: Attendance["status"] | null;
  /** Mức chấm theo sectionId; null = Chưa chấm. */
  grades: Record<string, HomeworkLevel | null>;
  graded: number;
  ungraded: number;
}

export interface HomeworkGradingPlan {
  /** exists = có buổi chấm; moved = buổi chấm bị chuyển do hủy; none = chưa có. */
  state: "exists" | "moved" | "none";
  session: Session | null;
  /** Buổi bị hủy nằm giữa buổi giao bài và buổi chấm (state "moved"). */
  cancelled: Session[];
}

export interface HomeworkContext {
  session: Session;
  /** Buổi đang xem đã bị hủy: không giao, không chấm. */
  cancelled: boolean;
  previous: {
    state: HomeworkPreviousState;
    givingSession: Session | null;
    sections: HomeworkSectionProgress[];
    rows: HomeworkGradingRow[];
  };
  today: {
    sections: HomeworkSection[];
    missingKinds: HomeworkKind[];
    grading: HomeworkGradingPlan;
  };
}

function emptyGrading(): HomeworkGradingPlan {
  return { state: "none", session: null, cancelled: [] };
}

/**
 * Ngữ cảnh tab Bài tập về nhà của một buổi: BTVN buổi trước (để chấm) và
 * BTVN hôm nay (đã giao + buổi chấm), kèm cờ "em vắng buổi giao bài".
 */
export function homeworkContext(
  state: StoreState,
  sessionId: string,
): HomeworkContext | null {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return null;
  const cancelled = session.status === "cancelled";
  const todaySections = cancelled
    ? []
    : homeworkSectionsFor(state, sessionId);
  const today = {
    sections: todaySections,
    missingKinds: cancelled ? [] : missingHomeworkKinds(state, sessionId),
    grading: cancelled
      ? emptyGrading()
      : (() => {
          const plan = gradingSessionPlan(state.sessions, sessionId);
          const gradingState: HomeworkGradingPlan["state"] = !plan.session
            ? "none"
            : plan.cancelled.length
              ? "moved"
              : "exists";
          return { ...plan, state: gradingState };
        })(),
  };
  if (cancelled) {
    return {
      session,
      cancelled,
      previous: {
        state: "none-given",
        givingSession: null,
        sections: [],
        rows: [],
      },
      today,
    };
  }
  const giving = previousHomeworkSession(state.sessions, sessionId);
  const sections = giving ? homeworkSectionsFor(state, giving.id) : [];
  const roster = studentsOnSession(state, session);
  const attendance = (studentId: string) =>
    giving
      ? (state.attendance.find(
          (item) =>
            item.sessionId === giving.id && item.studentId === studentId,
        )?.status ?? null)
      : null;
  const rows: HomeworkGradingRow[] = roster.map((student) => {
    const status = attendance(student.id);
    const grades: Record<string, HomeworkLevel | null> = {};
    for (const section of sections)
      grades[section.id] = homeworkGradeLevel(state, section.id, student.id);
    const graded = Object.values(grades).filter(
      (level) => level !== null,
    ).length;
    return {
      student,
      absentAtGiving: status === "absent",
      givingAttendance: status,
      grades,
      graded,
      ungraded: sections.length - graded,
    };
  });
  const progress: HomeworkSectionProgress[] = sections.map((section) => {
    const graded = roster.filter(
      (student) => homeworkGradeLevel(state, section.id, student.id) !== null,
    ).length;
    return {
      section,
      total: roster.length,
      graded,
      ungraded: roster.length - graded,
    };
  });
  return {
    session,
    cancelled,
    previous: {
      state: giving
        ? sections.length
          ? "has"
          : "none-given"
        : "first",
      givingSession: giving,
      sections: progress,
      rows,
    },
    today,
  };
}
