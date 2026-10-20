import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { createSeed } from "../../data/seed";
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

describe("tab của màn buổi học (ảnh 60/61)", () => {
  it("ba tab ngang hàng đúng thứ tự và nhãn", () => {
    expect(SESSION_TABS.map((tab) => tab.label)).toEqual([
      "Điểm danh",
      "Nhận xét",
      "Bài tập về nhà",
    ]);
    expect(SESSION_TABS.map((tab) => tab.value)).toEqual([
      "diem-danh",
      "nhan-xet",
      "btvn",
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
  replaceStore(createSeed());
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
    expect(html).toContain("Gửi phiếu cả lớp (2)");
    expect(html).toContain("BTVN buổi 7: 2/2 phần đã chấm");
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
    expect(html).toContain("Phụ huynh thấy thay đổi ngay");
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

describe("Thẻ Người dạy và Bài giảng chỉ ở tab Điểm danh (ảnh 40–47, 50–62)", () => {
  it("tab Điểm danh vẫn có Người dạy và Bài giảng", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-7");
    expect(html).toContain("Người dạy");
    expect(html).toContain("Bài giảng");
  });

  it("tab Nhận xét ẩn Người dạy và Bài giảng nhưng giữ tính năng khác", () => {
    const html = renderSession(
      "/lop/6a/buoi-hoc/6a-session-7?tab=nhan-xet",
    );
    expect(html).not.toContain("Người dạy");
    expect(html).not.toContain("Bài giảng");
    expect(html).toContain("Gửi phiếu cả lớp (2)");
    expect(html).toContain('aria-label="Nội dung buổi học"');
  });

  it("tab Bài tập về nhà ẩn Người dạy và Bài giảng", () => {
    const html = renderSession("/lop/6a/buoi-hoc/6a-session-7?tab=btvn");
    expect(html).not.toContain("Người dạy");
    expect(html).not.toContain("Bài giảng");
    expect(html).toContain("Bài tập buổi trước");
  });
});
