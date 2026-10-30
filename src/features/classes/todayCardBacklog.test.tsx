import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Session } from "../../data/types";
import { TodayCard } from "./TodayCard";
import type { BacklogItem, TodayAgenda } from "./todayModel";

const item = (n: number, kind: BacklogItem["task"]["kind"]): BacklogItem => ({
  session: { id: `s${kind}${n}`, classId: `c${n}`, date: `2026-10-${String(10 + n).padStart(2, "0")}` } as Session,
  classId: `c${n}`,
  className: `Lớp ${n}`,
  prefix: `Buổi ${n}`,
  task: { kind, label: kind, tab: kind === "attendance" ? "diem-danh" : "nhan-xet", students: kind === "attendance" ? undefined : n },
});
const agenda = (backlog: BacklogItem[]): TodayAgenda => ({ date: "2026-10-30", backlog, entries: [], next: null });
const renderCard = (backlog: BacklogItem[]) => render(<MemoryRouter><TodayCard agenda={agenda(backlog)} /></MemoryRouter>);

describe("Việc còn dở theo nhóm", () => {
  it("gộp theo loại, mỗi nhóm mặc định tối đa 2 dòng và có Xem thêm (N)", () => {
    renderCard([1, 2, 3, 4, 5].map((n) => item(n, "tickets")).concat([item(1, "attendance")]));
    const tickets = screen.getByRole("region", { name: "Phiếu chưa gửi" });
    expect(within(tickets).getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Điểm danh chưa xong" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Điểm danh chưa xong" })).queryByRole("button")).toBeNull();
    const more = within(tickets).getByRole("button", { name: "Xem thêm (3)" });
    expect(more).toHaveAttribute("aria-expanded", "false");
  });

  it("Xem thêm mở cả nhóm và Thu gọn đóng lại; nhóm khác không đổi", () => {
    renderCard([1, 2, 3, 4].map((n) => item(n, "tickets")).concat([1, 2, 3].map((n) => item(n, "homework"))));
    const tickets = screen.getByRole("region", { name: "Phiếu chưa gửi" });
    const homework = screen.getByRole("region", { name: "BTVN chưa chấm" });
    fireEvent.click(within(tickets).getByRole("button", { name: "Xem thêm (2)" }));
    expect(within(tickets).getAllByRole("link")).toHaveLength(4);
    expect(within(homework).getAllByRole("link")).toHaveLength(2);
    fireEvent.click(within(tickets).getByRole("button", { name: "Thu gọn" }));
    expect(within(tickets).getAllByRole("link")).toHaveLength(2);
  });

  it("nhóm chỉ có 2 việc không hiện Xem thêm", () => {
    renderCard([item(1, "homework"), item(2, "homework")]);
    expect(screen.queryByRole("button", { name: /Xem thêm/ })).toBeNull();
  });
});
