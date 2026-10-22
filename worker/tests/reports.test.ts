import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/index";
import type { Env } from "../src/types";
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
  post,
  put,
  registerWorkspace,
  testEnv,
} from "./helpers";

describe("reports routes and optional PDF storage", () => {
  let f: {
    classId: string;
    studentId: string;
    workspaceId: string;
    userId: string;
    membershipId: string;
    token: string;
    reportId: string;
    teacher: string;
    teacherOther: string;
    assistant: string;
    guardian: string;
    wrongGuardian: string;
    otherWorkspace: string;
  };
  beforeAll(async () => {
    const ws = await registerWorkspace(fakePhone(), "reports workspace"),
      classId = await insertClass(ws.workspaceId, "C1", ws.userId),
      studentId = await insertStudent(
        ws.workspaceId,
        classId,
        "Student fake",
        null,
        ws.userId,
      );
    const teacherUser = await insertUser(fakePhone()),
      teacherMembership = await insertMembership(
        ws.workspaceId,
        teacherUser,
        ws.roles.teacher!,
        [classId],
      );
    const assistantUser = await insertUser(fakePhone()),
      assistantMembership = await insertMembership(
        ws.workspaceId,
        assistantUser,
        ws.roles.assistant!,
        [classId],
      );
    const guardianUser = await insertUser(fakePhone()),
      guardianMembership = await insertGuardianMembership(
        ws.workspaceId,
        guardianUser,
        ws.roles.guardian!,
        [studentId],
      );
    const secondClass = await insertClass(ws.workspaceId, "C2", ws.userId),
      otherStudent = await insertStudent(
        ws.workspaceId,
        secondClass,
        "Other fake",
        null,
        ws.userId,
      );
    const wrongUser = await insertUser(fakePhone()),
      wrongMembership = await insertGuardianMembership(
        ws.workspaceId,
        wrongUser,
        ws.roles.guardian!,
        [otherStudent],
      );
    const other = await registerWorkspace(
      fakePhone(),
      "other reports workspace",
    );
    const otherClass = await insertClass(other.workspaceId, "CB", other.userId),
      otherTeacher = await insertUser(fakePhone()),
      otherMembership = await insertMembership(
        other.workspaceId,
        otherTeacher,
        other.roles.teacher!,
        [otherClass],
      );
    expect(
      (
        await call(
          `/v1/students/${studentId}/reports/2026-10`,
          put({ general_comment: "Fake report note" }),
          ws.token,
        )
      ).status,
    ).toBe(200);
    const published = await call(
      `/v1/students/${studentId}/reports/2026-10/publish`,
      post({}),
      ws.token,
    );
    expect(published.status).toBe(201);
    const teacherOtherUser = await insertUser(fakePhone()),
      teacherOtherMembership = await insertMembership(
        ws.workspaceId,
        teacherOtherUser,
        ws.roles.teacher!,
        [secondClass],
      );
    f = {
      classId,
      studentId,
      workspaceId: ws.workspaceId,
      userId: ws.userId,
      membershipId: ws.membershipId,
      token: ws.token,
      reportId: published.body.report_id,
      teacher: await clubToken(ws.workspaceId, teacherUser, teacherMembership),
      teacherOther: await clubToken(
        ws.workspaceId,
        teacherOtherUser,
        teacherOtherMembership,
      ),
      assistant: await clubToken(
        ws.workspaceId,
        assistantUser,
        assistantMembership,
      ),
      guardian: await clubToken(
        ws.workspaceId,
        guardianUser,
        guardianMembership,
      ),
      wrongGuardian: await clubToken(
        ws.workspaceId,
        wrongUser,
        wrongMembership,
      ),
      otherWorkspace: await clubToken(
        other.workspaceId,
        otherTeacher,
        otherMembership,
      ),
    };
  });
  it("checks report endpoint authorization and workspace scope", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    for (const token of [f.token, f.teacher, f.assistant])
      expect(
        (
          await call(
            `/v1/classes/${f.classId}/reports?month=2026-10`,
            {},
            token,
          )
        ).status,
      ).toBe(200);
    for (const token of [f.token, f.teacher, f.assistant])
      expect(
        (
          await call(
            `/v1/students/${f.studentId}/report-preview?month=2026-10`,
            {},
            token,
          )
        ).status,
      ).toBe(200);
    for (const token of [f.token, f.teacher, f.assistant, f.guardian])
      expect(
        (await call(`/v1/students/${f.studentId}/reports?limit=50`, {}, token))
          .status,
      ).toBe(200);
    for (const token of [f.token, f.teacher, f.assistant, f.guardian])
      expect(
        (await call(`/v1/reports/${f.reportId}/publications/1`, {}, token))
          .status,
      ).toBe(200);
    expect(
      (await call(`/v1/students/${f.studentId}/report-preview?month=2026-10`))
        .status,
    ).toBe(401);
    expect(
      (
        await call(
          `/v1/classes/${f.classId}/reports?month=2026-10`,
          {},
          f.guardian,
        )
      ).status,
    ).toBe(403);
    expect(
      (await call(`/v1/classes/${f.classId}/reports?month=2026-10`)).status,
    ).toBe(401);
    expect(
      (
        await call(
          `/v1/classes/${f.classId}/reports?month=2026-10`,
          {},
          f.teacherOther,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/classes/${f.classId}/reports?month=2026-10`,
          {},
          f.otherWorkspace,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/report-preview?month=2026-10`,
          {},
          f.guardian,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/report-preview?month=2026-10`,
          {},
          f.wrongGuardian,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports?limit=50`,
          {},
          f.wrongGuardian,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call(`/v1/students/${f.studentId}/reports?limit=50`)).status,
    ).toBe(401);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports?limit=50`,
          {},
          f.otherWorkspace,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/reports/${f.reportId}/publications/1`,
          {},
          f.wrongGuardian,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call(`/v1/reports/${f.reportId}/publications/1`)).status,
    ).toBe(401);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/report-preview?month=2026-10`,
          {},
          f.otherWorkspace,
        )
      ).status,
    ).toBe(404);
    expect(
      (await call(`/v1/classes/${id}/reports?month=2026-10`, {}, f.token))
        .status,
    ).toBe(404);
  });
  it("restricts report draft and publication writes to Admin and assigned teacher", async () => {
    for (const token of [f.token, f.teacher])
      expect(
        (
          await call(
            `/v1/students/${f.studentId}/reports/2026-10`,
            put({ general_comment: "Updated fake" }),
            token,
          )
        ).status,
      ).toBe(200);
    for (const token of [f.assistant, f.guardian])
      expect(
        (
          await call(
            `/v1/students/${f.studentId}/reports/2026-10`,
            put({ general_comment: "Denied fake" }),
            token,
          )
        ).status,
      ).toBe(403);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10`,
          put({ general_comment: "Denied fake" }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
          f.teacher,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
          f.assistant,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
          f.guardian,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
          f.wrongGuardian,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
          f.teacherOther,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10/publish`,
          post({}),
          f.otherWorkspace,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          `/v1/students/${f.studentId}/reports/2026-10`,
          put({ general_comment: "Outside" }),
          f.otherWorkspace,
        )
      ).status,
    ).toBe(404);
  });
  it("saves drafts, publishes snapshots and reads them without R2", async () => {
    const noR2 = { ...testEnv, REPORT_PDFS: undefined } as unknown as Env,
      month = "2026-09";
    const draft = await app.request(
      `https://api.test/v1/students/${f.studentId}/reports/${month}`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${f.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ general_comment: "No R2 fake" }),
      },
      noR2,
    );
    expect(draft.status).toBe(200);
    const response = await app.request(
      `https://api.test/v1/students/${f.studentId}/reports/${month}/publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${f.token}`,
          "content-type": "application/json",
        },
        body: "{}",
      },
      noR2,
    );
    expect(response.status).toBe(201);
    const publication = (await response.json()) as { report_id: string };
    const snapshot = await app.request(
      `https://api.test/v1/reports/${publication.report_id}/publications/1`,
      { headers: { authorization: `Bearer ${f.token}` } },
      noR2,
    );
    expect(snapshot.status).toBe(200);
  });
  it("returns homework counts grouped by kind in previews and publication snapshots", async () => {
    const grades = [
      "excellent",
      "excellent",
      "excellent",
      "excellent",
      "done",
      "done",
      "done",
      "not_done",
      "done",
    ];
    const commands = [] as {
      id: string;
      type: string;
      payload: Record<string, unknown>;
      base_version: number;
      created_at: string;
    }[];
    const command = (type: string, payload: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      type,
      payload,
      base_version: 0,
      created_at: new Date().toISOString(),
    });
    for (const [index, level] of grades.entries()) {
      const sessionId = await insertSession(
        f.workspaceId,
        f.classId,
        `2026-10-${String(index + 1).padStart(2, "0")}`,
        f.userId,
        "held",
      );
      const sectionId = crypto.randomUUID();
      const kind = index === grades.length - 1 ? "reading" : "vocabulary";
      commands.push(
        command("homework.section.upsert", {
          id: sectionId,
          session_id: sessionId,
          kind,
        }),
        command("homework.grade.set", {
          section_id: sectionId,
          student_id: f.studentId,
          level,
        }),
      );
    }
    const pushed = await call(
      "/v1/sync/push",
      post({
        membership_id: f.membershipId,
        device_id: crypto.randomUUID(),
        commands,
      }),
      f.token,
    );
    expect(pushed.status).toBe(200);
    expect(
      pushed.body.results.every((result: any) => result.status === "applied"),
    ).toBe(true);

    const expectedHomework = [
      { kind: "reading", excellent: 0, done: 1, not_done: 0 },
      { kind: "vocabulary", excellent: 4, done: 3, not_done: 1 },
    ];
    const preview = await call(
      `/v1/students/${f.studentId}/report-preview?month=2026-10`,
      {},
      f.token,
    );
    expect(preview.body.homework).toEqual(expectedHomework);
    for (const item of preview.body.homework) {
      expect(Object.keys(item).sort()).toEqual(
        ["done", "excellent", "kind", "not_done"].sort(),
      );
    }

    const published = await call(
      `/v1/students/${f.studentId}/reports/2026-10/publish`,
      post({}),
      f.token,
    );
    expect(published.body.snapshot.homework).toEqual(expectedHomework);
    for (const item of published.body.snapshot.homework) {
      expect(Object.keys(item).sort()).toEqual(
        ["done", "excellent", "kind", "not_done"].sort(),
      );
    }
  });
  it("uploads and streams PDF with REPORT_PDFS, returns 503 when the optional binding is absent", async () => {
    const path = `/v1/reports/${f.reportId}/publications/1/pdf`,
      pdf = new TextEncoder().encode("%PDF-fake");
    expect(testEnv.REPORT_PDFS).toBeDefined();
    const uploaded = await call(
      path,
      {
        method: "PUT",
        headers: { "content-type": "application/pdf" },
        body: pdf,
      },
      f.token,
    );
    expect(uploaded.status).toBe(200);
    const downloaded = await app.request(
      `https://api.test${path}`,
      { headers: { authorization: `Bearer ${f.token}` } },
      testEnv,
    );
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get("content-type")).toBe("application/pdf");
    await downloaded.arrayBuffer();
    const parentRead = await app.request(
      `https://api.test${path}`,
      { headers: { authorization: `Bearer ${f.guardian}` } },
      testEnv,
    );
    expect(parentRead.status).toBe(200);
    await parentRead.arrayBuffer();
    const assistantRead = await app.request(
      `https://api.test${path}`,
      { headers: { authorization: `Bearer ${f.assistant}` } },
      testEnv,
    );
    expect(assistantRead.status).toBe(200);
    await assistantRead.arrayBuffer();
    expect(
      (await app.request(`https://api.test${path}`, {}, testEnv)).status,
    ).toBe(401);
    const teacherRead = await app.request(
      `https://api.test${path}`,
      { headers: { authorization: `Bearer ${f.teacher}` } },
      testEnv,
    );
    expect(teacherRead.status).toBe(200);
    await teacherRead.arrayBuffer();
    expect(
      (
        await app.request(
          `https://api.test${path}`,
          { headers: { authorization: `Bearer ${f.wrongGuardian}` } },
          testEnv,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await app.request(
          `https://api.test${path}`,
          { headers: { authorization: `Bearer ${f.otherWorkspace}` } },
          testEnv,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await call(
          path,
          {
            method: "PUT",
            headers: { "content-type": "application/pdf" },
            body: pdf,
          },
          f.guardian,
        )
      ).status,
    ).toBe(403);
    const publishFor = async (month: string) => {
      await call(
        `/v1/students/${f.studentId}/reports/${month}`,
        put({ general_comment: "PDF matrix fake" }),
        f.token,
      );
      return call(
        `/v1/students/${f.studentId}/reports/${month}/publish`,
        post({}),
        f.token,
      );
    };
    const teacherPublication = await publishFor("2026-11"),
      teacherPath = `/v1/reports/${teacherPublication.body.report_id}/publications/1/pdf`;
    expect(
      (
        await call(
          teacherPath,
          {
            method: "PUT",
            headers: { "content-type": "application/pdf" },
            body: pdf,
          },
          f.teacher,
        )
      ).status,
    ).toBe(200);
    const assistantPublication = await publishFor("2026-12"),
      assistantPath = `/v1/reports/${assistantPublication.body.report_id}/publications/1/pdf`;
    expect(
      (
        await call(
          assistantPath,
          {
            method: "PUT",
            headers: { "content-type": "application/pdf" },
            body: pdf,
          },
          f.assistant,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call(assistantPath, {
          method: "PUT",
          headers: { "content-type": "application/pdf" },
          body: pdf,
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await call(
          assistantPath,
          {
            method: "PUT",
            headers: { "content-type": "application/pdf" },
            body: pdf,
          },
          f.otherWorkspace,
        )
      ).status,
    ).toBe(404);
    const envWithoutBucket = {
      ...testEnv,
      REPORT_PDFS: undefined,
    } as unknown as Env;
    for (const method of ["PUT", "GET"]) {
      const response = await app.request(
        `https://api.test${path}`,
        {
          method,
          headers: {
            authorization: `Bearer ${f.token}`,
            "content-type": "application/pdf",
          },
          body: method === "PUT" ? pdf : undefined,
        },
        envWithoutBucket,
      );
      const body = (await response.json()) as { error: { code: string } };
      expect(response.status).toBe(503);
      expect(body.error.code).toBe("pdf_storage_unavailable");
    }
    const forbiddenResponse = await app.request(
      `https://api.test${path}`,
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${f.guardian}`,
          "content-type": "application/pdf",
        },
        body: pdf,
      },
      envWithoutBucket,
    );
    expect(forbiddenResponse.status).toBe(403);
  });
});
