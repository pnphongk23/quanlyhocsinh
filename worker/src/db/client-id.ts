import { ApiError, validationError } from '../lib/errors';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type IdTable = 'classes' | 'students' | 'class_sessions';
export type IdOwner = { table: IdTable; workspace_id: string; class_id: string };

export const idConflict = () => new ApiError(409, 'id_conflict', 'Conflict.');

/** `id` tuỳ chọn do client sinh: vắng ⇒ undefined; có mà không phải UUID ⇒ 422. Chuẩn hoá về chữ thường. */
export function parseClientId(body: Record<string, unknown>): string | undefined {
  if (!('id' in body) || body.id === undefined) return undefined;
  if (typeof body.id !== 'string' || !UUID.test(body.id)) throw validationError({ id: 'must_be_uuid' });
  return body.id.toLowerCase();
}

/** Nơi `id` đang được dùng (bảng nào, workspace nào, lớp nào), hoặc null nếu chưa có. */
export async function findIdOwner(db: D1Database, id: string): Promise<IdOwner | null> {
  return db.prepare(`SELECT 'classes' AS "table", workspace_id, id AS class_id FROM classes WHERE id = ?1
    UNION ALL SELECT 'students', workspace_id, class_id FROM students WHERE id = ?1
    UNION ALL SELECT 'class_sessions', workspace_id, class_id FROM class_sessions WHERE id = ?1 LIMIT 1`)
    .bind(id).first<IdOwner>();
}

export function isConstraintError(error: unknown): boolean {
  return /UNIQUE|PRIMARY KEY/i.test(String(error));
}
