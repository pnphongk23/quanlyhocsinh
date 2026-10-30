import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTicketRows } from "../../data/homework";
import { createSeed } from "../../test/fixtures/seed";
import CriteriaMode from "./CriteriaMode";

const toggle = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", async (original) => ({
  ...(await original<typeof import("../../data/repositories/comments")>()),
  toggleSlipCriterionDurable: toggle,
}));

beforeEach(() => toggle.mockReset().mockResolvedValue(undefined));
afterEach(() => vi.restoreAllMocks());

describe("CriteriaMode", () => {
  it("toggles only the tapped student and criterion", () => {
    const state = createSeed();
    const rows = buildTicketRows(state, "6a-session-7");
    const onSelectStudent = vi.fn();
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite onSelectStudent={onSelectStudent} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Nguyễn Minh Anh" })[0]);
    expect(toggle).toHaveBeenCalledWith("6a-session-7", rows[0].student.id, 0);
    expect(onSelectStudent).toHaveBeenCalledWith(rows[0].student.id);
  });

  it("tô màu = em đạt: phiếu đủ tiêu chí tô hết, bỏ một tiêu chí thì chip đó bỏ tô, em chưa có phiếu tô nhạt", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    const [full, partial, none] = rows;
    full.comment = { ...full.comment!, scale: 5, criteria: 31 };
    partial.comment = { ...partial.comment!, scale: 5, criteria: 30 };
    none.comment = null;
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite />);
    expect(screen.getAllByText("Chạm để bỏ chọn em chưa đạt")).toHaveLength(5);
    const chipsOf = (name: string) => screen.getAllByRole("button", { name: new RegExp(`^${name}`) });
    expect(chipsOf(full.student.name).every((chip) => chip.getAttribute("aria-pressed") === "true")).toBe(true);
    const partialChips = chipsOf(partial.student.name);
    expect(partialChips[0]).toHaveAttribute("aria-pressed", "false");
    expect(partialChips.slice(1).every((chip) => chip.getAttribute("aria-pressed") === "true")).toBe(true);
    const noneChips = chipsOf(none.student.name);
    expect(noneChips.every((chip) => chip.getAttribute("aria-pressed") === "true" && /provisional/.test(chip.className))).toBe(true);
    expect(chipsOf(full.student.name).every((chip) => !/provisional/.test(chip.className))).toBe(true);
  });

  it("keeps every no-slip chip pale even when prior homework was not done", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    const row = rows[0];
    const noHomeworkRow = rows[1];
    row.comment = null;
    noHomeworkRow.comment = null;
    render(<CriteriaMode sessionId="6a-session-7" rows={[row, noHomeworkRow]} canWrite previousGrades={(studentId) => studentId === row.student.id ? [{ sectionId: "reading", studentId, level: "not_done" }] : []} />);
    const chipsOf = (student: typeof row) => screen.getAllByRole("button", { name: new RegExp(`^${student.student.name}`) });
    const unfinishedHomeworkChips = chipsOf(row);
    const noHomeworkChips = chipsOf(noHomeworkRow);
    expect(unfinishedHomeworkChips).toHaveLength(5);
    expect(noHomeworkChips).toHaveLength(5);
    expect([...unfinishedHomeworkChips, ...noHomeworkChips].every((chip) => /provisional/.test(chip.className) && !/selected/.test(chip.className))).toBe(true);
    expect(unfinishedHomeworkChips[4]).toHaveAttribute("aria-pressed", "false");
    expect(noHomeworkChips[4]).toHaveAttribute("aria-pressed", "true");
  });

  it("hides editable chip buttons without write access", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite={false} />);
    expect(screen.queryByRole("button", { name: "Nguyễn Minh Anh" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Nguyễn Minh Anh").length).toBeGreaterThan(0);
    expect(toggle).not.toHaveBeenCalled();
  });

  it("shows the shared empty state when no students are on the session", () => {
    render(<CriteriaMode sessionId="6a-session-7" rows={[]} canWrite />);
    expect(screen.getByText("Chưa có học sinh trong buổi học này")).toBeVisible();
  });

  it("renders legacy slips as non-interactive chips", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    rows[0].comment = { ...rows[0].comment!, scale: 3, criteria: null, stars: 2 };
    render(<CriteriaMode sessionId="6a-session-7" rows={[rows[0]]} canWrite />);
    expect(screen.getAllByText("Phiếu thang cũ").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /Nguyễn Minh Anh.*Phiếu thang cũ/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByText("Nguyễn Minh Anh").every((chip) => !/selected/.test(chip.className))).toBe(true);
  });

  it("keeps five-star no-criteria slips unmet in the badge and lets the teacher edit them", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    rows[0].comment = { ...rows[0].comment!, scale: 5, criteria: null, stars: 5 };
    render(<CriteriaMode sessionId="6a-session-7" rows={[rows[0]]} canWrite />);
    const chips = screen.getAllByRole("button", { name: /^Nguyễn Minh Anh/ });
    expect(chips).toHaveLength(5);
    expect(chips.every((chip) => chip.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(screen.queryByText("Phiếu thang cũ")).not.toBeInTheDocument();
    expect(screen.getAllByText("1 em chưa đạt")).toHaveLength(5);
    fireEvent.click(chips[0]);
    expect(toggle).toHaveBeenCalledWith("6a-session-7", rows[0].student.id, 0);
  });

  it("asks once per screen before changing sent slips", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    const row = rows[3];
    row.comment = { id: "sent", classId: row.student.classId, sessionId: "6a-session-7", studentId: row.student.id, criteria: 31, comment: "Câu đã gửi", scale: 5, stars: 5, note: "", hwManual: false, status: "sent", sendQueued: false, sentAt: "2026-10-14", updatedAt: "", createdAt: "" };
    row.status = "sent";
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite />);
    const chip = screen.getAllByRole("button", { name: new RegExp(row.student.name) })[0];
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(confirmation).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledTimes(2);
  });

  it("keeps skipped sent slips non-interactive until includeSent is enabled and shares confirmation and custom-comment warning", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    const row = rows[3];
    row.comment = { id: "sent", classId: row.student.classId, sessionId: "6a-session-7", studentId: row.student.id, criteria: 31, comment: "Teacher edited this", scale: 5, stars: 5, note: "", hwManual: false, status: "sent", sendQueued: false, sentAt: "2026-10-14", updatedAt: "", createdAt: "" };
    row.status = "sent";
    const onToggle = vi.fn();
    const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { rerender } = render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite preview={{ onToggle }} />);
    expect(screen.queryByRole("button", { name: new RegExp(row.student.name) })).not.toBeInTheDocument();
    rerender(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite preview={{ includeSent: true, onToggle }} />);
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(row.student.name) })[0]);
    expect(confirmation).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(row.student.id, 0);
    expect(screen.getByText(/Câu nhận xét đã được sửa tay/)).toBeVisible();
  });

  it("counts unmet students from preview criteria", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7");
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite preview={{ criteriaByStudent: { [rows[0].student.id]: 30 } }} />);
    expect(screen.getAllByText("6 em chưa có phiếu")).toHaveLength(5);
  });

  it("renders the no-slip badge text", () => {
    const rows = buildTicketRows(createSeed(), "6a-session-7").slice(0, 3);
    rows.forEach((row) => { row.comment = null; });
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite />);
    expect(screen.getAllByText("3 em chưa có phiếu")).toHaveLength(5);
  });
});
