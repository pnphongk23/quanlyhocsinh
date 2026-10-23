import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../data/api/client";
import { replaceStore } from "../../data/store";
import { getExtraSessionUpdateError } from "../../data/repositories/sessions";
import { createSeed } from "../../test/fixtures/seed";
import AddSessionModal from "./AddSessionModal";

const fakeServer = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../data/sync", () => ({ api: fakeServer }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AddSessionModal sửa buổi lẻ", () => {
  let onClose: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    const state = createSeed();
    replaceStore(state);
    onClose = vi.fn<() => void>();
    fakeServer.request.mockReset();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value(this: HTMLDialogElement) { this.removeAttribute("open"); },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
    delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
  });

  function renderEditModal() {
    const session = createSeed().sessions.find((item) => item.id === "6a-extra-session");
    if (!session) throw new Error("Missing extra-session fixture");
    return render(
      <AddSessionModal
        classId="6a"
        classTime="18:00"
        session={session}
        onClose={onClose}
      />,
    );
  }

  function submitForm() {
    const form = screen.getByRole("dialog").querySelector("form");
    if (!form) throw new Error("Missing edit form");
    fireEvent.change(screen.getByLabelText(/Ghi chú/), { target: { value: "Ghi chú mới" } });
    fireEvent.submit(form);
  }

  it("giữ modal mở và trạng thái đang lưu đến khi máy chủ xác nhận", async () => {
    const response = deferred<unknown>();
    fakeServer.request.mockReturnValue(response.promise);
    renderEditModal();

    submitForm();

    const saveButton = await screen.findByRole("button", { name: "Lưu thay đổi" });
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(saveButton).toHaveAttribute("aria-busy", "true");
    fireEvent.click(screen.getAllByRole("button", { name: "Đóng" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      response.resolve({ date: "2026-10-26", start_time: "18:30", note: "Buổi học bù", version: 2 });
      await response.promise;
    });

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(fakeServer.request).toHaveBeenCalledWith(
      "PATCH /sessions/6a-extra-session",
      expect.objectContaining({ body: expect.objectContaining({ date: "2026-10-25", start_time: "17:00" }) }),
    );
  });

  it.each([
    "Đã có buổi học vào thời gian này.",
    "Không thể chuyển buổi về ngày trong quá khứ.",
    "Chỉ sửa được buổi lẻ đang chờ học.",
  ])("hiện nguyên văn lỗi máy chủ: %s", async (message) => {
    fakeServer.request.mockRejectedValue(
      new ApiError(409, { code: "session_conflict", message, request_id: "test-request" }),
    );
    renderEditModal();

    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(getExtraSessionUpdateError()).toBe(message);
  });

  it("hiện nguyên văn lỗi khi thiết bị đang ngoại tuyến", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    renderEditModal();

    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent("Sửa buổi học cần kết nối mạng.");
    expect(fakeServer.request).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
