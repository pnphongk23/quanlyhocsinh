import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { MEMBER_IDS } from "../../data/defaults";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { switchRole } from "../../data/repositories/access";
import {
  getChildMonthlyReport,
  getChildOverview,
  listMyChildren,
} from "../../data/repositories/guardian";
import { GuardianProvider } from "./guardianContext";
import GuardianOverviewPage from "./GuardianOverviewPage";
import GuardianAttendancePage from "./GuardianAttendancePage";
import GuardianScoresPage from "./GuardianScoresPage";
import GuardianCommentsPage from "./GuardianCommentsPage";
import GuardianTicketPage from "./GuardianTicketPage";
import GuardianHomeworkPage from "./GuardianHomeworkPage";
import GuardianReportPage from "./GuardianReportPage";

const CHILD_KEY = "guardian-selected-child-v1";

/** Dữ liệu mẫu + vai trò phụ huynh đang dùng (Cô Lan liên kết hai con lớp 6A). */
function seedGuardian(): void {
  replaceStore(createSeed());
  switchRole(MEMBER_IDS.lanGuardian);
}

/** Giả lập sessionStorage của trình duyệt cho môi trường node (SSR test). */
function storeSelectedChild(studentId: string): void {
  const map = new Map<string, string>([[CHILD_KEY, studentId]]);
  (globalThis as { sessionStorage?: Storage }).sessionStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: () => null,
    length: map.size,
  } as Storage;
}

afterEach(() => {
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
});

function renderPage(node: ReactElement): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <GuardianProvider>{node}</GuardianProvider>
    </MemoryRouter>,
  );
}

function renderPath(path: string, route: string, node: ReactElement): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <GuardianProvider>
        <Routes>
          <Route path={route} element={node} />
        </Routes>
      </GuardianProvider>
    </MemoryRouter>,
  );
}

