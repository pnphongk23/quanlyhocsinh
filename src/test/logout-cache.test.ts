import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, setCacheIdentity } from "../data/db";
import { clearUserCache } from "../data/sync";
import { hydrateStore, getStore } from "../data/store";

const userATables = [db.classes, db.students, db.sessions, db.attendance, db.tests, db.scores, db.slips, db.homeworkSections, db.homeworkGrades, db.reports, db.reportPublications];
const userAIdentities = ["user-a:workspace-1:membership-1", "user-a:workspace-2:membership-2"];
const userBIdentity = "user-b:workspace-1:membership-3";

beforeEach(async () => {
  setCacheIdentity(null);
  await db.delete();
  await db.open();
});

afterEach(async () => {
  setCacheIdentity(null);
  await db.delete();
});

describe("logout cache cleanup", () => {
  it("removes every user membership cache, cursor, and outbox row while preserving the next user's cache", async () => {
    for (const [index, table] of userATables.entries()) {
      for (const identity of userAIdentities) {
        const id = `${identity}:row-${index}`;
        await table.put({ key: id, identity, entity: "fixture", id } as never);
      }
      const id = `${userBIdentity}:row-${index}`;
      await table.put({ key: id, identity: userBIdentity, entity: "fixture", id } as never);
    }
    for (const identity of userAIdentities) await db.meta.put({ key: identity, identity, cursor: 5, epoch: 2 });
    await db.meta.put({ key: userBIdentity, identity: userBIdentity, cursor: 9, epoch: 3 });
    for (const [id, identity] of [["a-1", userAIdentities[0]], ["a-2", userAIdentities[1]], ["b-1", userBIdentity]] as const) {
      await db.outbox.put({ id, identity, type: "attendance.set", payload: {} as never, base_version: 0, membership_id: "membership", created_at: "2026-10-23T00:00:00Z", status: "pending" });
    }

    await clearUserCache("user-a");

    for (const table of userATables) {
      expect(await table.where("identity").startsWith("user-a:").count()).toBe(0);
      expect(await table.where("identity").equals(userBIdentity).count()).toBe(1);
    }
    expect(await db.meta.where("identity").startsWith("user-a:").count()).toBe(0);
    expect(await db.outbox.where("identity").startsWith("user-a:").count()).toBe(0);
    expect(await db.meta.get(userBIdentity)).toMatchObject({ cursor: 9, epoch: 3 });
    expect(await db.outbox.get("b-1")).toBeDefined();

    setCacheIdentity({ userId: "user-b", workspaceId: "workspace-1", membershipId: "membership-3" });
    await hydrateStore();
    expect(getStore().classes).toHaveLength(1);
    expect(getStore().classes[0]?.id).toBe(`${userBIdentity}:row-0`);
  });
});
