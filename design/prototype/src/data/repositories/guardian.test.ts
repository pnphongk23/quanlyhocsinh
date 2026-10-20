import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import { MEMBER_IDS, ROLE_IDS } from "../defaults";
import type { StoreState } from "../types";
import { switchRole } from "./access";
import { saveSessionComment } from "./comments";
import { setHomeworkGrade } from "./homework";
import { saveScore } from "./scores";
import { publishReport, saveReport, saveReportComment } from "./reports";
import {
  GUARDIAN_PERMISSION_ERROR,
  STUDENT_ACCESS_ERROR,
  getChildHomework,
  getChildMonthlyReport,
  getChildOverview,
  getChildTicket,
  listChildTickets,
  listMyChildren,
} from "./guardian";

const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

/** Dựng lại store mẫu; `mutate` chạy trước khi đặt vai trò phụ huynh. */
function withStore(mutate?: (state: StoreState) => void): void {
  const state = createSeed();
  mutate?.(state);
  state.activeMemberId = MEMBER_IDS.lanGuardian;
  replaceStore(state);
}

/** Đổi vai trò đang dùng trên store hiện tại (giữ nguyên dữ liệu đã ghi). */
const actAsGuardian = () => switchRole(MEMBER_IDS.lanGuardian);
const actAsTeacher = () => switchRole(MEMBER_IDS.lanTeacher);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 20, 12));
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: true });
  replaceStore(createSeed());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Phạm vi phụ huynh", () => {
  it("chỉ trả con được liên kết", () => {
    withStore();
    // Sắp theo tên: "Ngô Bảo Ngọc" trước "Trần Gia Bảo".
    expect(listMyChildren().map((child) => child.student.id)).toEqual([
      "6a-student-8",
      "6a-student-1",
    ]);
    expect(listMyChildren().map((child) => child.className)).toEqual([
      "Tiếng Anh giao tiếp 6A",
      "Tiếng Anh giao tiếp 6A",
    ]);
  });

  it("từ chối học sinh không phải con và vai trò không phải phụ huynh", () => {
    withStore();
    expect(() => listChildTickets("6a-student-0")).toThrow(
      STUDENT_ACCESS_ERROR,
    );
    expect(() => getChildTicket("6a-student-0", "6a-session-7")).toThrow(
      STUDENT_ACCESS_ERROR,
    );
    expect(() => getChildHomework("ielts-student-0")).toThrow(
      STUDENT_ACCESS_ERROR,
    );
    expect(() => getChildOverview("6a-student-2", "2026-10")).toThrow(
      STUDENT_ACCESS_ERROR,
    );
    expect(() => getChildMonthlyReport("6a-student-2", "2026-10")).toThrow(
      STUDENT_ACCESS_ERROR,
    );

    actAsTeacher();
    expect(() => listMyChildren()).toThrow(GUARDIAN_PERMISSION_ERROR);
    expect(() => listChildTickets("6a-student-1")).toThrow(
      GUARDIAN_PERMISSION_ERROR,
    );
  });

  it("tắt nhóm quyền Nhận xét và báo cáo thì không trả phiếu hay báo cáo", () => {
    withStore((state) => {
      const role = state.roles.find((item) => item.id === ROLE_IDS.guardian)!;
      role.permissions.comments_reports = "none";
    });
    expect(() => listChildTickets("6a-student-1")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    expect(() => getChildMonthlyReport("6a-student-1", "2026-10")).toThrow(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    // Tổng quan vẫn mở nhưng ẩn phần nhận xét.
    const overview = getChildOverview("6a-student-1", "2026-10");
    expect(overview?.latestComment).toBeNull();
    expect(overview?.teacherNote).toBeNull();
  });
});

