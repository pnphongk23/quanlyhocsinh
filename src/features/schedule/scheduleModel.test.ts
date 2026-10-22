import { describe, expect, it } from "vitest";
import type { Session } from "../../data/types";
import {
  groupScheduleEntries,
  scheduleState,
  trimMonthWeeks,
  upcomingEntries,
  type ScheduleEntry,
} from "./scheduleModel";

function entry(
  id: string,
  date: string,
  time: string,
  status: Session["status"] = "planned",
): ScheduleEntry {
  return {
    session: { id, classId: "class-1", date, time, status },
    className: `Lớp ${id}`,
    time,
    sessionNumber: 1,
    studentCount: 8,
  };
}

describe("groupScheduleEntries", () => {
  it("gom buổi quá hạn vào nhóm riêng rồi xếp 14 ngày theo ngày và giờ", () => {
    const groups = groupScheduleEntries(
      [
        entry("late-2", "2026-10-15", "19:00"),
        entry("tomorrow-late", "2026-10-18", "19:00"),
        entry("today", "2026-10-17", "18:30"),
        entry("late-1", "2026-10-15", "18:00"),
        entry("tomorrow-early", "2026-10-18", "18:00"),
        entry("outside", "2026-10-31", "18:00"),
        entry("cancelled", "2026-10-17", "17:00", "cancelled"),
      ],
      "2026-10-17",
    );

    expect(groups.map((group) => [group.kind, group.date])).toEqual([
      ["overdue", "overdue"],
      ["day", "2026-10-17"],
      ["day", "2026-10-18"],
    ]);
    expect(groups[0].entries.map((item) => item.session.id)).toEqual([
      "late-1",
      "late-2",
    ]);
    expect(groups[2].entries.map((item) => item.session.id)).toEqual([
      "tomorrow-early",
      "tomorrow-late",
    ]);
  });

  it("tính đủ ngày thứ 14 và bỏ ngày ngoài phạm vi", () => {
    const groups = groupScheduleEntries(
      [
        entry("last-day", "2026-10-30", "18:00"),
        entry("next-day", "2026-10-31", "18:00"),
      ],
      "2026-10-17",
    );

    expect(groups.map((group) => group.date)).toEqual(["2026-10-30"]);
  });
});

describe("scheduleState", () => {
  const session = (
    date: string,
    status: Session["status"],
  ): Session => ({ id: "s", classId: "class-1", date, status });

  it("buổi hôm nay có thể điểm danh", () => {
    expect(scheduleState(session("2026-10-18", "planned"), "2026-10-18")).toEqual({
      label: "Điểm danh",
      tone: "primary",
      action: "checkin",
    });
  });

  it("buổi chưa tới ngày là nhãn Chưa tới", () => {
    expect(scheduleState(session("2026-10-20", "planned"), "2026-10-18")).toMatchObject({
      label: "Chưa tới",
      tone: "neutral",
      action: "status",
    });
  });

  it("buổi quá hạn chưa điểm danh", () => {
    expect(scheduleState(session("2026-10-15", "planned"), "2026-10-18")).toMatchObject({
      label: "Chưa điểm danh",
      tone: "warning",
      action: "status",
    });
  });

  it("buổi đã điểm danh và buổi đã huỷ", () => {
    expect(scheduleState(session("2026-10-15", "held"), "2026-10-18")).toMatchObject({
      label: "Đã điểm danh",
      tone: "success",
      action: "status",
    });
    expect(scheduleState(session("2026-10-21", "cancelled"), "2026-10-18")).toMatchObject({
      label: "Đã huỷ",
      tone: "warning",
      action: "status",
    });
  });
});

describe("upcomingEntries", () => {
  it("chỉ lấy buổi có kế hoạch sau ngày đang chọn, trong 14 ngày, xếp theo ngày rồi giờ", () => {
    const items = upcomingEntries(
      [
        entry("same-day", "2026-10-18", "18:00"),
        entry("later-2", "2026-10-20", "19:00"),
        entry("later-1", "2026-10-20", "18:00"),
        entry("held", "2026-10-21", "18:00", "held"),
        entry("cancelled", "2026-10-22", "18:00", "cancelled"),
        entry("outside", "2026-11-02", "18:00"),
        entry("last-day", "2026-10-31", "18:00"),
      ],
      "2026-10-18",
    );

    expect(items.map((item) => item.session.id)).toEqual([
      "later-1",
      "later-2",
      "last-day",
    ]);
  });
});

describe("trimMonthWeeks", () => {
  it("bỏ tuần không có ngày nào thuộc tháng đang xem", () => {
    const weeks = Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => ({ day: week * 7 + day, inMonth: week > 0 && week < 5 })),
    );
    const trimmed = trimMonthWeeks(weeks);

    expect(trimmed).toHaveLength(4);
    expect(trimmed[0][0].day).toBe(7);
    expect(trimmed[3][0].day).toBe(28);
  });

  it("giữ nguyên khi mọi tuần đều có ngày trong tháng", () => {
    const weeks = [[{ inMonth: true }], [{ inMonth: true }]];
    expect(trimMonthWeeks(weeks)).toHaveLength(2);
  });
});
