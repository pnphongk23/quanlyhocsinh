import { todayISO } from "../../shared/format";
import type { Class, Session } from "../types";
import { getStore } from "../store";
import { commitState } from "../outbox";
import { requirePermission, requireClassAccess } from "./access";
import { ApiError } from "../api/client";
import { api } from "../sync";
import { setSaveStatus } from "../saveStatus";

export function localToday(): string { return todayISO(); }
let extraSessionUpdateError: string | null = null;
export function getExtraSessionUpdateError(): string | null { return extraSessionUpdateError; }

export const listSessions: (classId: string) => Session[] = (classId) => getStore().sessions.filter(s=>s.classId===classId).sort((a,b)=>`${a.date} ${a.time??"00:00"}`.localeCompare(`${b.date} ${b.time??"00:00"}`));

export const getSession: (id: string) => Session | undefined = (id) => getStore().sessions.find(s=>s.id===id);

export const hasSession: (id: string) => boolean = (id) => getStore().sessions.some(s=>s.id===id);

export function getSessionClass(sessionId: string): Class | undefined { const s=getSession(sessionId);return s?getStore().classes.find(c=>c.id===s.classId):undefined; }

export async function createSession(input: Omit<Session, "id">): Promise<Session> { requirePermission("sessions_attendance","write");requireClassAccess(input.classId);if(!getStore().classes.some(c=>c.id===input.classId&&c.status==="active"))throw new Error("Không tìm thấy lớp đang hoạt động.");if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!input.time||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw new Error("Ngày hoặc giờ học không hợp lệ.");if(getStore().sessions.some(s=>s.classId===input.classId&&s.date===input.date&&s.time===input.time))throw new Error("Đã có buổi học vào thời gian này.");if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Thêm buổi học cần kết nối mạng.");const result:any=await api.request(`POST /classes/${input.classId}/sessions` as any,{body:{date:input.date,start_time:input.time,is_makeup:input.makeup??false,note:input.note??""}} as any);const item={...input,id:result.id,version:result.version};commitState("session",item.id,d=>{d.sessions.push(item);});return item; }

export async function createExtraSession(input: {
    classId: string;
    date: string;
    time: string;
    note?: string;
}, today = localToday()): Promise<Session> { requirePermission("sessions_attendance","write");requireClassAccess(input.classId);const klass=getStore().classes.find(c=>c.id===input.classId);if(!klass||klass.status!=="active")throw new Error("Không thể thêm buổi cho lớp đã lưu trữ.");if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||input.date<today)throw new Error("Không thể thêm buổi trong quá khứ.");if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw new Error("Giờ học không hợp lệ.");if(getStore().sessions.some(s=>s.classId===input.classId&&s.date===input.date&&s.time===input.time))throw new Error("Đã có buổi học vào thời gian này.");if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Thêm buổi học cần kết nối mạng.");const result:any=await api.request(`POST /classes/${input.classId}/sessions` as any,{body:{date:input.date,start_time:input.time,is_makeup:true,note:input.note??""}} as any);const item:Session={...input,id:result.id,origin:"manual",status:"planned",makeup:true,version:result.version};commitState("session",item.id,d=>{d.sessions.push(item);});return item; }

export async function updateExtraSession(id: string, patch: { date?: string; time?: string; note?: string }, today = localToday()): Promise<void> {
  extraSessionUpdateError = null;
  requirePermission("sessions_attendance", "write");
  const current = getStore().sessions.find((session) => session.id === id);
  if (!current) throw new Error("Không tìm thấy buổi học.");
  requireClassAccess(current.classId);
  if (current.origin !== "manual" || current.status !== "planned") throw new Error("Chỉ sửa được buổi lẻ đang chờ học.");
  const next = { ...current, ...patch };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || next.date < today) throw new Error("Không thể chuyển buổi về ngày trong quá khứ.");
  if (!next.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time)) throw new Error("Giờ học không hợp lệ.");
  if (getStore().sessions.some((session) => session.id !== id && session.classId === current.classId && session.date === next.date && session.time === next.time)) throw new Error("Đã có buổi học vào thời gian này.");
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Sửa buổi học cần kết nối mạng.");
  const body = {
    ...(patch.date === undefined ? {} : { date: patch.date }),
    ...(patch.time === undefined ? {} : { start_time: patch.time }),
    ...(patch.note === undefined ? {} : { note: patch.note }),
    ...(current.version === undefined ? {} : { base_version: current.version }),
  };
  return api.request(`PATCH /sessions/${id}` as any, { body } as any).then((saved: any) => {
    const confirmed: Session = { ...current, date: saved.date, time: saved.start_time, note: saved.note, version: saved.version };
    commitState("session", id, (draft) => { draft.sessions = draft.sessions.map((session) => session.id === id ? confirmed : session); });
    setSaveStatus("synced");
    }).catch((cause: unknown) => {
    setSaveStatus("error");
    extraSessionUpdateError = cause instanceof ApiError
      ? cause.error.message
      : cause instanceof TypeError || (cause instanceof DOMException && ["AbortError", "TimeoutError"].includes(cause.name))
          ? "Sửa buổi học cần kết nối mạng."
          : cause instanceof Error ? cause.message : "Không thể sửa buổi học.";
    });
}

type Schedule = {
    weekdays: number[];
    time: string;
};

type SchedulePreview = {
    toRemove: Session[];
    toAdd: {
        date: string;
        time: string;
    }[];
    kept: Session[];
    retimed: Session[];
};

