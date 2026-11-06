import { ApiError, forbidden, notFound } from '../lib/errors';
import type { Identity } from '../types';

export type CriterionLevel = 'good' | 'ok' | 'needs_work';
export type Criterion = {
  id: string; name: string; texts: Record<CriterionLevel, string>; default_level: CriterionLevel; homework: boolean;
};

/** THỬ NGHIỆM sau cờ CRITERIA_LEVELS. Seed giữ nguyên văn bản requirements.md. */
export const DEFAULT_CRITERIA: Criterion[] = [
  { id: 'focus', name: 'Học tập trung', texts: {
    good: 'Con học tập trung, chú ý nghe giảng suốt buổi.', ok: 'Con khá tập trung, thỉnh thoảng còn mất chú ý.',
    needs_work: 'Con còn hay mất tập trung, nói chuyện riêng, cần nhắc nhở thêm.',
  }, default_level: 'good', homework: false },
  { id: 'participation', name: 'Tích cực tham gia', texts: {
    good: 'Con hăng hái phát biểu và tham gia các hoạt động trong lớp.', ok: 'Con có tham gia hoạt động nhưng chưa chủ động phát biểu.',
    needs_work: 'Con còn rụt rè, ít tham gia; bố mẹ khuyến khích con mạnh dạn hơn nhé.',
  }, default_level: 'good', homework: false },
  { id: 'mastery', name: 'Nắm bài hôm nay', texts: {
    good: 'Con nắm chắc bài hôm nay và vận dụng tốt.', ok: 'Con nắm được phần chính của bài hôm nay, cần ôn thêm cho chắc.',
    needs_work: 'Con chưa nắm vững bài hôm nay, bố mẹ cho con ôn lại nhé.',
  }, default_level: 'ok', homework: false },
  { id: 'notes', name: 'Ghi chép và làm bài trên lớp', texts: {
    good: 'Con ghi bài đầy đủ, làm bài trên lớp cẩn thận.', ok: 'Con ghi bài và làm bài trên lớp nhưng còn thiếu hoặc chưa cẩn thận.',
    needs_work: 'Con chưa ghi bài và làm bài trên lớp đầy đủ, cần cố gắng hơn.',
  }, default_level: 'good', homework: false },
  { id: 'homework', name: 'Bài tập về nhà (Theo chấm BTVN)', texts: {
    good: 'Con làm bài tập về nhà đầy đủ và chính xác.', ok: 'Con làm bài tập về nhà nhưng còn sai sót.',
    needs_work: 'Con chưa hoàn thành bài tập về nhà; bố mẹ nhắc con làm bù trước buổi sau nhé.',
  }, default_level: 'good', homework: true },
];

export function seedCriteriaStatements(db: D1Database, workspaceId: string, now: string): D1PreparedStatement[] {
  return [
    db.prepare(`INSERT INTO criteria_sets(workspace_id,version,updated_at,updated_by) VALUES(?,1,?,NULL)`)
      .bind(workspaceId, now),
    ...DEFAULT_CRITERIA.map((item, position) => db.prepare(`INSERT INTO comment_criteria
      (workspace_id,id,position,name,text_good,text_ok,text_needs_work,default_level,homework,deleted_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?)`).bind(workspaceId,item.id,position,item.name,item.texts.good,item.texts.ok,
      item.texts.needs_work,item.default_level,Number(item.homework),now,now)),
  ];
}

const validation = (reason: string, index?: number, field?: string) => new ApiError(422, 'validation', 'Invalid request.',
  { reason, ...(index === undefined ? {} : { index }), ...(field === undefined ? {} : { field }) });
const normalize = (value: unknown, max: number, index: number, field: string): string => {
  if (typeof value !== 'string') throw validation('text_length', index, field);
  const result = value.trim().normalize('NFC');
  const length = Array.from(result).length;
  if (length < 1 || length > max) throw validation(field === 'name' ? 'name_length' : 'text_length', index, field);
  return result;
};
const levelNames: CriterionLevel[] = ['good', 'ok', 'needs_work'];

function publicCriteria(rows: Record<string, any>[]): Criterion[] {
  return rows.map(row => ({ id: row.id, name: row.name, texts: { good: row.text_good, ok: row.text_ok,
    needs_work: row.text_needs_work }, default_level: row.default_level, homework: Boolean(row.homework) }));
}

async function getCriteria(db: D1Database, workspaceId: string) {
  const [set, rows] = await Promise.all([
    db.prepare('SELECT version FROM criteria_sets WHERE workspace_id=?').bind(workspaceId).first<{version:number}>(),
    db.prepare(`SELECT id,name,text_good,text_ok,text_needs_work,default_level,homework FROM comment_criteria
      WHERE workspace_id=? AND deleted_at IS NULL ORDER BY position,id`).bind(workspaceId).all<Record<string,any>>(),
  ]);
  return set ? { version: set.version, criteria: publicCriteria(rows.results) } : { version: 0, criteria: DEFAULT_CRITERIA };
}

export async function readCriteriaSet(db: D1Database, identity: Identity) {
  if (identity.scopeKind === 'linked_students') throw forbidden();
  if (identity.permissions.comments_reports === 'none') throw forbidden();
  return getCriteria(db, identity.workspaceId);
}

