import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, identityKey, setCacheIdentity } from "../data/db";
import { ApiError } from "../data/api/client";
import { getSaveStatus, setSaveStatus } from "../data/saveStatus";
import { createSeed } from "../data/seed";

vi.mock("../data/auth/session", () => ({ getToken: () => "fake-token", getSession: () => ({ user: { id: "u" }, me: { memberships: [] } }), updateMe: vi.fn(), clearSession: vi.fn(), invalidateActiveMembership: vi.fn() }));
vi.mock("../data/repositories/access", async (original) => ({ ...(await original<object>()), requirePermission: () => undefined, requireClassAccess: () => undefined, can: () => true, canAccessClass: () => true }));

const sync = vi.hoisted(() => ({ scheduleSync: vi.fn(), syncNow: vi.fn(async (): Promise<void> => undefined) }));
vi.mock("../data/sync", async (original) => ({ ...(await original<object>()), ...sync }));

const identity = { userId: "u", workspaceId: "w", membershipId: "m" };
const classRow = { id: "c1", name: "Lớp A", status: "active", weekdays: [1, 3], start_time: "18:00", teacher_name: null, version: 1 };
const student = (id: string) => ({ id, class_id: "c1", name: "An", parent_phone: null, enrolled_at: "2026-10-01", left_at: null, status: "active", version: 1 });

beforeEach(async () => {
  setCacheIdentity(identity); await db.delete(); await db.open();
  const { replaceStore } = await import("../data/store");
  const state = createSeed(); replaceStore({ ...state, classes: [{ id: "c1", name: "Lớp A", status: "active", weekdays: [1, 3], time: "18:00" } as never], students: [], sessions: [], reports: [], currentClassId: "c1" });
});
afterEach(async () => {
  sync.scheduleSync.mockClear(); sync.syncNow.mockClear(); setCacheIdentity(null); await db.delete(); vi.restoreAllMocks(); });

