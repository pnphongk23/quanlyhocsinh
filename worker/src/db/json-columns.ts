type Row = Record<string, any>;

/**
 * Giải mã các cột JSON (TEXT) và BỎ HẲN khoá khi giá trị là NULL, để mọi bản ghi cũ trả JSON y hệt
 * trước khi thêm cột (hợp đồng plans/20261104-criteria-levels mục 4: "khoá vắng khi NULL").
 */
export function decodeJsonColumns<T extends Row>(row: T, columns: readonly string[]): T {
  const target = row as Row;
  for (const column of columns) {
    const value = target[column];
    if (value === null || value === undefined) delete target[column];
    else if (typeof value === "string") target[column] = JSON.parse(value);
  }
  return row;
}

/** Cột JSON của phiếu buổi (THỬ NGHIỆM, cờ `CRITERIA_LEVELS`). */
export const SLIP_JSON_COLUMNS = ["levels", "skill_levels"] as const;

/** Cột JSON của buổi học: "Hôm nay học" và kỹ năng bật "Chấm riêng". */
export const CLASS_SESSION_JSON_COLUMNS = ["today_topics", "graded_skills"] as const;
