import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useLeaveGuard } from "./useLeaveGuard";

function Screen({ dirty }: { dirty: boolean }) {
  const guard = useLeaveGuard(dirty);
  return (
    <div>
      <Link to="/khac">đi</Link>
      <Link to="/a?x=1">cùng trang</Link>
      {guard.blocked && (<><p>bị chặn</p><button onClick={guard.stay}>ở lại</button><button onClick={guard.proceed}>đi tiếp</button></>)}
    </div>
  );
}
const mount = (dirty: boolean) => {
  const router = createMemoryRouter(
    [{ path: "/a", element: <Screen dirty={dirty} /> }, { path: "/khac", element: <p>trang khác</p> }],
    { initialEntries: ["/a"] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe("useLeaveGuard", () => {
  it("dirty: chặn đổi đường dẫn; ở lại giữ trang, đi tiếp thì rời", async () => {
    const router = mount(true);
    fireEvent.click(screen.getByText("đi"));
    expect(await screen.findByText("bị chặn")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/a");
    fireEvent.click(screen.getByText("ở lại"));
    expect(screen.queryByText("bị chặn")).toBeNull();
    fireEvent.click(screen.getByText("đi"));
    fireEvent.click(await screen.findByText("đi tiếp"));
    expect(await screen.findByText("trang khác")).toBeInTheDocument();
  });

  it("sạch: cho qua, không hỏi", async () => {
    mount(false);
    fireEvent.click(screen.getByText("đi"));
    expect(await screen.findByText("trang khác")).toBeInTheDocument();
  });

  it("dirty: đổi query cùng đường dẫn không hỏi", async () => {
    const router = mount(true);
    await act(async () => { fireEvent.click(screen.getByText("cùng trang")); });
    expect(screen.queryByText("bị chặn")).toBeNull();
    expect(router.state.location.search).toBe("?x=1");
  });

  it("beforeunload chỉ chặn khi dirty", () => {
    mount(true);
    const dirtyEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirtyEvent);
    expect(dirtyEvent.defaultPrevented).toBe(true);
  });

  it("beforeunload không chặn khi sạch", () => {
    mount(false);
    const cleanEvent = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanEvent);
    expect(cleanEvent.defaultPrevented).toBe(false);
  });
});
