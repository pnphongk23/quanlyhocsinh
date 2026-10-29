import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Student } from "../../data/types";
import ImportStudentsDialog from "./ImportStudentsDialog";

const mocks = vi.hoisted(() => ({ online: true, create: vi.fn() }));
vi.mock("../../shared/hooks/useOnline", () => ({ useOnline: () => mocks.online }));
vi.mock("../../data/repositories/students", () => ({ createStudentWithId: mocks.create }));
vi.mock("../../shared/ui", async () => {
  const React = await import("react");
  return {
    Modal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) => <div role="dialog" aria-label={title}>{children}{footer}</div>,
    Button: ({ children, disabled, loading, onClick }: { children: React.ReactNode; disabled?: boolean; loading?: boolean; onClick?: () => void }) => <button disabled={disabled || loading} onClick={onClick}>{children}</button>,
  };
});

const existing = (count: number): Student[] => Array.from({ length: count }, (_, index) => ({ id: `s${index}`, classId: "class-1", name: `Học sinh ${index}`, parentPhone: "", enrolledAt: "2026-01-01", leftAt: null, status: "active" as const }));

describe("ImportStudentsDialog", () => {
  beforeEach(() => { mocks.online = true; mocks.create.mockReset(); mocks.create.mockResolvedValue({}); });

  it("locks adding while offline and explains that a connection is needed", () => {
    mocks.online = false;
    render(<ImportStudentsDialog classId="class-1" existing={[]} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Danh sách cần nhập"), { target: { value: "Lan\t0912 345 678" } });
    expect(screen.getByRole("button", { name: "Cần có mạng" })).toBeDisabled();
    expect(screen.getByText("Cần có mạng để thêm học sinh.")).toBeInTheDocument();
  });

  it("warns before adding to a class that already has twenty students", () => {
    render(<ImportStudentsDialog classId="class-1" existing={existing(20)} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Danh sách cần nhập"), { target: { value: "Lan\t0912 345 678" } });
    expect(screen.getByText(/Sau khi thêm, lớp có thể vượt mốc 20 học sinh/)).toBeInTheDocument();
  });

  it("reuses the row UUID when retrying after a request error", async () => {
    mocks.create.mockRejectedValueOnce(new Error("request failed"));
    const onClose = vi.fn();
    render(<ImportStudentsDialog classId="class-1" existing={[]} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Danh sách cần nhập"), { target: { value: "Lan\t0912 345 678" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm 1 học sinh" }));
    await waitFor(() => expect(screen.getAllByText("Không thêm được dòng này. Bạn có thể thử lại.")).toHaveLength(2));
    expect(screen.getByLabelText("Danh sách cần nhập")).toHaveValue("");
    expect(screen.getByLabelText("Danh sách cần nhập")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Thêm 1 học sinh" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(mocks.create.mock.calls[0][0]).toBe(mocks.create.mock.calls[1][0]);
    expect(mocks.create.mock.calls[0][1]).toMatchObject({ classId: "class-1", name: "Lan", parentPhone: "+84912345678", enrolledAt: expect.any(String) });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("stops at the first failed row and retries only the unfinished rows", async () => {
    mocks.create.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("request failed"));
    render(<ImportStudentsDialog classId="class-1" existing={[]} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Danh sách cần nhập"), { target: { value: "An\nBình\nChi" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm 3 học sinh" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(mocks.create.mock.calls[0][1]).toMatchObject({ name: "An" });
    expect(mocks.create.mock.calls[1][1]).toMatchObject({ name: "Bình" });
    expect(screen.getByText("Đã tạo 1/3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thêm 2 học sinh" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(4));
    expect(mocks.create.mock.calls[1][0]).toBe(mocks.create.mock.calls[2][0]);
    expect(mocks.create.mock.calls[3][1]).toMatchObject({ name: "Chi" });
  });
});
