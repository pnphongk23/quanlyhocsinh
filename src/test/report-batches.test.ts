import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, identityKey, setCacheIdentity } from "../data/db";
import { ApiError } from "../data/api/client";
import { createSeed } from "../data/seed";

vi.mock("../data/auth/session", () => ({ getToken: () => "fake-token", getSession: () => ({ user: { id: "u" }, me: { memberships: [] } }), updateMe: vi.fn(), clearSession: vi.fn(), invalidateActiveMembership: vi.fn() }));
vi.mock("../data/repositories/access", async (original) => ({ ...(await original<object>()), requirePermission: () => undefined, requireClassAccess: () => undefined, can: () => true, canAccessClass: () => true }));

const sync = vi.hoisted(() => ({ scheduleSync: vi.fn(), syncNow: vi.fn(async (): Promise<void> => undefined) }));
vi.mock("../data/sync", async (original) => ({ ...(await original<object>()), ...sync }));

const identity = { userId: "u", workspaceId: "w", membershipId: "m" };
const session = (id: string, date: string, status: string) => ({ id, classId: "c1", date, time: "18:00", origin: "recurring", status });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const batchResponse = (id: string) => ({
  batch: { id, class_id: "c1", from_session_id: "s1", to_session_id: "s3", from_key: "2026-10-01 18:00", to_key: "2026-10-08 18:00", from_number: 1, to_number: 3, counts: { total: 2, draft: 2, published: 0, needs_republish: 0 }, created_at: "2026-10-24T00:00:00Z" },
  reports: ["st1", "st2"].map((studentId, index) => ({ report_id: `r${index + 1}`, batch_id: id, student_id: studentId, student_name: studentId, month: "2026-10", status: "draft", general_comment: "", needs_republish: false, publication_count: 0, published_at: null, version: 1 })),
});

async function openStore(extra: Record<string, unknown> = {}) {
  const { replaceStore } = await import("../data/store");
  replaceStore({
    ...createSeed(),
    classes: [{ id: "c1", name: "Lớp A", status: "active", weekdays: [1, 3], time: "18:00" } as never],
    students: [], sessions: [session("s1", "2026-10-01", "held"), session("s2", "2026-10-05", "cancelled"), session("s3", "2026-10-08", "held"), session("s4", "2026-10-12", "planned")] as never,
    reportBatches: [], reports: [], currentClassId: "c1", ...extra,
  });
}

let calls: Array<{ endpoint: string; body?: any }>;
async function mockApi(handler: (endpoint: string, options: any) => unknown) {
  const { api } = await import("../data/sync");
  calls = [];
  return vi.spyOn(api, "request").mockImplementation((async (endpoint: string, options: any) => {
    calls.push({ endpoint, body: options?.body });
    return handler(endpoint, options);
  }) as never);
}

beforeEach(async () => {
  setCacheIdentity(identity); await db.delete(); await db.open();
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  await openStore();
});
afterEach(async () => {
  sync.scheduleSync.mockClear(); sync.syncNow.mockClear(); setCacheIdentity(null); await db.delete(); vi.restoreAllMocks();
});

