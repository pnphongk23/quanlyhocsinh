import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { MEMBER_IDS, ROLE_IDS } from "../../data/defaults";
import { publishReport, saveReportComment } from "../../data/repositories/reports";
import { createSeed } from "../../data/seed";
import { getStore, replaceStore } from "../../data/store";
import type { StoreState } from "../../data/types";
import ReportPreview from "./ReportPreview";
import ReportsPage from "./ReportsPage";
import { buildMonthlyStudentReport, type MonthlyStudentReport } from "./reportModel";

/** Bỏ các comment phân cách React chèn giữa hai text node khi render tĩnh. */
const text = (html: string) => html.replace(/<!-- -->/g, "");

function renderMarkup(node: React.ReactElement): string {
  const router = createMemoryRouter([{ path: "*", element: node }], {
    initialEntries: ["/lop/6a/bao-cao"],
  });
  return text(renderToStaticMarkup(<RouterProvider router={router} />));
}

function renderPage(): string {
  const router = createMemoryRouter(
    [{ path: "/lop/:classId/bao-cao", element: <ReportsPage /> }],
    { initialEntries: ["/lop/6a/bao-cao"] },
  );
  return text(renderToStaticMarkup(<RouterProvider router={router} />));
}

/** Báo cáo tháng 10 của một em dựng đúng bằng dữ liệu seed hiện tại. */
function monthlyReport(state: StoreState, studentId: string): MonthlyStudentReport {
  const student = state.students.find((item) => item.id === studentId);
  if (!student) throw new Error("Thiếu học sinh seed");
  const record = state.reports.find(
    (item) => item.studentId === studentId && item.month === "2026-10",
  );
  const report = buildMonthlyStudentReport(student, "2026-10", {
    sessions: state.sessions,
    attendance: state.attendance,
    tests: state.tests,
    scores: state.scores,
    comments: state.comments,
    homeworkSections: state.homeworkSections,
    homeworkGrades: state.homeworkGrades,
    generalComment: record?.generalComment ?? "",
  });
  if (!report) throw new Error("Không dựng được báo cáo tháng");
  return report;
}

function seedStore(): StoreState {
  const state = createSeed();
  replaceStore(state);
  return state;
}

describe("bản xem trước báo cáo tháng (ảnh 07)", () => {
  it("có khối sao, bảng BTVN theo phần, điểm từng bài và nhận xét chung", () => {
    const state = seedStore();
    const html = renderMarkup(
      <ReportPreview
        report={monthlyReport(state, "6a-student-1")}
        className="Tiếng Anh giao tiếp 6A"
        published
        canPublish
        onPublish={() => {}}
        onBack={() => {}}
      />,
    );
    // Tiêu đề + chuyên cần + trung bình (không có trung bình lớp).
    expect(html).toContain("Báo cáo tháng 10");
    expect(html).toContain("Xem trước · Trần Gia Bảo · Tiếng Anh giao tiếp 6A");
    expect(html).toContain("Chuyên cần");
    expect(html).toContain("Điểm trung bình");
    expect(html).toContain("/10");
    expect(html).not.toContain("Trung bình lớp");
    // Khối sao 3/2/1 theo số buổi có phiếu.
    expect(html).toContain("Nhận xét theo sao");
    expect(html).toContain("4 buổi có phiếu");
    expect(html).toContain("Tính trên các phiếu đã gửi.");
    expect(html).toContain("2 buổi");
    expect(html).toContain("1 buổi");
    expect(html).toContain('aria-label="3 sao"');
    expect(html).toContain('aria-label="1 sao"');
    // Bảng BTVN theo từng phần + chú thích không quy ra điểm.
    expect(html).toContain("Bài tập về nhà");
    expect(html).toContain("Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành");
    expect(html).toContain(">Phần<");
    expect(html).toContain(">Hoàn thành<");
    expect(html).toContain("Luyện từ vựng");
    expect(html).toContain("Bài tập");
    expect(html).toContain(
      "Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm.",
    );
    // Điểm từng bài + nhận xét chung.
    expect(html).toContain("Điểm từng bài");
    expect(html).toContain("Chưa có điểm không tính vào trung bình.");
    expect(html).toContain("Nhận xét chung");
    expect(html).toContain("Tháng này con tiến bộ ở kỹ năng nghe");
    expect(html).toContain("Phát hành lại");
    expect(html).not.toMatch(/vắng thi/i);
    expect(html).not.toContain("chưa nhập");
  });

  it("bài chưa có điểm hiện Chưa có điểm, không có Vắng thi", () => {
    const state = seedStore();
    // Em 3 (Phạm Đức Dũng) chưa có điểm bài "Nói" trong tháng 10.
    const html = renderMarkup(
      <ReportPreview
        report={monthlyReport(state, "6a-student-3")}
        className="Tiếng Anh giao tiếp 6A"
      />,
    );
    expect(html).toContain("Chưa có điểm");
    expect(html).not.toMatch(/vắng thi/i);
  });
});