export async function replaceCriteriaSet(db: D1Database, identity: Identity, body: Record<string, unknown>, enabled: boolean) {
  if (!enabled) throw forbidden({ reason: 'feature_disabled' });
  if (identity.roleSystemKey !== 'admin') throw forbidden({ reason: 'admin_required' });
  const version = await db.prepare('SELECT version FROM criteria_sets WHERE workspace_id=?').bind(identity.workspaceId).first<{version:number}>();
  if (!version) throw notFound();
  if (!Number.isSafeInteger(body.base_version) || (body.base_version as number) < 0) throw validation('base_version');
  if (body.base_version !== version.version) {
    throw new ApiError(409, 'conflict', 'Conflict.', { reason: 'version_conflict', current: { version: version.version } });
  }
  if (!Array.isArray(body.criteria) || body.criteria.length < 1 || body.criteria.length > 8) throw validation('criteria_count');
  const criteria = body.criteria.map((raw, index): Criterion => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw validation('unknown_criterion', index);
    const item = raw as Record<string, unknown>;
    const id = item.id;
    if (id !== undefined && (typeof id !== 'string' || !/^(focus|participation|mastery|notes|homework|c_[0-9a-f-]{36})$/.test(id)))
      throw validation('unknown_criterion', index, 'id');
    const name = normalize(item.name, 40, index, 'name');
    if (!item.texts || typeof item.texts !== 'object' || Array.isArray(item.texts)) throw validation('text_length', index, 'texts');
    const texts = item.texts as Record<string, unknown>;
    const parsedTexts = { good: normalize(texts.good, 200, index, 'texts.good'), ok: normalize(texts.ok, 200, index, 'texts.ok'),
      needs_work: normalize(texts.needs_work, 200, index, 'texts.needs_work') };
    if (!levelNames.includes(item.default_level as CriterionLevel)) throw validation('default_level', index, 'default_level');
    if (typeof item.homework !== 'boolean') throw validation('homework_multiple', index, 'homework');
    return { id: id as string | undefined ?? '', name, texts: parsedTexts, default_level: item.default_level as CriterionLevel, homework: item.homework };
  });
  const names = criteria.map(x => x.name.toLocaleLowerCase());
  if (new Set(names).size !== names.length) throw validation('name_duplicate');
  if (criteria.filter(x => x.homework).length > 1) throw validation('homework_multiple');
  const existing = await db.prepare('SELECT id,deleted_at FROM comment_criteria WHERE workspace_id=?').bind(identity.workspaceId).all<{id:string;deleted_at:string|null}>();
  const existingIds = new Set(existing.results.filter(x=>x.deleted_at===null).map(x => x.id));
  const bodyIds = criteria.filter(x => x.id).map(x => x.id);
  if (new Set(bodyIds).size !== bodyIds.length) throw validation('id_duplicate');
  for (const id of bodyIds) if (!existingIds.has(id)) throw validation('unknown_criterion');
  const now = new Date().toISOString();
  const rows = criteria.map((item, position) => ({ ...item, id: item.id || `c_${crypto.randomUUID()}`, position }));
  const statements = [db.prepare(`UPDATE criteria_sets SET version=version+1,updated_at=?,updated_by=?
    WHERE workspace_id=? AND version=?`).bind(now, identity.userId, identity.workspaceId, version.version)];
  for (const item of rows) statements.push(db.prepare(`INSERT INTO comment_criteria
      (workspace_id,id,position,name,text_good,text_ok,text_needs_work,default_level,homework,deleted_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?) ON CONFLICT(workspace_id,id) DO UPDATE SET position=excluded.position,
      name=excluded.name,text_good=excluded.text_good,text_ok=excluded.text_ok,text_needs_work=excluded.text_needs_work,
      default_level=excluded.default_level,homework=excluded.homework,deleted_at=NULL,updated_at=excluded.updated_at
      WHERE changes()>0 AND EXISTS(SELECT 1 FROM criteria_sets WHERE workspace_id=? AND version=?)`)
    .bind(identity.workspaceId,item.id,item.position,item.name,item.texts.good,item.texts.ok,item.texts.needs_work,
      item.default_level,Number(item.homework),now,now,identity.workspaceId,version.version+1));
  const keepIds = rows.map(x => x.id);
  statements.push(db.prepare(`UPDATE comment_criteria SET deleted_at=?,updated_at=? WHERE workspace_id=?
    AND deleted_at IS NULL AND id NOT IN (${keepIds.map(()=>'?').join(',')})
    AND changes()>0 AND EXISTS(SELECT 1 FROM criteria_sets WHERE workspace_id=? AND version=?)`)
    .bind(now,now,identity.workspaceId,...keepIds,identity.workspaceId,version.version+1));
  const result = await db.batch(statements);
  if (!result[0]?.meta.changes) {
    const current = await db.prepare('SELECT version FROM criteria_sets WHERE workspace_id=?').bind(identity.workspaceId).first<{version:number}>();
    throw new ApiError(409, 'conflict', 'Conflict.', { reason: 'version_conflict', current: { version: current?.version ?? version.version } });
  }
  return getCriteria(db, identity.workspaceId);
}
