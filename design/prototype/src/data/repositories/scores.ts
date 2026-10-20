import type { Score } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requirePermission, requireTest, requireStudent, eligible } from "./helpers";
import { canAccessClass, requireClassAccess } from "./access";
/** Điểm của bài kiểm tra thuộc lớp trong phạm vi vai trò đang dùng. */
export const listScores = (testId: string): Score[] => {
  const test = getStore().tests.find((item) => item.id === testId);
  if (!test || !canAccessClass(test.classId)) return [];
  return getStore().scores.filter((s) => s.testId === testId);
};
export function saveScore(input: Omit<Score, "id">): Score {
  requirePermission("scores", "write");
  const test = requireTest(input.testId),
    student = requireStudent(input.studentId);
  requireClassAccess(test.classId);
  if (test.archived)
    throw new Error("Bài kiểm tra đã lưu trữ, không nhập điểm được.");
  if (student.classId !== test.classId || !eligible(student, test.date))
    throw new Error("Học sinh không thuộc bài kiểm tra này.");
  if (
    input.value !== null &&
    (!Number.isFinite(input.value) || input.value < 0 || input.value > test.max)
  )
    throw new Error(`Điểm phải từ 0 đến ${test.max}.`);
  const old = getStore().scores.find(
    (s) => s.testId === input.testId && s.studentId === input.studentId,
  );
  const item: Score = {
    ...input,
    value: input.value,
    id: old?.id ?? crypto.randomUUID(),
  };
  commit("scores", item.id, (d) => {
    if (old) {
      d.changeLogs.push({
        id: crypto.randomUUID(),
        entity: "scores",
        recordId: item.id,
        before: { ...old },
        after: { ...item },
        changedAt: new Date().toISOString(),
        actor: d.auth?.email ?? "prototype",
      });
      d.scores = d.scores.map((s) => (s.id === item.id ? item : s));
    } else d.scores.push(item);
    d.reports.forEach((r) => {
      if (
        r.studentId === item.studentId &&
        r.month === test.date.slice(0, 7) &&
        r.status === "published"
      )
        r.needsRepublish = true;
    });
  });
  return item;
}
