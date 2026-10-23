/** Độ rộng cột bảng điểm desktop: nhớ riêng từng lớp, chỉ trên máy này. */
export const STUDENT_COLUMN = "student";

/** Giá trị token lưới điểm (px), đọc từ CSS để JS và CSS cùng một nguồn. */
export interface GridTokens {
  nameMin: number;
  nameMax: number;
  testMax: number;
  cellMin: number;
  step: number;
}

/** Mirror của --grid-col-name-min/max, --grid-col-test-max, --grid-cell-input-min, --grid-resize-step; chỉ dùng khi không đọc được CSS (jsdom). */
const FALLBACK: GridTokens = { nameMin: 140, nameMax: 280, testMax: 240, cellMin: 140, step: 8 };

const TOKEN_NAMES: Record<keyof GridTokens, string> = {
  nameMin: "--grid-col-name-min",
  nameMax: "--grid-col-name-max",
  testMax: "--grid-col-test-max",
  cellMin: "--grid-cell-input-min",
  step: "--grid-resize-step",
};

export function gridTokens(): GridTokens {
  const result = { ...FALLBACK };
  if (typeof document === "undefined") return result;
  const style = getComputedStyle(document.documentElement);
  for (const key of Object.keys(TOKEN_NAMES) as (keyof GridTokens)[]) {
    const value = parseFloat(style.getPropertyValue(TOKEN_NAMES[key]));
    if (Number.isFinite(value)) result[key] = value;
  }
  return result;
}

/** Kéo hoặc bấm phím: tối thiểu bằng ô nhập, tối đa gấp đôi mức tối đa của cột tên. */
export function columnLimits(): { min: number; max: number } {
  const tokens = gridTokens();
  return { min: tokens.cellMin, max: tokens.nameMax * 2 };
}

export type ColumnWidths = Record<string, number>;

export const columnsKey = (classId: string): string =>
  `qlh.scoreCols.v1.${classId}`;

export function clampColumn(width: number): number {
  const { min, max } = columnLimits();
  return Math.min(max, Math.max(min, Math.round(width)));
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
