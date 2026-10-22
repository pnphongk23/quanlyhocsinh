import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, matchRoutes } from "react-router-dom";
import type { WebSession } from "../data/auth/session";
import { defaultRoles } from "../data/defaults";
import { replaceStore } from "../data/store";
import { createSeed } from "./fixtures/seed";

const authState = vi.hoisted(() => ({ session: null as WebSession | null }));
vi.mock("../data/auth/session", () => ({
  getSession: () => authState.session,
  getToken: () => authState.session?.token ?? null,
  subscribeSession: () => () => undefined,
  initializeSession: vi.fn(async () => undefined),
}));

import { routes } from "../app/routes";

const activeSession = (kind: "staff" | "guardian"): WebSession => {
  const linked = kind === "guardian";
  const membershipId = linked ? "fixture-guardian-membership" : "fixture-staff-membership";
  const role = defaultRoles().find((item) => item.kind === (linked ? "guardian" : "staff") && (linked || !item.system))!;
  return {
    token: "fixture-token",
    user: { id: `fixture-${kind}`, phone: "fixture-user", display_name: "Nguyễn An", must_change_password: false },
    activeMembershipId: membershipId,
    me: {
      user: { id: `fixture-${kind}`, phone: "fixture-user", display_name: "Nguyễn An", must_change_password: false },
      active_membership_id: membershipId,
      memberships: [{
        id: membershipId,
        workspace: { id: "fixture-workspace", name: "Lớp của Nguyễn An" },
        role: { id: role.id, name: role.name, system_key: role.system ? "admin" : linked ? "guardian" : "teacher", scope_kind: linked ? "linked_students" : "workspace" },
        status: "active",
        scope_epoch: 1,
        permissions: role.permissions,
      }],
    },
  };
};

beforeEach(() => {
  authState.session = null;
  replaceStore(createSeed());
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: media === "(min-width: 1024px)",
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  }));
});

function open(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe("foundation route integration", () => {
  it.each(["/lop", "/lop/moi", "/lop/6a/hoc-sinh", "/lich"])("W-2 route %s points to a lazy screen", (path) => {
    const leaf = matchRoutes(routes, path)?.at(-1)?.route;
    expect(leaf?.lazy).toBeTypeOf("function");
  });

  it.each(["/lop", "/lop/moi", "/lop/6a/hoc-sinh", "/lich"])("W-2 staff route %s renders inside its lazy shell", async (path) => {
    authState.session = activeSession("staff");
    const router = open(path);
    expect(await screen.findByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    const main = document.querySelector<HTMLElement>('[data-role="staff"] > main')!;
    expect(main.firstElementChild).not.toBeNull();
    router.dispose();
  });

  it.each([
    ["/lop/6a/buoi-hoc", "Buổi học"],
    ["/lop/6a/buoi-hoc/6a-session-0", "Điểm danh"],
    ["/lop/6a/bai-kiem-tra", "Bài kiểm tra"],
    ["/lop/6a/bai-kiem-tra/moi", "Tạo bài kiểm tra"],
    ["/lop/6a/bai-kiem-tra/6a-test-0", "Điểm số"],
    ["/lop/6a/diem", "Điểm"],
    ["/lop/6a/bao-cao", "Báo cáo"],
  ])("W-3 staff route %s renders inside its lazy shell", async (path, title) => {
    authState.session = activeSession("staff");
    const router = open(path);
    expect(await screen.findByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    const main = document.querySelector<HTMLElement>('[data-role="staff"] > main')!;
    expect(main.textContent).toContain(title);
    expect(main.firstElementChild).not.toBeNull();
      expect(screen.queryByRole("navigation", { name: "Điều hướng phụ huynh" })).toBeNull();
    router.dispose();
  });

  it.each([
    ["/ph", "Tổng quan"], ["/ph/diem-danh", "Điểm danh"],
    ["/ph/diem-so", "Điểm số"], ["/ph/nhan-xet", "Nhận xét"],
    ["/ph/nhan-xet/session-a", "Phiếu buổi học"],
    ["/ph/btvn", "Bài tập về nhà"], ["/ph/btvn/session-a", "Bài tập về nhà"],
    ["/ph/bao-cao", "Báo cáo tháng"],
  ])("guardian %s renders inside its lazy shell", async (path, title) => {
    authState.session = activeSession("guardian");
    const router = open(path);
    expect(await screen.findByRole("navigation", { name: "Điều hướng phụ huynh" })).toBeVisible();
    const main = document.querySelector<HTMLElement>('[data-role="guardian"] > main')!;
    expect(main).toBeVisible();
    expect(main.textContent).toContain(title);
    expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull();
    router.dispose();
  });

  it.each([
    ["/lop/6a", "/lop/6a/buoi-hoc"],
    ["/lop/6a/diem-danh", "/lop/6a/buoi-hoc"],
    ["/lop/6a/nhan-xet", "/lop/6a/buoi-hoc"],
    ["/lop/6a/diem/bai-moi", "/lop/6a/bai-kiem-tra/moi"],
  ])("preserves prototype redirect %s", async (path, destination) => {
    authState.session = activeSession("staff");
    const router = open(path);
    expect(await screen.findByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    expect(router.state.location.pathname).toBe(destination);
    router.dispose();
  });

  it("redirects unauthenticated staff and guardian routes to sign in", async () => {
    const router = open("/lop/6a/buoi-hoc");
    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/dang-nhap");
    router.dispose();
  });

  it.each(["/dang-nhap", "/dang-ky", "/quen-mat-khau", "/chon-vai-tro", "/cai-dat", "/cai-dat/doi-mat-khau"])("reserves account route %s", (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe(path);
  });

  it("has no forced password change route", () => {
    expect(matchRoutes(routes, "/doi-mat-khau-bat-buoc")?.at(-1)?.route.path).not.toBe("/doi-mat-khau-bat-buoc");
  });

  it("opens staff and guardian shells from the foundation landing", async () => {
    const router = open("/");
    authState.session = activeSession("staff");
    fireEvent.click(screen.getByRole("link", { name: "Khung nhân sự" }));
    expect(await screen.findByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    authState.session = activeSession("guardian");
    await router.navigate("/");
    fireEvent.click(await screen.findByRole("link", { name: "Khung phụ huynh" }));
    expect(await screen.findByRole("heading", { name: "Tổng quan" })).toBeVisible();
    router.dispose();
  });

  it.each(["/luong", "/hoc-phi", "/nhan-su", "/bai-giang", "/moi", "/otp", "/lop/class-a/bao-cao-diem"])("does not register non-MVP route %s", (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe("*");
  });
});
