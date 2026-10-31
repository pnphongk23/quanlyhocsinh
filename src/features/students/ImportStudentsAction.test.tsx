import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImportStudentsAction from "./ImportStudentsAction";

const access = vi.hoisted(() => ({ assigned: true }));
vi.mock("../../data/repositories/access", () => ({ canAccessClass: () => access.assigned }));

describe("ImportStudentsAction", () => {
  beforeEach(() => { access.assigned = true; });

  it("hides the entry point without student write permission", () => {
    render(<ImportStudentsAction classId="class-1" canWrite={false} onClick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Nhập danh sách" })).not.toBeInTheDocument();
  });

  it("hides the entry point when the class is not assigned", () => {
    access.assigned = false;
    render(<ImportStudentsAction classId="class-1" canWrite onClick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Nhập danh sách" })).not.toBeInTheDocument();
  });

  it("opens the import dialog when permission and class access are present", () => {
    const onClick = vi.fn();
    render(<ImportStudentsAction classId="class-1" canWrite onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Nhập danh sách" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
