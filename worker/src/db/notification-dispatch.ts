// Cron mở rộng inbox + gửi FCM (api-spec.md mục 7, data-model.md mục 2.7,
// stack-and-cpu.md mục 9).
//
// Hàm xuất ra để `src/index.ts` nối vào handler `scheduled` (yêu cầu đã ghi ở
// `plans/20261021-mvp/briefs/backend-requests.md`). Mọi truy vấn D1 của nhóm nằm ở đây,
// `notifications.ts`, `devices.ts` và `fcm-sender.ts`.
//
// Ngân sách mỗi invocation (chưa đo, giảm lô nếu vượt CPU/subrequest):
// - 5 inbox, 20 đăng ký thiết bị (kể cả dòng bị skip), 5 delivery.
import { isoAt, nowIso } from '../lib/time';
import {
  readServiceAccount,
  sendPushToDevice,
  type FcmEnv,
  type FcmKind,
  type FetchLike,
} from './fcm-sender';
import { permGroupForKind } from './notifications';

export const INBOX_BUDGET = 5;
export const REGISTRATION_BUDGET = 20;
export const DELIVERY_BUDGET = 5;
export const MAX_ATTEMPTS = 5;
const LEASE_MS = 60_000;
const NO_CREDENTIALS_DEFER_MS = 60_000;

export interface DispatchOptions {
  now?: string;
  fetchImpl?: FetchLike;
  inboxBudget?: number;
  registrationBudget?: number;
  deliveryBudget?: number;
}

export interface DispatchSummary {
  inboxes: number;
  registrations: number;
  deliveries: number;
  sent: number;
  skipped: number;
  failed: number;
  pending: number;
}

interface Candidate {
  id: number;
  workspace_id: string;
  membership_id: string;
  kind: FcmKind;
  event_version: number;
  expansion_started_at: string | null;
}

interface Claimed {
  delivery_cursor: string | null;
}

interface RegistrationRow {
  id: string;
  registration_version: number;
  eligible: number;
}

interface DeliveryRow {
  notification_id: number;
  membership_id: string;
  device_id: string;
  registration_version: number;
  attempts: number;
  kind: FcmKind;
  student_id: string;
  session_id: string | null;
  report_id: string | null;
  test_id: string | null;
  token: string;
}

function budget(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}

const CANDIDATE_SQL = `SELECT id, workspace_id, membership_id, kind, event_version, expansion_started_at
    FROM notifications
   WHERE deliveries_expanded_at IS NULL AND ready_at <= ?
   ORDER BY ready_at, id
   LIMIT ?`;

const INITIAL_CLAIM_SQL = `UPDATE notifications
    SET expansion_started_at = ?, expansion_lease_id = ?, expansion_lease_until = ?
  WHERE id = ?
    AND deliveries_expanded_at IS NULL
    AND expansion_started_at IS NULL
    AND ready_at <= ?
    AND event_version = ?
  RETURNING delivery_cursor`;

const RECLAIM_SQL = `UPDATE notifications
    SET expansion_lease_id = ?, expansion_lease_until = ?
  WHERE id = ?
    AND deliveries_expanded_at IS NULL
    AND expansion_started_at IS NOT NULL
    AND (expansion_lease_until IS NULL OR expansion_lease_until < ?)
    AND ready_at <= ?
  RETURNING delivery_cursor`;

