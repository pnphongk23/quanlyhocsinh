import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Session } from "../../data/types";
import { TodayCard } from "./TodayCard";
import type { BacklogItem, TodayAgenda, TodayEntry } from "./todayModel";

const item = (n: number, kind: BacklogItem["task"]["kind"], backlogLabel?: string): BacklogItem => ({
  session: { id: `s${kind}${n}`, classId: `c${n}`, date: `2026-10-${String(10 + n).padStart(2, "0")}` } as Session,
  classId: `c${n}`,
  className: `Lớp ${n}`,
  prefix: `Buổi ${n}`,
  task: { kind, label: kind, ...(backlogLabel ? { backlogLabel } : {}), tab: kind === "attendance" ? "diem-danh" : "nhan-xet", students: kind === "attendance" ? undefined : n },
});
const agenda = (backlog: BacklogItem[]): TodayAgenda => ({ date: "2026-10-30", backlog, entries: [], next: null });
const renderCard = (backlog: BacklogItem[]) => render(<MemoryRouter><TodayCard agenda={agenda(backlog)} /></MemoryRouter>);

const nextEntry: TodayEntry = {
  session: { id: "next-session", classId: "next-class", date: "2026-11-01" } as Session,
  classId: "next-class",
  className: "Lớp kế tiếp",
  time: "09:00",
  prefix: "CN · 01/11",
  statusLabel: "Chưa tới",
  statusTone: "neutral",
  tasks: [],
};

describe("Việc còn dở theo nhóm", () => {
  it("thu gọn hiện đúng 2 việc ưu tiên điểm danh; mở hiện đủ nhóm và Thu gọn quay lại", () => {
    renderCard(
      [1, 2, 3, 4, 5].map((n) => item(n, "tickets"))
        .concat([item(1, "attendance")])
        .concat([item(1, "homework"), item(2, "homework"), item(3, "homework")]),
    );
    const backlog = screen.getByRole("region", { name: "Việc còn dở" });
    let links = within(backlog).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Điểm danh chưa xong");
    expect(links[1]).toHaveTextContent("Phiếu chưa gửi");
    expect(within(backlog).queryByRole("heading", { level: 4 })).toBeNull();

    const more = within(backlog).getByRole("button", { name: "Xem thêm (7)" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    links = within(backlog).getAllByRole("link");
    expect(links).toHaveLength(9);
    expect(within(backlog).getAllByRole("heading", { level: 4 })).toHaveLength(3);
    const collapse = within(backlog).getByRole("button", { name: "Thu gọn" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapse);
    expect(within(backlog).getAllByRole("link")).toHaveLength(2);
    expect(within(backlog).queryByRole("heading", { level: 4 })).toBeNull();
    expect(within(backlog).getByRole("button", { name: "Xem thêm (7)" })).toHaveAttribute("aria-expanded", "false");
  });

  it("2 việc tổng cộng không hiện nút Xem thêm", () => {
    renderCard([item(1, "homework"), item(2, "homework")]);
    const backlog = screen.getByRole("region", { name: "Việc còn dở" });
    expect(within(backlog).getAllByRole("link")).toHaveLength(2);
    expect(within(backlog).queryByRole("button", { name: /Xem thêm/ })).toBeNull();
  });

  it("hiện nhãn điểm danh chưa đủ khi thu gọn và mở rộng backlog", () => {
    renderCard([item(1, "attendance", "Chưa điểm danh đủ"), item(2, "tickets"), item(3, "homework")]);
    const backlog = screen.getByRole("region", { name: "Việc còn dở" });
    expect(within(backlog).getAllByRole("link")[0]).toHaveTextContent("Chưa điểm danh đủ");

    fireEvent.click(within(backlog).getByRole("button", { name: "Xem thêm (1)" }));
    expect(within(backlog).getAllByRole("link")[0]).toHaveTextContent("Chưa điểm danh đủ");
  });
});

describe("Buổi kế tiếp trong khối Hôm nay", () => {
  it("hiện subtitle CN · 01/11 mà không lặp phần ngày", () => {
    const cardAgenda: TodayAgenda = { ...agenda([]), next: nextEntry };
    render(<MemoryRouter><TodayCard agenda={cardAgenda} /></MemoryRouter>);

    expect(screen.getByText("CN · 01/11", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/1\/11 ·/)).toBeNull();
  });
});
