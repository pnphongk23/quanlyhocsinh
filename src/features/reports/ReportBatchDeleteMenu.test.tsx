import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { ReportBatchDeleteMenu } from "./ReportBatchDeleteMenu";

const state = vi.hoisted(() => ({ online: true, deleteBatch: vi.fn() }));
vi.mock("../../shared/hooks/useOnline", () => ({ useOnline: () => state.online }));
vi.mock("../../data/repositories/reports", () => ({ deleteReportBatch: state.deleteBatch }));

const batch = { id: "b1", classId: "c1", fromSessionId: "s1", toSessionId: "s2", fromKey: "2026-10-01 09:00", toKey: "2026-10-08 09:00" };

function renderMenu(hasPublished = false, path = "/lop/c1/bao-cao?dot=b1") {
  function Location() {
    const location = useLocation();
    return <output data-testid="location">{location.pathname + location.search}</output>;
  }
  const router = createMemoryRouter([{
    path: "/lop/:classId/bao-cao",
    element: <><ReportBatchDeleteMenu batch={batch} hasPublished={hasPublished} /><Location /></>,
  }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

async function openConfirmation() {
  fireEvent.click(screen.getByRole("button", { name: "Thêm tùy chọn báo cáo" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Xoá báo cáo" }));
  return screen.findByRole("dialog", { name: "Xoá báo cáo?" });
}

afterEach(() => { state.online = true; state.deleteBatch.mockReset(); });

describe("ReportBatchDeleteMenu", () => {
  it("shows different confirmation copy for a draft and a published batch", async () => {
    const { unmount } = renderMenu(false);
    const draftDialog = await openConfirmation();
    expect(draftDialog).toHaveTextContent("Bản nháp của tất cả học sinh trong đợt này sẽ bị ẩn.");
    expect(draftDialog).not.toHaveTextContent("Phụ huynh sẽ không còn thấy");
    unmount();

    renderMenu(true);
    const publishedDialog = await openConfirmation();
    expect(publishedDialog).toHaveTextContent("Phụ huynh sẽ không còn thấy báo cáo đã phát hành trong đợt này.");
  });

  it("locks deletion offline and explains why", () => {
    state.online = false;
    renderMenu();
    expect(screen.getByText("Cần mạng để xoá")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thêm tùy chọn báo cáo" }));
    expect(screen.getByRole("menuitem", { name: "Xoá báo cáo" })).toBeDisabled();
  });

  it("deletes the batch and returns from its detail URL to the list", async () => {
    state.deleteBatch.mockResolvedValue(undefined);
    renderMenu(true);
    const dialog = await openConfirmation();
    fireEvent.click(screen.getByRole("button", { name: "Xoá báo cáo" }));
    await waitFor(() => expect(state.deleteBatch).toHaveBeenCalledWith("b1"));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/lop/c1/bao-cao"));
    expect(dialog).not.toBeInTheDocument();
  });
});
