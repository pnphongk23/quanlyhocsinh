import type { Comment, StarLevel } from "../types";
import { generatedSlipSentence, starsFromCriteria } from "../slip";
import { getStore } from "../store";
import { commitState, persistCommand } from "../outbox";
import { type UngradedHomeworkNotice, previousHomeworkSession, studentsOnSession, ungradedHomeworkNotice } from "../homework";
import { requirePermission, requireSessionAccess } from "./access";
import type { SyncCommand } from "../api/types";
import { runDurably, type WritePlan } from "./durable";
import { scheduleSync } from "../sync";
import { db, getCacheIdentity, identityKey, stored } from "../db";
import { todayISO } from "../../shared/date";
const key=(sessionId:string,studentId:string)=>`${sessionId}:${studentId}`;
export const listComments=(classId:string):Comment[]=>getStore().comments.filter(c=>c.classId===classId);
export function listSessionComments(sessionId:string):Comment[]{return getStore().comments.filter(c=>c.sessionId===sessionId);}
export function getSessionComment(sessionId:string,studentId:string):Comment|null{return getStore().comments.find(c=>c.sessionId===sessionId&&c.studentId===studentId)??null;}
function planComment(input:{sessionId:string;studentId:string;stars?:StarLevel|null;criteria?:number;comment?:string|null;note?:string;hwManual?:boolean}):WritePlan<Comment> {
  requirePermission("comments_reports","write");
  const session=requireSessionAccess(input.sessionId);
  const student=getStore().students.find(s=>s.id===input.studentId);
  if(!student||student.classId!==session.classId||student.enrolledAt>session.date||(student.leftAt&&student.leftAt<session.date))throw new Error("Học sinh không thuộc buổi học này.");
  const old=getSessionComment(input.sessionId,input.studentId);
  const scale=old?.scale===3?3:5;
  const criteria=input.criteria??(input.stars==null?(old?.criteria??(old?.stars==null?31:(1<<old.stars)-1)):(1<<input.stars)-1);
  const stars=scale===5?starsFromCriteria(criteria):input.stars??old?.stars??3;
  const comment=scale===5?(input.criteria!==undefined?generatedSlipSentence(input.criteria):old?.comment??null):(input.comment===undefined?old?.comment??null:input.comment);
  const now=new Date().toISOString();
  const item:Comment={id:key(input.sessionId,input.studentId),classId:session.classId,sessionId:input.sessionId,studentId:input.studentId,criteria:scale===5?criteria:null,comment,scale,stars,note:input.note??old?.note??"",hwManual:input.hwManual??old?.hwManual??false,status:old?.status??"draft",sendQueued:old?.sendQueued??false,sentAt:old?.sentAt??null,updatedAt:now,createdAt:old?.createdAt??now};
  const payload={session_id:item.sessionId,student_id:item.studentId,...(scale===3?{stars:item.stars!}:{...(input.criteria===undefined?{}:{criteria:input.criteria}),comment:item.comment}),note:item.note,...(input.hwManual===undefined?{}:{hw_manual:input.hwManual})};
  const cmd={id:crypto.randomUUID(),type:"slip.set",payload,base_version:(old as any)?.version??0,created_at:now} as SyncCommand;
  return{result:item,apply:()=>commitState("comment",item.id,d=>{d.comments=d.comments.filter(c=>c.id!==item.id).concat(item);}),undo:()=>commitState("comment",item.id,d=>{d.comments=d.comments.filter(c=>c.id!==item.id).concat(old?[old]:[]);}),persist:()=>persistCommand("slip",[item.sessionId,item.studentId],{session_id:item.sessionId,student_id:item.studentId,criteria:item.criteria,comment:item.comment,scale:item.scale,stars:item.stars,note:item.note,status:item.status,sent_at:item.sentAt,version:(old as any)?.version??0,updated_at:now,hw_manual:item.hwManual?1:0},cmd)};
}
/** Chờ ghi bền; ghi lỗi ⇒ ném lỗi gốc và phiếu trở lại như trước. */
export const saveSessionCommentDurable=(input:{sessionId:string;studentId:string;stars?:StarLevel|null;criteria?:number;comment?:string|null;note?:string;hwManual?:boolean}):Promise<Comment>=>runDurably(planComment(input));
export interface SendTicketsResult { sent:string[];skipped:string[];skippedReasons:Array<{studentId:string;reason:"not_attended"|"already_sent"}>;queued:boolean;ungraded:UngradedHomeworkNotice; }
  function planSendTickets(sessionId:string,studentIds?:string[]):WritePlan<SendTicketsResult> {requirePermission("comments_reports","write");const session=requireSessionAccess(sessionId);if(session.date>todayISO())throw new Error("Chỉ gửi phiếu từ ngày học.");const requested=studentIds??studentsOnSession(getStore(),session).map(s=>s.id);const sent:string[]=[],skipped:string[]=[],skippedReasons:SendTicketsResult["skippedReasons"]=[];const previous:Array<Comment|null>=[];const targets:Comment[]=[];for(const studentId of requested){const old=getSessionComment(sessionId,studentId);if(old?.status==="sent"){skipped.push(studentId);skippedReasons.push({studentId,reason:"already_sent"});continue;}const attended=getStore().attendance.some(a=>a.sessionId===sessionId&&a.studentId===studentId&&(a.status==="present"||a.status==="late"));if(!old&&!attended){skipped.push(studentId);skippedReasons.push({studentId,reason:"not_attended"});continue;}const now=new Date().toISOString();const target:Comment=old?.scale===3&&old.stars===null?{...old,criteria:31,comment:null,scale:5,stars:5,updatedAt:now}:old??{id:key(sessionId,studentId),classId:session.classId,sessionId,studentId,criteria:31,comment:null,scale:5,stars:5,note:"",hwManual:false,status:"draft",sendQueued:false,sentAt:null,updatedAt:now,createdAt:now};sent.push(studentId);previous.push(old);targets.push(target);}
  if(sent.length&&(typeof navigator==="undefined"||!navigator.onLine))throw new Error("Cần có mạng để gửi phiếu.");
    const membership=getCacheIdentity();if(sent.length&&!membership)throw new Error("Đăng nhập để gửi phiếu.");
  const identity=identityKey();const cmd={id:crypto.randomUUID(),type:"slip.send",payload:{session_id:sessionId,student_ids:sent},created_at:new Date().toISOString()} as SyncCommand;
  const giving=previousHomeworkSession(getStore().sessions,sessionId);
    const result:SendTicketsResult={sent,skipped,skippedReasons,queued:sent.length>0&&(typeof navigator==="undefined"||!navigator.onLine),ungraded:giving?ungradedHomeworkNotice(getStore(),giving.id,sent):{students:[],ungradedParts:0}};
    const ids=new Set(targets.map(c=>c.id));
  return{result,
      apply:()=>{for(const comment of targets)commitState("comment-send",comment.id,d=>{const next={...comment,sendQueued:true,updatedAt:new Date().toISOString()};d.comments=d.comments.filter(c=>c.id!==comment.id).concat(next);});},
      undo:()=>commitState("comment-send",sessionId,d=>{d.comments=d.comments.filter(c=>!ids.has(c.id)).concat(previous.filter((p):p is Comment=>p!==null));}),
      persist:async()=>{if(!sent.length)return;const row:any={id:cmd.id,identity,type:cmd.type,payload:cmd.payload,base_version:0,membership_id:membership!.membershipId,created_at:cmd.created_at,status:"pending"};await db.transaction("rw",[db.slips,db.outbox],async()=>{for(const comment of targets){const wire={session_id:sessionId,student_id:comment.studentId,criteria:comment.criteria??null,comment:comment.comment??null,scale:comment.scale??3,stars:comment.stars,note:comment.note,status:comment.status,sent_at:comment.sentAt,version:(comment as any).version??0,updated_at:comment.updatedAt};await db.slips.put(stored("slip",`${identity}|slip|${sessionId}|${comment.studentId}`,wire) as any);}await db.outbox.put(row);});scheduleSync();}};}
/** Chờ ghi bền hàng đợi gửi; ghi lỗi ⇒ ném lỗi gốc và các phiếu bỏ trạng thái đang chờ gửi. */
export const sendSessionTicketsDurable=async(sessionId:string,studentIds?:string[]):Promise<SendTicketsResult>=>runDurably(planSendTickets(sessionId,studentIds));
export function flushQueuedTickets():number {const count=getStore().comments.filter(c=>c.sendQueued).length;scheduleSync(0);return count;}
