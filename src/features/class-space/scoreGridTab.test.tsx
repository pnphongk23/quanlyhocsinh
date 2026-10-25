import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { createTestDurable } from "../../data/repositories/tests";
import ScoreGridTab from "./ScoreGridTab";
import TestsTab from "./TestsTab";

// Test chỉ cần dữ liệu trong bộ nhớ; ghi bền IndexedDB không có phiên đăng nhập trong jsdom.
vi.mock("../../data/outbox", async (original) => ({
  ...(await original<typeof import("../../data/outbox")>()),
  persistCommand: vi.fn().mockResolvedValue(undefined),
}));

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

function render(path: string, route: string, page: React.ReactElement): string {
  const router = createMemoryRouter([{ path: route, element: page }], {
    initialEntries: [path],
  });
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bảng điểm lớp theo thang điểm từng bài", () => {
  it("không còn cột Trung bình", () => {
    const html = render(
      "/lop/6a/diem",
      "/lop/:classId/diem",
      <ScoreGridTab />,
    );
    expect(html).toContain("Ngữ pháp");
    expect(html).not.toContain("Trung bình");
  });

  it("header mỗi bài không hiện điểm tối đa", async () => {
    await createTestDurable({
      classId: "6a",
      name: "Kiểm tra 15 phút",
      date: "2026-10-10",
    });
    const html = render(
      "/lop/6a/diem",
      "/lop/:classId/diem",
      <ScoreGridTab />,
    );
    expect(html).not.toContain("thang 15");
    expect(html).not.toContain("thang 10");
    expect(html).not.toContain("điểm từ 0 đến 10");
  });

  it("mỗi ô điểm là link mở đúng bài và focus đúng em vừa bấm", () => {
    const html = render(
      "/lop/6a/diem",
      "/lop/:classId/diem",
      <ScoreGridTab />,
    );
    // 10 học sinh (cả em đã nghỉ) × 4 bài.
    expect(html.match(/hoc-sinh=/g)?.length).toBe(40);
    expect(html).toContain(
      'href="/lop/6a/bai-kiem-tra/6a-test-0?hoc-sinh=6a-student-0"',
    );
    expect(html).toContain('aria-label="Nhập điểm Từ vựng cho Nguyễn Minh Anh"');
    expect(html).toContain(
      'href="/lop/6a/bai-kiem-tra/6a-test-3?hoc-sinh=6a-student-9"',
    );
    expect(html).toContain('aria-label="Nhập điểm Nói cho Đỗ Hải Nam"');
    // Ô trống và ô đã có điểm dùng cùng một kiểu link.
    expect(html).toContain('aria-label="Nhập điểm Nói cho Phạm Đức Dũng"');
    expect(html).toContain("Chưa có điểm");
    expect(html).not.toContain("Trung bình");
  });
});

describe("danh sách bài kiểm tra", () => {
  it("không hiện điểm tối đa", async () => {
    await createTestDurable({
      classId: "6a",
      name: "Kiểm tra 15 phút",
      date: "2026-10-10",
    });
    const html = render(
      "/lop/6a/bai-kiem-tra",
      "/lop/:classId/bai-kiem-tra",
      <TestsTab />,
    );
    expect(html).not.toContain("Thang 15 điểm");
  });
});
