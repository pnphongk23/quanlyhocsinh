import type { HomeworkGrade, HomeworkKind, HomeworkLevel, HomeworkSection } from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requirePermission, requireStudent } from "./helpers";
import {
  canAccessSession,
  requireSessionAccess,
} from "./access";
import {
  HOMEWORK_KINDS,
  homeworkSectionsFor,
  studentsOnSession,
} from "../homework";

/**
 * BTVN thuộc nhóm quyền "Nhận xét và báo cáo" (không thêm nhóm mới).
 * Mọi thao tác ghi đều đi qua commit() nên dùng được khi mất mạng.
 */

function requireEditableSession(sessionId: string) {
  const session = requireSessionAccess(sessionId);
  if (session.status === "cancelled")
    throw new Error("Buổi học đã hủy nên không giao hoặc chấm bài tập.");
  return session;
}

function requireSection(id: string) {
  const section = getStore().homeworkSections.find((item) => item.id === id);
  if (!section) throw new Error("Không tìm thấy phần bài tập.");
  return section;
}

/** Buổi chấm của phần BTVN: buổi kế tiếp chưa hủy của lớp. */
function requireGradingSession(section: HomeworkSection) {
  const sessions = getStore().sessions;
  const current = sessions.find((item) => item.id === section.sessionId);
  if (!current) throw new Error("Không tìm thấy buổi học.");
  const after = sessions
    .filter((item) => item.classId === current.classId)
    .sort(
      (a, b) =>
        `${a.date} ${a.time ?? "00:00"}`.localeCompare(
          `${b.date} ${b.time ?? "00:00"}`,
        ),
    )
    .filter(
      (item) =>
        `${item.date} ${item.time ?? "00:00"}` >
        `${current.date} ${current.time ?? "00:00"}`,
    );
  const grading = after.find((item) => item.status !== "cancelled");
  if (!grading) throw new Error("Chưa có buổi chấm cho phần bài tập này.");
  return grading;
}

/** Phần BTVN của một buổi đọc được; ngoài phạm vi trả mảng rỗng. */
export function listHomeworkSections(sessionId: string): HomeworkSection[] {
  if (!canAccessSession(sessionId)) return [];
  return homeworkSectionsFor(getStore(), sessionId);
}

/** Kết quả chấm một phần; ngoài phạm vi trả mảng rỗng. */
export function listHomeworkGrades(sectionId: string): HomeworkGrade[] {
  const section = getStore().homeworkSections.find((item) => item.id === sectionId);
  if (!section || !canAccessSession(section.sessionId)) return [];
  return getStore().homeworkGrades.filter((item) => item.sectionId === sectionId);
}

/**
 * Giao (hoặc sửa) một phần BTVN. Mỗi buổi tối đa một phần mỗi loại.
 * Sửa tiêu đề/mô tả lúc nào cũng được; kết quả chấm không bị đụng tới.
 */
export function saveHomeworkSection(input: {
  id?: string;
  sessionId: string;
  kind: HomeworkKind;
  title: string;
  description?: string;
}): HomeworkSection {
  requirePermission("comments_reports", "write");
  requireEditableSession(input.sessionId);
  if (!HOMEWORK_KINDS.includes(input.kind))
    throw new Error("Loại bài tập không hợp lệ.");
  const title = input.title.trim();
  if (!title) throw new Error("Nhập tiêu đề phần bài tập.");
  const description = input.description?.trim() ?? "";
  const old = input.id ? getStore().homeworkSections.find((item) => item.id === input.id) : undefined;
  if (input.id && !old) throw new Error("Không tìm thấy phần bài tập.");
  if (old && old.sessionId !== input.sessionId)
    throw new Error("Không chuyển phần bài tập sang buổi khác.");
  const duplicate = getStore().homeworkSections.find(
    (item) =>
      item.sessionId === input.sessionId &&
      item.kind === input.kind &&
      item.id !== old?.id,
  );
  if (duplicate)
    throw new Error("Mỗi loại chỉ có một phần trong một buổi.");
  const item: HomeworkSection = {
    id: old?.id ?? crypto.randomUUID(),
    sessionId: input.sessionId,
    kind: input.kind,
    title,
    description,
  };
  commit("homeworkSections", item.id, (draft) => {
    draft.homeworkSections = draft.homeworkSections.filter(
      (section) => section.id !== item.id,
    );
    draft.homeworkSections.push(item);
  });
  return item;
}

/** Xoá phần BTVN; chỉ khi chưa chấm cho em nào. */
export function deleteHomeworkSection(id: string): void {
  requirePermission("comments_reports", "write");
  const section = requireSection(id);
  requireEditableSession(section.sessionId);
  if (getStore().homeworkGrades.some((grade) => grade.sectionId === id))
    throw new Error(
      "Đã chấm cho học sinh nên không xoá được. Vẫn sửa được tiêu đề và mô tả.",
    );
  commit("homeworkSections", id, (draft) => {
    draft.homeworkSections = draft.homeworkSections.filter(
      (item) => item.id !== id,
    );
  });
}

/** Học sinh còn đang học ở buổi chấm của phần này. */
function isGradedAtGradingSession(section: HomeworkSection, studentId: string): boolean {
  const student = requireStudent(studentId);
  const grading = requireGradingSession(section);
  if (student.classId !== grading.classId) return false;
  return studentsOnSession(getStore(), grading).some((item) => item.id === studentId);
}

/**
 * Chấm một em ở một phần: level null là bỏ kết quả (về "Chưa chấm").
 * Chỉ em còn đang học ở buổi chấm mới chấm được.
 */
export function setHomeworkGrade(
  sectionId: string,
  studentId: string,
  level: HomeworkLevel | null,
): HomeworkGrade | null {
  requirePermission("comments_reports", "write");
  const section = requireSection(sectionId);
  requireEditableSession(section.sessionId);
  if (level !== null && !isGradedAtGradingSession(section, studentId))
    throw new Error("Học sinh không còn học ở buổi chấm này.");
  let result: HomeworkGrade | null = null;
  commit("homeworkGrades", sectionId, (draft) => {
    draft.homeworkGrades = draft.homeworkGrades.filter(
      (item) => !(item.sectionId === sectionId && item.studentId === studentId),
    );
    if (level !== null) {
      result = { sectionId, studentId, level };
      draft.homeworkGrades.push(result);
    }
  });
  return result;
}

/**
 * Đánh dấu cả lớp một mức cho một phần. Chỉ áp dụng cho em còn đang học ở
 * buổi chấm; trả về số em đã chấm.
 */
export function setHomeworkGradeForAll(
  sectionId: string,
  level: HomeworkLevel,
): number {
  requirePermission("comments_reports", "write");
  const section = requireSection(sectionId);
  requireEditableSession(section.sessionId);
  const grading = requireGradingSession(section);
  const roster = studentsOnSession(getStore(), grading);
  commit("homeworkGrades", sectionId, (draft) => {
    for (const student of roster) {
      draft.homeworkGrades = draft.homeworkGrades.filter(
        (item) =>
          !(item.sectionId === sectionId && item.studentId === student.id),
      );
      draft.homeworkGrades.push({ sectionId, studentId: student.id, level });
    }
  });
  return roster.length;
}
