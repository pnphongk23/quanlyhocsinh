export interface Class {
  id: string;
  name: string;
  weekdays: number[];
  time: string;
  teacherName?: string | null;
  status: "active" | "archived";
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  parentPhone: string;
  /** Người nhận phiếu: "Mẹ", "Bố"… (chỉ để hiển thị ở prototype web). */
  guardianRelation?: string;
  enrolledAt: string;
  leftAt: string | null;
  status: "active" | "left";
}

export interface Session {
  id: string;
  classId: string;
  date: string;
  time?: string;
  origin?: "recurring" | "manual";
  note?: string;
  /** Buổi học bù (buổi lẻ đánh dấu "Học bù"). */
  makeup?: boolean;
  status: "held" | "cancelled" | "planned";
  version?: number;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "late" | "excused" | "absent";
  note: string;
  lateAt: string | null;
}

export interface Test {
  id: string;
  classId: string;
  name: string;
  date: string;
  /** Thang điểm của bài: số nguyên 1..1000. Bài tạo mới mặc định 15. */
  max: number;
  /**
   * Bài đã lưu trữ: còn học sinh có điểm (kể cả 0) nên không xoá cứng.
   * Thiếu trường (dữ liệu localStorage cũ) nghĩa là chưa lưu trữ.
   */
  archived?: boolean;
}

export interface Score {
  id: string;
  testId: string;
  studentId: string;
  /** null = Chưa có điểm. */
  value: number | null;
}

export type StarLevel = 1 | 2 | 3;

export interface Comment {
  id: string;
  classId: string;
  studentId: string;
  /** Phiếu luôn thuộc đúng một buổi học. */
  sessionId: string;
  /** null = chưa chọn sao (chưa gửi được). */
  stars: StarLevel | null;
  /** Ghi chú tự do, không bắt buộc. */
  note: string;
  /** sent = phụ huynh đã thấy; draft = nháp (có thể đang chờ mạng). */
  status: "draft" | "sent";
  /** Đã bấm gửi lúc mất mạng: sẽ tự gửi khi có mạng. */
  sendQueued: boolean;
  sentAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export type HomeworkKind = "vocabulary" | "reading" | "speaking" | "exercise";

export type HomeworkLevel = "excellent" | "done" | "not_done";

export interface HomeworkSection {
  id: string;
  sessionId: string;
  kind: HomeworkKind;
  title: string;
  description: string;
}

export interface HomeworkGrade {
  sectionId: string;
  studentId: string;
  level: HomeworkLevel;
}

export interface Report {
  id: string;
  classId: string;
  studentId: string;
  month: string;
  status: "draft" | "published";
  needsRepublish: boolean;
  /** Nhận xét chung của tháng do giáo viên soạn (nội dung báo cáo, spec mục 4). */
  generalComment: string;
  /** Thời điểm phát hành gần nhất; null = chưa phát hành. */
  publishedAt: string | null;
}

export interface ChangeLog {
  id: string;
  entity: "attendance" | "scores";
  recordId: string;
  before: Attendance | Score;
  after: Attendance | Score;
  changedAt: string;
  actor: string;
}

export interface AuthSession {
  /** SĐT đăng nhập, dạng nội bộ 9 số không có tiền tố +84 (vd. 900000001). */
  phone: string;
  /** Memberships (role in this workspace) belonging to the signed-in person. */
  memberIds: string[];
}

export type PermissionGroup =
  | "classes"
  | "students"
  | "sessions_attendance"
  | "scores"
  | "lectures"
  | "comments_reports";

export type PermissionLevel = "none" | "read" | "write";

export type RoleKind = "staff" | "guardian";

export interface Role {
  id: string;
  name: string;
  kind: RoleKind;
  /** System roles (Admin) cannot be edited or deleted. */
  system: boolean;
  permissions: Record<PermissionGroup, PermissionLevel>;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  roleId: string;
  /** Classes this member is assigned to (staff roles only; Admin sees all). */
  classIds: string[];
  /** Con được liên kết (chỉ role phụ huynh dùng). */
  studentIds?: string[];
  status: "active" | "disabled";
}

export interface PendingChange {
  id: string;
  entity: string;
  recordId: string;
  createdAt: string;
}

export type SaveState = "unsaved" | "local" | "synced" | "error";

/** Prototype-compatible view model; no localStorage or seeded records. */
export interface StoreState {
  classes: Class[];
  students: Student[];
  sessions: Session[];
  attendance: Attendance[];
  tests: Test[];
  scores: Score[];
  comments: Comment[];
  homeworkSections: HomeworkSection[];
  homeworkGrades: HomeworkGrade[];
  reports: Report[];
  reportPublications: Array<{ id: string; report_id: string; class_id: string; student_id: string; month: string; publication_no: number; published_at: string; snapshot: unknown }>;
  changeLogs: ChangeLog[];
  pending: PendingChange[];
  auth: AuthSession | null;
  currentClassId: string | null;
  roles: Role[];
  members: Member[];
  activeMemberId: string | null;
}
