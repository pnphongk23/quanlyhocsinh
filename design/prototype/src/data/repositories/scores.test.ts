import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS } from "../defaults";
import { createTest } from "./tests";
import { listScores, saveScore } from "./scores";

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

describe("Nhập điểm theo thang của bài", () => {
  it("nhận điểm bằng đúng thang, chặn điểm vượt thang", () => {
    const test = createTest({ classId: "6a", name: "Bài 20 điểm", date: "2026-10-10", max: 20 });
    expect(saveScore({ testId: test.id, studentId: "6a-student-0", value: 20 }).value).toBe(20);
    expect(() =>
      saveScore({ testId: test.id, studentId: "6a-student-1", value: 21 }),
      ).toThrow("Điểm phải từ 0 đến 20, theo bước 0,5.");
    expect(() =>
      saveScore({ testId: test.id, studentId: "6a-student-1", value: -1 }),
      ).toThrow("Điểm phải từ 0 đến 20, theo bước 0,5.");
    expect(() =>
      saveScore({ testId: test.id, studentId: "6a-student-1", value: Number.NaN }),
      ).toThrow("Điểm phải từ 0 đến 20, theo bước 0,5.");
    expect(saveScore({ testId: test.id, studentId: "6a-student-1", value: 7.5 }).value).toBe(7.5);
    expect(() => saveScore({ testId: test.id, studentId: "6a-student-2", value: 7.3 })).toThrow(
      "Điểm phải từ 0 đến 20, theo bước 0,5.",
    );
  });

  it("thang mặc định 15 chặn điểm 16 nhưng nhận 15", () => {
    const test = createTest({ classId: "6a", name: "Bài 15 điểm", date: "2026-10-10" });
    expect(() =>
      saveScore({ testId: test.id, studentId: "6a-student-0", value: 16 }),
      ).toThrow("Điểm phải từ 0 đến 15, theo bước 0,5.");
    expect(saveScore({ testId: test.id, studentId: "6a-student-0", value: 15 }).value).toBe(15);
  });

  it("bài dữ liệu mẫu thang 10 vẫn nhận 10 và chặn 11", () => {
    expect(() =>
      saveScore({ testId: "6a-test-0", studentId: "6a-student-0", value: 11 }),
      ).toThrow("Điểm phải từ 0 đến 10, theo bước 0,5.");
    expect(saveScore({ testId: "6a-test-0", studentId: "6a-student-0", value: 10 }).value).toBe(10);
  });

  it("chưa có điểm vẫn lưu được và không tính là điểm", () => {
    const test = createTest({ classId: "6a", name: "Bài trống", date: "2026-10-10" });
    const score = saveScore({ testId: test.id, studentId: "6a-student-0", value: null });
    expect(score.value).toBeNull();
    expect(listScores(test.id).map((item) => item.value)).toEqual([null]);
    expect(() =>
      saveScore({ testId: test.id, studentId: "6a-student-1", value: 15 }),
    ).not.toThrow();
  });

  it("ngoài lớp thì không đọc hoặc ghi điểm", () => {
    const state = createSeed();
    state.auth = { phone: "900000001", memberIds: [MEMBER_IDS.lanTeacher] };
    state.activeMemberId = MEMBER_IDS.lanTeacher;
    replaceStore(state);
    expect(listScores("ielts-test-0")).toEqual([]);
    expect(() =>
      saveScore({ testId: "ielts-test-0", studentId: "ielts-student-0", value: 9 }),
    ).toThrow("Bạn không có quyền truy cập lớp này.");
    expect(getStore().pending).toHaveLength(0);
  });
});
