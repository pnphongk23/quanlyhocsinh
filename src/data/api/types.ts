import type { CorePermissionGroup, PermissionLevel, HomeworkKind, HomeworkLevel, SlipScale, StarLevel } from "../types";
/** Wire types from api-spec.md; dates YYYY-MM-DD, timestamps UTC, weekdays ISO 1..7. */
export type ScopeKind = "workspace" | "assigned_classes" | "linked_students";
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown>; request_id: string };
}
export interface Page<T> { items: T[]; next_cursor: string | null }
export interface ApiUser { id: string; phone: string; display_name: string | null; must_change_password: boolean; email?: string | null }
export interface ApiMembership {
  id: string;
  workspace: { id: string; name: string };
  role: { id: string; name: string; system_key: string | null; scope_kind: ScopeKind };
  /** Tên theo workspace do Admin đặt; có thể null. */
  display_name?: string | null;
  /** Lớp được giao, chỉ có khi `scope_kind = "assigned_classes"` (GET /me). */
  class_ids?: string[];
  /** Guardian-only scope supplied by login/register-guardian/GET /me. */
    students?: Array<{
      id: string;
      name: string;
      class_id: string;
      class_name: string;
      teacher_name: string | null;
    }>;
    permissions: ApiPermissions;
}
/** Vai trò gán được cho nhân sự (Admin không gán qua API). */
export type StaffRoleKey = "teacher" | "assistant";
export type StaffStatus = "active" | "disabled" | "pending";
export type StaffPermissionGroup = Exclude<CorePermissionGroup, "lectures"> | "send_comments";
export type StaffPermissions = Record<Exclude<CorePermissionGroup, "lectures">, PermissionLevel> & { send_comments: "none" | "write" };
export type ApiPermissions = Record<CorePermissionGroup, PermissionLevel> & { send_comments?: "none" | "write" };
export interface StaffMember {
  id: string;
  kind: "member" | "pending";
  user_id: string | null;
  /** Tên Admin đặt theo workspace; null khi chưa có. */
  display_name: string | null;
  phone: string;
  role: { id: string; name: string; system_key: string | null };
  class_ids: string[];
  status: StaffStatus;
  is_self: boolean;
  created_at: string;
  version: number;
}
export interface StaffCreateBody { phone: string; display_name: string; role: StaffRoleKey; class_ids?: string[] }
export interface StaffPatchBody { role?: StaffRoleKey; class_ids?: string[]; status?: "active" | "disabled"; display_name?: string; base_version?: number }
export interface RolePermissionsItem { role: { id: string; name: string; system_key: string | null }; permissions: StaffPermissions }
export interface MeResponse {
  user: ApiUser; active_membership_id: string | null;
    memberships: (ApiMembership & { status: "active" | "disabled"; scope_epoch: number })[];
}
export interface LoginResponse { token: string; expires_at: string; user: ApiUser; memberships: ApiMembership[]; active_membership_id: string | null }
interface Versioned { version: number }
interface Cell extends Versioned { student_id: string; updated_at: string }
export interface ApiClass extends Versioned { id: string; name: string; status: "active" | "archived"; weekdays: number[]; start_time: string; teacher_name: string | null }
export interface ApiStudent extends Versioned { id: string; class_id: string; name: string; parent_phone?: string | null; enrolled_at: string; left_at: string | null; status: "active" | "left" }
export interface ApiSession extends Versioned { id: string; class_id: string; date: string; start_time: string; origin: "recurring" | "manual"; is_makeup: boolean; status: "planned" | "held" | "cancelled"; note?: string }
export interface ApiAttendance extends Cell { session_id: string; status: "present" | "late" | "excused" | "absent"; note: string; late_at: string | null }
export interface ApiTest extends Versioned { id: string; class_id: string; name: string; date: string; archived: boolean }
export interface ApiScore extends Cell { test_id: string; value: number | null }
export interface ApiSlip extends Cell { session_id: string; criteria?: number | null; comment?: string | null; scale?: SlipScale; stars?: StarLevel | null; note: string; hw_manual?: boolean | 0 | 1; status: "draft" | "sent"; sent_at: string | null }
export interface ApiHomeworkSection extends Versioned { id: string; class_id: string; session_id: string; kind: HomeworkKind; title: string; description: string }
export interface ApiHomeworkGrade extends Cell { section_id: string; level: HomeworkLevel | null }
/** Nội dung báo cáo một đợt, dùng cho xem trước (`GET /reports/:id/preview`) và bản chụp đã phát hành. */
export interface ReportBody {
  student_id: string; month: string;
  range?: ApiReportRange;
  attendance: { present: number; late: number; excused: number; absent: number; held_sessions: number };
    tests: { test_id: string; name: string; date: string; value: number | null }[];
    stars: { three: number; two: number; one: number };
    stars5?: { s5: number; s4: number; s3: number; s2: number; s1: number; s0: number };
  homework: { kind: HomeworkKind; excellent: number; done: number; not_done: number }[];
  general_comment: string; ready: boolean;
}
export interface ApiReportRange { from_key: string; to_key: string; from_number: number | null; to_number: number | null; session_count?: number; label?: string }
export interface ReportPreview extends ReportBody { report_id?: string; batch_id?: string }
export interface ApiReportBatch extends Versioned { id: string; class_id: string; from_session_id: string | null; to_session_id: string | null; from_key: string; to_key: string; month?: string | null; from_number?: number | null; to_number?: number | null }
export interface ApiReport extends Versioned { id: string; class_id: string; student_id: string; batch_id: string; month: string; status: "draft" | "published"; general_comment: string; needs_republish: boolean; publication_count: number; published_at: string | null }
export interface ApiPublication { id: string; report_id: string; batch_id?: string | null; class_id: string; student_id: string; month: string; publication_no: number; published_at: string; snapshot: unknown }
/** Đợt trong `GET/POST .../report-batches`: thêm số buổi và đếm trạng thái, không có `version`. */
export interface ApiBatchListItem { id: string; class_id: string; from_session_id: string | null; to_session_id: string | null; from_key: string; to_key: string; month?: string | null; from_number: number | null; to_number: number | null; counts: { total: number; draft: number; published: number; needs_republish: number }; created_at: string }
/** Dòng báo cáo trong `GET /report-batches/:id/reports`. */
export interface ApiBatchReportItem { report_id: string; batch_id: string; student_id: string; student_name?: string; month: string; status: "draft" | "published"; general_comment?: string; needs_republish: boolean; publication_count: number; published_at: string | null; version: number }
/** Dòng trong `GET /students/:id/reports`. */
export interface ApiStudentReportItem { report_id: string; batch_id: string; student_id: string; month: string; status: "draft" | "published"; needs_republish: boolean; publication_count: number; published_at: string | null; version: number; from_key: string; to_key: string; from_number: number | null; to_number: number | null }
export interface ApiConflict extends Versioned { id: string; entity: "attendance" | "score" | "slip" | "homework_grade"; k1: string; k2: string; server_value: Record<string, unknown>; server_version: number; client_value: Record<string, unknown>; created_at: string; resolved_at: string | null }
export interface EntityMap {
  class: ApiClass; student: ApiStudent; class_session: ApiSession; attendance: ApiAttendance; test: ApiTest; score: ApiScore; slip: ApiSlip; homework_section: ApiHomeworkSection; homework_grade: ApiHomeworkGrade; report_batch: ApiReportBatch; report: ApiReport; report_publication: ApiPublication; conflict: ApiConflict;
}
export interface CommandPayloads {
  "attendance.set": { session_id: string; student_id: string; status: ApiAttendance["status"]; note?: string; late_at?: string | null };
  "test.create": { id: string; class_id: string; name: string; date: string };
  "test.update": { id: string; name?: string; date?: string };
  "test.delete": { id: string };
  "score.set": { test_id: string; student_id: string; value: number | null };
  "slip.set": { session_id: string; student_id: string; criteria?: number; comment?: string | null; note: string; stars?: StarLevel; hw_manual?: boolean };
  "slip.send": { session_id: string; student_ids: string[]; defaults?: Array<{ student_id: string; criteria: number; comment: string }> };
  "homework.assign": { session_id: string; sections: { id: string; kind: HomeworkKind; title: string; description: string }[] };
  "homework.section.upsert": { id: string; session_id: string; kind: HomeworkKind; title: string; description: string };
  "homework.section.delete": { id: string };
  "homework.grade.set": { section_id: string; student_id: string; level: HomeworkLevel | null };
  "conflict.resolve": { conflict_id: string; choice: "server" | "client" };
}
/** id is the idempotency key. Retrying a command must reuse this UUID. */
export type SyncCommand = { [K in keyof CommandPayloads]: {
  id: string; type: K; payload: CommandPayloads[K]; created_at: string;
} & (K extends "slip.send" | "conflict.resolve" ? { base_version?: never } : { base_version: number }) }[keyof CommandPayloads];
type Applied = { id: string; status: "applied"; version?: number; noop?: boolean; outcome?: "deleted" | "archived"; sent?: string[]; skipped?: { student_id: string; reason: string }[] };
type ConflictResult = { id: string; status: "conflict"; conflict_id: string; server: Record<string, unknown> };
type Rejected = { id: string; status: "rejected"; error: ApiErrorBody["error"] };
export type CommandResult = Applied | ConflictResult | Rejected | { id: string; status: "duplicate"; original_status: "applied" | "conflict"; version?: number; conflict_id?: string; server?: Record<string, unknown> };
export interface PushRequest { membership_id: string; device_id: string; commands: SyncCommand[] }
export interface PushResponse { epoch: number; cursor: number; results: CommandResult[] }
export interface PullResponse { cursor: number; epoch: number; has_more: boolean; server_time: string; upserts: { [K in keyof EntityMap]?: EntityMap[K][] }; deleted: { entity: keyof EntityMap; k1: string; k2: string }[] }
export interface SnapshotResponse { cursor: number; epoch: number; window: { from: string; to: string }; entities: (keyof EntityMap)[] }
export interface SnapshotPage<T> { items: T[]; next_after: string | null }
