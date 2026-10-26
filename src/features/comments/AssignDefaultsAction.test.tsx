import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssignDefaultsAction from "./AssignDefaultsAction";

const assign = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", () => ({ assignDefaultSlipsDurable: assign }));

beforeEach(() => assign.mockReset().mockResolvedValue(2));
afterEach(cleanup);

const view = () => render(<AssignDefaultsAction sessionId="s1" sessionLabel="Buổi 3" size="md" />);

describe("Gán tất cả mặc định", () => {
  it("chỉ ghi sau khi xác nhận", async () => {
    view();
    fireEvent.click(screen.getByTestId("slip-assign-defaults"));
    expect(assign).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Gán mặc định" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("s1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Quay lại thì không ghi", () => {
    view();
    fireEvent.click(screen.getByTestId("slip-assign-defaults"));
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(assign).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ghi lỗi thì giữ hộp và báo lỗi", async () => {
    assign.mockRejectedValueOnce(new Error("Ghi bền thất bại."));
    view();
    fireEvent.click(screen.getByTestId("slip-assign-defaults"));
    fireEvent.click(screen.getByRole("button", { name: "Gán mặc định" }));
    expect(await screen.findByText("Ghi bền thất bại.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
