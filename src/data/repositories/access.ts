import { useSyncExternalStore } from "react";
import { getSession, subscribeSession } from "../auth/session";
import { getStore } from "../store";
import type { Member, PermissionGroup, Role } from "../types";

export const PERMISSION_GROUPS: {
    id: PermissionGroup;
    label: string;
}[] = [
  { id: "classes", label: "Lớp" },
  { id: "students", label: "Học sinh" },
  { id: "sessions_attendance", label: "Buổi học và điểm danh" },
  { id: "scores", label: "Điểm" },
  { id: "comments_reports", label: "Nhận xét và báo cáo" },
];

export const GUARDIAN_GROUPS: PermissionGroup[] = ["scores", "sessions_attendance", "comments_reports"];

export function getActiveMember(): Member | null { const s=getSession(), m=s?.me.memberships.find((x)=>x.id===s.activeMembershipId && x.status==="active"); if(s&&m)return{id:m.id,name:s.user.display_name??s.user.phone,phone:s.user.phone,roleId:m.role.id,classIds:getStore().classes.map(c=>c.id),status:"active"}; return getStore().members.find(x=>x.id===getStore().activeMemberId)??null; }

export function getActiveRole(): Role | null { const s=getSession(), m=s?.me.memberships.find((x)=>x.id===s.activeMembershipId && x.status==="active"); if(s&&m)return{id:m.role.id,name:m.role.name,kind:m.role.scope_kind==="linked_students"?"guardian":"staff",system:m.role.system_key==="admin",permissions:m.permissions??({} as any)}; const member=getActiveMember(); return member?getStore().roles.find(x=>x.id===member.roleId)??null:null; }

export function listMyMemberships(): Array<{
    member: Member;
    role: Role;
}> { const s=getSession(); return s?(s.me.memberships.filter(x=>x.status==="active").map(m=>({member:{id:m.id,name:s.user.display_name??s.user.phone,phone:s.user.phone,roleId:m.role.id,classIds:getStore().classes.map(c=>c.id),status:"active"},role:{id:m.role.id,name:m.role.name,kind:m.role.scope_kind==="linked_students"?"guardian":"staff",system:m.role.system_key==="admin",permissions:m.permissions??({} as any)}}))):getStore().members.flatMap(member=>{const role=getStore().roles.find(r=>r.id===member.roleId);return role?[{member,role}]:[];}); }

export function switchRole(memberId: string): void { void import("../auth").then(({switchMembership})=>switchMembership(memberId)); }

export function isAdmin(): boolean { return getActiveRole()?.system===true; }

export function can(group: PermissionGroup, level: "read" | "write"): boolean { const p=getActiveRole()?.permissions[group]; return level==="read"?p==="read"||p==="write":p==="write"; }

export function requirePermission(group: PermissionGroup, level: "read" | "write"): void { if(!can(group,level)) throw new Error("Bạn không có quyền thực hiện thao tác này."); }

export function visibleClassIds(): Set<string> | null { return isAdmin()?null:new Set(getStore().classes.map(c=>c.id)); }

export const CLASS_ACCESS_ERROR = "Bạn không có quyền truy cập lớp này.";

export const SESSION_ACCESS_ERROR = "Bạn không có quyền truy cập buổi học này.";

export function canAccessClass(classId: string): boolean { return getStore().classes.some(c=>c.id===classId); }

export function isGuardian(): boolean { return getActiveRole()?.kind==="guardian"; }

export function linkedStudentIds(): Set<string> { return new Set(getStore().students.map(s=>s.id)); }

export function canAccessStudent(studentId: string): boolean { return getStore().students.some(s=>s.id===studentId); }

export function canAccessSession(sessionId: string): boolean { return getStore().sessions.some(s=>s.id===sessionId); }

export function canAccessSessionContext(classId: string, sessionId: string | null | undefined): boolean { return canAccessClass(classId)&&(!sessionId||canAccessSession(sessionId)); }

export function getAccessibleSession(sessionId: string): import("../types").Session | undefined { return canAccessSession(sessionId)?getStore().sessions.find(s=>s.id===sessionId):undefined; }

export function requireClassAccess(classId: string): void { if(!canAccessClass(classId)) throw new Error(CLASS_ACCESS_ERROR); }

export function requireSessionAccess(sessionId: string): import("../types").Session { const session=getAccessibleSession(sessionId); if(!session) throw new Error(SESSION_ACCESS_ERROR); return session; }

export function useAccess(): {
    member: Member | null;
    role: Role | null;
    isAdmin: boolean;
    can: (group: PermissionGroup, level: "read" | "write") => boolean;
    multipleRoles: boolean;
} { useSyncExternalStore(subscribeSession,()=>getSession(),()=>getSession()); const memberships=listMyMemberships(); return { member:getActiveMember(),role:getActiveRole(),isAdmin:isAdmin(),can,multipleRoles:memberships.length>1 }; }
