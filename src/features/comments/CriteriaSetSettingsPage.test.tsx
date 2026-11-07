import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CriteriaSet, CriteriaSetItem } from "../../data/api/types";
import CriteriaSetSettingsPage from "./CriteriaSetSettingsPage";

const mocks = vi.hoisted(() => ({ admin: true, online: true, get: vi.fn(), cached: vi.fn(), replace: vi.fn() }));
vi.mock("../../data/repositories/access", () => ({ isAdmin: () => mocks.admin }));
vi.mock("../../data/repositories/criteriaSet", () => ({
  getCriteriaSet: mocks.get,
  getCachedCriteriaSet: mocks.cached,
  replaceCriteriaSet: mocks.replace,
  criteriaSetError: (error: unknown) => {
    const item = error as { status?: number; error?: { details?: { reason?: string; index?: number; field?: string } } };
    const reason = item.error?.details?.reason;
    return { message: reason === "version_conflict" ? "Bộ tiêu chí đã được người khác thay đổi. Hãy tải lại để tiếp tục." : "Tên tiêu chí không được trùng nhau.", reason, index: item.error?.details?.index, field: item.error?.details?.field };
  },
}));
vi.mock("../../shared/hooks/useOnline", () => ({ useOnline: () => mocks.online }));
vi.mock("../../shared/hooks/useIsDesktop", () => ({ useIsDesktop: () => false }));

const item = (index: number): CriteriaSetItem => ({
  id: `criterion-${index}`, name: `Tiêu chí ${index}`, texts: { good: "Câu tốt.", ok: "Câu đạt.", needs_work: "Câu cần cố gắng." }, default_level: "good", homework: false,
});
const result = (count: number): CriteriaSet => ({ version: 1, criteria: Array.from({ length: count }, (_, index) => item(index + 1)) });

function renderPage() {
  return render(<MemoryRouter initialEntries={["/cai-dat/bo-tieu-chi"]}><Routes>
    <Route path="/cai-dat" element={<p>Tài khoản cài đặt</p>} />
    <Route path="/cai-dat/bo-tieu-chi" element={<CriteriaSetSettingsPage />} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
  mocks.admin = true; mocks.online = true;
  mocks.cached.mockResolvedValue(null);
  mocks.get.mockResolvedValue(result(1));
  mocks.replace.mockReset();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => vi.unstubAllEnvs());

describe("custom criteria settings", () => {
  it("redirects non-admin users away from the route", async () => {
    mocks.admin = false;
    renderPage();
    expect(await screen.findByText("Tài khoản cài đặt")).toBeInTheDocument();
    expect(screen.queryByText("Bộ tiêu chí nhận xét")).not.toBeInTheDocument();
  });

  it("renders sets of one and eight criteria", async () => {
    const view = renderPage();
    expect(await screen.findByText(/Tiêu chí 1/)).toBeInTheDocument();
    view.unmount();
    mocks.get.mockResolvedValueOnce(result(8));
    renderPage();
    expect(await screen.findByText(/Tiêu chí 8/)).toBeInTheDocument();
  });

  it("shows compact default level details and opens edit from the criterion row", async () => {
    mocks.get.mockResolvedValue(result(2));
    renderPage();
    const name = await screen.findByText("Tiêu chí 1");
    expect(name).toBeInTheDocument();
    expect(screen.getByText("Áp dụng cho mọi lớp trong workspace")).toBeInTheDocument();
    const list = screen.getByRole("region", { name: "Danh sách tiêu chí" });
    expect(within(list).getAllByText("Tốt")).toHaveLength(2);
    const row = name.closest("li");
    expect(row).not.toBeNull();
    expect(within(row!).getByRole("button", { name: "Chuyển lên: Tiêu chí 1" })).toBeDisabled();
    expect(within(row!).getByRole("button", { name: "Chuyển xuống: Tiêu chí 1" })).toBeEnabled();
    expect(within(row!).queryByRole("button", { name: "Xoá" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sửa tiêu chí Tiêu chí 1" }));
    expect(await screen.findByLabelText("Tên tiêu chí")).toHaveValue("Tiêu chí 1");
    expect(screen.getByRole("button", { name: "Xoá tiêu chí" })).toBeEnabled();
  });

  it("keeps deletion confirmation in the edit flow and prevents deleting the final item", async () => {
    renderPage();
    await screen.findByText("Tiêu chí 1");
    fireEvent.click(screen.getByRole("button", { name: "Sửa tiêu chí Tiêu chí 1" }));
    const deleteButton = await screen.findByRole("button", { name: "Xoá tiêu chí" });
    expect(deleteButton).toBeDisabled();
  });

  it("asks for confirmation before deleting from the editor", async () => {
    mocks.get.mockResolvedValue(result(2));
    renderPage();
    await screen.findByText("Tiêu chí 1");
    fireEvent.click(screen.getByRole("button", { name: "Sửa tiêu chí Tiêu chí 1" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xoá tiêu chí" }));
    expect(await screen.findByText("Phiếu đã gửi không đổi.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Xoá tiêu chí" })).toBeInTheDocument();
  });

  it("keeps editor content open on a 409 until the user chooses reload", async () => {
    mocks.replace.mockRejectedValue({ status: 409, error: { details: { reason: "version_conflict" } } });
    renderPage();
    await screen.findByText(/Tiêu chí 1/);
    fireEvent.click(screen.getByRole("button", { name: "Thêm tiêu chí" }));
    fireEvent.change(screen.getByLabelText("Tên tiêu chí"), { target: { value: "Mục mới" } });
    fireEvent.change(screen.getByLabelText("Câu mức Tốt"), { target: { value: "Nhận xét tốt" } });
    fireEvent.change(screen.getByLabelText("Câu mức Đạt"), { target: { value: "Nhận xét đạt" } });
    fireEvent.change(screen.getByLabelText("Câu mức Cần cố gắng"), { target: { value: "Nhận xét cần cố gắng" } });
    fireEvent.click(screen.getAllByRole("button", { name: /^Thêm tiêu chí$/ })[1]!);
    expect(await screen.findByText(/đã được người khác thay đổi/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Tên tiêu chí")).toHaveValue("Mục mới");
    const callsBeforeReload = mocks.get.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
    await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThan(callsBeforeReload));
  });

  it("locks editing while offline and shows the cached set", async () => {
    mocks.online = false;
    mocks.cached.mockResolvedValue(result(1));
    renderPage();
    expect(await screen.findByText(/Tiêu chí 1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thêm tiêu chí" })).toBeDisabled();
    expect(screen.getByText(/Chỉnh sửa cần kết nối mạng/)).toBeInTheDocument();
  });
});
