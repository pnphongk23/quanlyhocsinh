import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { setRejectedCommands } from "../../data/saveStatus";
import type { Session } from "../../data/types";
import LessonTopicsBar from "./LessonTopicsBar";

const repo = vi.hoisted(() => ({ lesson: vi.fn(), regenerate: vi.fn() }));
vi.mock("../../data/repositories/sessions", async (original) => ({
  ...(await original<typeof import("../../data/repositories/sessions")>()),
  saveSessionLessonDurable: repo.lesson,
}));
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  regenerateSlipCommentsDurable: repo.regenerate,
}));

function sessionWith(patch: Partial<Session> = {}): Session {
  const seed = createSeed();
  seed.sessions = seed.sessions.map((session) => session.id === "6a-session-7" ? { ...session, ...patch } : session);
  replaceStore(seed);
  return seed.sessions.find((session) => session.id === "6a-session-7")!;
}

beforeEach(() => {
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
  repo.lesson.mockReset().mockResolvedValue(undefined);
  repo.regenerate.mockReset().mockResolvedValue(0);
});
afterEach(() => {
  vi.unstubAllEnvs();
  act(() => setRejectedCommands([]));
});

describe("LessonTopicsBar", () => {
  it("6 chip chọn nhiều, mặc định không chọn và không hiện Chấm riêng", () => {
    const session = sessionWith();
    render(<LessonTopicsBar session={session} />);
    const chips = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") !== null);
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "Từ vựng", "Mẫu câu/Ngữ pháp", "Nghe", "Nói", "Đọc", "Viết",
    ]);
    expect(chips.every((chip) => chip.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(screen.queryByRole("group", { name: "Chấm riêng" })).toBeNull();
  });

  it("chọn chip lưu session.lesson.set rồi sinh lại câu phiếu chưa gửi", async () => {
    const session = sessionWith();
    render(<LessonTopicsBar session={session} />);
    fireEvent.click(screen.getByTestId("lesson-topic-vocabulary"));
    await vi.waitFor(() => expect(repo.lesson).toHaveBeenCalledWith("6a-session-7", { topics: ["vocabulary"], gradedSkills: [] }));
    expect(repo.regenerate).toHaveBeenCalledWith("6a-session-7");
  });

  it("công tắc Chấm riêng chỉ hiện cho chip đã chọn và bật/tắt đúng", async () => {
    const session = sessionWith({ todayTopics: ["vocabulary", "speaking"], gradedSkills: ["speaking"] });
    render(<LessonTopicsBar session={session} />);
    const gradedGroup = screen.getByRole("group", { name: "Chấm riêng" });
    expect(gradedGroup).toHaveTextContent("Từ vựng");
    expect(gradedGroup).toHaveTextContent("Nói");
    expect(gradedGroup).not.toHaveTextContent("Nghe");
    expect(screen.getByTestId("lesson-graded-speaking")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("lesson-graded-vocabulary")).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByTestId("lesson-graded-speaking"));
    await vi.waitFor(() => expect(repo.lesson).toHaveBeenCalledWith("6a-session-7", { topics: ["vocabulary", "speaking"], gradedSkills: [] }));
  });

  it("bỏ chip đã chọn thì bỏ luôn Chấm riêng của kỹ năng đó", async () => {
    const session = sessionWith({ todayTopics: ["vocabulary", "speaking"], gradedSkills: ["vocabulary", "speaking"] });
    render(<LessonTopicsBar session={session} />);
    fireEvent.click(screen.getByTestId("lesson-topic-vocabulary"));
    await vi.waitFor(() => expect(repo.lesson).toHaveBeenCalledWith("6a-session-7", { topics: ["speaking"], gradedSkills: ["speaking"] }));
  });

  it("khoá khi chưa điểm danh xong, không gọi lưu", () => {
    const session = sessionWith();
    render(<LessonTopicsBar session={session} disabled />);
    const chip = screen.getByTestId("lesson-topic-vocabulary");
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    expect(repo.lesson).not.toHaveBeenCalled();
  });

  it("hàng chip xuống nhiều dòng, không cuộn ngang ở 375/390", () => {
    const css = readFileSync(resolve(process.cwd(), "src/features/comments/LessonTopicsBar.module.css"), "utf8");
    expect(css).toMatch(/\.chips\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(css).not.toMatch(/\.chips\s*\{[^}]*overflow-x/s);
  });

  it("lỗi từ chối cuối hiện lỗi dòng 'chỉ có trên máy'", () => {
    const session = sessionWith();
    render(<LessonTopicsBar session={session} />);
    act(() => setRejectedCommands([{ id: "lesson", type: "session.lesson.set", error: "feature_disabled", sessionId: "6a-session-7" }]));
    expect(screen.getByRole("alert").textContent).toContain("Chưa lưu được, giá trị này chỉ có trên máy");
  });
});
