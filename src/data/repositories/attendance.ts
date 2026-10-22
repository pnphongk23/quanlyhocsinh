import type { Attendance } from "../types";
import { getStore } from "../store";
import { commitState, persistCommand } from "../outbox";
import { requirePermission, requireSessionAccess } from "./access";
import type { SyncCommand } from "../api/types";
const make = (input: Omit<Attendance,"id">): Attendance => ({...input,id:`${input.sessionId}:${input.studentId}`});
export const listAttendance = (sessionId: string): Attendance[] => getStore().attendance.filter((a)=>a.sessionId===sessionId);
export function saveAttendance(input: Omit<Attendance,"id">): Attendance {
  requirePermission("sessions_attendance","write"); const session=requireSessionAccess(input.sessionId);
  if(session.date>new Date().toISOString().slice(0,10)) throw new Error("Chưa thể điểm danh buổi chưa diễn ra.");
  if(session.status==="cancelled") throw new Error("Không thể điểm danh buổi đã huỷ.");
  if(input.status!=="late"&&input.lateAt) throw new Error("Giờ đến muộn chỉ dùng khi trạng thái Muộn.");
  const item=make(input), old=getStore().attendance.find(a=>a.id===item.id); commitState("attendance",item.id,d=>{d.attendance=d.attendance.filter(a=>a.id!==item.id).concat(item);});
  const payload={session_id:item.sessionId,student_id:item.studentId,status:item.status,note:item.note??"",late_at:item.lateAt};
  const cmd={id:crypto.randomUUID(),type:"attendance.set",payload,base_version:(old as any)?.version??0,created_at:new Date().toISOString()} as SyncCommand;
  void persistCommand("attendance",[item.sessionId,item.studentId],{...payload,version:(old as any)?.version??0,updated_at:new Date().toISOString()},cmd).catch(()=>{}); return item;
}
export function saveAttendanceBatch(inputs: Omit<Attendance,"id">[]): Attendance[] { return inputs.map(saveAttendance); }
