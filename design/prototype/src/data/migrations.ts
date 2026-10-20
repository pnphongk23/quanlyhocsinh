import type {
  AuthSession,
  Class,
  ClassFee,
  ClassStaff,
  Comment,
  HomeworkGrade,
  HomeworkSection,
  Lecture,
  Member,
  PayAdjustment,
  PayRate,
  PayrollMonth,
  Report,
  Role,
  Score,
  Session,
  SessionLecture,
  SessionSubstitute,
  StoreState,
  StudentFee,
  TuitionNotice,
  TuitionPayment,
} from "./types";
import { defaultMembers, defaultRoles, MEMBER_IDS, ROLE_IDS } from "./defaults";
import { defaultStaffTuition } from "./staffTuitionDefaults";
import { hydratePayrollState } from "./payroll";

/** Adds schedule fields to sessions persisted by the earlier prototype. */
export function migrateStoreSessions<T extends { classes: Class[]; sessions: unknown[] }>(
  data: T,
): Omit<T, "sessions"> & { sessions: Session[] } {
  const classTimes = new Map(data.classes.map((item) => [item.id, item.time]));
  const sessions = (data.sessions as (Session | (Omit<Session, "time" | "origin"> & { time?: string; origin?: Session["origin"] }))[])
    .map((session) => ({
      ...session,
      time: session.time ?? classTimes.get(session.classId) ?? "00:00",
      origin: session.origin ?? "recurring",
    }));
  return { ...data, sessions };
}

type LegacyAuth = Partial<AuthSession> & { email?: string };

/**
 * Bỏ trường `absent` khỏi điểm của bản cũ:
 * absent = true trở thành value null (Chưa có điểm).
 */
export function migrateScores(scores: unknown): Score[] {
  if (!Array.isArray(scores)) return [];
  return scores.map((raw) => {
    const { absent, ...rest } = raw as Score & { absent?: boolean };
    return { ...rest, value: absent ? null : (rest.value ?? null) } as Score;
  });
}

/**
 * Nâng nhận xét cũ lên phiếu buổi học mới. Nhận xét tự do của bản cũ (chỉ có
 * `content`, không có `stars`) bị bỏ; phiếu còn lại được điền đủ trường mới.
 */
export function migrateComments(comments: unknown): Comment[] {
  if (!Array.isArray(comments)) return [];
  const result: Comment[] = [];
  for (const raw of comments as Array<Partial<Comment> & { content?: string }>) {
    if (!raw || typeof raw !== "object") continue;
    // Bản cũ chưa có khái niệm sao: bỏ nhận xét tự do.
    if (raw.stars === undefined) continue;
    if (!raw.classId || !raw.studentId || !raw.sessionId) continue;
    const stars =
      raw.stars === 1 || raw.stars === 2 || raw.stars === 3 ? raw.stars : null;
    const status = raw.status === "sent" ? "sent" : "draft";
    result.push({
      id: raw.id ?? crypto.randomUUID(),
      classId: raw.classId,
      studentId: raw.studentId,
      sessionId: raw.sessionId,
      stars,
      note: typeof raw.note === "string" ? raw.note : "",
      status,
      sendQueued: raw.sendQueued === true,
      sentAt: typeof raw.sentAt === "string" ? raw.sentAt : null,
      updatedAt:
        typeof raw.updatedAt === "string"
          ? raw.updatedAt
          : (raw.sentAt ?? raw.createdAt ?? "1970-01-01T00:00:00.000Z"),
      createdAt: raw.createdAt ?? "1970-01-01T00:00:00.000Z",
    });
  }
  return result;
}

/**
 * Nâng báo cáo cũ: thêm `generalComment` (nhận xét chung của tháng) và
 * `publishedAt` (thời điểm phát hành) mà bản cũ chưa có.
 */
export function migrateReports(reports: unknown): Report[] {
  if (!Array.isArray(reports)) return [];
  return (reports as Array<Partial<Report>>).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    if (!raw.classId || !raw.studentId || !raw.month) return [];
    const status = raw.status === "published" ? "published" : "draft";
    return [
      {
        id: raw.id ?? crypto.randomUUID(),
        classId: raw.classId,
        studentId: raw.studentId,
        month: raw.month,
        status,
        needsRepublish: raw.needsRepublish === true,
        generalComment:
          typeof raw.generalComment === "string" ? raw.generalComment : "",
        // Bản cũ chưa lưu ngày phát hành: UI bỏ trống phần ngày khi null.
        publishedAt:
          typeof raw.publishedAt === "string" ? raw.publishedAt : null,
      },
    ];
  });
}

