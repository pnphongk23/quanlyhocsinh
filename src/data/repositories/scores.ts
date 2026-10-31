import type { Score } from "../types";
import { getStore } from "../store";
import { commitState, persistCommand, persistScoreCommands } from "../outbox";
import { requirePermission, requireClassAccess } from "./access";
import type { SyncCommand } from "../api/types";
import { runDurably, type WritePlan } from "./durable";
export const listScores = (testId:string):Score[] => getStore().scores.filter(s=>s.testId===testId);
function planScore(input:Omit<Score,"id">):WritePlan<Score> {
  requirePermission("scores","write"); const test=getStore().tests.find(t=>t.id===input.testId), student=getStore().students.find(s=>s.id===input.studentId);
  if(!test||!student) throw new Error("Không tìm thấy học sinh hoặc bài kiểm tra."); requireClassAccess(test.classId);
  if(test.archived) throw new Error("Bài kiểm tra đã lưu trữ, không nhập điểm được.");
  if(student.classId!==test.classId||(student.leftAt&&student.leftAt<test.date)) throw new Error("Học sinh không thuộc bài kiểm tra này.");
  if(input.value!==null&&(!Number.isFinite(input.value)||input.value<0||input.value>1000)) throw new Error("Điểm phải từ 0 đến 1000.");
  if(input.value!==null&&Math.round(input.value*2)!==input.value*2) throw new Error("Điểm phải theo bước 0,5.");
  const id=`${input.testId}:${input.studentId}`, old=getStore().scores.find(s=>s.id===id), item={...input,id};
  const payload={test_id:item.testId,student_id:item.studentId,value:item.value}; const cmd={id:crypto.randomUUID(),type:"score.set",payload,base_version:(old as any)?.version??0,created_at:new Date().toISOString()} as SyncCommand;
  return {
    result: item,
    apply: ()=>commitState("scores",id,d=>{d.scores=d.scores.filter(s=>s.id!==id).concat(item);}),
    undo: ()=>commitState("scores",id,d=>{d.scores=d.scores.filter(s=>s.id!==id).concat(old?[old]:[]);}),
    persist: ()=>persistCommand("score",[item.testId,item.studentId],{...payload,version:(old as any)?.version??0,updated_at:new Date().toISOString()},cmd),
  };
}
/** Chờ ghi bền; ghi lỗi ⇒ ném lỗi gốc và bộ nhớ về như trước. */
export const saveScoreDurable = (input:Omit<Score,"id">):Promise<Score> => runDurably(planScore(input));
export async function assignDefaultScoreDurable(testId: string, studentIds: string[], value = 15): Promise<Score[]> {
  const uniqueIds = [...new Set(studentIds)];
  const planned = uniqueIds.map((studentId) => planScore({ testId, studentId, value }));
  const changes = planned.map((plan) => plan.result).filter((item) => getStore().scores.find((score) => score.id === item.id)?.value !== value);
  if (!changes.length) return [];
  const previous = changes.map((item) => getStore().scores.find((score) => score.id === item.id)).filter((item): item is Score => Boolean(item));
  const startedAt = Date.now();
  const commands = changes.map((item, index) => {
    const old = previous.find((score) => score.id === item.id);
    const payload = { test_id: item.testId, student_id: item.studentId, value: item.value };
    const createdAt = new Date(startedAt + index).toISOString();
    const command = { id: crypto.randomUUID(), type: "score.set", payload, base_version: (old as any)?.version ?? 0, created_at: createdAt } as SyncCommand;
    return { parts: [item.testId, item.studentId], wireRecord: { ...payload, version: (old as any)?.version ?? 0, updated_at: command.created_at }, command };
  });
  const rollback = () => commitState("scores", testId, (draft) => { draft.scores = draft.scores.filter((score) => !changes.some((item) => item.id === score.id)).concat(previous); });
  commitState("scores", testId, (draft) => { draft.scores = draft.scores.filter((score) => !changes.some((item) => item.id === score.id)).concat(changes); });
  try { await persistScoreCommands(commands); } catch (error) { rollback(); throw error; }
  return changes;
}