describe("tạo đợt báo cáo theo khoảng buổi", () => {
  it("gọi POST /classes/:id/report-batches với id UUID giữ nguyên qua lần thử lại, rồi lưu đợt và bản nháp bền", async () => {
    const { createReportBatch } = await import("../data/repositories/reports");
    const { hydrateStore, getStore } = await import("../data/store");
    let attempts = 0;
    await mockApi((endpoint, options) => {
      if (++attempts === 1) throw new TypeError("network");
      expect(endpoint).toBe("POST /classes/c1/report-batches");
      return batchResponse(options.body.id);
    });
    const input = { classId: "c1", fromSessionId: "s1", toSessionId: "s3" };
    await expect(createReportBatch(input)).rejects.toThrow(/Không kết nối được máy chủ/);
    const batch = await createReportBatch(input);

    expect(calls).toHaveLength(2);
    expect(calls[0].body.id).toMatch(uuid);
    expect(calls[1].body).toEqual({ id: calls[0].body.id, from_session_id: "s1", to_session_id: "s3" });
    expect(batch).toEqual({ id: calls[0].body.id, classId: "c1", fromSessionId: "s1", toSessionId: "s3", fromKey: "2026-10-01 18:00", toKey: "2026-10-08 18:00" });
    expect(getStore().reportBatches).toEqual([batch]);
    expect(getStore().reports.map((r) => [r.id, r.batchId, r.status, r.month])).toEqual([["r1", batch.id, "draft", "2026-10"], ["r2", batch.id, "draft", "2026-10"]]);
    expect(sync.scheduleSync).toHaveBeenCalledWith(0);

    await hydrateStore();
    expect(getStore().reportBatches).toEqual([batch]);
    expect(getStore().reports.filter((r) => r.batchId === batch.id)).toHaveLength(2);
    expect(await db.reportBatches.get(`${identityKey()}|report_batch|${batch.id}`)).toMatchObject({ from_key: "2026-10-01 18:00", to_key: "2026-10-08 18:00" });
    expect(await db.reports.get(`${identityKey()}|report|r1`)).toMatchObject({ batch_id: batch.id, class_id: "c1" });
  });

  it("dùng id mới cho một khoảng khác và coi 200 (gửi lại cùng id) như thành công", async () => {
    const { createReportBatch } = await import("../data/repositories/reports");
    await mockApi((_e, options) => batchResponse(options.body.id));
    await createReportBatch({ classId: "c1", fromSessionId: "s1", toSessionId: "s3" });
    await createReportBatch({ classId: "c1", fromSessionId: "s1", toSessionId: "s4" });
    expect(calls[0].body.id).not.toBe(calls[1].body.id);
  });

  it("không gọi máy chủ khi buổi hủy hoặc ngược thứ tự, và báo lỗi 422 của máy chủ tại chỗ", async () => {
    const { createReportBatch } = await import("../data/repositories/reports");
    await mockApi(() => { throw new ApiError(422, { code: "session_cancelled", message: "x", request_id: "r" }); });
    await expect(createReportBatch({ classId: "c1", fromSessionId: "s2", toSessionId: "s3" })).rejects.toThrow("Không chọn buổi đã hủy.");
    await expect(createReportBatch({ classId: "c1", fromSessionId: "s3", toSessionId: "s1" })).rejects.toThrow("Buổi bắt đầu phải trước hoặc cùng buổi kết thúc.");
    expect(calls).toHaveLength(0);
    // Máy chủ thấy buổi đã hủy ở nơi khác: lỗi 422 hiện bằng tiếng Việt.
    await expect(createReportBatch({ classId: "c1", fromSessionId: "s1", toSessionId: "s3" })).rejects.toThrow("Không chọn buổi đã hủy.");
    expect(calls).toHaveLength(1);
  });

  it("offline thì báo cần mạng và không gọi máy chủ", async () => {
    const { createReportBatch } = await import("../data/repositories/reports");
    await mockApi(() => undefined);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await expect(createReportBatch({ classId: "c1", fromSessionId: "s1", toSessionId: "s3" })).rejects.toThrow("Thêm báo cáo cần kết nối mạng.");
    expect(calls).toHaveLength(0);
  });
});

