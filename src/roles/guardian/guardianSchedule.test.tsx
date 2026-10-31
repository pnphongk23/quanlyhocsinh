import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { switchRole } from "../../data/repositories/access";
import { MEMBER_IDS } from "../../data/defaults";
import { api } from "../../data/sync";
import type { ApiSession } from "../../data/api/types";
import { GuardianProvider } from "./guardianContext";
import GuardianSchedulePage from "./GuardianSchedulePage";
import { childScheduleSessions } from "./guardianRead";
import {
  addDays,
  addMonths,
  isWithinRange,
  monthRange,
  monthTitle,
  scheduleStatus,
  sessionFromApi,
  snapshotRange,
  weekdayDateLabel,
} from "./guardianSchedule";

const originalOnline = Object.getOwnPropertyDescriptor(navigator, "onLine");

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function prepareGuardian() {
  replaceStore(createSeed());
  switchRole(MEMBER_IDS.lanGuardian);
  localStorage.clear();
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/ph/lich"]}>
      <GuardianProvider><GuardianSchedulePage /></GuardianProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalOnline) Object.defineProperty(navigator, "onLine", originalOnline);
  window.sessionStorage.clear();
});

describe("guardian schedule helpers", () => {
  it("reads all statuses only for the linked child's enrolled class", () => {
    prepareGuardian();
    const state = createSeed();
    state.sessions.push(
      { id: "other-class-session", classId: "ielts", date: "2026-10-16", time: "19:30", status: "held" },
      { id: "outside-class-window", classId: "6a", date: "2026-08-30", time: "18:00", status: "held" },
    );
    state.students.find((student) => student.id === "6a-student-1")!.enrolledAt = "2026-09-01";
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);

    const sessions = childScheduleSessions("6a-student-1");
    expect(sessions.some((session) => session.status === "cancelled")).toBe(true);
    expect(sessions.every((session) => session.classId === "6a")).toBe(true);
    expect(sessions.some((session) => session.id === "outside-class-window")).toBe(false);
    expect(sessions.some((session) => session.id === "other-class-session")).toBe(false);
    expect(() => childScheduleSessions("not-a-linked-child")).toThrow();
  });

  it("formats and compares the snapshot window and calendar dates", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(snapshotRange("2026-10-15")).toEqual({ from: "2026-07-17", to: "2026-12-10" });
    expect(isWithinRange(monthRange("2026-08"), snapshotRange("2026-10-15"))).toBe(true);
    expect(isWithinRange(monthRange("2026-05"), snapshotRange("2026-10-15"))).toBe(false);
    expect(monthTitle("2026-10")).toBe("Tháng 10, 2026");
    expect(weekdayDateLabel("2026-10-30")).toBe("Thứ Sáu, 30 tháng 10");
  });

  it("maps remote sessions and labels cancelled and makeup sessions", () => {
    const apiSession: ApiSession = {
      id: "remote-session", class_id: "6a", date: "2026-05-15", start_time: "18:00",
      origin: "manual", is_makeup: true, status: "planned", version: 2,
    };
    const session = sessionFromApi(apiSession);
    expect(session).toMatchObject({ id: "remote-session", classId: "6a", time: "18:00", makeup: true });
    expect(scheduleStatus(session)).toBe("Học bù");
    expect(scheduleStatus({ ...session, status: "cancelled" })).toBe("Đã huỷ");
    expect(scheduleStatus({ ...session, makeup: false, status: "held" })).toBe("Đã học");
  });
});

describe("guardian schedule page", () => {
  it("marks only dates that have sessions and keeps past attendance, stars, and new status reachable", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-15T12:00:00"));
    prepareGuardian();
    renderPage();

    const selected = screen.getByRole("button", { name: "Thứ Năm, 15 tháng 10" });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected.querySelector('[aria-label="Có buổi học"]')).toBeNull();
    const dayWithSession = screen.getByRole("button", { name: "Thứ Tư, 14 tháng 10" });
    expect(dayWithSession.querySelector('[aria-label="Có buổi học"]')).not.toBeNull();

    fireEvent.click(dayWithSession);
    expect(screen.getByRole("link", { name: /18:00.*Đã học/s })).toHaveAttribute("href", "/ph/buoi/6a-session-7");
    expect(screen.getByText("Vắng")).toBeVisible();
    expect(screen.getByRole("img", { name: "3 sao" })).toBeVisible();
    expect(screen.getByText("Mới")).toBeVisible();
  });

  it("shows sessions from the currently selected child when a guardian has children in different classes", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T12:00:00"));
    const state = createSeed();
    state.members.find((member) => member.id === MEMBER_IDS.lanGuardian)!.studentIds = [
      "6a-student-1",
      "ielts-student-3",
    ];
    replaceStore(state);
    switchRole(MEMBER_IDS.lanGuardian);
    window.sessionStorage.setItem("guardian-selected-child-v1", "ielts-student-3");
    renderPage();

    expect(screen.getByText("Phạm Đức Dũng")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Thứ Năm, 15 tháng 10" }));
    expect(screen.getByRole("link", { name: /19:30.*Đã học/s })).toHaveAttribute("href", "/ph/buoi/ielts-session-7");
    expect(screen.queryByRole("link", { name: /18:00/ })).toBeNull();
  });

  it("fetches out-of-window dates through GET /calendar and filters to the selected child class", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T12:00:00"));
    setOnline(true);
      prepareGuardian();
      const remote: ApiSession[] = [
      { id: "remote-6a", class_id: "6a", date: "2027-01-15", start_time: "18:00", origin: "manual", is_makeup: false, status: "held", version: 1 },
      { id: "remote-ielts", class_id: "ielts", date: "2027-01-15", start_time: "19:30", origin: "manual", is_makeup: false, status: "held", version: 1 },
      ];
      const request = vi.spyOn(api, "request").mockResolvedValue({ items: remote } as never);
      renderPage();
      for (let month = 0; month < 3; month += 1) fireEvent.click(screen.getByRole("button", { name: "Tháng sau" }));

      await waitFor(() => expect(request).toHaveBeenCalledWith("GET /calendar", expect.objectContaining({
      query: { from: "2027-01-01", to: "2027-01-31" },
      })));
      await waitFor(() => expect(screen.getByRole("link", { name: /18:00.*Đã học/s })).toHaveAttribute("href", "/ph/buoi/remote-6a"));
    expect(screen.queryByRole("link", { name: /19:30/ })).toBeNull();
  });

  it("shows a connection message instead of calendar sessions while offline outside the snapshot", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T12:00:00"));
    setOnline(false);
    prepareGuardian();
    const request = vi.spyOn(api, "request");
    renderPage();
    for (let month = 0; month < 5; month += 1) fireEvent.click(screen.getByRole("button", { name: "Tháng trước" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cần kết nối mạng để xem tháng này");
    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /18:00/ })).toBeNull();
  });
});
