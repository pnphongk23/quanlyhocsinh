import { beforeAll, describe, expect, it } from "vitest";
import {
  call,
  clubToken,
  db,
  fakePhone,
  insertClass,
  insertGuardianMembership,
  insertMembership,
  insertStudent,
  insertTest,
  insertUser,
  registerWorkspace,
} from "./helpers";

describe("tests and score routes", () => {
  let f: Record<string, string>;
  beforeAll(async () => {
    const ws = await registerWorkspace(fakePhone(), "scores workspace");
    const c1 = await insertClass(ws.workspaceId, "C1", ws.userId),
      c2 = await insertClass(ws.workspaceId, "C2", ws.userId);
    const student = await insertStudent(
      ws.workspaceId,
      c1,
      "Student fake",
      null,
      ws.userId,
    );
    const test = await insertTest(ws.workspaceId, c1, ws.userId);
    const now = '2026-10-21T11:15:00.000Z';
    await db
      .prepare(
        `INSERT INTO scores
          (workspace_id, class_id, test_id, student_id, value, version,
           created_at, updated_at, updated_by)
         VALUES (?, ?, ?, ?, 12.5, 1, ?, ?, ?)`,
      )
      .bind(ws.workspaceId, c1, test, student, now, now, ws.userId)
      .run();
    async function staff(role: string, classes: string[]) {
      const u = await insertUser(fakePhone());
      const m = await insertMembership(
        ws.workspaceId,
        u,
        ws.roles[role]!,
        classes,
      );
      return clubToken(ws.workspaceId, u, m);
    }
    const guardianUser = await insertUser(fakePhone());
    const gm = await insertGuardianMembership(
      ws.workspaceId,
      guardianUser,
      ws.roles.guardian!,
      [student],
    );
    const otherStudent = await insertStudent(
        ws.workspaceId,
        c2,
        "Other student fake",
        null,
        ws.userId,
      ),
      wrongUser = await insertUser(fakePhone()),
      wrongM = await insertGuardianMembership(
        ws.workspaceId,
        wrongUser,
        ws.roles.guardian!,
        [otherStudent],
      );
    const other = await registerWorkspace(
        fakePhone(),
        "other scores workspace",
      ),
      otherClass = await insertClass(other.workspaceId, "CB", other.userId),
      otherUser = await insertUser(fakePhone()),
      otherMember = await insertMembership(
        other.workspaceId,
        otherUser,
        other.roles.teacher!,
        [otherClass],
      );
    f = {
      c1,
      c2,
      student,
      test,
      admin: ws.token,
      teacher: await staff("teacher", [c1]),
      teacherOther: await staff("teacher", [c2]),
      assistant: await staff("assistant", [c1]),
      guardian: await clubToken(ws.workspaceId, guardianUser, gm),
      wrongGuardian: await clubToken(ws.workspaceId, wrongUser, wrongM),
      otherWorkspace: await clubToken(
        other.workspaceId,
        otherUser,
        otherMember,
      ),
    };
  });
  it("enforces role and class/student scope on listing tests and scores", async () => {
    const testsPath = `/v1/classes/${f.c1}/tests`,
      scoresPath = `/v1/tests/${f.test}/scores`;
    for (const token of [f.admin, f.teacher, f.assistant, f.guardian])
      expect((await call(testsPath, {}, token)).status).toBe(200);
    expect((await call(testsPath)).status).toBe(401);
    expect((await call(testsPath, {}, f.teacherOther)).status).toBe(404);
    expect((await call(testsPath, {}, f.wrongGuardian)).status).toBe(404);
    expect((await call(testsPath, {}, f.otherWorkspace)).status).toBe(404);
    for (const token of [f.admin, f.teacher, f.assistant, f.guardian])
      expect((await call(scoresPath, {}, token)).status).toBe(200);
    expect((await call(scoresPath)).status).toBe(401);
    expect((await call(scoresPath, {}, f.teacherOther)).status).toBe(404);
    expect((await call(scoresPath, {}, f.wrongGuardian)).status).toBe(404);
    expect((await call(scoresPath, {}, f.otherWorkspace)).status).toBe(404);
  });

  it('returns lists as { items: [...] }, not raw D1 results', async () => {
    const tests = await call(`/v1/classes/${f.c1}/tests`, {}, f.admin);
    expect(tests.status).toBe(200);
    expect(Object.keys(tests.body)).toEqual(['items']);
    expect(Array.isArray(tests.body.items)).toBe(true);
    expect(tests.body.items).toHaveLength(1);
    expect(tests.body.items[0]).toEqual({
      id: f.test,
      class_id: f.c1,
      name: 'Unit test',
      date: '2026-10-14',
      archived: 0,
      version: 1,
    });

    const scores = await call(`/v1/tests/${f.test}/scores`, {}, f.admin);
    expect(scores.status).toBe(200);
    expect(Object.keys(scores.body)).toEqual(['items']);
    expect(Array.isArray(scores.body.items)).toBe(true);
    expect(scores.body.items).toHaveLength(1);
    expect(scores.body.items[0]).toEqual({
      test_id: f.test,
      student_id: f.student,
      value: 12.5,
      version: 1,
      updated_at: '2026-10-21T11:15:00.000Z',
    });

    const guardianTests = await call(`/v1/classes/${f.c1}/tests`, {}, f.guardian);
    expect(Array.isArray(guardianTests.body.items)).toBe(true);
    const guardianScores = await call(`/v1/tests/${f.test}/scores`, {}, f.guardian);
    expect(Array.isArray(guardianScores.body.items)).toBe(true);
    expect(guardianScores.body.items).toHaveLength(1);
    expect(guardianScores.body.items[0].student_id).toBe(f.student);
  });
});
