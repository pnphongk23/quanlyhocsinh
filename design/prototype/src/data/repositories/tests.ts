import type { Test } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requireClass, requirePermission } from "./helpers";
import { canAccessClass, requireClassAccess } from "./access";
export const listTests = (classId: string): Test[] =>
  canAccessClass(classId)
    ? getStore().tests.filter((t) => t.classId === classId)
    : [];
export function createTest(input: Omit<Test, "id" | "max">): Test {
  requirePermission("scores", "write");
  requireClassAccess(input.classId);
  requireClass(input.classId);
  if (!input.name.trim()) throw new Error("Nhập tên bài kiểm tra.");
  const item: Test = { ...input, id: crypto.randomUUID(), max: 10 };
  commit("tests", item.id, (d) => {
    d.tests.push(item);
  });
  return item;
}
