import { useState, type ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { getStore, replaceStore } from "../../data/store";
import { getClass } from "../../data/repositories/classes";
import { getSession } from "../../data/repositories/sessions";
import { listScores } from "../../data/repositories/scores";
import { saveSessionCommentDurable } from "../../data/repositories/comments";
import ScoreGridDesktop from "../scores/ScoreGridDesktop";
import StudentsDesktop from "../students/StudentsDesktop";
import HomeworkDesktop from "../homework/HomeworkDesktop";
import TestsDesktop from "../scores/TestsDesktop";
import CommentsDesktop from "../comments/CommentsDesktop";
import SessionDetailDesktop from "./SessionDetailDesktop";
import type { SessionTab } from "./SessionDetailPage";


vi.mock("../../data/outbox", async (original) => ({
  ...(await original<typeof import("../../data/outbox")>()),
  persistCommand: vi.fn().mockResolvedValue(undefined),
}));
const mocks = vi.hoisted(() => ({
  createStudent: vi.fn(),
  saveAttendanceBatch: vi.fn(),
  sendSessionTickets: vi.fn(),
}));

vi.mock("../../data/repositories/students", async (original) => ({
  ...(await original<typeof import("../../data/repositories/students")>()),
  createStudent: mocks.createStudent,
}));
vi.mock("../../data/repositories/attendance", async (original) => {
  const real = await original<typeof import("../../data/repositories/attendance")>();
  mocks.saveAttendanceBatch.mockImplementation(real.saveAttendanceBatchDurable);
  return { ...real, saveAttendanceBatchDurable: mocks.saveAttendanceBatch };
});
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  sendSessionTicketsDurable: mocks.sendSessionTickets,
}));

