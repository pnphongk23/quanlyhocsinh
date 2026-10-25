import { env } from 'cloudflare:workers';
import app from '../src/index';
import type { Env } from '../src/types';
import { hashPassword, resolveIterations } from '../src/lib/crypto';
import { nowIso } from '../src/lib/time';

export const testEnv = env as unknown as Env;
export const db = testEnv.DB;
export const TEST_ITERATIONS = resolveIterations(testEnv.PBKDF2_ITERATIONS);

export interface ApiResult {
  status: number;
  body: any;
  headers: Headers;
}

export async function call(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<ApiResult> {
  const headers = new Headers(init.headers);
  if (token !== undefined) headers.set('authorization', `Bearer ${token}`);
  if (init.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const response = await app.request(
    `https://api.test${path}`,
    { ...init, headers },
    testEnv,
  );
  const text = await response.text();
  let body: any = null;
  if (text !== '') {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body, headers: response.headers };
}

export function post(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export function put(body: unknown): RequestInit {
  return { method: 'PUT', body: JSON.stringify(body) };
}

export const PASSWORD = 'example-Pass-123';

let phoneCounter = 1;

/** SĐT giả duy nhất: +8490000XXXX. */
export function fakePhone(offset = 0): string {
  const value = phoneCounter + offset;
  phoneCounter += 1;
  return `+8490${String(value).padStart(7, '0')}`;
}

export interface RegisteredWorkspace {
  workspaceId: string;
  userId: string;
  membershipId: string;
  token: string;
  roles: Record<string, string>;
}

export async function registerWorkspace(
  phone: string,
  workspaceName: string,
  password: string = PASSWORD,
): Promise<RegisteredWorkspace> {
  const result = await call('/v1/auth/register', post({
    phone,
    password,
    display_name: 'Giáo viên Mẫu',
    workspace_name: workspaceName,
  }));
  if (result.status !== 201) {
    throw new Error(`register failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
  const workspaceId = result.body.memberships[0].workspace.id;
  const { results } = await db
    .prepare('SELECT system_key, id FROM roles WHERE workspace_id = ?')
    .bind(workspaceId)
    .all<{ system_key: string; id: string }>();
  const roles: Record<string, string> = {};
  for (const row of results) roles[row.system_key] = row.id;
  return {
    workspaceId,
    userId: result.body.user.id,
    membershipId: result.body.active_membership_id,
    token: result.body.token,
    roles,
  };
}

export async function login(
  phone: string,
  password: string = PASSWORD,
): Promise<ApiResult> {
  return call('/v1/auth/login', post({ phone, password }));
}

export async function insertUser(
  phone: string,
  displayName: string | null = null,
  password: string = PASSWORD,
): Promise<string> {
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password, TEST_ITERATIONS);
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO users
        (id, phone, display_name, password_hash, must_change_password,
         password_changed_at, status, created_at, version)
       VALUES (?, ?, ?, ?, 0, ?, 'active', ?, 1)`,
    )
    .bind(userId, phone, displayName, passwordHash, now, now)
    .run();
  return userId;
}

export async function insertMembership(
  workspaceId: string,
  userId: string,
  roleId: string,
  classIds: string[] = [],
): Promise<string> {
  const membershipId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO memberships
        (id, workspace_id, user_id, role_id, status, scope_epoch, created_at, version)
       VALUES (?, ?, ?, ?, 'active', 1, ?, 1)`,
    )
    .bind(membershipId, workspaceId, userId, roleId, nowIso())
    .run();
  for (const classId of classIds) {
    await db
      .prepare(
        `INSERT INTO member_classes (workspace_id, membership_id, class_id, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(workspaceId, membershipId, classId, nowIso())
      .run();
  }
  return membershipId;
}

export async function insertClass(
  workspaceId: string,
  name: string,
  createdBy: string,
): Promise<string> {
  const classId = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO classes
        (id, workspace_id, name, status, weekdays, start_time, generated_until,
         created_by, created_at, updated_at, updated_by, version)
       VALUES (?, ?, ?, 'active', 0, '18:00', NULL, ?, ?, ?, ?, 1)`,
    )
    .bind(classId, workspaceId, name, createdBy, now, now, createdBy)
    .run();
  return classId;
}

export async function insertStudent(
  workspaceId: string,
  classId: string,
  name: string,
  parentPhone: string | null,
  createdBy: string,
): Promise<string> {
  const studentId = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO students
        (id, workspace_id, class_id, name, parent_phone, enrolled_at, left_at, status,
         created_at, updated_at, updated_by, version)
       VALUES (?, ?, ?, ?, ?, '2026-10-01', NULL, 'active', ?, ?, ?, 1)`,
    )
    .bind(studentId, workspaceId, classId, name, parentPhone, now, now, createdBy)
    .run();
  return studentId;
}

export async function insertSession(
  workspaceId: string,
  classId: string,
  date: string,
  createdBy: string,
  status: 'planned' | 'held' | 'cancelled' = 'planned',
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO class_sessions
        (id, workspace_id, class_id, date, start_time, origin, is_makeup, status, note,
         cancelled_at, cancelled_by, created_at, updated_at, updated_by, version)
       VALUES (?, ?, ?, ?, '18:00', 'manual', 0, ?, '', ?, ?, ?, ?, ?, 1)`,
    )
    .bind(
      sessionId,
      workspaceId,
      classId,
      date,
      status,
      status === 'cancelled' ? now : null,
      status === 'cancelled' ? createdBy : null,
      now,
      now,
      createdBy,
    )
    .run();
  return sessionId;
}

export async function insertTest(
  workspaceId: string,
  classId: string,
  createdBy: string,
  date = '2026-10-14',
): Promise<string> {
  const testId = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO tests
        (id, workspace_id, class_id, name, date, archived, created_by,
         created_at, updated_at, updated_by, version)
       VALUES (?, ?, ?, 'Unit test', ?, 0, ?, ?, ?, ?, 1)`,
    )
    .bind(testId, workspaceId, classId, date, createdBy, now, now, createdBy)
    .run();
  return testId;
}

export async function insertGuardianLink(
  workspaceId: string,
  userId: string,
  studentId: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO guardian_student (workspace_id, user_id, student_id, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(workspaceId, userId, studentId, nowIso())
    .run();
}

export async function insertGuardianMembership(
  workspaceId: string,
  userId: string,
  guardianRoleId: string,
  studentIds: string[],
): Promise<string> {
  for (const studentId of studentIds) await insertGuardianLink(workspaceId, userId, studentId);
  return insertMembership(workspaceId, userId, guardianRoleId);
}

export async function clubToken(
  workspaceId: string,
  userId: string,
  membershipId: string,
): Promise<string> {
  const token = `qlh_test_${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { sha256Hex } = await import('../src/lib/crypto');
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO auth_sessions
        (id, user_id, membership_id, token_hash, device_label, created_at,
         last_seen_at, expires_at, revoked_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL)`,
    )
    .bind(
      crypto.randomUUID(),
      userId,
      membershipId,
      await sha256Hex(token),
      now,
      now,
      new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
    )
    .run();
  return token;
}

export async function insertDeviceToken(
  workspaceId: string,
  userId: string,
  membershipId: string,
  authSessionId: string,
  token = `FAKE_FCM_${crypto.randomUUID()}`,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO device_tokens
        (id, workspace_id, user_id, membership_id, auth_session_id, token, platform,
         registration_version, bound_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ios', 1, ?, ?, ?)`,
    )
    .bind(id, workspaceId, userId, membershipId, authSessionId, token, now, now, now)
    .run();
  return id;
}
