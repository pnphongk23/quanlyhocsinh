import { useSyncExternalStore } from "react";
import type { StoreState } from "./types";
import { db, getCacheIdentity, identityKey, setCacheIdentity } from "./db";
import { setSaveStatus } from "./saveStatus";
const empty = (): StoreState => ({
  classes: [], students: [], sessions: [], attendance: [], tests: [], scores: [], comments: [], homeworkSections: [],
  homeworkGrades: [], reports: [], changeLogs: [], pending: [], auth: null, currentClassId: null, roles: [], members: [], activeMemberId: null,
});
let state: StoreState = empty();
if (typeof window !== "undefined") window.__QLH_STATE__ = state;
let current = identityKey();
let storageError = false;
const listeners = new Set<() => void>();
export const getStore = (): StoreState => state;
export const hasStorageError = (): boolean => storageError;
export function subscribe(listener: () => void): () => void { listeners.add(listener); return () => listeners.delete(listener); }
function emit(): void { listeners.forEach((listener) => listener()); }
export function replaceStore(next: StoreState): void { state = next; if (typeof window !== "undefined") window.__QLH_STATE__ = state; emit(); }
export const useStore = (): StoreState => useSyncExternalStore(subscribe, getStore, getStore);

export async function hydrateStore(): Promise<void> {
  const id = identityKey(); current = id;
  if (id === "anonymous") { replaceStore(empty()); return; }
  try {
  const [classes, students, sessions, attendance, tests, scores, comments, homeworkSections, homeworkGrades, reports, outbox] = await Promise.all([
    db.classes.where("identity").equals(id).toArray(), db.students.where("identity").equals(id).toArray(), db.sessions.where("identity").equals(id).toArray(),
    db.attendance.where("identity").equals(id).toArray(), db.tests.where("identity").equals(id).toArray(), db.scores.where("identity").equals(id).toArray(),
    db.slips.where("identity").equals(id).toArray(), db.homeworkSections.where("identity").equals(id).toArray(), db.homeworkGrades.where("identity").equals(id).toArray(),
    db.reports.where("identity").equals(id).toArray(), db.outbox.where("identity").equals(id).toArray(),
  ]);
  if (current !== id) return;
  const values = <T extends { entity: string; key: string; identity: string }>(rows: T[]) => rows.map(({ entity: _e, key: _k, identity: _i, ...row }) => row);
  const raw={ classes:values(classes),students:values(students),sessions:values(sessions),attendance:values(attendance),tests:values(tests),scores:values(scores),comments:values(comments),homeworkSections:values(homeworkSections),homeworkGrades:values(homeworkGrades),reports:values(reports) } as any;
  state = { ...empty(), classes: raw.classes.map((x:any)=>({...x,time:x.start_time})), students: raw.students.map((x:any)=>({...x,classId:x.class_id,parentPhone:x.parent_phone??"",enrolledAt:x.enrolled_at,leftAt:x.left_at})), sessions: raw.sessions.map((x:any)=>({...x,classId:x.class_id,time:x.start_time,makeup:x.is_makeup})), attendance: raw.attendance.map((x:any)=>({...x,id:`${x.session_id}:${x.student_id}`,sessionId:x.session_id,studentId:x.student_id,lateAt:x.late_at})), tests: raw.tests.map((x:any)=>({...x,classId:x.class_id})), scores: raw.scores.map((x:any)=>({...x,id:`${x.test_id}:${x.student_id}`,testId:x.test_id,studentId:x.student_id})), comments: raw.comments.map((x:any)=>({...x,id:`${x.session_id}:${x.student_id}`,classId:"",sessionId:x.session_id,studentId:x.student_id,sendQueued:false,sentAt:x.sent_at,updatedAt:x.updated_at,createdAt:x.updated_at})), homeworkSections:raw.homeworkSections.map((x:any)=>({...x,sessionId:x.session_id})), homeworkGrades:raw.homeworkGrades.map((g:any)=>({...g,sectionId:g.section_id,studentId:g.student_id,level:g.level??null})), reports: raw.reports.map((x:any)=>({...x,classId:x.class_id,studentId:x.student_id,generalComment:x.general_comment,needsRepublish:x.needs_republish,publishedAt:x.published_at})), activeMemberId: getCacheIdentity()?.membershipId ?? null,
    pending: outbox.map((row) => ({ id: row.id, entity: row.type, recordId: row.id, createdAt: row.created_at })) };
  storageError=false; setSaveStatus(outbox.some((x) => x.status === "rejected") ? "error" : outbox.length ? "local" : "synced"); emit();
  } catch { storageError=true; setSaveStatus("error"); }
}
export { setCacheIdentity };