describe("REST writes persist to the device cache", () => {
  it("keeps a created student after hydrateStore and reuses the id on retry", async () => {
    const { api } = await import("../data/sync");
    const { hydrateStore, getStore } = await import("../data/store");
    const { createStudent } = await import("../data/repositories/students");
    const ids: string[] = [];
    const spy = vi.spyOn(api, "request").mockImplementation((async (endpoint: string, options: any) => {
      if (endpoint === "POST /classes/c1/students") {
        ids.push(options.body.id);
        if (ids.length === 1) throw new TypeError("network");
        return student(options.body.id);
      }
      return undefined;
    }) as never);
    const input = { classId: "c1", name: "An", parentPhone: "", enrolledAt: "2026-10-01" };
    await expect(createStudent(input)).rejects.toThrow();
    const created = await createStudent(input);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(uuid);
    expect(ids[1]).toBe(ids[0]);
    expect(created.id).toBe(ids[0]);
    expect(sync.scheduleSync).toHaveBeenCalledWith(0);
    await hydrateStore();
    expect(getStore().students.filter((s) => s.id === ids[0])).toHaveLength(1);
    expect(await db.students.get(`${identityKey()}|student|${ids[0]}`)).toBeTruthy();
    spy.mockRestore();
  });

  const restoreFromPull = (table: "classes" | "students", entity: "class" | "student", wire: (id: string) => object, pick: () => string) => async () => {
    const { stored } = await import("../data/db");
    const { hydrateStore } = await import("../data/store");
    const id = pick();
    await db[table].put(stored(entity, `${identityKey()}|${entity}|${id}`, wire(id)) as never);
    await hydrateStore();
  };

  it("createClass resolves when REST succeeds but the cache write fails, and recovers by pulling", async () => {
    const { api } = await import("../data/sync");
    const { hydrateStore, getStore } = await import("../data/store");
    const { createClass } = await import("../data/repositories/classes");
    setSaveStatus("synced");
    const bodies: any[] = [];
    vi.spyOn(api, "request").mockImplementation((async (_e: string, options: any) => { bodies.push(options.body); return { ...classRow, id: options.body.id, name: "Lớp mới" }; }) as never);
    vi.spyOn(db.classes, "put").mockRejectedValueOnce(new Error("quota"));
    const restore = restoreFromPull("classes", "class", (id) => ({ ...classRow, id, name: "Lớp mới" }), () => bodies[0].id);
    let statusDuringRecovery = "";
    sync.syncNow.mockImplementationOnce(async () => { statusDuringRecovery = getSaveStatus(); await restore(); });
    const created = await createClass({ name: "Lớp mới", weekdays: [1, 3], time: "18:00" });
    expect(created.id).toBe(bodies[0].id);
    expect(bodies).toHaveLength(1);
    expect(statusDuringRecovery).not.toBe("error");
    expect(getSaveStatus()).not.toBe("error");
    await hydrateStore();
    expect(getStore().classes.filter((c) => c.id === created.id)).toHaveLength(1);
  });

  it("createClass shows a sync error only when the recovery pull also fails to restore the cache", async () => {
    const { api } = await import("../data/sync");
    const { getStore } = await import("../data/store");
    const { createClass } = await import("../data/repositories/classes");
    setSaveStatus("synced");
    vi.spyOn(api, "request").mockImplementation((async (_e: string, options: any) => ({ ...classRow, id: options.body.id, name: "Lớp mới" })) as never);
    vi.spyOn(db.classes, "put").mockRejectedValueOnce(new Error("quota"));
    const created = await createClass({ name: "Lớp mới", weekdays: [1, 3], time: "18:00" });
    expect(getStore().classes.some((c) => c.id === created.id)).toBe(true);
    expect(getSaveStatus()).toBe("error");
  });

  it("retrying a create whose response was lost reuses the id and does not duplicate the class", async () => {
    const { api } = await import("../data/sync");
    const { getStore } = await import("../data/store");
    const { createClass } = await import("../data/repositories/classes");
    const ids: string[] = [];
    vi.spyOn(api, "request").mockImplementation((async (_e: string, options: any) => {
      ids.push(options.body.id);
      if (ids.length === 1) throw new TypeError("network");
      return { ...classRow, id: options.body.id, name: "Lớp mới" };
    }) as never);
    const input = { name: "Lớp mới", weekdays: [1, 3], time: "18:00" };
    await expect(createClass(input)).rejects.toThrow();
    const created = await createClass(input);
    expect(ids[1]).toBe(ids[0]);
    expect(getStore().classes.filter((c) => c.id === created.id)).toHaveLength(1);
  });

  it("updateClass resolves when REST succeeds but the cache write fails, and recovers by pulling", async () => {
    const { api } = await import("../data/sync");
    const { getStore } = await import("../data/store");
    const { updateClass } = await import("../data/repositories/classes");
    setSaveStatus("synced");
    vi.spyOn(api, "request").mockResolvedValue({ ...classRow, name: "Tên mới", version: 2 } as never);
    vi.spyOn(db.classes, "put").mockRejectedValueOnce(new Error("quota"));
    sync.syncNow.mockImplementationOnce(restoreFromPull("classes", "class", (id) => ({ ...classRow, id, name: "Tên mới", version: 2 }), () => "c1"));
    await expect(updateClass("c1", { name: "Tên mới" })).resolves.toBeUndefined();
    expect(getStore().classes.find((c) => c.id === "c1")?.name).toBe("Tên mới");
    expect(getSaveStatus()).not.toBe("error");
  });

  it("shows an error and recovers the student record by pulling when the cache write fails", async () => {
    const { api } = await import("../data/sync");
    const { hydrateStore, getStore } = await import("../data/store");
    const { createStudent } = await import("../data/repositories/students");
    setSaveStatus("synced");
    vi.spyOn(api, "request").mockImplementation((async (_e: string, options: any) => student(options.body.id)) as never);
    vi.spyOn(db.students, "put").mockRejectedValueOnce(new Error("quota"));
    sync.syncNow.mockImplementationOnce(restoreFromPull("students", "student", student, () => getStore().students[0].id));
    const created = await createStudent({ classId: "c1", name: "Dũng", parentPhone: "", enrolledAt: "2026-10-01" });
    expect(getSaveStatus()).not.toBe("error");
    await hydrateStore();
    expect(getStore().students.map((s) => s.id)).toEqual([created.id]);
  });

  it("treats 200 on a repeated create as success without duplicating", async () => {
    const { api } = await import("../data/sync");
    const { getStore } = await import("../data/store");
    const { createStudent } = await import("../data/repositories/students");
    vi.spyOn(api, "request").mockImplementation((async (_e: string, options: any) => student(options.body.id)) as never);
    const input = { classId: "c1", name: "Bình", parentPhone: "", enrolledAt: "2026-10-01" };
    const [a, b] = await Promise.all([createStudent(input), createStudent(input)]);
    expect(a.id).toBe(b.id);
    expect(getStore().students.filter((s) => s.id === a.id)).toHaveLength(1);
  });

  it("reports id_conflict in Vietnamese", async () => {
    const { api } = await import("../data/sync");
    const { createStudent } = await import("../data/repositories/students");
    vi.spyOn(api, "request").mockRejectedValue(new ApiError(409, { code: "id_conflict", message: "x", request_id: "r" }));
    await expect(createStudent({ classId: "c1", name: "Cường", parentPhone: "", enrolledAt: "2026-10-01" })).rejects.toThrow(/mã bị trùng/);
  });

  it("schedule change does not build sessions locally and pulls from the server", async () => {
    const { api } = await import("../data/sync");
    const { getStore } = await import("../data/store");
    const { updateClassSchedule } = await import("../data/repositories/sessions");
    const calls: string[] = [];
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => { calls.push(endpoint); return endpoint.startsWith("PATCH") ? { ...classRow, weekdays: [2, 4], version: 2 } : undefined; }) as never);
    await updateClassSchedule("c1", { weekdays: [2, 4], time: "18:00" }, "2026-10-23");
    expect(getStore().sessions).toHaveLength(0);
    expect(sync.syncNow).toHaveBeenCalledOnce();
    expect(calls[0]).toBe("PATCH /classes/c1");
    expect((await db.classes.get(`${identityKey()}|class|c1`))?.weekdays).toEqual([2, 4]);
  });

  it("cancelling a session still calls the API and survives hydrate", async () => {
    const { api } = await import("../data/sync");
    const { replaceStore, getStore, hydrateStore } = await import("../data/store");
    const { cancelSession } = await import("../data/repositories/sessions");
    replaceStore({ ...getStore(), sessions: [{ id: "s1", classId: "c1", date: "2026-12-01", time: "18:00", origin: "recurring", status: "planned" } as never] });
    const spy = vi.spyOn(api, "request").mockResolvedValue({ id: "s1", status: "cancelled", version: 2 } as never);
    await cancelSession("s1");
    expect(spy).toHaveBeenCalledWith("POST /sessions/s1/cancel");
    await hydrateStore();
    expect(getStore().sessions.find((s) => s.id === "s1")?.status).toBe("cancelled");
  });

  it("only accepts cancelling in setSessionStatus", async () => {
    const { api } = await import("../data/sync");
    const { replaceStore, getStore } = await import("../data/store");
    const { setSessionStatus } = await import("../data/repositories/sessions");
    replaceStore({ ...getStore(), sessions: [{ id: "s1", classId: "c1", date: "2026-12-01", time: "18:00", origin: "recurring", status: "cancelled" } as never] });
    const spy = vi.spyOn(api, "request");
    await expect(setSessionStatus("s1", "planned" as never)).rejects.toThrow(/khôi phục/);
    expect(spy).not.toHaveBeenCalled();
    expect(getStore().sessions[0].status).toBe("cancelled");
  });

  it("change password succeeds even if /me fails", async () => {
    const { api } = await import("../data/sync");
    const { changePassword } = await import("../data/auth");
    vi.spyOn(api, "request").mockImplementation((async (endpoint: string) => { if (endpoint === "GET /me") throw new TypeError("offline"); return { must_change_password: false }; }) as never);
    await expect(changePassword("a", "bbbbbbbb")).resolves.toBeUndefined();
  });
});
