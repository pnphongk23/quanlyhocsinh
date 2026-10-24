import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  columnLimits,
  columnsKey,
  loadColumnWidths,
  saveColumnWidths,
} from "./scoreColumns";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => vi.unstubAllGlobals());

describe("bảng điểm desktop: độ rộng cột", () => {
  it("đọc/ghi theo khoá riêng từng lớp, giới hạn trong min/max", () => {
    saveColumnWidths("6a", { student: 200, t1: 5000, t2: 1 });
    expect(memory.has(columnsKey("6a"))).toBe(true);
    expect(columnsKey("6a")).toBe("qlh.scoreCols.v1.6a");
    expect(loadColumnWidths("6a")).toEqual({
      student: 200,
      t1: columnLimits().max,
      t2: columnLimits().min,
    });
    expect(loadColumnWidths("6b")).toEqual({});
  });

  it("dữ liệu hỏng hoặc storage lỗi thì bỏ qua", () => {
    memory.set(columnsKey("6a"), "{không phải json");
    expect(loadColumnWidths("6a")).toEqual({});
    memory.set(columnsKey("6a"), JSON.stringify({ student: "rộng", a: null }));
    expect(loadColumnWidths("6a")).toEqual({});
    memory.set(columnsKey("6a"), "[1,2]");
    expect(loadColumnWidths("6a")).toEqual({});
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadColumnWidths("6a")).toEqual({});
    expect(() => saveColumnWidths("6a", { student: 200 })).not.toThrow();
  });
});
