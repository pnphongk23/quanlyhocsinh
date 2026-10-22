import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { MEMBER_IDS } from "../../data/defaults";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import type { WebSession } from "../../data/auth/session";
import {
  getChildMonthlyReport,
  getChildOverview,
  listMyChildren,
} from "../../data/repositories/guardian";
import { GuardianProvider } from "./guardianContext";
import { childScoresMonth } from "./guardianRead";
import GuardianOverviewPage from "./GuardianOverviewPage";
import GuardianAttendancePage from "./GuardianAttendancePage";
import GuardianScoresPage from "./GuardianScoresPage";
import GuardianCommentsPage from "./GuardianCommentsPage";
import GuardianTicketPage from "./GuardianTicketPage";
import GuardianHomeworkPage from "./GuardianHomeworkPage";
import GuardianReportPage from "./GuardianReportPage";

const CHILD_KEY = "guardian-selected-child-v1";
const authFixture = vi.hoisted(() => ({ session: null as WebSession | null }));
vi.mock("../../data/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../data/auth/session")>();
  return {
    ...actual,
    getSession: () => authFixture.session,
    subscribeSession: () => () => undefined,
  };
});

/** Tạo WebSession như GET /me, với students lấy từ seed và membership phụ huynh. */
function setGuardianSession(state: ReturnType<typeof createSeed>, hasChildren = true): void {
  const user = { id: "fixture-guardian", phone: "+84900000001", display_name: "Phụ huynh Fixture", must_change_password: false };
  const member = state.members.find((item) => item.id === MEMBER_IDS.lanGuardian)!;
  const role = state.roles.find((item) => item.id === member.roleId)!;
  const children = hasChildren
    ? (member.studentIds ?? []).flatMap((studentId) => {
      const student = state.students.find((item) => item.id === studentId);
      const klass = student && state.classes.find((item) => item.id === student.classId);
      return student && klass ? [{ id: student.id, name: student.name, class_id: student.classId, class_name: klass.name }] : [];
    })
    : [];
  const membership = {
    id: member.id,
    workspace: { id: "fixture-workspace", name: "Lớp phụ huynh Fixture" },
    role: { id: role.id, name: role.name, system_key: null, scope_kind: "linked_students" as const },
    status: "active" as const,
    scope_epoch: 1,
    permissions: role.permissions,
    students: children,
  };
  authFixture.session = {
    token: "fixture-token",
    user,
    activeMembershipId: membership.id,
    guardianAccount: true,
    me: { user, active_membership_id: membership.id, memberships: [membership] },
  };
}

