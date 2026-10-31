import { render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../data/store";
import { createSeed } from "./fixtures/seed";
import { globalCss, mediaBlocks, readCss } from "./cssMedia";

vi.mock("../data/auth/session", () => ({
  getSession: () => ({
    token: "fixture-token",
    user: { id: "fixture-user", phone: "fixture-user", display_name: "Cô Lan", must_change_password: false },
    activeMembershipId: "fixture-membership",
    me: {
      user: { id: "fixture-user", phone: "fixture-user", display_name: "Cô Lan", must_change_password: false },
      active_membership_id: "fixture-membership",
      memberships: [{
        id: "fixture-membership",
        workspace: { id: "fixture-workspace", name: "Lớp của Cô Lan" },
        role: { id: "role-teacher", name: "Giáo viên", system_key: null, scope_kind: "workspace" },
        status: "active",
        scope_epoch: 1,
        permissions: {},
      }],
    },
  }),
}));

const { Component: StaffShell } = await import("../roles/staff/StaffShell");

function open(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <StaffShell /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const staffRoot = () => document.querySelector<HTMLElement>('[data-role="staff"]')!;
const mobileTabbar = () => screen.getByRole("navigation", { name: "Điều hướng chính" });

beforeEach(() => {
  replaceStore(createSeed());
  document.documentElement.removeAttribute("data-staff-detail");
});

describe("staff shell hides the bottom navigation on class child screens", () => {
  it.each([
    ["/lop/6a/buoi-hoc", "tab Buổi học của lớp"],
    ["/lop/6a/buoi-hoc/6a-session-0", "chi tiết buổi"],
    ["/lop/6a/bai-kiem-tra/moi", "tạo bài kiểm tra"],
    ["/lop/6a/bai-kiem-tra/6a-test-0", "chi tiết bài kiểm tra"],
  ])("%s (%s) đánh dấu khung chi tiết", (path) => {
    const router = open(path);
    expect(document.documentElement).toHaveAttribute("data-staff-detail");
    expect(staffRoot().className).toMatch(/staffDetail/);
    // Thanh tab vẫn nằm trong DOM; CSS ẩn nó trên mobile khi có dấu hiệu chi tiết.
    expect(mobileTabbar()).toBeInTheDocument();
    router.dispose();
  });

  it.each(["/lop", "/lich", "/cai-dat"])("%s giữ thanh điều hướng dưới", (path) => {
    const router = open(path);
    expect(document.documentElement).not.toHaveAttribute("data-staff-detail");
    expect(staffRoot().className).not.toMatch(/staffDetail/);
    expect(mobileTabbar()).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(expect.arrayContaining(["Lớp", "Lịch", "Cài đặt"]));
    router.dispose();
  });

  it("bỏ dấu hiệu chi tiết khi rời màn con của lớp", async () => {
    const router = open("/lop/6a/buoi-hoc/6a-session-0");
    expect(document.documentElement).toHaveAttribute("data-staff-detail");

    await router.navigate("/lop");
    await waitFor(() => expect(document.documentElement).not.toHaveAttribute("data-staff-detail"));
    expect(staffRoot().className).not.toMatch(/staffDetail/);
    router.dispose();
  });

  it("hợp đồng CSS: mobile ẩn thanh tab ở màn chi tiết, desktop luôn dùng thanh bên", () => {
    const shell = readCss("src/app/shell.module.css");
    const mobile = mediaBlocks(shell, "(max-width: 1023px)").join("\n");
    expect(mobile).toMatch(/\.staffDetail \.staffTabbar\s*\{\s*display:\s*none;?\s*\}/);
    // Ngoài media query không được ẩn thanh tab, nếu không desktop/mobile lệch nhau.
    expect(globalCss(shell)).not.toMatch(/\.staffTabbar[^{]*\{[^}]*display:\s*none/);
    expect(mediaBlocks(shell, "(min-width: 1024px)").join("\n")).toMatch(/\.staffTabbar\s*\{\s*display:\s*none;?\s*\}/);
  });
});
