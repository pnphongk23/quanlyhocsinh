import { classes, identity, sessionFor } from "../ui-audit-fixtures/demo.mjs";

export const viewports = [
  { name: "390x844", width: 390, height: 844, tapMin: 44, nav: "tabbar" },
  { name: "834x1112", width: 834, height: 1112, tapMin: 44, nav: "rail" },
  { name: "1440x900", width: 1440, height: 900, tapMin: 36, nav: "sidebar" },
];
const accountScenarios = [
  { route: "/cai-dat", state: "thuong", kind: "settings" },
  { route: "/cai-dat/doi-mat-khau", state: "thuong", kind: "password" },
  { route: "/cai-dat/email", state: "thuong", kind: "email" },
];
export const scenarios = [
  ...accountScenarios,
  ...["thuong", "dang-sua", "menu-cuoi", "focus-sheet", "draft-breakpoint", "rong", "ten-dai", "8-tieu-chi"].map((state) => ({ route: "/cai-dat/bo-tieu-chi", state, kind: "criteria" })),
    ...["ngan-6-em", "dai-30-em", "ten-dai", "chua-diem-danh", "lan-tron", "unsaved-breakpoint", "save-failure", "server-500-save", "da-luu", "dang-tai", "loi"].map((state) => ({ route: "/lop/demo-6a/buoi-hoc/demo-past", state, kind: "attendance" })),
    { route: "/lop/demo-6a/buoi-hoc/demo-past", url: "/lop/demo-6a/buoi-hoc/demo-past?tab=nhan-xet", state: "tab-nhan-xet", kind: "attendance" },
    { route: "/lop/demo-6a/buoi-hoc/demo-past", url: "/lop/demo-6a/buoi-hoc/demo-past?tab=btvn", state: "tab-btvn", kind: "attendance" },
    { route: "/lop/demo-6a/buoi-hoc/demo-past", url: "/lop/demo-6a/buoi-hoc/demo-past?tab=btvn", state: "homework-draft-breakpoint", kind: "attendance" },
];
export { classes, identity, sessionFor };

export function fixtureEntities(scenario) {
  const size = scenario.state === "dai-30-em" ? 30 : scenario.state === "ngan-6-em" ? 6 : 8;
  const students = Array.from({ length: size }, (_, i) => ({
    id: `layout-student-${i + 1}`, class_id: "demo-6a",
    name: scenario.state === "ten-dai" ? `Học sinh có tên rất dài dùng để kiểm tra bố cục ${i + 1}` : `Học sinh ${i + 1}`,
    enrolled_at: "2026-01-01", left_at: null, status: "active", version: 1,
  }));
  const sessions = [{ id: "demo-past", class_id: "demo-6a", date: "2026-10-20", start_time: "17:00", origin: "recurring", is_makeup: false, status: "held", version: 1 }];
  const attendance = scenario.state === "da-luu"
      ? students.map((student, i) => ({ session_id: "demo-past", student_id: student.id, status: i % 3 ? "present" : "absent", note: "", late_at: null, updated_at: "2026-10-20T10:00:00Z", version: 1 }))
      : scenario.state === "lan-tron"
        ? students.slice(0, Math.ceil(students.length / 2)).map((student, i) => ({ session_id: "demo-past", student_id: student.id, status: i % 2 ? "present" : "absent", note: "", late_at: null, updated_at: "2026-10-20T10:00:00Z", version: 1 }))
        : [];
  return { classes, students, sessions, attendance, tests: [], scores: [], slips: [], homeworkSections: [], homeworkGrades: [], reportBatches: [], reports: [], reportPublications: [] };
}