// Phân trang TRƯỚC, lọc điều kiện SAU: predicate chỉ nằm trong projection `eligible`,
// không nằm ở WHERE trước LIMIT, nên dòng bị skip vẫn chiếm ngân sách và cursor vẫn tiến.
const PAGE_SQL = `SELECT d.id, d.registration_version,
    CASE WHEN d.membership_id = n.membership_id
          AND d.bound_at <= n.created_at
          AND s.id IS NOT NULL
          AND s.revoked_at IS NULL
          AND s.expires_at > ?
          AND s.user_id = d.user_id
          AND s.membership_id = d.membership_id
          AND u.status = 'active'
          AND m.status = 'active'
          AND EXISTS (SELECT 1 FROM role_permissions rp
                       WHERE rp.role_id = m.role_id AND rp.perm_group = ?
                         AND rp.level IN ('read','write'))
          AND EXISTS (SELECT 1 FROM guardian_student gs
                       WHERE gs.workspace_id = d.workspace_id
                         AND gs.user_id = d.user_id
                         AND gs.student_id = n.student_id)
          AND (n.kind <> 'score_updated'
               OR EXISTS (SELECT 1 FROM tests t
                           WHERE t.workspace_id = n.workspace_id
                             AND t.id = n.test_id AND t.archived = 0))
         THEN 1 ELSE 0 END AS eligible
  FROM device_tokens d
  JOIN notifications n
    ON n.id = ? AND n.workspace_id = d.workspace_id AND n.membership_id = d.membership_id
  LEFT JOIN auth_sessions s ON s.id = d.auth_session_id
  LEFT JOIN users u ON u.id = d.user_id
  LEFT JOIN memberships m ON m.id = d.membership_id
 WHERE d.workspace_id = ? AND d.membership_id = ? AND d.id > ?
 ORDER BY d.id ASC
 LIMIT ?`;

const INSERT_DELIVERY_SQL = `INSERT OR IGNORE INTO push_deliveries
    (notification_id, membership_id, device_id, registration_version,
     status, attempts, next_attempt_at)
  SELECT ?, ?, d.id, ?, 'pending', 0, ?
    FROM device_tokens d
   WHERE d.id = ? AND d.membership_id = ?
     AND EXISTS (SELECT 1 FROM notifications
                  WHERE id = ? AND expansion_lease_id = ?)`;

const CURSOR_SQL = `UPDATE notifications SET delivery_cursor = ?
  WHERE id = ? AND expansion_lease_id = ?`;

const COMPLETE_SQL = `UPDATE notifications
    SET deliveries_expanded_at = ?, expansion_lease_id = NULL, expansion_lease_until = NULL
  WHERE id = ? AND expansion_lease_id = ? AND COALESCE(delivery_cursor, '') = ?`;

const DUE_SQL = `SELECT pd.notification_id, pd.membership_id, pd.device_id,
       pd.registration_version, pd.attempts,
       n.kind, n.student_id, n.session_id, n.report_id, n.test_id,
       d.token
    FROM push_deliveries pd
    JOIN notifications n
      ON n.id = pd.notification_id AND n.membership_id = pd.membership_id
    JOIN device_tokens d
      ON d.id = pd.device_id AND d.membership_id = pd.membership_id
   WHERE pd.status = 'pending' AND pd.next_attempt_at <= ?
   ORDER BY pd.next_attempt_at, pd.notification_id, pd.device_id
   LIMIT ?`;

// Kiểm lại danh tính đầy đủ NGAY TRƯỚC MỖI LẦN GỬI (R2-02): user + membership còn active,
// phiên chưa thu hồi/hết hạn và khớp đúng user/membership của token, đúng
// `registration_version` đã chụp, còn quyền nhóm và liên kết con, bài chưa lưu trữ.
const SENDER_OK_SQL = `SELECT 1 AS ok
    FROM device_tokens d
    JOIN notifications n ON n.id = ?
    JOIN users u ON u.id = d.user_id
    JOIN memberships m ON m.id = d.membership_id AND m.workspace_id = d.workspace_id
    JOIN auth_sessions s ON s.id = d.auth_session_id
   WHERE d.id = ? AND d.membership_id = ? AND d.registration_version = ?
     AND d.workspace_id = n.workspace_id AND d.membership_id = n.membership_id
     AND d.user_id = n.user_id
     AND u.status = 'active' AND m.status = 'active'
     AND s.revoked_at IS NULL AND s.expires_at > ?
     AND s.user_id = d.user_id AND s.membership_id = d.membership_id
     AND EXISTS (SELECT 1 FROM role_permissions rp
                  WHERE rp.role_id = m.role_id AND rp.perm_group = ?
                    AND rp.level IN ('read','write'))
     AND EXISTS (SELECT 1 FROM guardian_student gs
                  WHERE gs.workspace_id = d.workspace_id
                    AND gs.user_id = d.user_id AND gs.student_id = n.student_id)
     AND (n.kind <> 'score_updated'
          OR EXISTS (SELECT 1 FROM tests t
                      WHERE t.workspace_id = n.workspace_id
                        AND t.id = n.test_id AND t.archived = 0))
     AND (n.kind <> 'report_published'
          OR NOT EXISTS (SELECT 1 FROM reports r JOIN report_batches b ON b.id = r.batch_id
                          WHERE r.id = n.report_id AND b.deleted_at IS NOT NULL))`;

