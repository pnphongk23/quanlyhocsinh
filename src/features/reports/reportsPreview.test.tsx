import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { MEMBER_IDS, ROLE_IDS } from "../../data/defaults";
import { createSeed } from "../../test/fixtures/seed";
import { getStore, replaceStore } from "../../data/store";
import { ApiError } from "../../data/api/client";
import { db, setCacheIdentity } from "../../data/db";
import type { StoreState } from "../../data/types";
import { buildRangeStudentReport } from "../../data/reportModel";
import { resolveRange } from "../../data/reportRange";
import ReportPreview from "./ReportPreview";
import ReportsPage from "./ReportsPage";

vi.mock("../../data/repositories/access", async (original) => {
  const actual = await original<typeof import("../../data/repositories/access")>();
  return { ...actual, requirePermission: () => undefined, requireClassAccess: () => undefined };
});
const sync = vi.hoisted(() => ({ scheduleSync: vi.fn(), syncNow: vi.fn(async (): Promise<void> => undefined) }));
vi.mock("../../data/sync", async (original) => ({ ...(await original<object>()), ...sync }));

/** Bỏ các comment phân cách React chèn giữa hai text node khi render tĩnh. */
const text = (html: string) => html.replace(/<!-- -->/g, "");

function renderStatic(path = "/lop/6a/bao-cao"): string {
  const router = createMemoryRouter([{ path: "/lop/:classId/bao-cao", element: <ReportsPage /> }], { initialEntries: [path] });
  return text(renderToStaticMarkup(<RouterProvider router={router} />));
}

function renderLive(path = "/lop/6a/bao-cao") {
  function Where() {
    const location = useLocation();
    return <output data-testid="where">{location.pathname + location.search}</output>;
  }
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/bao-cao", element: <><ReportsPage /><Where /></> }],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

let calls: Array<{ endpoint: string; body?: any }>;
async function mockApi(handler: (endpoint: string, options?: { body?: any }) => unknown) {
  const { api } = await import("../../data/sync");
  calls = [];
  return vi.spyOn(api, "request").mockImplementation((async (endpoint: string, options?: { body?: any }) => {
    calls.push({ endpoint, body: options?.body });
    return handler(endpoint, options);
  }) as never);
}

function desktop(on: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (media: string) => ({ matches: on && media.includes("min-width: 1024px"), media, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }),
  });
}

const nativeShowModal = HTMLDialogElement.prototype.showModal;
const nativeClose = HTMLDialogElement.prototype.close;
beforeEach(async () => {
  setCacheIdentity({ userId: "u", workspaceId: "w", membershipId: "m" });
  await db.delete(); await db.open();
  desktop(false);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
  replaceStore(createSeed());
});
afterEach(async () => {
  sync.scheduleSync.mockClear(); sync.syncNow.mockClear(); setCacheIdentity(null); await db.delete(); vi.restoreAllMocks();
  if (nativeShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: nativeShowModal });
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (nativeClose) Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: nativeClose });
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

const previewBody = (studentId: string, patch: object = {}) => ({
  report_id: "r", batch_id: "6a-batch", student_id: studentId, month: "2026-10",
    range: { from_key: "2026-09-21 18:00", to_key: "2026-10-14 18:00", from_number: 1, to_number: 8, session_count: 8, label: "21/09–14/10" },
  attendance: { present: 6, late: 1, excused: 1, absent: 0, held_sessions: 8 },
  tests: [{ test_id: "t1", name: "Từ vựng", date: "2026-09-30", max: 10, value: 8 }, { test_id: "t2", name: "Nói", date: "2026-10-12", max: 10, value: null }],
    stars: { three: 2, two: 1, one: 1 }, stars5: { s5: 2, s4: 1, s3: 0, s2: 1, s1: 0, s0: 0 }, homework: [{ kind: "vocabulary", excellent: 1, done: 2, not_done: 0 }],
  general_comment: "Con tiến bộ rõ.", ready: true, ...patch,
});

