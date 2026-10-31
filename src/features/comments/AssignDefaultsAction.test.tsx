import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AssignDefaultsAction from "./AssignDefaultsAction";
import { draftKey, readDraft, writeDraft } from "./draftStore";

const assign = vi.hoisted(() => vi.fn());
const count = vi.hoisted(() => vi.fn());
vi.mock("../../data/repositories/comments", () => ({ assignDefaultSlipsDurable: assign, countAssignDefaultSlips: count }));

beforeEach(() => {
  assign.mockReset().mockResolvedValue(2);
  count.mockReset().mockReturnValue(2);
});
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

  it("xong thì bỏ nháp của buổi để phiếu đang mở nạp lại", async () => {
    writeDraft("s1", "a", { criteria: 3, comment: "x", note: "" });
    writeDraft("s2", "a", { criteria: 3, comment: "x", note: "" });
    view();
    fireEvent.click(screen.getByTestId("slip-assign-defaults"));
    fireEvent.click(screen.getByRole("button", { name: "Gán mặc định" }));
    await waitFor(() => expect(readDraft("s1", "a")).toBeNull());
    expect(readDraft("s2", "a")).not.toBeNull();
    expect(sessionStorage.getItem(draftKey("s1", "a"))).toBeNull();
  });

  it("hộp xác nhận ghi đúng số phiếu sẽ gán; không có phiếu nào thì không cho gán", () => {
    count.mockReturnValueOnce(5);
    view();
    fireEvent.click(screen.getByTestId("slip-assign-defaults"));
    expect(screen.getByTestId("slip-assign-count")).toHaveTextContent("5 phiếu");
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    count.mockReturnValueOnce(0);
    fireEvent.click(screen.getByTestId("slip-assign-defaults"));
    expect(screen.getByRole("button", { name: "Gán mặc định" })).toBeDisabled();
  });
});
