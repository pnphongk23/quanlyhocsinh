export const identity = { userId: "demo-teacher", workspaceId: "demo-workspace", membershipId: "demo-membership" };
export const classIds = ["demo-6a", "demo-7b", "demo-empty"];
export const students = Array.from({ length: 8 }, (_, i) => ({ id: `demo-student-${i + 1}`, class_id: classIds[0], name: `Học sinh ${i + 1}`, enrolled_at: "2026-01-01", left_at: null, status: "active", version: 1 }));
export const sessions = [
  { id: "demo-past", class_id: classIds[0], date: "2026-10-20", start_time: "17:00", origin: "recurring", is_makeup: false, status: "held", version: 1 },
  { id: "demo-today", class_id: classIds[0], date: "2026-10-23", start_time: "17:00", origin: "recurring", is_makeup: false, status: "held", version: 1 },
  { id: "demo-future", class_id: classIds[0], date: "2026-10-27", start_time: "17:00", origin: "recurring", is_makeup: false, status: "planned", version: 1 },
  { id: "demo-cancelled", class_id: classIds[0], date: "2026-10-29", start_time: "17:00", origin: "manual", is_makeup: true, status: "cancelled", version: 1 },
  { id: "demo-manual", class_id: classIds[0], date: "2026-10-30", start_time: "18:30", origin: "manual", is_makeup: true, status: "planned", note: "Buổi học bù", version: 1 },
  { id: "demo-7b-session", class_id: classIds[1], date: "2026-10-24", start_time: "09:00", origin: "recurring", is_makeup: false, status: "planned", version: 1 },
];
export const classes = classIds.map((id, i) => ({ id, name: ["Lớp 6A", "Lớp 7B", "Lớp trống"][i], status: "active", weekdays: [2, 5], start_time: "17:00", teacher_name: "Cô Demo", version: 1 }));
export const tests = [{ id: "demo-test", class_id: classIds[0], name: "Kiểm tra giữa kỳ", date: "2026-10-20", max: 15, archived: false, version: 1 }];
export const scores = students.map((s, i) => ({ test_id: "demo-test", student_id: s.id, value: i ? 10 + i / 2 : 0, updated_at: "2026-10-20T10:00:00Z", version: 1 }));
export const attendance = sessions.flatMap((session) => students.map((student, i) => ({ session_id: session.id, student_id: student.id, status: i === 2 ? "absent" : "present", note: "", late_at: null, updated_at: `${session.date}T10:00:00Z`, version: 1 })));
export const slips = students.map((s, i) => ({ session_id: "demo-past", student_id: s.id, stars: (i % 3) + 1, note: "Làm bài tốt, tiếp tục luyện tập.", status: "sent", sent_at: "2026-10-20T12:00:00Z", version: 1 }));
export const homeworkSections = [{ id: "demo-homework", class_id: classIds[0], session_id: "demo-past", kind: "vocabulary", title: "Ôn từ vựng Unit 3", description: "Đọc và luyện phát âm." }];
export const homeworkGrades = students.map((s, i) => ({ section_id: "demo-homework", student_id: s.id, level: ["excellent", "done", "not_done"][i % 3], updated_at: "2026-10-20T12:00:00Z", version: 1 }));
export const reports = students.slice(0, 3).map((s, i) => ({ id: `demo-report-${i}`, class_id: classIds[0], student_id: s.id, month: "2026-10", status: "published", general_comment: "Tiến bộ tốt.", needs_republish: false, publication_count: 1, published_at: "2026-10-22T12:00:00Z", version: 1 }));
// Use the compatibility cache path in the guardian view: an empty publication
// snapshot would intentionally hide the otherwise published demo report.
export const publications = [];
export const entities = { classes, students, sessions, attendance, tests, scores, slips, homeworkSections, homeworkGrades, reports, reportPublications: publications };

export function sessionFor(role = "staff") {
  const guardian = role === "guardian";
  const user = { id: guardian ? "demo-parent" : identity.userId, phone: "09000000001", display_name: guardian ? "Phụ huynh Demo" : "Cô Demo", must_change_password: false };
  const permissions = guardian
    ? { classes: "none", students: "none", sessions_attendance: "read", scores: "read", lectures: "none", comments_reports: "read" }
    : { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "write", comments_reports: "write" };
  const membership = { id: guardian ? "demo-guardian" : identity.membershipId, workspace: { id: identity.workspaceId, name: "Trung tâm Demo" }, role: { id: guardian ? "demo-parent-role" : "demo-role", name: guardian ? "Phụ huynh" : "Admin", system_key: guardian ? null : "admin", scope_kind: guardian ? "linked_students" : "workspace" }, status: "active", scope_epoch: 1, permissions };
  if (guardian) membership.students = [students[0], students[1]].map((s) => ({ id: s.id, name: s.name, class_id: s.class_id, class_name: "Lớp 6A", teacher_name: "Cô Demo" }));
  const me = { user, active_membership_id: membership.id, memberships: [membership] };
  return { token: "local-demo-token", user, me, activeMembershipId: membership.id, ...(guardian ? { guardianAccount: false } : {}) };
}

export function rolePickerSession() {
  const base = sessionFor("staff");
  const admin = base.me.memberships[0];
  const teacher = { ...admin, id: "demo-teacher-membership", role: { id: "demo-teacher-role", name: "Giáo viên", system_key: null, scope_kind: "assigned_classes" } };
  return { ...base, activeMembershipId: null, me: { ...base.me, active_membership_id: null, memberships: [admin, teacher] } };
}