describe("PH · Tổng quan (ảnh 15)", () => {
  it("chuyên cần, điểm trung bình, lời cô, nhận xét mới nhất và điểm gần đây", () => {
    seedGuardian();
    const html = renderPage(<GuardianOverviewPage />);
    expect(html).toContain("Tiếng Anh giao tiếp 6A · Tháng 10");
    expect(html).toContain("Tổng quan");
    expect(html).toContain("Đi học");
    expect(html).toContain("3/4");
    expect(html).toContain("buổi · 0 muộn, 1 có phép");
    expect(html).toContain("Điểm trung bình");
    expect(html).toContain("9.0");
    expect(html).toContain("▲ 2.0 so với tháng 9");
    expect(html).toContain("Điều cô muốn chia sẻ");
    expect(html).toContain("Tháng này con tiến bộ ở kỹ năng nghe");
    expect(html).toContain("Nhận xét mới nhất");
    expect(html).toContain("Buổi 8");
    expect(html).toContain(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
    expect(html).toContain(
      "Hôm nay con xung phong kể chuyện trước lớp rất tự tin.",
    );
    expect(html).toContain("Điểm gần đây");
    expect(html).toContain("Xem tất cả");
    // Không có nút sửa/gửi: phụ huynh chỉ đọc.
    expect(html).not.toContain("Lưu");
    expect(html).not.toContain("Gửi");
  });

  it("ẩn khối lời cô khi báo cáo đã phát hành không có nhận xét chung", () => {
    seedGuardian();
    const state = createSeed();
    state.reports = state.reports.map((report) =>
      report.id === "6a-student-1-report"
        ? { ...report, generalComment: "" }
        : report,
    );
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPage(<GuardianOverviewPage />);
    expect(html).not.toContain("Điều cô muốn chia sẻ");
    expect(html).toContain("Nhận xét mới nhất");
  });

  it("chip chuyển giữa hai con và chỉ thấy dữ liệu của con đang chọn", () => {
    seedGuardian();
    const chips = renderPage(<GuardianOverviewPage />);
    expect(chips).toContain("Gia Bảo");
    expect(chips).toContain("Bảo Ngọc");
    expect(chips).toContain("3/4");

    storeSelectedChild("6a-student-8");
    const second = renderPage(<GuardianOverviewPage />);
    // Em 8 đi học đủ 4/4 buổi, phiếu mới nhất có ghi chú riêng của em 8.
    expect(second).toContain("4/4");
    expect(second).toContain("Con chuẩn bị bài và xung phong phát biểu.");
    expect(second).not.toContain(
      "Hôm nay con xung phong kể chuyện trước lớp rất tự tin.",
    );
    expect(second).not.toContain("Con chưa tập trung ở phần luyện nói.");
  });

  it("phụ huynh chỉ đọc được con được liên kết", () => {
    seedGuardian();
    expect(listMyChildren().map((item) => item.student.id)).toEqual([
      "6a-student-8",
      "6a-student-1",
    ]);
    expect(() => getChildOverview("ielts-student-0", "2026-10")).toThrow(
      "Bạn không có quyền truy cập học sinh này.",
    );
  });

  it("nhóm Điểm bị tắt thì không hiện điểm trung bình hay điểm gần đây", () => {
    const state = createSeed();
    state.roles = state.roles.map((role) =>
      role.kind === "guardian"
        ? { ...role, permissions: { ...role.permissions, scores: "none" } }
        : role,
    );
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPage(<GuardianOverviewPage />);
    expect(html).toContain("Đi học");
    expect(html).not.toContain("Điểm trung bình");
    expect(html).not.toContain("Điểm gần đây");
    // Không có trung bình lớp trong mọi trường hợp (quy tắc 3.1).
    expect(html).not.toContain("Trung bình lớp");
  });
});

describe("PH · Nhận xét (ảnh 14)", () => {
  it("danh sách phiếu mới nhất trước, phiếu đầu có nhãn Mới", () => {
    seedGuardian();
    const html = renderPage(<GuardianCommentsPage />);
    expect(html).toContain("Nhận xét");
    expect(html).toContain(
      "Phiếu buổi học theo từng buổi: sao, câu mẫu, ghi chú và kết quả BTVN.",
    );
    expect(html).toContain("Mới");
    expect(html).toContain("Buổi 8 · 14 tháng 10");
    expect(html).toContain("Buổi 7 · 12 tháng 10");
    expect(html).toContain("Buổi 6 · 7 tháng 10");
    expect(html).toContain("Buổi 5 · 5 tháng 10");
    // Mới nhất trước: "Buổi 8" đứng trước "Buổi 7".
    expect(html.indexOf("Buổi 8 · 14 tháng 10")).toBeLessThan(
      html.indexOf("Buổi 7 · 12 tháng 10"),
    );
    expect(html).toContain("Kết quả BTVN buổi 7");
    expect(html).toContain("Luyện từ vựng · Hoàn thành tốt");
    expect(html).toContain("Bài tập · Hoàn thành");
    // Chưa chọn sao / đang chờ mạng của em khác không lọt vào màn phụ huynh.
    expect(html).not.toContain("Con cần luyện nghe thêm mỗi ngày.");
  });
});

describe("PH · Phiếu buổi học (ảnh 08)", () => {
  it("sao, câu mẫu, ghi chú, kết quả BTVN buổi trước và BTVN mới", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/nhan-xet/6a-session-7",
      "/ph/nhan-xet/:sessionId",
      <GuardianTicketPage />,
    );
    expect(html).toContain("Trần Gia Bảo · Tiếng Anh giao tiếp 6A");
    expect(html).toContain("Buổi 8 · Thứ Tư 14/10");
    expect(html).toContain("Nhận xét của Cô Lan");
    expect(html).toContain(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
    expect(html).toContain(
      "Hôm nay con xung phong kể chuyện trước lớp rất tự tin.",
    );
    expect(html).toContain("Kết quả BTVN buổi 7");
    expect(html).toContain("Unit 5 · 12 từ chủ đề Food");
    expect(html).toContain("Hoàn thành tốt");
    expect(html).toContain("Workbook trang 38–39");
    expect(html).toContain("BTVN mới");
    expect(html).toContain("Cô chấm ở buổi 9 · Thứ Hai 19/10");
    expect(html).toContain("Buổi bù · 16/10 · Đã huỷ");
    expect(html).toContain("Unit 6 · 15 từ chủ đề Travel");
    expect(html).toContain("Kể về chuyến đi gần nhất");
  });

  it("'Chưa chấm' khi phiếu buổi chấm đã gửi nhưng giáo viên chưa chấm", () => {
    seedGuardian();
    const state = createSeed();
    // Phiếu buổi 8 (19/10) đã gửi, phần Luyện từ vựng của buổi 14/10 chưa chấm.
    state.comments.push({
      id: "6a-student-1-comment-s9",
      classId: "6a",
      studentId: "6a-student-1",
      sessionId: "6a-session-8",
      stars: 3,
      note: "",
      status: "sent",
      sendQueued: false,
      sentAt: "2026-10-19T13:00:00.000Z",
      updatedAt: "2026-10-19T13:00:00.000Z",
      createdAt: "2026-10-19T13:00:00.000Z",
    });
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPath(
      "/ph/nhan-xet/6a-session-7",
      "/ph/nhan-xet/:sessionId",
      <GuardianTicketPage />,
    );
    expect(html).toContain("Kết quả BTVN buổi 7");
    expect(html).toContain("Chưa chấm");
    expect(html).toContain("Cô chấm xong là hiện ngay.");
  });

  it("phiếu chưa gửi thì phụ huynh không thấy mức sao", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/nhan-xet/6a-session-8",
      "/ph/nhan-xet/:sessionId",
      <GuardianTicketPage />,
    );
    expect(html).toContain("Cô chưa gửi phiếu buổi này");
    expect(html).not.toContain("Con hoàn thành 3 sao");
  });
});

