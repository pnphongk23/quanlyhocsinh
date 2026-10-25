import type { Score, Test } from "../../data/types";
import { formatScore } from "../../shared/format";

export interface LatestTestScore {
  name: string;
  /** Điểm đã nhập của bài gần nhất. */
  value: number;
  date: string;
}

/**
 * "Kiểm tra gần nhất" của một em: bài có ngày muộn nhất mà em đã có điểm
 * (khác null). Bài chưa có điểm và bài đã lưu trữ không tính. Không dùng điểm
 * trung bình — chỉ một điểm của một bài, kèm "/điểm tối đa" (quyết định R1-06).
 */
export function latestTestScore(
  tests: Test[],
  scores: Score[],
  studentId: string,
): LatestTestScore | null {
  const candidates = tests
    .filter((test) => test.archived !== true)
    .flatMap((test) => {
      const score = scores.find(
        (item) =>
          item.testId === test.id &&
          item.studentId === studentId &&
          item.value !== null,
      );
      if (!score || score.value === null) return [];
      return [
        {
          name: test.name,
          value: score.value,
          date: test.date,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
}

/** "14/20" — điểm / điểm tối đa của bài gần nhất, không có điểm trung bình. */
export function latestTestLabel(latest: LatestTestScore | null): string {
  if (!latest) return "Chưa có điểm";
    return `${latest.name} · ${trimNumber(latest.value)}`;
}

/** Số gọn cho điểm: 14 → "14", 7.5 → "7,5". */
export function trimNumber(value: number): string {
    return formatScore(value);
}
