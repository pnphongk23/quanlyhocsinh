import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { createTest } from "../../data/repositories/tests";
import ScoreGridTab from "./ScoreGridTab";
import TestsTab from "./TestsTab";

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

  it("header mỗi bài hiện thang điểm riêng", () => {
    createTest({
      classId: "6a",
      name: "Kiểm tra 15 phút",
      date: "2026-10-10",
      max: 15,
    });
    const html = render(
      "/lop/6a/diem",
      "/lop/:classId/diem",
      <ScoreGridTab />,
    );
    expect(html).toContain("thang 15");
    expect(html).toContain("thang 10");
    expect(html).not.toContain("điểm từ 0 đến 10");
  });
});

describe("danh sách bài kiểm tra theo thang điểm từng bài", () => {
  it("bài thang 15 hiện Thang 15 điểm", () => {
    createTest({
      classId: "6a",
      name: "Kiểm tra 15 phút",
      date: "2026-10-10",
      max: 15,
    });
    const html = render(
      "/lop/6a/bai-kiem-tra",
      "/lop/:classId/bai-kiem-tra",
      <TestsTab />,
    );
    expect(html).toContain("Thang 15 điểm");
  });
});
