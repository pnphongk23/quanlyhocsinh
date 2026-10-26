import { describe, expect, it } from "vitest";
import type { Session } from "../../data/types";
import type { TeachingEntry } from "../../data/teaching";
import {
  activeStaffMembers,
  addDays,
  countedTotal,
  defaultMemberIdFor,
  groupEntriesByDate,
  startOfWeek,
  weekDates,
  weekRangeLabel,
} from "./teachingScheduleModel";

function entry(date: string, time: string, counted: boolean): TeachingEntry {
  const session: Session = {
    id: `${date}-${time}`,
    classId: "6a",
    date,
    time,
    status: counted ? "held" : "planned",
  };
  return {
    session,
    classId: "6a",
    position: "main",
    kind: "own",
    otherMemberId: null,
    counted,
  };
}

describe("tuần học", () => {
  it("bắt đầu từ Thứ Hai", () => {
    // 12/10/2026 là Thứ Hai; 18/10/2026 là Chủ nhật cùng tuần.
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-14")).toBe("2026-10-12");
  });

  it("cộng ngày qua mốc tháng và năm", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-12", -7)).toBe("2026-10-05");
  });

  it("trả về đủ bảy ngày từ Thứ Hai đến Chủ nhật", () => {
    const days = weekDates(startOfWeek("2026-10-14"));
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-12");
    expect(days[6]).toBe("2026-10-18");
  });

  it("ghi nhãn khoảng tuần theo ngày/tháng/năm", () => {
    expect(weekRangeLabel("2026-10-12")).toBe("12/10 – 18/10/2026");
    expect(weekRangeLabel("2026-09-28")).toBe("28/9 – 4/10/2026");
    expect(weekRangeLabel("2026-12-28")).toBe("28/12/2026 – 3/1/2027");
  });
});

describe("gom buổi dạy theo ngày", () => {
  it("nhóm theo ngày và sắp ngày tăng dần", () => {
    const groups = groupEntriesByDate([
      entry("2026-10-14", "18:00", true),
      entry("2026-10-12", "18:00", true),
      entry("2026-10-12", "20:00", true),
    ]);
    expect(groups.map((group) => group.date)).toEqual([
      "2026-10-12",
      "2026-10-14",
    ]);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[0].entries.map((item) => item.session.time)).toEqual([
      "18:00",
      "20:00",
    ]);
  });

  it("trả về rỗng khi tuần không có buổi", () => {
    expect(groupEntriesByDate([])).toEqual([]);
  });
});

describe("tổng buổi được tính công", () => {
  it("chỉ đếm buổi đã dạy, bỏ buổi bị thay hoặc chưa diễn ra", () => {
    const items = [
      entry("2026-10-12", "18:00", true),
      entry("2026-10-14", "18:00", true),
      entry("2026-10-16", "18:00", false),
    ];
    expect(countedTotal(items)).toBe(2);
    expect(countedTotal([])).toBe(0);
  });
});

describe("chọn nhân sự và người mặc định", () => {
  const members = [
    { id: "m-admin", name: "Cô Lan", status: "active" as const, roleId: "role-admin" },
    { id: "m-teacher", name: "Cô Lan", status: "active" as const, roleId: "role-teacher" },
    { id: "m-guardian", name: "Phụ huynh", status: "active" as const, roleId: "role-guardian" },
  ].map((member) => ({
    ...member,
    phone: "",
    classIds: [],
  }));
  const isStaffRole = (roleId: string) => roleId !== "role-guardian";

  it("chỉ giữ nhân sự đang hoạt động, bỏ phụ huynh", () => {
    const staff = activeStaffMembers(members, isStaffRole);
    expect(staff.map((member) => member.id)).toEqual(["m-admin", "m-teacher"]);
  });

  it("mặc định chọn người đầu tiên thực sự có việc dạy", () => {
    const staff = activeStaffMembers(members, isStaffRole);
    // m-admin đứng trước nhưng chưa được phân công nên bỏ qua.
    expect(
      defaultMemberIdFor(
        staff,
        [{ classId: "6a", memberId: "m-teacher", position: "main" }],
        [],
      ),
    ).toBe("m-teacher");
  });

  it("tính cả người chỉ đứng tên dạy thay", () => {
    const staff = activeStaffMembers(members, isStaffRole);
    expect(
      defaultMemberIdFor(
        staff,
        [],
        [
          {
            id: "sub-1",
            sessionId: "6a-session-6",
            position: "main",
            originalMemberId: "m-admin",
            substituteMemberId: "m-teacher",
            reason: "Dạy thay",
            createdAt: "2026-10-11T15:00:00.000Z",
          },
        ],
      ),
    ).toBe("m-teacher");
  });

  it("trả null khi chưa ai có phân công", () => {
    const staff = activeStaffMembers(members, isStaffRole);
    expect(defaultMemberIdFor(staff, [], [])).toBeNull();
  });
});
