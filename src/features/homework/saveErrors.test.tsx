import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { getSession } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import HomeworkDesktop from "./HomeworkDesktop";
import HomeworkPanel from "./HomeworkPanel";

const mocks = vi.hoisted(() => ({ saveHomeworkSectionDurable: vi.fn() }));

vi.mock("../../data/repositories/homework", async (original) => ({
  ...(await original<typeof import("../../data/repositories/homework")>()),
  saveHomeworkSectionDurable: mocks.saveHomeworkSectionDurable,
}));

describe("lưu phần BTVN khi repository ném lỗi", () => {
  beforeEach(() => {
    replaceStore(createSeed());
    mocks.saveHomeworkSectionDurable.mockReset();
    mocks.saveHomeworkSectionDurable.mockRejectedValue(new Error("Không ghi được dữ liệu."));
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

  it("mobile: báo lỗi, giữ sheet và giá trị đã nhập, nút lưu bật lại", async () => {
    const session = getSession("6a-session-8")!;
    render(
      <MemoryRouter>
        <HomeworkPanel session={session} initialView="today" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Thêm phần/ })[0]);
    fireEvent.change(await screen.findByLabelText("Tiêu đề"), { target: { value: "Bài tập kiểm tra" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phần" }));

    expect(await screen.findByText("Không ghi được dữ liệu.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Bài tập kiểm tra");
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu phần" })).toBeEnabled());
  });

  it("mobile: ghi thành công thì sheet đóng sau khi hiện Đã lưu", async () => {
    mocks.saveHomeworkSectionDurable.mockResolvedValue({});
    const session = getSession("6a-session-8")!;
    render(
      <MemoryRouter>
        <HomeworkPanel session={session} initialView="today" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Thêm phần/ })[0]);
    fireEvent.change(await screen.findByLabelText("Tiêu đề"), { target: { value: "Bài tập kiểm tra" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phần" }));
    await waitFor(() => expect(mocks.saveHomeworkSectionDurable).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByLabelText("Tiêu đề")).toBeNull(), { timeout: 3000 });
  });

  it("desktop: báo lỗi, giữ editor và giá trị đã nhập", async () => {
    const session = getSession("6a-session-8")!;
    render(
      <MemoryRouter>
        <HomeworkDesktop session={session} tabBar={(actions) => <div>{actions}</div>} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Bài tập hôm nay" }));
    fireEvent.click((await screen.findAllByRole("button", { name: /^\+ / }))[0]);
    fireEvent.change(await screen.findByLabelText("Tiêu đề"), { target: { value: "Bài tập kiểm tra" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phần" }));

    expect(await screen.findByText("Không ghi được dữ liệu.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Bài tập kiểm tra");
  });
});
