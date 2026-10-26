import { useState, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../data/store";
import { generatedSlipSentence } from "../data/slip";
import { createSeed } from "../test/fixtures/seed";
import { getClass } from "../data/repositories/classes";
import { getSession } from "../data/repositories/sessions";
import AttendancePanel from "./attendance/AttendancePanel";
import CommentsPanel from "./comments/CommentsPanel";
import SessionDetailDesktop from "./class-space/SessionDetailDesktop";
import type { SessionTab } from "./class-space/SessionDetailPage";
import HomeworkDesktop from "./homework/HomeworkDesktop";
import NewTestPage from "./scores/NewTestPage";
import ScoreGridDesktop from "./scores/ScoreGridDesktop";
import TestScoresPage from "./scores/TestScoresPage";
import TestsDesktop from "./scores/TestsDesktop";

// Test chỉ cần dữ liệu trong bộ nhớ; ghi bền IndexedDB không có phiên đăng nhập trong jsdom.
vi.mock("../data/outbox", async (original) => ({
  ...(await original<typeof import("../data/outbox")>()),
  persistCommand: vi.fn().mockResolvedValue(undefined),
}));

const mocks = vi.hoisted(() => ({
  saveAttendanceBatchDurable: vi.fn(),
  saveScoreDurable: vi.fn(),
  saveSessionCommentDurable: vi.fn(),
  sendSessionTicketsDurable: vi.fn(),
  setHomeworkGradeDurable: vi.fn(),
  createTestDurable: vi.fn(),
  updateTestDurable: vi.fn(),
  deleteTestDurable: vi.fn(),
}));

vi.mock("../data/repositories/attendance", async (original) => ({
  ...(await original<typeof import("../data/repositories/attendance")>()),
  saveAttendanceBatchDurable: mocks.saveAttendanceBatchDurable,
}));
vi.mock("../data/repositories/scores", async (original) => ({
  ...(await original<typeof import("../data/repositories/scores")>()),
  saveScoreDurable: mocks.saveScoreDurable,
}));
vi.mock("../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../data/repositories/comments")>()),
  saveSessionCommentDurable: mocks.saveSessionCommentDurable,
  sendSessionTicketsDurable: mocks.sendSessionTicketsDurable,
}));
vi.mock("../data/repositories/homework", async (original) => ({
  ...(await original<typeof import("../data/repositories/homework")>()),
  setHomeworkGradeDurable: mocks.setHomeworkGradeDurable,
}));
vi.mock("../data/repositories/tests", async (original) => ({
  ...(await original<typeof import("../data/repositories/tests")>()),
  createTestDurable: mocks.createTestDurable,
  updateTestDurable: mocks.updateTestDurable,
  deleteTestDurable: mocks.deleteTestDurable,
}));

const FAIL = "Ghi bền thất bại.";

function inRouter(node: ReactNode, path: string, url: string) {
  const router = createMemoryRouter([{ path, element: node }], { initialEntries: [url] });
  return render(<RouterProvider router={router} />);
}

function seedFiveStarSlip() {
  const seed = createSeed();
  seed.comments = seed.comments.filter((comment) => comment.sessionId !== "6a-session-6" || comment.studentId !== "6a-student-1");
  seed.comments.push({
    id: "review-five-star",
    classId: "6a",
    sessionId: "6a-session-6",
    studentId: "6a-student-1",
    criteria: 15,
    comment: "Câu nhận xét đã lưu.",
    scale: 5,
    stars: 4,
    note: "Ghi chú đã lưu.",
    hwManual: true,
    status: "draft",
    sendQueued: false,
    sentAt: null,
    updatedAt: "2026-10-12T12:00:00.000Z",
    createdAt: "2026-10-12T12:00:00.000Z",
  });
  replaceStore(seed);
}

beforeEach(() => {
  const seed = createSeed();
  seed.scores = seed.scores.map((score) => ({ ...score, id: `${score.testId}:${score.studentId}` }));
  replaceStore(seed);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  for (const mock of Object.values(mocks)) mock.mockReset().mockRejectedValue(new Error(FAIL));
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});

