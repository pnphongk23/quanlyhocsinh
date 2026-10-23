/** Độ rộng cột bảng điểm desktop: nhớ riêng từng lớp, chỉ trên máy này. */
export const STUDENT_COLUMN = "student";

/** Khoảng tự co theo nội dung của cột tên học sinh (px). */
export const STUDENT_FIT_MIN = 140;
export const STUDENT_FIT_MAX = 280;
/** Cột bài kiểm tra tự co theo tiêu đề tới mức này (px). */
export const TEST_FIT_MAX = 240;
/** Giới hạn khi kéo hoặc bấm phím đổi độ rộng, mọi cột (px). */
export const COLUMN_MIN = 96;
export const COLUMN_MAX = 480;
/** Mỗi lần bấm ←/→ trên tay nắm đổi từng này (px). */
export const COLUMN_STEP = 8;
/** Độ rộng ô nhập điểm khi cột chưa được chỉnh (px). */
export const CELL_DEFAULT = 140;

export type ColumnWidths = Record<string, number>;

export const columnsKey = (classId: string): string =>
  `qlh.scoreCols.v1.${classId}`;

export function clampColumn(width: number): number {
  return Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, Math.round(width)));
}

/** Đọc lỗi (storage bị chặn, JSON hỏng, giá trị lạ) thì bỏ qua và dùng mặc định. */
export function loadColumnWidths(classId: string): ColumnWidths {
  try {
    const raw = localStorage.getItem(columnsKey(classId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return {};
    const widths: ColumnWidths = {};
    for (const [id, width] of Object.entries(parsed)) {
      if (typeof width === "number" && Number.isFinite(width))
        widths[id] = clampColumn(width);
    }
    return widths;
  } catch {
    return {};
  }
}

export function saveColumnWidths(classId: string, widths: ColumnWidths): void {
  try {
    localStorage.setItem(columnsKey(classId), JSON.stringify(widths));
  } catch {
    // Không ghi được thì độ rộng chỉ có hiệu lực trong phiên này.
  }
}
