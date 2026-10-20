import { describe, expect, it } from "vitest";
import {
  DELETE_ALLOWED_MESSAGE,
  addPartLabel,
  canDeleteSection,
  commentsSearch,
  deleteBlockedMessage,
  gradePillLabel,
  initialsOf,
  nextGrade,
  parseHomeworkKind,
  partsCountLabel,
  previousEmptyCopy,
} from "./homeworkModel";

describe("Mô hình tab Bài tập về nhà", () => {
  it("chạm lại mức đang chọn thì bỏ chấm (về Chưa chấm)", () => {
    expect(nextGrade(null, "done")).toBe("done");
    expect(nextGrade("done", "done")).toBeNull();
    expect(nextGrade("excellent", "not_done")).toBe("not_done");
  });

  it("chỉ xoá được phần chưa chấm cho em nào", () => {
    expect(canDeleteSection(0)).toBe(true);
    expect(canDeleteSection(1)).toBe(false);
    expect(DELETE_ALLOWED_MESSAGE).toBe("Chưa chấm cho em nào nên xoá được.");
    expect(deleteBlockedMessage(6)).toBe(
      "Đã chấm cho 6 em nên không xoá được. Vẫn sửa được tiêu đề và mô tả.",
    );
  });

  it("nút Thêm phần ẩn khi đã đủ bốn loại", () => {
    expect(addPartLabel(["reading"])).toBe("còn 1 loại");
    expect(addPartLabel(["reading", "speaking"])).toBe("còn 2 loại");
    expect(addPartLabel([])).toBeNull();
  });

  it("nhãn số phần và trạng thái chấm", () => {
    expect(partsCountLabel(3)).toBe("3/4 phần");
    expect(partsCountLabel(0)).toBe("0/4 phần");
    expect(gradePillLabel(0, 9)).toBe("Chưa chấm");
    expect(gradePillLabel(8, 9)).toBe("Đã chấm 8/9");
  });

  it("đọc ?part hợp lệ, bỏ giá trị lạ", () => {
    expect(parseHomeworkKind("reading")).toBe("reading");
    expect(parseHomeworkKind("exercise")).toBe("exercise");
    expect(parseHomeworkKind("bogus")).toBeNull();
    expect(parseHomeworkKind(null)).toBeNull();
  });

  it("quay lại nhận xét giữ tham số khác và bỏ from/part", () => {
    const search = commentsSearch(
      new URLSearchParams("tab=btvn&from=6a-student-1&part=exercise&x=1"),
      "6a-student-1",
    );
    const next = new URLSearchParams(search);
    expect(next.get("tab")).toBe("nhan-xet");
    expect(next.get("student")).toBe("6a-student-1");
    expect(next.get("x")).toBe("1");
    expect(next.has("from")).toBe(false);
    expect(next.has("part")).toBe(false);
  });

  it("avatar lấy hai chữ đầu của hai từ cuối", () => {
    expect(initialsOf("Nguyễn Minh Anh")).toBe("MA");
    expect(initialsOf("Lê Khánh Chi")).toBe("KC");
    expect(initialsOf("  Đỗ Hải Nam ")).toBe("HN");
  });

  it("câu chữ hai trạng thái rỗng đúng ảnh 55/56", () => {
    expect(previousEmptyCopy("first")).toEqual({
      title: "Buổi đầu, chưa có BTVN buổi trước",
      body: "Lớp chưa giao bài nào nên chưa có gì để chấm.",
    });
    expect(previousEmptyCopy("none-given")).toEqual({
      title: "Buổi trước không giao BTVN",
      body: "Không có phần nào để chấm ở buổi này. Phiếu vẫn gửi bình thường.",
    });
  });
});