describe("điểm số: ghi bền lỗi", () => {
  it("bảng điểm desktop: báo lỗi, giữ giá trị đã nhập, nút lưu bật lại", async () => {
    inRouter(<ScoreGridDesktop classId="6a" />, "/lop/:classId/*", "/lop/6a/diem");
    const cell = screen.getByLabelText("Điểm Từ vựng của Nguyễn Minh Anh") as HTMLInputElement;
    fireEvent.change(cell, { target: { value: "9,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(cell.value).toBe("9,5");
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu điểm" })).toBeEnabled());
  });

  it("bảng điểm desktop: ghi thành công thì gọi saveScoreDurable và nút về tắt", async () => {
    mocks.saveScoreDurable.mockResolvedValue({});
    inRouter(<ScoreGridDesktop classId="6a" />, "/lop/:classId/*", "/lop/6a/diem");
    fireEvent.change(screen.getByLabelText("Điểm Từ vựng của Nguyễn Minh Anh"), { target: { value: "9,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm" }));
    await waitFor(() => expect(mocks.saveScoreDurable).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: /Lưu điểm|Đã lưu/ })).toBeDisabled(), { timeout: 3000 });
    expect(screen.queryByText(FAIL)).toBeNull();
  });

  it("màn nhập điểm mobile: báo lỗi và giữ giá trị đã nhập", async () => {
    inRouter(<TestScoresPage />, "/lop/:classId/bai-kiem-tra/:testId", "/lop/6a/bai-kiem-tra/6a-test-0");
    const cell = screen.getByLabelText("Điểm Nguyễn Minh Anh") as HTMLInputElement;
    fireEvent.change(cell, { target: { value: "9,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(cell.value).toBe("9,5");
  });
});

function SessionHarness({ sessionId }: { sessionId: string }) {
  const [tab, setTab] = useState<SessionTab>("diem-danh");
  return (
    <SessionDetailDesktop
      classId="6a"
      klass={getClass("6a")!}
      session={getSession(sessionId)!}
      tab={tab}
      onTab={setTab}
      canWrite
      readOnly={false}
      onCancel={() => {}}
    />
  );
}

describe("điểm danh: ghi bền lỗi", () => {
  it("desktop: báo lỗi, giữ trạng thái đã chọn", async () => {
    inRouter(<SessionHarness sessionId="6a-session-7" />, "/lop/:classId/*", "/lop/6a/buoi-hoc/6a-session-7");
    const group = screen.getByRole("group", { name: "Trạng thái của Nguyễn Minh Anh" });
    const target = group.querySelectorAll("button")[1];
    fireEvent.click(target);
    expect(target).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(target).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu điểm danh" })).toBeEnabled());
  });

  it("mobile: báo lỗi, giữ trạng thái đã chọn; ghi thành công thì không còn lỗi", async () => {
    inRouter(
      <AttendancePanel classId="6a" sessionId="6a-session-7" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-7",
    );
    const status = () => screen.getByRole("button", { name: /^Nguyễn Minh Anh: / });
    const before = status().textContent;
    fireEvent.click(status());
    const changed = status().textContent;
    expect(changed).not.toBe(before);
    const save = screen.getByRole("button", { name: "Lưu điểm danh" });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(status().textContent).toBe(changed);

    mocks.saveAttendanceBatchDurable.mockResolvedValue([]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu điểm danh" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Lưu điểm danh" }));
    await waitFor(() => expect(mocks.saveAttendanceBatchDurable).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(FAIL)).toBeNull());
  });
});

