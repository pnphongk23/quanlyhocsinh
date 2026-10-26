import { describe, expect, it } from "vitest";
import type { PermissionGroup } from "../../data/types";
import {
  classAssignmentLabel,
  GUARDIAN_LEVELS,
  initials,
  levelOf,
  maskPhone,
  matchesMember,
  memberStatusLabel,
  permissionSummary,
  sanitizeGuardianLevels,
  STAFF_LEVELS,
  validatePhone,
  validateRoleName,
  withLevel,
} from "./staffModel";

const GUARDIAN_GROUPS: PermissionGroup[] = [
  "sessions_attendance",
  "scores",
  "comments_reports",
  "lectures",
];
const ALL_GROUPS: PermissionGroup[] = [
  "classes",
  "students",
  "sessions_attendance",
  "scores",
  "lectures",
  "comments_reports",
];

describe("che bớt số điện thoại", () => {
  it("giữ 3 số đầu và 3 số cuối", () => {
    expect(maskPhone("0912345678")).toBe("091••••678");
    expect(maskPhone("091 234 5678")).toBe("091••••678");
  });

  it("không lộ số khi thiếu dữ liệu", () => {
    expect(maskPhone("")).toBe("Chưa có số điện thoại");
    expect(maskPhone("0912")).toBe("••••");
  });
});

describe("kiểm tra số điện thoại", () => {
  it("chỉ nhận số 10 chữ số bắt đầu bằng 0", () => {
    expect(validatePhone("0912345678")).toBe("");
    expect(validatePhone("091 234 5678")).toBe("");
    expect(validatePhone("")).toContain("Nhập số điện thoại");
    expect(validatePhone("912345678")).toContain("10 số");
    expect(validatePhone("09123456789")).toContain("10 số");
  });
});

describe("tìm kiếm nhân sự", () => {
  const member = { name: "Cô Thu Trang", phone: "0912345678" };

  it("khớp tên không dấu, số điện thoại và tên vai trò", () => {
    expect(matchesMember(member, "Trợ giảng", "thu trang")).toBe(true);
    expect(matchesMember(member, "Trợ giảng", "2345")).toBe(true);
    expect(matchesMember(member, "Trợ giảng", "trợ")).toBe(true);
    expect(matchesMember(member, "Trợ giảng", "quang")).toBe(false);
  });

  it("để trống thì hiện tất cả", () => {
    expect(matchesMember(member, "Trợ giảng", "   ")).toBe(true);
  });
});

describe("ma trận quyền", () => {
  it("mặc định nhóm chưa đặt là Không", () => {
    expect(levelOf({}, "classes")).toBe("none");
  });

  it("nhân sự có ba mức, phụ huynh chỉ hai mức", () => {
    expect(STAFF_LEVELS).toEqual(["none", "read", "write"]);
    expect(GUARDIAN_LEVELS).toEqual(["none", "read"]);
  });

  it("ép role phụ huynh về 4 nhóm, tối đa Đọc", () => {
    let draft = withLevel({}, "classes", "write");
    draft = withLevel(draft, "scores", "write");
    draft = withLevel(draft, "lectures", "read");
    const sanitized = sanitizeGuardianLevels(draft, GUARDIAN_GROUPS);
    expect(Object.keys(sanitized).sort()).toEqual([...GUARDIAN_GROUPS].sort());
    expect(levelOf(sanitized, "classes")).toBe("none");
    expect(levelOf(sanitized, "scores")).toBe("read");
    expect(levelOf(sanitized, "lectures")).toBe("read");
  });

  it("tóm tắt số nhóm được đọc và được sửa", () => {
    let draft = withLevel({}, "classes", "write");
    draft = withLevel(draft, "students", "read");
    expect(permissionSummary(draft, ALL_GROUPS)).toBe(
      "1 nhóm được sửa · 1 nhóm được đọc",
    );
    expect(permissionSummary({}, ALL_GROUPS)).toBe("Chưa cấp quyền nhóm nào");
  });
});

describe("tên vai trò", () => {
  it("bắt buộc và giới hạn 40 ký tự", () => {
    expect(validateRoleName("  ")).toContain("Nhập tên vai trò");
    expect(validateRoleName("Trợ giảng")).toBe("");
    expect(validateRoleName("a".repeat(41))).toContain("40 ký tự");
  });
});

describe("nhãn trạng thái và lớp", () => {
  it("hiện đúng tiếng Việt", () => {
    expect(memberStatusLabel("active")).toBe("Hoạt động");
    expect(memberStatusLabel("disabled")).toBe("Vô hiệu hoá");
  });

  it("đếm lớp được gán, Admin thấy mọi lớp", () => {
    expect(classAssignmentLabel(0, false)).toBe("Chưa gán lớp");
    expect(classAssignmentLabel(2, false)).toBe("2 lớp được gán");
    expect(classAssignmentLabel(0, true)).toBe("Toàn bộ lớp trong workspace");
  });

  it("lấy chữ viết tắt từ hai từ cuối", () => {
    expect(initials("Nguyễn Thị Thu Trang")).toBe("TT");
    expect(initials("Lan")).toBe("L");
  });
});
