import type { Test } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import {
  requireClass,
  requirePermission,
  requireTest,
} from "./helpers";
import { canAccessClass, requireClassAccess } from "./access";

/** Thang điểm mặc định khi tạo bài kiểm tra mới. */
export const DEFAULT_TEST_MAX = 15;
/** Giới hạn thang điểm: số nguyên 1..1000. */
export const TEST_MAX_MIN = 1;
export const TEST_MAX_MAX = 1000;

/** Kiểm tra thang điểm hợp lệ (số nguyên 1..1000) và trả lại giá trị. */
export function validateTestMax(max: number): number {
  if (!Number.isInteger(max) || max < TEST_MAX_MIN || max > TEST_MAX_MAX)
    throw new Error("Thang điểm phải là số nguyên từ 1 đến 1000.");
  return max;
}

const isArchived = (test: Test): boolean => test.archived === true;

/** Điểm cao nhất đã nhập (khác null) của một bài kiểm tra. */
function highestScore(testId: string): number | null {
  const values = getStore()
    .scores.filter((s) => s.testId === testId && s.value !== null)
    .map((s) => s.value as number);
  return values.length ? Math.max(...values) : null;
}

/** Bài kiểm tra của lớp trong phạm vi vai trò đang dùng; bỏ bài đã lưu trữ. */
export const listTests = (classId: string): Test[] =>
  canAccessClass(classId)
    ? getStore().tests.filter((t) => t.classId === classId && !isArchived(t))
    : [];

export type TestInput = Omit<Test, "id" | "max" | "archived"> & { max?: number };

export function createTest(input: TestInput): Test {
  requirePermission("scores", "write");
  requireClassAccess(input.classId);
  requireClass(input.classId);
  if (!input.name.trim()) throw new Error("Nhập tên bài kiểm tra.");
  const { max, ...rest } = input;
  const item: Test = {
    ...rest,
    id: crypto.randomUUID(),
    max: validateTestMax(max ?? DEFAULT_TEST_MAX),
    archived: false,
  };
  commit("tests", item.id, (d) => {
    d.tests.push(item);
  });
  return item;
}

/**
 * Sửa tên, ngày hoặc thang điểm của bài kiểm tra. Không được hạ thang điểm
 * xuống dưới điểm cao nhất đã nhập cho bài đó (kể cả điểm 0).
 */
export function updateTest(
  id: string,
  patch: Partial<Pick<Test, "name" | "date" | "max">>,
): Test {
  requirePermission("scores", "write");
  const current = requireTest(id);
  requireClassAccess(current.classId);
  requireClass(current.classId);
  if (isArchived(current))
    throw new Error("Bài kiểm tra đã lưu trữ, không sửa được.");
  const next: Test = { ...current };
  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error("Nhập tên bài kiểm tra.");
    next.name = patch.name;
  }
  if (patch.date !== undefined) {
    if (!patch.date.trim()) throw new Error("Chọn ngày kiểm tra.");
    next.date = patch.date;
  }
  if (patch.max !== undefined) {
    const max = validateTestMax(patch.max);
    const highest = highestScore(id);
    if (highest !== null && max < highest)
      throw new Error(
        `Không hạ thang điểm xuống dưới điểm đã nhập (${highest}).`,
      );
    next.max = max;
  }
  commit("tests", id, (d) => {
    Object.assign(requireTest(id, d), next);
  });
  return next;
}

/**
 * Xoá hẳn bài kiểm tra khi chưa có điểm nào khác null (ô "Chưa có điểm" không
 * tính). Đã có điểm, kể cả 0, thì lưu trữ và giữ nguyên dữ liệu điểm.
 */
export function deleteTest(id: string): "deleted" | "archived" {
  requirePermission("scores", "write");
  const test = requireTest(id);
  requireClassAccess(test.classId);
  requireClass(test.classId);
  if (highestScore(id) !== null || isArchived(test)) {
    commit("tests", id, (d) => {
      requireTest(id, d).archived = true;
    });
    return "archived";
  }
  commit("tests", id, (d) => {
    d.tests = d.tests.filter((t) => t.id !== id);
    d.scores = d.scores.filter((s) => s.testId !== id);
  });
  return "deleted";
}
