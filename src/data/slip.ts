import type { HomeworkGrade, StarLevel } from "./types";

export const SLIP_CRITERIA = [
  "Chú ý nghe giảng",
  "Ghi chép đầy đủ",
  "Tham gia hoạt động sôi nổi",
  "Không mất trật tự",
  "Hoàn thành bài tập về nhà",
] as const;

export const DEFAULT_SLIP_COMMENTS: Record<StarLevel, string> = {
  5: "Con học rất tốt, chăm chỉ, tích cực tham gia phát biểu",
  4: "Con học tốt, làm bài đầy đủ nhưng hơi trầm",
  3: "Con học tốt, nhưng còn hơi mất tập trung, nói tự do",
  2: "Con chưa tích cực tham gia hoạt động, cần tập trung hơn",
  1: "Con chưa tích cực tham gia hoạt động, cần tập trung hơn",
  0: "Con chưa tích cực tham gia hoạt động, cần tập trung hơn",
};

export function starsFromCriteria(criteria: number): StarLevel {
  if (!Number.isInteger(criteria) || criteria < 0 || criteria > 31) throw new RangeError("invalid_criteria");
  let bits = criteria;
  let count = 0;
  while (bits) {
    count += bits & 1;
    bits >>>= 1;
  }
  return count as StarLevel;
}

const SLIP_CRITERION_SENTENCES = {
  "Chú ý nghe giảng": { achieved: "chú ý nghe giảng", unachieved: "chưa chú ý nghe giảng" },
  "Ghi chép đầy đủ": { achieved: "ghi bài đầy đủ", unachieved: "chưa ghi bài đầy đủ" },
  "Tham gia hoạt động sôi nổi": { achieved: "tích cực tham gia các hoạt động trong lớp", unachieved: "chưa tích cực tham gia hoạt động" },
  "Không mất trật tự": { achieved: "ngồi học ngoan ngoãn, không mất trật tự", unachieved: "còn mất trật tự" },
  "Hoàn thành bài tập về nhà": { achieved: "hoàn thành tốt bài tập về nhà", unachieved: "chưa hoàn thành bài tập về nhà" },
} satisfies Record<(typeof SLIP_CRITERIA)[number], { achieved: string; unachieved: string }>;

function joinSlipPhrases(phrases: readonly string[]): string {
  if (phrases.length < 2) return phrases.join("");
  return `${phrases.slice(0, -1).join(", ")} và ${phrases.at(-1)}`;
}

/** Tạo câu nhận xét theo bitmask tiêu chí, theo đúng thứ tự SLIP_CRITERIA. */
export function generatedSlipSentence(criteria: number): string {
  starsFromCriteria(criteria); // Validate the shared 5-bit mask.
  const achieved = SLIP_CRITERIA.flatMap((criterion, index) => (criteria & (1 << index)) !== 0 ? [SLIP_CRITERION_SENTENCES[criterion].achieved] : []);
  const unachieved = SLIP_CRITERIA.flatMap((criterion, index) => (criteria & (1 << index)) === 0 ? [SLIP_CRITERION_SENTENCES[criterion].unachieved] : []);
  if (achieved.length === 0) return `Con ${joinSlipPhrases(unachieved)}.`;
  return `Con ${joinSlipPhrases(achieved)}${unachieved.length ? `, nhưng ${joinSlipPhrases(unachieved)}` : ""}.`;
}

export function defaultSlipComment(stars: StarLevel): string {
  return DEFAULT_SLIP_COMMENTS[stars];
}

/** Ghép câu nhận xét và ghi chú theo nội dung phiếu phụ huynh nhìn thấy. */
export function slipDisplayText(comment: string | null, note: string | null): string {
  const trimmedNote = note?.trim() ?? "";
  if (!comment) return trimmedNote;
  return trimmedNote ? `${comment}\n${trimmedNote}` : comment;
}

/** Tự tích tiêu chí BTVN nếu không có mục nào chưa hoàn thành, trừ khi giáo viên đã chọn tay. */
export function shouldCheckHomeworkCriterion(
  previousGrades: readonly HomeworkGrade[] | null,
  hwManual: boolean,
  currentChecked: boolean,
): boolean {
  if (hwManual) return currentChecked;
  return !previousGrades?.some((grade) => grade.level === "not_done");
}
