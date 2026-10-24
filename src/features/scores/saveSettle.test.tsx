import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import ScoreGridDesktop from "./ScoreGridDesktop";
import TestScoresPage from "./TestScoresPage";
import NewTestPage from "./NewTestPage";
import TestsDesktop from "./TestsDesktop";

vi.mock("../../data/outbox", async (original) => ({
  ...(await original<typeof import("../../data/outbox")>()),
  persistCommand: vi.fn().mockResolvedValue(undefined),
}));

function inRouter(node: ReactNode, path: string, url: string) {
  const router = createMemoryRouter([{ path, element: node }], {
    initialEntries: [url],
  });
  return render(<RouterProvider router={router} />);
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  const seed = createSeed();
  seed.scores = seed.scores.map((score) => ({
    ...score,
    id: `${score.testId}:${score.studentId}`,
  }));
  replaceStore(seed);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("nút Lưu điểm sau khi lưu xong", () => {
  it.each(["9.5", "7,5", "8"])(
    "bảng điểm desktop: gõ %s, hết giữ loading và Đã lưu thì nút về disabled",
    async (typed) => {
      inRouter(<ScoreGridDesktop classId="6a" />, "/lop/:classId/*", "/lop/6a/diem");
      const cell = screen.getByLabelText("Điểm Từ vựng của Nguyễn Minh Anh");
      fireEvent.change(cell, { target: { value: typed } });
      const save = screen.getByRole("button", { name: "Lưu điểm" });
      expect(save).toBeEnabled();
      fireEvent.click(save);
      await advance(400);
      await advance(1600);
      expect(screen.queryByText("Đã lưu")).toBeNull();
      expect(screen.getByRole("button", { name: "Lưu điểm" })).toBeDisabled();
    },
  );

  it.each(["9.5", "7,5", "8"])(
    "màn nhập điểm mobile: gõ %s, hết giữ loading và Đã lưu thì nút về disabled",
    async (typed) => {
      inRouter(
        <TestScoresPage />,
        "/lop/:classId/bai-kiem-tra/:testId",
        "/lop/6a/bai-kiem-tra/6a-test-0",
      );
      fireEvent.change(screen.getByLabelText("Điểm Nguyễn Minh Anh"), {
        target: { value: typed },
      });
      expect(screen.queryByText("Chưa có thay đổi để lưu")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Lưu điểm" }));
      await advance(100);
      expect(screen.queryByText("Chưa có thay đổi để lưu")).toBeNull();
      await advance(300);
      expect(screen.queryByText("Chưa có thay đổi để lưu")).toBeNull();
      await advance(1600);
      expect(screen.getByRole("button", { name: "Lưu điểm" })).toBeDisabled();
      expect(screen.getByText("Chưa có thay đổi để lưu")).toBeInTheDocument();
    },
  );
});

describe("form lưu rồi đóng: hiện Đã lưu trước khi đóng", () => {
  it("tạo bài ở trang riêng: Đã lưu hiện, sau 800 ms mới điều hướng", async () => {
    const router = createMemoryRouter(
      [
        { path: "/lop/:classId/bai-kiem-tra/moi", element: <NewTestPage /> },
        { path: "/lop/:classId/bai-kiem-tra/:testId", element: <p>Màn nhập điểm</p> },
      ],
      { initialEntries: ["/lop/6a/bai-kiem-tra/moi"] },
    );
    render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByLabelText(/Tên bài kiểm tra/), {
      target: { value: "Bài thử" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài và nhập điểm" }));
    await advance(450);
    expect(screen.getByText("Đã lưu")).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/moi$/);
    await advance(900);
    expect(router.state.location.pathname).not.toMatch(/moi$/);
  });

  it("modal tạo bài desktop: Đã lưu hiện, sau 800 ms mới đóng", async () => {
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
    inRouter(<TestsDesktop classId="6a" />, "/lop/:classId/*", "/lop/6a/bai-kiem-tra");
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài kiểm tra" }));
    fireEvent.change(screen.getByLabelText(/Tên bài kiểm tra/), {
      target: { value: "Bài thử" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tạo bài" }));
    await advance(450);
    expect(screen.getByText("Đã lưu")).toBeInTheDocument();
    await advance(900);
    expect(screen.queryByText("Đã lưu")).toBeNull();
    expect(screen.queryByLabelText(/Tên bài kiểm tra/)).toBeNull();
  });
});
