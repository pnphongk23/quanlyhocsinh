import type { Student } from "../types";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { requirePermission, requireClassAccess, canAccessClass, canAccessSession } from "./access";
import { api } from "../sync";
import { identityKey } from "../db";
import { commitRemote, createOnce } from "./rest-cache";
const asView=(item:any):Student=>({id:item.id,classId:item.class_id,name:item.name,parentPhone:item.parent_phone??"",enrolledAt:item.enrolled_at,leftAt:item.left_at??null,status:item.status});
export const listStudents=(classId:string,includeLeft=true):Student[]=>canAccessClass(classId)?getStore().students.filter(s=>s.classId===classId&&(includeLeft||s.status==="active")):[];
export const getStudent=(id:string):Student|undefined=>getStore().students.find(s=>s.id===id);
export function listStudentsForSession(sessionId:string,includeLeft=true):Student[]{if(!canAccessSession(sessionId))return[];const session=getStore().sessions.find(s=>s.id===sessionId);return session?listStudents(session.classId,includeLeft):[];}
export async function createStudent(input:Omit<Student,"id"|"status"|"leftAt">):Promise<Student> {
  requirePermission("students","write");requireClassAccess(input.classId);
  if(!input.name.trim())throw new Error("Nhập tên học sinh.");
  if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Thêm học sinh cần kết nối mạng.");
  const body={name:input.name,parent_phone:input.parentPhone||undefined,enrolled_at:input.enrolledAt};
  const identity=identityKey();
  const remote:any=await createOnce(`student:${input.classId}`,body,(id)=>api.request(`POST /classes/${input.classId}/students` as any,{body:{id,...body}} as any));
  const item=asView(remote);
  await commitRemote(identity,"student",remote,undefined,()=>commitState("students",item.id,d=>{d.students=[...d.students.filter(s=>s.id!==item.id),item];}));
  return item;
}
/** Tạo một học sinh bằng ID do giao diện giữ qua các lần thử lại. */
export async function createStudentWithId(id:string,input:Omit<Student,"id"|"status"|"leftAt">):Promise<Student> {
  requirePermission("students","write");requireClassAccess(input.classId);
  if(!input.name.trim())throw new Error("Nhập tên học sinh.");
  if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Cần có mạng để thêm học sinh.");
  const body={name:input.name,parent_phone:input.parentPhone||undefined,enrolled_at:input.enrolledAt};
  const identity=identityKey();
  const remote:any=await api.request(`POST /classes/${input.classId}/students` as any,{body:{id,...body} as any});
  const item=asView(remote);
  await commitRemote(identity,"student",remote,undefined,()=>commitState("students",item.id,d=>{d.students=[...d.students.filter(s=>s.id!==item.id),item];}));
  return item;
}
async function patchStudent(id:string,patch:Partial<Pick<Student,"name"|"parentPhone"|"status"|"leftAt">>):Promise<void> {const current=getStudent(id);if(!current)throw new Error("Không tìm thấy học sinh.");requirePermission("students","write");requireClassAccess(current.classId);if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Cập nhật học sinh cần kết nối mạng.");const body={...(patch.name?{name:patch.name}:{}),...(patch.parentPhone!==undefined?{parent_phone:patch.parentPhone}:{}),...(patch.status?{status:"left" as const,left_at:patch.leftAt}:{} )};const identity=identityKey();const remote:any=await api.request(`PATCH /students/${id}` as any,{body} as any);const next=asView(remote);await commitRemote(identity,"student",remote,undefined,()=>commitState("student",id,d=>{d.students=d.students.map(s=>s.id===id?next:s);}));}
export async function updateStudent(id:string,patch:Partial<Pick<Student,"name">>):Promise<void> {if(patch.name!==undefined&&!patch.name.trim())throw new Error("Nhập tên học sinh.");await patchStudent(id,patch);}
export async function updateStudentPhone(id:string,parentPhone:string):Promise<void> {const phone=parentPhone.trim();if(phone&&!/^[0-9+().\s-]{6,20}$/.test(phone))throw new Error("Số điện thoại không hợp lệ.");await patchStudent(id,{parentPhone:phone});}
export async function markStudentLeft(id:string,leftAt:string):Promise<void> {const student=getStudent(id);if(!student)throw new Error("Không tìm thấy học sinh.");if(leftAt<student.enrolledAt)throw new Error("Ngày nghỉ phải sau ngày vào lớp.");await patchStudent(id,{status:"left",leftAt});}
function rate(rows:Array<{status:string}>):number|null {if(!rows.length)return null;return Math.round(rows.filter(r=>r.status==="present"||r.status==="late").length/rows.length*100);}
export const studentAttendanceRate=(id:string):number|null=>{const student=getStudent(id);if(!student||!canAccessClass(student.classId))return null;const held=new Set(getStore().sessions.filter(s=>s.classId===student.classId&&s.status==="held").map(s=>s.id));return rate(getStore().attendance.filter(a=>a.studentId===id&&held.has(a.sessionId)));};
export const classAttendanceRate=(classId:string):number|null=>{if(!canAccessClass(classId))return null;const held=new Set(getStore().sessions.filter(s=>s.classId===classId&&s.status==="held").map(s=>s.id));return rate(getStore().attendance.filter(a=>held.has(a.sessionId)));};
export function studentAbsenceWarning(id:string):boolean {const student=getStudent(id);if(!student)return false;const sessions=getStore().sessions.filter(s=>s.classId===student.classId&&s.status==="held").sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2);if(sessions.length<2)return false;const statuses=sessions.map(s=>getStore().attendance.find(a=>a.sessionId===s.id&&a.studentId===id)?.status);return statuses.every(status=>status==="absent");}