describe("nhận xét, xem trước và phát hành theo đợt", () => {
  const draft = (id: string, studentId: string, patch: object = {}) => ({ id, classId: "c1", studentId, batchId: "b1", month: "2026-10", status: "draft", needsRepublish: false, generalComment: "", publishedAt: null, ...patch });
  const withBatch = (reports: object[], reportPublications: object[] = []) => openStore({
    students: [{ id: "st1", classId: "c1", name: "An", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" }, { id: "st2", classId: "c1", name: "Bình", parentPhone: "", enrolledAt: "2026-09-01", leftAt: null, status: "active" }],
    reportBatches: [{ id: "b1", classId: "c1", fromSessionId: "s1", toSessionId: "s3", fromKey: "2026-10-01 18:00", toKey: "2026-10-08 18:00" }],
    reports,
    reportPublications,
  });

  it("lưu nhận xét bằng PUT /reports/:id và nhận cờ phát hành lại của máy chủ", async () => {
    await withBatch([draft("r1", "st1", { status: "published", publishedAt: "2026-10-12T00:00:00Z" })]);
    const { saveReportComment } = await import("../data/repositories/reports");
    const { getStore, hydrateStore } = await import("../data/store");
    await mockApi((_e, options) => ({ id: "r1", batch_id: "b1", student_id: "st1", month: "2026-10", status: "published", general_comment: options.body.general_comment, needs_republish: true, version: 5 }));
    const saved = await saveReportComment("r1", "  Con tiến bộ.  ");
    expect(calls).toEqual([{ endpoint: "PUT /reports/r1", body: { general_comment: "Con tiến bộ." } }]);
    expect(saved).toMatchObject({ generalComment: "Con tiến bộ.", needsRepublish: true });
    expect(getStore().reports[0]).toMatchObject({ generalComment: "Con tiến bộ.", needsRepublish: true });
    await hydrateStore();
    expect(getStore().reports.find((r) => r.id === "r1")).toMatchObject({ generalComment: "Con tiến bộ.", needsRepublish: true, batchId: "b1" });
  });

  it("phát hành một em bằng POST /reports/:id/publish", async () => {
    await withBatch([draft("r1", "st1")]);
    const { publishReport } = await import("../data/repositories/reports");
    const { getStore, hydrateStore } = await import("../data/store");
    await mockApi(() => ({ report_id: "r1", batch_id: "b1", publication_no: 1, published_at: "2026-10-25T01:00:00Z", snapshot: {} }));
    await publishReport("r1");
    expect(calls.map((c) => c.endpoint)).toEqual(["POST /reports/r1/publish"]);
    expect(getStore().reports[0]).toMatchObject({ status: "published", needsRepublish: false, publishedAt: "2026-10-25T01:00:00Z" });
    await hydrateStore();
    expect(getStore().reports[0]).toMatchObject({ status: "published", publishedAt: "2026-10-25T01:00:00Z" });
  });

  it("phát hành cả lớp bằng một lần POST /report-batches/:id/publish", async () => {
    await withBatch([draft("r1", "st1"), draft("r2", "st2", { status: "published", needsRepublish: true, publishedAt: "2026-10-12T00:00:00Z" })]);
    const { publishBatch } = await import("../data/repositories/reports");
    const { getStore } = await import("../data/store");
    await mockApi(() => ({ published: [{ report_id: "r1", publication_no: 1 }, { report_id: "r2", publication_no: 2 }], published_at: "2026-10-25T01:00:00Z" }));
    expect(await publishBatch("b1")).toEqual({ published: 2, skipped: [] });
    expect(calls).toEqual([{ endpoint: "POST /report-batches/b1/publish", body: undefined }]);
    expect(getStore().reports.map((r) => [r.status, r.needsRepublish, r.publishedAt])).toEqual([["published", false, "2026-10-25T01:00:00Z"], ["published", false, "2026-10-25T01:00:00Z"]]);
    expect(await db.reports.get(`${identityKey()}|report|r2`)).toMatchObject({ publication_count: 2, needs_republish: false });
  });

    it("shows missing data for a refused publish and leaves the report unchanged", async () => {
      await withBatch([draft("r1", "st1")]);
      const { getStore } = await import("../data/store");
      const { publishReport } = await import("../data/repositories/reports");
      await mockApi(() => {
        throw new ApiError(409, {
          code: "conflict", message: "Report is not ready.",
          details: { reason: "report_not_ready", missing: ["attendance", "scores", "comment"] },
          request_id: "r",
        });
      });
      await expect(publishReport("r1")).rejects.toThrow("Báo cáo còn thiếu dữ liệu: thiếu điểm danh, điểm, nhận xét chung.");
      expect(getStore().reports[0]).toMatchObject({ status: "draft", needsRepublish: false, publishedAt: null });
    });

    it("returns skipped reports with missing-data reasons without marking them published", async () => {
      await withBatch([draft("r1", "st1"), draft("r2", "st2")]);
      const { getStore } = await import("../data/store");
      const { publishBatch } = await import("../data/repositories/reports");
      await mockApi(() => ({
        published: [{ report_id: "r1", publication_no: 1 }],
        skipped: [{ report_id: "r2", missing: ["attendance", "scores"] }],
        published_at: "2026-10-25T01:00:00Z",
      }));
      const result = await publishBatch("b1");
      expect(result).toEqual({ published: 1, skipped: [{ reportId: "r2", missing: ["attendance", "scores"] }] });
      expect(getStore().reports.map((report) => report.status)).toEqual(["published", "draft"]);
    });

  it("offline thì lưu, phát hành và xem trước báo cần mạng, không gọi máy chủ", async () => {
    await withBatch([draft("r1", "st1")]);
    const reports = await import("../data/repositories/reports");
    await mockApi(() => undefined);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await expect(reports.saveReportComment("r1", "x")).rejects.toThrow("Lưu nhận xét cần kết nối mạng.");
    await expect(reports.publishReport("r1")).rejects.toThrow("Phát hành báo cáo cần kết nối mạng.");
    await expect(reports.publishBatch("b1")).rejects.toThrow("Phát hành báo cáo cần kết nối mạng.");
    await expect(reports.previewReport("r1")).rejects.toThrow("Xem trước báo cáo cần kết nối mạng.");
    expect(calls).toHaveLength(0);
  });

  it("xem trước đọc GET /reports/:id/preview, giải mã khoảng buổi và báo lỗi bằng tiếng Việt", async () => {
    await withBatch([draft("r1", "st1")]);
    const { previewReport } = await import("../data/repositories/reports");
    const body = { report_id: "r1", batch_id: "b1", student_id: "st1", month: "2026-10", range: { from_key: "2026-10-01 18:00", to_key: "2026-10-24 18:00", from_number: 1, to_number: 8, session_count: 8, label: "01/10–24/10" }, attendance: { present: 6, late: 1, excused: 0, absent: 1, held_sessions: 8 }, tests: [{ test_id: "t1", name: "Từ vựng", date: "2026-10-05", max: 10, value: 8 }], stars: { three: 2, two: 1, one: 0 }, homework: [{ kind: "vocabulary", excellent: 1, done: 0, not_done: 1 }], general_comment: "Tốt", ready: true };
    await mockApi(() => body);
    const preview = await previewReport("r1");
    expect(calls[0].endpoint).toBe("GET /reports/r1/preview");
    expect(preview.range.label).toBe("01/10–24/10");
    expect(preview.report).toMatchObject({ attendanceCount: 7, lateCount: 1, absentCount: 1, gradedTestCount: 1, generalComment: "Tốt", stars: { ticketCount: 3 } });

    await mockApi(() => ({ ...body, attendance: { present: "x" } }));
    await expect(previewReport("r1")).rejects.toThrow("Bản xem trước không đọc được");
    await mockApi(() => { throw new ApiError(500, { code: "internal", message: "boom", request_id: "r" }); });
    await expect(previewReport("r1")).rejects.toThrow("Không tải được bản xem trước.");
  });

  it("không bao giờ gọi endpoint theo tháng đã ngừng (410)", async () => {
    await withBatch([draft("r1", "st1")]);
    const reports = await import("../data/repositories/reports");
    await mockApi((endpoint) => (endpoint.startsWith("POST /reports/") ? { publication_no: 1, published_at: "2026-10-25T01:00:00Z" } : endpoint.startsWith("PUT") ? { general_comment: "x", version: 2 } : undefined));
    await reports.saveReportComment("r1", "x");
    await reports.publishReport("r1");
    expect(calls.map((c) => c.endpoint).filter((e) => /\/reports\/\d{4}-\d{2}/.test(e) || /report-preview/.test(e))).toEqual([]);
  });

  it("xoá đợt bằng DELETE trực tiếp rồi gỡ batch, reports và publications khỏi cache", async () => {
    const publications = [{ id: "r2-1", report_id: "r2", batch_id: "b1", class_id: "c1", student_id: "st2", month: "2026-10", publication_no: 1, published_at: "2026-10-12T00:00:00Z", snapshot: {} }];
    await withBatch([draft("r1", "st1"), draft("r2", "st2", { status: "published" })], publications);
    const identity = identityKey();
    await db.reportBatches.put({ key: `${identity}|report_batch|b1`, identity, entity: "report_batch", id: "b1", class_id: "c1", from_session_id: "s1", to_session_id: "s3", from_key: "2026-10-01 18:00", to_key: "2026-10-08 18:00" } as never);
    await db.reports.bulkPut(["r1", "r2"].map((id) => ({ key: `${identity}|report|${id}`, identity, entity: "report", id, class_id: "c1", student_id: id === "r1" ? "st1" : "st2", batch_id: "b1", month: "2026-10" }) as never));
    await db.reportPublications.put({ key: `${identity}|report_publication|r2-1`, identity, entity: "report_publication", ...publications[0] } as never);
    const { deleteReportBatch } = await import("../data/repositories/reports");
    const { getStore } = await import("../data/store");
    await mockApi((endpoint) => { expect(endpoint).toBe("DELETE /report-batches/b1"); return { id: "b1", deleted: true }; });

    await deleteReportBatch("b1");

    expect(calls).toEqual([{ endpoint: "DELETE /report-batches/b1", body: undefined }]);
    expect(getStore().reportBatches).toEqual([]);
    expect(getStore().reports).toEqual([]);
    expect(getStore().reportPublications).toEqual([]);
    expect(await db.reportBatches.count()).toBe(0);
    expect(await db.reports.count()).toBe(0);
    expect(await db.reportPublications.count()).toBe(0);
  });

  it("coi 404 là đã xoá và gỡ dữ liệu cục bộ", async () => {
    await withBatch([draft("r1", "st1")]);
    const identity = identityKey();
    await db.reportBatches.put({ key: `${identity}|report_batch|b1`, identity, entity: "report_batch", id: "b1", class_id: "c1", from_session_id: "s1", to_session_id: "s3", from_key: "2026-10-01 18:00", to_key: "2026-10-08 18:00" } as never);
    const { deleteReportBatch } = await import("../data/repositories/reports");
    const { getStore } = await import("../data/store");
    await mockApi(() => { throw new ApiError(404, { code: "not_found", message: "gone", request_id: "r" }); });

    await expect(deleteReportBatch("b1")).resolves.toBeUndefined();

    expect(getStore().reportBatches).toEqual([]);
    expect(await db.reportBatches.count()).toBe(0);
  });

  it("offline thì khoá việc xoá và không gọi máy chủ", async () => {
    await withBatch([draft("r1", "st1")]);
    const { deleteReportBatch } = await import("../data/repositories/reports");
    await mockApi(() => undefined);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });

    await expect(deleteReportBatch("b1")).rejects.toThrow("Xoá báo cáo cần kết nối mạng.");

    expect(calls).toHaveLength(0);
  });
});
