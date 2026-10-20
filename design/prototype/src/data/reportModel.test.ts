import { describe, expect, it } from "vitest";
import type {
  Attendance,
  Comment,
  HomeworkGrade,
  HomeworkSection,
  Score,
  Session,
  StarLevel,
  Student,
  Test,
} from "./types";
import {
  buildMonthlyStudentReport,
  buildStarSuggestion,
  type MonthlyStudentReportData,
} from "./reportModel";

const student: Student = {
  id: "student-1",
  classId: "class-1",
  name: "Học sinh mẫu",
  parentPhone: "",
  enrolledAt: "2026-10-01",
  leftAt: null,
  status: "active",
};
const sessions: Session[] = [
  { id: "session-0", classId: "class-1", date: "2026-09-25", status: "held" },
  { id: "session-1", classId: "class-1", date: "2026-10-03", status: "held" },
  { id: "session-2", classId: "class-1", date: "2026-10-10", status: "held" },
  { id: "session-3", classId: "class-1", date: "2026-10-17", status: "planned" },
  { id: "session-4", classId: "class-1", date: "2026-11-02", status: "held" },
];
const attendance: Attendance[] = [
  {
    id: "a-1",
    sessionId: "session-1",
    studentId: student.id,
    status: "present",
    note: "",
    lateAt: null,
  },
  {
    id: "a-2",
    sessionId: "session-2",
    studentId: student.id,
    status: "excused",
    note: "",
    lateAt: null,
  },
];
const tests: Test[] = [
  { id: "test-1", classId: "class-1", name: "Từ vựng", date: "2026-10-05", max: 10 },
  { id: "test-2", classId: "class-1", name: "Nghe", date: "2026-10-12", max: 10 },
];
const scores: Score[] = [
  { id: "score-1", testId: "test-1", studentId: student.id, value: 8 },
  { id: "score-2", testId: "test-2", studentId: student.id, value: 9 },
];

function ticket(
  id: string,
  sessionId: string,
  stars: StarLevel | null,
  status: Comment["status"],
): Comment {
  const sent = status === "sent";
  return {
    id,
    classId: "class-1",
    studentId: student.id,
    sessionId,
    stars,
    note: "",
    status,
    sendQueued: false,
    sentAt: sent ? "2026-10-10T12:00:00.000Z" : null,
    updatedAt: "2026-10-10T12:00:00.000Z",
    createdAt: "2026-10-10T12:00:00.000Z",
  };
}

const comments: Comment[] = [
  ticket("comment-sent-3-stars", "session-1", 3, "sent"),
  ticket("comment-sent-2-stars", "session-2", 2, "sent"),
  // Nháp ở buổi planned: chưa gửi nên không vào số buổi sao, cũng chưa mở kết quả BTVN.
  ticket("comment-draft", "session-3", 1, "draft"),
  // Phiếu đã gửi nhưng thuộc tháng sau: không tính cho tháng 10.
  ticket("comment-next-month", "session-4", 1, "sent"),
];

const homeworkSections: HomeworkSection[] = [
  { id: "hw-vocab", sessionId: "session-1", kind: "vocabulary", title: "Unit 1", description: "" },
  { id: "hw-reading", sessionId: "session-1", kind: "reading", title: "Trang 8", description: "" },
  { id: "hw-speaking", sessionId: "session-1", kind: "speaking", title: "Nói 1 phút", description: "" },
  { id: "hw-exercise", sessionId: "session-2", kind: "exercise", title: "Trang 10", description: "" },
  { id: "hw-next-month", sessionId: "session-4", kind: "vocabulary", title: "Unit 2", description: "" },
];
const homeworkGrades: HomeworkGrade[] = [
  { sectionId: "hw-vocab", studentId: student.id, level: "excellent" },
  { sectionId: "hw-reading", studentId: student.id, level: "done" },
  // Chấm rồi nhưng phiếu buổi chấm (session-3) còn nháp → phụ huynh chưa thấy.
  { sectionId: "hw-exercise", studentId: student.id, level: "excellent" },
  // Giao ngoài tháng 10 → không tính vào báo cáo tháng 10.
  { sectionId: "hw-next-month", studentId: student.id, level: "done" },
  // Kết quả của em khác không được lẫn vào.
  { sectionId: "hw-vocab", studentId: "student-2", level: "not_done" },
];

const data: MonthlyStudentReportData = {
  sessions,
  attendance,
  tests,
  scores,
  comments,
  homeworkSections,
  homeworkGrades,
  generalComment: "Con chăm chỉ, tiến bộ rõ ở kỹ năng nghe.",
};

