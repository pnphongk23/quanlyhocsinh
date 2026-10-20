import type { Member, PermissionGroup, PermissionLevel, Role } from "./types";

/** Id cố định để seed và migration tham chiếu chéo. */
export const ROLE_IDS = {
  admin: "role-admin",
  teacher: "role-teacher",
  assistant: "role-assistant",
  guardian: "role-guardian",
} as const;

export const MEMBER_IDS = {
  lanAdmin: "member-lan-admin",
  lanTeacher: "member-lan-teacher",
  lanGuardian: "member-lan-guardian",
  minh: "member-minh",
  trang: "member-trang",
  mai: "member-mai",
} as const;

export const PERMISSION_GROUP_IDS: PermissionGroup[] = [
  "classes",
  "students",
  "sessions_attendance",
  "scores",
  "lectures",
  "comments_reports",
];

export const GUARDIAN_GROUP_IDS: PermissionGroup[] = [
  "sessions_attendance",
  "scores",
  "comments_reports",
  "lectures",
];

export function emptyPermissions(): Record<PermissionGroup, PermissionLevel> {
  return {
    classes: "none",
    students: "none",
    sessions_attendance: "none",
    scores: "none",
    lectures: "none",
    comments_reports: "none",
  };
}

function fullAccess(): Record<PermissionGroup, PermissionLevel> {
  return {
    classes: "write",
    students: "write",
    sessions_attendance: "write",
    scores: "write",
    lectures: "write",
    comments_reports: "write",
  };
}

/** Role mặc định cài sẵn cho prototype. Admin là role hệ thống, không sửa. */
export function defaultRoles(): Role[] {
  return [
    {
      id: ROLE_IDS.admin,
      name: "Admin",
      kind: "staff",
      system: true,
      permissions: fullAccess(),
    },
    {
      id: ROLE_IDS.teacher,
      name: "Giáo viên",
      kind: "staff",
      system: false,
      permissions: fullAccess(),
    },
    {
      id: ROLE_IDS.assistant,
      name: "Trợ giảng",
      kind: "staff",
      system: false,
      permissions: {
        classes: "none",
        students: "read",
        sessions_attendance: "write",
        scores: "read",
        lectures: "read",
        comments_reports: "none",
      },
    },
    {
      id: ROLE_IDS.guardian,
      name: "Phụ huynh",
      kind: "guardian",
      system: false,
      permissions: {
        classes: "none",
        students: "none",
        sessions_attendance: "read",
        scores: "read",
        lectures: "read",
        comments_reports: "read",
      },
    },
  ];
}

/**
 * Thành viên mẫu. Cô Lan có ba membership (Admin, Giáo viên, Phụ huynh) để màn
 * chọn vai trò hoạt động; membership Admin đứng đầu nên mặc định đăng nhập là
 * Admin. Membership phụ huynh liên kết hai con để demo màn phụ huynh.
 */
export function defaultMembers(): Member[] {
  return [
    {
      id: MEMBER_IDS.lanAdmin,
      name: "Cô Lan",
      phone: "0900000001",
      roleId: ROLE_IDS.admin,
      classIds: [],
      status: "active",
      invitedAt: null,
    },
    {
      id: MEMBER_IDS.lanTeacher,
      name: "Cô Lan",
      phone: "0900000001",
      roleId: ROLE_IDS.teacher,
      classIds: ["6a"],
      status: "active",
      invitedAt: null,
    },
    {
      id: MEMBER_IDS.lanGuardian,
      name: "Cô Lan",
      phone: "0900000001",
      roleId: ROLE_IDS.guardian,
      classIds: [],
      studentIds: ["6a-student-1", "6a-student-8"],
      status: "active",
      invitedAt: null,
    },
    {
      id: MEMBER_IDS.minh,
      name: "Thầy Quang Minh",
      phone: "0900000002",
      roleId: ROLE_IDS.teacher,
      classIds: ["6a", "ielts"],
      status: "active",
      invitedAt: null,
    },
    {
      id: MEMBER_IDS.trang,
      name: "Cô Thu Trang",
      phone: "0900000003",
      roleId: ROLE_IDS.assistant,
      classIds: ["ielts"],
      status: "active",
      invitedAt: null,
    },
    {
      id: MEMBER_IDS.mai,
      name: "Cô Mai",
      phone: "0900000004",
      roleId: ROLE_IDS.teacher,
      classIds: ["6a"],
      status: "invited",
      invitedAt: "2026-10-16T09:00:00.000Z",
    },
  ];
}
