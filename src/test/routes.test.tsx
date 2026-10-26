import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, matchRoutes } from "react-router-dom";
import type { WebSession } from "../data/auth/session";
import { defaultRoles } from "../data/defaults";
import { db, rowKey, setCacheIdentity, stored } from "../data/db";
import { getStore, hydrateStore, replaceStore } from "../data/store";
import { createSeed } from "./fixtures/seed";

const authState = vi.hoisted(() => ({
  session: null as WebSession | null,
  switchMembership: vi.fn(async (membershipId: string) => {
    if (!authState.session) return;
    authState.session = {
      ...authState.session,
      activeMembershipId: membershipId,
      me: { ...authState.session.me, active_membership_id: membershipId },
    };
  }),
}));
vi.mock("../data/auth/session", () => ({
  getSession: () => authState.session,
  getToken: () => authState.session?.token ?? null,
  subscribeSession: () => () => undefined,
  initializeSession: vi.fn(async () => undefined),
}));
vi.mock("../data/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/auth")>()),
  switchMembership: authState.switchMembership,
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
        ...(linked ? { students: [{ id: "6a-student-1", name: "Trần Gia Bảo", class_id: "6a", class_name: "Tiếng Anh giao tiếp 6A", teacher_name: "Cô Lan" }] } : {}),
      }],
    },
  };
};

const guardianAccountWithoutMembership = (): WebSession => {
  const session = activeSession("guardian");
  return {
    ...session,
    activeMembershipId: null,
    guardianAccount: true,
    me: { ...session.me, active_membership_id: null, memberships: [] },
  };
};

