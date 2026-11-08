import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import type { TicketRow } from "../../data/homework";
import type { CriteriaSetItem } from "../../data/api/types";
import type { CriteriaSlipLevel } from "../../data/types";
import TicketEditor from "./TicketEditor";

const save = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  saveSessionCommentDurable: save,
}));

const sessionId = "6a-session-7";
const studentId = "6a-student-1";
const ITEMS: CriteriaSetItem[] = Array.from({ length: 8 }, (_, index) => ({
  id: `c${index + 1}`,
  name: `Tiêu chí ${index + 1}`,
  default_level: "good",
  homework: false,
  texts: { good: `Câu tốt ${index + 1}.`, ok: `Câu đạt ${index + 1}.`, needs_work: `Câu cố gắng ${index + 1}.` },
}));
// Phiếu đã lưu 4/8: bốn mức Tốt, còn lại Đạt/Cần cố gắng.
const SAVED_LEVELS: CriteriaSlipLevel[] = ITEMS.map((item, index) => ({
  id: item.id,
  name: item.name,
  level: index < 4 ? "good" : index === 4 || index === 5 ? "ok" : "needs_work",
  text: item.texts[index < 4 ? "good" : index === 4 || index === 5 ? "ok" : "needs_work"],
}));

function rowWith(comment: TicketRow["comment"]): TicketRow {
  const seed = createSeed();
  const student = seed.students.find((item) => item.id === studentId)!;
  return {
    student, comment, stars: comment?.stars ?? null, attended: true,
    status: comment ? "draft" : "none", sentAt: comment?.sentAt ?? null,
    previousHomework: { state: "first", session: null, totalSections: 0, gradedSections: 0, ungradedSections: 0 },
  };
}

const savedSlip = {
  id: `${sessionId}:${studentId}`, classId: "6a", sessionId, studentId,
  criteria: 31, comment: SAVED_LEVELS.map((item) => item.text).join(" "),
  scale: 5 as const, stars: 3 as const, criteriaLevels: SAVED_LEVELS, hwManual: true,
  note: "Ghi chú đã lưu.", status: "draft" as const, sendQueued: false,
  sentAt: null, updatedAt: "2026-10-20T13:00:00Z", createdAt: "2026-10-20T13:00:00Z",
};

function renderEditor() {
  const seed = createSeed();
  replaceStore(seed);
  return render(<TicketEditor session={getSession(sessionId)!} row={rowWith(null)} homework={{ state: "first", sections: [] }} />);
}

beforeEach(async () => {
  save.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
  await db.criteriaSets.clear();
  await db.criteriaSets.put({ version: 4, criteria: ITEMS, identity: "anonymous", key: "anonymous|criteria_set|current", entity: "criteria_set" });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TicketEditor khi phiếu về sau lúc nháp đã dựng từ mức mặc định", () => {
  it("chưa sửa gì thì nạp lại mức đã lưu (4/8) thay vì giữ mặc định 8/8", async () => {
    const view = renderEditor();
    await waitFor(() => expect(screen.getAllByTestId(/^custom-criteria-row-/)).toHaveLength(8));
    expect(screen.getByTestId("custom-criteria-score")).toHaveTextContent("8/8");

    view.rerender(<TicketEditor session={getSession(sessionId)!} row={rowWith({ ...savedSlip })} homework={{ state: "first", sections: [] }} />);

    await waitFor(() => expect(screen.getByTestId("custom-criteria-score")).toHaveTextContent("4/8"));
    expect((screen.getByLabelText("Thêm nhận xét riêng (không bắt buộc)") as HTMLTextAreaElement).value).toBe("Ghi chú đã lưu.");
    expect(save).not.toHaveBeenCalled();
  });

  it("đã sửa tay thì giữ nháp, không ghi đè bằng phiếu về muộn", async () => {
    const view = renderEditor();
    await waitFor(() => expect(screen.getAllByTestId(/^custom-criteria-row-/)).toHaveLength(8));
    fireEvent.click(screen.getByRole("radio", { name: "Tiêu chí 1: Cần cố gắng, 1 trên 3" }));
    await waitFor(() => expect(screen.getByTestId("custom-criteria-score")).toHaveTextContent("7/8"));

    view.rerender(<TicketEditor session={getSession(sessionId)!} row={rowWith({ ...savedSlip })} homework={{ state: "first", sections: [] }} />);

    await waitFor(() => expect(screen.getByTestId("custom-criteria-score")).toHaveTextContent("7/8"));
    expect(screen.getByTestId("custom-criteria-score")).not.toHaveTextContent("4/8");
  });
});
