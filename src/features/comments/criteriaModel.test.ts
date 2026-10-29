import { describe, expect, it } from "vitest";
import type { TicketRow } from "../../data/homework";
import { createSeed } from "../../test/fixtures/seed";
import { defaultSlipCriteria, generatedSlipSentence, starsFromCriteria } from "../../data/slip";
import { canToggleCriterion, criteriaForRow, criteriaRowsForSession, criteriaUnmetCount, rowHasCustomComment } from "./criteriaModel";

function row(criteria: number, options: Partial<NonNullable<TicketRow["comment"]>> = {}): TicketRow {
  const seed = createSeed();
  const student = seed.students[0];
  const comment = { id: "slip", classId: student.classId, sessionId: "6a-session-7", studentId: student.id, criteria, comment: generatedSlipSentence(criteria), scale: 5 as const, stars: starsFromCriteria(criteria), note: "Ghi thêm", hwManual: false, status: "draft" as const, sendQueued: false, sentAt: null, updatedAt: "", createdAt: "", ...options };
  return { student, comment, stars: comment.stars, attended: true, status: comment.sendQueued ? "queued" : comment.status, sentAt: comment.sentAt, previousHomework: { state: "first", session: null, totalSections: 0, gradedSections: 0, ungradedSections: 0 } };
}

describe("criteria mode model", () => {
  it("maps criterion bits to stars, generated sentence, and unmet count", () => {
    expect(criteriaForRow(row(23))).toBe(23);
    expect(starsFromCriteria(23)).toBe(4);
    expect(generatedSlipSentence(23)).toBe("Con chú ý nghe giảng, ghi bài đầy đủ, tích cực tham gia các hoạt động trong lớp và hoàn thành tốt bài tập về nhà, nhưng còn mất trật tự.");
    expect(criteriaUnmetCount([row(23), row(31)], 3)).toBe(1);
  });

  it("keeps extra note separate and detects custom generated text", () => {
    const current = row(15);
    expect(current.comment?.note).toBe("Ghi thêm");
    expect(rowHasCustomComment(current)).toBe(false);
    expect(rowHasCustomComment(row(15, { comment: "Câu sửa tay" }))).toBe(true);
  });

  it("locks legacy scale slips while sent and queued slips remain editable", () => {
    expect(canToggleCriterion(row(7, { scale: 3, criteria: null, stars: 2 }))).toBe(false);
    expect(canToggleCriterion(row(15, { status: "sent" }))).toBe(true);
    expect(canToggleCriterion(row(15, { sendQueued: true }))).toBe(true);
  });

  it("uses default homework criteria and counts each unmet bit", () => {
    const grades = [{ sectionId: "reading", studentId: "student", level: "not_done" as const }];
    expect(defaultSlipCriteria(grades)).toBe(15);
    const withoutSlip = { ...row(31), comment: null };
    expect(criteriaUnmetCount([withoutSlip], 4, () => defaultSlipCriteria(grades))).toBe(1);
  });

  it("lists only students enrolled on the session date, including joins and departures on that day", () => {
    const state = createSeed();
    const session = state.sessions.find((item) => item.id === "6a-session-7")!;
    state.students.push(
      { ...state.students[0], id: "joined-after", name: "Minh An", enrolledAt: "2026-12-01" },
      { ...state.students[0], id: "left-before", name: "Gia Bảo", leftAt: "2026-10-13" },
      { ...state.students[0], id: "joined-that-day", name: "Tuệ Minh", enrolledAt: session.date, leftAt: null },
      { ...state.students[0], id: "left-that-day", name: "Hà My", enrolledAt: "2026-10-01", leftAt: session.date },
    );
    const ids = criteriaRowsForSession(state, session.id).map((item) => item.student.id);
    expect(ids).not.toContain("joined-after");
    expect(ids).not.toContain("left-before");
    expect(ids).toContain("joined-that-day");
    expect(ids).toContain("left-that-day");
  });
});
