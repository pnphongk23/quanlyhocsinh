import { describe, expect, it } from "vitest";
import {
  activeClassTab,
  classSubtitle,
  sessionHeading,
  todayLabel,
} from "./ClassDesktopHeader";
import {
  attendanceBadge,
  pastSessionRows,
  sessionRowTitle,
  ticketBadgeLabel,
  upcomingManualSession,
  weekdayDayShort,
} from "./SessionsDesktop";
import { STAR_TEMPLATES } from "../../data/logic";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import type { Class, Session } from "../../data/types";

const klass: Class = {
  id: "6a",
  name: "Tiếng Anh giao tiếp 6A",
  weekdays: [1, 3],
  time: "18:00",
  status: "active",
};

function session(patch: Partial<Session> & Pick<Session, "id" | "date">): Session {
  return {
    classId: "6a",
    status: "held",
    origin: "recurring",
    time: "18:00",
    ...patch,
  };
}

describe("Khung đầu web Chi tiết lớp (ảnh 01, 03)", () => {
  it("phụ đề ghi số học sinh, lịch lặp và ngày hôm nay", () => {
    expect(classSubtitle(klass, 10, "2026-10-20")).toBe(
      "10 học sinh · Thứ Hai, Thứ Tư 18:00 · hôm nay Thứ Ba 20/10",
    );
  });

  it("tiêu đề buổi có thứ/ngày và giờ, không đánh số buổi", () => {
    replaceStore(createSeed());
    const item = session({ id: "6a-session-0", date: "2026-09-21" });
    expect(sessionHeading(item, "18:00")).toBe(
      "T2 · 21/09 · 18:00",
    );
  });

  it("tab đang mở suy ra từ đường dẫn, mặc định Buổi học", () => {
    expect(activeClassTab("/lop/6a/buoi-hoc")).toBe("buoi-hoc");
    expect(activeClassTab("/lop/6a/buoi-hoc/s1")).toBe("buoi-hoc");
    expect(activeClassTab("/lop/6a/bai-kiem-tra")).toBe("bai-kiem-tra");
    expect(activeClassTab("/lop/6a/diem")).toBe("diem");
    expect(activeClassTab("/lop/6a/hoc-sinh")).toBe("hoc-sinh");
    expect(activeClassTab("/lop/6a/bao-cao")).toBe("bao-cao");
  });

  it("nhãn hôm nay dùng thứ trong tuần tiếng Việt", () => {
    expect(todayLabel("2026-10-21")).toBe("Thứ Tư 21/10");
  });
});

describe("Bảng buổi học trên web (ảnh 01, GL-01)", () => {
  it("buổi học hiển thị theo thứ và ngày", () => {
    replaceStore(createSeed());
    const first = session({ id: "6a-session-0", date: "2026-09-21" });
    const cancelled = session({
      id: "6a-extra-cancelled",
      date: "2026-10-16",
      status: "cancelled",
      origin: "manual",
      makeup: true,
    });
    expect(sessionRowTitle(cancelled)).toBe("Buổi đã hủy");
    expect(sessionRowTitle(first)).toBe("T2 · 21/09");
  });

  it("ngày ngắn dưới số buổi là 'Thứ Hai, 19/10'", () => {
    expect(weekdayDayShort("2026-10-19")).toBe("Thứ Hai, 19/10");
  });

  it("nhãn điểm danh: đã điểm danh kèm số có mặt, chưa điểm danh, đã hủy", () => {
    const held = session({ id: "a", date: "2026-10-19" });
    expect(
      attendanceBadge(
        held,
        10,
        [
          { status: "present" },
          { status: "late" },
          { status: "absent" },
        ],
        "2026-10-21",
      ),
    ).toEqual({ label: "Đã điểm danh 2/10 có mặt", tone: "success" });
    expect(attendanceBadge(held, 10, [], "2026-10-21")).toEqual({
      label: "Chưa điểm danh",
      tone: "warning",
    });
    expect(
      attendanceBadge(
        session({ id: "b", date: "2026-10-19", status: "cancelled" }),
        10,
        [],
        "2026-10-21",
      ),
    ).toEqual({ label: "Đã hủy", tone: "neutral" });
    // Buổi chưa tới ngày: chưa hiện nhãn.
    expect(
      attendanceBadge(
        session({ id: "c", date: "2026-10-25", status: "planned" }),
        10,
        [],
        "2026-10-21",
      ),
    ).toBeNull();
  });

  it("nhãn phiếu: Đã gửi x/y, Chưa gửi, để trống với buổi hủy", () => {
    const held = session({ id: "a", date: "2026-10-19" });
    expect(ticketBadgeLabel(held, 10, 5)).toEqual({
      label: "Đã gửi 5/10",
      tone: "success",
    });
    expect(ticketBadgeLabel(held, 10, 0)).toEqual({
      label: "Chưa gửi",
      tone: "neutral",
    });
    expect(
      ticketBadgeLabel(
        session({ id: "b", date: "2026-10-19", status: "cancelled" }),
        10,
        0,
      ),
    ).toBeNull();
  });

  it("thẻ Buổi lẻ sắp tới chỉ chọn buổi lẻ planned, khác buổi hiện tại", () => {
    const sessions = [
      session({ id: "current", date: "2026-10-21", status: "planned" }),
      session({
        id: "manual",
        date: "2026-10-25",
        status: "planned",
        origin: "manual",
      }),
      session({
        id: "manual-past",
        date: "2026-10-10",
        status: "planned",
        origin: "manual",
      }),
      session({
        id: "manual-later",
        date: "2026-11-01",
        status: "planned",
        origin: "manual",
      }),
    ];
    expect(upcomingManualSession(sessions, "current", "2026-10-21")?.id).toBe(
      "manual",
    );
    expect(upcomingManualSession(sessions, "manual", "2026-10-21")?.id).toBe(
      "manual-later",
    );
    expect(upcomingManualSession([sessions[0]], "current", "2026-10-21")).toBeNull();
  });

  it("danh sách buổi đã qua xếp mới nhất trước", () => {
    const sessions = [
      session({ id: "old", date: "2026-09-21" }),
      session({ id: "new", date: "2026-10-19" }),
    ];
    expect(pastSessionRows(sessions, "2026-10-21").map((s) => s.id)).toEqual([
      "new",
      "old",
    ]);
  });
});

describe("Ba câu mẫu sao đúng nguyên văn spec mục 4", () => {
  it("3 sao có 🌟🌟🌟", () => {
    expect(STAR_TEMPLATES[3]).toBe(
      "Con hoàn thành 3 sao 🌟🌟🌟. Tập trung, tích cực học tập. Ghi bài đầy đủ, hiểu bài!",
    );
  });

  it("2 sao có 🌟🌟 và câu 'Còn mất trật tự.'", () => {
    expect(STAR_TEMPLATES[2]).toBe(
      "Con hoàn thành 2 sao 🌟🌟. Ghi bài đầy đủ, tham gia hoạt động học tập. Còn mất trật tự.",
    );
  });

  it("1 sao có 🌟 và câu 'Đã ghi chép bài đầy đủ.'", () => {
    expect(STAR_TEMPLATES[1]).toBe(
      "Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.",
    );
  });
});