describe("phiếu nhận xét: ghi bền lỗi", () => {
  it("lưu phiếu (sheet mobile): báo lỗi, sheet còn mở và giữ ghi chú", async () => {
    const sessionId = "6a-session-6";
    inRouter(
      <CommentsPanel classId="6a" sessionId={sessionId} />,
      "/lop/:classId/buoi-hoc/:sessionId",
      `/lop/6a/buoi-hoc/${sessionId}?tab=nhan-xet&student=6a-student-0`,
    );
      const note = (await screen.findByLabelText(/Thêm nhận xét riêng/)) as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "Ghi chú thử" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(note.value).toBe("Ghi chú thử");
  });

  it("gửi phiếu: báo lỗi trong hộp xác nhận và hộp còn mở", async () => {
    const sessionId = "6a-session-6";
    const actual = await vi.importActual<typeof import("../data/repositories/comments")>("../data/repositories/comments");
    await actual.saveSessionCommentDurable({ sessionId, studentId: "6a-student-0", stars: 3 });
    inRouter(
      <CommentsPanel classId="6a" sessionId={sessionId} />,
      "/lop/:classId/buoi-hoc/:sessionId",
      `/lop/6a/buoi-hoc/${sessionId}?tab=nhan-xet`,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Gửi phiếu cả lớp/ }));
    fireEvent.click(await screen.findByRole("button", { name: /^Gửi \d+ phiếu$/ }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /^Gửi \d+ phiếu$/ })).toBeEnabled());
  });

  it("dialog gửi: đang mở thì khoá khi mất mạng và bật lại khi có mạng", async () => {
    const sessionId = "6a-session-6";
    const actual = await vi.importActual<typeof import("../data/repositories/comments")>("../data/repositories/comments");
    await actual.saveSessionCommentDurable({ sessionId, studentId: "6a-student-0", stars: 3 });
    inRouter(
      <CommentsPanel classId="6a" sessionId={sessionId} />,
      "/lop/:classId/buoi-hoc/:sessionId",
      `/lop/6a/buoi-hoc/${sessionId}?tab=nhan-xet`,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Gửi phiếu cả lớp/ }));
    const send = await screen.findByRole("button", { name: /^Gửi \d+ phiếu$/ });
    expect(send).toBeEnabled();

    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    fireEvent(window, new Event("offline"));
    await waitFor(() => expect(send).toBeDisabled());
    expect(screen.getByText("Cần có mạng để gửi phiếu.")).toBeInTheDocument();
    expect(send).toHaveAttribute("aria-describedby", "send-tickets-offline-hint");

    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    fireEvent(window, new Event("online"));
    await waitFor(() => expect(send).toBeEnabled());
    expect(screen.queryByText("Cần có mạng để gửi phiếu.")).toBeNull();
    expect(send).not.toHaveAttribute("aria-describedby");
  });

  it("offline: khoá nút gửi phiếu cả lớp và giải thích cần mạng", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    inRouter(
      <CommentsPanel classId="6a" sessionId="6a-session-6" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-6?tab=nhan-xet",
    );
    expect(screen.getByRole("button", { name: /Gửi phiếu cả lớp/ })).toBeDisabled();
    expect(screen.getByText("Cần có mạng để gửi phiếu")).toBeInTheDocument();
  });
});

describe("phiếu nhận xét: chỉnh note và tiêu chí", () => {
  it("focus rồi blur note không đổi không ghi và giữ câu cũ", async () => {
    seedFiveStarSlip();
    inRouter(
      <CommentsPanel classId="6a" sessionId="6a-session-6" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-6?tab=nhan-xet&student=6a-student-1",
    );

    const note = await screen.findByLabelText(/Thêm nhận xét riêng/) as HTMLTextAreaElement;
    const heading = screen.getByRole("heading", { name: "Trần Gia Bảo" });
    expect(heading).toHaveFocus();
    fireEvent.focus(note);
    fireEvent.blur(note);

    expect(mocks.saveSessionCommentDurable).not.toHaveBeenCalled();
    const { getSessionComment } = await vi.importActual<typeof import("../data/repositories/comments")>("../data/repositories/comments");
    expect(getSessionComment("6a-session-6", "6a-student-1")?.comment).toBe("Câu nhận xét đã lưu.");
  });

  it("lưu riêng note chỉ gửi note", async () => {
    seedFiveStarSlip();
    mocks.saveSessionCommentDurable.mockResolvedValue({});
    inRouter(
      <CommentsPanel classId="6a" sessionId="6a-session-6" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-6?tab=nhan-xet&student=6a-student-1",
    );

    const note = await screen.findByLabelText(/Thêm nhận xét riêng/);
    fireEvent.change(note, { target: { value: "Ghi chú mới." } });
    expect(note).toHaveValue("Ghi chú mới.");
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.saveSessionCommentDurable).toHaveBeenCalledTimes(1));
    const input = mocks.saveSessionCommentDurable.mock.calls[0]?.[0];
    expect(input).toMatchObject({ sessionId: "6a-session-6", studentId: "6a-student-1", note: "Ghi chú mới." });
    expect(input).not.toHaveProperty("criteria");
  });

  it("phiếu mới chuyển sang trạng thái đã lưu sau khi ghi bền thành công", async () => {
    const seed = createSeed();
    seed.comments = seed.comments.filter((comment) => comment.sessionId !== "6a-session-6" || comment.studentId !== "6a-student-1");
    replaceStore(seed);
    mocks.saveSessionCommentDurable.mockResolvedValue({});
    inRouter(
      <CommentsPanel classId="6a" sessionId="6a-session-6" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-6?tab=nhan-xet&student=6a-student-1",
    );

    fireEvent.change(await screen.findByLabelText(/Thêm nhận xét riêng/), { target: { value: "Ghi chú mới." } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    const status = screen.getByTestId("slip-save-status");
    await waitFor(() => expect(status).toHaveAttribute("data-save-state", "saved"));
    expect(status).toHaveTextContent("Đã lưu");
  });

  it("đổi tiêu chí thay câu cũ và giữ note đã lưu", async () => {
    seedFiveStarSlip();
    mocks.saveSessionCommentDurable.mockResolvedValue({});
    inRouter(
      <CommentsPanel classId="6a" sessionId="6a-session-6" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-6?tab=nhan-xet&student=6a-student-1",
    );

    fireEvent.click(await screen.findByTestId("slip-criterion-0"));
    const beforeSave = generatedSlipSentence(14);
    expect(screen.getByTestId("slip-generated-comment")).toHaveTextContent(beforeSave);
    expect(screen.getByLabelText(/Thêm nhận xét riêng/)).toHaveValue("Ghi chú đã lưu.");
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.saveSessionCommentDurable).toHaveBeenCalledTimes(1));
    expect(mocks.saveSessionCommentDurable.mock.calls[0]?.[0]).toMatchObject({ criteria: 14, note: "Ghi chú đã lưu." });
  });

  it("desktop hiển thị chưa lưu ngay khi note đổi", async () => {
    seedFiveStarSlip();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }));
    inRouter(
      <CommentsPanel classId="6a" sessionId="6a-session-6" />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-6?tab=nhan-xet",
    );

    fireEvent.click(await screen.findByRole("button", { name: /Trần Gia Bảo/ }));

    const note = await screen.findByLabelText(/Thêm nhận xét riêng/);
    fireEvent.change(note, { target: { value: "Ghi chú đang soạn." } });
    expect(screen.getByTestId("slip-save-status")).toHaveTextContent("Chưa lưu");
  });
});

