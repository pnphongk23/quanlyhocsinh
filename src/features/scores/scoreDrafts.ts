/** Điểm gõ dở của một em ở một bài: chỉ có giá trị hoặc để trống (chưa có điểm). */
export interface ScoreDraft {
  value: string;
}

export type ClassScoreDrafts = Record<string, Record<string, ScoreDraft>>;

export function draftsForClass(drafts: ClassScoreDrafts, classId: string) {
  return drafts[classId] ?? {};
}

export function entriesForClassTests(
  drafts: ClassScoreDrafts,
  classId: string,
  testIds: Set<string>,
) {
  return Object.entries(draftsForClass(drafts, classId)).filter(([key]) =>
    testIds.has(key.slice(0, key.indexOf(":"))),
  );
}

export function clearClassTestDrafts(
  drafts: ClassScoreDrafts,
  classId: string,
  testIds: Set<string>,
): ClassScoreDrafts {
  const remaining = Object.fromEntries(
    Object.entries(draftsForClass(drafts, classId)).filter(([key]) =>
      !testIds.has(key.slice(0, key.indexOf(":"))),
    ),
  );
  const next = { ...drafts };
  if (Object.keys(remaining).length) next[classId] = remaining;
  else delete next[classId];
  return next;
}
