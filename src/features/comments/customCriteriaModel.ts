import type { CriteriaLevel, CriteriaSetItem } from "../../data/api/types";
import type { HomeworkGrade } from "../../data/types";
import { homeworkLevelFromGrades } from "../../data/criteriaLevels";
import { applyHomeworkAbsenceRule } from "../../data/criteriaSetModel";

export type CriteriaLevelSnapshot = import("../../data/types").CriteriaSlipLevel;

export interface CustomCriteriaDraft {
  criteria: CriteriaLevelSnapshot[];
  comment: string;
  hwManual: boolean;
}

export function generatedCriteriaText(criteria: readonly CriteriaLevelSnapshot[]): string {
  return criteria.map((item) => item.text ?? "").filter(Boolean).join(" ");
}

export function appendedCommentText(comment: string, criteria: readonly CriteriaLevelSnapshot[]): string {
  const generated = generatedCriteriaText(criteria);
  if (!generated) return comment.trim();
  if (comment === generated) return "";
  return comment.startsWith(`${generated} `) ? comment.slice(generated.length + 1) : comment;
}

export function composeCriteriaComment(criteria: readonly CriteriaLevelSnapshot[], appended = ""): string {
  return [generatedCriteriaText(criteria), appended.trim()].filter(Boolean).join(" ");
}

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
      ? item.default_level
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
