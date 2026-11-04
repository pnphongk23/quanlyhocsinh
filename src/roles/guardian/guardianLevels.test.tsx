import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MEMBER_IDS } from "../../data/defaults";
import { createSeed } from "../../data/seed";
import { replaceStore } from "../../data/store";
import { switchRole } from "../../data/repositories/access";
import type { Comment } from "../../data/types";
import type { SkillKey } from "../../data/criteriaLevels";
import { GuardianProvider } from "./guardianContext";
import GuardianSessionPage from "./GuardianSessionPage";

const CHILD_KEY = "guardian-selected-child-v1";

function seedGuardian(comment: Comment, gradedSkills: SkillKey[] = ["speaking"], topics: SkillKey[] = ["vocabulary", "speaking"]): void {
  const state = createSeed();
  state.comments = state.comments.filter((item) => item.sessionId !== comment.sessionId || item.studentId !== comment.studentId);
  state.comments.push(comment);
  state.sessions = state.sessions.map((session) => session.id === comment.sessionId ? {
    ...session,
    todayTopics: topics,
    gradedSkills,
  } : session);
  replaceStore(state);
  switchRole(MEMBER_IDS.lanGuardian);
}

function storeSelectedChild(studentId: string): void {
  const map = new Map<string, string>([[CHILD_KEY, studentId]]);
  (globalThis as { sessionStorage?: Storage }).sessionStorage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => map.clear(),
    key: () => null,
    length: map.size,
  } as Storage;
}

function renderSession(sessionId: string): HTMLElement {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/ph/buoi/${sessionId}`]}>
      <GuardianProvider>
        <Routes>
          <Route path="/ph/buoi/:sessionId" element={<GuardianSessionPage />} />
        </Routes>
      </GuardianProvider>
    </MemoryRouter>,
  );
  const host = document.createElement("div");
  host.innerHTML = html;
  return host;
}

afterEach(() => { delete (globalThis as { sessionStorage?: Storage }).sessionStorage; });

const LEVELS = { focus: "good", participation: "ok", mastery: "ok", notes: "good", homework: "needs_work" } as const;

function levelSlip(sessionId: string): Comment {
  return {
    id: `level-${sessionId}`, classId: "6a", studentId: "6a-student-1", sessionId,
    criteria: 11, comment: "Con học tập trung, ghi bài đầy đủ. Con khá tập trung, thỉnh thoảng còn mất chú ý.",
    scale: 5, stars: 3, levels: LEVELS, skillLevels: { speaking: "needs_work" }, note: "Ghi chú của cô",
    hwManual: false, status: "sent", sendQueued: false, sentAt: "2026-10-14T13:14:00.000Z",
    updatedAt: "2026-10-14T13:14:00.000Z", createdAt: "2026-10-14T13:14:00.000Z",
  } as Comment;
}

describe("PH · phiếu 3 mức ở màn buổi học", () => {
  it("hiện Hôm nay học, từng dòng tiêu chí + mức, kỹ năng chấm thêm rồi đoạn nhận xét", () => {
    seedGuardian(levelSlip("6a-session-2"));
    storeSelectedChild("6a-student-1");
    const host = renderSession("6a-session-2");

    expect(host.textContent).toContain("Hôm nay học: Từ vựng, Nói");
    const criteria = host.querySelector('[data-testid="guardian-criteria"]')!;
    expect(criteria.textContent).toContain("Học tập trung");
    expect(criteria.textContent).toContain("Tích cực tham gia");
    expect(criteria.querySelector('[role="img"][aria-label="Đạt, 2 trên 3"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="guardian-skill-speaking"]')?.textContent).toContain("Nói");
    expect(host.querySelector('[data-testid="guardian-skill-speaking"] [role="img"]')?.getAttribute("aria-label")).toBe("Cần cố gắng, 1 trên 3");
    // Phiếu 3 mức: câu tự sinh + phần gõ thêm là MỘT đoạn, không có khung "Ghi chú" riêng.
    const paragraph = host.querySelector('[data-testid="guardian-ticket-text"]')!;
    expect(paragraph.textContent).toContain("Con học tập trung, ghi bài đầy đủ.");
    expect(paragraph.textContent).toContain("Ghi chú của cô");
    expect(host.querySelector('[data-testid="guardian-note-block"]')).toBeNull();
  });

  it("dòng Hôm nay học giữ tên chip đầy đủ (Mẫu câu/Ngữ pháp)", () => {
    seedGuardian(levelSlip("6a-session-2"), ["grammar"], ["vocabulary", "grammar"]);
    storeSelectedChild("6a-student-1");
    const host = renderSession("6a-session-2");
    expect(host.querySelector('[data-testid="guardian-today-topics"]')?.textContent).toContain("Hôm nay học: Từ vựng, Mẫu câu/Ngữ pháp");
  });

  it("dòng kỹ năng lấy từ mức đã lưu trên phiếu, không theo cấu hình buổi hiện tại", () => {
    seedGuardian(levelSlip("6a-session-2"), []);
    storeSelectedChild("6a-student-1");
    const host = renderSession("6a-session-2");
    expect(host.querySelector('[data-testid="guardian-skill-speaking"] [role="img"]')?.getAttribute("aria-label")).toBe("Cần cố gắng, 1 trên 3");
  });

  it("buổi trước không giao BTVN: không hiện dòng Bài tập về nhà trên phiếu", () => {
    seedGuardian(levelSlip("6a-session-2"));
    storeSelectedChild("6a-student-1");
    const host = renderSession("6a-session-2");
    const criteria = host.querySelector('[data-testid="guardian-criteria"]')!;
    expect(criteria.textContent).not.toContain("Bài tập về nhà");
    // Buổi có BTVN buổi trước (fixture) thì hiện dòng này.
    seedGuardian(levelSlip("6a-session-7"));
    storeSelectedChild("6a-student-1");
    const withHomework = renderSession("6a-session-7");
    expect(withHomework.querySelector('[data-testid="guardian-criteria"]')?.textContent).toContain("Bài tập về nhà");
  });

  it("phiếu cũ không có levels vẫn hiện như cũ, không có danh sách tiêu chí", () => {
    seedGuardian(levelSlip("6a-session-2"));
    storeSelectedChild("6a-student-1");
    // session-4 là phiếu thang 3 sao có sẵn trong fixture.
    const host = renderSession("6a-session-4");
    expect(host.querySelector('[data-testid="guardian-criteria"]')).toBeNull();
    expect(host.textContent).toContain("/3 sao");
    // Phiếu cũ giữ "Ghi chú" riêng.
    expect(host.querySelector('[data-testid="guardian-ticket-text"]')?.textContent).not.toContain("Ghi chú kiểm thử.");
    expect(host.querySelector('[data-testid="guardian-note-block"]')?.textContent).toContain("Ghi chú kiểm thử.");
  });
});
