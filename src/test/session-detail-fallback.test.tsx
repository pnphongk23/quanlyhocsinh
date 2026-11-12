import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SessionDetailFallback } from "../features/class-space/SessionDetailPage";

describe("SessionDetailFallback", () => {
  it("keeps a titled loading state while the initial sync is pending", () => {
    render(<MemoryRouter><SessionDetailFallback pending backTo="/lop/6a/buoi-hoc" /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải buổi học");
    expect(screen.queryByText("Không tìm thấy buổi học")).not.toBeInTheDocument();
  });

  it("shows not found after the initial sync completes without the session", () => {
    render(<MemoryRouter><SessionDetailFallback pending={false} backTo="/lop/6a/buoi-hoc" /></MemoryRouter>);
    expect(screen.getByText("Không tìm thấy buổi học")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về danh sách buổi" })).toHaveAttribute("href", "/lop/6a/buoi-hoc");
  });
});
