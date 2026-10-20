import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import type { UngradedHomeworkNotice } from "../../data/homework";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import type { Student } from "../../data/types";
import { formatTime } from "../../shared/format";
import CommentsPanel from "./CommentsPanel";
import SendTicketsDialog from "./SendTicketsDialog";
import { clearDraft, draftKey, readDraft, writeDraft } from "./draftStore";

/** sessionStorage giả cho môi trường node của vitest. */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

function renderPanel(sessionId: string, search = ""): string {
  const router = createMemoryRouter(
    [{ path: "/buoi/:sessionId", element: <CommentsPanel classId="6a" sessionId={sessionId} /> }],
    { initialEntries: [`/buoi/${sessionId}${search}`] },
  );
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

function students(...names: string[]): Student[] {
  return names.map((name) => ({
    id: name,
    classId: "6a",
    name,
    parentPhone: "",
    enrolledAt: "2026-09-01",
    leftAt: null,
    status: "active",
  }));
}

beforeEach(() => {
  replaceStore(createSeed());
  vi.stubGlobal(
    "sessionStorage",
    new MemoryStorage() as unknown as Storage,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Danh sách phiếu buổi 14/10 của lớp 6A (ảnh 40, 44, 47)", () => {
  it("có avatar, mức sao, trạng thái phiếu và tóm tắt BTVN buổi trước", () => {
    const html = renderPanel("6a-session-7", "?tab=nhan-xet");
    expect(html).toContain("Tất cả (9)");
    expect(html).toContain("Chưa chọn sao (6)");
    expect(html).toContain("Chưa gửi (8)");
    expect(html).toContain("Nguyễn Minh Anh");
    // avatar hai chữ đầu của hai từ cuối, cùng quy ước avatar toàn app.
    expect(html).toContain(">MA<");
    expect(html).toContain("Trần Gia Bảo");
    expect(html).toContain(
      `Đã gửi · ${formatTime("2026-10-14T13:14:00.000Z")}`,
    );
    expect(html).toContain("Chờ mạng");
    expect(html).toContain("Chưa chọn sao");
    expect(html).toContain("BTVN buổi 7: 2/2 phần đã chấm");
    expect(html).toContain("BTVN buổi 7: 1 phần Chưa chấm");
    expect(html).toContain("BTVN buổi 7: 2 phần Chưa chấm");
    expect(html).toContain("Gửi phiếu cả lớp (2)");
  });

  it("hiện băng thông tin và thẻ em đã rời lớp (ảnh 47)", () => {
    const html = renderPanel("6a-session-7", "?tab=nhan-xet");
    expect(html).toContain(
      "Phiếu của buổi chỉ gồm em đang học vào ngày đó. Buổi 8 có 9 em.",
    );
    expect(html).toContain("Đỗ Hải Nam");
    expect(html).toContain("Đã rời lớp · 9/10");
    expect(html).toContain(
      "Không có phiếu từ buổi 8. Phiếu buổi 7 trở về trước vẫn giữ.",
    );
    expect(html).toContain("Xem phiếu cũ của em");
    expect(html).toContain("/lop/6a/buoi-hoc/6a-session-5?tab=nhan-xet");
  });

  it("chạm một em mở sheet nháp của em đó (ảnh 41)", () => {
    const html = renderPanel(
      "6a-session-7",
      "?tab=nhan-xet&student=6a-student-2",
    );
    expect(html).toContain("Lê Khánh Chi");
    expect(html).toContain("Nhận xét buổi 8 · 14/10");
    expect(html).toContain("Nháp, chưa lưu");
    expect(html).toContain("Sao và ghi chú được giữ khi bạn đóng sheet.");
    expect(html).toContain("Câu mẫu cố định theo mức sao");
    expect(html).toContain("Con hoàn thành 2 sao");
    expect(html).toContain("Ghi chú");
    expect(html).toContain("BTVN buổi 7");
    expect(html).toContain("Luyện từ vựng");
    expect(html).toContain("Hoàn thành");
    expect(html).toContain("Chấm ở tab Bài tập về nhà");
    expect(html).toContain(">Lưu<");
  });

  it("sửa phiếu đã gửi giữ nhãn Đã gửi và báo phụ huynh thấy ngay (ảnh 42)", () => {
    const html = renderPanel(
      "6a-session-7",
      "?tab=nhan-xet&student=6a-student-1",
    );
    expect(html).toContain(
      `Đã gửi · ${formatTime("2026-10-14T13:14:00.000Z")}`,
    );
    expect(html).toContain("Phụ huynh thấy thay đổi ngay");
    expect(html).toContain(
      "Hôm nay con xung phong kể chuyện trước lớp rất tự tin.",
    );
    expect(html).not.toContain("Nháp, chưa lưu");
  });

  it("nháp trong sessionStorage được mở lại khi quay về từ tab BTVN", () => {
    writeDraft("6a-session-7", "6a-student-2", {
      stars: 1,
      note: "Nháp giữ khi đóng sheet",
    });
    const html = renderPanel(
      "6a-session-7",
      "?tab=nhan-xet&student=6a-student-2",
    );
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="1 sao"/);
    expect(html).toContain("Nháp giữ khi đóng sheet");
    expect(html).toContain("Con chỉ đạt 1 sao");
  });
});

describe("trạng thái đặc biệt của tab Nhận xét", () => {
  it("buổi đầu chưa có BTVN (ảnh 45)", () => {
    const html = renderPanel("6a-session-0", "?tab=nhan-xet");
    expect(html).toContain("Tất cả (10)");
    expect(html).toContain("Buổi đầu · chưa có BTVN buổi trước");
    expect(html).toContain("Gửi phiếu cả lớp (0)");
    expect(html).toContain('disabled=""');
  });

  it("buổi trước không giao BTVN (ảnh 46)", () => {
    const html = renderPanel("6a-session-6", "?tab=nhan-xet");
    expect(html).toContain("Buổi trước không giao BTVN");
  });
});

describe("Hộp xác nhận gửi cả lớp (ảnh 43)", () => {
  const ungraded: UngradedHomeworkNotice = {
    students: students("Phạm Đức Dũng", "Lê Khánh Chi"),
    ungradedParts: 3,
  };

  it("hiện số phiếu, số em chưa chọn sao, BTVN còn Chưa chấm và em chưa gửi được", () => {
    const html = renderToStaticMarkup(
      <SendTicketsDialog
        open
        sessionNumber={8}
        sendCount={5}
        skipped={students(
          "Lê Khánh Chi",
          "Phạm Đức Dũng",
          "Hoàng Thu Hà",
          "Vũ Quang Huy",
        )}
        ungraded={ungraded}
        previousSessionNumber={7}
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).toContain("Gửi phiếu buổi 8?");
    expect(html).toContain("phiếu sẽ gửi");
    expect(html).toContain("em chưa chọn sao");
    expect(html).toContain(
      "2 em · 3 phần BTVN buổi 7 còn “Chưa chấm”.",
    );
    expect(html).toContain("Vẫn gửi được. Phụ huynh thấy “Chưa chấm”");
    expect(html).toContain("một thông báo");
    expect(html).toContain(
      "Chưa gửi được: Lê Khánh Chi, Phạm Đức Dũng, Hoàng Thu Hà, Vũ Quang Huy. Chọn sao rồi gửi lại sau.",
    );
    expect(html).toContain("Gửi 5 phiếu");
    expect(html).toContain("Quay lại");
  });

  it("không còn bài chưa chấm thì không hiện khối cảnh báo", () => {
    const html = renderToStaticMarkup(
      <SendTicketsDialog
        open
        sessionNumber={8}
        sendCount={2}
        skipped={[]}
        ungraded={{ students: [], ungradedParts: 0 }}
        previousSessionNumber={null}
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(html).not.toContain("còn “Chưa chấm”");
    expect(html).not.toContain("Chưa gửi được");
    expect(html).toContain("Gửi 2 phiếu");
  });
});

describe("nháp theo buổi + em trong sessionStorage", () => {
  it("ghi, đọc và xoá nháp; dữ liệu hỏng thì bỏ qua", () => {
    writeDraft("6a-session-7", "6a-student-2", { stars: 3, note: "Nháp A" });
    expect(readDraft("6a-session-7", "6a-student-2")).toEqual({
      stars: 3,
      note: "Nháp A",
    });
    // Khoá tách theo buổi và theo em.
    expect(readDraft("6a-session-6", "6a-student-2")).toBeNull();
    expect(readDraft("6a-session-7", "6a-student-3")).toBeNull();

    globalThis.sessionStorage.setItem(
      draftKey("6a-session-7", "6a-student-4"),
      "không phải json",
    );
    expect(readDraft("6a-session-7", "6a-student-4")).toBeNull();

    clearDraft("6a-session-7", "6a-student-2");
    expect(readDraft("6a-session-7", "6a-student-2")).toBeNull();
  });
});