describe("BTVN chấm bài desktop: ghi bền lỗi", () => {
  it("giữ ô đã chấm và báo lỗi", async () => {
    inRouter(
      <HomeworkDesktop session={getSession("6a-session-8")!} tabBar={(actions) => <div>{actions}</div>} />,
      "/lop/:classId/buoi-hoc/:sessionId",
      "/lop/6a/buoi-hoc/6a-session-8",
    );
    const option = () =>
      screen.getAllByRole("button", { name: "Hoàn thành tốt" }).filter((b) => b.hasAttribute("aria-pressed"))[0];
    fireEvent.click(option());
    expect(option()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Lưu kết quả chấm" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(option()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("bài kiểm tra: ghi bền lỗi", () => {
  it("tạo bài ở trang riêng: báo lỗi, giữ tên và không điều hướng", async () => {
    const router = createMemoryRouter(
      [
        { path: "/lop/:classId/bai-kiem-tra/moi", element: <NewTestPage /> },
        { path: "/lop/:classId/bai-kiem-tra/:testId", element: <p>Màn nhập điểm</p> },
      ],
      { initialEntries: ["/lop/6a/bai-kiem-tra/moi"] },
    );
    render(<RouterProvider router={router} />);
    const name = screen.getByLabelText(/Tên bài kiểm tra/) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Bài thử" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài và nhập điểm" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(name.value).toBe("Bài thử");
    expect(router.state.location.pathname).toMatch(/moi$/);
  });

  it("modal tạo bài desktop: báo lỗi, giữ tên và modal còn mở", async () => {
    inRouter(<TestsDesktop classId="6a" />, "/lop/:classId/*", "/lop/6a/bai-kiem-tra");
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài kiểm tra" }));
    const name = screen.getByLabelText(/Tên bài kiểm tra/) as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Bài thử" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(name.value).toBe("Bài thử");
  });

  it("xoá bài desktop: báo lỗi từ repository", async () => {
    inRouter(<TestsDesktop classId="6a" />, "/lop/:classId/*", "/lop/6a/bai-kiem-tra");
    fireEvent.click(screen.getAllByRole("button", { name: /^Thêm tùy chọn .+/ })[0]);
    const remove = screen.getAllByRole("menuitem").find((item) => /Xoá|Lưu trữ/.test(item.textContent ?? ""));
    expect(remove).toBeTruthy();
    fireEvent.click(remove!);
    fireEvent.click(await screen.findByRole("button", { name: /^(Xoá hẳn|Lưu trữ bài)$/ }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(mocks.deleteTestDurable).toHaveBeenCalledTimes(1);
  });
});
