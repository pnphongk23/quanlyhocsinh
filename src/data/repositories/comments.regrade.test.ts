import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, setCacheIdentity } from "../db";
import { createSeed } from "../seed";
import { getStore, replaceStore } from "../store";
import type { CriteriaSetItem } from "../api/types";
import { assignDefaultSlipsDurable, saveSessionCommentDurable } from "./comments";
import { setHomeworkGradeDurable } from "./homework";

vi.mock("../sync", async (original) => ({ ...(await original<typeof import("../sync")>()), scheduleSync: vi.fn() }));

const identity = "teacher:workspace:member";
const sessionId = "6a-session-7";
const studentId = "6a-student-1";
const item: CriteriaSetItem = { id: "focus", name: "Focus", texts: { good: "Good.", ok: "Okay.", needs_work: "Try." }, default_level: "good", homework: false };

beforeEach(async () => {
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
  localStorage.clear();
  sessionStorage.clear();
  setCacheIdentity({ userId: "teacher", workspaceId: "workspace", membershipId: "member" });
  await db.delete();
  await db.open();
  await db.meta.put({ key: identity, identity, cursor: 0, epoch: 1 });
  await db.criteriaSets.put({ version: 1, criteria: [item, { ...item, id: "homework", name: "Homework", homework: true }], identity, key: `${identity}|criteria_set|current`, entity: "criteria_set" });
  const seed = createSeed();
  seed.comments = [];
  seed.attendance = seed.attendance.map((row) => row.sessionId === sessionId && row.studentId === studentId ? { ...row, status: "present" } : row);
  replaceStore(seed);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  setCacheIdentity(null);
  await db.delete();
});

describe("gán mặc định cho phiếu theo bộ tiêu chí", () => {
  it("giữ phần gõ thêm sau câu của mức đã chọn", async () => {
    await saveSessionCommentDurable({
      sessionId, studentId, note: "", hwManual: true,
      criteriaLevels: [{ id: "focus", name: "Focus", level: "ok", text: "Okay." }],
      comment: "Okay. EXTRA",
    });

    await assignDefaultSlipsDurable(sessionId, [studentId], { version: 1, criteria: [item] });

    expect(getStore().comments.find((row) => row.sessionId === sessionId && row.studentId === studentId)?.comment).toBe("Good. EXTRA");
  });
});

describe("chấm lại BTVN cho phiếu có criteria_levels", () => {
  it("cập nhật mức BTVN trong bản chụp và gửi lệnh kèm criteria_levels", async () => {
    const state = getStore();
    state.homeworkSections = [{ id: "review-section", sessionId: "6a-session-6", kind: "exercise", title: "X", description: "" }];
    replaceStore(state);
    await saveSessionCommentDurable({
      sessionId, studentId, note: "", hwManual: false,
      criteriaLevels: [
        { id: "focus", name: "Focus", level: "good", text: "Good." },
        { id: "homework", name: "Homework", level: "good", text: "Good.", homework: true },
      ],
      comment: "Good. Good.",
    });
    // Phiếu đã đồng bộ: bỏ lệnh lưu cũ để chỉ còn lệnh do chấm lại BTVN sinh ra.
    await db.outbox.clear();

    await setHomeworkGradeDurable("review-section", studentId, "not_done");

    const slip = getStore().comments.find((row) => row.sessionId === sessionId && row.studentId === studentId);
    const command = (await db.outbox.toArray()).find((row) => row.type === "slip.set");
    expect({
      level: slip?.criteriaLevels?.find((entry) => entry.homework)?.level,
      payloadHasSnapshot: Boolean(command?.payload && "criteria_levels" in command.payload),
      payloadHasCriteria: Boolean(command?.payload && "criteria" in command.payload),
    }).toEqual({ level: "needs_work", payloadHasSnapshot: true, payloadHasCriteria: false });
    expect(slip?.comment).toContain("Try.");
  });
});
