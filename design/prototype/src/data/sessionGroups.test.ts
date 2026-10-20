import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";
import { replaceStore } from "./store";
import { groupEntriesByDate, listScheduleEntries, monthGrid, splitSessions } from "./sessionGroups";
import type { Session } from "./types";

const session = (id: string, date: string, status: Session["status"], time = "18:00"): Session => ({
  id, classId: "6a", date, time, origin: "recurring", status,
});

describe("Nhóm buổi học", () => {
  it("chọn mọi buổi hôm nay làm hiện tại, buổi planned gần nhất nếu hôm nay trống", () => {
    const items = [session("today-held", "2026-10-18", "held"), session("today-cancel", "2026-10-18", "cancelled"), session("next", "2026-10-19", "planned"), session("later", "2026-10-21", "planned"), session("missed", "2026-10-17", "planned"), session("old-held", "2026-10-16", "held")];
    expect(splitSessions(items, "2026-10-18")).toMatchObject({
      current: [{ id: "today-held" }, { id: "today-cancel" }],
      upcoming: [{ id: "next" }, { id: "later" }],
      past: [{ id: "missed" }, { id: "old-held" }],
    });
    expect(splitSessions(items.slice(2), "2026-10-18").current.map((item) => item.id)).toEqual(["next"]);
  });
  it("lịch lấy buổi mọi trạng thái của lớp active trong khoảng và sắp theo giờ", () => {
    replaceStore(createSeed());
    const entries = listScheduleEntries("2026-10-19", "2026-10-25", "2026-10-18");
    expect(entries.map(({ session }) => session.id)).toEqual(["6a-session-8", "ielts-session-8", "6a-extra-session"]);
    expect(entries[0]).toMatchObject({ classId: "6a", className: "Tiếng Anh giao tiếp 6A" });
    expect(groupEntriesByDate(entries).map((group) => group.date)).toEqual(["2026-10-19", "2026-10-20", "2026-10-25"]);
  });
  it("tạo lưới 6x7 bắt đầu thứ Hai, gồm tháng bắt đầu thứ Năm và Chủ nhật", () => {
    const october = monthGrid(2026, 10);
    expect(october).toHaveLength(6);
    expect(october.every((week) => week.length === 7)).toBe(true);
    expect(october[0][0]).toEqual({ date: "2026-09-28", inMonth: false });
    expect(october[0][3]).toEqual({ date: "2026-10-01", inMonth: true });
    const november = monthGrid(2026, 11);
    expect(november[0][0]).toEqual({ date: "2026-10-26", inMonth: false });
    expect(november[0][6]).toEqual({ date: "2026-11-01", inMonth: true });
  });
});
