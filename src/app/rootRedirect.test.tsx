import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter } from "react-router-dom";
import type { WebSession } from "../data/auth/session";
import { defaultRoles } from "../data/defaults";

const authState = vi.hoisted(() => ({ session: null as WebSession | null }));
vi.mock("../data/auth/session", () => ({
  getSession: () => authState.session,
  getToken: () => authState.session?.token ?? null,
  subscribeSession: () => () => undefined,
  initializeSession: vi.fn(async () => undefined),
}));

import { routes } from "./routes";

function sessionWith(kinds: Array<"staff" | "guardian">, activeIndex: number | null = 0): WebSession {
  const memberships = kinds.map((kind, index) => {
    const linked = kind === "guardian";
    const role = defaultRoles().find((item) => item.kind === kind && (linked || !item.system))!;
    return {
      id: `membership-${index}`,
      workspace: { id: "workspace", name: "Lớp" },
      role: { id: role.id, name: role.name, system_key: linked ? "guardian" : "teacher", scope_kind: linked ? "linked_students" : "workspace" },
      status: "active",
      scope_epoch: 1,
      permissions: role.permissions,
    };
  });
  const activeId = activeIndex === null ? null : (memberships[activeIndex]?.id ?? null);
  const user = { id: "user", phone: "fixture-user", display_name: "Nguyễn An", must_change_password: false };
  return {
    token: "fixture-token",
    user,
    activeMembershipId: activeId,
    me: { user, active_membership_id: activeId, memberships },
  } as unknown as WebSession;
}

/** Điều hướng tới "/" và trả đường dẫn cuối: "/" không có màn riêng, chỉ chuyển hướng. */
async function openRoot(session: WebSession | null): Promise<string> {
  authState.session = session;
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  await vi.waitFor(() => expect(router.state.initialized).toBe(true));
  const path = router.state.location.pathname;
  router.dispose();
  return path;
}

describe("route /", () => {
  it("chưa đăng nhập thì chuyển tới /dang-nhap", async () => {
    expect(await openRoot(null)).toBe("/dang-nhap");
  });

  it.each([
    [["staff"], 0, "/lop"],
    [["guardian"], 0, "/ph"],
    [["staff", "guardian"], null, "/chon-vai-tro"],
    [["staff", "guardian"], 0, "/lop"],
    [["staff", "guardian"], 1, "/ph"],
  ] as const)("vai %j (đang dùng %s) chuyển tới %s", async (kinds, active, expected) => {
    expect(await openRoot(sessionWith([...kinds], active))).toBe(expected);
  });
});
