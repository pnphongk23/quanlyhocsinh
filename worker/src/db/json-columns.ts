type Row = Record<string, any>;

/** Dạng JSON mong đợi của một cột: `object` (map) hoặc `array`. */
type JsonKind = "object" | "array";

const matches = (value: unknown, kind: JsonKind): boolean =>
  kind === "array"
    ? Array.isArray(value)
    : typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Giải mã các cột JSON (TEXT) và BỎ HẲN khoá khi giá trị là NULL, hỏng hoặc sai dạng/kiểu,
 * để mọi bản ghi cũ trả JSON y hệt trước khi thêm cột (hợp đồng plans/20261104-criteria-levels mục 4:
 * "khoá vắng khi NULL"). Dữ liệu hỏng không làm 500 đường đọc: coi như vắng khoá.
 */
export function decodeJsonColumns<T extends Row>(row: T, columns: readonly string[], kind: JsonKind): T {
  const target = row as Row;
  for (const column of columns) {
    const value = target[column];
    let parsed: unknown;
    try {
      parsed = typeof value === "string" ? JSON.parse(value) : null;
    } catch {
      parsed = null;
    }
    if (value === null || value === undefined || !matches(parsed, kind)) delete target[column];
    else target[column] = parsed;
  }
  return row;
}

/** Cột JSON của phiếu buổi (THỬ NGHIỆM, cờ `CRITERIA_LEVELS`): object khoá tiêu chí/kỹ năng → mức. */
export const SLIP_JSON_COLUMNS = ["levels", "skill_levels"] as const;

/** Cột JSON của buổi học: "Hôm nay học" và kỹ năng bật "Chấm riêng" (array khoá kỹ năng). */
export const CLASS_SESSION_JSON_COLUMNS = ["today_topics", "graded_skills"] as const;
