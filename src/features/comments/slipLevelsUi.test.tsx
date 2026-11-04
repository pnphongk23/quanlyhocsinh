import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { buildTicketRows } from "../../data/homework";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import type { Comment } from "../../data/types";
import { composeComment, defaultLevels, type Levels } from "../../data/criteriaLevels";
import { generatedSlipSentence } from "../../data/slip";
import { LEVEL_LABELS } from "../../data/criteriaLevels";
import CommentsPanel from "./CommentsPanel";
import CommentTicketSheet from "./CommentTicketSheet";
import { SlipLevelSkeleton } from "./LazySlipLevelFields";
import TicketEditor from "./TicketEditor";
import { SlipLevelFields } from "./SlipLevelFields";
import { resetSessionDrafts } from "./draftStore";

const save = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  saveSessionCommentDurable: save,
}));
vi.mock("../../data/repositories/access", async (original) => ({
  ...(await original<typeof import("../../data/repositories/access")>()),
  useAccess: () => ({ can: () => true, member: null, role: null, isAdmin: true, multipleRoles: false }),
}));

const sessionId = "6a-session-7";
const studentId = "6a-student-1";
const LEVELS: Levels = { focus: "good", participation: "good", mastery: "good", notes: "good", homework: "good" };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  save.mockReset().mockResolvedValue(undefined);
  sessionStorage.clear();
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function setup(comment: Comment | null = null, options: { gradedSkills?: ("speaking" | "reading")[]; topics?: ("vocabulary" | "speaking")[] } = {}) {
  const seed = createSeed();
  seed.sessions = seed.sessions.map((session) => session.id === sessionId ? {
    ...session,
    todayTopics: options.topics ?? ["vocabulary", "speaking"],
    gradedSkills: options.gradedSkills ?? ["speaking"],
  } : session);
  replaceStore(seed);
  const row = buildTicketRows(seed, sessionId).find((item) => item.student.id === studentId)!;
  if (comment) row.comment = comment;
  else row.comment = null;
  row.status = comment?.status ?? "draft";
  row.stars = comment?.stars ?? null;
  const session = getSession(sessionId)!;
  return { seed, row, session, homework: { state: "first" as const, sections: [] } };
}

function levelComment(patch: Partial<Comment> = {}): Comment {
  const levels = patch.levels ?? LEVELS;
  const skillLevels = patch.skillLevels ?? { speaking: "ok" as const };
  return {
    id: "c", classId: "6a", sessionId, studentId, criteria: 31,
    comment: composeComment({ levels, skillLevels, topics: ["vocabulary", "speaking"], gradedSkills: ["speaking"] }),
    scale: 5, stars: 5, levels, skillLevels, note: "Giữ ghi chú", hwManual: false,
    status: "draft", sendQueued: false, sentAt: null, updatedAt: "2026-10-26T00:00:00.000Z", createdAt: "2026-10-26T00:00:00.000Z",
    ...patch,
  } as Comment;
}