describe("buildMonthlyStudentReport", () => {
  it("tính chuyên cần và điểm từng bài", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", data)!;
    expect(result.sessions.map((session) => session.id)).toEqual([
      "session-1",
      "session-2",
    ]);
    expect(result.tests.map(({ test }) => test.id)).toEqual(["test-1", "test-2"]);
    expect(result.tests.map(({ score }) => score?.value)).toEqual([8, 9]);
    expect(result.gradedTestCount).toBe(2);
    expect(result.attendanceCount).toBe(1);
    expect(result.lateCount).toBe(0);
    expect(result.excusedCount).toBe(1);
    expect(result.absentCount).toBe(0);
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.generalComment).toBe(
      "Con chăm chỉ, tiến bộ rõ ở kỹ năng nghe.",
    );
  });

  it("không còn trường trung bình, vẫn giữ danh sách bài và điểm từng bài", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", data)!;
    expect(result).not.toHaveProperty("average");
    expect(result.tests.map(({ test, score }) => [test.name, score?.value])).toEqual([
      ["Từ vựng", 8],
      ["Nghe", 9],
    ]);
  });

  it("đếm số buổi đạt 3/2/1 sao chỉ trên phiếu đã gửi trong tháng", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", data)!;
    expect(result.stars.ticketCount).toBe(2);
    expect(result.stars.byStars).toEqual({ 1: 0, 2: 1, 3: 1 });
    expect(result.suggestion).toBe(
      "Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có 1 buổi 3 sao, 1 buổi 2 sao, 0 buổi 1 sao.",
    );
  });

  it("kết quả BTVN chỉ gồm phần giao trong tháng đã chấm và phiếu buổi chấm đã gửi", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", data)!;
    expect(result.homework).toEqual([
      {
        kind: "vocabulary",
        label: "Luyện từ vựng",
        excellent: 1,
        done: 0,
        not_done: 0,
        total: 1,
      },
      {
        kind: "reading",
        label: "Luyện đọc",
        excellent: 0,
        done: 1,
        not_done: 0,
        total: 1,
      },
    ]);
    // BTVN không quy ra điểm.
    expect(result.homework.every((row) => row.total > 0)).toBe(true);
  });

  it("Chưa có điểm vẫn là dữ liệu còn thiếu để phát hành", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", {
      ...data,
      scores: [scores[0], { ...scores[1], value: null }],
    })!;
    expect(result.tests[1].score?.value).toBeNull();
    expect(result.gradedTestCount).toBe(1);
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["Thiếu điểm Nghe"]);
  });

  it("báo thiếu điểm danh, thiếu điểm và thiếu nhận xét chung", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", {
      ...data,
      attendance: attendance.slice(0, 1),
      scores: [
        { ...scores[0], value: null },
        { ...scores[1], value: null },
      ],
      generalComment: "   ",
    })!;
    expect(result.gradedTestCount).toBe(0);
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual([
      "Thiếu điểm danh",
      "Thiếu điểm Từ vựng",
      "Thiếu điểm Nghe",
      "Thiếu nhận xét chung",
    ]);
  });

  it("nhận xét chung của tháng không lấy từ phiếu buổi học", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", {
      ...data,
      generalComment: "",
    })!;
    expect(result.stars.ticketCount).toBe(2);
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["Thiếu nhận xét chung"]);
  });

  it("bỏ bài kiểm tra và buổi ngoài khoảng ngày vào lớp..ngày rời lớp", () => {
    const midMonthStudent = {
      ...student,
      enrolledAt: "2026-10-09",
      leftAt: "2026-10-15",
      status: "left" as const,
    };
    const result = buildMonthlyStudentReport(midMonthStudent, "2026-10", {
      ...data,
      attendance: [
        { ...attendance[0], sessionId: "session-2", status: "present" },
      ],
      scores: [{ ...scores[0], testId: "test-2", value: 7 }],
      comments: [ticket("comment-sent", "session-2", 3, "sent")],
      homeworkGrades: [],
    })!;
    expect(result.sessions.map((session) => session.id)).toEqual(["session-2"]);
    expect(result.tests.map(({ test }) => test.id)).toEqual(["test-2"]);
    expect(result.tests[0].score?.value).toBe(7);
    expect(result.stars.ticketCount).toBe(1);
    expect(result.ready).toBe(true);
  });

  it("bài đã lưu trữ không vào báo cáo và không bị báo thiếu điểm", () => {
    const result = buildMonthlyStudentReport(student, "2026-10", {
      ...data,
      tests: tests.map((test) =>
        test.id === "test-2" ? { ...test, archived: true } : test,
      ),
      scores: [{ ...scores[0], value: 8 }],
    })!;
    expect(result.tests.map(({ test }) => test.id)).toEqual(["test-1"]);
    expect(result.gradedTestCount).toBe(1);
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("trả null khi em chưa vào lớp hoặc đã rời lớp trước tháng báo cáo", () => {
    expect(
      buildMonthlyStudentReport({ ...student, enrolledAt: "2026-11-01" }, "2026-10", data),
    ).toBeNull();
    expect(
      buildMonthlyStudentReport(
        { ...student, leftAt: "2026-09-30", status: "left" },
        "2026-10",
        data,
      ),
    ).toBeNull();
    expect(buildMonthlyStudentReport(student, "2026-13", data)).toBeNull();
  });
});

describe("buildStarSuggestion", () => {
  it("không gợi ý khi tháng chưa có phiếu nào được gửi", () => {
    expect(buildStarSuggestion({ 1: 0, 2: 0, 3: 0 })).toBeNull();
  });

  it("đúng nguyên văn gợi ý của màn duyệt báo cáo", () => {
    expect(buildStarSuggestion({ 1: 1, 2: 2, 3: 5 })).toBe(
      "Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có 5 buổi 3 sao, 2 buổi 2 sao, 1 buổi 1 sao.",
    );
  });
});
