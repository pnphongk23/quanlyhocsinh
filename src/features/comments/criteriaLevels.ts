import { starsFromCriteria } from "../../data/slip";
import type { HomeworkGrade, HomeworkLevel, SlipScale, StarLevel } from "../../data/types";

/**
 * Mô hình thuần của phiếu nhận xét thử nghiệm "3 mức" (sau cờ VITE_CRITERIA_LEVELS).
 * Không phụ thuộc React: dùng cho web, test và đối chiếu hợp đồng máy chủ
 * `plans/20261104-criteria-levels/contract.md` (mục 1).
 */

export type Level = "good" | "ok" | "needs_work";
export type CriterionKey = "focus" | "participation" | "mastery" | "notes" | "homework";
export type SkillKey = "vocabulary" | "grammar" | "listening" | "speaking" | "reading" | "writing";
export type Levels = Record<CriterionKey, Level>;
export type SkillLevels = Partial<Record<SkillKey, Level>>;

/** Thứ tự tiêu chí cố định; bit tương ứng với hợp đồng máy chủ. */
export const CRITERION_KEYS: readonly CriterionKey[] = [
  "focus",
  "participation",
  "mastery",
  "notes",
  "homework",
];

export const CRITERION_BITS: Record<CriterionKey, number> = {
  focus: 1,
  participation: 2,
  mastery: 4,
  notes: 8,
  homework: 16,
};

export const CRITERION_LABELS: Record<CriterionKey, string> = {
  focus: "Học tập trung",
  participation: "Tích cực tham gia",
  mastery: "Nắm bài hôm nay",
  notes: "Ghi chép và làm bài trên lớp",
  homework: "Bài tập về nhà",
};

/** Thứ tự chip "Hôm nay học" và dòng kỹ năng trong phiếu. */
export const SKILL_KEYS: readonly SkillKey[] = [
  "vocabulary",
  "grammar",
  "listening",
  "speaking",
  "reading",
  "writing",
];

export const SKILL_LABELS: Record<SkillKey, string> = {
  vocabulary: "Từ vựng",
  grammar: "Mẫu câu/Ngữ pháp",
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
};

/**
 * Tên dùng trong câu "{nội dung}" và dòng "Hôm nay học" của phụ huynh.
 * Requirements.md lấy ví dụ "từ vựng và mẫu câu" (grammar rút gọn là "Mẫu câu"),
 * trong khi nhãn chip đầy đủ là "Mẫu câu/Ngữ pháp".
 */
export const TOPIC_LABELS: Record<SkillKey, string> = {
  ...SKILL_LABELS,
  grammar: "Mẫu câu",
};

export const LEVELS: readonly Level[] = ["good", "ok", "needs_work"];

export const LEVEL_LABELS: Record<Level, string> = {
  good: "Tốt",
  ok: "Đạt",
  needs_work: "Cần cố gắng",
};

/** Thấp nhất trước: dùng khi gộp nhiều phần BTVN. */
export const LEVEL_RANK: Record<Level, number> = {
  needs_work: 0,
  ok: 1,
  good: 2,
};

/** Mặc định phiếu mới; BTVN thay theo chấm buổi trước. */
export const DEFAULT_CRITERION_LEVELS: Levels = {
  focus: "good",
  participation: "good",
  mastery: "ok",
  notes: "good",
  homework: "good",
};

export const DEFAULT_SKILL_LEVEL: Level = "ok";

export const HOMEWORK_LEVELS: Record<HomeworkLevel, Level> = {
  excellent: "good",
  done: "ok",
  not_done: "needs_work",
};

const CRITERION_SENTENCES: Record<CriterionKey, Record<Level, string>> = {
  focus: {
    good: "Con học tập trung, chú ý nghe giảng suốt buổi.",
    ok: "Con khá tập trung, thỉnh thoảng còn mất chú ý.",
    needs_work: "Con còn hay mất tập trung, nói chuyện riêng, cần nhắc nhở thêm.",
  },
  participation: {
    good: "Con hăng hái phát biểu và tham gia các hoạt động trong lớp.",
    ok: "Con có tham gia hoạt động nhưng chưa chủ động phát biểu.",
    needs_work: "Con còn rụt rè, ít tham gia; bố mẹ khuyến khích con mạnh dạn hơn nhé.",
  },
  mastery: {
    good: "Con nắm chắc {nội dung} hôm nay và vận dụng tốt.",
    ok: "Con nắm được phần chính của {nội dung} hôm nay, cần ôn thêm cho chắc.",
    needs_work: "Con chưa nắm vững {nội dung} hôm nay, bố mẹ cho con ôn lại nhé.",
  },
  notes: {
    good: "Con ghi bài đầy đủ, làm bài trên lớp cẩn thận.",
    ok: "Con ghi bài và làm bài trên lớp nhưng còn thiếu hoặc chưa cẩn thận.",
    needs_work: "Con chưa ghi bài và làm bài trên lớp đầy đủ, cần cố gắng hơn.",
  },
  homework: {
    good: "Con làm bài tập về nhà đầy đủ và chính xác.",
    ok: "Con làm bài tập về nhà nhưng còn sai sót.",
    needs_work: "Con chưa hoàn thành bài tập về nhà; bố mẹ nhắc con làm bù trước buổi sau nhé.",
  },
};