const multiRoleSession = (): WebSession => {
  const session = activeSession("staff");
  const guardian = activeSession("guardian").me.memberships[0];
  return {
    ...session,
    me: { ...session.me, memberships: [...session.me.memberships, guardian] },
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
    ["/lich", "Lịch"],
    ["/lop", "Lớp"],
    ["/cai-dat", "Cài đặt"],
  ])("staff side nav marks only %s active", async (path, label) => {
    authState.session = activeSession("staff");
    const router = open(path);
    const nav = await screen.findByRole("navigation", { name: "Điều hướng nhân sự" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(expect.arrayContaining(["Lớp", "Lịch", "Cài đặt"]));
    const active = links.filter((link) => link.getAttribute("aria-current") === "page");
    expect(active.map((link) => link.textContent)).toEqual([label]);
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
    ["/ph", "Tiếng Anh giao tiếp 6A"],
    ["/ph/nhan-xet", "Nhận xét của cô"],
    ["/ph/buoi/session-a", "Buổi học"],
    ["/ph/diem", "Điểm số"],
    ["/ph/bao-cao", "Báo cáo"],
  ])("guardian %s renders inside its lazy shell", async (path, title) => {
    authState.session = activeSession("guardian");
    const router = open(path);
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    const main = document.querySelector<HTMLElement>('[data-role="guardian"] > main')!;
    expect(main).toBeVisible();
    expect(main.textContent).toContain(title);
    expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull();
    router.dispose();
  });

  it.each([
    ["/ph/diem-danh", "/ph"],
    ["/ph/diem-so", "/ph/diem"],
    ["/ph/btvn", "/ph"],
    ["/ph/nhan-xet/session-a", "/ph/buoi/session-a"],
    ["/ph/btvn/session-a", "/ph/buoi/session-a"],
  ])("redirects retired guardian route %s", async (path, destination) => {
    authState.session = activeSession("guardian");
    const router = open(path);
    await screen.findByRole("navigation", { name: "Điều hướng chính" });
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(destination));
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

  it("locks class-dependent staff navigation when no class is selected", async () => {
    authState.session = activeSession("staff");
    const fixture = createSeed();
    fixture.currentClassId = null;
    replaceStore(fixture);
    const router = open("/lop");

    const navigation = await screen.findByRole("navigation", { name: "Điều hướng nhân sự" });
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(navigation.querySelector('a[href="/lop"]')).toHaveAttribute("aria-current", "page");
    const mobileNavigation = screen.getByRole("navigation", { name: "Điều hướng chính" });
    expect(mobileNavigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(mobileNavigation.querySelectorAll('[aria-disabled="true"]')).toHaveLength(0);
    expect(navigation.querySelectorAll("a")).toHaveLength(3);
    expect(within(navigation).getByRole("link", { name: "Cài đặt" })).toBeVisible();
    for (const label of ["Điểm danh", "Điểm số", "Học sinh", "Báo cáo"]) {
      expect(within(navigation).queryByText(label)).toBeNull();
    }
    router.dispose();
  });

  it("activates only the matching staff navigation item when a class is selected", async () => {
    authState.session = activeSession("staff");
    const fixture = createSeed();
    fixture.currentClassId = "6a";
    replaceStore(fixture);
    const router = open("/lop/6a/diem");

    const navigation = await screen.findByRole("navigation", { name: "Điều hướng nhân sự" });
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Điểm số" })).toHaveAttribute("aria-current", "page");
    expect(navigation.querySelectorAll('[aria-disabled="true"]')).toHaveLength(0);
    const children = ["Điểm danh", "Điểm số", "Học sinh", "Báo cáo"];
    expect(
      Array.from(navigation.querySelectorAll("a")).map((link) => link.textContent),
    ).toEqual(["Lớp", ...children, "Lịch", "Cài đặt"]);
    router.dispose();
  });

  it.each(["/lop", "/lop/6a/buoi-hoc", "/lop/6a/bai-kiem-tra", "/lop/6a/buoi-hoc/6a-session-7"])(
    "selects Lớp when no class section matches %s",
    async (url) => {
      authState.session = activeSession("staff");
      const fixture = createSeed();
      fixture.currentClassId = "6a";
      replaceStore(fixture);
      const router = open(url);
      const navigation = await screen.findByRole("navigation", { name: "Điều hướng nhân sự" });
      const selected = Array.from(navigation.querySelectorAll("a")).filter((link) =>
        /staffNavActive/.test(link.className),
      );
      expect(selected.map((link) => link.textContent)).toEqual(["Lớp"]);
      router.dispose();
    },
  );

  it("selects only the matching section, not Lớp, on a class section", async () => {
    authState.session = activeSession("staff");
    const fixture = createSeed();
    fixture.currentClassId = "6a";
    replaceStore(fixture);
    const router = open("/lop/6a/diem");
    const navigation = await screen.findByRole("navigation", { name: "Điều hướng nhân sự" });
    const selected = Array.from(navigation.querySelectorAll("a")).filter(
      (link) => /staffNavActive/.test(link.className),
    );
    expect(selected.map((link) => link.textContent)).toEqual(["Điểm số"]);
    router.dispose();
  });

  it("picks a class from the sidebar picker and keeps it after the store is rebuilt", async () => {
    authState.session = activeSession("staff");
    setCacheIdentity({ userId: "u", workspaceId: "w", membershipId: "m" });
    await db.delete();
    await db.open();
    const wire = { id: "6a", name: "Lớp 6A", status: "active", weekdays: [1], start_time: "18:00", version: 1 };
    await db.classes.put(stored("class", rowKey("class", ["6a"]), wire) as never);
    await hydrateStore();
    expect(getStore().classes.map((item) => item.id)).toEqual(["6a"]);
    const router = open("/lop");
    const navigation = await screen.findByRole("navigation", { name: "Điều hướng nhân sự" });
    expect(navigation.querySelectorAll("a")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /Đang xem lớp/ }));
    fireEvent.click(await screen.findByRole("option", { name: /6A/ }));
    await waitFor(() => expect(navigation.querySelectorAll("a")).toHaveLength(7));
    expect(screen.getByRole("button", { name: /Đang xem lớp/ })).toHaveTextContent("6A");

    // Đồng bộ xong thì store dựng lại từ Dexie; lớp đã chọn phải còn.
    await act(async () => {
      await hydrateStore();
    });
    expect(getStore().currentClassId).toBe("6a");
    expect(navigation.querySelectorAll("a")).toHaveLength(7);
    expect(screen.getByRole("button", { name: /Đang xem lớp/ })).toHaveTextContent("6A");
    router.dispose();
    setCacheIdentity(null);
    await db.delete();
  });

  it("redirects unauthenticated staff and guardian routes to sign in", async () => {
    const router = open("/lop/6a/buoi-hoc");
    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/dang-nhap");
    router.dispose();
  });

  it.each(["staff", "guardian"] as const)(
    "renders /cai-dat in the active %s shell",
    async (kind) => {
      authState.session = activeSession(kind);
      const router = open("/cai-dat");
      const ownNavigation = kind === "guardian" ? "Điều hướng chính" : "Điều hướng nhân sự";
        expect(await screen.findByRole("navigation", { name: ownNavigation })).toBeVisible();
        expect(
          document.querySelector(
            `[data-role="${kind === "guardian" ? "staff" : "guardian"}"]`,
          ),
        ).toBeNull();
      router.dispose();
    },
  );

  it("shows the desktop role card only for a multi-role guardian", async () => {
    authState.session = activeSession("guardian");
    const singleRoleRouter = open("/cai-dat");
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Vai trò" })).toBeNull();
    singleRoleRouter.dispose();

    const multiRole = multiRoleSession();
    const parentMembership = multiRole.me.memberships.find((item) => item.role.scope_kind === "linked_students")!;
    authState.session = {
      ...multiRole,
      activeMembershipId: parentMembership.id,
      me: { ...multiRole.me, active_membership_id: parentMembership.id },
    };
    const multiRoleRouter = open("/cai-dat");
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    expect(await screen.findByRole("region", { name: "Vai trò" })).toBeVisible();
    multiRoleRouter.dispose();
  });

  it("keeps /cai-dat/doi-mat-khau inside the active guardian shell on mobile", async () => {
    authState.session = activeSession("guardian");
    vi.stubGlobal("matchMedia", (media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return false; },
    }));
    const router = open("/cai-dat/doi-mat-khau");
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Đổi mật khẩu" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull();
    router.dispose();
  });

  it("keeps guardian settings inside the shell with no linked children", async () => {
    authState.session = guardianAccountWithoutMembership();
    const router = open("/ph");
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Tài khoản và cài đặt" })).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Tài khoản và cài đặt" }));
    expect(await screen.findByRole("heading", { name: "Tài khoản của tôi" })).toBeVisible();
    expect(document.querySelector('[data-role="guardian"]')).not.toBeNull();
    expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull();
    router.dispose();
  });

  it("switches role from guardian settings into the selected shell", async () => {
    authState.session = multiRoleSession();
    const router = open("/cai-dat");
    expect(await screen.findByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    fireEvent.click(await screen.findByRole("button", { name: /Phụ huynh/ }));
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/ph");
    await vi.waitFor(() => expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull());
    router.dispose();
  });

  it("redirects guardian away from teacher routes before rendering the staff shell", async () => {
    authState.session = activeSession("guardian");
    const router = open("/lop");
    expect(await screen.findByRole("navigation", { name: "Điều hướng chính" })).toBeVisible();
    expect(router.state.location.pathname).toBe("/ph");
    expect(screen.queryByRole("navigation", { name: "Điều hướng nhân sự" })).toBeNull();
    router.dispose();
  });

  it.each(["/dang-nhap", "/dang-ky", "/quen-mat-khau", "/chon-vai-tro", "/cai-dat", "/cai-dat/doi-mat-khau"])("reserves account route %s", (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe(path);
  });

  it("has no forced password change route", () => {
    expect(matchRoutes(routes, "/doi-mat-khau-bat-buoc")?.at(-1)?.route.path).not.toBe("/doi-mat-khau-bat-buoc");
  });

  it("opens staff and guardian shells directly", async () => {
    authState.session = activeSession("staff");
    const router = open("/lop");
    expect(await screen.findByRole("navigation", { name: "Điều hướng nhân sự" })).toBeVisible();
    router.dispose();
    cleanup();
    authState.session = activeSession("guardian");
    const guardianRouter = open("/ph");
    expect(await screen.findByRole("heading", { name: "Tiếng Anh giao tiếp 6A" })).toBeVisible();
    guardianRouter.dispose();
  });

  it.each(["/luong", "/hoc-phi", "/nhan-su", "/bai-giang", "/moi", "/lop/class-a/bao-cao-diem"])("does not register non-MVP route %s", (path) => {
    expect(matchRoutes(routes, path)?.at(-1)?.route.path).toBe("*");
  });
});
