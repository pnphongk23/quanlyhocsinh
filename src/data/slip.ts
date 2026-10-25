import type { StarLevel } from "./types";

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

export function defaultSlipComment(stars: StarLevel): string {
  return DEFAULT_SLIP_COMMENTS[stars];
}
