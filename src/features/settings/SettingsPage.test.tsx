import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./SettingsPage";

const { getCachedCriteriaSet } = vi.hoisted(() => ({ getCachedCriteriaSet: vi.fn() }));

vi.mock("../../data/auth/session", () => ({
  getSession: () => ({
    activeMembershipId: "membership-1",
    user: { display_name: "Cô Demo", phone: "0900000000" },
    me: { memberships: [{
      id: "membership-1",
      status: "active",
      role: { id: "role-admin", name: "Quản trị viên", scope_kind: "workspace", system_key: "admin", permissions: [] },
      workspace: { name: "Workspace Demo" },
    }] },
  }),
}));
vi.mock("../../data/repositories/criteriaSet", () => ({ getCachedCriteriaSet }));
vi.mock("../../data/store", () => ({ useStore: () => ({ pending: [] }) }));
vi.mock("../../shared/hooks/useOnline", () => ({ useOnline: () => true }));
vi.mock("../../data/auth", () => ({ logout: vi.fn() }));
vi.mock("../../data/repositories/guardian", () => ({ listMyChildren: () => [] }));
vi.mock("../../data/outbox", () => ({ pendingCommandCount: vi.fn(async () => 0) }));
vi.mock("../../data/sync", () => ({ scheduleSync: vi.fn() }));
vi.mock("./EmailSettings", () => ({ EmailSettingsSummary: () => <a href="/cai-dat/email">Email khôi phục</a> }));

describe("SettingsPage criteria summary", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
    getCachedCriteriaSet.mockReset();
  });

  it("shows the actual cached criteria count", async () => {
    getCachedCriteriaSet.mockResolvedValue({ version: 1, criteria: [{ id: "one" }, { id: "two" }] });
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText("2 tiêu chí · áp dụng cho mọi lớp")).toBeInTheDocument());
  });

  it("uses a count-free label when there is no cached criteria set", async () => {
    getCachedCriteriaSet.mockResolvedValue(null);
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);
    expect(screen.getByText("Áp dụng cho mọi lớp")).toBeInTheDocument();
    await waitFor(() => expect(getCachedCriteriaSet).toHaveBeenCalledOnce());
  });
});
