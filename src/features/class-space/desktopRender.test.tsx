import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import SessionsDesktop from "./SessionsDesktop";
import SessionDetailDesktop from "./SessionDetailDesktop";
import TestsDesktop from "../scores/TestsDesktop";
import ScoreGridDesktop from "../scores/ScoreGridDesktop";
import StudentsDesktop from "../students/StudentsDesktop";
import HomeworkDesktop from "../homework/HomeworkDesktop";
import CommentsDesktop from "../comments/CommentsDesktop";
import { getSession } from "../../data/repositories/sessions";
import { getClass } from "../../data/repositories/classes";

/** Render một màn desktop trong data router (có Link/useLocation/useBlocker). */
function render(node: ReactNode, url = "/lop/6a/buoi-hoc"): string {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/*", element: node }],
    { initialEntries: [url] },
  );
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T12:00:00"));
  replaceStore(createSeed());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Các màn web desktop dựng được và có đúng chữ chính", () => {
  it("Buổi học: bảng đã qua, thẻ hiện tại, lịch lặp, không có điểm trung bình", () => {
    const html = render(<SessionsDesktop classId="6a" />);
    expect(html).toContain("Các buổi đã qua");
    expect(html).toContain("Buổi đã hủy");
    expect(html).toContain("Buổi hiện tại");
    expect(html).toContain("Lịch lặp");
    expect(html).toContain("Thêm buổi lẻ");
    expect(html).toContain("Chưa điểm danh");
    expect(html).not.toMatch(/trung bình/i);
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain("OTP");
  });

  it("Đầu trang lớp chỉ có tên lớp, nút và tab; thẻ Buổi hiện tại chỉ còn Xem buổi", () => {
    const html = render(<SessionsDesktop classId="6a" />);
    expect(html).not.toContain("Đường dẫn");
    expect(html).not.toMatch(/học sinh · .*hôm nay/);
    expect(html).toContain("Mục của lớp");
    const card = html.split("Buổi hiện tại")[1].split("</div>")[0];
    expect(card).toContain("Xem buổi");
    expect(card).not.toContain("Hủy buổi");
    expect(card).not.toContain("Sửa buổi lẻ");
  });

  it("Thẻ Buổi lẻ sắp tới chỉ còn Xem buổi", () => {
    const seed = createSeed();
    seed.sessions.push({
      id: "6a-extra-later",
      classId: "6a",
      date: "2099-01-01",
      time: "17:00",
      origin: "manual",
      status: "planned",
    });
    replaceStore(seed);
    const html = render(<SessionsDesktop classId="6a" />);
    const card = html.split("Buổi lẻ sắp tới")[1].split("Lịch lặp")[0];
    expect(card).toContain("Xem buổi");
    expect(card).not.toContain("Hủy buổi");
    expect(card).not.toContain("Sửa buổi lẻ");
  });

  it("Điểm danh: 4 trạng thái, ô giờ đến, nút lưu; không quản lý phân công", () => {
    const session = getSession("6a-session-7")!;
    const klass = getClass("6a")!;
    const html = render(
      <SessionDetailDesktop
          classId="6a"
          klass={klass}
          session={session}
        tab="diem-danh"
        onTab={() => {}}
        canWrite
        readOnly={false}
        onCancel={() => {}}
      />,
    );
    expect(html).toContain("Tất cả có mặt");
    expect(html).toContain("Lưu điểm danh");
    expect(html).toContain("Có mặt");
    expect(html).toContain("Muộn");
    expect(html).toContain("Có phép");
    expect(html).toContain("Vắng");
    expect(html).toContain("Giờ đến (nếu muộn)");
    expect(html).not.toContain("Người dạy");
    // Phân công nhân sự nằm ngoài MVP.
    expect(html).not.toContain("Đổi người dạy");
  });

  it("Nhận xét: danh sách + khung soạn phiếu cạnh nhau, không có bottom sheet", () => {
    const html = render(
      <CommentsDesktop sessionId="6a-session-7" tabBar={(actions) => <div>{actions}</div>} />,
    );
    expect(html).toContain("Gửi phiếu cả lớp");
    expect(html).toContain("Năm tiêu chí nhận xét");
      expect(html).toContain("Tự sinh theo tiêu chí");
      expect(html).toContain("Hoàn thành BTVN");
      expect(html).toContain("Theo chấm BTVN");
    expect(html).toContain("5/5 sao");
    expect(html).toContain("Đã gửi");
  });

  it("BTVN: chọn phần bên trái, chấm cả lớp bên phải, nút Lưu kết quả chấm", () => {
    const html = render(
      <HomeworkDesktop
        session={getSession("6a-session-8")!}
        tabBar={(actions) => <div>{actions}</div>}
      />,
    );
    expect(html).toContain("Chọn phần");
    expect(html).toContain("Luyện từ vựng · cả lớp");
    expect(html).toContain("Đánh dấu cả lớp");
    expect(html).toContain("Lưu kết quả chấm");
    expect(html).toContain("Chưa chấm");
  });

  it("Bài kiểm tra: bảng 4 cột không có điểm tối đa và có nút tạo bài", () => {
    const html = render(<TestsDesktop classId="6a" />, "/lop/6a/bai-kiem-tra");
    expect(html).toContain("Tên bài kiểm tra");
    expect(html).not.toContain("Điểm tối đa");
    expect(html).toContain("Đã có điểm");
    expect(html).toContain("Tạo bài kiểm tra");
  });

  it("Điểm: tiêu đề cột không ghi điểm tối đa, ô nhập trực tiếp, nút Lưu điểm", () => {
    const html = render(<ScoreGridDesktop classId="6a" />, "/lop/6a/diem");
    expect(html).toContain("Lưu điểm");
    expect(html).not.toMatch(/<b>\/\d+<\/b>/);
    expect(html).toContain("Chưa có điểm");
    expect(html).not.toContain("Vắng thi");
  });

  it("Học sinh: thông tin hồ sơ và không có quản lý mật khẩu phụ huynh", () => {
    const html = render(<StudentsDesktop classId="6a" />, "/lop/6a/hoc-sinh");
    expect(html).not.toContain("Cấp mật khẩu");
    expect(html).not.toContain("Cấp lại mật khẩu");
    expect(html).toContain(
      "Số điện thoại phụ huynh được lưu trong hồ sơ học sinh.",
    );
    expect(html).toContain("+ Thêm học sinh");
    expect(html).not.toContain("Thêm từ lớp khác");
  });
});
