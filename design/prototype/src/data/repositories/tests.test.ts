import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS } from "../defaults";
import type { StoreState } from "../types";
import { CLASS_ACCESS_ERROR } from "./access";
import { saveScore } from "./scores";
import {
  createTest,
  deleteTest,
  DEFAULT_TEST_MAX,
  listTests,
  updateTest,
} from "./tests";

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

/** Đặt vai trò đang dùng thành một membership cụ thể (mặc định dữ liệu mẫu). */
function actAs(memberId: string, mutate?: (state: StoreState) => void): void {
  const state = createSeed();
  state.auth = { email: "scores@example.test", memberIds: [memberId] };
  state.activeMemberId = memberId;
  mutate?.(state);
  replaceStore(state);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Tạo bài kiểm tra và thang điểm", () => {
  it("mặc định thang 15, chưa lưu trữ", () => {
    const test = createTest({ classId: "6a", name: "Kiểm tra 15 phút", date: "2026-10-10" });
    expect(test.max).toBe(DEFAULT_TEST_MAX);
    expect(test.max).toBe(15);
    expect(test.archived).toBe(false);
    expect(getStore().tests.find((item) => item.id === test.id)?.max).toBe(15);
    expect(listTests("6a").map((item) => item.id)).toContain(test.id);
  });

  it("nhận thang tuỳ chỉnh trong khoảng 1..1000", () => {
    expect(createTest({ classId: "6a", name: "Bài 1", date: "2026-10-10", max: 1 }).max).toBe(1);
    expect(createTest({ classId: "6a", name: "Bài 2", date: "2026-10-10", max: 1000 }).max).toBe(1000);
    expect(createTest({ classId: "6a", name: "Bài 3", date: "2026-10-10", max: 20 }).max).toBe(20);
  });

  it("từ chối thang điểm ngoài 1..1000 hoặc không nguyên", () => {
    for (const max of [0, 1001, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY])
      expect(() =>
        createTest({ classId: "6a", name: "Bài lỗi", date: "2026-10-10", max }),
      ).toThrow(new Error("Thang điểm phải là số nguyên từ 1 đến 1000."));
    expect(getStore().pending).toHaveLength(0);
  });

  it("từ chối tạo khi chỉ có quyền đọc điểm", () => {
    actAs(MEMBER_IDS.trang);
    expect(() =>
      createTest({ classId: "ielts", name: "Bài mới", date: "2026-10-10" }),
    ).toThrow("Bạn không có quyền thực hiện thao tác này.");
  });
});

