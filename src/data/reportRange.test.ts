import { describe, expect, it } from "vitest";
import { buildRangeStudentReport } from "./reportModel";
import {
  compareBatches,
  defaultRange,
  rangeError,
  rangeLabels,
  resolveRange,
  sessionChoices,
} from "./reportRange";
import type { ReportBatch, Session, Student } from "./types";

const session = (id: string, date: string, status: Session["status"], time = "18:00"): Session => ({
  id, classId: "c1", date, time, origin: "recurring", status,
});
const sessions = [
  session("s1", "2026-10-01", "held"),
  session("s2", "2026-10-05", "cancelled"),
  session("s3", "2026-10-08", "held"),
  session("s4", "2026-10-12", "held"),
  session("s5", "2026-10-19", "planned"),
  { ...session("other", "2026-10-02", "held"), classId: "c2" },
];
const batch = (patch: Partial<ReportBatch> = {}): ReportBatch => ({
  id: "b1", classId: "c1", fromSessionId: "s1", toSessionId: "s4", fromKey: "2026-10-01 18:00", toKey: "2026-10-12 18:00", ...patch,
});

describe("khoảng buổi mặc định và lựa chọn buổi", () => {
    it("mặc định từ ngày đầu đến ngày đã diễn ra gần nhất, bỏ buổi hủy và buổi chưa diễn ra", () => {
    expect(defaultRange(sessions, "c1")).toEqual({ fromSessionId: "s1", toSessionId: "s4" });
  });

  it("lớp chưa có buổi nào đã diễn ra thì không có khoảng mặc định", () => {
    expect(defaultRange([session("p1", "2026-10-01", "planned")], "c1")).toBeNull();
    expect(defaultRange(sessions, "empty")).toBeNull();
  });

  it("lựa chọn hiển thị thứ và ngày, không có buổi hủy", () => {
    expect(sessionChoices(sessions, "c1").map((choice) => choice.label)).toEqual([
      "T5 · 01/10",
      "T5 · 08/10",
      "T2 · 12/10",
      "T2 · 19/10",
    ]);
  });

  it("từ chối buổi hủy, buổi khác lớp và khoảng ngược", () => {
    expect(rangeError(sessions, "c1", "s1", "s4")).toBeNull();
    expect(rangeError(sessions, "c1", "s2", "s4")).toBe("Không chọn buổi đã hủy.");
    expect(rangeError(sessions, "c1", "s1", "other")).toBe("Chọn buổi thuộc lớp này.");
    expect(rangeError(sessions, "c1", "s4", "s1")).toBe("Buổi bắt đầu phải trước hoặc cùng buổi kết thúc.");
    expect(rangeError(sessions, "c1", "s3", "s3")).toBeNull();
  });
});

describe("nhãn khoảng", () => {
    it("đợt cũ giữ số buổi cạnh khoảng ngày", () => {
      expect(rangeLabels({ fromKey: "2026-10-01 18:00", toKey: "2026-10-24 18:00", fromNumber: 1, toNumber: 8 })).toEqual({
        label: "Buổi 1–8 · 01/10–24/10", sessionsLabel: "", datesLabel: "01/10–24/10",
      });
    });

  it("một buổi chỉ hiển thị ngày", () => {
      expect(rangeLabels({ fromKey: "2026-10-14 18:00", toKey: "2026-10-14 18:00", fromNumber: 8, toNumber: 8 }).label).toBe("Buổi 8–8 · 14/10");
    });

    it("đợt theo tháng có tên tháng và năm", () => {
      expect(rangeLabels({ fromKey: "2026-10-01 00:00", toKey: "2026-10-31 23:59", fromNumber: null, toNumber: null, month: "2026-10" })).toEqual({
        label: "Tháng 10/2026", sessionsLabel: "", datesLabel: "Tháng 10/2026",
      });
    });

  it("đợt không có số buổi (chuyển từ báo cáo tháng cũ) chỉ có ngày", () => {
    expect(rangeLabels({ fromKey: "2026-09-01 00:00", toKey: "2026-09-31 23:59", fromNumber: null, toNumber: null })).toEqual({
      label: "01/09–31/09", sessionsLabel: "", datesLabel: "01/09–31/09",
    });
  });

  it("giải mã mốc ngày; buổi đã hủy hoặc không có mã buổi vẫn chỉ còn ngày", () => {
    expect(resolveRange(sessions, batch())).toMatchObject({ fromNumber: 1, toNumber: 3, label: "Buổi 1–3 · 01/10–12/10" });
    expect(resolveRange(sessions, batch({ fromSessionId: "s2" })).label).toBe("01/10–12/10");
    expect(resolveRange(sessions, batch({ fromSessionId: null, toSessionId: null })).label).toBe("01/10–12/10");
  });

  it("đợt sắp theo buổi cuối mới nhất trước", () => {
    const batches = [batch({ id: "a", toKey: "2026-09-30 18:00" }), batch({ id: "b", toKey: "2026-10-24 18:00" }), batch({ id: "c", toKey: "2026-10-24 18:00", fromKey: "2026-10-10 18:00" })];
    expect([...batches].sort(compareBatches).map((item) => item.id)).toEqual(["c", "b", "a"]);
  });
});

