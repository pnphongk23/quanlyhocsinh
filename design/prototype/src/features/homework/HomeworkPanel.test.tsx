import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  useParams,
} from "react-router-dom";
import { createSeed } from "../../data/seed";
import { replaceStore, useStore } from "../../data/store";
import type { HomeworkKind } from "../../data/types";
import HomeworkPanel from "./HomeworkPanel";
import type { HomeworkView } from "./homeworkModel";

function Harness({ initialView }: { initialView?: HomeworkView }) {
  const { sessionId = "" } = useParams();
  const state = useStore();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return <p>Không tìm thấy buổi học</p>;
  return <HomeworkPanel session={session} initialView={initialView} />;
}

function renderPanel(
  sessionId: string,
  options: { search?: string; initialView?: HomeworkView } = {},
): string {
  const router = createMemoryRouter(
    [
      {
        path: "/buoi/:sessionId",
        element: <Harness initialView={options.initialView} />,
      },
    ],
    { initialEntries: [`/buoi/${sessionId}${options.search ?? ""}`] },
  );
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

function withExtraSection(
  sessionId: string,
  kind: HomeworkKind,
  title: string,
): void {
  const state = createSeed();
  state.homeworkSections.push({
    id: `test-${sessionId}-${kind}`,
    sessionId,
    kind,
    title,
    description: "",
  });
  replaceStore(state);
}

beforeEach(() => {
  replaceStore(createSeed());
});

describe("Tab Bài tập về nhà · Bài tập buổi trước (ảnh 50, 59)", () => {
  it("hiện BTVN buổi trước, chip theo loại, số đã chấm và ba mức", () => {
    const html = renderPanel("6a-session-7");
    expect(html).toContain("BTVN buổi 7 · 12/10");
    expect(html).toContain(
      "Chấm hôm nay ở buổi 8. Kết quả gửi kèm phiếu.",
    );
    expect(html).toContain("Luyện từ vựng");
    expect(html).toContain("Bài tập");
    // Buổi trước chỉ giao 2 phần, không bịa chip cho loại chưa giao.
    expect(html).not.toContain("Luyện đọc");
    expect(html).toContain("8/9 em đã chấm");
    expect(html).toContain("1 còn Chưa chấm");
    expect(html).toContain("Đánh dấu cả lớp: Hoàn thành");
    expect(html).toContain("Hoàn thành tốt");
    expect(html).toContain("Hoàn thành");
    expect(html).toContain("Chưa hoàn thành");
    expect(html).toContain("Nguyễn Minh Anh");
    expect(html).toContain("Phạm Đức Dũng");
    // Em đã rời lớp không còn trong danh sách chấm.
    expect(html).not.toContain("Đỗ Hải Nam");
  });

  it("em vắng buổi giao bài có nhãn riêng và vẫn chấm được", () => {
    const html = renderPanel("6a-session-7");
    expect(html).toContain("Vắng buổi giao bài");
    expect(html).toContain("Chưa chấm");
    // Nút chấm của em vắng không bị khoá.
    expect(html).not.toMatch(/aria-label="Chấm bài của Nguyễn Minh Anh"[\s\S]*?disabled/);
  });

  it("?part= chọn sẵn phần cần chấm", () => {
    const html = renderPanel("6a-session-7", {
      search: "?tab=btvn&part=exercise",
    });
    expect(html).toContain("Workbook trang 38–39");
    expect(html).toContain("7/9 em đã chấm");
    expect(html).not.toContain("Unit 5 · 12 từ chủ đề Food");
  });

  it("buổi đầu: chưa có BTVN buổi trước (ảnh 55)", () => {
    const html = renderPanel("6a-session-0");
    expect(html).toContain("Buổi đầu, chưa có BTVN buổi trước");
    expect(html).toContain(
      "Lớp chưa giao bài nào nên chưa có gì để chấm.",
    );
    expect(html).toContain("Giao BTVN ở Bài tập hôm nay");
    expect(html).not.toContain("Đánh dấu cả lớp");
  });

  it("buổi trước không giao BTVN (ảnh 56)", () => {
    const html = renderPanel("6a-session-1");
    expect(html).toContain("Buổi trước không giao BTVN");
    expect(html).toContain(
      "Không có phần nào để chấm ở buổi này. Phiếu vẫn gửi bình thường.",
    );
    expect(html).not.toContain("Đánh dấu cả lớp");
  });
});

describe("Tab Bài tập về nhà · Bài tập hôm nay (ảnh 51, 53, 57, 58)", () => {
  it("hiện các phần đã giao, số phần và nút thêm còn loại", () => {
    const html = renderPanel("6a-session-7", { initialView: "today" });
    expect(html).toContain("BTVN giao hôm nay");
    expect(html).toContain("Một lần cho cả lớp · 3/4 phần · ");
    expect(html).toContain("chấm ở buổi 9");
    expect(html).not.toContain("Đã lưu · phụ huynh đã thấy");
    expect(html).toContain("Unit 6 · 15 từ chủ đề Travel");
    expect(html).toContain("Kể về chuyến đi gần nhất");
    expect(html).toContain("Workbook trang 42–43");
    expect(html).toContain("Sửa phần Luyện từ vựng");
    expect(html).toContain("còn 1 loại");
  });

  it("báo buổi chấm bị hủy và chuyển buổi (ảnh 57)", () => {
    const html = renderPanel("6a-session-7", { initialView: "today" });
    expect(html).toContain(
      "Buổi 16/10 đã bị hủy. BTVN buổi 8 chấm ở buổi 9 · Thứ Hai 19/10. Phụ huynh thấy thay đổi này.",
    );
  });

  it("buổi cuối chưa có buổi chấm (ảnh 58)", () => {
    const html = renderPanel("ielts-session-8", { initialView: "today" });
    expect(html).toContain(
      "Lịch lớp không còn buổi nào sau buổi 9. Phụ huynh thấy “Chưa có buổi chấm” cho tới khi bạn thêm buổi vào lịch.",
    );
    expect(html).toContain("Một lần cho cả lớp · 2/4 phần · ");
    expect(html).toContain("Chưa có buổi chấm");
    expect(html).toContain("Unit 7 · 15 từ chủ đề Health");
    expect(html).toContain("còn 2 loại");
  });

  it("không có nút Thêm buổi vào lịch ở tab Bài tập về nhà", () => {
    expect(renderPanel("ielts-session-8", { initialView: "today" })).not.toContain(
      "Thêm buổi vào lịch",
    );
    expect(renderPanel("6a-session-7", { initialView: "today" })).not.toContain(
      "Thêm buổi vào lịch",
    );
  });

  it("đủ bốn loại thì ẩn nút Thêm phần", () => {
    withExtraSection("6a-session-7", "reading", "Đọc truyện The Lost Key");
    const html = renderPanel("6a-session-7", { initialView: "today" });
    expect(html).toContain("4/4 phần");
    expect(html).toContain("Đọc truyện The Lost Key");
    expect(html).not.toContain("Thêm phần");
  });
});

describe("Tab Bài tập về nhà · điều hướng và buổi hủy (ảnh 62)", () => {
  it("có ?from= thì hiện thanh quay lại nhận xét", () => {
    const html = renderPanel("6a-session-7", {
      search: "?tab=btvn&from=6a-student-1",
    });
    expect(html).toContain("Quay lại nhận xét Trần Gia Bảo");
  });

  it("không có ?from= thì không hiện thanh quay lại", () => {
    const html = renderPanel("6a-session-7");
    expect(html).not.toContain("Quay lại nhận xét");
  });

  it("buổi đã hủy: chỉ hiện thông báo, không giao và không chấm", () => {
    const html = renderPanel("6a-extra-cancelled");
    expect(html).toContain(
      "Buổi học đã hủy nên không giao hoặc chấm bài tập",
    );
    expect(html).not.toContain("Bài tập buổi trước");
    expect(html).not.toContain("Bài tập hôm nay");
    expect(html).not.toContain("Đánh dấu cả lớp");
    expect(html).not.toContain("Thêm phần");
  });
});