/** Thêm membership phụ huynh mẫu cho store cũ để màn chọn vai trò có phụ huynh. */
function ensureGuardianMembership(
  members: Member[],
  auth: AuthSession | null,
  roles: Role[],
): { members: Member[]; auth: AuthSession | null } {
  const guardianRoleIds = new Set(
    roles.filter((role) => role.kind === "guardian").map((role) => role.id),
  );
  if (members.some((member) => guardianRoleIds.has(member.roleId)))
    return { members, auth };
  // Chỉ áp dụng cho workspace mẫu của prototype.
  if (!members.some((member) => member.id === MEMBER_IDS.lanAdmin))
    return { members, auth };
  const guardian = defaultMembers().find(
    (member) => member.roleId === ROLE_IDS.guardian,
  );
  if (!guardian) return { members, auth };
  return {
    members: [...members, guardian],
    auth: auth
      ? { ...auth, memberIds: [...auth.memberIds, guardian.id] }
      : auth,
  };
}

/**
 * Nâng dữ liệu localStorage của bản prototype cũ lên StoreState hiện tại:
 * bổ sung roles, members, bài giảng và activeMemberId mà không mất dữ liệu cũ.
 */
export function migrateStore(
  data: { classes: Class[]; sessions: unknown[] } & Record<string, unknown>,
): StoreState {
  const withSessions = migrateStoreSessions(data);
  const roles =
    Array.isArray(data.roles) && data.roles.length
      ? (data.roles as Role[])
      : defaultRoles();
  const members =
    Array.isArray(data.members) && data.members.length
      ? (data.members as Member[])
      : defaultMembers();
  const legacyAuth = data.auth as LegacyAuth | null | undefined;
  const memberIds =
    legacyAuth && Array.isArray(legacyAuth.memberIds) && legacyAuth.memberIds.length
      ? legacyAuth.memberIds
      : members
          .filter((member) => member.name === members[0]?.name)
          .map((member) => member.id);
  const auth: AuthSession | null = legacyAuth
    ? { email: legacyAuth.email ?? "", memberIds }
    : null;
  const activeMemberId =
    typeof data.activeMemberId === "string"
      ? data.activeMemberId
      : auth
        ? (memberIds[0] ?? null)
        : null;
  // Mảng nhân sự/lương/học phí: bản cũ chưa có thì điền dữ liệu mẫu, có rồi thì giữ nguyên.
  const staffTuition = defaultStaffTuition();
  const merged: StoreState = {
    ...(withSessions as unknown as StoreState),
    roles,
    members,
    auth,
    activeMemberId,
    lectures: Array.isArray(data.lectures) ? (data.lectures as Lecture[]) : [],
    sessionLectures: Array.isArray(data.sessionLectures)
      ? (data.sessionLectures as SessionLecture[])
      : [],
    scores: migrateScores(data.scores),
    comments: migrateComments(data.comments),
    reports: migrateReports(data.reports),
    // Bản cũ chưa có BTVN: bắt đầu rỗng; bản mới giữ nguyên (kể cả mảng rỗng).
    homeworkSections: Array.isArray(data.homeworkSections)
      ? (data.homeworkSections as HomeworkSection[])
      : [],
    homeworkGrades: Array.isArray(data.homeworkGrades)
      ? (data.homeworkGrades as HomeworkGrade[])
      : [],
    classStaff: Array.isArray(data.classStaff)
      ? (data.classStaff as ClassStaff[])
      : staffTuition.classStaff,
    sessionSubstitutes: Array.isArray(data.sessionSubstitutes)
      ? (data.sessionSubstitutes as SessionSubstitute[])
      : staffTuition.sessionSubstitutes,
    payRates: Array.isArray(data.payRates)
      ? (data.payRates as PayRate[])
      : staffTuition.payRates,
    payAdjustments: Array.isArray(data.payAdjustments)
      ? (data.payAdjustments as PayAdjustment[])
      : staffTuition.payAdjustments,
    payrollMonths: Array.isArray(data.payrollMonths)
      ? (data.payrollMonths as PayrollMonth[])
      : staffTuition.payrollMonths,
    classFees: Array.isArray(data.classFees)
      ? (
          data.classFees as (Omit<ClassFee, "chargeMakeup"> & {
            chargeMakeup?: boolean;
          })[]
        ).map((fee) => ({ ...fee, chargeMakeup: fee.chargeMakeup ?? true }))
      : staffTuition.classFees,
    studentFees: Array.isArray(data.studentFees)
      ? (data.studentFees as StudentFee[])
      : staffTuition.studentFees,
    tuitionPayments: Array.isArray(data.tuitionPayments)
      ? (data.tuitionPayments as TuitionPayment[])
      : staffTuition.tuitionPayments,
    tuitionNotices: Array.isArray(data.tuitionNotices)
      ? (data.tuitionNotices as TuitionNotice[])
      : staffTuition.tuitionNotices,
  };
  // Store cũ: chụp phân công gốc của buổi đã diễn ra và snapshot các tháng đã
  // chốt. Chạy một lần khi nạp; lần ghi kế tiếp sẽ lưu lại cùng store.
  const withGuardian = ensureGuardianMembership(
    merged.members,
    merged.auth,
    merged.roles,
  );
  return hydratePayrollState({
    ...merged,
    members: withGuardian.members,
    auth: withGuardian.auth,
  });
}
