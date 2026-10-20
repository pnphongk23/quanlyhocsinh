export interface Class {
  id: string;
  name: string;
  weekdays: number[];
  time: string;
  status: "active" | "archived";
}
export interface Student {
  id: string;
  classId: string;
  name: string;
  parentPhone: string;
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
  max: 10;
}
export interface Score {
  id: string;
  testId: string;
  studentId: string;
  /** null = Chưa có điểm (không tính vào trung bình). */
  value: number | null;
}
/** Mức sao của nhận xét sau buổi: 1, 2 hoặc 3 sao. */
export type StarLevel = 1 | 2 | 3;
/** Phiếu buổi học của một em: mức sao, ghi chú tự do và trạng thái gửi. */
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
/** Bốn loại phần bài tập về nhà; mỗi buổi tối đa một phần mỗi loại. */
export type HomeworkKind = "vocabulary" | "reading" | "speaking" | "exercise";
/** Kết quả chấm một phần BTVN: Hoàn thành tốt / Hoàn thành / Chưa hoàn thành. */
export type HomeworkLevel = "excellent" | "done" | "not_done";
/** Một phần BTVN giao ở buổi `sessionId`. */
export interface HomeworkSection {
  id: string;
  sessionId: string;
  kind: HomeworkKind;
  title: string;
  description: string;
}
/** Kết quả chấm một phần BTVN cho một em; không có dòng nghĩa là "Chưa chấm". */
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
  email: string;
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
  status: "active" | "invited" | "disabled";
  invitedAt: string | null;
}
export interface LectureFile {
  id: string;
  name: string;
  size: number;
  type: string;
}
export interface LectureSection {
  id: string;
  title: string;
  description: string;
  files: LectureFile[];
}
export interface Lecture {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  archived: boolean;
  sections: LectureSection[];
}
export interface SessionLecture {
  sessionId: string;
  lectureId: string;
  position: number;
}
export interface PendingChange {
  id: string;
  entity: string;
  recordId: string;
  createdAt: string;
}
/** Vị trí dạy trong một lớp: giáo viên chính hoặc trợ giảng. */
export type StaffPosition = "main" | "assistant";
/** Phân công một thành viên nhân sự vào lớp theo vị trí. */
export interface ClassStaff {
  classId: string;
  memberId: string;
  position: StaffPosition;
}
/** Dạy thay một buổi; originalMemberId null khi là buổi lẻ (học bù) chưa có người dạy. */
export interface SessionSubstitute {
  id: string;
  sessionId: string;
  position: StaffPosition;
  originalMemberId: string | null;
  substituteMemberId: string;
  reason: string;
  createdAt: string;
}
/** Đơn giá dạy một buổi theo vị trí (VND/buổi). */
export interface PayRate {
  memberId: string;
  mainRate: number;
  assistantRate: number;
}
/** Khoản cộng/trừ lương tháng, kèm ghi chú. */
export interface PayAdjustment {
  id: string;
  memberId: string;
  month: string;
  amount: number;
  note: string;
}
/** Trạng thái bảng lương tháng: nháp hoặc đã chốt (khoá sửa). */
export interface PayrollMonth {
  month: string;
  status: "draft" | "locked";
}
/**
 * Phân công gốc của một buổi đã diễn ra, chốt tại thời điểm buổi được ghi
 * nhận. Dùng để lương tháng nháp không đổi khi Admin phân công lại lớp sau đó.
 */
export interface SessionBaseStaff {
  sessionId: string;
  position: StaffPosition;
  memberId: string;
}
/** Một dòng lương đã chốt trong snapshot tháng. */
export interface PayrollSnapshotLine {
  sessionId: string;
  date: string;
  time?: string;
  classId: string;
  position: StaffPosition;
  /** own: phân công gốc; substitute: dạy thay buổi đó. */
  kind: "own" | "substitute";
  otherMemberId: string | null;
  makeup: boolean;
  rate: number;
  amount: number;
  planned: boolean;
}
/** Bảng lương một người trong snapshot tháng đã chốt. */
export interface PayrollSnapshotMember {
  memberId: string;
  memberName: string;
  lines: PayrollSnapshotLine[];
  mainCount: number;
  assistantCount: number;
  plannedCount: number;
  sessionAmount: number;
  plannedAmount: number;
  adjustments: PayAdjustment[];
  adjustmentTotal: number;
  total: number;
  missingRate: boolean;
}
/**
 * Bản chụp bất biến của bảng lương một tháng đã chốt. Mọi thay đổi đơn giá,
 * phân công, dạy thay hoặc buổi học sau khi chốt không làm đổi snapshot.
 */
export interface PayrollSnapshot {
  month: string;
  lockedAt: string;
  members: PayrollSnapshotMember[];
}
/** Học phí mỗi buổi của lớp. */
export interface ClassFee {
  classId: string;
  feePerSession: number;
  chargeAbsent: boolean;
  /** Có tính phí buổi học bù hay không (mặc định bật). */
  chargeMakeup: boolean;
}
/** Giảm học phí theo % cho từng học sinh. */
export interface StudentFee {
  studentId: string;
  discountPercent: number;
}
/** Một lần ghi nhận thu học phí. */
export interface TuitionPayment {
  id: string;
  studentId: string;
  month: string;
  amount: number;
  paidAt: string;
  method: "cash" | "transfer";
  note: string;
}
/** Thông báo học phí đã gửi cho phụ huynh. */
export interface TuitionNotice {
  studentId: string;
  month: string;
  amount: number;
  sentAt: string;
}
export interface StoreState {
  classes: Class[];
  students: Student[];
  sessions: Session[];
  attendance: Attendance[];
  tests: Test[];
  scores: Score[];
  comments: Comment[];
  /** Các phần BTVN đã giao theo buổi. */
  homeworkSections: HomeworkSection[];
  /** Kết quả chấm BTVN; thiếu dòng = "Chưa chấm". */
  homeworkGrades: HomeworkGrade[];
  reports: Report[];
  changeLogs: ChangeLog[];
  pending: PendingChange[];
  auth: AuthSession | null;
  currentClassId: string | null;
  roles: Role[];
  members: Member[];
  /** Membership the signed-in person currently acts as. */
  activeMemberId: string | null;
  lectures: Lecture[];
  sessionLectures: SessionLecture[];
  classStaff: ClassStaff[];
  sessionSubstitutes: SessionSubstitute[];
  payRates: PayRate[];
  payAdjustments: PayAdjustment[];
  payrollMonths: PayrollMonth[];
  /** Phân công gốc của các buổi đã diễn ra (giữ lịch sử khi phân công lại). */
  sessionStaffBase: SessionBaseStaff[];
  /** Snapshot bảng lương của các tháng đã chốt. */
  payrollSnapshots: PayrollSnapshot[];
  classFees: ClassFee[];
  studentFees: StudentFee[];
  tuitionPayments: TuitionPayment[];
  tuitionNotices: TuitionNotice[];
}
export type SaveState = "unsaved" | "local" | "synced" | "error";
