import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { createTest } from "../../data/repositories/tests";
import NewTestPage from "./NewTestPage";
import TestScoresPage, { isInvalidDraft } from "./TestScoresPage";

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

const scorePage = (testId: string) =>
  render(
    `/lop/6a/bai-kiem-tra/${testId}`,
    "/lop/:classId/bai-kiem-tra/:testId",
    <TestScoresPage />,
  );

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

describe("điểm gõ dở theo thang của bài", () => {
  it("điểm vượt quá thang của bài bị coi là lỗi", () => {
    expect(isInvalidDraft({ value: "16" }, 15)).toBe(true);
    expect(isInvalidDraft({ value: "10,5" }, 10)).toBe(true);
    expect(isInvalidDraft({ value: "-1" }, 15)).toBe(true);
    expect(isInvalidDraft({ value: "abc" }, 15)).toBe(true);
  });

  it("điểm trong thang hợp lệ, ô trống không tính là lỗi", () => {
    expect(isInvalidDraft({ value: "15" }, 15)).toBe(false);
    expect(isInvalidDraft({ value: "0" }, 15)).toBe(false);
    expect(isInvalidDraft({ value: "7,5" }, 15)).toBe(false);
    expect(isInvalidDraft({ value: "" }, 15)).toBe(false);
  });
});

describe("màn nhập điểm hiện thang điểm của bài", () => {
  it("bài cũ giữ thang 10", () => {
    const html = scorePage("6a-test-3");
    expect(html).toContain("Thang 10 điểm");
  });

  it("bài tạo với thang 15 hiện thang 15", () => {
    const test = createTest({
      classId: "6a",
      name: "Kiểm tra 15 phút",
      date: "2026-10-10",
      max: 15,
    });
    const html = scorePage(test.id);
    expect(html).toContain("Thang 15 điểm");
    expect(html).not.toContain("Điểm từ 0 đến 10");
  });

  it("có quyền sửa điểm thì có nút Sửa bài và Xoá bài", () => {
    const html = scorePage("6a-test-3");
    expect(html).toContain("Sửa bài");
    expect(html).toContain("Xoá bài");
  });
});

describe("form tạo bài kiểm tra có điểm tối đa", () => {
  it("ô điểm tối đa mặc định 15", () => {
    const html = render(
      "/lop/6a/bai-kiem-tra/moi",
      "/lop/:classId/bai-kiem-tra/moi",
      <NewTestPage />,
    );
    expect(html).toContain("Điểm tối đa");
    expect(html).toContain('value="15"');
    expect(html).toContain("Mỗi bài có thang điểm riêng");
    expect(html).not.toContain("Điểm theo thang 10");
    expect(html).not.toContain("Trung bình là trung bình cộng");
  });
});
