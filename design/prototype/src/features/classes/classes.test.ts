import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../data/seed";
import { getStore, replaceStore } from "../../data/store";
import { createClass, updateClass } from "../../data/repositories/classes";

describe("validation lớp dùng chung khi tạo và sửa", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { onLine: false });
    replaceStore(createSeed());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("trim tên khi tạo và yêu cầu ít nhất một ngày cùng giờ hợp lệ", () => {
    const created = createClass({ name: "  Lớp mới  ", weekdays: [2], time: "18:30" });
    expect(created.name).toBe("Lớp mới");
    expect(() => createClass({ name: "   ", weekdays: [2], time: "18:30" })).toThrow();
    expect(() => createClass({ name: "Lớp", weekdays: [], time: "18:30" })).toThrow();
    expect(() => createClass({ name: "Lớp", weekdays: [2], time: "25:90" })).toThrow();
  });

  it("từ chối sửa tên trắng, bỏ hết ngày hoặc giờ sai và giữ nguyên dữ liệu", () => {
    const before = getStore().classes.find((item) => item.id === "6a")!;
    expect(() => updateClass("6a", { name: "   " })).toThrow();
    expect(() => updateClass("6a", { weekdays: [] })).toThrow();
    expect(() => updateClass("6a", { time: "8:30" })).toThrow();
    expect(getStore().classes.find((item) => item.id === "6a")).toEqual(before);
    expect(getStore().pending).toHaveLength(0);
  });

  it("trim tên đã sửa và chấp nhận hợp lệ một ngày giờ", () => {
    updateClass("6a", { name: "  Lớp đã sửa  ", weekdays: [1], time: "09:05" });
    expect(getStore().classes.find((item) => item.id === "6a")).toMatchObject({
      name: "Lớp đã sửa",
      weekdays: [1],
      time: "09:05",
    });
    expect(getStore().pending).toHaveLength(1);
  });
});
