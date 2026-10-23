import { act, fireEvent, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { getClass } from "../../data/repositories/classes";
import ClassDesktopHeader from "./ClassDesktopHeader";

const mocks = vi.hoisted(() => ({ archiveClass: vi.fn() }));
vi.mock("../../data/repositories/classes", async (original) => ({
  ...(await original<typeof import("../../data/repositories/classes")>()),
  archiveClass: mocks.archiveClass,
}));

function renderHeader() {
  const router = createMemoryRouter(
    [
      {
        path: "/lop/:classId/*",
        element: <ClassDesktopHeader classId="6a" klass={getClass("6a")!} />,
      },
    ],
    { initialEntries: ["/lop/6a/buoi-hoc"] },
  );
  render(<RouterProvider router={router} />);
}

function openArchiveDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));
  fireEvent.click(screen.getByRole("menuitem", { name: /Lưu trữ lớp/ }));
}

beforeEach(() => {
  replaceStore(createSeed());
  mocks.archiveClass.mockReset();
});

describe("Lưu trữ lớp ở đầu màn desktop", () => {
  it("hỏi xác nhận trước khi lưu trữ, Huỷ thì không gọi", () => {
    renderHeader();
    openArchiveDialog();
    expect(
      screen.getByRole("dialog", { name: "Lưu trữ lớp Tiếng Anh giao tiếp 6A?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Lớp sẽ ẩn khỏi danh sách. Dữ liệu điểm danh, điểm, nhận xét vẫn được giữ.",
      ),
    ).toBeInTheDocument();
    expect(mocks.archiveClass).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Huỷ" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.archiveClass).not.toHaveBeenCalled();
  });

  it("bấm Lưu trữ hai lần khi đang chờ mạng chỉ gọi một lần", async () => {
    let finish: () => void = () => {};
    mocks.archiveClass.mockImplementation(
      () => new Promise<void>((done) => (finish = done)),
    );
    renderHeader();
    openArchiveDialog();
    const confirm = screen.getByRole("button", { name: "Lưu trữ" });
    fireEvent.click(confirm);
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(mocks.archiveClass).toHaveBeenCalledTimes(1);
    expect(mocks.archiveClass).toHaveBeenCalledWith("6a");
    await act(async () => finish());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lỗi mạng: giữ hộp mở và hiện lỗi trong hộp", async () => {
    mocks.archiveClass.mockRejectedValue(new Error("Lưu trữ lớp cần kết nối mạng."));
    renderHeader();
    openArchiveDialog();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lưu trữ" }));
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Lưu trữ lớp cần kết nối mạng.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
