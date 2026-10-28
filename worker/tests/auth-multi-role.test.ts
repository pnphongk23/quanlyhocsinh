import { describe, expect, it } from 'vitest';
import {
  call,
  db,
  fakePhone,
  insertClass,
  insertGuardianMembership,
  insertStudent,
  login,
  PASSWORD,
  post,
  put,
  registerWorkspace,
} from './helpers';

interface MultiRoleSetup {
  phone: string;
  workspaceId: string;
  userId: string;
  staffMembershipId: string;
  guardianMembershipId: string;
  classId: string;
  studentId: string;
}

/**
 * Một SĐT có hai vai trò trong cùng workspace (giáo viên + phụ huynh), dựng bằng
 * helper DB thật (membership + liên kết con), không sửa tay `auth_sessions`.
 */
async function multiRoleUser(): Promise<MultiRoleSetup> {
  const phone = fakePhone();
  const owner = await registerWorkspace(phone, 'Multi role workspace');
  const classId = await insertClass(owner.workspaceId, 'Lớp đa vai trò', owner.userId);
  const studentId = await insertStudent(owner.workspaceId, classId, 'Bé An', phone, owner.userId);
  const guardianMembershipId = await insertGuardianMembership(
    owner.workspaceId,
    owner.userId,
    owner.roles.guardian as string,
    [studentId],
  );
  return {
    phone,
    workspaceId: owner.workspaceId,
    userId: owner.userId,
    staffMembershipId: owner.membershipId,
    guardianMembershipId,
    classId,
    studentId,
  };
}