function inRouter(node: ReactNode, url = "/lop/6a/diem") {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/*", element: node }],
    { initialEntries: [url] },
  );
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  // Điểm thật có id `${bài}:${em}`; chuẩn hoá seed để ghi đè đúng bản ghi.
  const seed = createSeed();
  seed.scores = seed.scores.map((score) => ({
    ...score,
    id: `${score.testId}:${score.studentId}`,
  }));
  replaceStore(seed);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
  mocks.createStudent.mockReset();
  mocks.sendSessionTickets.mockReset();
  mocks.saveAttendanceBatch.mockClear();
});

afterEach(() => vi.restoreAllMocks());

describe("Lưới điểm desktop: nút lưu", () => {
  it("tắt khi chưa sửa, bật khi có ô đổi, lưu xong về tắt và không hiện 'Đã lưu'", async () => {
    inRouter(<ScoreGridDesktop classId="6a" />);
    const save = screen.getByRole("button", { name: "Lưu điểm" });
    expect(save).toBeDisabled();
    const cell = screen.getByLabelText("Điểm Từ vựng của Nguyễn Minh Anh");
    fireEvent.change(cell, { target: { value: "9,5" } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    const score = listScores("6a-test-0").find(
      (item) => item.studentId === "6a-student-0",
    );
    expect(score?.value).toBe(9.5);
    expect(screen.queryByText(/Đã lưu/)).toBeNull();
  });

  it("ô sai bước 0,5 hoặc vượt 1000: tắt nút và nói rõ số ô lỗi", () => {
    inRouter(<ScoreGridDesktop classId="6a" />);
    const save = screen.getByRole("button", { name: "Lưu điểm" });
    fireEvent.change(screen.getByLabelText("Điểm Từ vựng của Nguyễn Minh Anh"), {
      target: { value: "7.3" },
    });
    fireEvent.change(screen.getByLabelText("Điểm Từ vựng của Trần Gia Bảo"), {
      target: { value: "1000,5" },
    });
    expect(save).toBeDisabled();
    expect(screen.getByText("Sửa 2 ô lỗi để lưu điểm")).toBeInTheDocument();
  });

  it("gõ rồi sửa lại đúng giá trị cũ thì không còn thay đổi", () => {
    inRouter(<ScoreGridDesktop classId="6a" />);
    const save = screen.getByRole("button", { name: "Lưu điểm" });
    const cell = screen.getByLabelText(
      "Điểm Từ vựng của Nguyễn Minh Anh",
    ) as HTMLInputElement;
    const original = cell.value;
    fireEvent.change(cell, { target: { value: "3" } });
    expect(save).toBeEnabled();
    fireEvent.change(cell, { target: { value: original } });
    expect(save).toBeDisabled();
  });
});

function SessionHarness({
  sessionId,
  onDirty,
}: {
  sessionId: string;
  onDirty?: (dirty: boolean) => void;
}) {
  const [tab, setTab] = useState<SessionTab>("diem-danh");
  const klass = getClass("6a")!;
  const session = getSession(sessionId)!;
  return (
    <SessionDetailDesktop
      classId="6a"
      klass={klass}
      session={session}
      tab={tab}
      onTab={setTab}
      canWrite
      readOnly={false}
      onDirtyChange={onDirty}
      onCancel={() => {}}
    />
  );
}

describe("Buổi học desktop: điểm danh và đổi tab", () => {
  it("điểm danh đã lưu: nút tắt; sửa một em thì bật; bấm hai lần chỉ lưu một lần", async () => {
    inRouter(<SessionHarness sessionId="6a-session-7" />, "/lop/6a/buoi-hoc/6a-session-7");
    const save = screen.getByRole("button", { name: "Lưu điểm danh" });
    expect(save).toBeDisabled();
    const group = screen.getByRole("group", {
      name: "Trạng thái của Nguyễn Minh Anh",
    });
    fireEvent.click(group.querySelectorAll("button")[2]);
    expect(save).toBeEnabled();
    fireEvent.click(save);
    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    expect(mocks.saveAttendanceBatch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Đã lưu điểm danh/)).toBeNull();
  });

  it("đổi tab rồi quay lại vẫn giữ điểm danh đang sửa và báo dirty", async () => {
    const onDirty = vi.fn();
    inRouter(
      <SessionHarness sessionId="6a-session-7" onDirty={onDirty} />,
      "/lop/6a/buoi-hoc/6a-session-7",
    );
    const group = () =>
      screen.getByRole("group", { name: "Trạng thái của Trần Gia Bảo" });
    fireEvent.click(group().querySelectorAll("button")[3]);
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
    const tabs = screen.getAllByRole("tab", { name: "Nhận xét" });
    fireEvent.click(tabs[0]);
    fireEvent.click(screen.getAllByRole("tab", { name: "Điểm danh" })[0]);
    expect(group().querySelectorAll("button")[3]).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(onDirty).toHaveBeenLastCalledWith(true);
  });
});

describe("Thêm học sinh: chặn tạo trùng", () => {
  it("bấm Lưu hai lần khi đang chờ mạng chỉ gọi createStudent một lần", async () => {
    let resolve: () => void = () => {};
    mocks.createStudent.mockImplementation(
      () => new Promise<void>((done) => (resolve = done)),
    );
    inRouter(<StudentsDesktop classId="6a" />, "/lop/6a/hoc-sinh");
    fireEvent.click(screen.getByRole("button", { name: "+ Thêm học sinh" }));
    const save = await screen.findByRole("button", { name: "Lưu học sinh" });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Họ và tên học sinh"), {
      target: { value: "Học sinh mới" },
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(save).toHaveAttribute("aria-busy", "true");
    fireEvent.click(save);
    fireEvent.submit(screen.getByLabelText("Họ và tên học sinh").closest("form")!);
    expect(mocks.createStudent).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
  });
});

describe("Gửi phiếu: không gửi lại phiếu đang chờ gửi", () => {
  it("chỉ chọn phiếu nháp, bỏ phiếu queued", async () => {
    mocks.sendSessionTickets.mockResolvedValue({
      sent: [],
      skipped: [],
      queued: false,
      ungraded: { students: [], ungradedParts: 0 },
    });
    const sessionId = "6a-session-6";
    await saveSessionCommentDurable({ sessionId, studentId: "6a-student-0", stars: 3 });
    await saveSessionCommentDurable({ sessionId, studentId: "6a-student-1", stars: 2 });
    await saveSessionCommentDurable({ sessionId, studentId: "6a-student-2", stars: 1 });
    const queued = getStore().comments.find(
      (item) => item.sessionId === sessionId && item.studentId === "6a-student-1",
    )!;
    queued.sendQueued = true;
    inRouter(
      <CommentsDesktop
        sessionId={sessionId}
        tabBar={(actions) => <div>{actions}</div>}
      />,
      "/lop/6a/buoi-hoc/" + sessionId,
    );
    fireEvent.click(screen.getByRole("button", { name: "Gửi phiếu cả lớp (2)" }));
    fireEvent.click(await screen.findByRole("button", { name: "Gửi 2 phiếu" }));
    expect(mocks.sendSessionTickets).toHaveBeenCalledTimes(1);
    const [, ids] = mocks.sendSessionTickets.mock.calls[0];
    expect([...ids].sort()).toEqual(["6a-student-0", "6a-student-2"]);
  });
});

describe("BTVN desktop: chấm bài", () => {
  it("nút Lưu kết quả chấm tắt khi chưa chấm, bật khi có thay đổi, báo dirty và về tắt sau khi lưu", async () => {
    const onDirty = vi.fn();
    inRouter(
      <HomeworkHarness onDirty={onDirty} />,
      "/lop/6a/buoi-hoc/6a-session-8",
    );
    const save = screen.getByRole("button", { name: "Lưu kết quả chấm" });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getAllByRole("button", { name: "Hoàn thành tốt" })[0]);
    expect(save).toBeEnabled();
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(true));
    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());
    await waitFor(() => expect(onDirty).toHaveBeenLastCalledWith(false));
    expect(screen.queryByText(/Đã lưu/)).toBeNull();
  });
});

function HomeworkHarness({ onDirty }: { onDirty: (dirty: boolean) => void }) {
  return (
    <HomeworkDesktop
      session={getSession("6a-session-8")!}
      tabBar={(actions) => <div>{actions}</div>}
      onDirtyChange={onDirty}
    />
  );
}

describe("Bài kiểm tra desktop: form tạo/sửa", () => {
  it("Tạo bài chỉ cần tên và ngày", () => {
    inRouter(<TestsDesktop classId="6a" />, "/lop/6a/bai-kiem-tra");
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài kiểm tra" }));
    const create = screen.getByRole("button", { name: "Tạo bài" });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Tên bài kiểm tra"), {
      target: { value: "Kiểm tra Unit 9" },
    });
    expect(create).toBeEnabled();
    expect(create).toBeEnabled();
  });
});
