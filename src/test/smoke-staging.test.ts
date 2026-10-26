import "fake-indexeddb/auto";
import { readFile } from "node:fs/promises";
import { afterEach, expect, it, vi } from "vitest";
import { todayISO } from "../shared/date";

type DemoConfig = { api: string; phone: string; password: string; classId?: string };

async function readDemoConfig(path: string): Promise<DemoConfig> {
  const config: DemoConfig = { api: "", phone: "", password: "" };
  let section = "";
  for (const line of (await readFile(path, "utf8")).split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indent = /^\s+/.test(line);
    const pair = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (!pair) continue;
    const [key, value] = [pair[1].trim(), pair[2].trim()];
      if (!indent && /^multi-role\b/i.test(key)) { section = "multi"; continue; }
      if (!indent && /^giáo viên\b/i.test(key)) { section = "teacher"; continue; }
      if (!indent && /^phụ huynh\b/i.test(key)) { section = "parent"; continue; }
    if (/^API$/i.test(key)) config.api = value;
    else if (/^phone$/i.test(key) && section === "teacher") config.phone = value;
    else if (/^password$/i.test(key) && section === "teacher") config.password = value;
    else if (/^class_id$/i.test(key)) config.classId = value;
  }
  return config;
}

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.skipIf(process.env.QLH_STAGING_SMOKE !== "1")(
  "writes attendance through repository/outbox, verifies pull and duplicate idempotency",
  async () => {
    const configPath = process.env.QLH_STAGING_CREDENTIAL_FILE;
    expect(configPath, "Set QLH_STAGING_CREDENTIAL_FILE to the local demo credential file").toBeTruthy();
    const config = await readDemoConfig(configPath!);
      expect(config.api && config.phone && config.password, "Demo credential fields are unavailable").toBeTruthy();
      const configuredBase = new URL(config.api);
      expect(configuredBase.pathname.replace(/\/$/, "")).toMatch(/\/v1$/);
      console.log(`STAGING_SMOKE api_base=${configuredBase.host}${configuredBase.pathname}`);
      vi.stubEnv("VITE_API_BASE_URL", config.api);
      sessionStorage.clear();
      localStorage.removeItem("qlh.session.v1");
      vi.resetModules();

      const originalFetch = globalThis.fetch.bind(globalThis);
      const pushes: Array<{ results?: Array<Record<string, any>> }> = [];
      vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        const isPush = url.pathname.endsWith("/sync/push");
        const response = await originalFetch(input, init);
        const authPath = /\/auth\/login$|\/me$/.test(url.pathname);
        const syncPath = /\/sync\/(snapshot|pull)|\/classes(?:\/|$)/.test(url.pathname);
        if (!response.ok) console.log(`STAGING_SMOKE http=${response.status} url=${url.host}${url.pathname} x-request-id=${response.headers.get("x-request-id") ?? "missing"}`);
        else if (authPath || syncPath) {
          const authHeader = new Headers(init?.headers).has("Authorization") ? "present" : "absent";
          console.log(`STAGING_SMOKE http=${response.status} url=${url.host}${url.pathname}${authPath ? ` authorization=${authHeader}` : ""}`);
        }
        if (isPush) pushes.push(await response.clone().json() as { results?: Array<Record<string, any>> });
        return response;
      });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });

      const [{ login, switchMembership }, { getSession }, { syncNow }, { db }, { getStore }, { saveAttendanceDurable }, { persistCommand }] = await Promise.all([
        import("../data/auth"), import("../data/auth/session"), import("../data/sync"),
        import("../data/db"), import("../data/store"), import("../data/repositories/attendance"), import("../data/outbox"),
      ]);

      const loginUrl = new URL("auth/login", `${config.api.replace(/\/$/, "")}/`);
      expect(loginUrl.pathname).toBe("/v1/auth/login");

    await db.open();
    await Promise.all(db.tables.map((table) => table.clear()));
      try {
        await login(config.phone, config.password);
      } catch (error) {
        const code = error && typeof error === "object" && "error" in error
          ? (error as { error?: { code?: string } }).error?.code ?? "unknown"
          : "unknown";
        console.log(`STAGING_SMOKE login=REJECTED error_code=${code}`);
        throw error;
      }
      const memberships = getSession()?.me.memberships.filter((membership) => membership.status === "active") ?? [];
      console.log(`STAGING_SMOKE active_memberships=${memberships.length}`);
    let chosen: { membershipId: string; sessionId: string; studentId: string; eligible: boolean } | undefined;
    const today = todayISO();

    for (const membership of memberships) {
        await switchMembership(membership.id);
        await syncNow();
        const state = getStore();
        console.log(`STAGING_SMOKE membership=${memberships.indexOf(membership) + 1} role=${membership.role.system_key ?? "custom"} workspace=${membership.workspace.name} class_names=${state.classes.map((klass) => klass.name).join(",") || "none"} sessions=${state.sessions.length} students=${state.students.length}`);
      const demoClass = state.classes.find((klass) => klass.id === config.classId)
        ?? state.classes.find((klass) => /6a/i.test(klass.name));
      if (!demoClass) continue;
      const students = state.students.filter((student) => student.classId === demoClass.id && student.status === "active");
      if (!students.length) continue;
      const sessions = state.sessions.filter((session) => session.classId === demoClass.id)
        .sort((a, b) => `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`));
      const eligible = sessions.find((session) => session.status === "held" || session.date === today);
      const trial = eligible ?? sessions[0];
      if (trial) {
        chosen = { membershipId: membership.id, sessionId: trial.id, studentId: students[0].id, eligible: Boolean(eligible) };
        if (eligible) break;
      }
    }

      expect(chosen, "No visible demo class, student, or session was available in any active membership").toBeTruthy();
      const target = chosen!;
      await switchMembership(target.membershipId);
      await syncNow();
      const state = getStore();
    const existing = state.attendance.find((row) => row.sessionId === target.sessionId && row.studentId === target.studentId);
    const desired = (["present", "absent", "late"] as const).find((status) => status !== existing?.status) ?? "present";
    let commandId: string | undefined;
    if (target.eligible) {
      const outboxCreated = new Promise<string>((resolve) => {
        const handler = (key: string | number, row: { type?: string }) => {
          if (row.type === "attendance.set") { db.outbox.hook("creating").unsubscribe(handler); resolve(String(key)); }
        };
        db.outbox.hook("creating").subscribe(handler);
      });
      await saveAttendanceDurable({ sessionId: target.sessionId, studentId: target.studentId, status: desired });
      commandId = await outboxCreated;
    } else {
      commandId = crypto.randomUUID();
      const payload = { session_id: target.sessionId, student_id: target.studentId, status: desired, note: "Staging smoke", late_at: desired === "late" ? "18:10" : null };
        await persistCommand("attendance", [target.sessionId, target.studentId], { ...payload, version: 0, updated_at: new Date().toISOString() }, {
          id: commandId, type: "attendance.set", payload, base_version: 0, created_at: new Date().toISOString(),
      });
    }
    expect(commandId, "Attendance command was not stored in the local outbox").toBeTruthy();
    const originalRow = await db.outbox.get(commandId!);
    expect(originalRow).toBeTruthy();
    await syncNow();
    const first = pushes.flatMap((push) => push.results ?? []).find((result) => result.id === commandId);

    if (!target.eligible) {
      expect(first?.status).toBe("rejected");
      expect(first?.error?.code, "The server returned no rejection code for the trial attendance command").toBeTruthy();
        console.log(`STAGING_SMOKE trial_attendance=REJECTED error_code=${first?.error?.code ?? "missing"}`);
      return;
    }

    expect(first?.status).toBe("applied");
    const afterPull = getStore().attendance.find((row) => row.sessionId === target.sessionId && row.studentId === target.studentId);
    expect(afterPull?.status).toBe(desired);
    await db.outbox.put({ ...originalRow!, status: "pending" });
    await syncNow();
    const duplicate = pushes.flatMap((push) => push.results ?? []).find((result) => result.id === commandId && result.status === "duplicate");
    expect(duplicate?.status).toBe("duplicate");
    const afterDuplicatePull = getStore().attendance.find((row) => row.sessionId === target.sessionId && row.studentId === target.studentId);
    expect(afterDuplicatePull?.status).toBe(desired);
      console.log(`STAGING_SMOKE attendance=applied value=${desired} pull=verified replay=duplicate`);
  },
  90_000,
);
