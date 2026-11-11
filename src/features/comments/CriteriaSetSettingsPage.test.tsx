import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CriteriaSet, CriteriaSetItem } from "../../data/api/types";
import CriteriaSetSettingsPage from "./CriteriaSetSettingsPage";

const mocks = vi.hoisted(() => ({ admin: true, online: true, layout: "mobile" as "mobile" | "tablet" | "desktop", get: vi.fn(), cached: vi.fn(), replace: vi.fn() }));
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
vi.mock("../../shared/layout/useLayout", () => ({ useLayout: () => mocks.layout }));

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

function setLayoutMedia() {
  const width = mocks.layout === "desktop" ? 1440 : mocks.layout === "tablet" ? 834 : 390;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("1024px") ? width >= 1024 : query.includes("640px") ? width >= 640 : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
  mocks.admin = true; mocks.online = true;
  mocks.layout = "mobile";
  mocks.cached.mockResolvedValue(null);
  mocks.get.mockResolvedValue(result(1));
  mocks.replace.mockReset();
  setLayoutMedia();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

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
    const source = [
      ["Độ tập trung", "Con tập trung, chú ý nghe giảng.", "Con thỉnh thoảng còn mất tập trung, còn phải nhắc nhở.", "Con hay nói chuyện riêng trong giờ, cô phải nhắc nhiều. Cần chú ý hơn.", "good", false],
      ["Sự tích cực tham gia bài học", "Con tập trung, sôi nổi, hăng hái phát biểu.", "Con có tham gia hoạt động khi được yêu cầu, chưa mạnh dạn chủ động.", "Con hơi trầm, còn rụt rè, cần mạnh dạn sôi nổi hơn.", "good", false],
      ["Ghi chép bài", "Con ghi chép bài đầy đủ, cẩn thận.", "Con ghi chép bài nhưng còn ẩu, cần cẩn thận hơn.", "Con chưa chủ động ghi chép bài, cô phải nhắc nhở.", "ok", false],
      ["Phản xạ nói Tiếng Anh", "Con phản xạ nhanh, tự tin nói câu hoàn chỉnh, phát âm rõ.", "Con trả lời được khi cô gợi ý, cần tự tin hơn.", "Con còn ngại nói, cần luyện tập các câu đã học ở nhà.", "good", false],
      ["Nhớ từ và cấu trúc câu", "Con nhớ tốt từ vựng và cấu trúc câu, vận dụng đúng khi trả lời.", "Con nhớ từ vựng và cấu trúc câu nhưng chưa chắc chắn, đôi khi còn nhầm.", "Con chưa nhớ từ và câu của bài. Cần ôn tập nghiêm túc.", "good", false],
      ["Làm bài tập về nhà", "Con làm bài tập đầy đủ, cẩn thận.", "Con có làm bài tập nhưng chưa đầy đủ.", "Con chưa làm bài về nhà, bố mẹ nhắc con làm bài trước buổi học sau.", "good", true],
    ] as const;
    const criteria: CriteriaSet = {
      version: 1,
      criteria: source.map(([name, good, ok, needsWork, default_level, homework], index) => ({
        id: `criterion-${index + 1}`,
        name,
        texts: { good, ok, needs_work: needsWork },
        default_level,
        homework,
      })),
    };
    mocks.get.mockResolvedValue(criteria);
    renderPage();
    await screen.findByText("Độ tập trung");
    const list = screen.getByRole("region", { name: "Danh sách tiêu chí" });
    expect(within(list).queryByRole("heading", { name: "Tiêu chí" })).not.toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Thêm tiêu chí" })).toBeInTheDocument();
    const homeworkRow = within(list).getByRole("button", { name: "Sửa tiêu chí Làm bài tập về nhà" });
    expect(within(homeworkRow).getByText("Theo chấm BTVN")).toBeInTheDocument();
    expect(homeworkRow).toHaveTextContent("Mặc định: Tốt");
    const firstRow = within(list).getByRole("button", { name: "Sửa tiêu chí Độ tập trung" });
    expect(within(firstRow).queryByText("Theo chấm BTVN")).not.toBeInTheDocument();
    expect(within(list).getAllByText("Theo chấm BTVN")).toHaveLength(1);
    fireEvent.click(firstRow);
    expect(await screen.findByLabelText("Tên tiêu chí")).toHaveValue("Độ tập trung");
    for (const label of ["Câu mức Tốt", "Câu mức Đạt", "Câu mức Cần cố gắng"]) {
      const textarea = screen.getByLabelText(label);
      expect(textarea.previousElementSibling).toHaveTextContent(label);
      expect(textarea.previousElementSibling?.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Câu mức Tốt")).toHaveValue(source[0][1]);
    expect(screen.getByRole("button", { name: "Đóng chi tiết" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xoá tiêu chí" })).toBeEnabled();
  });

  it.each([["mobile", "mobilePanel"], ["tablet", "tabletPanel"]] as const)("places the editor sheet at %s viewport", async (layout, placement) => {
    mocks.layout = layout;
    setLayoutMedia();
    renderPage();
    await screen.findByText("Tiêu chí 1");
    fireEvent.click(screen.getByRole("button", { name: "Sửa tiêu chí Tiêu chí 1" }));
    expect((await screen.findByRole("dialog", { name: "Sửa tiêu chí" })).className).toContain(placement);
  });

  it("renders the last-row action menu outside the scrolling table and closes it with Escape", async () => {
    mocks.layout = "desktop";
    setLayoutMedia();
    renderPage();
    await screen.findByText("Tiêu chí 1");
    const trigger = screen.getByRole("button", { name: "Thao tác cho Tiêu chí 1" });
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu", { name: "Thao tác cho Tiêu chí 1" });
    expect(menu.closest('[class*="tableWrap"]')).toBeNull();
    expect(menu.parentElement).toBe(document.body);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Thao tác cho Tiêu chí 1" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
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
    expect(screen.getByRole("dialog", { name: "Xoá tiêu chí này?" })).toBeInTheDocument();
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