const CLAIM_DELIVERY_SQL = `UPDATE push_deliveries
    SET status = 'sending', lease_id = ?, lease_until = ?, attempts = attempts + 1
  WHERE notification_id = ? AND device_id = ?
    AND status = 'pending' AND next_attempt_at <= ?`;

function settle(
  db: D1Database,
  status: 'sent' | 'skipped' | 'failed' | 'pending',
  delivery: { notification_id: number; device_id: string },
  leaseId: string,
  at: string,
  errorCode: string | null,
): Promise<unknown> {
  if (status === 'sent') {
    return db
      .prepare(
        `UPDATE push_deliveries
            SET status = 'sent', sent_at = ?, lease_id = NULL, lease_until = NULL, error_code = NULL
          WHERE notification_id = ? AND device_id = ? AND status = 'sending' AND lease_id = ?`,
      )
      .bind(at, delivery.notification_id, delivery.device_id, leaseId)
      .run();
  }
  return db
    .prepare(
      `UPDATE push_deliveries
          SET status = '${status}', lease_id = NULL, lease_until = NULL,
              next_attempt_at = ?, error_code = ?
        WHERE notification_id = ? AND device_id = ? AND status = 'sending' AND lease_id = ?`,
    )
    .bind(at, errorCode, delivery.notification_id, delivery.device_id, leaseId)
    .run();
}

/**
 * Một lượt cron: claim inbox (CAS theo `event_version` + `ready_at`), fanout có trần, rồi
 * gửi tối đa `deliveryBudget` delivery. Không ném lỗi khi thiếu cấu hình FCM: delivery ở
 * lại `pending` cho lượt sau.
 */
