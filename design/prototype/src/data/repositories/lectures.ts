import type {
  Lecture,
  LectureFile,
  LectureSection,
  Session,
  StoreState,
} from "../types";
import { getStore } from "../store";
import { commit } from "../outbox";
import { requireOnline } from "./helpers";
import {
  can,
  getActiveMember,
  isAdmin,
  requirePermission,
} from "./access";

export type LectureFilter = "mine" | "all" | "archived";

export type LectureInput = {
  title: string;
  sections: Array<
    Omit<LectureSection, "id" | "files"> & {
      files: Array<Omit<LectureFile, "id">>;
    }
  >;
};

/** Bài giảng người dùng đang dùng nhìn thấy được. */
function visible(lecture: Lecture, state: StoreState = getStore()): boolean {
  if (!can("lectures", "read")) return false;
  if (isAdmin()) return true;
  const member = getActiveMember();
  if (!member) return false;
  if (lecture.createdBy === member.id) return true;
  const scope = new Set(member.classIds);
  return state.sessionLectures.some((link) => {
    if (link.lectureId !== lecture.id) return false;
    const session = state.sessions.find((item) => item.id === link.sessionId);
    return session ? scope.has(session.classId) : false;
  });
}

function sessionVisible(session: Session, state: StoreState = getStore()): boolean {
  if (isAdmin()) return true;
  const member = getActiveMember();
  if (!member) return false;
  return member.classIds.includes(session.classId);
}

function buildSections(input: LectureInput): LectureSection[] {
  return input.sections.map((section) => ({
    id: crypto.randomUUID(),
    title: section.title,
    description: section.description,
    files: section.files.map((file) => ({ ...file, id: crypto.randomUUID() })),
  }));
}

export function listLectures(filter: LectureFilter = "all"): Lecture[] {
  if (!can("lectures", "read")) return [];
  const member = getActiveMember();
  const all = getStore().lectures;
  if (filter === "archived")
    return all.filter((lecture) => lecture.archived && visible(lecture));
  const active = all.filter((lecture) => !lecture.archived && visible(lecture));
  if (filter === "mine")
    return active.filter((lecture) => lecture.createdBy === member?.id);
  return active;
}

export function getLecture(id: string): Lecture | undefined {
  const lecture = getStore().lectures.find((item) => item.id === id);
  if (!lecture || !visible(lecture)) return undefined;
  return lecture;
}

export function createLecture(input: LectureInput): Lecture {
  requirePermission("lectures", "write");
  const member = getActiveMember();
  if (!member) throw new Error("Bạn không có quyền thực hiện thao tác này.");
  const title = input.title.trim();
  if (!title) throw new Error("Nhập tiêu đề bài giảng.");
  if (input.sections.some((section) => section.files.length > 0))
    requireOnline();
  const item: Lecture = {
    id: crypto.randomUUID(),
    title,
    createdBy: member.id,
    createdAt: new Date().toISOString(),
    archived: false,
    sections: buildSections(input),
  };
  commit("lectures", item.id, (draft) => {
    draft.lectures.push(item);
  });
  return item;
}

export function updateLecture(id: string, input: LectureInput): Lecture {
  requirePermission("lectures", "write");
  const current = getLecture(id);
  if (!current) throw new Error("Không tìm thấy bài giảng.");
  const title = input.title.trim();
  if (!title) throw new Error("Nhập tiêu đề bài giảng.");
  // Sửa bài giảng đã có cần mạng để tránh xung đột khi nhiều người sửa chung.
  requireOnline();
  const next: Lecture = {
    ...current,
    title,
    sections: buildSections(input),
  };
  commit("lectures", id, (draft) => {
    const target = draft.lectures.find((item) => item.id === id);
    if (target) Object.assign(target, next);
  });
  return next;
}

export function archiveLecture(id: string): void {
  requirePermission("lectures", "write");
  if (!getLecture(id)) throw new Error("Không tìm thấy bài giảng.");
  commit("lectures", id, (draft) => {
    const target = draft.lectures.find((item) => item.id === id);
    if (target) target.archived = true;
  });
}

export function restoreLecture(id: string): void {
  requirePermission("lectures", "write");
  if (!getLecture(id)) throw new Error("Không tìm thấy bài giảng.");
  commit("lectures", id, (draft) => {
    const target = draft.lectures.find((item) => item.id === id);
    if (target) target.archived = false;
  });
}

export function listSessionLectures(sessionId: string): Lecture[] {
  if (!can("lectures", "read")) return [];
  const state = getStore();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || !sessionVisible(session, state)) return [];
  return state.sessionLectures
    .filter((link) => link.sessionId === sessionId)
    .sort((a, b) => a.position - b.position)
    .map((link) => state.lectures.find((item) => item.id === link.lectureId))
    .filter(
      (lecture): lecture is Lecture =>
        lecture !== undefined && visible(lecture, state),
    );
}

export function attachLecture(sessionId: string, lectureId: string): void {
  requirePermission("lectures", "write");
  const state = getStore();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || !sessionVisible(session, state))
    throw new Error("Không tìm thấy buổi học.");
  if (!getLecture(lectureId)) throw new Error("Không tìm thấy bài giảng.");
  if (
    state.sessionLectures.some(
      (link) => link.sessionId === sessionId && link.lectureId === lectureId,
    )
  )
    return;
  const position = state.sessionLectures
    .filter((link) => link.sessionId === sessionId)
    .reduce((max, link) => Math.max(max, link.position + 1), 0);
  commit("sessionLectures", `${sessionId}:${lectureId}`, (draft) => {
    draft.sessionLectures.push({ sessionId, lectureId, position });
  });
}

export function detachLecture(sessionId: string, lectureId: string): void {
  requirePermission("lectures", "write");
  const state = getStore();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || !sessionVisible(session, state))
    throw new Error("Không tìm thấy buổi học.");
  if (
    !state.sessionLectures.some(
      (link) => link.sessionId === sessionId && link.lectureId === lectureId,
    )
  )
    return;
  commit("sessionLectures", `${sessionId}:${lectureId}`, (draft) => {
    draft.sessionLectures = draft.sessionLectures.filter(
      (link) => !(link.sessionId === sessionId && link.lectureId === lectureId),
    );
  });
}

export function listLectureSessions(
  lectureId: string,
): Array<{ session: Session; className: string }> {
  if (!can("lectures", "read")) return [];
  const state = getStore();
  return state.sessionLectures
    .filter((link) => link.lectureId === lectureId)
    .map((link) => state.sessions.find((item) => item.id === link.sessionId))
    .filter(
      (session): session is Session =>
        session !== undefined && sessionVisible(session, state),
    )
    .sort((a, b) =>
      `${a.date} ${a.time ?? "00:00"}`.localeCompare(
        `${b.date} ${b.time ?? "00:00"}`,
      ),
    )
    .map((session) => ({
      session,
      className:
        state.classes.find((item) => item.id === session.classId)?.name ??
        "Không rõ lớp",
    }));
}

export function lectureUsageCount(lectureId: string): number {
  return listLectureSessions(lectureId).length;
}
