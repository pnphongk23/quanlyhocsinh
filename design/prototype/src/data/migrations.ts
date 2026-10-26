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
  ReportBatch,
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
import { normalizePhone } from "./authAccounts";
import { defaultStaffTuition } from "./staffTuitionDefaults";
import { hydratePayrollState } from "./payroll";
import { countedSessions } from "./reportRange";

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

/** Thành viên của bản cũ còn trạng thái "invited" và trường `invitedAt`. */
type LegacyMember = Omit<Member, "status"> & {
  status: Member["status"] | "invited";
  invitedAt?: string | null;
};

/**
 * Bỏ hẳn luồng mời (quyết định 2026-10-23 mục 1): thành viên còn ở trạng thái
 * "invited" của bản cũ bị xoá, trường `invitedAt` bị bỏ khỏi mọi thành viên.
 * Trạng thái còn lại chỉ là "active" | "disabled".
 */
export function migrateMembers(members: LegacyMember[]): Member[] {
  return members
    .filter((member) => member.status !== "invited")
    .map(({ invitedAt: _invitedAt, ...member }) => ({
      ...member,
      status: member.status === "disabled" ? "disabled" : "active",
    }));
}

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
 * Đợt báo cáo suy ra cho báo cáo tháng cũ (chưa có `batchId`): từ buổi đã diễn
 * ra đầu tiên đến buổi đã diễn ra cuối cùng của tháng đó. Tháng không có buổi
 * nào thì không dựng được đợt (null).
 */
function legacyBatchFor(
  classId: string,
  month: string,
  sessions: Session[],
): ReportBatch | null {
  const held = countedSessions(sessions, classId).filter(
    (session) => session.status === "held" && session.date.startsWith(month),
  );
  const first = held[0];
  const last = held.at(-1);
  if (!first || !last) return null;
  return {
    id: `legacy-${classId}-${month}`,
    classId,
    fromSessionId: first.id,
    toSessionId: last.id,
    createdAt: `${last.date}T23:59:59.000Z`,
  };
}

/** Các đợt báo cáo: giữ đợt đã lưu, thêm đợt suy ra cho báo cáo tháng cũ. */
export function migrateReportBatches(
  batches: unknown,
  reports: unknown,
  sessions: Session[],
): ReportBatch[] {
  const result: ReportBatch[] = Array.isArray(batches)
    ? (batches as Array<Partial<ReportBatch>>).flatMap((raw) =>
        raw && raw.id && raw.classId && raw.fromSessionId && raw.toSessionId
          ? [
              {
                id: raw.id,
                classId: raw.classId,
                fromSessionId: raw.fromSessionId,
                toSessionId: raw.toSessionId,
                createdAt: raw.createdAt ?? "1970-01-01T00:00:00.000Z",
              },
            ]
          : [],
      )
    : [];
  if (!Array.isArray(reports)) return result;
  for (const raw of reports as Array<Partial<Report>>) {
    if (!raw || raw.batchId || !raw.classId || !raw.month) continue;
    const batch = legacyBatchFor(raw.classId, raw.month, sessions);
    if (batch && !result.some((item) => item.id === batch.id)) result.push(batch);
  }
  return result;
}

/**
 * Nâng báo cáo cũ: thêm `generalComment` (nhận xét chung) và `publishedAt`
 * (thời điểm phát hành) mà bản cũ chưa có. Báo cáo tháng cũ chưa có `batchId`
 * được gắn vào đợt suy ra từ tháng đó; tháng không có buổi nào thì bỏ bản đó.
 */
export function migrateReports(
  reports: unknown,
  batches: ReportBatch[] = [],
  sessions: Session[] = [],
): Report[] {
  if (!Array.isArray(reports)) return [];
  return (reports as Array<Partial<Report>>).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    if (!raw.classId || !raw.studentId) return [];
    const batchId =
      raw.batchId ??
      (raw.month ? legacyBatchFor(raw.classId, raw.month, sessions)?.id : undefined);
    if (!batchId) return [];
    const batch = batches.find((item) => item.id === batchId);
    const month =
      raw.month ??
      sessions.find((item) => item.id === batch?.toSessionId)?.date.slice(0, 7);
    if (!month) return [];
    const status = raw.status === "published" ? "published" : "draft";
    return [
      {
        id: raw.id ?? crypto.randomUUID(),
        classId: raw.classId,
        studentId: raw.studentId,
        batchId,
        month,
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
  const rawMembers =
    Array.isArray(data.members) && data.members.length
      ? (data.members as LegacyMember[])
      : defaultMembers();
  const members = migrateMembers(rawMembers);
  const legacyAuth = data.auth as LegacyAuth | null | undefined;
  const memberIds =
    (legacyAuth && Array.isArray(legacyAuth.memberIds) && legacyAuth.memberIds.length
      ? legacyAuth.memberIds
      : members
          .filter((member) => member.name === members[0]?.name)
          .map((member) => member.id)
    // Thành viên đã bị xoá (ví dụ lời mời đang chờ của bản cũ) không còn
    // trong phiên đăng nhập.
    ).filter((id) => members.some((member) => member.id === id));
  // Phiên cũ đăng nhập bằng email không còn hợp lệ: xác thực giờ bằng SĐT +
  // mật khẩu (spec mục 4 "Tài khoản"), người dùng đăng nhập lại một lần.
  const legacyPhone =
    typeof legacyAuth?.phone === "string" ? normalizePhone(legacyAuth.phone) : "";
  const auth: AuthSession | null =
    legacyAuth && legacyPhone ? { phone: legacyPhone, memberIds } : null;
  const activeMemberId =
    typeof data.activeMemberId === "string"
      ? data.activeMemberId
      : auth
        ? (memberIds[0] ?? null)
        : null;
  // Mảng nhân sự/lương/học phí: bản cũ chưa có thì điền dữ liệu mẫu, có rồi thì giữ nguyên.
  const staffTuition = defaultStaffTuition();
  const reportBatches = migrateReportBatches(
    data.reportBatches,
    data.reports,
    withSessions.sessions,
  );
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
    reportBatches,
    reports: migrateReports(data.reports, reportBatches, withSessions.sessions),
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
