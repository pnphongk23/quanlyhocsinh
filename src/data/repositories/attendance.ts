import type { Attendance } from "../types";
import { getStore } from "../store";
import { commitState, persistCommand } from "../outbox";
import { requirePermission, requireSessionAccess } from "./access";
import type { SyncCommand } from "../api/types";
import { runDurably, runInBackground, type WritePlan } from "./durable";
const make = (input: Omit<Attendance,"id">): Attendance => ({...input,id:`${input.sessionId}:${input.studentId}`});
export const listAttendance = (sessionId: string): Attendance[] => getStore().attendance.filter((a)=>a.sessionId===sessionId);
function planAttendance(input: Omit<Attendance,"id">): WritePlan<Attendance> {
  requirePermission("sessions_attendance","write"); const session=requireSessionAccess(input.sessionId);
  if(session.date>new Date().toISOString().slice(0,10)) throw new Error("Chưa thể điểm danh buổi chưa diễn ra.");
  if(session.status==="cancelled") throw new Error("Không thể điểm danh buổi đã huỷ.");
  if(input.status!=="late"&&input.lateAt) throw new Error("Giờ đến muộn chỉ dùng khi trạng thái Muộn.");
  const item=make(input), old=getStore().attendance.find(a=>a.id===item.id);
  const payload={session_id:item.sessionId,student_id:item.studentId,status:item.status,note:item.note??"",late_at:item.lateAt};
  const cmd={id:crypto.randomUUID(),type:"attendance.set",payload,base_version:(old as any)?.version??0,created_at:new Date().toISOString()} as SyncCommand;
  return {
    result: item,
    apply: ()=>commitState("attendance",item.id,d=>{d.attendance=d.attendance.filter(a=>a.id!==item.id).concat(item);}),
    undo: ()=>commitState("attendance",item.id,d=>{d.attendance=d.attendance.filter(a=>a.id!==item.id).concat(old?[old]:[]);}),
    persist: ()=>persistCommand("attendance",[item.sessionId,item.studentId],{...payload,version:(old as any)?.version??0,updated_at:new Date().toISOString()},cmd),
  };
}
export const saveAttendance = (input: Omit<Attendance,"id">): Attendance => runInBackground(planAttendance(input));
/** Chờ ghi bền; ghi lỗi ⇒ ném lỗi gốc và bộ nhớ về như trước. */
export const saveAttendanceDurable = (input: Omit<Attendance,"id">): Promise<Attendance> => runDurably(planAttendance(input));
export function saveAttendanceBatch(inputs: Omit<Attendance,"id">[]): Attendance[] { return inputs.map(saveAttendance); }
