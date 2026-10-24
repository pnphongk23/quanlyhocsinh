import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import HomeworkPanel from "./HomeworkPanel";

const outbox = vi.hoisted(() => ({ persistCommand: vi.fn() }));
vi.mock("../../data/outbox", async (original) => ({
  ...(await original<typeof import("../../data/outbox")>()),
  persistCommand: outbox.persistCommand,
}));

const FAIL = "Không lưu được vào bộ nhớ trên thiết bị.";

function renderPanel() {
  render(
    <MemoryRouter>
      <HomeworkPanel session={getSession("6a-session-8")!} initialView="previous" />
    </MemoryRouter>,
  );
}
const group = (name: string) => screen.getAllByRole("group", { name: new RegExp(`Chấm bài của ${name}`) })[0];
const pressedIn = (name: string) =>
  Array.from(group(name).querySelectorAll("button[aria-pressed=true]")).map((b) => b.textContent);

beforeEach(() => {
  replaceStore(createSeed());
  outbox.persistCommand.mockReset().mockRejectedValue(new Error(FAIL));
});

describe("HomeworkPanel mobile: chấm bài khi ghi bền lỗi", () => {
  it("chấm từng em: giữ mức vừa bấm (Chưa lưu), báo lỗi, bấm lại thì ghi lại", async () => {
    renderPanel();
    const name = "Nguyễn Minh Anh";
    const target = Array.from(group(name).querySelectorAll("button")).find((b) => b.getAttribute("aria-pressed") === "false")!;
    const label = target.textContent;
    fireEvent.click(target);
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(pressedIn(name)).toEqual([label]);
    expect(screen.getAllByText("Chưa lưu").length).toBe(1);

    outbox.persistCommand.mockReset().mockResolvedValue(undefined);
    fireEvent.click(Array.from(group(name).querySelectorAll("button")).find((b) => b.textContent === label)!);
    await waitFor(() => expect(screen.queryByText("Chưa lưu")).toBeNull());
    expect(pressedIn(name)).toEqual([label]);
  });

  it("chấm cả lớp: giữ mức cho cả lớp, nút đổi thành Thử lại", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Đánh dấu cả lớp: Hoàn thành" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Thử lại: cả lớp Hoàn thành" });
    expect(screen.getAllByText("Chưa lưu").length).toBeGreaterThan(1);
    expect(pressedIn("Nguyễn Minh Anh")).toEqual(["Hoàn thành"]);

    outbox.persistCommand.mockReset().mockResolvedValue(undefined);
    fireEvent.click(retry);
    await waitFor(() => expect(screen.queryByText("Chưa lưu")).toBeNull());
    expect(screen.getByRole("button", { name: "Đánh dấu cả lớp: Hoàn thành" })).toBeInTheDocument();
  });
});
