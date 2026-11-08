import type { CriteriaLevel, CriteriaSetItem, CriteriaSetWriteItem } from "./api/types";

export function applyHomeworkAbsenceRule(
  set: readonly CriteriaSetItem[],
  previousHomeworkGiven: boolean,
): { criteria: readonly CriteriaSetItem[]; hwManual: boolean } {
  if (previousHomeworkGiven) return { criteria: set, hwManual: false };
  const withoutHomework = set.filter((item) => !item.homework);
  if (withoutHomework.length) return { criteria: withoutHomework, hwManual: false };
  if (set.length === 1 && set[0]?.homework) return { criteria: set, hwManual: true };
  return { criteria: [], hwManual: false };
}

export const CRITERIA_LEVELS: readonly CriteriaLevel[] = ["good", "ok", "needs_work"];
export const CRITERIA_LEVEL_LABELS: Record<CriteriaLevel, string> = {
  good: "Tốt", ok: "Đạt", needs_work: "Cần cố gắng",
};
export type CriteriaDraft = Omit<CriteriaSetWriteItem, "id"> & { id?: string };
export type CriteriaField = "name" | "good" | "ok" | "needs_work" | "default_level";
export interface CriteriaValidationError { index?: number; field?: CriteriaField | "homework"; reason: string }

export function cleanCriteriaText(value: string): string {
  return value.trim().normalize("NFC");
}

export function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function validateCriteria(criteria: readonly CriteriaDraft[]): CriteriaValidationError[] {
  const errors: CriteriaValidationError[] = [];
  if (criteria.length < 1 || criteria.length > 8) errors.push({ reason: "criteria_count" });
  const names = new Map<string, number>();
  let homeworkCount = 0;
  criteria.forEach((criterion, index) => {
    const name = cleanCriteriaText(criterion.name);
    const nameLength = codePointLength(name);
    if (nameLength < 1 || nameLength > 40) errors.push({ index, field: "name", reason: "name_length" });
    const folded = name.toLocaleLowerCase("vi-VN");
    if (folded && names.has(folded)) errors.push({ index, field: "name", reason: "name_duplicate" });
    else if (folded) names.set(folded, index);
    for (const level of CRITERIA_LEVELS) {
      const length = codePointLength(cleanCriteriaText(criterion.texts[level]));
      if (length < 1 || length > 200) errors.push({ index, field: level, reason: "text_length" });
    }
    if (!CRITERIA_LEVELS.includes(criterion.default_level)) errors.push({ index, field: "default_level", reason: "default_level" });
    if (criterion.homework) homeworkCount++;
  });
  if (homeworkCount > 1) errors.push({ field: "homework", reason: "homework_multiple" });
  return errors;
}

export function normalizeCriteria(criteria: readonly CriteriaDraft[]): CriteriaSetWriteItem[] {
  return criteria.map(({ id, name, texts, default_level, homework }) => ({
    ...(id ? { id } : {}),
    name: cleanCriteriaText(name),
    texts: {
      good: cleanCriteriaText(texts.good),
      ok: cleanCriteriaText(texts.ok),
      needs_work: cleanCriteriaText(texts.needs_work),
    },
    default_level,
    homework,
  }));
}

export function toCriteriaDraft(item: CriteriaSetItem): CriteriaDraft {
  return { id: item.id, name: item.name, texts: { ...item.texts }, default_level: item.default_level, homework: item.homework };
}