/** Mọi em đủ dữ liệu: có nhận xét chung và đủ điểm. */
function completeState(): StoreState {
  const state = createSeed();
  state.scores = state.scores.map((score) => ({ ...score, value: score.value ?? 7 }));
  state.reports = state.reports.map((report) => ({ ...report, generalComment: report.generalComment || "Nhận xét." }));
  return state;
}

describe("nội dung xem trước báo cáo theo khoảng (ảnh 07)", () => {
  it("có khối sao, bảng BTVN theo phần, điểm từng bài, nhận xét chung và nhãn khoảng buổi để in", () => {
    const state = createSeed();
    state.comments[0] = { ...state.comments[0], criteria: 31, comment: null, scale: 5, stars: 5 };
    const student = state.students.find((item) => item.id === "6a-student-1")!;
    const range = resolveRange(state.sessions, state.reportBatches.find((item) => item.id === "6a-batch")!);
    const report = buildRangeStudentReport(student, range, { ...state, generalComment: "Nhận xét kiểm thử tổng hợp." })!;
    const html = text(renderToStaticMarkup(<ReportPreview report={report} range={range} className="Tiếng Anh giao tiếp 6A" />));

      expect(html).toContain("<h2>Báo cáo</h2>");
      expect(html).toContain("Buổi 1–8 · 21/09–14/10 · Trần Gia Bảo · Tiếng Anh giao tiếp 6A");
    expect(html).toContain("Chuyên cần");
    expect(html).toContain("Bài kiểm tra");
    expect(html).not.toContain("trung bình");
      expect(html).toContain("Nhận xét theo sao");
      expect(html).toContain("Tính trên các phiếu đã gửi.");
      expect(html).toContain("Thang 5 sao");
      expect(html).toContain("Phiếu cũ · thang 3 sao");
    expect(html).toContain('aria-label="3 sao"');
    expect(html).toContain("Bài tập về nhà");
    expect(html).toContain("Luyện từ vựng");
    expect(html).toContain("Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.");
    expect(html).toContain("Điểm từng bài");
      expect(html).toContain(">8<");
      expect(html).not.toMatch(/<strong>[^<]*\/10<\/strong>/);
    expect(html).not.toContain("10.0");
    expect(html).toContain("Bài chưa có điểm cần chấm trước khi phát hành.");
    expect(html).toContain("Nhận xét kiểm thử tổng hợp.");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain("tháng này");
  });

  it("bài chưa có điểm hiện Chưa có điểm, không có Vắng thi", () => {
    const state = createSeed();
    const student = state.students.find((item) => item.id === "6a-student-3")!;
    const range = resolveRange(state.sessions, state.reportBatches[0]);
    const report = buildRangeStudentReport(student, range, { ...state, generalComment: "" })!;
    const html = text(renderToStaticMarkup(<ReportPreview report={report} range={range} className="Lớp" />));
    expect(html).toContain("Chưa có điểm");
    expect(html).not.toMatch(/vắng thi/i);
  });

  it("đợt không có số buổi: tiêu đề chỉ có ngày", () => {
    const state = createSeed();
    const student = state.students.find((item) => item.id === "6a-student-1")!;
    const range = resolveRange(state.sessions, { ...state.reportBatches[0], fromSessionId: null, toSessionId: null });
    const report = buildRangeStudentReport(student, range, { ...state, generalComment: "x" })!;
    const html = text(renderToStaticMarkup(<ReportPreview report={report} range={range} className="Lớp" />));
    expect(html).toContain("<h2>Báo cáo</h2>");
    expect(html).toContain("21/09–14/10 · Trần Gia Bảo");
  });
});

