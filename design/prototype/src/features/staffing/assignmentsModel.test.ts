import { describe, expect, it } from "vitest";
import type { Class, ClassStaff, Member, Role, Student } from "../../data/types";
import {
  activeStaff,
  classAssignments,
  classScheduleLabel,
  planAssignmentChanges,
} from "./assignmentsModel";

const klass = (id: string, weekdays: number[], time: string): Class => ({
  id,
  name: `Lớp ${id}`,
  weekdays,
  time,
  status: "active",
});

const member = (id: string, name: string, roleId: string, status: Member["status"] = "active"): Member => ({
  id,
  name,
  phone: "",
  roleId,
  classIds: [],
  status,
  invitedAt: null,
});

const student = (id: string, classId: string, status: Student["status"]): Student => ({
  id,
  classId,
  name: id,
  parentPhone: "",
  enrolledAt: "2026-09-01",
  leftAt: null,
  status,
});

describe("lịch lớp gọn", () => {
  it("sắp Thứ Hai trước Chủ nhật và ghép giờ", () => {
    expect(classScheduleLabel(klass("6a", [3, 1], "18:00"))).toBe("T2 · T4, 18:00");
    expect(classScheduleLabel(klass("4b", [6], "09:00"))).toBe("T7, 09:00");
    expect(classScheduleLabel(klass("cn", [0, 6], "08:00"))).toBe("T7 · CN, 08:00");
  });
});

describe("thẻ phân công của lớp", () => {
  const classes = [klass("6a", [1, 3], "18:00"), klass("4b", [6], "09:00")];
  const classStaff: ClassStaff[] = [
    { classId: "6a", memberId: "m-lan", position: "main" },
    { classId: "6a", memberId: "m-trang", position: "assistant" },
  ];
  const members = [member("m-lan", "Cô Lan", "role-teacher"), member("m-trang", "Cô Thu Trang", "role-assistant")];
  const students = [
    student("s1", "6a", "active"),
    student("s2", "6a", "active"),
    student("s3", "6a", "left"),
    student("s4", "4b", "active"),
  ];

  it("giữ GV chính, trợ giảng và đếm học sinh đang học", () => {
    const [sixA] = classAssignments({ classes, classStaff, students, members });
    expect(sixA.needsMain).toBe(false);
    expect(sixA.mainName).toBe("Cô Lan");
    expect(sixA.assistantNames).toEqual(["Cô Thu Trang"]);
    expect(sixA.studentCount).toBe(2);
  });

  it("lớp chưa có GV chính bật cờ cần chọn", () => {
    const [, fourB] = classAssignments({ classes, classStaff, students, members });
    expect(fourB.needsMain).toBe(true);
    expect(fourB.mainId).toBeNull();
    expect(fourB.mainName).toBeNull();
    expect(fourB.assistantNames).toEqual([]);
    expect(fourB.studentCount).toBe(1);
  });
});

describe("chỉ nhân sự đang hoạt động", () => {
  const roles: Role[] = [
    { id: "role-teacher", name: "Giáo viên", kind: "staff", system: false, permissions: {} as Role["permissions"] },
    { id: "role-guardian", name: "Phụ huynh", kind: "guardian", system: false, permissions: {} as Role["permissions"] },
  ];

  it("bỏ lời mời và phụ huynh, sắp theo tên", () => {
    const members = [
      member("m-b", "Cô B", "role-teacher"),
      member("m-a", "Cô A", "role-teacher"),
      member("m-invited", "Cô C", "role-teacher", "invited"),
      member("m-guardian", "Phụ huynh", "role-guardian"),
    ];
    expect(activeStaff(members, roles).map((item) => item.id)).toEqual(["m-a", "m-b"]);
  });
});

describe("kế hoạch lưu phân công", () => {
  it("đổi GV chính và thêm trợ giảng", () => {
    expect(
      planAssignmentChanges(
        { mainId: "m-lan", assistantIds: [] },
        { mainId: "m-minh", assistantIds: ["m-trang"] },
      ),
    ).toEqual({
      assign: [
        { memberId: "m-minh", position: "main" },
        { memberId: "m-trang", position: "assistant" },
      ],
      remove: [],
    });
  });

  it("gỡ trợ giảng và gỡ GV chính khi bỏ chọn", () => {
    expect(
      planAssignmentChanges(
        { mainId: "m-lan", assistantIds: ["m-trang"] },
        { mainId: null, assistantIds: [] },
      ),
    ).toEqual({ assign: [], remove: ["m-trang", "m-lan"] });
  });

  it("nâng trợ giảng cũ lên GV chính: gỡ trợ giảng rồi đặt chính", () => {
    expect(
      planAssignmentChanges(
        { mainId: "m-lan", assistantIds: ["m-trang"] },
        { mainId: "m-trang", assistantIds: [] },
      ),
    ).toEqual({
      assign: [{ memberId: "m-trang", position: "main" }],
      remove: ["m-trang"],
    });
  });

  it("không tạo thay đổi khi giữ nguyên", () => {
    expect(
      planAssignmentChanges(
        { mainId: "m-lan", assistantIds: ["m-trang"] },
        { mainId: "m-lan", assistantIds: ["m-trang"] },
      ),
    ).toEqual({ assign: [], remove: [] });
  });
});
