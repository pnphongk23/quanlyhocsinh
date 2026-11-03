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
    act(() => setRejectedCommands([{ id: "a", type: "attendance.set", error: "attendance_incomplete" }]));
    expect(screen.getByRole("alert").textContent).toContain("Điểm danh chưa lưu được");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bỏ thay đổi" })).toBeTruthy();
  });

  it("hiện thông báo đồng bộ điểm danh cho phiếu bị máy chủ từ chối", () => {
    render(<RejectedBanner />);
    act(() => setRejectedCommands([{ id: "slip", type: "slip.set", error: "attendance_incomplete" }]));
    expect(screen.getByRole("alert").textContent).toContain("Điểm danh chưa đồng bộ xong, thử lại sau.");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
  });

  it("mã từ chối cuối chỉ hiện lỗi, không cho thử lại hay bỏ", () => {
    render(<RejectedBanner />);
    act(() => setRejectedCommands([
      { id: "lesson", type: "session.lesson.set", error: "feature_disabled" },
      { id: "slip", type: "slip.set", error: "invalid_levels" },
    ]));
    expect(screen.getByRole("alert").textContent).toContain("chưa lưu được");
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bỏ thay đổi" })).toBeNull();
  });

  it("trộn lỗi thường và lỗi cuối: chỉ thử lại lệnh thường", () => {
    render(<RejectedBanner />);
    act(() => setRejectedCommands([
      { id: "lesson", type: "session.lesson.set", error: "session_cancelled" },
      { id: "slip", type: "slip.set", error: "attendance_incomplete" },
    ]));
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bỏ thay đổi" })).toBeNull();
  });

  it("không cho bỏ khi có lệnh không phải ghi một ô", () => {
    render(<RejectedBanner />);
    act(() => setRejectedCommands([{ id: "a", type: "test.create", error: "forbidden" }]));
    expect(screen.queryByRole("button", { name: "Bỏ thay đổi" })).toBeNull();
  });
});
