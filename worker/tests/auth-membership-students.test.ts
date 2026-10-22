import { describe, expect, it } from 'vitest';
import {
  call,
  fakePhone,
  insertClass,
  insertStudent,
  login,
  PASSWORD,
  post,
  put,
  registerWorkspace,
  db,
} from './helpers';

describe('guardian children in membership views', () => {
  it('returns only linked children for each guardian workspace in register, login and /me', async () => {
    const parentPhone = fakePhone();
    const otherParentPhone = fakePhone();
    const teacherA = await registerWorkspace(fakePhone(), 'Guardian children workspace A');
    const classA = await insertClass(teacherA.workspaceId, 'A class', teacherA.userId);
    const childA1 = await insertStudent(teacherA.workspaceId, classA, 'Child A1', parentPhone, teacherA.userId);
    const childA2 = await insertStudent(teacherA.workspaceId, classA, 'Child A2', parentPhone, teacherA.userId);
    const unrelatedChild = await insertStudent(teacherA.workspaceId, classA, 'Unrelated child', otherParentPhone, teacherA.userId);
    await db.prepare("UPDATE students SET status = 'left', left_at = '2026-10-20' WHERE id = ?").bind(childA2).run();

    const teacherB = await registerWorkspace(fakePhone(), 'Guardian children workspace B');
    const classB = await insertClass(teacherB.workspaceId, 'B class', teacherB.userId);
    const childB = await insertStudent(teacherB.workspaceId, classB, 'Child B', parentPhone, teacherB.userId);

    const registered = await call('/v1/auth/register-guardian', {
      ...post({ phone: parentPhone, password: PASSWORD, display_name: 'Parent' }),
      headers: { 'cf-connecting-ip': '198.51.100.91' },
    });
    expect(registered.status).toBe(201);
    expect(registered.body.memberships).toHaveLength(2);
    const registeredA = registered.body.memberships.find((row: any) => row.workspace.id === teacherA.workspaceId);
    const registeredB = registered.body.memberships.find((row: any) => row.workspace.id === teacherB.workspaceId);
    expect(registeredA.students).toEqual([
        { id: childA1, name: 'Child A1', class_id: classA, class_name: 'A class', teacher_name: 'Giáo viên Mẫu' },
        { id: childA2, name: 'Child A2', class_id: classA, class_name: 'A class', teacher_name: 'Giáo viên Mẫu' },
    ]);
    expect(registeredB.students).toEqual([
        { id: childB, name: 'Child B', class_id: classB, class_name: 'B class', teacher_name: 'Giáo viên Mẫu' },
    ]);
    expect(JSON.stringify(registered.body.memberships)).not.toContain(unrelatedChild);
    expect(JSON.stringify(registered.body.memberships)).not.toContain('parent_phone');

    const signedIn = await login(parentPhone);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.memberships.find((row: any) => row.workspace.id === teacherA.workspaceId).students)
      .toEqual(registeredA.students);
    expect(signedIn.body.memberships.find((row: any) => row.workspace.id === teacherB.workspaceId).students)
      .toEqual(registeredB.students);
    const me = await call('/v1/me', {}, signedIn.body.token);
    expect(me.status).toBe(200);
    expect(me.body.memberships.find((row: any) => row.workspace.id === teacherA.workspaceId).students)
      .toEqual(registeredA.students);
    expect(me.body.memberships.find((row: any) => row.workspace.id === teacherB.workspaceId).students)
      .toEqual(registeredB.students);

    const selected = await call('/v1/session/membership', put({ membership_id: registeredA.id }), signedIn.body.token);
    expect(selected.status).toBe(200);
    expect((await call('/v1/me', {}, signedIn.body.token)).body.memberships
      .find((row: any) => row.id === registeredA.id).students).toEqual(registeredA.students);
    const children = await call(`/v1/classes/${classA}/students`, {}, signedIn.body.token);
    expect(children.body.items.map((row: any) => row.id)).toEqual([childA1, childA2]);
    expect(children.body.items.every((row: any) => !('parent_phone' in row))).toBe(true);

    const otherParent = await call('/v1/auth/register-guardian', {
      ...post({ phone: otherParentPhone, password: PASSWORD, display_name: 'Other parent' }),
      headers: { 'cf-connecting-ip': '198.51.100.92' },
    });
    expect(otherParent.status).toBe(201);
    expect(otherParent.body.memberships[0].students).toEqual([
        { id: unrelatedChild, name: 'Unrelated child', class_id: classA, class_name: 'A class', teacher_name: 'Giáo viên Mẫu' },
    ]);
    expect(JSON.stringify(otherParent.body.memberships)).not.toContain(childA1);

    const staffMe = await call('/v1/me', {}, teacherA.token);
    expect(staffMe.status).toBe(200);
    expect(staffMe.body.memberships[0]).not.toHaveProperty('students');
    const teacherRegistration = await call('/v1/auth/register', {
      ...post({ phone: fakePhone(), password: PASSWORD, display_name: 'New teacher', workspace_name: 'Staff registration' }),
      headers: { 'cf-connecting-ip': '198.51.100.93' },
    });
    expect(teacherRegistration.status).toBe(201);
    expect(teacherRegistration.body.memberships[0]).not.toHaveProperty('students');
    const teacherPhone = await db.prepare('SELECT phone FROM users WHERE id = ?').bind(teacherA.userId)
      .first<{ phone: string }>();
    expect((await login(teacherPhone!.phone)).body.memberships[0]).not.toHaveProperty('students');
  });

  it('does not create a membership or expose children for an unlinked guardian', async () => {
    const parentPhone = fakePhone();
    const registered = await call('/v1/auth/register-guardian', {
      ...post({ phone: parentPhone, password: PASSWORD }),
      headers: { 'cf-connecting-ip': '198.51.100.94' },
    });
    expect(registered.status).toBe(201);
    expect(registered.body.memberships).toEqual([]);
    expect((await call('/v1/me', {}, registered.body.token)).body.memberships).toEqual([]);
    expect((await login(parentPhone)).body.memberships).toEqual([]);
  });
});