describe("khung giữ chỗ khi nạp phiếu 3 mức", () => {
  it("5 hàng ~ chiều cao phiếu, ẩn với trình đọc màn hình", () => {
    render(<SlipLevelSkeleton />);
    const skeleton = screen.getByTestId("slip-level-skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByTestId("slip-level-skeleton-row")).toHaveLength(5);
  });
});

describe("SlipLevelFields", () => {
  it("5 hàng tiêu chí, không có nhóm kỹ năng khi 0 kỹ năng, sao = số mức Tốt", () => {
    render(
      <SlipLevelFields
        levels={defaultLevels(null)}
        skillLevels={{}}
        gradedSkills={[]}
        comment="Câu"
        note=""
        previousGrades={null}
        homeworkState="first"
        hwManual={false}
        sent={false}
        disabled={false}
        onLevelChange={vi.fn()}
        onSkillChange={vi.fn()}
        onCommentChange={vi.fn()}
        onNoteChange={vi.fn()}
      />,
    );
    expect(screen.getAllByTestId(/^slip-level-row-/)).toHaveLength(5);
    expect(screen.getByText("4/5 sao")).toBeInTheDocument();
    expect(screen.queryByText("Kiến thức hôm nay")).toBeNull();
    expect(screen.getByTestId("slip-level-row-homework")).toHaveTextContent("Buổi trước chưa có BTVN");
  });

  it("2 kỹ năng chấm riêng: 2 hàng, đổi mức gọi onSkillChange, không đổi sao", () => {
    const onSkillChange = vi.fn();
    render(
      <SlipLevelFields
        levels={LEVELS}
        skillLevels={{ speaking: "ok", reading: "needs_work" }}
        gradedSkills={["speaking", "reading"]}
        comment="Câu"
        note=""
        previousGrades={null}
        homeworkState="has"
        hwManual={false}
        sent={false}
        disabled={false}
        onLevelChange={vi.fn()}
        onSkillChange={onSkillChange}
        onCommentChange={vi.fn()}
        onNoteChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("slip-skill-row-speaking")).toBeInTheDocument();
    expect(screen.getByTestId("slip-skill-row-reading")).toBeInTheDocument();
    expect(screen.getByText("5/5 sao")).toBeInTheDocument();
    fireEvent.click(chick("Đọc", "good"));
    expect(onSkillChange).toHaveBeenCalledWith("reading", "good");
  });

  it("phiếu đã gửi giữ dòng kỹ năng đã lưu dù buổi đã tắt Chấm riêng", () => {
    render(
      <SlipLevelFields
        levels={LEVELS}
        skillLevels={{ speaking: "needs_work" }}
        gradedSkills={[]}
        comment="Câu"
        note=""
        previousGrades={null}
        homeworkState="has"
        hwManual={false}
        sent
        disabled={false}
        onLevelChange={vi.fn()}
        onSkillChange={vi.fn()}
        onCommentChange={vi.fn()}
        onNoteChange={vi.fn()}
      />,
    );
    expect(chick("Nói", "needs_work")).toHaveAttribute("aria-checked", "true");
  });

  it("BTVN chưa chọn tay hiện theo chấm buổi trước; chọn tay thì gọi onLevelChange", () => {
    const onLevelChange = vi.fn();
    render(
      <SlipLevelFields
        levels={{ ...LEVELS, homework: "good" }}
        skillLevels={{}}
        gradedSkills={[]}
        comment="Câu"
        note=""
        previousGrades={[{ sectionId: "sec", studentId, level: "not_done" }]}
        homeworkState="has"
        hwManual={false}
        sent={false}
        disabled={false}
        onLevelChange={onLevelChange}
        onSkillChange={vi.fn()}
        onCommentChange={vi.fn()}
        onNoteChange={vi.fn()}
      />,
    );
    const homework = screen.getByTestId("slip-level-row-homework");
    expect(homework).toHaveTextContent("Theo chấm BTVN");
    expect(chick("Bài tập về nhà", "needs_work")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(chick("Bài tập về nhà", "good"));
    expect(onLevelChange).toHaveBeenCalledWith("homework", "good");
  });

  it("khoá theo quyền: radio disabled, chữ dài vẫn hiện", () => {
    render(
      <SlipLevelFields
        levels={LEVELS}
        skillLevels={{}}
        gradedSkills={[]}
        comment={"Câu nhận xét rất dài ".repeat(10)}
        note=""
        previousGrades={null}
        homeworkState="first"
        hwManual={false}
        sent
        disabled
        onLevelChange={vi.fn()}
        onSkillChange={vi.fn()}
        onCommentChange={vi.fn()}
        onNoteChange={vi.fn()}
      />,
    );
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect((screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement).value).toContain("Câu nhận xét rất dài");
  });
});

const chick = (label: string, level: "good" | "ok" | "needs_work") => {
  const count = level === "good" ? 3 : level === "ok" ? 2 : 1;
  return screen.getByRole("radio", { name: `${label}: ${LEVEL_LABELS[level]}, ${count} trên 3` });
};

describe("sheet phiếu 3 mức", () => {
  it("phiếu mới hiện 5 hàng mức (không còn ô chọn cũ), đổi mức sinh lại câu và giữ ghi chú", async () => {
    const { row, session, homework } = setup();
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    expect(await screen.findByTestId("slip-star-panel")).toBeInTheDocument();
    expect(screen.getByText("4/5 sao")).toBeInTheDocument();
    expect(screen.getByTestId("slip-level-row-focus")).toBeInTheDocument();
    expect(screen.queryByTestId("slip-criterion-0")).toBeNull();
    fireEvent.change(screen.getByTestId("slip-note"), { target: { value: "Gõ thêm" } });
    fireEvent.click(chick("Học tập trung", "ok"));
    expect(screen.getByText("3/5 sao")).toBeInTheDocument();
    expect((screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement).value).toContain("Con khá tập trung");
    expect(screen.getByTestId("slip-save-button")).toBeEnabled();
    fireEvent.click(screen.getByTestId("slip-save-button"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const input = save.mock.calls.at(-1)![0];
    expect(input.levels).toMatchObject({ focus: "ok", mastery: "ok", homework: "good" });
    expect(input.skillLevels).toEqual({ speaking: "ok" });
    expect(input.comment).toContain("Con khá tập trung");
    expect(input.note).toBe("Gõ thêm");
  });

  it("phiếu cũ không có levels vẫn hiện ô chọn đạt/chưa đạt như cũ", () => {
    const legacy = {
      id: "c", classId: "6a", sessionId, studentId, criteria: 30, comment: generatedSlipSentence(30), scale: 5,
      stars: 4, note: "", hwManual: false, status: "draft", sendQueued: false, sentAt: null,
      updatedAt: "2026-10-26T00:00:00.000Z", createdAt: "2026-10-26T00:00:00.000Z",
    } as Comment;
    const { row, session, homework } = setup(legacy);
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    expect(screen.getByTestId("slip-criterion-0")).toBeInTheDocument();
    expect(screen.queryByTestId("slip-level-row-focus")).toBeNull();
  });

  it("sửa câu rồi sửa ghi chú trên mobile: lưu giữ câu sửa tay", async () => {
    const { row, session, homework } = setup(levelComment());
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "Câu cô sửa tay" } });
    fireEvent.change(screen.getByTestId("slip-note"), { target: { value: "Ghi chú mới" } });
    fireEvent.click(screen.getByTestId("slip-save-button"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)![0]).toMatchObject({ note: "Ghi chú mới", comment: "Câu cô sửa tay" });
  });

  it("0 kỹ năng: sheet không có tiêu đề Kiến thức hôm nay", () => {
    const { row, session, homework } = setup(levelComment(), { gradedSkills: [] });
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    expect(screen.queryByText("Kiến thức hôm nay")).toBeNull();
  });

  it("2 kỹ năng: tiêu đề + đúng 2 hàng ngay dưới trong sheet", () => {
    const { row, session, homework } = setup(levelComment(), { gradedSkills: ["speaking", "reading"] });
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    expect(screen.getByText("Kiến thức hôm nay")).toBeInTheDocument();
    expect(screen.getByTestId("slip-skill-row-speaking")).toBeInTheDocument();
    expect(screen.getByTestId("slip-skill-row-reading")).toBeInTheDocument();
  });

  it("phiếu đã gửi không tự thêm dòng kỹ năng khi buổi vừa bật Chấm riêng", () => {
    const comment = levelComment({ status: "sent", sentAt: "2026-10-26T00:00:00.000Z", skillLevels: {} });
    const { row, session, homework } = setup(comment, { gradedSkills: ["speaking", "reading"] });
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    expect(screen.queryByTestId("slip-skill-row-speaking")).toBeNull();
    expect(screen.queryByTestId("slip-skill-row-reading")).toBeNull();
    expect(screen.getByTestId("slip-save-button")).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it("phiếu ĐÃ GỬI sửa được mức nhưng không tự sinh lại câu", async () => {
    const comment = levelComment({ status: "sent", sendQueued: false, sentAt: "2026-10-26T00:00:00.000Z" });
    const { row, session, homework } = setup(comment);
    render(<CommentTicketSheet session={session} row={row} homework={homework} onClose={() => {}} />);
    const before = (screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement).value;
    // Phiếu đã gửi không tự đổi nhãn BTVN thành "Chọn tay" khi giáo viên chưa chọn tay.
    expect(screen.getByTestId("slip-homework-auto-label")).toHaveTextContent("Theo chấm BTVN");
    fireEvent.click(chick("Nắm bài hôm nay", "needs_work"));
    expect((screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement).value).toBe(before);
    fireEvent.click(screen.getByTestId("slip-save-button"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)![0].levels.mastery).not.toBe("good");
  });
});

describe("desktop phiếu 3 mức", () => {
  it("buổi vừa bật kỹ năng mới: effect thêm Đạt vào cả draft, note blur không xoá mức/câu", async () => {
    const { row, session, homework } = setup(levelComment({ skillLevels: {} }), { gradedSkills: ["speaking"] });
    render(<TicketEditor session={session} row={row} homework={homework} />);
    await waitFor(() => expect(chick("Nói", "ok")).toHaveAttribute("aria-checked", "true"));
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    expect(sentence.value).toContain("Phần nói con làm được, cần luyện thêm.");

    const note = screen.getByTestId("slip-note");
    fireEvent.change(note, { target: { value: "Ghi chú sau khi bật" } });
    fireEvent.blur(note);
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ note: "Ghi chú sau khi bật" })));
    expect(save.mock.calls.at(-1)![0]).toMatchObject({ skillLevels: { speaking: "ok" } });
    expect(save.mock.calls.at(-1)![0].comment).toContain("Phần nói con làm được");
  });

  it("phiếu vừa chuyển sang 3 mức khi editor đang mở: xoá câu vẫn sinh câu theo mức", async () => {
    const legacy = {
      id: "c", classId: "6a", sessionId, studentId, criteria: 30, comment: generatedSlipSentence(30), scale: 5,
      stars: 4, note: "", hwManual: false, status: "draft", sendQueued: false, sentAt: null,
      updatedAt: "2026-10-26T00:00:00.000Z", createdAt: "2026-10-26T00:00:00.000Z",
    } as Comment;
    const { row, session, homework } = setup(legacy);
    const view = render(<TicketEditor session={session} row={row} homework={homework} />);
    view.rerender(<TicketEditor session={session} row={{ ...row, comment: levelComment() }} homework={homework} />);
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "" } });
    fireEvent.blur(sentence);
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)![0].comment).toContain("Con nắm được phần chính của từ vựng hôm nay");
  });

  it("sửa câu rồi sửa ghi chú: lưu ghi chú không ghi đè câu sửa tay", async () => {
    const { row, session, homework } = setup(levelComment());
    render(<TicketEditor session={session} row={row} homework={homework} />);
    const sentence = screen.getByTestId("slip-generated-comment") as HTMLTextAreaElement;
    fireEvent.change(sentence, { target: { value: "Câu cô sửa tay" } });
    fireEvent.blur(sentence);
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ comment: "Câu cô sửa tay" })));

    const note = screen.getByTestId("slip-note");
    fireEvent.change(note, { target: { value: "Ghi chú mới" } });
    fireEvent.blur(note);
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ note: "Ghi chú mới" })));
    expect(save.mock.calls.at(-1)![0]).toMatchObject({ note: "Ghi chú mới", comment: "Câu cô sửa tay" });
  });

  it("phiếu đã gửi: sửa ghi chú vẫn giữ câu đã lưu", async () => {
    const comment = levelComment({ status: "sent", sentAt: "2026-10-26T00:00:00.000Z" });
    const { row, session, homework } = setup(comment);
    render(<TicketEditor session={session} row={row} homework={homework} />);
    const note = screen.getByTestId("slip-note");
    fireEvent.change(note, { target: { value: "Ghi chú sau gửi" } });
    fireEvent.blur(note);
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)![0]).toMatchObject({ note: "Ghi chú sau gửi", comment: comment.comment });
  });

  it("TicketEditor dùng cùng hàng mức và lưu levels", async () => {
    const { row, session, homework } = setup(levelComment());
    render(<TicketEditor session={session} row={row} homework={homework} />);
    expect(screen.getByTestId("slip-level-row-mastery")).toBeInTheDocument();
    fireEvent.click(chick("Ghi chép và làm bài trên lớp", "needs_work"));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls.at(-1)![0].levels.notes).not.toBe("good");
  });
});

