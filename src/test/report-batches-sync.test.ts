import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import Dexie from "dexie";
import { createFakeServer } from "./fixtures/fake-sync-server";
import { bootDevice, guardianMembership, meFor, staffMembership } from "./fixtures/device";

const membership = { ...staffMembership("m-staff", "ws-1"), permissions: { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "none", comments_reports: "write" } as never };
const teacherMe = meFor("teacher", [membership]);
const parentMe = meFor("parent", [guardianMembership("m-parent", "ws-1")]);
let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  server = createFakeServer();
  server.tokens.set("tA", { membershipId: "m-staff", me: teacherMe });
  server.tokens.set("tB", { membershipId: "m-staff", me: teacherMe });
  server.tokens.set("tP", { membershipId: "m-parent", me: parentMe, studentIds: new Set(["s1"]) });
  server.put("class", { id: "c1", name: "6A", status: "active", weekdays: [1], start_time: "09:00", teacher_name: null });
  for (const id of ["s1", "s2"]) server.put("student", { id, class_id: "c1", name: id.toUpperCase(), enrolled_at: "2019-09-01", left_at: null, status: "active" });
  ["2020-01-06", "2020-01-13", "2020-01-20"].forEach((date, index) => server.put("class_session", { id: `x${index + 1}`, class_id: "c1", date, start_time: "09:00", origin: "recurring", is_makeup: false, status: "held" }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("report_batch qua đồng bộ", () => {
  it("fake server trả chi tiết must_be_month cho tháng sai và client báo tiếng Việt", async () => {
    const A = await bootDevice(server, "tA", teacherMe);
    await A.syncNow();
    await A.hydrateStore();
    const reports = await import("../data/repositories/reports");
    await expect(reports.createReportBatch({ classId: "c1", month: "2020-13" })).rejects.toThrow("Chọn tháng hợp lệ theo định dạng tháng/năm.");
    const request = server.requests.find((item) => item.method === "POST" && item.path === "/classes/c1/report-batches");
    expect(request).toBeDefined();
  });

  it("xoá đợt qua REST và xoá batch, report, publication trên thiết bị khác khi pull", async () => {
    const A = await bootDevice(server, "tA", teacherMe);
    const B = await bootDevice(server, "tB", teacherMe);
    server.put("report_batch", { id: "b1", class_id: "c1", from_session_id: "x1", to_session_id: "x3", from_key: "2020-01-06 09:00", to_key: "2020-01-20 09:00" });
    server.put("report", { id: "r1", class_id: "c1", student_id: "s1", batch_id: "b1", month: "2020-01", status: "published", general_comment: "Tốt", needs_republish: false, publication_count: 1, published_at: "2020-01-21T00:00:00Z" });
    server.put("report_publication", { id: "r1-1", report_id: "r1", batch_id: "b1", class_id: "c1", student_id: "s1", month: "2020-01", publication_no: 1, published_at: "2020-01-21T00:00:00Z", snapshot: {} });

    await Promise.all([A.syncNow(), B.syncNow()]);
    await Promise.all([A.hydrateStore(), B.hydrateStore()]);
    expect(B.getStore().reportBatches.map((batch) => batch.id)).toEqual(["b1"]);
    expect(B.getStore().reports.map((report) => report.id)).toEqual(["r1"]);
    expect(B.getStore().reportPublications.map((publication) => publication.id)).toEqual(["r1-1"]);

    const reports = await import("../data/repositories/reports");
    await reports.deleteReportBatch("b1");
    expect(server.requests.some((request) => request.method === "DELETE" && request.path === "/report-batches/b1")).toBe(true);
    await B.syncNow();
    await B.hydrateStore();

    expect(B.getStore().reportBatches).toEqual([]);
    expect(B.getStore().reports).toEqual([]);
    expect(B.getStore().reportPublications).toEqual([]);
    expect(await B.db.reportBatches.count()).toBe(0);
    expect(await B.db.reports.count()).toBe(0);
    expect(await B.db.reportPublications.count()).toBe(0);
  });

  it("tạo đợt ở máy A thì máy B kéo về đợt và bản nháp có batchId, phát hành cả lớp cũng về B; phụ huynh không nhận đợt", async () => {
    const A = await bootDevice(server, "tA", teacherMe);
    const reports = await import("../data/repositories/reports");
    const B = await bootDevice(server, "tB", teacherMe);
    const P = await bootDevice(server, "tP", parentMe);
    await Promise.all([A.syncNow(), B.syncNow(), P.syncNow()]);
    await Promise.all([A.hydrateStore(), B.hydrateStore()]);

    const batch = await reports.createReportBatch({ classId: "c1", month: "2020-01" });
    expect(batch).toMatchObject({ classId: "c1", month: "2020-01", fromSessionId: null, toSessionId: null });
    expect(A.getStore().reports.filter((report) => report.batchId === batch.id).map((report) => report.studentId).sort()).toEqual(["s1", "s2"]);

    await Promise.all([B.syncNow(), P.syncNow()]);
    await Promise.all([B.hydrateStore(), P.hydrateStore()]);
    expect(B.getStore().reportBatches).toEqual([batch]);
    expect(B.getStore().reports.filter((report) => report.batchId === batch.id).map((report) => [report.studentId, report.status, report.month])).toEqual(expect.arrayContaining([["s1", "draft", "2020-01"], ["s2", "draft", "2020-01"]]));
    expect(P.getStore().reportBatches).toEqual([]);
    expect(P.getStore().reports.map((report) => report.studentId)).toEqual(["s1"]);

      expect(await reports.publishBatch(batch.id)).toEqual({ published: 2, skipped: [] });
    await B.syncNow(); await B.hydrateStore();
    expect(B.getStore().reports.filter((report) => report.batchId === batch.id).every((report) => report.status === "published")).toBe(true);
    expect(server.requests.filter((request) => /\/reports\/\d{4}-\d{2}|report-preview/.test(request.path))).toEqual([]);
  });
});

describe("nâng cấp bộ nhớ trên máy lên bản có đợt báo cáo", () => {
  it("xoá mốc đồng bộ để tải lại đủ batch_id nhưng giữ khoá đăng xuất", async () => {
    vi.resetModules();
    const factory = new IDBFactory();
    Dexie.dependencies.indexedDB = factory;
    const old = new Dexie("qlh-web");
    old.version(1).stores({
      classes: "key, identity, id", students: "key, identity, class_id, id", sessions: "key, identity, class_id, date, id", attendance: "key, identity, session_id, student_id",
      tests: "key, identity, class_id, date, id", scores: "key, identity, test_id, student_id", slips: "key, identity, session_id, student_id", homeworkSections: "key, identity, session_id, id",
      homeworkGrades: "key, identity, section_id, student_id", reports: "key, identity, class_id, student_id, month", reportPublications: "key, identity, report_id, publication_no", outbox: "id, identity, status, created_at", meta: "key, identity",
    });
    await old.open();
    await old.table("meta").bulkPut([{ key: "u:w:m", identity: "u:w:m", cursor: 9, epoch: 1 }, { key: "logout:u", identity: "logout:u", cursor: 0, epoch: 0, logoutState: "pending" }]);
    await old.table("reports").put({ key: "k", identity: "u:w:m", id: "r", class_id: "c1", student_id: "s1", month: "2020-01" });
    old.close();

    const { db } = await import("../data/db");
    await db.open();
    expect((await db.meta.toArray()).map((row) => row.key)).toEqual(["logout:u"]);
    expect(await db.reports.count()).toBe(1);
    expect(await db.reportBatches.count()).toBe(0);
    expect(await db.reports.where("batch_id").equals("none").count()).toBe(0);
  });
});
