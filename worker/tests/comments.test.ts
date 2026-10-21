import { beforeAll, describe, expect, it } from "vitest";
import {
  call,
  clubToken,
  fakePhone,
  insertClass,
  insertGuardianMembership,
  insertMembership,
  insertSession,
  insertStudent,
  insertUser,
  registerWorkspace,
} from "./helpers";

describe("comment and slip routes", () => {
  let f: Record<string, string>;
  beforeAll(async () => {
    const ws = await registerWorkspace(fakePhone(), "comments workspace"),
      c1 = await insertClass(ws.workspaceId, "C1", ws.userId),
      c2 = await insertClass(ws.workspaceId, "C2", ws.userId);
    const session = await insertSession(
        ws.workspaceId,
        c1,
        "2026-10-21",
        ws.userId,
        "held",
      ),
      student = await insertStudent(
        ws.workspaceId,
        c1,
        "Student fake",
        null,
        ws.userId,
      );
    async function staff(role: string, classes: string[]) {
      const u = await insertUser(fakePhone()),
        m = await insertMembership(ws.workspaceId, u, ws.roles[role]!, classes);
      return clubToken(ws.workspaceId, u, m);
    }
    const g = await insertUser(fakePhone()),
      gm = await insertGuardianMembership(
        ws.workspaceId,
        g,
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
      og = await insertUser(fakePhone()),
      ogm = await insertGuardianMembership(
        ws.workspaceId,
        og,
        ws.roles.guardian!,
        [otherStudent],
      );
    const other = await registerWorkspace(
        fakePhone(),
        "other comments workspace",
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
      session,
      student,
      admin: ws.token,
      teacher: await staff("teacher", [c1]),
      teacherOther: await staff("teacher", [c2]),
      assistant: await staff("assistant", [c1]),
      guardian: await clubToken(ws.workspaceId, g, gm),
      wrongGuardian: await clubToken(ws.workspaceId, og, ogm),
      otherWorkspace: await clubToken(
        other.workspaceId,
        otherUser,
        otherMember,
      ),
    };
  });
  it("restricts slip reads by class and shows guardians sent slips only", async () => {
    const path = `/v1/sessions/${f.session}/slips`;
    for (const token of [f.admin, f.teacher, f.assistant, f.guardian])
      expect((await call(path, {}, token)).status).toBe(200);
    expect((await call(path)).status).toBe(401);
    expect((await call(path, {}, f.teacherOther)).status).toBe(404);
    expect((await call(path, {}, f.wrongGuardian)).status).toBe(404);
    expect((await call(path, {}, f.otherWorkspace)).status).toBe(404);
  });
});
