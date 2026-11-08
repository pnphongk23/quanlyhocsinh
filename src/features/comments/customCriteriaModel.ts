import type { CriteriaLevel, CriteriaSetItem } from "../../data/api/types";
import type { HomeworkGrade } from "../../data/types";
import { homeworkLevelFromGrades } from "../../data/criteriaLevels";
import { applyHomeworkAbsenceRule } from "../../data/criteriaSetModel";
import { appendedCommentText, composeCriteriaComment } from "../../data/slip";

export type CriteriaLevelSnapshot = import("../../data/types").CriteriaSlipLevel;

export interface CustomCriteriaDraft {
  criteria: CriteriaLevelSnapshot[];
  comment: string;
  hwManual: boolean;
}

export { appendedCommentText, composeCriteriaComment, generatedCriteriaText } from "../../data/slip";

export function createCriteriaDraft(
  set: readonly CriteriaSetItem[],
  previousGrades: readonly HomeworkGrade[] | null,
  previousHomeworkGiven: boolean,
): CustomCriteriaDraft {
  const applicable = applyHomeworkAbsenceRule(set, previousHomeworkGiven);
  return {
    criteria: applicable.criteria.map((item) => ({
      id: item.id,
      name: item.name,
      level: item.homework && previousHomeworkGiven ? homeworkLevelFromGrades(previousGrades) : item.default_level,
      text: item.texts[item.homework && previousHomeworkGiven ? homeworkLevelFromGrades(previousGrades) : item.default_level],
      ...(item.homework ? { homework: true } : {}),
    })),
    comment: "",
    hwManual: applicable.hwManual,
  };
}

export function reconcileCriteriaDraft(
  previous: CustomCriteriaDraft,
  set: readonly CriteriaSetItem[],
  previousGrades: readonly HomeworkGrade[] | null,
  previousHomeworkGiven: boolean,
): CustomCriteriaDraft {
  const oldById = new Map(previous.criteria.map((item) => [item.id, item]));
  const applicable = applyHomeworkAbsenceRule(set, previousHomeworkGiven);
  const criteria = applicable.criteria.map((item) => {
    const old = oldById.get(item.id);
    const level = item.homework && applicable.hwManual
      // Buổi trước không giao BTVN nhưng đây là tiêu chí duy nhất: giữ lựa chọn tay của giáo viên.
      ? old?.level ?? item.default_level
      : item.homework && previousHomeworkGiven && !previous.hwManual
        ? homeworkLevelFromGrades(previousGrades)
      : old?.level ?? item.default_level;
    return { id: item.id, name: item.name, level, text: item.texts[level], ...(item.homework ? { homework: true } : {}) };
  });
  const appended = appendedCommentText(previous.comment, previous.criteria);
  return { criteria, comment: composeCriteriaComment(criteria, appended), hwManual: previous.hwManual || applicable.hwManual };
}

export function updateCriteriaLevel(
  draft: CustomCriteriaDraft,
  id: string,
  level: CriteriaLevel,
  set: readonly CriteriaSetItem[],
): CustomCriteriaDraft {
  const appended = appendedCommentText(draft.comment, draft.criteria);
  const byId = new Map(set.map((item) => [item.id, item]));
  const criteria = draft.criteria.map((item) => {
    if (item.id !== id) return item;
    const current = byId.get(id);
    return { ...item, level, text: current?.texts[level] ?? item.text, ...(item.homework ? { homework: true } : {}) };
  });
  const selected = draft.criteria.find((item) => item.id === id);
  return {
    criteria,
    comment: composeCriteriaComment(criteria, appended),
    hwManual: selected?.homework ? true : draft.hwManual,
  };
}

export function criteriaScore(criteria: readonly CriteriaLevelSnapshot[]): { good: number; total: number; needsWork: number; stars: number; pose: number } {
  const good = criteria.filter((item) => item.level === "good").length;
  const total = criteria.length;
  const needsWork = criteria.filter((item) => item.level === "needs_work").length;
  const stars = total ? Math.floor((good * 5 / total) + 0.5) : 0;
  return { good, total, needsWork, stars, pose: stars };
}
