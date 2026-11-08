import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../../data/db";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import type { CriteriaSetItem } from "../../data/api/types";
import type { TicketRow } from "../../data/homework";
import TicketEditor from "./TicketEditor";

vi.mock("../../data/sync", async (original) => ({ ...(await original<typeof import("../../data/sync")>()), scheduleSync: vi.fn() }));
vi.mock("../../data/repositories/access", async (original) => ({
  ...(await original<typeof import("../../data/repositories/access")>()),
  useAccess: () => ({ can: () => true, member: null, role: null, isAdmin: true, multipleRoles: false }),
}));

const identity = "teacher:workspace:member";
const sessionId = "6a-session-7";
const studentId = "6a-student-1";
const item: CriteriaSetItem = { id: "focus", name: "Focus", texts: { good: "Good.", ok: "Okay.", needs_work: "Try." }, default_level: "good", homework: false };
const homeworkItem: CriteriaSetItem = { ...item, id: "homework", name: "Homework", homework: true };

beforeEach(async () => {
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
  localStorage.clear();
  sessionStorage.clear();
  setCacheIdentity({ userId: "teacher", workspaceId: "workspace", membershipId: "member" });
  await db.open();
  await db.meta.put({ key: identity, identity, cursor: 0, epoch: 1 });
  await db.criteriaSets.clear();
  await db.outbox.clear();
  await db.criteriaSets.put({ version: 1, criteria: [item, homeworkItem], identity, key: `${identity}|criteria_set|current`, entity: "criteria_set" });
  const seed = createSeed();
  seed.comments = [];
  replaceStore(seed);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  setCacheIdentity(null);
  await db.outbox.clear();
});

describe("phiếu mới theo bộ tiêu chí", () => {
  it("chấm lại BTVN khi editor đang mở không ghi đường levels cũ", async () => {
    const session = getSession(sessionId)!;
    const seed = createSeed();
    const student = seed.students.find((row) => row.id === studentId)!;
    const row: TicketRow = {
      student, comment: null, stars: null, status: "none", attended: true, sentAt: null,
      previousHomework: { state: "has", session: null, totalSections: 1, gradedSections: 1, ungradedSections: 0 },
    };
    const sections = [{ id: "review-section", title: "Homework", kind: "exercise" as const, level: "excellent" as const }];
    const view = render(<TicketEditor session={session} row={row} homework={{ state: "has", sections }} />);
    await screen.findByTestId("custom-criteria-score");

    view.rerender(<TicketEditor session={session} row={row} homework={{ state: "has", sections: [{ ...sections[0]!, level: "not_done" as const }] }} />);

    await vi.waitFor(async () => expect((await db.outbox.toArray()).filter((entry) => entry.type === "slip.set").length).toBeGreaterThan(0));
    const command = (await db.outbox.toArray()).find((entry) => entry.type === "slip.set");
    expect(command?.payload).not.toHaveProperty("levels");
    expect(command?.payload).toHaveProperty("criteria_levels");
  });
});