describe("Phiếu buổi học của con", () => {
  it("chỉ trả phiếu đã gửi, mới nhất trước, kèm số buổi, câu mẫu và ghi chú", () => {
    withStore();
    const tickets = listChildTickets("6a-student-1");
    // 4 phiếu đã gửi trong tháng 10 + 1 phiếu đã gửi ở buổi 14/10.
    expect(tickets.length).toBeGreaterThanOrEqual(4);
    const dates = tickets.map((ticket) => ticket.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    const latest = tickets[0];
    expect(latest).toMatchObject({
      session: expect.objectContaining({ id: "6a-session-7" }),
      sessionNumber: 8,
      date: "2026-10-14",
      stars: 3,
      template:
        "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
      note: "Hôm nay con xung phong kể chuyện trước lớp rất tự tin.",
      sentAt: "2026-10-14T13:14:00.000Z",
    });
  });

  it("không thấy phiếu nháp của giáo viên", () => {
    withStore((state) => {
      const draft = state.comments.find(
        (item) => item.id === "6a-student-1-comment-s8",
      )!;
      draft.status = "draft";
      draft.sentAt = null;
    });
    expect(getChildTicket("6a-student-1", "6a-session-7")).toBeNull();
    expect(
      listChildTickets("6a-student-1").some(
        (ticket) => ticket.session.id === "6a-session-7",
      ),
    ).toBe(false);
  });

  it("phiếu đã gửi có kết quả chấm BTVN buổi trước, chưa chấm thì level null", () => {
    withStore();
    const ticket = getChildTicket("6a-student-1", "6a-session-7")!;
    expect(ticket.homework.sessionNumber).toBe(7);
    expect(
      ticket.homework.sections.map((item) => [item.kind, item.level]),
    ).toEqual([
      ["vocabulary", "excellent"],
      ["exercise", "done"],
    ]);
  });

  it("sửa phiếu sau khi gửi thì phụ huynh thấy ngay", () => {
    withStore();
    actAsTeacher();
    saveSessionComment({
      sessionId: "6a-session-7",
      studentId: "6a-student-1",
      stars: 2,
      note: "Ghi chú mới sau khi gửi.",
    });
    actAsGuardian();
    expect(getChildTicket("6a-student-1", "6a-session-7")).toMatchObject({
      stars: 2,
      note: "Ghi chú mới sau khi gửi.",
    });
  });
});

describe("BTVN của con", () => {
  it("thấy đề ngay khi giáo viên lưu, kết quả chấm chỉ hiện khi phiếu buổi chấm đã gửi", () => {
    withStore();
    const [latest] = getChildHomework("6a-student-1", "6a-session-7");
    expect(latest.session.id).toBe("6a-session-7");
    expect(latest.sections.map((item) => item.section.title)).toEqual([
      "Unit 6 · 15 từ chủ đề Travel",
      "Kể về chuyến đi gần nhất",
      "Workbook trang 42–43",
    ]);
    // Buổi chấm 19/10 chưa gửi phiếu → chưa hiện kết quả.
    expect(latest.grading).toMatchObject({
      state: "moved",
      session: expect.objectContaining({ id: "6a-session-8" }),
    });
    expect(latest.grading.cancelled.map((item) => item.session.id)).toEqual([
      "6a-extra-cancelled",
    ]);
    expect(latest.sections.every((item) => !item.graded && item.level === null)).toBe(
      true,
    );

    // Buổi 12/10 chấm ở buổi 14/10 đã gửi phiếu → hiện kết quả.
    const [previous] = getChildHomework("6a-student-1", "6a-session-6");
    expect(previous.sections.map((item) => [item.kind, item.level])).toEqual([
      ["vocabulary", "excellent"],
      ["exercise", "done"],
    ]);
    expect(previous.sections.every((item) => item.graded)).toBe(true);
  });

  it("chấm hoặc sửa kết quả sau khi gửi thì phụ huynh thấy ngay", () => {
    withStore();
    actAsTeacher();
    setHomeworkGrade("6a-hw-6-exercise", "6a-student-1", "not_done");
    actAsGuardian();
    const [entry] = getChildHomework("6a-student-1", "6a-session-6");
    expect(
      entry.sections.find((item) => item.kind === "exercise")?.level,
    ).toBe("not_done");
  });

  it("buổi cuối chưa có buổi chấm", () => {
    withStore();
    const [entry] = getChildHomework("6a-student-1", "6a-extra-session");
    expect(entry.grading).toMatchObject({
      state: "none",
      session: null,
      sessionNumber: null,
      cancelled: [],
    });
    expect(entry.sections).toHaveLength(1);
    expect(entry.sections[0].level).toBeNull();
  });

  it("không truyền buổi thì trả mọi buổi có BTVN, mới nhất trước", () => {
    withStore();
    const entries = getChildHomework("6a-student-1");
    const dates = entries.map((entry) => entry.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(entries.map((entry) => entry.session.id)).toContain("6a-session-6");
    expect(entries.map((entry) => entry.session.id)).toContain(
      "6a-extra-session",
    );
    // Buổi đã hủy không có BTVN.
    expect(entries.map((entry) => entry.session.id)).not.toContain(
      "6a-extra-cancelled",
    );
  });

  it("buổi không có BTVN hoặc buổi của lớp khác trả rỗng", () => {
    withStore();
    expect(getChildHomework("6a-student-1", "6a-session-0")).toEqual([]);
    expect(getChildHomework("6a-student-1", "ielts-session-8")).toEqual([]);
  });
});

describe("Tổng quan của con", () => {
  it("trả chuyên cần, nhận xét mới nhất và điểm gần đây, không còn trường trung bình", () => {
    withStore();
    const overview = getChildOverview("6a-student-1", "2026-10")!;
    expect(overview.className).toBe("Tiếng Anh giao tiếp 6A");
    expect(overview.attendance).toEqual({
      attended: 3,
      total: 4,
      late: 0,
      excused: 1,
      absent: 0,
    });
    // Không còn trung bình và chênh lệch trung bình tháng trước.
    expect(overview).not.toHaveProperty("average");
    expect(overview).not.toHaveProperty("previousMonthAverage");
    expect(overview).not.toHaveProperty("averageChange");
    expect(overview.latestComment?.session.id).toBe("6a-session-7");
    const dates = overview.recentScores.map((item) => item.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    // Đúng điểm của con, không lẫn em khác và không lộ trung bình lớp.
    expect(
      overview.recentScores.map((item) => [item.test.id, item.value]),
    ).toEqual([
      ["6a-test-3", 10],
      ["6a-test-2", 9],
      ["6a-test-1", 8],
      ["6a-test-0", 7],
    ]);
    // "Điều cô muốn chia sẻ": nhận xét chung của báo cáo đã phát hành mới nhất.
    expect(overview.teacherNote).toContain("Tháng này con tiến bộ");
  });

  it("bài đã lưu trữ không vào điểm gần đây của con", () => {
    withStore((state) => {
      state.tests.find((test) => test.id === "6a-test-3")!.archived = true;
    });
    const overview = getChildOverview("6a-student-1", "2026-10")!;
    expect(overview.recentScores.map((item) => item.test.id)).toEqual([
      "6a-test-2",
      "6a-test-1",
      "6a-test-0",
    ]);
  });

  it("không lẫn điểm của em khác trong lớp", () => {
    withStore();
    const overview = getChildOverview("6a-student-1", "2026-10")!;
    const own = getStore().scores.filter(
      (score) => score.studentId === "6a-student-1",
    );
    expect(overview.recentScores).toHaveLength(
      own.filter((score) => score.value !== null).length,
    );
  });

  it("lời nhắn của giáo viên lấy nhận xét chung của báo cáo đã phát hành mới nhất", () => {
    withStore((state) => {
      // Báo cáo tháng 9 cũ hơn đã phát hành: vẫn lấy tháng 10 (mới nhất).
      state.reports.push({
        id: "6a-student-1-report-2026-09",
        classId: "6a",
        studentId: "6a-student-1",
        month: "2026-09",
        status: "published",
        needsRepublish: false,
        generalComment: "Nhận xét chung tháng 9.",
        publishedAt: "2026-10-02T09:00:00.000Z",
      });
    });
    expect(getChildOverview("6a-student-1", "2026-10")?.teacherNote).toContain(
      "Tháng này con tiến bộ",
    );
  });

  it("lời nhắn lấy báo cáo phát hành gần nhất khi tháng đang xem chưa có báo cáo", () => {
    withStore((state) => {
      state.reports.find((item) => item.id === "6a-student-1-report")!.status = "draft";
      state.reports.push({
        id: "6a-student-1-report-2026-09",
        classId: "6a",
        studentId: "6a-student-1",
        month: "2026-09",
        status: "published",
        needsRepublish: false,
        generalComment: " Nhận xét chung tháng 9. ",
        publishedAt: "2026-10-02T09:00:00.000Z",
      });
    });
    expect(getChildOverview("6a-student-1", "2026-10")?.teacherNote).toBe(
      "Nhận xét chung tháng 9.",
    );
  });

  it("chưa có báo cáo phát hành hoặc nhận xét chung để trống thì không có lời nhắn", () => {
    withStore();
    // 6a-student-8 mới có báo cáo nháp.
    expect(getChildOverview("6a-student-8", "2026-10")?.teacherNote).toBeNull();
    withStore((state) => {
      const report = state.reports.find(
        (item) => item.id === "6a-student-1-report",
      )!;
      report.generalComment = "   ";
    });
    expect(getChildOverview("6a-student-1", "2026-10")?.teacherNote).toBeNull();
  });

  it("trả null khi em chưa vào lớp ở tháng đó", () => {
    withStore();
    expect(getChildOverview("6a-student-1", "2026-08")).toBeNull();
  });
});

describe("Báo cáo tháng của con", () => {
  it("chỉ trả báo cáo đã phát hành, kèm nội dung báo cáo và nhận xét chung", () => {
    withStore();
    const published = getChildMonthlyReport("6a-student-1", "2026-10")!;
    expect(published.report).toMatchObject({
      id: "6a-student-1-report",
      status: "published",
      publishedAt: "2026-10-12T09:00:00.000Z",
    });
    expect(published.body.stars.ticketCount).toBe(4);
    expect(published.body.stars.byStars).toEqual({ 1: 1, 2: 1, 3: 2 });
    expect(published.body.homework.map((row) => row.kind)).toEqual([
      "vocabulary",
      "exercise",
    ]);
    expect(published.body.generalComment).toContain("Tháng này con tiến bộ");
    expect(published.body.ready).toBe(true);
    expect(published.needsRepublish).toBe(false);
    // Báo cáo chưa phát hành thì phụ huynh không thấy.
    expect(getChildMonthlyReport("6a-student-8", "2026-10")).toBeNull();
  });

  it("sửa điểm sau khi phát hành: phụ huynh thấy điểm mới và cờ cần phát hành lại", () => {
    withStore();
    actAsTeacher();
    const score = getStore().scores.find(
      (item) => item.studentId === "6a-student-1" && item.testId === "6a-test-1",
    )!;
    saveScore({ ...score, value: 10 });
    actAsGuardian();
    const report = getChildMonthlyReport("6a-student-1", "2026-10")!;
    expect(report.needsRepublish).toBe(true);
    expect(
      report.body.tests.find(({ test }) => test.id === "6a-test-1")?.score?.value,
    ).toBe(10);
  });

  it("báo cáo nháp do giáo viên lưu chưa hiện; phát hành rồi mới hiện", () => {
    withStore();
    actAsTeacher();
    const draft = saveReport({
      classId: "6a",
      studentId: "6a-student-8",
      month: "2026-10",
    });
    expect(draft.status).toBe("draft");
    saveReportComment(draft.id, "Con chăm chỉ và có tiến bộ.");
    actAsGuardian();
    expect(getChildMonthlyReport("6a-student-8", "2026-10")).toBeNull();

    actAsTeacher();
    publishReport(draft.id);
    actAsGuardian();
    const published = getChildMonthlyReport("6a-student-8", "2026-10")!;
    expect(published.report.publishedAt).toBeTruthy();
    expect(published.body.generalComment).toBe(
      "Con chăm chỉ và có tiến bộ.",
    );
  });

  it("bài đã lưu trữ không vào báo cáo tháng và không bị báo thiếu điểm", () => {
    withStore((state) => {
      const test = state.tests.find((item) => item.id === "6a-test-1")!;
      test.archived = true;
      // Bài đã lưu trữ còn thiếu điểm cũng không bị báo "Thiếu điểm".
      const score = state.scores.find(
        (item) => item.id === "6a-student-1-score-1",
      )!;
      score.value = null;
    });
    const report = getChildMonthlyReport("6a-student-1", "2026-10")!;
    expect(report.body.tests.map(({ test }) => test.id)).toEqual([
      "6a-test-2",
      "6a-test-3",
    ]);
    expect(report.body.gradedTestCount).toBe(2);
    expect(report.body.missing).toEqual([]);
  });

  it("báo cáo đã phát hành nhưng còn thiếu nhận xét chung thì báo thiếu", () => {
    withStore();
    // Báo cáo của 6a-student-1 đã có nhận xét chung; xoá để kiểm tra nhãn thiếu.
    const published = getChildMonthlyReport("6a-student-1", "2026-10")!;
    expect(published.body.missing).toEqual([]);
    withStore((state) => {
      const report = state.reports.find(
        (item) => item.id === "6a-student-1-report",
      )!;
      report.generalComment = "";
    });
    expect(
      getChildMonthlyReport("6a-student-1", "2026-10")?.body.missing,
    ).toEqual(["Thiếu nhận xét chung"]);
  });
});
