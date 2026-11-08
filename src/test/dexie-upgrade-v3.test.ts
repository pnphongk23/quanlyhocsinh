import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

beforeEach(async () => { await Dexie.delete("qlh-web"); });
afterEach(async () => { await Dexie.delete("qlh-web"); });

describe("Dexie v2 → v4", () => {
  it("chỉ thêm bảng tiêu chí, giữ nguyên dữ liệu phiếu cũ sau khi mở version 4", async () => {
    const legacy = new Dexie("qlh-web");
    legacy.version(2).stores({ slips: "key, identity, session_id, student_id", meta: "key, identity" });
    await legacy.open();
    await legacy.table("slips").put({
      key: "u:w:m|slip|s1|st1", identity: "u:w:m", entity: "slip",
      session_id: "s1", student_id: "st1", criteria: 30, comment: "Câu cũ", scale: 5,
      stars: 4, note: "Ghi chú", hw_manual: 1, status: "sent", sent_at: null,
      version: 2, updated_at: "2026-10-20T00:00:00Z",
    });
    legacy.close();

    const { AppDatabase } = await import("../data/db");
    const upgraded = new AppDatabase();
    await upgraded.open();
    expect(upgraded.verno).toBe(4);
    expect(upgraded.tables.map((table) => table.name)).toContain("criteriaSets");
    expect(await upgraded.slips.get("u:w:m|slip|s1|st1")).toMatchObject({
      criteria: 30, stars: 4, comment: "Câu cũ", note: "Ghi chú", hw_manual: 1, version: 2,
    });
    expect(await upgraded.slips.get("u:w:m|slip|s1|st1")).not.toHaveProperty("levels");
    upgraded.close();
  });
});
