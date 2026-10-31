import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import SessionDetailPage, {
  DEFAULT_SESSION_TAB,
  SESSION_TABS,
  sessionTabOf,
} from "./SessionDetailPage";

function renderSession(url: string): string {
  const router = createMemoryRouter(
    [
      {
        path: "/lop/:classId/buoi-hoc/:sessionId",
        element: <SessionDetailPage />,
      },
    ],
    { initialEntries: [url] },
  );
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

/** Tab đang chọn theo aria-selected (mỗi lần chỉ một tab). */
function activeTab(html: string): string {
  const match = /aria-selected="true"[^>]*>([^<]+)</.exec(html);
  return match ? match[1] : "";
}

/** Khối sheet tuỳ chọn buổi học (dialog đóng, chưa có thuộc tính open). */
function optionsSheet(html: string): string {
  const match =
    /<dialog[^>]*aria-label="Tuỳ chọn buổi học"[\s\S]*?<\/dialog>/.exec(html);
  return match ? match[0] : "";
}

describe("tab của màn buổi học (ảnh 60/61)", () => {
  it("ba tab ngang hàng đúng thứ tự và nhãn", () => {
    expect(SESSION_TABS.map((tab) => tab.label)).toEqual([
      "Điểm danh",
      "Bài tập về nhà",
      "Nhận xét",
    ]);
    expect(SESSION_TABS.map((tab) => tab.value)).toEqual([
      "diem-danh",
      "btvn",
      "nhan-xet",
    ]);
  });

  it("mặc định là Điểm danh khi thiếu hoặc sai ?tab=", () => {
    expect(sessionTabOf(null)).toBe("diem-danh");
    expect(sessionTabOf("")).toBe("diem-danh");
    expect(sessionTabOf("comments")).toBe(DEFAULT_SESSION_TAB);
    expect(sessionTabOf("btvn")).toBe("btvn");
  });
});

beforeEach(() => {
  // Ghim đồng hồ 18/10/2026 để "buổi chưa tới ngày" (19/10) không phụ thuộc máy.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 18, 12));
  const state = createSeed();
  // Two unsent, already-rated tickets keep the bulk-send count meaningful while
  // the shared seed represents the newer set of published report fixtures.
  for (const [index, studentIndex] of [3, 4].entries()) {
    state.comments.push({
      id: `session-tab-draft-${index}`,
      classId: "6a",
      studentId: `6a-student-${studentIndex}`,
      sessionId: "6a-session-7",
        stars: (index === 0 ? 3 : 2) as 2 | 3,
        note: "",
        hwManual: false,
        status: "draft",
      sendQueued: false,
      sentAt: null,
      updatedAt: "2026-10-14T13:14:00.000Z",
      createdAt: "2026-10-14T13:14:00.000Z",
    });
  }
  replaceStore(state);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Màn buổi học có ba tab ở URL (ảnh 60/61)", () => {
  it("mặc định mở Điểm danh, có đủ ba tab", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-7");
    expect(html).toContain("Điểm danh");
    expect(html).toContain("Nhận xét");
    expect(html).toContain("Bài tập về nhà");
    expect(activeTab(html)).toBe("Điểm danh");
    expect(html).toContain("Lưu điểm danh");
  });

  it("?tab=nhan-xet mở tab Nhận xét với danh sách phiếu", () => {
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-7?tab=nhan-xet",
    );
    expect(activeTab(html)).toBe("Nhận xét");
    expect(html).toContain("Tất cả (9)");
    expect(html).toContain("Chưa nhận xét");
      expect(html).toContain("Gửi phiếu cả lớp (2)");
      expect(html).toContain("BTVN buổi trước: 2/2 phần đã chấm");
  });

  it("?tab=btvn mở tab Bài tập về nhà", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-7?tab=btvn");
    expect(activeTab(html)).toBe("Bài tập về nhà");
    expect(html).toContain("Bài tập buổi trước");
  });

  it("?tab lạ quay về Điểm danh", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-7?tab=xyz");
    expect(activeTab(html)).toBe("Điểm danh");
  });

  it("?tab=nhan-xet&student=<id> mở lại sheet của em đó", () => {
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-7?tab=nhan-xet&student=6a-student-1",
    );
    expect(html).toContain('aria-label="Nhận xét Trần Gia Bảo"');
      expect(html).toContain("Phụ huynh sẽ thấy thay đổi sau khi lưu");
  });

  it("buổi chưa tới ngày chỉ xem: không có nút gửi phiếu", () => {
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-8?tab=nhan-xet",
    );
    expect(activeTab(html)).toBe("Nhận xét");
    expect(html).toContain("Chỉ điểm danh được từ ngày học");
    expect(html).not.toContain("Gửi phiếu cả lớp");
  });

  it("buổi chưa tới ngày: sheet mở ở chế độ chỉ xem, không có nút Lưu", () => {
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-8?tab=nhan-xet&student=6a-student-0",
    );
    expect(html).toContain('aria-label="Nhận xét Nguyễn Minh Anh"');
    expect(html).not.toContain(">Lưu<");
    expect(html).toContain('disabled=""');
  });

  it("buổi đã huỷ không hiện thanh tab", () => {
    const state = createSeed();
    state.sessions = state.sessions.map((session) =>
      session.id === "6a-session-7"
        ? { ...session, status: "cancelled" }
        : session,
    );
    replaceStore(state);
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-7?tab=nhan-xet",
    );
    expect(html).toContain("Buổi này đã huỷ");
    expect(html).not.toContain('role="tab"');
  });
});

