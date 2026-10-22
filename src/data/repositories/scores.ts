import type { Score } from "../types";
import { getStore } from "../store";
import { commitState, persistCommand } from "../outbox";
import { requirePermission, requireClassAccess } from "./access";
import type { SyncCommand } from "../api/types";
export const listScores = (testId:string):Score[] => getStore().scores.filter(s=>s.testId===testId);
export function saveScore(input:Omit<Score,"id">):Score {
  requirePermission("scores","write"); const test=getStore().tests.find(t=>t.id===input.testId), student=getStore().students.find(s=>s.id===input.studentId);
  if(!test||!student) throw new Error("Không tìm thấy học sinh hoặc bài kiểm tra."); requireClassAccess(test.classId);
  if(test.archived) throw new Error("Bài kiểm tra đã lưu trữ, không nhập điểm được.");
  if(student.classId!==test.classId||student.enrolledAt>test.date||(student.leftAt&&student.leftAt<test.date)) throw new Error("Học sinh không thuộc bài kiểm tra này.");
  if(input.value!==null&&(!Number.isFinite(input.value)||input.value<0||input.value>test.max)) throw new Error(`Điểm phải từ 0 đến ${test.max}.`);
  if(input.value!==null&&Math.round(input.value*2)!==input.value*2) throw new Error("Điểm phải theo bước 0,5.");
  const id=`${input.testId}:${input.studentId}`, old=getStore().scores.find(s=>s.id===id), item={...input,id};
  commitState("scores",id,d=>{d.scores=d.scores.filter(s=>s.id!==id).concat(item);});
  const payload={test_id:item.testId,student_id:item.studentId,value:item.value}; const cmd={id:crypto.randomUUID(),type:"score.set",payload,base_version:(old as any)?.version??0,created_at:new Date().toISOString()} as SyncCommand;
  void persistCommand("score",[item.testId,item.studentId],{...payload,version:(old as any)?.version??0,updated_at:new Date().toISOString()},cmd).catch(()=>{}); return item;
}