describe("PH · Bài tập về nhà của con (ảnh 09, 34, 35)", () => {
  it("mới nhất trước: chưa có buổi chấm, buổi chấm bị hủy, kết quả đã gửi", () => {
    seedGuardian();
    const html = renderPage(<GuardianHomeworkPage />);
    expect(html).toContain("Bài tập về nhà");
    expect(html).toContain("Mới nhất");
    expect(html).toContain("Buổi 10 · 25/10");
    expect(html).toContain("Chưa có buổi chấm");
    expect(html).toContain("Cô sẽ báo khi có buổi chấm");
    expect(html).toContain("Các buổi trước");
    expect(html).toContain("Buổi 8 · 14/10");
    expect(html).toContain("Buổi 7 · 12/10");
    expect(html).toContain("Hoàn thành tốt");
    expect(html).toContain("Workbook trang 38–39");
    expect(html.indexOf("Buổi 10 · 25/10")).toBeLessThan(
      html.indexOf("Buổi 8 · 14/10"),
    );
  });

  it("kết quả chấm chưa gửi thì không hiện mức chấm", () => {
    seedGuardian();
    const state = createSeed();
    state.homeworkGrades.push({
      sectionId: "6a-hw-7-vocabulary",
      studentId: "6a-student-1",
      level: "excellent",
    });
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const hidden = renderPath(
      "/ph/btvn/6a-session-7",
      "/ph/btvn/:sessionId",
      <GuardianHomeworkPage />,
    );
    expect(hidden).toContain("Unit 6 · 15 từ chủ đề Travel");
    expect(hidden).not.toContain("Hoàn thành tốt");

    // Gửi phiếu buổi chấm (19/10) thì kết quả hiện ngay.
    const sent = createSeed();
    sent.homeworkGrades.push({
      sectionId: "6a-hw-7-vocabulary",
      studentId: "6a-student-1",
      level: "excellent",
    });
    sent.comments.push({
      id: "6a-student-1-comment-s9",
      classId: "6a",
      studentId: "6a-student-1",
      sessionId: "6a-session-8",
      stars: 3,
      note: "",
      status: "sent",
      sendQueued: false,
      sentAt: "2026-10-19T13:00:00.000Z",
      updatedAt: "2026-10-19T13:00:00.000Z",
      createdAt: "2026-10-19T13:00:00.000Z",
    });
    replaceStore(sent);
    switchRole(MEMBER_IDS.lanGuardian);
    expect(
      renderPath(
        "/ph/btvn/6a-session-7",
        "/ph/btvn/:sessionId",
        <GuardianHomeworkPage />,
      ),
    ).toContain("Hoàn thành tốt");
  });

  it("mở theo buổi chỉ hiện buổi đó, kèm buổi chấm bị hủy", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/btvn/6a-session-7",
      "/ph/btvn/:sessionId",
      <GuardianHomeworkPage />,
    );
    expect(html).toContain("Buổi 8 · 14/10");
    expect(html).toContain("Cô chấm ở buổi 9 · Thứ Hai 19/10");
    expect(html).toContain("Buổi bù · 16/10 · Đã huỷ");
    expect(html).not.toContain("Các buổi trước");
    expect(html).not.toContain("Buổi 10 · 25/10");
  });
});

