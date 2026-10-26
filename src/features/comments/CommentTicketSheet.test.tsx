import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import type { TicketRow } from "../../data/homework";
import type { Comment } from "../../data/types";
import { generatedSlipSentence } from "../../data/slip";
import CommentTicketSheet from "./CommentTicketSheet";
import { resetSessionDrafts } from "./draftStore";

const save = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  saveSessionCommentDurable: save,
}));

const sessionId = "6a-session-6";
const studentId = "6a-student-1";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  save.mockReset().mockResolvedValue(undefined);
  sessionStorage.clear();
});
afterEach(cleanup);

function setup() {
  const seed = createSeed();
  replaceStore(seed);
  const student = seed.students.find((item) => item.id === studentId)!;
  const slip = (criteria: number, comment: string): Comment => ({ id: "c", classId: "6a", sessionId, studentId, criteria, comment, scale: 5, stars: 3, note: "giữ", hwManual: false, status: "draft", sendQueued: false, sentAt: null, updatedAt: "2026-10-26T00:00:00.000Z", createdAt: "2026-10-26T00:00:00.000Z" } as Comment);
  const rowOf = (comment: Comment): TicketRow => ({ student, comment, stars: 3, attended: true, status: "draft", sentAt: null, previousHomework: { state: "first", session: null, totalSections: 0, gradedSections: 0, ungradedSections: 0 } } as TicketRow);
  const homework = { state: "first" as const, sections: [] };
  const element = (row: TicketRow) => <CommentTicketSheet session={getSession(sessionId)!} row={row} homework={homework} onClose={() => {}} />;
  return { slip, rowOf, element };
}

describe("CommentTicketSheet (mobile)", () => {
  it("sửa riêng câu nhận xét cũng bật nút Lưu", () => {
    const { slip, rowOf, element } = setup();
    render(element(rowOf(slip(31, generatedSlipSentence(31)))));
    expect(screen.getByTestId("slip-save-button")).toBeDisabled();
    fireEvent.change(screen.getByTestId("slip-generated-comment"), { target: { value: "Câu tôi sửa" } });
    expect(screen.getByTestId("slip-save-button")).toBeEnabled();
    expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "pending");
  });

  it("sau Gán tất cả mặc định phiếu đang mở nạp lại, nút Lưu tắt và không ghi ngược câu cũ", async () => {
    const { slip, rowOf, element } = setup();
    const view = render(element(rowOf(slip(3, "Câu cũ"))));
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "Câu tôi vừa gõ" } });
    view.rerender(element(rowOf(slip(31, generatedSlipSentence(31)))));
    resetSessionDrafts(sessionId);
    await waitFor(() => expect(sentence.value).toBe(generatedSlipSentence(31)));
    expect(screen.getByTestId("slip-save-button")).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
