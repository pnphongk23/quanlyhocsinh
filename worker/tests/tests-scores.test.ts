import { beforeAll, describe, expect, it } from "vitest";
import {
  call,
  clubToken,
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
});
