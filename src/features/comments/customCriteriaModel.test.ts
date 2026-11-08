import { describe, expect, it } from "vitest";
import type { CriteriaSetItem } from "../../data/api/types";
import { applyHomeworkAbsenceRule } from "../../data/criteriaSetModel";
import { composeCriteriaComment, createCriteriaDraft, criteriaScore, reconcileCriteriaDraft, updateCriteriaLevel } from "./customCriteriaModel";

const set = (count: number): CriteriaSetItem[] => Array.from({ length: count }, (_, index) => ({
  id: `c${index + 1}`, name: index === 0 ? "Tập trung" : `Mục ${index + 1}`,
  texts: { good: `Tốt ${index + 1}.`, ok: `Đạt ${index + 1}.`, needs_work: `Cần cố gắng ${index + 1}.` },
  default_level: "good", homework: false,
}));

describe("custom criteria ticket model", () => {
  it.each([1, 6, 8])("scores a %i criterion snapshot by its own N", (count) => {
    const draft = createCriteriaDraft(set(count), [], false);
    expect(criteriaScore(draft.criteria)).toMatchObject({ good: count, total: count, stars: 5, needsWork: 0 });
    expect(draft.comment).toBe("");
  });

  it("keeps manual text appended when levels change", () => {
    const criteria = createCriteriaDraft(set(2), [], false).criteria;
    const text = composeCriteriaComment(criteria, "Cô gửi lời khen.");
    const result = updateCriteriaLevel({ criteria, comment: text, hwManual: false }, "c1", "needs_work", set(2));
    expect(result.comment).toBe("Cần cố gắng 1. Tốt 2. Cô gửi lời khen.");
  });

  it("reconciles open drafts to the current set and preserves appended text", () => {
    const original = set(2);
    const draft = createCriteriaDraft(original, [], false);
    draft.comment = composeCriteriaComment(draft.criteria, "Gõ thêm.");
    const changed: CriteriaSetItem[] = [
      { ...original[1]!, name: "Đổi tên", texts: { ...original[1]!.texts, good: "Câu mới." } },
      { ...original[0]!, default_level: "ok" as const },
      { id: "c3", name: "Mục 3", texts: { good: "Tốt 3.", ok: "Đạt 3.", needs_work: "Cần cố gắng 3." }, default_level: "good", homework: false },
    ];
    const next = reconcileCriteriaDraft(draft, changed, [], false);
    expect(next.criteria.map((item) => item.id)).toEqual(["c2", "c1", "c3"]);
    expect(next.criteria[0]).toMatchObject({ name: "Đổi tên", text: "Câu mới." });
    expect(next.comment).toBe("Câu mới. Tốt 1. Tốt 3. Gõ thêm.");
  });

  it("applies the only-homework absence exception independently", () => {
    const homework: CriteriaSetItem = { ...set(1)[0]!, id: "hw", name: "Bài tập", homework: true };
    expect(applyHomeworkAbsenceRule([homework], false)).toEqual({ criteria: [homework], hwManual: true });
    const draft = createCriteriaDraft([homework], [], false);
    expect(draft).toMatchObject({ hwManual: true, criteria: [{ id: "hw", level: "good", text: "Tốt 1." }] });
    expect(criteriaScore(draft.criteria)).toMatchObject({ total: 1, good: 1, stars: 5 });
    const reconciled = reconcileCriteriaDraft({ ...draft, criteria: [{ ...draft.criteria[0]!, level: "needs_work" }] }, [homework], [], false);
    // Buổi trước không giao BTVN nhưng đây là tiêu chí duy nhất: giữ lựa chọn tay của giáo viên.
    expect(reconciled).toMatchObject({ hwManual: true, criteria: [{ level: "needs_work", text: "Cần cố gắng 1." }] });
  });

  it("omits homework beside other criteria when none was assigned and uses the lowest prior grade otherwise", () => {
    const homework: CriteriaSetItem = { ...set(1)[0]!, id: "hw", name: "Bài tập", homework: true };
    expect(applyHomeworkAbsenceRule([homework, set(1)[0]!], false)).toEqual({ criteria: [set(1)[0]!], hwManual: false });
    expect(createCriteriaDraft([homework, set(1)[0]!], [], false).criteria.map((item) => item.id)).toEqual(["c1"]);
    const draft = createCriteriaDraft([homework], [
      { sectionId: "a", studentId: "s", level: "excellent" },
      { sectionId: "b", studentId: "s", level: "not_done" },
    ], true);
    expect(draft.criteria[0]).toMatchObject({ level: "needs_work", text: "Cần cố gắng 1." });
    expect(criteriaScore(draft.criteria)).toMatchObject({ total: 1, needsWork: 1 });
  });
});
