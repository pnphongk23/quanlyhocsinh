import type { Attendance } from "../types";
import { getStore } from "../store";
import { commitState, persistCommand } from "../outbox";
import { requirePermission, requireSessionAccess } from "./access";
import type { SyncCommand } from "../api/types";
import { todayISO } from "../../shared/date";
import { composePlans, runDurably, type WritePlan } from "./durable";
export type AttendanceInput = Pick<Attendance, "sessionId" | "studentId" | "status">;
export const listAttendance = (sessionId: string): Attendance[] => getStore().attendance.filter((a)=>a.sessionId===sessionId);
function planAttendance(input: AttendanceInput): WritePlan<Attendance> {
  requirePermission("sessions_attendance","write"); const session=requireSessionAccess(input.sessionId);
  if(session.date>todayISO()) throw new Error("Chưa thể điểm danh buổi chưa diễn ra.");
  if(session.status==="cancelled") throw new Error("Không thể điểm danh buổi đã huỷ.");
  const id=`${input.sessionId}:${input.studentId}`, old=getStore().attendance.find(a=>a.id===id);
  // Giờ đến và ghi chú cũ vẫn nằm trong dữ liệu nhưng không hiện và không gửi.
  const item: Attendance={id,sessionId:input.sessionId,studentId:input.studentId,status:input.status,note:old?.note??"",lateAt:old?.lateAt??null};
  const payload={session_id:item.sessionId,student_id:item.studentId,status:item.status};
  const cmd={id:crypto.randomUUID(),type:"attendance.set",payload,base_version:(old as any)?.version??0,created_at:new Date().toISOString()} as SyncCommand;
  return {
    result: item,
    apply: ()=>commitState("attendance",item.id,d=>{d.attendance=d.attendance.filter(a=>a.id!==item.id).concat(item);}),
    undo: ()=>commitState("attendance",item.id,d=>{d.attendance=d.attendance.filter(a=>a.id!==item.id).concat(old?[old]:[]);}),
    persist: ()=>persistCommand("attendance",[item.sessionId,item.studentId],{...payload,note:item.note,late_at:item.lateAt,version:(old as any)?.version??0,updated_at:new Date().toISOString()},cmd),
  };
}
/** Chờ ghi bền; ghi lỗi ⇒ ném lỗi gốc và bộ nhớ về như trước. */
export const saveAttendanceDurable = (input: AttendanceInput): Promise<Attendance> => runDurably(planAttendance(input));
/** Chờ ghi bền cả lô; một lệnh lỗi ⇒ ném lỗi gốc và bộ nhớ của cả lô về như trước. Kiểm tra cả lô trước khi áp. */
export function saveAttendanceBatchDurable(inputs: AttendanceInput[]): Promise<Attendance[]> {
  const plans = inputs.map(planAttendance);
  return runDurably(composePlans(plans, plans.map((plan) => plan.result)));
}
