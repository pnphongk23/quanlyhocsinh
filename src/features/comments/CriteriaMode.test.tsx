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
    render(<CriteriaMode sessionId="6a-session-7" rows={rows} canWrite />);
    expect(screen.getAllByText("Phiếu thang cũ").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /Nguyễn Minh Anh.*Phiếu thang cũ/ })).toHaveLength(0);
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
});