export function previewScheduleChange(classId: string, next: Schedule, today = localToday()): SchedulePreview { if(!getStore().classes.some(c=>c.id===classId))return{toRemove:[],toAdd:[],kept:[],retimed:[]};if(!next.weekdays.length||next.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(next.time))throw new Error("Chọn ít nhất một ngày và kiểm tra giờ học.");const state=getStore();const eligible=state.sessions.filter(s=>s.classId===classId&&s.date>=today&&s.origin==="recurring"&&s.status==="planned"&&!state.attendance.some(a=>a.sessionId===s.id));const toRemove=eligible.filter(s=>!next.weekdays.includes(new Date(`${s.date}T12:00:00`).getDay()));const kept=eligible.filter(s=>!toRemove.includes(s)&&s.time===next.time);const retimed=eligible.filter(s=>!toRemove.includes(s)&&s.time!==next.time);const removed=new Set(toRemove.map(s=>s.id));const existingDates=new Set(state.sessions.filter(s=>s.classId===classId&&!removed.has(s.id)).map(s=>s.date));const toAdd=Array.from({length:28},(_,i)=>{const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()+i);return d;}).filter(d=>next.weekdays.includes(d.getDay())).map(d=>({date:d.toISOString().slice(0,10),time:next.time})).filter(x=>!existingDates.has(x.date));return{toRemove,toAdd,kept,retimed}; }

export async function updateClassSchedule(classId: string, next: Schedule, today?: string): Promise<{
    removed: number;
    added: number;
    retimed: number;
}> { requirePermission("classes","write");requireClassAccess(classId);const current=getStore().classes.find(c=>c.id===classId);if(!current||current.status!=="active")throw new Error("Không thể sửa lịch lớp đã lưu trữ.");if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Sửa lịch lớp cần kết nối mạng.");const preview=previewScheduleChange(classId,next,today);await api.request(`PATCH /classes/${classId}` as any,{body:{weekdays:next.weekdays,start_time:next.time} as any});const remove=new Set(preview.toRemove.map(s=>s.id)),retime=new Set(preview.retimed.map(s=>s.id));commitState("schedule",classId,d=>{d.classes=d.classes.map(c=>c.id===classId?{...c,...next}:c);d.sessions=d.sessions.filter(s=>!remove.has(s.id)).map(s=>retime.has(s.id)?{...s,time:next.time}:s);for(const item of preview.toAdd)d.sessions.push({id:crypto.randomUUID(),classId,...item,origin:"recurring",status:"planned"});});return{removed:preview.toRemove.length,added:preview.toAdd.length,retimed:preview.retimed.length}; }

export async function updateClassScheduleWithName(classId: string, next: Schedule, name: string, today?: string): Promise<{
    removed: number;
    added: number;
    retimed: number;
}> { requirePermission("classes","write");requireClassAccess(classId);const current=getStore().classes.find(c=>c.id===classId);if(!current||current.status!=="active")throw new Error("Không thể sửa lịch lớp đã lưu trữ.");if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Sửa lịch lớp cần kết nối mạng.");const preview=previewScheduleChange(classId,next,today);await api.request(`PATCH /classes/${classId}` as any,{body:{name,weekdays:next.weekdays,start_time:next.time} as any});const remove=new Set(preview.toRemove.map(s=>s.id)),retime=new Set(preview.retimed.map(s=>s.id));commitState("schedule-name",classId,d=>{d.classes=d.classes.map(c=>c.id===classId?{...c,...next,name}:c);d.sessions=d.sessions.filter(s=>!remove.has(s.id)).map(s=>retime.has(s.id)?{...s,time:next.time}:s);for(const item of preview.toAdd)d.sessions.push({id:crypto.randomUUID(),classId,...item,origin:"recurring",status:"planned"});});return{removed:preview.toRemove.length,added:preview.toAdd.length,retimed:preview.retimed.length}; }

export async function setSessionStatus(id: string, status: Session["status"]): Promise<void> { requirePermission("sessions_attendance","write");const current=getSession(id);if(!current)throw new Error("Không tìm thấy buổi học.");requireClassAccess(current.classId);if(status==="cancelled"&&current.status!=="planned")throw new Error("Chỉ huỷ được buổi đang chờ học.");if(status==="cancelled"){if(typeof navigator!=="undefined"&&!navigator.onLine)throw new Error("Huỷ buổi học cần kết nối mạng.");await api.request(`POST /sessions/${id}/cancel` as any);}commitState("session-status",id,d=>{d.sessions=d.sessions.map(s=>s.id===id?{...s,status}:s);}); }

export const cancelSession: (id: string) => Promise<void> = (id)=>setSessionStatus(id,"cancelled");

export const heldSessionCount: (classId: string) => number = (classId)=>listSessions(classId).filter(s=>s.status==="held").length;

export function listPlannedSessions(classId?: string): Session[] { return getStore().sessions.filter(s=>s.status==="planned"&&(!classId||s.classId===classId)&&getStore().classes.some(c=>c.id===s.classId&&c.status==="active")).sort((a,b)=>a.date.localeCompare(b.date)); }

export function sessionNumber(session: Session): number | null { if(session.status==="cancelled")return null;return listSessions(session.classId).filter(s=>s.status!=="cancelled").findIndex(s=>s.id===session.id)+1; }

export function sessionPrefix(session: Session): string { const number=sessionNumber(session);return number===null?(session.makeup?"Buổi bù":"Buổi học"): `Buổi ${number}`; }
