import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import AddStudentModal from "../students/AddStudentModal";
import { ArchiveClassDialog } from "./ArchiveClassDialog";
import { EditClassModal } from "./EditClassModal";
import NewClassPage from "./NewClassPage";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const repo = vi.hoisted(() => ({
  createStudent: vi.fn(),
  updateClass: vi.fn(),
  archiveClass: vi.fn(),
  createClass: vi.fn(),
}));
vi.mock("../../data/repositories/students", async (original) => ({
  ...(await original<typeof import("../../data/repositories/students")>()),
  createStudent: repo.createStudent,
}));
vi.mock("../../data/repositories/classes", async (original) => ({
  ...(await original<typeof import("../../data/repositories/classes")>()),
  updateClass: repo.updateClass,
  archiveClass: repo.archiveClass,
  createClass: repo.createClass,
}));

const unsavedDialog = () =>
  document.querySelector<HTMLDialogElement>('dialog[aria-label="Chưa lưu thay đổi"]');

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("trạng thái nút lưu và đóng khi nhập dở", () => {
  beforeEach(() => {
    replaceStore(createSeed());
    repo.createStudent.mockReset();
    repo.updateClass.mockReset();
    repo.archiveClass.mockReset();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  });
  afterEach(() => {
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  });

  it("thêm học sinh: nút tắt khi chưa nhập, bấm hai lần chỉ gọi repository một lần", async () => {
    const gate = deferred();
    repo.createStudent.mockReturnValue(gate.promise);
    const onClose = vi.fn();
    render(<AddStudentModal classId="6a" onClose={onClose} />);
    const save = screen.getByRole("button", { name: "Lưu học sinh" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Họ và tên học sinh/), { target: { value: "Em Mới" } });
    expect(save).toBeEnabled();
    const form = document.getElementById(save.getAttribute("form") ?? "") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(repo.createStudent).toHaveBeenCalledTimes(1);
    expect(save).toBeDisabled();

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /Đã lưu/ })).toBeInTheDocument(), { timeout: 3000 });
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce(), { timeout: 3000 });
  });

  it("thêm học sinh: đóng khi đã nhập dở thì hỏi, bỏ thay đổi thì đóng", async () => {
    const onClose = vi.fn();
    render(<AddStudentModal classId="6a" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Họ và tên học sinh/), { target: { value: "Em Dở" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Đóng" })[0]);
    await waitFor(() => expect(unsavedDialog()?.hasAttribute("open")).toBe(true));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(repo.createStudent).not.toHaveBeenCalled();
  });

  it("thêm học sinh: chưa nhập gì thì đóng ngay, không hỏi", async () => {
    const onClose = vi.fn();
    render(<AddStudentModal classId="6a" onClose={onClose} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Đóng" })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(unsavedDialog()).toBeNull();
  });

  it("sửa lớp: nút tắt khi chưa sửa, sửa tên rồi bấm hai lần chỉ gọi updateClass một lần", async () => {
    const gate = deferred();
    repo.updateClass.mockReturnValue(gate.promise);
    const onClose = vi.fn();
    render(<EditClassModal classId="6a" onClose={onClose} onEditSchedule={() => {}} />);
    const save = screen.getByRole("button", { name: "Lưu thay đổi" });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Tên lớp/), { target: { value: "Lớp đổi tên" } });
    expect(save).toBeEnabled();
    const form = save.closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(repo.updateClass).toHaveBeenCalledTimes(1);

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    await screen.findByText("Đã lưu");
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("sửa lớp: chưa sửa gì thì Huỷ đóng ngay, không hỏi; sửa dở thì hỏi", async () => {
    const onClose = vi.fn();
    render(<EditClassModal classId="6a" onClose={onClose} onEditSchedule={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(unsavedDialog()?.hasAttribute("open") ?? false).toBe(false);

    onClose.mockClear();
    fireEvent.change(screen.getByLabelText(/Tên lớp/), { target: { value: "Lớp đang sửa" } });
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    await waitFor(() => expect(unsavedDialog()?.hasAttribute("open")).toBe(true));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sửa lớp: tên rỗng thì nút tắt", () => {
    render(<EditClassModal classId="6a" onClose={() => {}} onEditSchedule={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Tên lớp/), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
  });

  it("lưu trữ lớp: có hộp xác nhận đúng chữ, bấm hai lần chỉ gọi archiveClass một lần", async () => {
    const gate = deferred();
    repo.archiveClass.mockReturnValue(gate.promise);
    const onClose = vi.fn();
    render(<ArchiveClassDialog open classId="6a" className="Lớp 6A" onClose={onClose} />);
    expect(screen.getByText("Lưu trữ lớp Lớp 6A?")).toBeInTheDocument();
    expect(
      screen.getByText(/Lớp sẽ ẩn khỏi danh sách. Dữ liệu điểm danh, điểm, nhận xét vẫn được giữ./),
    ).toBeInTheDocument();
    expect(repo.archiveClass).not.toHaveBeenCalled();

    const confirm = screen.getByRole("button", { name: "Lưu trữ" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(repo.archiveClass).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();

    await act(async () => {
      gate.resolve();
      await gate.promise;
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("lưu trữ lớp: Huỷ thì không gọi archiveClass", () => {
    const onClose = vi.fn();
    render(<ArchiveClassDialog open classId="6a" className="Lớp 6A" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(repo.archiveClass).not.toHaveBeenCalled();
  });

  it("tạo lớp: nút hiện Đã lưu rồi mới điều hướng", async () => {
    repo.createClass.mockResolvedValue(undefined);
    const router = createMemoryRouter(
      [
        { path: "/lop/moi", element: <NewClassPage /> },
        { path: "/lop", element: <p>Danh sách lớp</p> },
      ],
      { initialEntries: ["/lop/moi"] },
    );
    render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByLabelText(/Tên lớp/), { target: { value: "Lớp mới" } });
    fireEvent.click(screen.getByRole("button", { name: "T2" }));
    fireEvent.submit(screen.getByRole("button", { name: "Tạo lớp" }).closest("form") as HTMLFormElement);
    await screen.findByText("Đã lưu");
    expect(router.state.location.pathname).toBe("/lop/moi");
    await waitFor(() => expect(router.state.location.pathname).toBe("/lop"));
    router.dispose();
  });
});