describe("tab Nhận xét theo cờ", () => {
  it("cờ tắt: không có Hôm nay học, vẫn có segmented Theo học sinh/Theo tiêu chí", () => {
    vi.stubEnv("VITE_CRITERIA_LEVELS", "0");
    setup();
    render(<MemoryRouter><CommentsPanel classId="6a" sessionId={sessionId} /></MemoryRouter>);
    expect(screen.queryByTestId("lesson-topics")).toBeNull();
    expect(screen.getByRole("tab", { name: "Theo tiêu chí" })).toBeInTheDocument();
  });

  it("cờ bật: có Hôm nay học, ẩn segmented, danh sách hiện 'N mục cần cố gắng'", () => {
    const { seed } = setup();
    const levels: Levels = { ...LEVELS, mastery: "needs_work", focus: "needs_work" };
    const comment = levelComment({ levels, comment: "Câu", status: "draft" });
    replaceStore({ ...seed, comments: [comment] });
    render(<MemoryRouter><CommentsPanel classId="6a" sessionId={sessionId} /></MemoryRouter>);
    expect(screen.getByTestId("lesson-topics")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Theo tiêu chí" })).toBeNull();
    expect(screen.getByText("2 mục cần cố gắng")).toBeInTheDocument();
  });
});

afterEach(() => resetSessionDrafts(sessionId));