describe("Tuỳ chọn buổi học trong nút ⋯ ở đầu màn", () => {
  it("buổi chưa huỷ không hiện nút Huỷ buổi trực tiếp trên màn", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-8");
    const sheet = optionsSheet(html);
    expect(sheet).toContain("Huỷ buổi");
    // Sheet đang đóng nên không chiếm chỗ trên màn.
    expect(sheet).not.toMatch(/<dialog[^>]*\sopen/);
    expect(html.replace(sheet, "")).not.toContain("Huỷ buổi");
  });

  it("buổi sắp tới có nút tuỳ chọn buổi học", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-8");
    expect(html).toContain('aria-label="Tuỳ chọn buổi học"');
  });

  it("buổi đã huỷ không có nút tuỳ chọn buổi học", () => {
    const state = createSeed();
    state.sessions = state.sessions.map((session) =>
      session.id === "6a-session-8"
        ? { ...session, status: "cancelled" }
        : session,
    );
    replaceStore(state);
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-8");
    expect(html).toContain("Buổi này đã huỷ");
    expect(html).not.toContain("Khôi phục");
    expect(html).not.toContain('aria-label="Tuỳ chọn buổi học"');
    expect(html).not.toContain("Huỷ buổi");
  });
});

  describe("Các tab buổi học không có phân công nhân sự hoặc Bài giảng ngoài MVP", () => {
    it("tab Điểm danh không có phân công nhân sự hoặc Bài giảng", () => {
      const html = renderSession("/lop/6a/buoi-hoc/6a-session-7");
      expect(html).not.toContain("Người dạy");
      expect(html).not.toContain("Bài giảng");
    });

    it("tab Nhận xét không có phân công hay Bài giảng nhưng giữ tính năng khác", () => {
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-7?tab=nhan-xet",
    );
    expect(html).not.toContain("Người dạy");
    expect(html).not.toContain("Bài giảng");
      expect(html).toContain("Gửi phiếu cả lớp (2)");
    expect(html).toContain('aria-label="Nội dung buổi học"');
  });

    it("tab Bài tập về nhà không có phân công hay Bài giảng", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-7?tab=btvn");
    expect(html).not.toContain("Người dạy");
    expect(html).not.toContain("Bài giảng");
    expect(html).toContain("Bài tập buổi trước");
  });
});