describe("Sửa bài kiểm tra", () => {
  it("sửa tên, ngày và thang điểm", () => {
    const test = createTest({ classId: "6a", name: "Tên cũ", date: "2026-10-10" });
    const pendingBefore = getStore().pending.length;
    updateTest(test.id, { name: "Tên mới", date: "2026-10-11", max: 100 });
    expect(getStore().tests.find((item) => item.id === test.id)).toMatchObject({
      name: "Tên mới",
      date: "2026-10-11",
      max: 100,
    });
    expect(getStore().pending.length).toBe(pendingBefore + 1);
  });

  it("không hạ thang điểm dưới điểm cao nhất đã nhập", () => {
    // 6a-test-0 đã có điểm 10 của một em trong dữ liệu mẫu.
    expect(() => updateTest("6a-test-0", { max: 9 })).toThrow(
      new Error("Không hạ thang điểm xuống dưới điểm đã nhập (10)."),
    );
    expect(() => updateTest("6a-test-0", { max: 10 })).not.toThrow();
    updateTest("6a-test-0", { max: 10 });
    expect(getStore().tests.find((item) => item.id === "6a-test-0")?.max).toBe(10);
    expect(() => updateTest("6a-test-0", { max: 200 })).not.toThrow();
  });

  it("chỉ tính điểm khác null khi chặn hạ thang điểm", () => {
    const test = createTest({ classId: "6a", name: "Bài trống", date: "2026-10-10", max: 15 });
    saveScore({ testId: test.id, studentId: "6a-student-0", value: null });
    expect(() => updateTest(test.id, { max: 5 })).not.toThrow();
    saveScore({ testId: test.id, studentId: "6a-student-1", value: 5 });
    expect(() => updateTest(test.id, { max: 4 })).toThrow(/điểm đã nhập \(5\)/);
    expect(() => updateTest(test.id, { max: 5 })).not.toThrow();
  });

  it("từ chối tên rỗng, ngày rỗng và thang sai", () => {
    const test = createTest({ classId: "6a", name: "Bài", date: "2026-10-10" });
    expect(() => updateTest(test.id, { name: "  " })).toThrow("Nhập tên bài kiểm tra.");
    expect(() => updateTest(test.id, { date: "" })).toThrow("Chọn ngày kiểm tra.");
    expect(() => updateTest(test.id, { max: 0 })).toThrow(
      "Thang điểm phải là số nguyên từ 1 đến 1000.",
    );
  });

  it("sửa/xoá cần quyền điểm ghi và đúng lớp", () => {
    actAs(MEMBER_IDS.trang);
    expect(() => updateTest("ielts-test-0", { name: "X" })).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    expect(() => deleteTest("ielts-test-0")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    actAs(MEMBER_IDS.lanTeacher);
    expect(() => updateTest("ielts-test-0", { name: "X" })).toThrow(CLASS_ACCESS_ERROR);
    expect(() => deleteTest("ielts-test-0")).toThrow(CLASS_ACCESS_ERROR);
  });
});

describe("Xoá bài kiểm tra", () => {
  it("xoá hẳn khi chưa có điểm khác null", () => {
    const test = createTest({ classId: "6a", name: "Bài bỏ", date: "2026-10-10" });
    saveScore({ testId: test.id, studentId: "6a-student-0", value: null });
    expect(deleteTest(test.id)).toBe("deleted");
    expect(getStore().tests.some((item) => item.id === test.id)).toBe(false);
    expect(getStore().scores.some((item) => item.testId === test.id)).toBe(false);
  });

  it("lưu trữ khi đã có điểm 0 và giữ dữ liệu điểm", () => {
    const test = createTest({ classId: "6a", name: "Bài có điểm", date: "2026-10-10" });
    const score = saveScore({ testId: test.id, studentId: "6a-student-0", value: 0 });
    expect(deleteTest(test.id)).toBe("archived");
    expect(getStore().tests.find((item) => item.id === test.id)?.archived).toBe(true);
    expect(getStore().scores.find((item) => item.id === score.id)?.value).toBe(0);
    expect(listTests("6a").map((item) => item.id)).not.toContain(test.id);
  });

  it("không nhập điểm vào bài đã lưu trữ", () => {
    actAs(MEMBER_IDS.lanAdmin, (state) => {
      const test = state.tests.find((item) => item.id === "6a-test-0")!;
      test.archived = true;
    });
    expect(() =>
      saveScore({ testId: "6a-test-0", studentId: "6a-student-0", value: 8 }),
    ).toThrow("Bài kiểm tra đã lưu trữ, không nhập điểm được.");
    expect(() => updateTest("6a-test-0", { name: "X" })).toThrow(
      "Bài kiểm tra đã lưu trữ, không sửa được.",
    );
  });

  it("danh sách bài kiểm tra bỏ bài lưu trữ và giữ bài của lớp", () => {
    actAs(MEMBER_IDS.lanAdmin, (state) => {
      state.tests.find((item) => item.id === "6a-test-1")!.archived = true;
    });
    const ids = listTests("6a").map((item) => item.id);
    expect(ids).not.toContain("6a-test-1");
    expect(ids).toContain("6a-test-0");
    expect(ids).toHaveLength(3);
  });
});