describe("báo cáo của một em theo khoảng", () => {
  const student: Student = { id: "st1", classId: "c1", name: "An", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" };
  const data = (generalComment = "Tốt") => ({
    sessions,
    attendance: [
      { id: "a1", sessionId: "s1", studentId: "st1", status: "present", note: "", lateAt: null },
      { id: "a3", sessionId: "s3", studentId: "st1", status: "late", note: "", lateAt: "18:10" },
      { id: "a4", sessionId: "s4", studentId: "st1", status: "absent", note: "", lateAt: null },
    ] as never,
    tests: [
      { id: "t-in", classId: "c1", name: "Trong khoảng", date: "2026-10-08", max: 10, archived: false },
      { id: "t-out", classId: "c1", name: "Ngoài khoảng", date: "2026-10-19", max: 10, archived: false },
    ],
    scores: [{ id: "t-in:st1", testId: "t-in", studentId: "st1", value: 9 }],
    comments: [], homeworkSections: [], homeworkGrades: [], generalComment,
  });

  it("chỉ tính buổi chưa hủy trong khoảng và bài kiểm tra theo ngày của khoảng", () => {
    const report = buildRangeStudentReport(student, { fromKey: "2026-10-01 18:00", toKey: "2026-10-12 18:00" }, data())!;
    expect(report.sessions.map((item) => item.id)).toEqual(["s1", "s3", "s4"]);
    expect(report).toMatchObject({ attendanceCount: 2, lateCount: 1, absentCount: 1, gradedTestCount: 1, ready: true });
    expect(report.tests.map(({ test }) => test.id)).toEqual(["t-in"]);
    expect(report.suggestion).toBeNull();
  });

  it("thiếu nhận xét chung thì chưa sẵn sàng; em vào lớp sau buổi cuối thì không có báo cáo", () => {
    const range = { fromKey: "2026-10-01 18:00", toKey: "2026-10-12 18:00" };
    expect(buildRangeStudentReport(student, range, data(""))).toMatchObject({ ready: false, missing: ["Thiếu nhận xét chung"] });
    expect(buildRangeStudentReport({ ...student, enrolledAt: "2026-10-13" }, range, data())).toBeNull();
    expect(buildRangeStudentReport({ ...student, leftAt: "2026-09-30" }, range, data())).toBeNull();
  });
});

describe("điểm của học sinh vào lớp sau ngày bài kiểm tra", () => {
  const joined: Student = { id: "n1", classId: "c1", name: "Mới", parentPhone: "", enrolledAt: "2026-10-10", leftAt: null, status: "active" };
  const data = (scores: Array<{ testId: string; value: number | null }>) => ({
    sessions: [session("s3", "2026-10-12", "held")],
    attendance: [],
    tests: [
      { id: "t1", classId: "c1", name: "Trước khi vào", date: "2026-10-05", max: 10 },
      { id: "t2", classId: "c1", name: "Sau khi vào", date: "2026-10-11", max: 10 },
    ],
    scores: scores.map((item) => ({ id: `${item.testId}:n1`, testId: item.testId, studentId: "n1", value: item.value })),
    comments: [], homeworkSections: [], homeworkGrades: [], generalComment: "",
  });
  const range = { fromKey: "2026-10-01 00:00", toKey: "2026-10-20 23:59" };
  const names = (scores: Array<{ testId: string; value: number | null }>) =>
    buildRangeStudentReport(joined, range, data(scores) as never)?.tests.map((row) => row.test.name);

  it("bài trước ngày vào lớp chưa có điểm thì không tính", () => {
    expect(names([])).toEqual(["Sau khi vào"]);
  });

  it("bài trước ngày vào lớp đã có điểm thì tính như mọi bài", () => {
    expect(names([{ testId: "t1", value: 6 }])).toEqual(["Trước khi vào", "Sau khi vào"]);
  });
});
