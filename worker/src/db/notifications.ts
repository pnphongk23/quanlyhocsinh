// Tầng truy cập D1 của nhóm: notifications — Thông báo trong app (notifications).
// Pha 2c: đọc inbox và đánh dấu đã đọc. Mọi truy vấn D1 của nhóm này CHỈ được viết ở
// file này; mọi hàm nhận Identity đã xác thực và tự áp workspace_id + quyền + phạm vi
// (authz-matrix.md mục 3, api-spec.md mục 7).
import { forbidden, validationError } from '../lib/errors';
import { nowIso } from '../lib/time';
import type { Identity } from '../types';

/** Kênh thông báo theo loại sự kiện — quyết định nhóm quyền cần còn hiệu lực. */
const KIND_GROUP = {
  slip_sent: 'comments_reports',
  report_published: 'comments_reports',
  homework_assigned: 'comments_reports',
  score_updated: 'scores',
} as const;

export interface NotificationItem {
  id: number;
  kind: keyof typeof KIND_GROUP;
  student_id: string;
  session_id: string | null;
  report_id: string | null;
  test_id: string | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  next_cursor: string | null;
}

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

/** Nhóm quyền phải còn hiệu lực để một loại thông báo được đọc/nhận push. */
export function permGroupForKind(kind: string): 'comments_reports' | 'scores' {
  return kind === 'score_updated' ? 'scores' : 'comments_reports';
}

/** Inbox trong app chỉ dành cho Phụ huynh (api-spec.md mục 7, authz-matrix.md 2.5). */
function assertGuardian(identity: Identity): void {
  if (identity.scopeKind !== 'linked_students') throw forbidden();
}

/** Con trỏ mờ, ổn định khi có dòng mới: đánh dấu mốc `id` của dòng cuối đã trả. */
export function encodeNotificationCursor(id: number): string {
  return `n${id.toString(36)}`;
}

export function decodeNotificationCursor(cursor: string): number {
  const match = /^n([0-9a-z]{1,12})$/.exec(cursor);
  if (!match) throw validationError(undefined, 'invalid_cursor');
  const value = Number.parseInt(match[1] ?? '', 36);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw validationError(undefined, 'invalid_cursor');
  }
  return value;
}

/**
 * Trang inbox của membership hiện hành. Mỗi lần đọc kiểm lại liên kết con và quyền
 * đọc của vai trò (phụ huynh có thể bị Admin tắt nhóm quyền), và với `score_updated`
 * còn kiểm bài chưa lưu trữ. Không trả nội dung nhận xét/điểm/SĐT/token
 * (architecture.md mục 4).
 */
export async function listNotifications(
  db: D1Database,
  identity: Identity,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<NotificationPage> {
  assertGuardian(identity);

  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
  const allowedKinds = (Object.keys(KIND_GROUP) as (keyof typeof KIND_GROUP)[]).filter(
    (kind) => {
      const level = identity.permissions[KIND_GROUP[kind]] ?? 'none';
      return level === 'read' || level === 'write';
    },
  );
  if (allowedKinds.length === 0) return { items: [], next_cursor: null };

  const before =
    options.cursor !== null && options.cursor !== undefined
      ? decodeNotificationCursor(options.cursor)
      : null;

  const statements: D1PreparedStatement[] = [];
  const binds: unknown[] = [
    identity.workspaceId,
    identity.membershipId,
    identity.userId,
    ...allowedKinds,
  ];
  let sql = `SELECT n.id, n.kind, n.student_id, n.session_id,
      CASE WHEN n.kind = 'report_published' THEN n.report_id ELSE NULL END AS report_id,
      CASE WHEN n.kind = 'score_updated' THEN n.test_id ELSE NULL END AS test_id,
      n.created_at, n.read_at
    FROM notifications n
    WHERE n.workspace_id = ? AND n.membership_id = ? AND n.user_id = ?
      AND n.kind IN (${allowedKinds.map(() => '?').join(',')})
      AND EXISTS (SELECT 1 FROM guardian_student gs
                   WHERE gs.workspace_id = n.workspace_id
                     AND gs.user_id = n.user_id
                     AND gs.student_id = n.student_id)
      AND (n.kind <> 'score_updated'
           OR EXISTS (SELECT 1 FROM tests t
                       WHERE t.workspace_id = n.workspace_id
                         AND t.id = n.test_id
                         AND t.archived = 0))
      AND (n.kind <> 'report_published'
           OR NOT EXISTS (SELECT 1 FROM reports r JOIN report_batches b ON b.id = r.batch_id
                           WHERE r.id = n.report_id AND b.deleted_at IS NOT NULL))`;
  if (before !== null) {
    sql += ' AND n.id < ?';
    binds.push(before);
  }
  sql += ' ORDER BY n.id DESC LIMIT ?';
  binds.push(limit + 1);
  statements.push(db.prepare(sql).bind(...binds));

  const { results } = await statements[0]!.all<NotificationItem>();
  const items = results.slice(0, limit);
  const last = items[items.length - 1];
  const next_cursor =
    results.length > limit && last ? encodeNotificationCursor(last.id) : null;
  return { items, next_cursor };
}

/**
 * Đánh dấu đã đọc mọi thông báo tới `up_to_id` của CHÍNH membership hiện hành.
 * Trả số dòng vừa đổi.
 */
export async function markNotificationsRead(
  db: D1Database,
  identity: Identity,
  upToId: number,
): Promise<{ updated: number }> {
  assertGuardian(identity);
  if (!Number.isSafeInteger(upToId) || upToId < 0) {
    throw validationError({ up_to_id: 'must_be_non_negative_integer' });
  }
  const result = await db
    .prepare(
      `UPDATE notifications
          SET read_at = ?
        WHERE workspace_id = ? AND membership_id = ? AND user_id = ?
          AND read_at IS NULL AND id <= ?`,
    )
    .bind(nowIso(), identity.workspaceId, identity.membershipId, identity.userId, upToId)
    .run();
  return { updated: result.meta?.changes ?? 0 };
}
