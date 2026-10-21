import type { PermissionGroup, PermissionLevel, HomeworkKind, HomeworkLevel, StarLevel } from "../types";
/** Wire types from api-spec.md; dates YYYY-MM-DD, timestamps UTC, weekdays ISO 1..7. */
export type ScopeKind = "workspace" | "assigned_classes" | "linked_students";
export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown>; request_id: string };
}
export interface Page<T> { items: T[]; next_cursor: string | null }
export interface ApiUser { id: string; phone: string; display_name: string | null; must_change_password: boolean }
export interface ApiMembership {
  id: string;
  workspace: { id: string; name: string };
  role: { id: string; name: string; system_key: string | null; scope_kind: ScopeKind };
}
export interface MeResponse {
  user: ApiUser; active_membership_id: string | null;
  memberships: (ApiMembership & { status: "active" | "disabled"; scope_epoch: number; permissions: Record<PermissionGroup, PermissionLevel> })[];
}
export interface LoginResponse { token: string; expires_at: string; user: ApiUser; memberships: ApiMembership[]; active_membership_id: string | null }
interface Versioned { version: number }
interface Cell extends Versioned { student_id: string; updated_at: string }
export interface ApiClass extends Versioned { id: string; name: string; status: "active" | "archived"; weekdays: number[]; start_time: string }
export interface ApiStudent extends Versioned { id: string; class_id: string; name: string; parent_phone?: string | null; enrolled_at: string; left_at: string | null; status: "active" | "left" }
export interface ApiSession extends Versioned { id: string; class_id: string; date: string; start_time: string; origin: "recurring" | "manual"; is_makeup: boolean; status: "planned" | "held" | "cancelled"; note?: string }
export interface ApiAttendance extends Cell { session_id: string; status: "present" | "late" | "excused" | "absent"; note: string; late_at: string | null }
export interface ApiTest extends Versioned { id: string; class_id: string; name: string; date: string; max: number; archived: boolean }
export interface ApiScore extends Cell { test_id: string; value: number | null }
export interface ApiSlip extends Cell { session_id: string; stars: StarLevel | null; note: string; status: "draft" | "sent"; sent_at: string | null }
export interface ApiHomeworkSection extends Versioned { id: string; class_id: string; session_id: string; kind: HomeworkKind; title: string; description: string }
export interface ApiHomeworkGrade extends Cell { section_id: string; level: HomeworkLevel | null }
export interface ReportPreview {
  student_id: string; month: string;
  attendance: { present: number; late: number; excused: number; absent: number; held_sessions: number };
  tests: { test_id: string; name: string; date: string; max: number; value: number | null }[];
  stars: { three: number; two: number; one: number };
  homework: { kind: HomeworkKind; excellent: number; done: number; not_done: number }[];
  general_comment: string; ready: boolean;
}
export interface ApiReport extends Versioned { id: string; class_id: string; student_id: string; month: string; status: "draft" | "published"; general_comment: string; needs_republish: boolean; publication_count: number; published_at: string | null }
export interface ApiPublication { id: string; report_id: string; class_id: string; student_id: string; month: string; publication_no: number; published_at: string; has_pdf: boolean; snapshot: ReportPreview }
export interface ApiConflict extends Versioned { id: string; entity: "attendance" | "score" | "slip" | "homework_grade"; k1: string; k2: string; server_value: Record<string, unknown>; server_version: number; client_value: Record<string, unknown>; created_at: string; resolved_at: string | null }
export interface EntityMap {
  class: ApiClass; student: ApiStudent; class_session: ApiSession; attendance: ApiAttendance; test: ApiTest; score: ApiScore; slip: ApiSlip; homework_section: ApiHomeworkSection; homework_grade: ApiHomeworkGrade; report: ApiReport; report_publication: ApiPublication; conflict: ApiConflict;
}
export interface CommandPayloads {
  "attendance.set": { session_id: string; student_id: string; status: ApiAttendance["status"]; note?: string; late_at?: string | null };
  "test.create": { id: string; class_id: string; name: string; date: string; max?: number };
  "test.update": { id: string; name?: string; date?: string; max?: number };
  "test.delete": { id: string };
  "score.set": { test_id: string; student_id: string; value: number | null };
  "slip.set": { session_id: string; student_id: string; stars: StarLevel | null; note: string };
  "slip.send": { session_id: string; student_ids: string[] };
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
export type CommandResult = Applied | ConflictResult | Rejected | { id: string; status: "duplicate"; original_status: "applied" | "conflict" | "rejected"; version?: number; conflict_id?: string; server?: Record<string, unknown>; error?: ApiErrorBody["error"] };
export interface PushRequest { membership_id: string; device_id: string; commands: SyncCommand[] }
export interface PushResponse { epoch: number; cursor: number; results: CommandResult[] }
export interface PullResponse { cursor: number; epoch: number; has_more: boolean; server_time: string; upserts: { [K in keyof EntityMap]?: EntityMap[K][] }; deleted: { entity: keyof EntityMap; k1: string; k2: string }[] }
export interface SnapshotResponse { cursor: number; epoch: number; window: { from: string; to: string }; entities: (keyof EntityMap)[] }
export interface SnapshotPage<T> { items: T[]; next_after: string | null }