describe("PH · Báo cáo tháng (ảnh 10)", () => {
  it("chuyên cần, điểm trung bình, sao 3/2/1 và bảng BTVN theo phần", () => {
    seedGuardian();
    const html = renderPage(<GuardianReportPage />);
    expect(html).toContain("Trần Gia Bảo");
    expect(html).toContain("Báo cáo tháng 10");
    expect(html).toContain("Tháng 10");
    expect(html).toContain("3 tháng gần nhất");
    expect(html).toContain("Chuyên cần");
    expect(html).toContain("3/4 buổi");
    expect(html).toContain("0 muộn");
    expect(html).toContain("Điểm trung bình");
    expect(html).toContain("9.0/10");
    expect(html).toContain("3 bài kiểm tra");
    expect(html).toContain("Nhận xét theo sao");
    expect(html).toContain("4 buổi có phiếu");
    expect(html).toContain("Tính trên các phiếu đã gửi.");
    expect(html).toContain("2 buổi");
    expect(html).toContain("1 buổi");
    expect(html).toContain("Bài tập về nhà");
    expect(html).toContain("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành");
    expect(html).toContain("Luyện từ vựng");
    expect(html).toContain(
      "Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.",
    );
    expect(html).toContain("Tải PDF về máy");
    expect(html).not.toContain("Điểm có cập nhật, cần phát hành lại");
  });

  it("cờ phát hành lại khi điểm có cập nhật", () => {
    seedGuardian();
    const state = createSeed();
    state.reports = state.reports.map((report) =>
      report.id === "6a-student-1-report"
        ? { ...report, needsRepublish: true }
        : report,
    );
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPage(<GuardianReportPage />);
    expect(html).toContain("Điểm có cập nhật, cần phát hành lại");
  });

  it("chưa phát hành thì phụ huynh không thấy báo cáo", () => {
    seedGuardian();
    storeSelectedChild("6a-student-8");
    const html = renderPage(<GuardianReportPage />);
    expect(html).toContain("Cô chưa phát hành báo cáo tháng này");
    expect(getChildMonthlyReport("6a-student-8", "2026-10")).toBeNull();
  });
});

describe("PH · Điểm danh và Điểm số (tối giản, dữ liệu thật của con)", () => {
  it("Điểm danh: thống kê tháng và trạng thái từng buổi của con", () => {
    seedGuardian();
    const html = renderPage(<GuardianAttendancePage />);
    expect(html).toContain("Điểm danh");
    expect(html).toContain("Tháng 10");
    expect(html).toContain("có mặt");
    expect(html).toContain("muộn");
    expect(html).toContain("có phép");
    expect(html).toContain("vắng");
    expect(html).toContain("Buổi 8 · Thứ Tư 14/10");
    expect(html).toContain("Có phép");
    expect(html).toContain("Buổi 7 · Thứ Hai 12/10");
    expect(html).toContain("Có mặt");
    // Không lộ dữ liệu của lớp hay em khác.
    expect(html).not.toContain("Nguyễn Minh Anh");
  });

  it("Điểm số: điểm từng bài của con và trung bình của con, không có TB lớp", () => {
    seedGuardian();
    const html = renderPage(<GuardianScoresPage />);
    expect(html).toContain("Điểm số");
    expect(html).toContain("Điểm trung bình tháng 10");
    expect(html).toContain("9.0");
    expect(html).toContain("Điểm từng bài");
    expect(html).toContain("Ngữ pháp");
    expect(html).toContain("8.0/10");
    expect(html).toContain("Nói");
    expect(html).toContain("10.0/10");
    expect(html).not.toContain("TB lớp");
    expect(html).not.toContain("Trung bình lớp");
  });
});
