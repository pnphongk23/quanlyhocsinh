import { ApiError, forbidden, notFound } from '../lib/errors';
import type { AccessResource, Identity, PermGroup, PermLevel } from '../types';

/**
 * Hàm kiểm quyền chung theo authz-matrix.md.
 * - Tài nguyên ngoài phạm vi ⇒ 404 (không lộ sự tồn tại).
 * - Trong phạm vi nhưng thiếu mức ⇒ 403.
 * - Phụ huynh (linked_students) luôn chỉ đọc; `classes`/`students` của con được
 *   đọc dù role_permissions mặc định là `none` (ma trận mục 2.2).
 */
export function requireAccess(
  identity: Identity,
  group: PermGroup,
  level: PermLevel,
  resource?: AccessResource,
): void {
  if (resource) {
    if (!isInScope(identity, resource)) throw notFound();
  }

  if (level === 'write' && identity.scopeKind === 'linked_students') {
    throw forbidden();
  }

  if (
    identity.scopeKind === 'linked_students' &&
    (group === 'classes' || group === 'students') &&
    level === 'read'
  ) {
    return;
  }

  const granted = identity.permissions[group] ?? 'none';
  if (level === 'read' && granted === 'none') throw forbidden();
  if (level === 'write' && granted !== 'write') throw forbidden();
}

export function isInScope(identity: Identity, resource: AccessResource): boolean {
  if (identity.scopeKind === 'workspace') return true;

  if (identity.scopeKind === 'assigned_classes') {
    if (resource.classId) return identity.classIds.includes(resource.classId);
    return false;
  }

  // linked_students
  if (resource.studentId) {
    if (!identity.linkedStudentIds.includes(resource.studentId)) return false;
    // Nếu biết lớp thì lớp phải là lớp của con được liên kết.
    if (resource.classId) return identity.classIds.includes(resource.classId);
    return true;
  }
  if (resource.classId) return identity.classIds.includes(resource.classId);
  return false;
}

/** Chặn mọi thao tác ghi của phụ huynh ở tầng db, bất kể role_permissions. */
export function assertStaffWrite(identity: Identity): void {
  if (identity.scopeKind === 'linked_students') throw forbidden();
}

/** 404 nếu tài nguyên không thuộc workspace của membership đang dùng. */
export function assertWorkspace(identity: Identity, workspaceId: string): void {
  if (identity.workspaceId !== workspaceId) throw notFound();
}

/** Ánh xạ lỗi trigger RAISE(ABORT,'<mã>') sang lỗi API. */
export function mapTriggerError(error: unknown, fallback: ApiError): ApiError {
  const message = error instanceof Error ? error.message : String(error);
  const known = [
    'guardian_role_cap',
    'system_role_locked',
    'guardian_without_link',
    'last_admin',
    'staff_only',
    'score_out_of_range',
    'test_has_scores',
    'cannot_unsend',
    'section_has_grades',
    'publication_immutable',
    'immutable_keys',
  ].find((code) => message.includes(code));
  if (!known) return fallback;
  if (known === 'score_out_of_range') {
    return new ApiError(422, 'validation_error', 'Invalid request.', { reason: known });
  }
  if (known === 'section_has_grades' || known === 'test_has_scores') {
    return new ApiError(409, 'conflict', 'Conflict.', { reason: known });
  }
  return new ApiError(409, 'conflict', 'Conflict.', { reason: known });
}