describe("màn duyệt & phát hành báo cáo (ảnh 13)", () => {
  it("hiện tình trạng sẵn sàng/thiếu dữ liệu và ô nhận xét chung, không còn nút Nhận xét", () => {
    seedStore();
    const html = renderPage();
    expect(html).toContain("sẵn sàng");
    expect(html).toContain("thiếu dữ liệu");
    expect(html).toContain("đã phát hành");
    expect(html).toContain("Thiếu dữ liệu");
    expect(html).toContain("Thiếu nhận xét chung");
    expect(html).toContain("Đã phát hành · 12/10");
    expect(html).toContain("Nhận xét chung của tháng");
    expect(html).toContain('aria-label="Nhận xét chung của tháng"');
    // Không còn nút "Nhận xét" và khối "Nhận xét đã gửi" của bản cũ.
    expect(html).not.toMatch(/>\s*Nhận xét\s*</);
    expect(html).not.toContain("Nhận xét đã gửi");
    expect(html).not.toContain("Xem trước bản in");
    expect(html).not.toMatch(/vắng thi/i);
  });

  it("gợi ý nhận xét chung theo số buổi sao và nút dùng gợi ý", () => {
    const state = createSeed();
    // Đưa em có đủ ba mức sao lên đầu danh sách để mở sẵn em đó.
    const index = state.students.findIndex((item) => item.id === "6a-student-1");
    const [target] = state.students.splice(index, 1);
    state.students.unshift(target);
    replaceStore(state);

    const suggestion = monthlyReport(state, "6a-student-1").suggestion;
    expect(suggestion).toBe(
      "Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có 2 buổi 3 sao, 1 buổi 2 sao, 1 buổi 1 sao.",
    );
    const html = renderPage();
    expect(html).toContain("Dùng gợi ý làm bản nháp");
    expect(html).toContain(suggestion!);
    expect(html).not.toMatch(/vắng thi/i);
  });

  it("em còn thiếu dữ liệu hiện lý do và không được phát hành", () => {
    const state = seedStore();
    const slotHtml = renderPage();
    expect(slotHtml).toContain("Thiếu dữ liệu");
    expect(slotHtml).toContain("Phát hành báo cáo");
    expect(state.reports.find((item) => item.id === "6a-student-1-report")?.status).toBe(
      "published",
    );
  });

  it("lưu nhận xét chung xong thì em đó đủ dữ liệu để phát hành", () => {
    const state = seedStore();
    saveReportComment(
      "6a-student-0-report",
      "Con chăm chỉ và tiến bộ đều trong tháng 10.",
    );
    const html = renderPage();
    expect(html).toContain("Con chăm chỉ và tiến bộ đều trong tháng 10.");
    expect(html).toContain("<b>2/10</b> sẵn sàng");
    expect(html).not.toMatch(/vắng thi/i);
  });

  it("chỉ role có quyền Sửa mới thấy nút phát hành và nút dùng gợi ý", () => {
    const state = createSeed();
    state.activeMemberId = MEMBER_IDS.lanTeacher;
    const teacherRole = state.roles.find((role) => role.id === ROLE_IDS.teacher)!;
    teacherRole.permissions.comments_reports = "read";
    replaceStore(state);

    const html = renderPage();
    expect(html).toContain("Nhận xét chung của tháng");
    expect(html).not.toContain("Dùng gợi ý làm bản nháp");
    expect(html).not.toContain("Phát hành báo cáo");
    expect(html).not.toMatch(/>\s*Phát hành\s*</);
  });

  it("role không có nhóm Nhận xét và báo cáo thì không xem được màn", () => {
    const state = createSeed();
    state.auth?.memberIds.push(MEMBER_IDS.trang);
    state.activeMemberId = MEMBER_IDS.trang;
    state.members.find((member) => member.id === MEMBER_IDS.trang)!.classIds = ["6a"];
    replaceStore(state);
    const html = renderPage();
    expect(html).toContain("Bạn không có quyền xem báo cáo");
  });
});

describe("logic phát hành báo cáo", () => {
  it("phát hành báo cáo đã đủ dữ liệu, ghi ngày phát hành và hiện Đã phát hành", () => {
    const state = seedStore();
    state.reports.find((item) => item.id === "6a-student-0-report")!.generalComment =
      "Tháng này con tiến bộ rõ ở phần nghe.";
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
    });
    publishReport("6a-student-0-report");
    const saved = getStore().reports.find((item) => item.id === "6a-student-0-report");
    expect(saved?.status).toBe("published");
    expect(saved?.publishedAt).not.toBeNull();

    const html = renderPage();
    expect(html).toMatch(/Đã phát hành · \d{1,2}\/10/);
    expect(html).not.toMatch(/vắng thi/i);
  });
});
