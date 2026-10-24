import type { Comment, StarLevel } from "../types";
import { getStore } from "../store";
import { commitState, persistCommand } from "../outbox";
import { type UngradedHomeworkNotice, previousHomeworkSession, ungradedHomeworkNotice } from "../homework";
import { requirePermission, requireSessionAccess } from "./access";
import type { SyncCommand } from "../api/types";
import { runDurably, type WritePlan } from "./durable";
import { scheduleSync } from "../sync";
import { db, getCacheIdentity, identityKey, stored } from "../db";
const key=(sessionId:string,studentId:string)=>`${sessionId}:${studentId}`;
export const listComments=(classId:string):Comment[]=>getStore().comments.filter(c=>c.classId===classId);
export function listSessionComments(sessionId:string):Comment[]{return getStore().comments.filter(c=>c.sessionId===sessionId);}
export function getSessionComment(sessionId:string,studentId:string):Comment|null{return getStore().comments.find(c=>c.sessionId===sessionId&&c.studentId===studentId)??null;}
function planComment(input:{sessionId:string;studentId:string;stars:StarLevel|null;note?:string}):WritePlan<Comment> {requirePermission("comments_reports","write");const session=requireSessionAccess(input.sessionId);const student=getStore().students.find(s=>s.id===input.studentId);if(!student||student.classId!==session.classId||student.enrolledAt>session.date||(student.leftAt&&student.leftAt<session.date))throw new Error("Học sinh không thuộc buổi học này.");const old=getSessionComment(input.sessionId,input.studentId);const now=new Date().toISOString();const item:Comment={id:key(input.sessionId,input.studentId),classId:session.classId,sessionId:input.sessionId,studentId:input.studentId,stars:input.stars,note:input.note??"",status:old?.status??"draft",sendQueued:old?.sendQueued??false,sentAt:old?.sentAt??null,updatedAt:now,createdAt:old?.createdAt??now};const cmd={id:crypto.randomUUID(),type:"slip.set",payload:{session_id:item.sessionId,student_id:item.studentId,stars:item.stars,note:item.note},base_version:(old as any)?.version??0,created_at:now} as SyncCommand;return{result:item,apply:()=>commitState("comment",item.id,d=>{d.comments=d.comments.filter(c=>c.id!==item.id).concat(item);}),undo:()=>commitState("comment",item.id,d=>{d.comments=d.comments.filter(c=>c.id!==item.id).concat(old?[old]:[]);}),persist:()=>persistCommand("slip",[item.sessionId,item.studentId],{session_id:item.sessionId,student_id:item.studentId,stars:item.stars,note:item.note,status:item.status,sent_at:item.sentAt,version:(old as any)?.version??0,updated_at:now},cmd)};}
/** Chờ ghi bền; ghi lỗi ⇒ ném lỗi gốc và phiếu trở lại như trước. */
export const saveSessionCommentDurable=(input:{sessionId:string;studentId:string;stars:StarLevel|null;note?:string}):Promise<Comment>=>runDurably(planComment(input));
export interface SendTicketsResult { sent:string[];skipped:string[];queued:boolean;ungraded:UngradedHomeworkNotice; }
function planSendTickets(sessionId:string,studentIds?:string[]):WritePlan<SendTicketsResult> {requirePermission("comments_reports","write");const session=requireSessionAccess(sessionId);if(session.date>new Date().toISOString().slice(0,10))throw new Error("Chỉ gửi phiếu từ ngày học.");const requested=studentIds??getStore().students.filter(s=>s.classId===session.classId&&s.status==="active").map(s=>s.id);const sent:string[]=[],skipped:string[]=[];const previous:Comment[]=[];for(const studentId of requested){const comment=getSessionComment(sessionId,studentId);if(!comment||comment.stars===null||comment.status==="sent"){skipped.push(studentId);continue;}sent.push(studentId);previous.push(comment);}
  const membership=getCacheIdentity();if(sent.length&&!membership)throw new Error("Đăng nhập để gửi phiếu.");
  const identity=identityKey();const cmd={id:crypto.randomUUID(),type:"slip.send",payload:{session_id:sessionId,student_ids:sent},created_at:new Date().toISOString()} as SyncCommand;
  const giving=previousHomeworkSession(getStore().sessions,sessionId);
  const result:SendTicketsResult={sent,skipped,queued:sent.length>0&&(typeof navigator==="undefined"||!navigator.onLine),ungraded:giving?ungradedHomeworkNotice(getStore(),giving.id,sent):{students:[],ungradedParts:0}};
  const ids=new Set(previous.map(c=>c.id));
  return{result,
    apply:()=>{for(const comment of previous)commitState("comment-send",comment.id,d=>{d.comments=d.comments.map(c=>c.id===comment.id?{...c,sendQueued:true,updatedAt:new Date().toISOString()}:c);});},
    undo:()=>commitState("comment-send",sessionId,d=>{d.comments=d.comments.map(c=>ids.has(c.id)?previous.find(p=>p.id===c.id)!:c);}),
    persist:async()=>{if(!sent.length)return;const row:any={id:cmd.id,identity,type:cmd.type,payload:cmd.payload,base_version:0,membership_id:membership!.membershipId,created_at:cmd.created_at,status:"pending"};await db.transaction("rw",[db.slips,db.outbox],async()=>{for(const comment of previous){const wire={session_id:sessionId,student_id:comment.studentId,stars:comment.stars,note:comment.note,status:comment.status,sent_at:comment.sentAt,version:(comment as any).version??0,updated_at:comment.updatedAt};await db.slips.put(stored("slip",`${identity}|slip|${sessionId}|${comment.studentId}`,wire) as any);}await db.outbox.put(row);});scheduleSync();}};}
/** Chờ ghi bền hàng đợi gửi; ghi lỗi ⇒ ném lỗi gốc và các phiếu bỏ trạng thái đang chờ gửi. */
export const sendSessionTicketsDurable=(sessionId:string,studentIds?:string[]):Promise<SendTicketsResult>=>runDurably(planSendTickets(sessionId,studentIds));
export function flushQueuedTickets():number {const count=getStore().comments.filter(c=>c.sendQueued).length;scheduleSync(0);return count;}