describe("danh sách đợt báo cáo", () => {
  it("mỗi đợt ghi khoảng ngày kèm đếm đã phát hành / nháp / cần phát hành lại", () => {
    const state = createSeed();
    state.reports = state.reports.map((report) => (report.id === "6a-student-1-report" ? { ...report, needsRepublish: true } : report));
    replaceStore(state);
    const html = renderStatic();
      expect(html).toContain("Buổi 1–8 · 21/09–14/10");
    expect(html).toContain('href="/lop/6a/bao-cao?dot=6a-batch"');
    expect(html).toContain("<b>1</b> đã phát hành");
    expect(html).toContain("<b>8</b> nháp");
    expect(html).toMatch(/<b[^>]*>1<\/b> cần phát hành lại/);
    expect(html).toContain("Thêm báo cáo");
    expect(html).not.toContain("Chọn tháng");
    expect(html).not.toContain("Tháng trước");
    expect(html).not.toContain("3 tháng");
  });

    it("đợt cũ theo buổi giữ số buổi cạnh khoảng ngày", () => {
    const state = createSeed();
    state.reportBatches = [{ id: "old", classId: "6a", fromSessionId: null, toSessionId: null, fromKey: "2026-09-01 00:00", toKey: "2026-09-31 23:59" }];
    state.reports = state.reports.map((report) => ({ ...report, batchId: "old" }));
    replaceStore(state);
    const html = renderStatic();
      expect(html).toContain("01/09–31/09");
      expect(html).not.toMatch(/Buổi\s+\d/);
  });

  it("chưa có đợt nào thì vẫn có thể thêm báo cáo theo tháng", () => {
    const state = createSeed();
    state.reportBatches = []; state.reports = [];
    replaceStore(state);
    expect(renderStatic()).toContain("Chưa có báo cáo nào");
      expect(renderStatic()).toContain("Thêm báo cáo theo tháng để tạo nháp cho cả lớp.");

    state.sessions = state.sessions.map((session) => (session.classId === "6a" ? { ...session, status: "planned" } : session));
    replaceStore(state);
    const html = renderStatic();
      expect(html).toContain("Thêm báo cáo");
  });

  it("vai chỉ xem không có nút thêm báo cáo", () => {
    const state = createSeed();
    state.activeMemberId = MEMBER_IDS.lanTeacher;
    state.roles.find((role) => role.id === ROLE_IDS.teacher)!.permissions.comments_reports = "read";
    replaceStore(state);
    const html = renderStatic();
      expect(html).toContain("21/09–14/10");
    expect(html).not.toContain("Thêm báo cáo");
  });

  it("vai không có nhóm Nhận xét và báo cáo không xem được màn", () => {
    const state = createSeed();
    state.auth?.memberIds.push(MEMBER_IDS.trang);
    state.activeMemberId = MEMBER_IDS.trang;
    state.members.find((member) => member.id === MEMBER_IDS.trang)!.classIds = ["6a"];
    replaceStore(state);
    expect(renderStatic()).toContain("Bạn không có quyền xem báo cáo");
  });

  it("offline báo ngay trên danh sách", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    renderLive();
    expect(await screen.findByText("Đang offline. Thêm và phát hành báo cáo cần kết nối mạng.")).toBeVisible();
  });
});

