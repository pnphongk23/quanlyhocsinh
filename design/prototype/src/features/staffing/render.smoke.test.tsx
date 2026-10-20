import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { MEMBER_IDS } from "../../data/defaults";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { teachingEntries } from "../../data/teaching";
import AssignmentsPage from "./AssignmentsPage";
import TeachingSchedulePage, {
  SummaryCards,
  WeekGrid,
} from "./TeachingSchedulePage";
import {
  groupEntriesByDate,
  weekCounts,
  weekDates,
} from "./teachingScheduleModel";
import SessionDetailPage from "../class-space/SessionDetailPage";

function render(route: string, path: string): string {
  const router = createMemoryRouter(
    [
      { path: "/phan-cong", element: <AssignmentsPage /> },
      { path: "/lich-day", element: <TeachingSchedulePage /> },
      {
        path: "/lop/:classId/buoi-hoc/:sessionId",
        element: <SessionDetailPage />,
      },
    ],
    { initialEntries: [path] },
  );
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

function renderInRouter(node: React.ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

describe("render thật của các màn A/B (mobile mặc định khi SSR)", () => {
  it("Phân công: thẻ có tên lớp, lịch, số học sinh, GV chính/trợ giảng", () => {
    replaceStore(createSeed());
    const html = render("/phan-cong", "/phan-cong");
    expect(html).toContain("Phân công giảng dạy");
    expect(html).toContain("2 lớp · Chỉ Admin chỉnh sửa");
    expect(html).toContain("Tiếng Anh giao tiếp 6A");
    expect(html).toContain("T2 · T4, 18:00");
    expect(html).toContain("GV chính");
    expect(html).toContain("Cô Lan");
    expect(html).toContain("Trợ giảng");
    expect(html).toContain("Cô Thu Trang");
    expect(html).toContain("học sinh");
    expect(html).not.toContain("Chưa có GV chính");
  });

  it("Phân công: lớp chưa có GV chính hiện nhãn cảnh báo và nút Chọn", () => {
    const state = createSeed();
    state.classStaff = state.classStaff.filter(
      (row) => !(row.classId === "ielts" && row.position === "main"),
    );
    replaceStore(state);
    const html = render("/phan-cong", "/phan-cong");
    expect(html).toContain("Chưa có GV chính");
    expect(html).toContain(">Chọn</button>");
    expect(html).not.toContain(">Sửa</button>");
  });

  it("Đổi người dạy: buổi có dạy thay hiện ghi chú, nhãn và nút huỷ", () => {
    replaceStore(createSeed());
    const html = render(
      "/lop/6a/buoi-hoc/6a-session-6",
      "/lop/6a/buoi-hoc/6a-session-6",
    );
    expect(html).toContain("Người dạy");
    expect(html).toContain("Dạy thay");
    expect(html).toContain("Thay Cô Lan");
    expect(html).toContain("Lý do: Cô Lan ốm");
    expect(html).toContain("Huỷ dạy thay");
  });

  it("Buổi đã huỷ: khoá đổi người dạy", () => {
    const state = createSeed();
    state.sessions = state.sessions.map((session) =>
      session.id === "6a-session-6"
        ? { ...session, status: "cancelled" }
        : session,
    );
    replaceStore(state);
    const html = render(
      "/lop/6a/buoi-hoc/6a-session-6",
      "/lop/6a/buoi-hoc/6a-session-6",
    );
    expect(html).toContain("Buổi đã huỷ nên không đổi được người dạy.");
    expect(html).not.toContain("Huỷ dạy thay");
  });

  it("Lịch dạy của Admin: bộ chọn người, tuần và nhãn vị trí", () => {
    replaceStore(createSeed());
    const html = render("/lich-day", "/lich-day");
    expect(html).toContain("Lịch dạy");
    expect(html).toContain("Xem lịch của mọi nhân sự");
    expect(html).toContain("Xem lịch của");
    expect(html).toContain("Dạy chính");
    expect(html).toContain("Được thay bởi");
  });

  it("Lịch của tôi: nhân sự chỉ xem lịch mình, thấy buổi dạy thay", () => {
    const state = createSeed();
    state.auth = { email: "minh@example.test", memberIds: [MEMBER_IDS.minh] };
    state.activeMemberId = MEMBER_IDS.minh;
    replaceStore(state);
    const html = render("/lich-day", "/lich-day");
    expect(html).toContain("Lịch của tôi");
    expect(html).toContain("Thầy Quang Minh");
    expect(html).not.toContain("Xem lịch của");
    expect(html).toContain("Dạy thay");
    expect(html).toContain("Thay Cô Lan");
  });
});

describe("render phần desktop của Lịch dạy", () => {
  function gridFor(memberId: string, mutate?: (state: ReturnType<typeof createSeed>) => void) {
    const state = createSeed();
    mutate?.(state);
    const from = "2026-10-12";
    const to = "2026-10-18";
    const entries = teachingEntries(state, memberId, from, to);
    const groups = groupEntriesByDate(entries);
    const byDate = new Map(groups.map((group) => [group.date, group.entries]));
    const html = renderInRouter(
      <>
        <SummaryCards counts={weekCounts(entries)} />
        <WeekGrid
          dates={weekDates(from)}
          byDate={byDate}
          classNameOf={(classId) =>
            state.classes.find((klass) => klass.id === classId)?.name ?? "Lớp"
          }
          nameOf={(id) =>
            state.members.find((member) => member.id === id)?.name ?? "Không rõ"
          }
        />
      </>,
    );
    return html;
  }

  it("đủ 7 cột ngày và ghi Không có buổi ở ngày trống", () => {
    const html = gridFor(MEMBER_IDS.lanTeacher);
    for (const label of [
      "T2 · 12/10",
      "T3 · 13/10",
      "T4 · 14/10",
      "T5 · 15/10",
      "T6 · 16/10",
      "T7 · 17/10",
      "CN · 18/10",
    ])
      expect(html).toContain(label);
    expect(html).toContain("Không có buổi");
  });

  it("ba thẻ tóm tắt và nhãn trạng thái bị thay/đã huỷ", () => {
    const html = gridFor(MEMBER_IDS.lanTeacher, (state) => {
      state.sessions = state.sessions.map((session) =>
        session.id === "6a-session-7"
          ? { ...session, status: "cancelled" }
          : session,
      );
    });
    expect(html).toContain("Buổi dạy");
    expect(html).toContain("Bị thay");
    expect(html).toContain("Đã huỷ");
    expect(html).toContain("Được thay bởi Thầy Quang Minh");
    expect(html).toContain("Buổi đã huỷ");
  });

  it("buổi dạy thay của người khác hiện nhãn Dạy thay trong lưới", () => {
    const html = gridFor(MEMBER_IDS.minh);
    expect(html).toContain("Dạy thay");
    expect(html).toContain("Thay Cô Lan");
  });
});
