import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../../test/fixtures/seed";
import { getStore, replaceStore } from "../../data/store";
import { getClass } from "../../data/repositories/classes";
import ClassDesktopHeader from "./ClassDesktopHeader";

const mocks = vi.hoisted(() => ({ updateClass: vi.fn() }));
vi.mock("../../data/repositories/classes", async (original) => ({
  ...(await original<typeof import("../../data/repositories/classes")>()),
  updateClass: mocks.updateClass,
}));

function Harness() {
  // Cha đọc tên lớp từ store như màn thật: tên đổi thì cha render lại.
  const klass = getClass("6a")!;
  return <ClassDesktopHeader classId="6a" klass={klass} />;
}

beforeEach(() => {
  replaceStore(createSeed());
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) { this.removeAttribute("open"); },
  });
});

describe("Sửa lớp từ đầu màn desktop", () => {
  it("nút hiện Đã lưu sau khi tên lớp trong store đổi, rồi mới đóng", async () => {
    mocks.updateClass.mockImplementation(async (id: string, patch: { name: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const store = getStore();
      replaceStore({
        ...store,
        classes: store.classes.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      });
    });
    const router = createMemoryRouter(
      [{ path: "/lop/:classId/*", element: <Harness /> }],
      { initialEntries: ["/lop/6a/buoi-hoc"] },
    );
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("button", { name: "Thêm tùy chọn" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Sửa lớp/ }));
    fireEvent.change(screen.getByLabelText(/Tên lớp/), { target: { value: "Lớp đổi tên" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(mocks.updateClass).toHaveBeenCalled());
    const seen = await screen.findByRole("button", { name: /Đã lưu/ }, { timeout: 2500 });
    expect(seen).toBeInTheDocument();
  });
});
