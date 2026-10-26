import { beforeEach, describe, expect, it } from "vitest";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { listSessions } from "../../data/repositories/sessions";
import { listAttendance } from "../../data/repositories/attendance";
import { listStudents } from "../../data/repositories/students";
import { attendanceSummary } from "./StudentsDesktop";

function setup() {
  replaceStore(createSeed());
  const sessions = listSessions("6a");
  const records = sessions
    .filter((session) => session.status === "held")
    .flatMap((session) => listAttendance(session.id));
  const student = (name: string) =>
    listStudents("6a").find((item) => item.name.includes(name))!;
  return { sessions, records, student };
}

beforeEach(() => {
  replaceStore(createSeed());
});

describe("Bảng học sinh trên web (ảnh 14)", () => {
  it("chuyên cần là tỉ lệ có đi học / số buổi đã diễn ra", () => {
    const { sessions, records, student } = setup();
    expect(attendanceSummary(sessions, records, student("Nguyễn Minh"))).toEqual(
      { attended: 6, total: 8 },
    );
    expect(attendanceSummary(sessions, records, student("Hoàng Thu"))).toEqual({
      attended: 8,
      total: 8,
    });
  });

  it("chỉ tính buổi trong thời gian em học ở lớp", () => {
    const { sessions, records, student } = setup();
    expect(attendanceSummary(sessions, records, student("Đỗ Hải"))).toEqual({
      attended: 6,
      total: 6,
    });
  });

  it("trả null khi chưa có buổi đã diễn ra", () => {
    const { sessions, records, student } = setup();
    const empty = { ...student("Hoàng Thu"), enrolledAt: "2027-01-01" };
    expect(attendanceSummary(sessions, records, empty)).toBeNull();
  });

});
