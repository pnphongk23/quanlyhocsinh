import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import type { TicketRow } from "../../data/homework";
import { generatedSlipSentence } from "../../data/slip";
import TicketEditor from "./TicketEditor";
import { resetSessionDrafts } from "./draftStore";
import type { Comment } from "../../data/types";

const save = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  saveSessionCommentDurable: save,
}));

const sessionId = "6a-session-6";
const studentId = "6a-student-1";

function renderEditor() {
  const seed = createSeed();
  seed.comments = seed.comments.filter((comment) => comment.sessionId !== sessionId || comment.studentId !== studentId);
  replaceStore(seed);
  const student = seed.students.find((item) => item.id === studentId)!;
  const row: TicketRow = {
    student, comment: null, stars: null, attended: true, status: "none", sentAt: null,
    previousHomework: { state: "first", session: null, totalSections: 0, gradedSections: 0, ungradedSections: 0 },
  };
  return render(<TicketEditor session={getSession(sessionId)!} row={row} homework={{ state: "first", sections: [] }} />);
}

beforeEach(() => {
  save.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe("TicketEditor tự lưu khi rời ô ghi chú (desktop)", () => {
  it("gõ ghi chú rồi blur thì lưu đúng ghi chú, không gửi tiêu chí", async () => {
    renderEditor();
    const note = screen.getByTestId("slip-note");
    fireEvent.change(note, { target: { value: "Ghi chú mới" } });
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "pending");
    fireEvent.blur(note);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({ sessionId, studentId, note: "Ghi chú mới" });
    await waitFor(() => expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "saved"));
  });

  it("blur khi ghi chú không đổi thì không lưu", () => {
    renderEditor();
    fireEvent.blur(screen.getByTestId("slip-note"));
    expect(save).not.toHaveBeenCalled();
  });

  it("đổi tiêu chí lưu ngay kèm ghi chú đang gõ", async () => {
    renderEditor();
    fireEvent.change(screen.getByTestId("slip-note"), { target: { value: "Đang gõ" } });
    fireEvent.click(screen.getByTestId("slip-criterion-3"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ sessionId, studentId, criteria: 23, note: "Đang gõ" }));
  });

  it("lưu lỗi thì giữ ghi chú, báo lỗi và cho thử lại khi blur lần nữa", async () => {
    save.mockRejectedValueOnce(new Error("Ghi bền thất bại."));
    renderEditor();
    const note = screen.getByTestId("slip-note") as HTMLTextAreaElement;
    fireEvent.change(note, { target: { value: "Giữ lại" } });
    fireEvent.blur(note);
    expect(await screen.findByText("Ghi bền thất bại.")).toBeInTheDocument();
    expect(note.value).toBe("Giữ lại");
    expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "error");
    fireEvent.blur(note);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "saved"));
  });

  it("không còn nhãn Tự sinh theo tiêu chí; ô câu sửa tay được và lưu khi blur cùng tiêu chí", async () => {
    renderEditor();
    expect(screen.queryByText("Tự sinh theo tiêu chí")).toBeNull();
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.blur(sentence);
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(sentence, { target: { value: "Câu tôi sửa" } });
    fireEvent.blur(sentence);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ sessionId, studentId, criteria: 31, comment: "Câu tôi sửa" }));
  });

  it("xoá hết câu rồi blur thì sinh lại câu theo tiêu chí", async () => {
    renderEditor();
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "  " } });
    fireEvent.blur(sentence);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ comment: generatedSlipSentence(31) }));
    expect(sentence.value).toBe(generatedSlipSentence(31));
  });

  it("tích lại tiêu chí ghi đè câu đã sửa tay", async () => {
    renderEditor();
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "Câu tôi sửa" } });
    fireEvent.click(screen.getByTestId("slip-criterion-3"));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ criteria: 23, comment: generatedSlipSentence(23) }));
    expect(sentence.value).toBe(generatedSlipSentence(23));
  });

  it("nhãn BTVN: buổi trước chưa có BTVN", () => {
    renderEditor();
    expect(screen.getByTestId("slip-homework-auto-label")).toHaveTextContent("Buổi trước chưa có BTVN");
  });

  it("câu sửa tay chưa lưu vẫn giữ trạng thái Chưa lưu khi ghi chú được lưu", async () => {
    renderEditor();
    fireEvent.change(screen.getByTestId("slip-generated-comment"), { target: { value: "Câu đang sửa" } });
    const note = screen.getByTestId("slip-note");
    fireEvent.change(note, { target: { value: "Ghi chú" } });
    fireEvent.blur(note);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "pending"));
  });

  it("sau Gán tất cả mặc định phiếu đang mở nạp lại và blur không ghi ngược câu cũ", async () => {
    const seed = createSeed();
    replaceStore(seed);
    const student = seed.students.find((item) => item.id === studentId)!;
    const slip = (criteria: number, comment: string): Comment => ({ id: "c", classId: "6a", sessionId, studentId, criteria, comment, scale: 5, stars: 3, note: "giữ", hwManual: false, status: "draft", sendQueued: false, sentAt: null, updatedAt: "2026-10-26T00:00:00.000Z", createdAt: "2026-10-26T00:00:00.000Z" } as Comment);
    const rowOf = (comment: Comment): TicketRow => ({ student, comment, stars: 3, attended: true, status: "draft", sentAt: null, previousHomework: { state: "first", session: null, totalSections: 0, gradedSections: 0, ungradedSections: 0 } } as TicketRow);
    const homework = { state: "first" as const, sections: [] };
    const view = render(<TicketEditor session={getSession(sessionId)!} row={rowOf(slip(3, "Câu cũ"))} homework={homework} />);
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "Câu tôi vừa gõ" } });
    view.rerender(<TicketEditor session={getSession(sessionId)!} row={rowOf(slip(31, generatedSlipSentence(31)))} homework={homework} />);
    resetSessionDrafts(sessionId);
    await waitFor(() => expect(sentence.value).toBe(generatedSlipSentence(31)));
    fireEvent.blur(sentence);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByTestId("slip-save-status")).toHaveAttribute("data-save-state", "saved");
    expect(sessionStorage.length).toBe(0);
  });
});
