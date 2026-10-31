import { describe, expect, it } from 'vitest';
import { requireAccess, isInScope } from '../src/db/authz';
import type { Identity, Permissions } from '../src/types';
import { call } from './helpers';

const allWrite: Permissions = {
  classes: 'write', students: 'write', sessions_attendance: 'write',
  scores: 'write', lectures: 'write', comments_reports: 'write', send_comments: 'write',
};

function identity(overrides: Partial<Identity> = {}): Identity {
  return {
    userId: 'user-a', sessionId: 'session-a', membershipId: 'member-a',
    workspaceId: 'workspace-a', workspaceName: 'Test', roleId: 'role',
    roleName: 'Role', roleSystemKey: null, scopeKind: 'workspace', scopeEpoch: 1,
    permissions: allWrite, classIds: ['class-a'], linkedStudentIds: ['student-a'],
    mustChangePassword: false, ...overrides,
  };
}

describe('authorization matrix core', () => {
  it('allows Admin all operations and staff only in assigned classes', () => {
    expect(() => requireAccess(identity(), 'scores', 'write', { classId: 'class-z' })).not.toThrow();
    const teacher = identity({ scopeKind: 'assigned_classes' });
    expect(() => requireAccess(teacher, 'scores', 'write', { classId: 'class-a' })).not.toThrow();
    expect(() => requireAccess(teacher, 'scores', 'read', { classId: 'class-z' })).toThrow();
  });

  it('enforces assistant read/write levels from permissions, not role names', () => {
    const assistant = identity({
      scopeKind: 'assigned_classes', roleName: 'Custom', roleSystemKey: null,
        permissions: { ...allWrite, classes: 'read', students: 'read', scores: 'read', lectures: 'read', comments_reports: 'write' },
    });
    expect(() => requireAccess(assistant, 'sessions_attendance', 'write', { classId: 'class-a' })).not.toThrow();
    expect(() => requireAccess(assistant, 'scores', 'write', { classId: 'class-a' })).toThrow();
    expect(() => requireAccess(assistant, 'students', 'read', { classId: 'class-a', studentId: 'student-a' })).not.toThrow();
  });

  it('limits guardians to linked children and read-only permissions', () => {
    const guardian = identity({
      scopeKind: 'linked_students',
      permissions: { classes: 'none', students: 'none', sessions_attendance: 'read', scores: 'read', lectures: 'none', comments_reports: 'read', send_comments: 'none' },
    });
    expect(() => requireAccess(guardian, 'students', 'read', { classId: 'class-a', studentId: 'student-a' })).not.toThrow();
    expect(() => requireAccess(guardian, 'scores', 'read', { studentId: 'student-a' })).not.toThrow();
    expect(() => requireAccess(guardian, 'scores', 'write', { studentId: 'student-a' })).toThrow();
    expect(() => requireAccess(guardian, 'scores', 'read', { studentId: 'student-z' })).toThrow();
    expect(isInScope(guardian, { classId: 'class-a' })).toBe(true);
    expect(isInScope(guardian, { classId: 'class-z' })).toBe(false);
  });

  it('rejects unauthenticated requests and unrelated workspace resources', async () => {
    expect((await call('/v1/classes')).status).toBe(401);
    expect(() => requireAccess(identity({ scopeKind: 'assigned_classes' }), 'classes', 'read', { classId: 'class-z' })).toThrow();
  });
});
