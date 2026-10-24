import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { setRejectedCommands } from "../../data/saveStatus";
import { RejectedBanner } from "./RejectedBanner";

afterEach(() => act(() => setRejectedCommands([])));

describe("RejectedBanner", () => {
  it("ẩn khi không có lệnh bị từ chối", () => {
    const { container } = render(<RejectedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("nêu lý do theo loại lệnh và cho thử lại, bỏ thay đổi", () => {
    render(<RejectedBanner />);
    act(() => setRejectedCommands([{ id: "a", type: "attendance.set", error: "session_cancelled" }]));
    expect(screen.getByRole("alert").textContent).toContain("Điểm danh chưa lưu được");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bỏ thay đổi" })).toBeTruthy();
  });

  it("không cho bỏ khi có lệnh không phải ghi một ô", () => {
    render(<RejectedBanner />);
    act(() => setRejectedCommands([{ id: "a", type: "test.create", error: "forbidden" }]));
    expect(screen.queryByRole("button", { name: "Bỏ thay đổi" })).toBeNull();
  });
});
