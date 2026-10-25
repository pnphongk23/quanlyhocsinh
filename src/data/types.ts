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
  /** Legacy cache field: accepted on read and ignored by current features. */
  max?: number;
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

export type StarLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type SlipScale = 3 | 5;

export interface Comment {
  id: string;
  classId: string;
  studentId: string;
  /** Phiếu luôn thuộc đúng một buổi học. */
  sessionId: string;
  /** Bitmask tiêu chí mới (0..31); null cho phiếu cũ thang 3. */
  criteria?: number | null;
  /** Câu nhận xét riêng; null = dùng câu mặc định theo sao. */
  comment?: string | null;
  /** Thang phiếu; phiếu cũ mặc định là thang 3. */
  scale?: SlipScale;
  /** Sao hiển thị: client tính từ criteria hoặc giữ nguyên giá trị cũ thang 3. */
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

/** Đợt báo cáo của cả lớp theo khoảng buổi; khoảng lưu theo mốc "YYYY-MM-DD HH:MM" của buổi đầu/cuối. */
export interface ReportBatch {
  id: string;
  classId: string;
  /** null với đợt chuyển từ báo cáo tháng cũ (không có buổi đầu/cuối). */
  fromSessionId: string | null;
  toSessionId: string | null;
  fromKey: string;
  toKey: string;
}

export interface Report {
  id: string;
  classId: string;
  studentId: string;
  /** Đợt báo cáo chứa bản này; mỗi đợt có tối đa một bản cho mỗi học sinh. */
  batchId: string;
  /** Tháng của buổi kết thúc đợt (YYYY-MM), luôn có giá trị. */
  month: string;
  status: "draft" | "published";
  needsRepublish: boolean;
  /** Nhận xét chung của đợt do giáo viên soạn (nội dung báo cáo, spec mục 4). */
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
  reportBatches: ReportBatch[];
  reports: Report[];
  reportPublications: Array<{ id: string; report_id: string; batch_id?: string | null; class_id: string; student_id: string; month: string; publication_no: number; published_at: string; snapshot: unknown }>;
  changeLogs: ChangeLog[];
  pending: PendingChange[];
  auth: AuthSession | null;
  currentClassId: string | null;
  roles: Role[];
  members: Member[];
  activeMemberId: string | null;
}