/** Dữ liệu tổng hợp thật của fixture cùng phạm vi con từ danh sách students của membership. */
function seedGuardian(): void {
  const state = createSeed();
  replaceStore(state);
  setGuardianSession(state);
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
  authFixture.session = null;
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
  it("chuyên cần, lời cô, nhận xét mới nhất và điểm gần đây, không có trung bình", () => {
    seedGuardian();
    const html = renderPage(<GuardianOverviewPage />);
    expect(html).toContain("Tiếng Anh giao tiếp 6A · Tháng 10");
    expect(html).toContain("Tổng quan");
    expect(html).toContain("Đi học");
    expect(html).toContain("3/4");
    expect(html).toContain("buổi · 0 muộn, 1 có phép");
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
    expect(html).toContain("Điều cô muốn chia sẻ");
    expect(html).toContain("Nhận xét kiểm thử tổng hợp.");
    expect(html).toContain("Nhận xét mới nhất");
    expect(html).toContain("Buổi 8");
    expect(html).toContain(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
    expect(html).toContain("Ghi chú kiểm thử.");
    expect(html).toContain("Điểm gần đây");
    // Điểm từng bài trên thang của bài.
    expect(html).toContain("10.0/10");
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
    setGuardianSession(state);
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
    // Bảo Ngọc đi học đủ 4/4 buổi; fixture không có phiếu của em này.
    expect(second).toContain("4/4");
    expect(second).toContain("Nói");
    expect(second).toContain("7.0/10");
    expect(second).toContain("10.0/10");
    expect(second).not.toContain("Nhận xét mới nhất");
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

  it("nhóm Điểm bị tắt thì không hiện điểm gần đây", () => {
    const state = createSeed();
    state.roles = state.roles.map((role) =>
      role.kind === "guardian"
        ? { ...role, permissions: { ...role.permissions, scores: "none" } }
        : role,
    );
    replaceStore(state);
    setGuardianSession(state);
    const html = renderPage(<GuardianOverviewPage />);
    expect(html).toContain("Đi học");
    expect(html).not.toContain("Điểm gần đây");
    // Không có trung bình nào trong mọi trường hợp (quy tắc 3.1).
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
  });

  it("bài đã lưu trữ không vào điểm từng bài của con", () => {
    const state = createSeed();
    state.tests.find((test) => test.id === "6a-test-2")!.archived = true;
    replaceStore(state);
    setGuardianSession(state);
    const scores = childScoresMonth("6a-student-1", "2026-10");
    expect(scores.rows.map((row) => row.test.id)).toEqual([
      "6a-test-3",
      "6a-test-1",
    ]);
    const html = renderPage(<GuardianScoresPage />);
    expect(html).not.toContain("Nghe");
      expect(html).toContain("Nói");
      expect(html).toContain("9.0/10");
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
    expect(html).toContain("Luyện từ vựng · Hoàn thành");
    expect(html).toContain("Bài tập · Hoàn thành tốt");
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
    expect(html).toContain("Nhận xét của giáo viên");
    expect(html).toContain(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
      expect(html).toContain(
        "Ghi chú kiểm thử.",
    );
    expect(html).toContain("Kết quả BTVN buổi 7");
    expect(html).toContain("Từ vựng kiểm thử");
    expect(html).toContain("Hoàn thành");
    expect(html).toContain("Bài tập kiểm thử");
    expect(html).toContain("Hoàn thành tốt");
    expect(html).toContain("BTVN mới");
    expect(html).toContain("Cô chấm ở buổi 9 · Thứ Hai 19/10");
    expect(html).toContain("Buổi bù · 16/10 · Đã huỷ");
    expect(html).toContain("Từ vựng buổi 7");
    expect(html).toContain("Bài tập buổi 7");
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
    setGuardianSession(state);
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
      expect(html).toContain("Buổi 8 · 14/10");
      expect(html).toContain("Cô chấm ở buổi 9 · Thứ Hai 19/10");
      expect(html).toContain("Buổi bù · 16/10 · Đã huỷ");
      expect(html).toContain("Các buổi trước");
      expect(html).toContain("Buổi 7 · 12/10");
      expect(html).toContain("Từ vựng buổi 7");
      expect(html).toContain("Hoàn thành tốt");
      expect(html).toContain("Bài tập kiểm thử");
      expect(html).not.toContain("Buổi 10 · 25/10");
    expect(html.indexOf("Buổi 8 · 14/10")).toBeLessThan(
      html.indexOf("Buổi 7 · 12/10"),
    );
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
    setGuardianSession(state);
    const hidden = renderPath(
      "/ph/btvn/6a-session-7",
      "/ph/btvn/:sessionId",
      <GuardianHomeworkPage />,
    );
      expect(hidden).toContain("Từ vựng buổi 7");
    expect(hidden).not.toContain("Hoàn thành tốt");

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
    setGuardianSession(sent);
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
    expect(html).toContain("10.0/10");
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
    setGuardianSession(state);
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

  it("Điểm số: chỉ điểm từng bài của con dạng value/max, không có trung bình", () => {
    seedGuardian();
    const html = renderPage(<GuardianScoresPage />);
    expect(html).toContain("Điểm số");
    expect(html).toContain("Điểm từng bài");
    expect(html).toContain("3 bài có điểm");
    expect(html).toContain("Ngữ pháp");
    expect(html).toContain("8.0/10");
    expect(html).toContain("Nói");
    expect(html).toContain("10.0/10");
    expect(html).not.toContain("trung bình");
    expect(html).not.toContain("TB");
  });

  it("bài đã lưu trữ không vào điểm từng bài của con", () => {
    const state = createSeed();
    state.tests.find((test) => test.id === "6a-test-2")!.archived = true;
    replaceStore(state);
    setGuardianSession(state);
    const scores = childScoresMonth("6a-student-1", "2026-10");
    expect(scores.rows.map((row) => row.test.id)).toEqual([
      "6a-test-3",
      "6a-test-1",
    ]);
    const html = renderPage(<GuardianScoresPage />);
    expect(html).not.toContain("Nghe");
      expect(html).toContain("Nói");
      expect(html).toContain("9.0/10");
  });
});

describe("PH · chưa có con nào được liên kết", () => {
    /** Phiên phụ huynh chưa có membership students liên kết. */
    function seedGuardianWithoutChild(): void {
      const state = createSeed();
      replaceStore(state);
      const user = { id: "fixture-guardian", phone: "+84900000001", display_name: "Phụ huynh Fixture", must_change_password: false };
      authFixture.session = {
        token: "fixture-token",
        user,
        activeMembershipId: null,
        guardianAccount: true,
        me: { user, active_membership_id: null, memberships: [] },
      };
    }

  it("nói rõ SĐT chưa khớp hồ sơ nào và vẫn mở được Cài đặt/Đăng xuất", () => {
    seedGuardianWithoutChild();
    const html = renderPage(<GuardianOverviewPage />);
    expect(html).toContain("Chưa có con nào được liên kết");
    expect(html).toContain("chưa khớp hồ sơ học sinh nào");
    expect(html).toContain("+84 900 000 001");
    expect(html).toContain("nhập đúng số điện thoại này vào hồ sơ của con");
    expect(html).toContain("Cài đặt");
    expect(html).toContain("/cai-dat");
    expect(html).toContain("Đăng xuất");
    // Không lộ dữ liệu của em nào.
    expect(html).not.toContain("Trần Gia Bảo");
  });

  it("mọi màn phụ huynh dùng cùng trạng thái rỗng", () => {
    seedGuardianWithoutChild();
    for (const page of [
      <GuardianAttendancePage />,
      <GuardianScoresPage />,
      <GuardianHomeworkPage />,
      <GuardianReportPage />,
    ]) {
      const html = renderPage(page);
      expect(html).toContain("Chưa có con nào được liên kết");
      expect(html).toContain("Cài đặt");
      expect(html).toContain("Đăng xuất");
    }
  });
});
