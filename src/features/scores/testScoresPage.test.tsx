import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { MEMBER_IDS, ROLE_IDS } from "../../data/defaults";
import { createTestDurable } from "../../data/repositories/tests";
import NewTestPage from "./NewTestPage";
import TestScoresPage, { isInvalidDraft } from "./TestScoresPage";

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

const scorePage = (testId: string) =>
  render(
    `/lop/6a/bai-kiem-tra/${testId}`,
    "/lop/:classId/bai-kiem-tra/:testId",
    <TestScoresPage />,
  );

const scorePageWithQuery = (testId: string, query: string) =>
  render(
    `/lop/6a/bai-kiem-tra/${testId}${query}`,
    "/lop/:classId/bai-kiem-tra/:testId",
    <TestScoresPage />,
  );

/** Thẻ input điểm của một học sinh. */
function scoreInputTag(html: string, studentName: string): string {
  const match = new RegExp(
    `<input[^>]*aria-label="Điểm ${studentName}"[^>]*>`,
  ).exec(html);
  return match ? match[0] : "";
}

/** Khối sheet tuỳ chọn bài kiểm tra (dialog đóng, chưa có thuộc tính open). */
function optionsSheet(html: string): string {
  const match =
    /<dialog[^>]*aria-label="Tuỳ chọn bài kiểm tra"[\s\S]*?<\/dialog>/.exec(html);
  return match ? match[0] : "";
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

describe("điểm gõ dở trong khoảng 0..1000, bước 0,5", () => {
  it("chặn ngoài khoảng và sai bước", () => {
    expect(isInvalidDraft({ value: "1000,5" })).toBe(true);
    expect(isInvalidDraft({ value: "-1" })).toBe(true);
    expect(isInvalidDraft({ value: "abc" })).toBe(true);
    expect(isInvalidDraft({ value: "0,3" })).toBe(true);
  });

  it("chấp nhận 0,5, 1000 và ô trống", () => {
    expect(isInvalidDraft({ value: "0,5" })).toBe(false);
    expect(isInvalidDraft({ value: "1000" })).toBe(false);
    expect(isInvalidDraft({ value: "" })).toBe(false);
  });
});

describe("màn nhập điểm không hiện điểm tối đa", () => {
  it("không hiện thang điểm cũ", () => {
    const html = scorePage("6a-test-3");
    expect(html).not.toContain("Thang 10 điểm");
    expect(html).not.toContain("/10");
  });

  it("bài mới cũng không có điểm tối đa", async () => {
    const test = await createTestDurable({
      classId: "6a",
      name: "Kiểm tra 15 phút",
      date: "2026-10-10",
    });
    const html = scorePage(test.id);
    expect(html).not.toContain("Thang");
    expect(html).not.toContain("/15");
  });

  it("màn chi tiết điểm không còn nút tạo bài mới", () => {
    const html = scorePage("6a-test-3");
    expect(html).not.toContain("+ Bài mới");
    expect(html).not.toContain("Tạo bài kiểm tra");
  });

  it("Sửa bài và Xoá bài chỉ nằm trong sheet tuỳ chọn, không hiện sẵn trên màn", () => {
    const html = scorePage("6a-test-3");
    const sheet = optionsSheet(html);
    expect(sheet).toContain("Sửa bài");
    expect(sheet).toContain("Xoá bài");
    // Sheet đang đóng nên không chiếm chỗ trên màn.
    expect(sheet).not.toMatch(/<dialog[^>]*\sopen/);
    const outside = html.replace(sheet, "");
    expect(outside).not.toContain("Sửa bài");
    expect(outside).not.toContain("Xoá bài");
  });

  it("có quyền ghi điểm thì có nút tuỳ chọn bài kiểm tra", () => {
    const html = scorePage("6a-test-3");
    expect(html).toContain('aria-label="Tuỳ chọn bài kiểm tra"');
  });

  it("mở từ ô điểm của một em thì focus đúng ô của em đó", () => {
    const html = scorePageWithQuery("6a-test-3", "?hoc-sinh=6a-student-0");
    expect(scoreInputTag(html, "Nguyễn Minh Anh")).toContain("autofocus");
    expect(scoreInputTag(html, "Trần Gia Bảo")).not.toContain("autofocus");
  });

  it("mở thẳng màn điểm thì không focus ô nào", () => {
    const html = scorePage("6a-test-3");
    expect(html).not.toContain("autofocus");
  });

  it("chỉ có quyền đọc điểm thì không có nút tuỳ chọn", () => {
    const state = createSeed();
    state.activeMemberId = MEMBER_IDS.lanTeacher;
    const teacherRole = state.roles.find(
      (role) => role.id === ROLE_IDS.teacher,
    )!;
    teacherRole.permissions.scores = "read";
    replaceStore(state);

    const html = scorePage("6a-test-3");
    expect(html).toContain("Bạn chỉ có quyền xem điểm của lớp này.");
    expect(html).not.toContain('aria-label="Tuỳ chọn bài kiểm tra"');
  });
});

describe("form tạo bài kiểm tra không có điểm tối đa", () => {
  it("chỉ hiện tên và ngày", () => {
    const html = render(
      "/lop/6a/bai-kiem-tra/moi",
      "/lop/:classId/bai-kiem-tra/moi",
      <NewTestPage />,
    );
    expect(html).not.toContain("Điểm tối đa");
    expect(html).not.toContain('value="15"');
    expect(html).not.toContain("Điểm theo thang 10");
    expect(html).not.toContain("Trung bình là trung bình cộng");
  });
});
