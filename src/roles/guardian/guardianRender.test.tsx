import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { MEMBER_IDS } from "../../data/defaults";
import { createSeed } from "../../data/seed";
import { getStore, replaceStore } from "../../data/store";
import { switchRole } from "../../data/repositories/access";
import {
  getChildMonthlyReport,
  getChildOverview,
  listMyChildren,
} from "../../data/repositories/guardian";
import { GuardianProvider } from "./guardianContext";
import { childScoresMonth, childSessionFeed } from "./guardianRead";
import GuardianClassPage from "./GuardianClassPage";
import GuardianScoresPage from "./GuardianScoresPage";
import GuardianCommentsPage from "./GuardianCommentsPage";
import GuardianSessionPage from "./GuardianSessionPage";
import GuardianReportPage from "./GuardianReportPage";
import GuardianShell from "./GuardianShell";

const CHILD_KEY = "guardian-selected-child-v1";
const nativeShowModal = HTMLDialogElement.prototype.showModal;
const nativeCloseDialog = HTMLDialogElement.prototype.close;

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
  vi.restoreAllMocks();
  if (nativeShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: nativeShowModal });
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (nativeCloseDialog) Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: nativeCloseDialog });
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
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

describe("PH · Lớp học của con (tab 1)", () => {
    it("đầu lớp, số nhanh, hai lối vào và danh sách buổi theo tháng, không có trung bình", () => {
      seedGuardian();
      const state = createSeed();
      state.homeworkSections.push({ id: "fixture-upcoming-homework", sessionId: "6a-extra-session", kind: "reading", title: "Đọc bài", description: "" });
      replaceStore(state);
      switchRole(MEMBER_IDS.lanGuardian);
      const html = renderPage(<GuardianClassPage />);
      expect(html).toContain("Tiếng Anh giao tiếp 6A");
      expect(html).toContain("Thứ Hai, Thứ Tư · 18:00");
      expect(html).toContain("Giáo viên Cô Lan");
    expect(html).toContain("Chuyên cần tháng 10");
    expect(html).toContain("3/4");
    expect(html).toContain("buổi · 0 muộn, 1 có phép");
    expect(html).toContain("Bài kiểm tra mới nhất");
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
    // Lối vào Điểm và Báo cáo tháng dạng hàng.
    expect(html).toContain('href="/ph/diem"');
    expect(html).toContain('href="/ph/bao-cao"');
    expect(html).toContain("Báo cáo tháng");
    // Danh sách buổi: nhóm tháng, mới nhất trước, nhãn điểm danh, sao, Mới, buổi huỷ.
    expect(html).toContain("Tháng 10/2026");
    expect(html).toContain('href="/ph/buoi/6a-session-7"');
    expect(html).toContain("Buổi 8 · Thứ Tư 14/10");
    expect(html).toContain("Có phép");
    expect(html).toContain("Có mặt");
    expect(html).toContain("3 sao");
    expect(html).toContain("Mới");
    expect(html).toContain("Buổi bù · Thứ Sáu 16/10");
    expect(html).toContain("Đã huỷ");
    // Buổi sắp tới đã có BTVN vẫn vào danh sách để phụ huynh xem đề.
    expect(html).toContain('href="/ph/buoi/6a-extra-session"');
    expect(html).toContain("Sắp học");
    expect(html.indexOf("Buổi 8 · Thứ Tư 14/10")).toBeLessThan(
      html.indexOf("Buổi 7 · Thứ Hai 12/10"),
    );
    // Không còn tab Điểm danh riêng, không có nút sửa/gửi: phụ huynh chỉ đọc.
    expect(html).not.toContain("Lưu");
    expect(html).not.toContain("Gửi");
  });

  it("mở sheet Chọn con và đổi sang hồ sơ con đã liên kết", async () => {
    seedGuardian();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
    render(
      <MemoryRouter initialEntries={["/ph"]}>
        <Routes>
          <Route path="/ph" element={<GuardianShell />}>
            <Route index element={<GuardianClassPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Gia Bảo/ }));
    expect(await screen.findByRole("dialog", { name: "Chọn con" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Ngô Bảo Ngọc/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tiếng Anh giao tiếp 6A" })).toBeVisible());
    expect(screen.getByText("4/4")).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Chọn con" })).toBeNull();
  });

  it("danh sách buổi: điểm danh theo từng buổi của con, buổi huỷ không có số", () => {
    seedGuardian();
    const feed = childSessionFeed("6a-student-1");
    const eight = feed.find((item) => item.session.id === "6a-session-7");
    expect(eight).toMatchObject({ number: 8, attendance: "excused", stars: 3 });
    const cancelled = feed.filter((item) => item.cancelled);
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled[0]).toMatchObject({
      number: null,
      attendance: null,
      stars: null,
    });

      expect(
      feed.every(
        (item, index) =>
          index === 0 ||
          feed[index - 1].session.date >= item.session.date,
      ),
      ).toBe(true);
    });

    it("không hiện nhãn giáo viên khi teacher_name là null", () => {
      seedGuardian();
      getStore().classes.find((item) => item.id === "6a")!.teacherName = null;
      const html = renderPage(<GuardianClassPage />);
      expect(html).toContain("Thứ Hai, Thứ Tư · 18:00");
      expect(html).not.toContain("Giáo viên");
    });

  it("đầu trang có chip con và avatar tài khoản; bấm chip mở sheet Chọn con", () => {
    seedGuardian();
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/ph"]}>
        <Routes>
          <Route path="/ph" element={<GuardianShell />}>
            <Route index element={<GuardianClassPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(html).toContain("Gia Bảo");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("Chọn con");
    expect(html).toContain("Bảo Ngọc");
    expect(html).toContain('href="/cai-dat"');
    // Thanh tab chỉ 2 mục, tab Lớp học của con sáng.
    expect(html).toContain("Lớp học của con");
    expect(html).toContain("Nhận xét của cô");
    expect(html).not.toContain("Điểm danh</a>");
    expect(html).toMatch(/aria-current="page"[^>]*>(?:<svg.*?<\/svg>)Lớp học của con/s);
  });

  it("chọn con khác thì chỉ thấy dữ liệu của con đó", () => {
    seedGuardian();
    storeSelectedChild("6a-student-8");
    const second = renderPage(<GuardianClassPage />);
    // Em 8 đi học đủ 4/4 buổi.
    expect(second).toContain("4/4");
    expect(second).not.toContain("3/4");
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

  it("nhóm Điểm bị tắt thì không hiện điểm gần đây", () => {
    const state = createSeed();
    state.roles = state.roles.map((role) =>
      role.kind === "guardian"
        ? { ...role, permissions: { ...role.permissions, scores: "none" } }
        : role,
    );
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPage(<GuardianClassPage />);
    expect(html).toContain("Chuyên cần");
    expect(html).not.toContain("Bài kiểm tra mới nhất");
    expect(html).not.toContain('href="/ph/diem"');
    // Không có trung bình nào trong mọi trường hợp (quy tắc 3.1).
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
  });

  it("bài đã lưu trữ không vào điểm từng bài của con", () => {
    const state = createSeed();
    state.tests.find((test) => test.id === "6a-test-2")!.archived = true;
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const scores = childScoresMonth("6a-student-1", "2026-10");
    expect(scores.rows.map((row) => row.test.id)).toEqual([
      "6a-test-3",
      "6a-test-1",
    ]);
    const html = renderPage(<GuardianScoresPage />);
    expect(html).not.toContain("Nghe");
      expect(html).toContain("9/10");
      expect(scores.rows.map((row) => row.test.id)).not.toContain("6a-test-2");
  });
});

describe("PH · Nhận xét của cô (tab 2)", () => {
  it("dòng thời gian mới nhất trên cùng, nhóm theo tháng, có Lời cô, Mít chỉ ở mục mới nhất", () => {
    seedGuardian();
    const html = renderPage(<GuardianCommentsPage />);
    expect(html).toContain("Nhận xét của cô");
    expect(html).toContain("Tháng 10/2026");
    expect(html).toContain("Buổi 8 · 14 tháng 10");
    expect(html).toContain("Buổi 7 · 12 tháng 10");
    expect(html).toContain("Buổi 6 · 7 tháng 10");
    expect(html).toContain("Buổi 5 · 5 tháng 10");
    // Mới nhất trước: "Buổi 8" đứng trước "Buổi 7".
    expect(html.indexOf("Buổi 8 · 14 tháng 10")).toBeLessThan(
      html.indexOf("Buổi 7 · 12 tháng 10"),
    );
    // Lời cô của báo cáo tháng đã phát hành là một mục riêng theo ngày phát hành.
    expect(html).toContain("Lời cô · Báo cáo tháng 10");
      expect(html).toContain("Nhận xét kiểm thử tổng hợp.");
    expect(html.indexOf("Buổi 8 · 14 tháng 10")).toBeLessThan(
      html.indexOf("Lời cô · Báo cáo tháng 10"),
    );
    expect(html).toContain('href="/ph/buoi/6a-session-7"');
    expect(html).toContain('href="/ph/bao-cao"');
    // Mít (ảnh) chỉ ở phiếu mới nhất.
    expect(html.match(/<img/g)?.length ?? 0).toBe(1);
    // BTVN chuyển sang màn Buổi học; phiếu chưa chọn sao không lọt vào.
    expect(html).not.toContain("Kết quả BTVN");
    expect(html).not.toContain("Con cần luyện nghe thêm mỗi ngày.");
  });

  it("phiếu chưa gửi hoặc báo cáo chưa phát hành thì không có trong dòng thời gian", () => {
    seedGuardian();
    const state = createSeed();
    state.reports = state.reports.map((report) => ({
      ...report,
      status: "draft" as const,
      publishedAt: null,
    }));
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPage(<GuardianCommentsPage />);
    expect(html).not.toContain("Lời cô");
    expect(html).toContain("Buổi 8 · 14 tháng 10");
  });
});

describe("PH · Phiếu buổi học (ảnh 08)", () => {
  it("sao, câu mẫu, ghi chú, kết quả BTVN buổi trước và BTVN mới", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/buoi/6a-session-7",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Trần Gia Bảo · Tiếng Anh giao tiếp 6A");
    expect(html).toContain("Buổi 8 · Thứ Tư 14/10");
      expect(html).toContain("Nhận xét của Cô Lan");
    expect(html).toContain(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
      expect(html).toContain("Ghi chú kiểm thử.");
    expect(html).toContain("Kết quả BTVN buổi 7");
      expect(html).toContain("Từ vựng kiểm thử");
    expect(html).toContain("Hoàn thành tốt");
    expect(html).toContain("BTVN mới");
    expect(html).toContain("Cô chấm ở buổi 9 · Thứ Hai 19/10");
    expect(html).not.toContain("16/10 · Đã huỷ");
      expect(html).toContain("Từ vựng buổi 7");
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
      "/ph/buoi/6a-session-7",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Kết quả BTVN buổi 7");
    expect(html).toContain("Chưa chấm");
    expect(html).toContain("Cô chấm xong là hiện ngay.");
  });

  it("phiếu chưa gửi thì phụ huynh không thấy mức sao", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/buoi/6a-session-8",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Cô chưa gửi phiếu buổi này");
    expect(html).not.toContain("Con hoàn thành 3 sao");
  });
});

describe("PH · Buổi học: bài tập về nhà (ảnh 09, 34, 35)", () => {
  it("buổi giao bài mới nhất: chưa có buổi chấm, không có phiếu", () => {
    seedGuardian();
    const state = createSeed();
    state.homeworkSections.push({ id: "fixture-upcoming-homework", sessionId: "6a-extra-session", kind: "reading", title: "Đọc bài", description: "" });
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPath(
      "/ph/buoi/6a-extra-session",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Buổi 10 · Chủ nhật 25/10");
    expect(html).toContain("Đọc bài");
  });

  it("buổi đã huỷ hiện Đã huỷ ở đầu trang và không có phiếu hay điểm danh", () => {
    seedGuardian();
    const feed = childSessionFeed("6a-student-1");
    const cancelled = feed.find((item) => item.cancelled)!;
    const html = renderPath(
      `/ph/buoi/${cancelled.session.id}`,
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Buổi bù · Thứ Sáu 16/10");
    expect(html).toContain("Buổi này đã huỷ");
    expect(html.indexOf("Buổi này đã huỷ")).toBeLessThan(
      html.indexOf("hwCard") === -1 ? html.length : html.indexOf("hwCard"),
    );
    expect(html).not.toContain("Cô chưa gửi phiếu buổi này");
    expect(html).not.toContain("Điểm danh");
  });

  it("kết quả chấm chưa gửi thì không hiện mức chấm", () => {
    seedGuardian();
    const state = createSeed();
    state.homeworkGrades.push({
        sectionId: "fixture-hw-next-vocab",
      studentId: "6a-student-1",
      level: "excellent",
    });
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const hidden = renderPath(
      "/ph/buoi/6a-session-7",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
      expect(hidden).toContain("Từ vựng buổi 7");
    expect(hidden.slice(hidden.indexOf("BTVN mới"))).not.toContain(
      "Hoàn thành tốt",
    );

    // Gửi phiếu buổi chấm (19/10) thì kết quả hiện ngay.
    const sent = createSeed();
    sent.homeworkGrades.push({
        sectionId: "fixture-hw-next-vocab",
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
    const shown = renderPath(
      "/ph/buoi/6a-session-7",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(shown.slice(shown.indexOf("BTVN mới"))).toContain("Hoàn thành tốt");
  });

  it("mở theo buổi hiện buổi chấm bị huỷ nằm giữa", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/buoi/6a-session-7",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Cô chấm ở buổi 9 · Thứ Hai 19/10");
    expect(html).not.toContain("16/10 · Đã huỷ");
    expect(html).not.toContain("Các buổi trước");
  });
});

describe("PH · Báo cáo tháng (ảnh 10)", () => {
  it("chuyên cần, điểm từng bài, sao 3/2/1 và bảng BTVN theo phần", () => {
    seedGuardian();
    const html = renderPage(<GuardianReportPage />);
    expect(html).toContain("Trần Gia Bảo");
    expect(html).toContain("Báo cáo tháng 10");
    expect(html).not.toContain("3 tháng gần nhất");
    expect(html).toContain("Chuyên cần");
    expect(html).toContain("3/4 buổi");
    expect(html).toContain("0 muộn");
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
    expect(html).toContain("3/3 bài");
    // Điểm từng bài dạng value/max, bài chưa có điểm ghi rõ.
    expect(html).toContain("Điểm từng bài");
    expect(html).toContain("10/10");
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

describe("PH · Điểm danh trong Buổi học và Điểm số (dữ liệu thật của con)", () => {
  it("Buổi học: điểm danh của con ở buổi đó", () => {
    seedGuardian();
    const html = renderPath(
      "/ph/buoi/6a-session-7",
      "/ph/buoi/:sessionId",
      <GuardianSessionPage />,
    );
    expect(html).toContain("Điểm danh");
    expect(html).toContain("Có phép");
    // Không lộ dữ liệu của lớp hay em khác.
    expect(html).not.toContain("Nguyễn Minh Anh");
  });

  it("Điểm số: 10/10 và 7,5/10 không bao giờ hiện dạng 10.0 hay 7.5", () => {
    const state = createSeed();
    const childId = state.members.find(
      (member) => member.id === MEMBER_IDS.lanGuardian,
    )!.studentIds?.[0];
    const grammarId = state.tests.find((test) => test.name === "Ngữ pháp")!.id;
    state.scores = state.scores.map((score) =>
      score.studentId === childId && score.testId === grammarId
        ? { ...score, value: 7.5 }
        : score,
    );
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const html = renderPage(<GuardianScoresPage />);
    expect(html).toContain("10/10");
    expect(html).toContain("7,5/10");
    expect(html).not.toContain("10.0");
    expect(html).not.toContain("7.5");
  });

  it("Điểm số: chỉ điểm từng bài của con dạng value/max, không có trung bình", () => {
    seedGuardian();
    const html = renderPage(<GuardianScoresPage />);
    expect(html).toContain("Điểm số");
    expect(html).toContain("Điểm từng bài");
    expect(html).toContain("3 bài có điểm");
    expect(html).toContain("Ngữ pháp");
    expect(html).toContain("8/10");
    expect(html).toContain("Nói");
    expect(html).toContain("10/10");
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
  });

  it("bài đã lưu trữ không vào điểm từng bài của con", () => {
    const state = createSeed();
    state.tests.find((test) => test.id === "6a-test-2")!.archived = true;
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    const scores = childScoresMonth("6a-student-1", "2026-10");
    expect(scores.rows.map((row) => row.test.id)).toEqual([
      "6a-test-3",
      "6a-test-1",
    ]);
    const html = renderPage(<GuardianScoresPage />);
    expect(html).not.toContain("Nghe");
      expect(html).toContain("9/10");
      expect(scores.rows.map((row) => row.test.id)).not.toContain("6a-test-2");
  });
});

describe("PH · chưa có con nào được liên kết", () => {
  /** Phụ huynh đã đăng ký nhưng SĐT chưa khớp hồ sơ nào (spec mục 4). */
  function seedGuardianWithoutChild(): void {
    const state = createSeed();
    state.members = state.members.map((member) =>
      member.id === MEMBER_IDS.lanGuardian
        ? { ...member, studentIds: [] }
        : member,
    );
    state.auth = { phone: "900000001", memberIds: [MEMBER_IDS.lanGuardian] };
    state.activeMemberId = MEMBER_IDS.lanGuardian;
    replaceStore(state);
  }

    it("hiện trạng thái chưa có con và lối vào Cài đặt mà không lộ dữ liệu", () => {
    seedGuardianWithoutChild();
    const html = renderPage(<GuardianClassPage />);
    expect(html).toContain("Chưa có con nào được liên kết");
    expect(html).toContain("chưa khớp hồ sơ học sinh nào");
      expect(html).toContain("Cài đặt");
      expect(html).toContain("/cai-dat");
      expect(html).not.toContain("900 000 001");
    // Không lộ dữ liệu của em nào.
    expect(html).not.toContain("Trần Gia Bảo");
  });

  it("mọi màn phụ huynh dùng cùng trạng thái rỗng", () => {
    seedGuardianWithoutChild();
    for (const page of [
      <GuardianScoresPage />,
      <GuardianCommentsPage />,
      <GuardianSessionPage />,
      <GuardianReportPage />,
    ]) {
      const html = renderPage(page);
      expect(html).toContain("Chưa có con nào được liên kết");
      expect(html).toContain("Cài đặt");
    }
  });
});