const CRITERION_PRAISE: Record<CriterionKey, string> = {
  focus: "học tập trung",
  participation: "hăng hái tham gia các hoạt động",
  mastery: "nắm chắc {nội dung} hôm nay",
  notes: "ghi bài và làm bài trên lớp cẩn thận",
  homework: "làm bài tập về nhà đầy đủ",
};

export function isCriterionKey(value: string): value is CriterionKey {
  return (CRITERION_KEYS as readonly string[]).includes(value);
}

export function isSkillKey(value: string): value is SkillKey {
  return (SKILL_KEYS as readonly string[]).includes(value);
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

/** Mức thấp hơn trong hai mức (nhiều phần BTVN: lấy mức thấp nhất). */
export function lowestLevel(a: Level, b: Level): Level {
  return LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
}

/** BTVN buổi trước → mức tiêu chí; chưa chấm/không giao = Tốt. */
export function homeworkLevelFromGrades(
  grades: readonly HomeworkGrade[] | null | undefined,
): Level {
  if (!grades?.length) return "good";
  return grades.reduce<Level>(
    (lowest, grade) => lowestLevel(lowest, HOMEWORK_LEVELS[grade.level]),
    "good",
  );
}

/** Phiếu mới: 4 tiêu chí mặc định, mastery Đạt, BTVN theo chấm buổi trước. */
export function defaultLevels(
  previousGrades: readonly HomeworkGrade[] | null | undefined,
): Levels {
  return { ...DEFAULT_CRITERION_LEVELS, homework: homeworkLevelFromGrades(previousGrades) };
}

/** Mức kỹ năng mặc định (Đạt) cho các kỹ năng đang bật "Chấm riêng". */
export function defaultSkillLevels(skills: readonly SkillKey[]): SkillLevels {
  return skills.reduce<SkillLevels>((map, skill) => ({ ...map, [skill]: DEFAULT_SKILL_LEVEL }), {});
}

/** criteria bit: chỉ mức Tốt đặt bit (máy chủ cũng tính như vậy). */
export function criteriaFromLevels(levels: Levels): number {
  return CRITERION_KEYS.reduce(
    (bits, key) => (levels[key] === "good" ? bits | CRITERION_BITS[key] : bits),
    0,
  );
}

/** Sao = số tiêu chí mức Tốt (0–5); kỹ năng không tính sao. */
export function starsFromLevels(levels: Levels): StarLevel {
  return starsFromCriteria(criteriaFromLevels(levels));
}

/** Phiếu cũ không có `levels`: bit đặt = Đạt, bit trống = Chưa đạt (chỉ để hiển thị). */
export function legacyLevelsFromCriteria(criteria: number): Levels {
  starsFromCriteria(criteria); // Validate 0..31 như phiếu cũ.
  return CRITERION_KEYS.reduce<Levels>((levels, key) => {
    levels[key] = (criteria & CRITERION_BITS[key]) !== 0 ? "good" : "needs_work";
    return levels;
  }, { ...DEFAULT_CRITERION_LEVELS });
}

/** Phiếu cũ đạt/chưa đạt từng tiêu chí để hiện nhãn, không dùng để sửa. */
export function legacyCriterionAchieved(criteria: number, key: CriterionKey): boolean {
  return (criteria & CRITERION_BITS[key]) !== 0;
}

export function hasLevels(
  slip: { levels?: Levels | null } | null | undefined,
): boolean {
  return Boolean(slip?.levels);
}

export interface SlipStarsInput {
  levels?: Levels | null;
  criteria?: number | null;
  stars?: number | null;
  scale?: SlipScale;
}

/** Số sao hiển thị: phiếu mức tính theo Tốt, phiếu cũ giữ bit (5 sao) hoặc stars (3 sao). */
export function starsForSlip(slip: SlipStarsInput): number {
  if (slip.levels) return starsFromLevels(slip.levels);
  if (slip.scale === 3) return slip.stars ?? 0;
  if (typeof slip.criteria === "number") return starsFromCriteria(slip.criteria);
  return slip.stars ?? 0;
}

/** Lọc khoá hợp lệ, bỏ trùng, giữ thứ tự chip người dùng chọn. */
export function normalizeTopics(input: readonly string[] | null | undefined): SkillKey[] {
  const topics: SkillKey[] = [];
  for (const key of input ?? []) {
    if (isSkillKey(key) && !topics.includes(key)) topics.push(key);
  }
  return topics;
}

/** graded_skills phải là tập con của topics; trả theo thứ tự kỹ năng cố định. */
export function normalizeGradedSkills(
  gradedSkills: readonly string[] | null | undefined,
  topics: readonly string[] | null | undefined,
): SkillKey[] {
  const allowed = normalizeTopics(topics);
  const graded = new Set(normalizeTopics(gradedSkills));
  return SKILL_KEYS.filter((key) => graded.has(key) && allowed.includes(key));
}

function lower(label: string): string {
  return label.toLocaleLowerCase("vi-VN");
}

export function joinWithVa(parts: readonly string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} và ${parts.at(-1)}`;
}

/** {nội dung} của câu "Nắm bài hôm nay": chip đã chọn, không chọn = "bài". */
export function todayTopicsPhrase(topics: readonly string[] | null | undefined): string {
  const labels = normalizeTopics(topics).map((key) => lower(TOPIC_LABELS[key]));
  return labels.length > 0 ? joinWithVa(labels) : "bài";
}

function fillContent(sentence: string, content: string): string {
  return sentence.replaceAll("{nội dung}", content);
}

export function criterionSentence(
  key: CriterionKey,
  level: Level,
  content: string,
): string {
  return fillContent(CRITERION_SENTENCES[key][level], content);
}

export function skillSentence(key: SkillKey, level: "ok" | "needs_work"): string {
  const label = lower(SKILL_LABELS[key]);
  return level === "ok"
    ? `Phần ${label} con làm được, cần luyện thêm.`
    : `Phần ${label} con còn yếu, bố mẹ cho con luyện thêm nhé.`;
}

export interface ComposeCommentInput {
  levels: Levels;
  skillLevels?: SkillLevels | null;
  /** Chip "Hôm nay học" của buổi, giữ thứ tự đã chọn. */
  topics?: readonly SkillKey[] | null;
  /** Kỹ năng đang bật "Chấm riêng"; bỏ trống = mọi kỹ năng có mức. */
  gradedSkills?: readonly SkillKey[] | null;
}

/** Kỹ năng có mức và đang bật chấm, theo thứ tự cố định. */
export function gradedSkillEntries(
  skillLevels: SkillLevels | null | undefined,
  gradedSkills?: readonly SkillKey[] | null,
): Array<{ key: SkillKey; level: Level }> {
  const allowed = gradedSkills ? new Set(gradedSkills) : null;
  return SKILL_KEYS.flatMap((key) => {
    const level = skillLevels?.[key];
    if (!level) return [];
    if (allowed && !allowed.has(key)) return [];
    return [{ key, level }];
  });
}

/**
 * Ghép câu nhận xét tự sinh: gộp các mục Tốt thành một câu khen, sau đó mỗi mục
 * Đạt/Cần cố gắng một câu theo thứ tự tiêu chí rồi kỹ năng.
 */
export function composeComment({
  levels,
  skillLevels,
  topics,
  gradedSkills,
}: ComposeCommentInput): string {
  const content = todayTopicsPhrase(topics);
  const skills = gradedSkillEntries(skillLevels, gradedSkills);
  const praise = [
    ...CRITERION_KEYS.filter((key) => levels[key] === "good").map((key) =>
      fillContent(CRITERION_PRAISE[key], content),
    ),
    ...skills
      .filter((skill) => skill.level === "good")
      .map((skill) => `${lower(SKILL_LABELS[skill.key])} tốt`),
  ];

  const sentences: string[] = [];
  if (praise.length > 0) sentences.push(`Con ${joinWithVa(praise)}.`);
  for (const key of CRITERION_KEYS) {
    if (levels[key] !== "good") sentences.push(criterionSentence(key, levels[key], content));
  }
  for (const skill of skills) {
    if (skill.level !== "good") sentences.push(skillSentence(skill.key, skill.level));
  }
  return sentences.join(" ");
}

/** Số mục (tiêu chí + kỹ năng đang chấm) ở mức Cần cố gắng. */
export function needsWorkCount({
  levels,
  skillLevels,
  gradedSkills,
}: ComposeCommentInput): number {
  const criteria = CRITERION_KEYS.filter((key) => levels[key] === "needs_work").length;
  const skills = gradedSkillEntries(skillLevels, gradedSkills).filter(
    (skill) => skill.level === "needs_work",
  ).length;
  return criteria + skills;
}

/** Dòng tóm tắt danh sách em; null khi không có mục nào cần cố gắng. */
export function effortSummary(input: ComposeCommentInput): string | null {
  const count = needsWorkCount(input);
  return count > 0 ? `${count} mục cần cố gắng` : null;
}

/**
 * Sinh lại câu khi đổi mức/chip/chấm BTVN: ghi đè phần câu (kể cả giáo viên đã
 * sửa tay) nhưng giữ nguyên phần gõ thêm `note`.
 */
export function regenerateSlipText(
  input: ComposeCommentInput & { note?: string | null },
): { comment: string; note: string } {
  return { comment: composeComment(input), note: input.note ?? "" };
}
