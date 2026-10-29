import type { CorePermissionGroup, PermissionGroup, PermissionLevel, Role } from "./types";
/** Stable role IDs used by the test fixture and role-related screens. */
export const ROLE_IDS = { admin: "role-admin", teacher: "role-teacher", assistant: "role-assistant", guardian: "role-guardian" } as const;
export const MEMBER_IDS = { lanAdmin: "member-test-admin", lanTeacher: "member-test-teacher", lanGuardian: "member-test-guardian", minhAnhGuardian: "member-test-guardian-2", minh: "member-test-teacher-2", trang: "member-test-assistant", mai: "member-test-inactive" } as const;
export const PERMISSION_GROUP_IDS: PermissionGroup[] = ["classes", "students", "sessions_attendance", "scores", "lectures", "comments_reports"];
export const GUARDIAN_GROUP_IDS: PermissionGroup[] = ["sessions_attendance", "scores", "comments_reports", "lectures"];
export function emptyPermissions(): Record<CorePermissionGroup, PermissionLevel> { return { classes:"none",students:"none",sessions_attendance:"none",scores:"none",lectures:"none",comments_reports:"none" }; }
function fullAccess(): Role["permissions"] { return { classes:"write",students:"write",sessions_attendance:"write",scores:"write",lectures:"write",comments_reports:"write",send_comments:"write" }; }
export function defaultRoles(): Role[] { return [
  { id:ROLE_IDS.admin,name:"Admin",kind:"staff",system:true,permissions:fullAccess() },
  { id:ROLE_IDS.teacher,name:"Giáo viên",kind:"staff",system:false,permissions:fullAccess() },
    { id:ROLE_IDS.assistant,name:"Trợ giảng",kind:"staff",system:false,permissions:{classes:"read",students:"read",sessions_attendance:"write",scores:"read",lectures:"read",comments_reports:"write",send_comments:"none"} },
    { id:ROLE_IDS.guardian,name:"Phụ huynh",kind:"guardian",system:false,permissions:{classes:"none",students:"none",sessions_attendance:"read",scores:"read",lectures:"read",comments_reports:"read",send_comments:"none"} },
]; }
