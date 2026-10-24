import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import HomeworkDesktop from "./HomeworkDesktop";

const outbox = vi.hoisted(() => ({ persistCommand: vi.fn() }));
vi.mock("../../data/outbox", async (original) => ({
  ...(await original<typeof import("../../data/outbox")>()),
  persistCommand: outbox.persistCommand,
}));

const FAIL = "Không lưu được vào bộ nhớ trên thiết bị.";
const pressed = () =>
  screen
    .getAllByRole("button", { name: /Hoàn thành tốt|Hoàn thành|Chưa hoàn thành/ })
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.textContent);

beforeEach(() => {
  replaceStore(createSeed());
  outbox.persistCommand.mockReset().mockRejectedValue(new Error(FAIL));
});

describe("chấm BTVN khi ghi bền lỗi (repository thật)", () => {
  it("desktop: các mức đã chọn còn nguyên, nút Lưu bật để thử lại", async () => {
    render(
      <MemoryRouter>
        <HomeworkDesktop session={getSession("6a-session-8")!} tabBar={(a) => <div>{a}</div>} />
      </MemoryRouter>,
    );
    const buttons = () => screen.getAllByRole("button", { name: "Hoàn thành tốt" }).filter((b) => b.hasAttribute("aria-pressed"));
    fireEvent.click(buttons()[0]);
    fireEvent.click(buttons()[1]);
    const before = pressed();
    expect(before.length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "Lưu kết quả chấm" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu kết quả chấm" })).toBeEnabled());
    expect(pressed()).toEqual(before);
  });

  it("desktop: em thứ nhất ghi được, em thứ hai lỗi ⇒ cả hai mức vẫn hiển thị và Lưu bật lại", async () => {
    outbox.persistCommand.mockReset().mockResolvedValueOnce(undefined).mockRejectedValue(new Error(FAIL));
    render(
      <MemoryRouter>
        <HomeworkDesktop session={getSession("6a-session-8")!} tabBar={(a) => <div>{a}</div>} />
      </MemoryRouter>,
    );
    const buttons = () => screen.getAllByRole("button", { name: "Hoàn thành tốt" }).filter((b) => b.hasAttribute("aria-pressed"));
    fireEvent.click(buttons()[0]);
    fireEvent.click(buttons()[1]);
    const before = pressed();
    fireEvent.click(screen.getByRole("button", { name: "Lưu kết quả chấm" }));
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu kết quả chấm" })).toBeEnabled());
    expect(pressed()).toEqual(before);
  });
});
