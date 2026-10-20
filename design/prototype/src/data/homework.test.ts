import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import {
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVEL_LABELS,
  buildTicketRows,
  gradingSessionFor,
  gradingSessionPlan,
  homeworkContext,
  leftStudentsForSession,
  previousHomeworkSession,
  ungradedHomeworkNotice,
} from "./homework";
import { STAR_TEMPLATES } from "./logic";

describe("Câu mẫu theo mức sao", () => {
  it("đúng nguyên văn spec mục 4, kể cả emoji", () => {
    expect(STAR_TEMPLATES[3]).toBe(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
    expect(STAR_TEMPLATES[2]).toBe(
      "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.",
    );
    expect(STAR_TEMPLATES[1]).toBe(
      "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.",
    );
  });
  it("nhãn BTVN đúng spec", () => {
    expect(HOMEWORK_KIND_LABELS).toEqual({
      vocabulary: "Luyện từ vựng",
      reading: "Luyện đọc",
      speaking: "Luyện nói",
      exercise: "Bài tập",
    });
    expect(HOMEWORK_LEVEL_LABELS).toEqual({
      excellent: "Hoàn thành tốt",
      done: "Hoàn thành",
      not_done: "Chưa hoàn thành",
    });
  });
});

describe("Buổi chấm BTVN", () => {
  it("là buổi kế tiếp chưa hủy của lớp", () => {
    const state = createSeed();
    const grading = gradingSessionFor(state.sessions, "6a-session-6");
    expect(grading?.id).toBe("6a-session-7");
  });

  it("bỏ qua buổi bị hủy và báo buổi bị chuyển", () => {
    const state = createSeed();
    const plan = gradingSessionPlan(state.sessions, "6a-session-7");
    expect(plan.session?.id).toBe("6a-session-8");
    expect(plan.cancelled.map((session) => session.id)).toEqual([
      "6a-extra-cancelled",
    ]);
  });

  it("buổi cuối không còn buổi chấm", () => {
    const state = createSeed();
    expect(gradingSessionFor(state.sessions, "ielts-session-8")).toBeNull();
    expect(
      gradingSessionPlan(state.sessions, "ielts-session-8"),
    ).toMatchObject({ session: null, cancelled: [] });
  });

  it("buổi đầu không có buổi trước", () => {
    const state = createSeed();
    expect(previousHomeworkSession(state.sessions, "6a-session-0")).toBeNull();
  });

  it("buổi trước bị hủy thì lùi về buổi chưa hủy gần nhất", () => {
    const state = createSeed();
    expect(previousHomeworkSession(state.sessions, "6a-session-8")?.id).toBe(
      "6a-session-7",
    );
  });
});

describe("Danh sách phiếu của một buổi", () => {
  it("chỉ gồm em đang học vào ngày buổi, kèm phiếu và BTVN buổi trước", () => {
    const state = createSeed();
    const rows = buildTicketRows(state, "6a-session-7");
    expect(rows).toHaveLength(9);
    expect(rows.some((row) => row.student.id === "6a-student-9")).toBe(false);
    expect(rows.map((row) => row.status)).toEqual([
      "none",
      "sent",
      "draft",
      "queued",
      "none",
      "none",
      "none",
      "none",
      "none",
    ]);
    expect(rows[1]).toMatchObject({ stars: 3, sentAt: "2026-10-14T13:14:00.000Z" });
    expect(rows[0].previousHomework).toEqual({
      state: "has",
      session: expect.objectContaining({ id: "6a-session-6" }),
      totalSections: 2,
      gradedSections: 0,
      ungradedSections: 2,
    });
    expect(rows[1].previousHomework).toMatchObject({
      gradedSections: 2,
      ungradedSections: 0,
    });
  });

  it("buổi đầu và buổi trước không giao bài có trạng thái riêng", () => {
    const state = createSeed();
    expect(buildTicketRows(state, "6a-session-0")[0].previousHomework).toMatchObject({
      state: "first",
      session: null,
      totalSections: 0,
    });
    expect(buildTicketRows(state, "6a-session-1")[0].previousHomework).toMatchObject({
      state: "none-given",
      session: expect.objectContaining({ id: "6a-session-0" }),
      totalSections: 0,
    });
  });

  it("buổi đã hủy không có phiếu", () => {
    expect(buildTicketRows(createSeed(), "6a-extra-cancelled")).toEqual([]);
  });

  it("em đã rời lớp vẫn giữ phiếu cũ nhưng không có phiếu buổi mới", () => {
    const state = createSeed();
    expect(
      leftStudentsForSession(state, "6a-session-8").map((student) => student.id),
    ).toEqual(["6a-student-9"]);
    expect(
      state.comments.some(
        (comment) =>
          comment.studentId === "6a-student-9" &&
          comment.sessionId === "6a-session-5",
      ),
    ).toBe(true);
    expect(
      buildTicketRows(state, "6a-session-8").some(
        (row) => row.student.id === "6a-student-9",
      ),
    ).toBe(false);
  });
});

describe("Ngữ cảnh tab Bài tập về nhà", () => {
  it("buổi có BTVN buổi trước đã chấm dở và BTVN hôm nay bị chuyển buổi chấm", () => {
    const state = createSeed();
    const context = homeworkContext(state, "6a-session-7")!;
    expect(context.cancelled).toBe(false);
    expect(context.previous.state).toBe("has");
    expect(context.previous.givingSession?.id).toBe("6a-session-6");
    expect(
      context.previous.sections.map((progress) => [
        progress.section.id,
        progress.graded,
        progress.ungraded,
      ]),
    ).toEqual([
      ["6a-hw-6-vocabulary", 8, 1],
      ["6a-hw-6-exercise", 7, 2],
    ]);
    const absent = context.previous.rows.find(
      (row) => row.student.id === "6a-student-0",
    )!;
    expect(absent.absentAtGiving).toBe(true);
    expect(absent.givingAttendance).toBe("absent");
    expect(absent.ungraded).toBe(2);
    expect(
      context.previous.rows.find((row) => row.student.id === "6a-student-1")
        ?.absentAtGiving,
    ).toBe(false);
    expect(context.today.sections.map((section) => section.kind)).toEqual([
      "vocabulary",
      "speaking",
      "exercise",
    ]);
    expect(context.today.missingKinds).toEqual(["reading"]);
    expect(context.today.grading.state).toBe("moved");
    expect(context.today.grading.session?.id).toBe("6a-session-8");
    expect(context.today.grading.cancelled.map((session) => session.id)).toEqual([
      "6a-extra-cancelled",
    ]);
  });

  it("buổi đầu: chưa có BTVN buổi trước", () => {
    const state = createSeed();
    const context = homeworkContext(state, "6a-session-0")!;
    expect(context.previous.state).toBe("first");
    expect(context.previous.givingSession).toBeNull();
    expect(context.previous.sections).toEqual([]);
    expect(context.today.grading.state).toBe("exists");
  });

  it("buổi trước không giao BTVN", () => {
    const state = createSeed();
    const context = homeworkContext(state, "6a-session-1")!;
    expect(context.previous.state).toBe("none-given");
    expect(context.previous.givingSession?.id).toBe("6a-session-0");
    expect(context.previous.sections).toEqual([]);
    expect(context.previous.rows.every((row) => row.ungraded === 0)).toBe(true);
  });

  it("buổi cuối chưa có buổi chấm", () => {
    const state = createSeed();
    const context = homeworkContext(state, "ielts-session-8")!;
    expect(context.today.sections).toHaveLength(2);
    expect(context.today.missingKinds).toEqual(["reading", "speaking"]);
    expect(context.today.grading).toMatchObject({ state: "none", session: null });
  });

  it("buổi đã hủy: không giao, không chấm", () => {
    const state = createSeed();
    const context = homeworkContext(state, "6a-extra-cancelled")!;
    expect(context.cancelled).toBe(true);
    expect(context.previous).toMatchObject({
      state: "none-given",
      givingSession: null,
      sections: [],
      rows: [],
    });
    expect(context.today.sections).toEqual([]);
    expect(context.today.grading).toMatchObject({ state: "none", session: null });
  });

  it("buổi không tồn tại trả null", () => {
    expect(homeworkContext(createSeed(), "khong-co")).toBeNull();
  });
});

describe("Đếm phần BTVN chưa chấm khi gửi phiếu", () => {
  it("đếm số em và số lượt (em × phần) còn Chưa chấm", () => {
    const state = createSeed();
    const notice = ungradedHomeworkNotice(state, "6a-session-7");
    expect(notice.students.map((student) => student.id)).toEqual([
      "6a-student-0",
      "6a-student-3",
    ]);
    expect(notice.ungradedParts).toBe(3);
  });

  it("chỉ tính các em sẽ gửi phiếu", () => {
    const state = createSeed();
    const notice = ungradedHomeworkNotice(state, "6a-session-7", [
      "6a-student-1",
      "6a-student-3",
    ]);
    expect(notice.students.map((student) => student.id)).toEqual([
      "6a-student-3",
    ]);
    expect(notice.ungradedParts).toBe(1);
  });

  it("buổi đầu không có gì để đếm", () => {
    expect(
      ungradedHomeworkNotice(createSeed(), "6a-session-0"),
    ).toEqual({ students: [], ungradedParts: 0 });
  });
});