describe('multi-role accounts (>= 2 memberships)', () => {
  it('signs in without an active role, serves /me, then domain routes work after choosing a role', async () => {
    const setup = await multiRoleUser();

    const signedIn = await login(setup.phone);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.memberships).toHaveLength(2);
    expect(signedIn.body.active_membership_id).toBeNull();
    const token = signedIn.body.token as string;

    // Chưa chọn vai trò: route miền vẫn bị chặn.
    const blocked = await call('/v1/classes', {}, token);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('forbidden');
    expect(blocked.body.error.details.reason).toBe('membership_required');

    // Route tài khoản chỉ cần phiên hợp lệ: /me trả cả hai vai trò, chưa có vai trò đang dùng.
    const me = await call('/v1/me', {}, token);
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(setup.userId);
    expect(me.body.active_membership_id).toBeNull();
    expect(new Set(me.body.memberships.map((row: { id: string }) => row.id))).toEqual(
      new Set([setup.staffMembershipId, setup.guardianMembershipId]),
    );

    // Chọn vai trò giáo viên ⇒ route miền dùng được theo vai trò đó.
    const choseStaff = await call(
      '/v1/session/membership',
      put({ membership_id: setup.staffMembershipId }),
      token,
    );
    expect(choseStaff.status).toBe(200);
    expect(choseStaff.body).toEqual({
      active_membership_id: setup.staffMembershipId,
      device_registration_cleared: true,
    });

    const classes = await call('/v1/classes', {}, token);
    expect(classes.status).toBe(200);
    expect(classes.body.items.map((row: { id: string }) => row.id)).toContain(setup.classId);

    const meAfter = await call('/v1/me', {}, token);
    expect(meAfter.status).toBe(200);
    expect(meAfter.body.active_membership_id).toBe(setup.staffMembershipId);

    // Đổi sang vai trò phụ huynh: đọc được, không ghi được.
    const choseGuardian = await call(
      '/v1/session/membership',
      put({ membership_id: setup.guardianMembershipId }),
      token,
    );
    expect(choseGuardian.status).toBe(200);
    expect((await call('/v1/classes', {}, token)).status).toBe(200);
    const writeAttempt = await call(
      `/v1/classes/${setup.classId}`,
      { method: 'PATCH', body: JSON.stringify({ name: 'Đổi tên' }) },
      token,
    );
    expect(writeAttempt.status).toBe(403);
    expect(writeAttempt.body.error.code).toBe('forbidden');
  });

  it('allows password change and logout before a role is selected, but still blocks role switching while must_change_password', async () => {
    const setup = await multiRoleUser();

    const signedIn = await login(setup.phone);
    expect(signedIn.body.active_membership_id).toBeNull();
    const token = signedIn.body.token as string;

    // Tạo thêm workspace cũng là thao tác tài khoản (api-spec 4: mọi người dùng đã đăng nhập).
    const created = await call(
      '/v1/workspaces',
      post({ workspace_name: 'Workspace thứ hai' }),
      token,
    );
    expect(created.status).toBe(201);
    expect(created.body.membership.role.system_key).toBe('admin');

    const changed = await call(
      '/v1/auth/change-password',
      post({ current_password: PASSWORD, new_password: 'another-Pass-456' }),
      token,
    );
    expect(changed.status).toBe(200);
    expect(changed.body).toEqual({ must_change_password: false });

    // Phiên hiện tại vẫn dùng được sau khi đổi mật khẩu; vẫn chưa chọn vai trò.
    const me = await call('/v1/me', {}, token);
    expect(me.status).toBe(200);
    expect(me.body.active_membership_id).toBeNull();

    // must_change_password vẫn chặn đổi vai trò (api-spec 4), nhưng /me và đăng xuất vẫn mở.
    await db
      .prepare('UPDATE users SET must_change_password = 1 WHERE id = ?')
      .bind(setup.userId)
      .run();
    expect((await call('/v1/me', {}, token)).status).toBe(200);
    const blockedSwitch = await call(
      '/v1/session/membership',
      put({ membership_id: setup.staffMembershipId }),
      token,
    );
    expect(blockedSwitch.status).toBe(403);
    expect(blockedSwitch.body.error.code).toBe('password_change_required');

    expect((await call('/v1/auth/logout', { method: 'POST' }, token)).status).toBe(204);
    expect((await call('/v1/me', {}, token)).status).toBe(401);
  });

  it('keeps account routes usable when the selected membership is disabled, and hides disabled roles from /me', async () => {
    const setup = await multiRoleUser();
    const signedIn = await login(setup.phone);
    const token = signedIn.body.token as string;
    const choseGuardian = await call(
      '/v1/session/membership',
      put({ membership_id: setup.guardianMembershipId }),
      token,
    );
    expect(choseGuardian.status).toBe(200);

    // MVP chưa có endpoint quản trị nên vô hiệu hoá membership bằng tay ở DB (authz-matrix 2.1).
    await db
      .prepare("UPDATE memberships SET status = 'disabled' WHERE id = ?")
      .bind(setup.guardianMembershipId)
      .run();

    // Route miền: lỗi đúng spec (api-spec 1, membership bị vô hiệu ⇒ 403 account_disabled).
    const blocked = await call('/v1/classes', {}, token);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('account_disabled');

    // Năm route tài khoản vẫn chạy để phiên không kẹt, và /me chỉ trả vai trò còn active.
    const me = await call('/v1/me', {}, token);
    expect(me.status).toBe(200);
    expect(me.body.active_membership_id).toBeNull();
    expect(me.body.memberships.map((row: { id: string }) => row.id)).toEqual([
      setup.staffMembershipId,
    ]);

    // Chọn lại vai trò còn hoạt động ⇒ phiên tự khỏi.
    const choseStaff = await call(
      '/v1/session/membership',
      put({ membership_id: setup.staffMembershipId }),
      token,
    );
    expect(choseStaff.status).toBe(200);
    expect(choseStaff.body.active_membership_id).toBe(setup.staffMembershipId);
    expect((await call('/v1/classes', {}, token)).status).toBe(200);

    // User bị vô hiệu thì route tài khoản cũng chặn: nhánh miễn trừ không nới cho user disabled.
    await db
      .prepare("UPDATE users SET status = 'disabled' WHERE id = ?")
      .bind(setup.userId)
      .run();
    const disabledUser = await call('/v1/me', {}, token);
    expect(disabledUser.status).toBe(403);
    expect(disabledUser.body.error.code).toBe('account_disabled');
    await db
      .prepare("UPDATE users SET status = 'active' WHERE id = ?")
      .bind(setup.userId)
      .run();

    expect((await call('/v1/auth/logout', { method: 'POST' }, token)).status).toBe(204);
  });
});
