import { describe, expect, it } from "vitest";
import type { TicketRow } from "../../data/homework";
import { createSeed } from "../../test/fixtures/seed";
import { defaultSlipCriteria, generatedSlipSentence, starsFromCriteria } from "../../data/slip";
import { canToggleCriterion, criteriaBadge, criteriaForEditingRow, criteriaForRow, criteriaRowsForSession, criteriaUnmetCount, rowHasCustomComment } from "./criteriaModel";

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

  it("locks only legacy scale slips while sent and queued slips remain editable", () => {
    expect(canToggleCriterion(row(7, { scale: 3, criteria: null, stars: 2 }))).toBe(false);
    const missingCriteria = row(31, { scale: 5, criteria: null, stars: 5 });
    expect(canToggleCriterion(missingCriteria)).toBe(true);
    expect(criteriaForRow(missingCriteria)).toBe(0);
    expect(criteriaForEditingRow(missingCriteria)).toBe(31);
    expect(canToggleCriterion(row(15, { status: "sent" }))).toBe(true);
    expect(canToggleCriterion(row(15, { sendQueued: true }))).toBe(true);
  });

  it("uses default homework criteria and counts each unmet bit", () => {
    const grades = [{ sectionId: "reading", studentId: "student", level: "not_done" as const }];
    expect(defaultSlipCriteria(grades)).toBe(15);
    const withoutSlip = { ...row(31), comment: null };
    expect(criteriaUnmetCount([withoutSlip], 4, () => defaultSlipCriteria(grades))).toBe(1);
  });

  it("labels students without a slip before counting unmet criteria", () => {
    const noSlip = (id: string) => ({ ...row(31), student: { ...row(31).student, id }, comment: null });
    const studentsWithoutSlips = [noSlip("no-slip-1"), noSlip("no-slip-2"), noSlip("no-slip-3")];
    expect(criteriaBadge(studentsWithoutSlips, 0)).toEqual({ kind: "no-ticket", count: 3, label: "3 em chưa có phiếu" });
  });

  it("labels a class with slips and no unmet criteria as all met", () => {
    expect(criteriaBadge([row(31), row(31)], 0)).toEqual({ kind: "all-met", count: 0, label: "Cả lớp đạt" });
  });

  it("counts unmet students when everyone has a slip", () => {
    expect(criteriaBadge([row(30), row(30), row(31)], 0)).toEqual({ kind: "unmet", count: 2, label: "2 em chưa đạt" });
  });

  it("counts legacy star-only slips as unmet rather than achieved", () => {
    const legacy = row(31, { scale: 3, criteria: null, stars: 3 });
    expect(criteriaForRow(legacy)).toBe(0);
    expect(criteriaUnmetCount([legacy], 0)).toBe(1);
    expect(criteriaBadge([legacy], 0)).toEqual({ kind: "unmet", count: 1, label: "1 em chưa đạt" });
  });

  it("counts slips without per-criterion data as unmet rather than achieved", () => {
    const noCriteria = row(31, { scale: 5, criteria: null, stars: 5 });
    expect(criteriaBadge([noCriteria], 0)).toEqual({ kind: "unmet", count: 1, label: "1 em chưa đạt" });
    expect(criteriaBadge([noCriteria], 0, undefined, {})).toEqual({ kind: "unmet", count: 1, label: "1 em chưa đạt" });
  });

  it("prioritizes students without a slip when the class also has unmet criteria", () => {
    const mixed = [row(30), { ...row(31), student: { ...row(31).student, id: "no-slip" }, comment: null }];
    expect(criteriaBadge(mixed, 0)).toEqual({ kind: "no-ticket", count: 1, label: "1 em chưa có phiếu" });
  });

  it("treats preview criteria as an existing slip", () => {
    const noSlip = { ...row(31), comment: null };
    expect(criteriaBadge([noSlip], 0, undefined, { [noSlip.student.id]: 31 })).toEqual({ kind: "all-met", count: 0, label: "Cả lớp đạt" });
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