describe("thêm báo cáo theo khoảng buổi", () => {
    it("mặc định tháng hiện tại", async () => {
    renderLive();
    fireEvent.click(screen.getByRole("button", { name: "Thêm báo cáo" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm báo cáo" });
      expect(within(dialog).getByLabelText("Tháng báo cáo")).toHaveValue("2026-10");
  });

  it("tạo đợt gọi POST với id ổn định qua thử lại, rồi mở chi tiết đợt vừa tạo", async () => {
    let attempts = 0;
    await mockApi((_endpoint, options) => {
      if (++attempts === 1) throw new TypeError("network");
        const reports = getStore().students.filter((student) => student.classId === "6a" && !student.leftAt).map((student, index) => ({ report_id: `new-${index}`, batch_id: options!.body.id, student_id: student.id, month: options!.body.month, status: "draft", general_comment: "", needs_republish: false, publication_count: 0, published_at: null, version: 1 }));
        return { batch: { id: options!.body.id, class_id: "6a", from_session_id: null, to_session_id: null, from_key: `${options!.body.month}-01 00:00`, to_key: `${options!.body.month}-31 23:59`, month: options!.body.month, from_number: null, to_number: null, counts: {}, created_at: "" }, reports };
    });
    renderLive();
    fireEvent.click(screen.getByRole("button", { name: "Thêm báo cáo" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm báo cáo" });
    const submit = within(dialog).getByRole("button", { name: "Tạo báo cáo" });
    fireEvent.click(submit);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Không kết nối được máy chủ");
    // Nút giữ trạng thái đang lưu tối thiểu một lúc rồi mới bấm lại được.
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Tạo báo cáo" })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: "Tạo báo cáo" }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toMatch(/\?dot=[0-9a-f-]{36}$/));
    expect(calls).toHaveLength(2);
    expect(calls[0].endpoint).toBe("POST /classes/6a/report-batches");
    expect(calls[1].body).toEqual(calls[0].body);
      expect(calls[0].body).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), month: "2026-10" });
    expect(screen.getByTestId("where").textContent).toContain(calls[0].body.id);
    expect(getStore().reportBatches.map((batch) => batch.id)).toContain(calls[0].body.id);
  });

  it("lỗi 422 của máy chủ hiện ngay trong hộp thoại", async () => {
      await mockApi(() => { throw new ApiError(422, { code: "invalid_month", message: "x", details: { fields: { month: "must_be_month" } }, request_id: "r" }); });
    renderLive();
    fireEvent.click(screen.getByRole("button", { name: "Thêm báo cáo" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm báo cáo" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tạo báo cáo" }));
      expect(await within(dialog).findByRole("alert")).toHaveTextContent("Chọn tháng hợp lệ theo định dạng tháng/năm.");
  });

    it("chặn tháng sai định dạng trước khi gọi máy chủ", async () => {
    await mockApi(() => undefined);
    renderLive();
    fireEvent.click(screen.getByRole("button", { name: "Thêm báo cáo" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm báo cáo" });
      fireEvent.change(within(dialog).getByLabelText("Tháng báo cáo"), { target: { value: "2026-13" } });
    expect(within(dialog).getByRole("button", { name: "Tạo báo cáo" })).toBeDisabled();
    expect(calls).toHaveLength(0);
  });

  it("offline báo cần mạng trong hộp thoại", async () => {
    await mockApi(() => undefined);
    renderLive();
    fireEvent.click(screen.getByRole("button", { name: "Thêm báo cáo" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm báo cáo" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tạo báo cáo" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Thêm báo cáo cần kết nối mạng.");
    expect(calls).toHaveLength(0);
  });
});

describe("chi tiết một đợt", () => {
  const open = () => renderLive("/lop/6a/bao-cao?dot=6a-batch");

  it("liệt kê học sinh của đợt với tình trạng sẵn sàng / thiếu dữ liệu / đã phát hành", () => {
    const html = renderStatic("/lop/6a/bao-cao?dot=6a-batch");
      expect(html).toContain("21/09–14/10");
    expect(html).toContain("Tất cả báo cáo");
    expect(html).toContain("sẵn sàng");
    expect(html).toContain("thiếu dữ liệu");
    expect(html).toContain("Thiếu nhận xét chung");
    expect(html).toContain("Đã phát hành · 12/10");
    expect(html).toContain("Nhận xét chung của đợt");
    expect(html).not.toContain("Nhận xét chung của tháng");
    expect(html).not.toMatch(/vắng thi/i);
  });

  it("gợi ý nhận xét theo số buổi sao của đợt", () => {
    const state = createSeed();
    const index = state.students.findIndex((item) => item.id === "6a-student-1");
    const [target] = state.students.splice(index, 1);
    state.students.unshift(target);
    replaceStore(state);
    const html = renderStatic("/lop/6a/bao-cao?dot=6a-batch");
    expect(html).toContain("Dùng gợi ý làm bản nháp");
    expect(html).toContain("Gợi ý theo số buổi 3/2/1 sao của đợt: Trong đợt này con có 2 buổi 3 sao, 1 buổi 2 sao, 1 buổi 1 sao.");
  });

  it("không tính sao hoặc BTVN gắn với buổi đã hủy", () => {
    const state = createSeed();
    const student = state.students.find((item) => item.id === "6a-student-1")!;
    const batch = state.reportBatches.find((item) => item.id === "6a-batch")!;
    const cancelled = state.sessions.find((item) => item.id === "6a-extra-cancelled")!;
    cancelled.date = "2026-10-13";
    const build = () => buildRangeStudentReport(student, resolveRange(state.sessions, batch), {
      ...state,
      generalComment: "Nhận xét kiểm thử.",
    })!;
    const baseline = build();
    state.comments.push({ ...state.comments.find((item) => item.studentId === student.id)!, id: "cancelled-comment", sessionId: cancelled.id, stars: 3 });
    state.homeworkSections.push({ id: "cancelled-homework", sessionId: cancelled.id, kind: "vocabulary", title: "Bài bị hủy", description: "" });
    state.homeworkGrades.push({ sectionId: "cancelled-homework", studentId: student.id, level: "done" });

    const result = build();
    expect(result.stars).toEqual(baseline.stars);
    expect(result.homework).toEqual(baseline.homework);
  });

  it("chỉ vai có quyền Sửa mới thấy nút phát hành và nút dùng gợi ý", () => {
    const state = createSeed();
    state.activeMemberId = MEMBER_IDS.lanTeacher;
    state.roles.find((role) => role.id === ROLE_IDS.teacher)!.permissions.comments_reports = "read";
    replaceStore(state);
    const html = renderStatic("/lop/6a/bao-cao?dot=6a-batch");
    expect(html).toContain("Nhận xét chung của đợt");
    expect(html).not.toContain("Dùng gợi ý làm bản nháp");
    expect(html).not.toContain("Phát hành báo cáo");
  });

  it("đợt không thuộc lớp thì quay về danh sách", () => {
    expect(renderStatic("/lop/ielts/bao-cao?dot=6a-batch")).not.toContain("Tất cả báo cáo");
  });

  it("lưu nhận xét chung khi rời ô, gọi PUT /reports/:id", async () => {
    await mockApi((_endpoint, options) => ({ id: "6a-student-0-report", general_comment: options!.body.general_comment, needs_republish: false, version: 3 }));
    open();
    fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Minh Anh/ }));
    const box = await screen.findByLabelText("Nhận xét chung của đợt");
    fireEvent.change(box, { target: { value: "Con chăm chỉ." } });
    fireEvent.blur(box);
    await waitFor(() => expect(calls).toEqual([{ endpoint: "PUT /reports/6a-student-0-report", body: { general_comment: "Con chăm chỉ." } }]));
    await waitFor(() => expect(getStore().reports.find((report) => report.id === "6a-student-0-report")?.generalComment).toBe("Con chăm chỉ."));
  });

  it("lưu nhận xét lỗi (offline) hiện lỗi tại chỗ", async () => {
    await mockApi(() => undefined);
    open();
    fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Minh Anh/ }));
    const box = await screen.findByLabelText("Nhận xét chung của đợt");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    fireEvent.change(box, { target: { value: "Ghi chú." } });
    fireEvent.blur(box);
    expect(await screen.findByText("Lưu nhận xét cần kết nối mạng.")).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  it("lưu thất bại khi rời màn giữ nguyên nội dung và không điều hướng", async () => {
    await mockApi(() => {
      throw new ApiError(503, { code: "unavailable", message: "Không thể lưu lúc này.", request_id: "r" });
    });
    open();
    fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Minh Anh/ }));
    const box = await screen.findByLabelText("Nhận xét chung của đợt");
    fireEvent.change(box, { target: { value: "Nhận xét cần giữ lại." } });
    fireEvent.click(screen.getByRole("link", { name: "Tất cả báo cáo" }));
    const dialog = await screen.findByRole("dialog", { name: "Nhận xét chung chưa lưu" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByTestId("where")).toHaveTextContent("/lop/6a/bao-cao?dot=6a-batch");
    expect(screen.getByLabelText("Nhận xét chung của đợt")).toHaveValue("Nhận xét cần giữ lại.");
    expect(dialog).toBeInTheDocument();
  });
});

describe("xem trước trong popup", () => {
  const openPreview = async (path = "/lop/6a/bao-cao?dot=6a-batch") => {
    renderLive(path);
    fireEvent.click(await screen.findByRole("button", { name: /Trần Gia Bảo/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem trước" }));
      return screen.findByRole("dialog", { name: "Báo cáo" });
  };

  it("mobile: mở thành sheet toàn màn, tải bản của máy chủ và không nối bên dưới danh sách", async () => {
    await mockApi((endpoint) => (endpoint === "GET /reports/6a-student-1-report/preview" ? previewBody("6a-student-1") : undefined));
    const dialog = await openPreview();
    // Chờ nội dung từ máy chủ rồi xác nhận tiêu đề của bản in.
    expect(await within(dialog).findByText("Con tiến bộ rõ.")).toBeVisible();
      expect(await within(dialog).findAllByText("Buổi 1–8 · 21/09–14/10 · Trần Gia Bảo · Tiếng Anh giao tiếp 6A")).toHaveLength(1);
    expect(calls.map((call) => call.endpoint)).toEqual(["GET /reports/6a-student-1-report/preview"]);
    expect(within(dialog).getByText("Điểm từng bài")).toBeVisible();
    expect(within(dialog).getByText("Chưa có điểm")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "In báo cáo" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Phát hành lại" })).toBeDisabled();
    expect(document.querySelectorAll("article[aria-label='Bản xem trước báo cáo']")).toHaveLength(1);
    expect(dialog.closest("main")).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Đóng" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Báo cáo" })).toBeNull());
  });

  it("desktop: mở thành dialog trong trang chi tiết đợt", async () => {
    desktop(true);
    await mockApi(() => previewBody("6a-student-1"));
    renderLive("/lop/6a/bao-cao?dot=6a-batch");
    fireEvent.click(await screen.findByRole("button", { name: /Trần Gia Bảo/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem trước" }));
      const dialog = await screen.findByRole("dialog", { name: "Báo cáo" });
    expect(await within(dialog).findByText("Con tiến bộ rõ.")).toBeVisible();
    expect(screen.getByText(/Sẵn sàng/)).toBeInTheDocument();
  });

  it("máy chủ lỗi hiện thông báo kèm nút Thử lại", async () => {
    let fail = true;
    await mockApi(() => {
      if (fail) throw new ApiError(500, { code: "internal", message: "x", request_id: "r" });
      return previewBody("6a-student-1");
    });
    const dialog = await openPreview();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Không tải được bản xem trước.");
    expect(within(dialog).getByRole("button", { name: "In báo cáo" })).toBeDisabled();
    fail = false;
    fireEvent.click(within(dialog).getByRole("button", { name: "Thử lại" }));
    expect(await within(dialog).findByText("Con tiến bộ rõ.")).toBeVisible();
  });

  it("offline hiện cần mạng ngay trong popup, không gọi máy chủ", async () => {
    await mockApi(() => previewBody("6a-student-1"));
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    const dialog = await openPreview();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Xem trước báo cáo cần kết nối mạng.");
    expect(calls).toHaveLength(0);
  });

  it("phát hành từ popup gọi POST /reports/:id/publish rồi đóng popup", async () => {
    replaceStore(completeState());
    await mockApi((endpoint) => (endpoint.endsWith("/preview") ? previewBody("6a-student-2") : { report_id: "6a-student-2-report", batch_id: "6a-batch", publication_no: 1, published_at: "2026-10-25T01:00:00Z", snapshot: {} }));
    renderLive("/lop/6a/bao-cao?dot=6a-batch");
    fireEvent.click(await screen.findByRole("button", { name: /Lê Khánh Chi/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem trước" }));
      const dialog = await screen.findByRole("dialog", { name: "Báo cáo" });
    await within(dialog).findByText("Con tiến bộ rõ.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Phát hành" }));
    await waitFor(() => expect(calls.map((call) => call.endpoint)).toContain("POST /reports/6a-student-2-report/publish"));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Báo cáo" })).toBeNull());
    expect(await screen.findByText("Đã phát hành báo cáo.")).toBeVisible();
    expect(getStore().reports.find((report) => report.id === "6a-student-2-report")?.status).toBe("published");
  });

  it("phát hành lỗi hiện ngay trong popup", async () => {
    replaceStore(completeState());
    await mockApi((endpoint) => {
      if (endpoint.endsWith("/preview")) return previewBody("6a-student-2");
      throw new ApiError(409, { code: "conflict", message: "x", request_id: "r" });
    });
    renderLive("/lop/6a/bao-cao?dot=6a-batch");
    fireEvent.click(await screen.findByRole("button", { name: /Lê Khánh Chi/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem trước" }));
      const dialog = await screen.findByRole("dialog", { name: "Báo cáo" });
    await within(dialog).findByText("Con tiến bộ rõ.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Phát hành" }));
    expect(await within(dialog).findByText("Báo cáo vừa được phát hành ở nơi khác. Tải lại rồi thử lại.")).toBeVisible();
      expect(screen.getByRole("dialog", { name: "Báo cáo" })).toBeVisible();
  });
});

describe("phát hành cả lớp", () => {
  it("khi mọi em đủ dữ liệu: một lần POST /report-batches/:id/publish", async () => {
    replaceStore(completeState());
    await mockApi(() => ({
      published: getStore().reports.filter((report) => report.batchId === "6a-batch" && report.status === "draft").map((report, index) => ({ report_id: report.id, publication_no: index + 1 })),
      published_at: "2026-10-25T01:00:00Z",
    }));
    renderLive("/lop/6a/bao-cao?dot=6a-batch");
    fireEvent.click(await screen.findByRole("button", { name: "Phát hành 8 báo cáo" }));
    expect(await screen.findByText("Đã phát hành 8 báo cáo.")).toBeVisible();
    expect(calls).toEqual([{ endpoint: "POST /report-batches/6a-batch/publish", body: undefined }]);
    expect(getStore().reports.filter((report) => report.batchId === "6a-batch").every((report) => report.status === "published")).toBe(true);
    await waitFor(() => expect(screen.getByRole("button", { name: "Phát hành báo cáo" })).toBeDisabled());
  });

    it("phát hành cả đợt và nêu tên cùng lý do của các báo cáo bị bỏ qua", async () => {
      const state = createSeed();
      state.reports = state.reports.map((report) => (report.id === "6a-student-4-report" ? { ...report, generalComment: "Đủ." } : report));
      const skippedDraft = state.reports.find((report) => report.batchId === "6a-batch" && report.id !== "6a-student-4-report" && report.status === "draft")!;
      replaceStore(state);
      await mockApi(() => ({
        published: [{ report_id: "6a-student-4-report", publication_no: 1 }],
        skipped: state.reports.filter((report) => report.batchId === "6a-batch" && report.id !== "6a-student-4-report").map((report) => ({ report_id: report.id, missing: ["comment"] })),
        published_at: "2026-10-25T01:00:00Z",
      }));
      renderLive("/lop/6a/bao-cao?dot=6a-batch");
      fireEvent.click(await screen.findByRole("button", { name: "Phát hành 1 báo cáo" }));
      expect(await screen.findByText(/Đã phát hành 1 báo cáo\. Chưa phát hành:/)).toBeVisible();
      expect(screen.getByText(/Nguyễn Minh Anh: thiếu nhận xét chung/)).toBeVisible();
      expect(calls.map((call) => call.endpoint)).toEqual(["POST /report-batches/6a-batch/publish"]);
      expect(getStore().reports.find((report) => report.id === skippedDraft.id)?.status).toBe("draft");
    });

  it("offline báo cần mạng và không gọi máy chủ", async () => {
    replaceStore(completeState());
    await mockApi(() => undefined);
    renderLive("/lop/6a/bao-cao?dot=6a-batch");
    const button = await screen.findByRole("button", { name: "Phát hành 8 báo cáo" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    fireEvent.click(button);
    expect(await screen.findByText("Phát hành báo cáo cần kết nối mạng.")).toBeVisible();
    expect(calls).toHaveLength(0);
  });
});