export async function runNotificationDispatch(
  env: FcmEnv,
  options: DispatchOptions = {},
): Promise<DispatchSummary> {
  const now = options.now ?? nowIso();
  const nowMs = Date.parse(now);
  const fetchImpl: FetchLike =
    options.fetchImpl ?? ((input, init) => fetch(input, init));
  const summary: DispatchSummary = {
    inboxes: 0,
    registrations: 0,
    deliveries: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    pending: 0,
  };

  let registrationBudget = budget(options.registrationBudget, REGISTRATION_BUDGET);

  const candidates = await env.DB.prepare(CANDIDATE_SQL)
    .bind(now, budget(options.inboxBudget, INBOX_BUDGET))
    .all<Candidate>();

  for (const candidate of candidates.results) {
    const leaseId = crypto.randomUUID();
    const leaseUntil = isoAt(nowMs + LEASE_MS);

    // Freeze bằng CAS, đúng một lần. Nhánh reclaim chỉ áp cho dòng đã freeze và không ghi
    // lại `expansion_started_at`.
    const claimed =
      candidate.expansion_started_at === null
        ? await env.DB.prepare(INITIAL_CLAIM_SQL)
            .bind(now, leaseId, leaseUntil, candidate.id, now, candidate.event_version)
            .first<Claimed>()
        : await env.DB.prepare(RECLAIM_SQL)
            .bind(leaseId, leaseUntil, candidate.id, now, now)
            .first<Claimed>();
    // 0 dòng: score commit chen giữa (dời ready_at/tăng event_version) hoặc job khác giữ lease.
    if (!claimed) continue;
    summary.inboxes += 1;

    const group = permGroupForKind(candidate.kind);
    let cursor = typeof claimed.delivery_cursor === 'string' ? claimed.delivery_cursor : null;
    let finished = false;

    while (!finished && registrationBudget > 0) {
      const requested = registrationBudget;
      const page = await env.DB.prepare(PAGE_SQL)
        .bind(
          now,
          group,
          candidate.id,
          candidate.workspace_id,
          candidate.membership_id,
          cursor ?? '',
          requested,
        )
        .all<RegistrationRow>();

      registrationBudget -= page.results.length;
      summary.registrations += page.results.length;
      const last = page.results[page.results.length - 1];
      const nextCursor = last ? last.id : cursor;
      const exhausted = page.results.length < requested;

      const statements: D1PreparedStatement[] = [];
      let eligibleCount = 0;
      for (const row of page.results) {
        if (row.eligible !== 1) continue;
        eligibleCount += 1;
        statements.push(
          env.DB.prepare(INSERT_DELIVERY_SQL).bind(
            candidate.id,
            candidate.membership_id,
            row.registration_version,
            now,
            row.id,
            candidate.membership_id,
            candidate.id,
            leaseId,
          ),
        );
      }
      statements.push(env.DB.prepare(CURSOR_SQL).bind(nextCursor, candidate.id, leaseId));
      if (exhausted) {
        statements.push(
          env.DB.prepare(COMPLETE_SQL).bind(
            now,
            candidate.id,
            leaseId,
            nextCursor ?? '',
          ),
        );
      }
      const results = await env.DB.batch(statements);
      for (let index = 0; index < eligibleCount; index += 1) {
        summary.deliveries += results[index]?.meta?.changes ?? 0;
      }
      cursor = nextCursor;
      finished = exhausted;
    }
  }

  const account = await readServiceAccount(env);
  if (!account) return summary;

  const due = await env.DB.prepare(DUE_SQL)
    .bind(now, budget(options.deliveryBudget, DELIVERY_BUDGET))
    .all<DeliveryRow>();

  for (const delivery of due.results) {
    const leaseId = crypto.randomUUID();
    const claimedDelivery = await env.DB.prepare(CLAIM_DELIVERY_SQL)
      .bind(leaseId, isoAt(nowMs + LEASE_MS), delivery.notification_id, delivery.device_id, now)
      .run();
    if ((claimedDelivery.meta?.changes ?? 0) !== 1) continue;

    const group = permGroupForKind(delivery.kind);
    const eligible = await env.DB.prepare(SENDER_OK_SQL)
      .bind(
        delivery.notification_id,
        delivery.device_id,
        delivery.membership_id,
        delivery.registration_version,
        now,
        group,
      )
      .first<{ ok: number }>();
    if (!eligible) {
      await settle(env.DB, 'skipped', delivery, leaseId, now, 'not_eligible');
      summary.skipped += 1;
      continue;
    }

    const result = await sendPushToDevice(
      env.DB,
      fetchImpl,
      account,
      {
        deviceToken: delivery.token,
        deviceId: delivery.device_id,
        membershipId: delivery.membership_id,
        registrationVersion: delivery.registration_version,
        kind: delivery.kind,
        refs: {
          notificationId: delivery.notification_id,
          studentId: delivery.student_id,
          sessionId: delivery.session_id,
          reportId: delivery.report_id,
          testId: delivery.test_id,
        },
      },
      nowMs,
    );

    if (result.outcome === 'sent') {
      await settle(env.DB, 'sent', delivery, leaseId, now, null);
      summary.sent += 1;
      continue;
    }

    if (result.outcome === 'invalid_token') {
      // `sendPushToDevice` đã xoá đúng đăng ký; delivery bị xoá theo khoá ngoại.
      summary.skipped += 1;
      continue;
    }

    if (result.outcome === 'no_credentials') {
      // Lỗi cấu hình: hoãn, không đốt lượt thử.
      await settle(
        env.DB,
        'pending',
        delivery,
        leaseId,
        isoAt(nowMs + NO_CREDENTIALS_DEFER_MS),
        'no_credentials',
      );
      summary.pending += 1;
      continue;
    }

    const attempts = delivery.attempts + 1;
    const retryable = result.outcome === 'unavailable' || result.outcome === 'unauthorized';
    if (retryable && attempts < MAX_ATTEMPTS) {
      const backoffMs = Math.min(2 ** attempts * 60_000, 60 * 60_000);
      await settle(
        env.DB,
        'pending',
        delivery,
        leaseId,
        isoAt(nowMs + backoffMs),
        result.error_code ?? result.outcome,
      );
      summary.pending += 1;
    } else {
      await settle(
        env.DB,
        'failed',
        delivery,
        leaseId,
        now,
        result.error_code ?? result.outcome,
      );
      summary.failed += 1;
    }
  }

  return summary;
}

/** Tên cũ dùng trong báo cáo/yêu cầu nối `scheduled`; giữ để lead nối một chỗ. */
export const runScheduledPush = runNotificationDispatch;
