import Dexie, { type Table } from "dexie";
import type { EntityMap, SyncCommand } from "./api/types";

export type CacheIdentity = { userId: string; workspaceId: string; membershipId: string };
export type OutboxStatus = "pending" | "sending" | "rejected";
export interface OutboxRow {
  id: string; identity: string; type: SyncCommand["type"]; payload: SyncCommand["payload"];
  base_version: number; membership_id: string; created_at: string; status: OutboxStatus;
  error?: string; depends_on?: string;
  cell_key?: string;
}
export interface MetaRow { key: string; identity: string; cursor: number; epoch: number; }
type Stored<T> = T & { identity: string; key: string; entity: string };

export class AppDatabase extends Dexie {
  classes!: Table<Stored<EntityMap["class"]>, string>;
  students!: Table<Stored<EntityMap["student"]>, string>;
  sessions!: Table<Stored<EntityMap["class_session"]>, string>;
  attendance!: Table<Stored<EntityMap["attendance"]>, string>;
  tests!: Table<Stored<EntityMap["test"]>, string>;
  scores!: Table<Stored<EntityMap["score"]>, string>;
  slips!: Table<Stored<EntityMap["slip"]>, string>;
  homeworkSections!: Table<Stored<EntityMap["homework_section"]>, string>;
  homeworkGrades!: Table<Stored<EntityMap["homework_grade"]>, string>;
  reports!: Table<Stored<EntityMap["report"]>, string>;
  reportPublications!: Table<Stored<EntityMap["report_publication"]>, string>;
  outbox!: Table<OutboxRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("qlh-web");
    this.version(1).stores({
      classes: "key, identity, id", students: "key, identity, class_id, id",
      sessions: "key, identity, class_id, date, id", attendance: "key, identity, session_id, student_id",
      tests: "key, identity, class_id, date, id", scores: "key, identity, test_id, student_id",
      slips: "key, identity, session_id, student_id", homeworkSections: "key, identity, session_id, id",
      homeworkGrades: "key, identity, section_id, student_id", reports: "key, identity, class_id, student_id, month",
      reportPublications: "key, identity, report_id, publication_no", outbox: "id, identity, status, created_at",
      meta: "key, identity",
    });
  }
}

export const db = new AppDatabase();
let activeIdentity: CacheIdentity | null = null;
export function identityKey(identity = activeIdentity): string {
  return identity ? `${identity.userId}:${identity.workspaceId}:${identity.membershipId}` : "anonymous";
}
export function setCacheIdentity(identity: CacheIdentity | null): void { activeIdentity = identity; }
export function getCacheIdentity(): CacheIdentity | null { return activeIdentity; }
export function rowKey(entity: string, parts: Array<string | number | null>): string { return `${identityKey()}|${entity}|${parts.map(String).join("|")}`; }

const tables = {
  class: db.classes, student: db.students, class_session: db.sessions, attendance: db.attendance,
  test: db.tests, score: db.scores, slip: db.slips, homework_section: db.homeworkSections,
  homework_grade: db.homeworkGrades, report: db.reports, report_publication: db.reportPublications,
} as const;
export type EntityName = keyof typeof tables;
export function tableFor(entity: EntityName): Table<Stored<EntityMap[EntityName]>, string> {
  return tables[entity] as Table<Stored<EntityMap[EntityName]>, string>;
}
export function stored<T extends object>(entity: EntityName, key: string, value: T): T & { identity: string; key: string; entity: string } {
  return { ...value, identity: identityKey(), key, entity };
}
