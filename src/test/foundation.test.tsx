import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SaveStatus } from "../shared/SaveStatus";
import { setSaveStatus } from "../data/saveStatus";
import { createClass, listClasses } from "../data/repositories/classes";
import { listMyChildren } from "../data/repositories/guardian";
import { can, visibleClassIds, useAccess } from "../data/repositories/access";
import { createApiClient } from "../data/api/client";
afterEach(() => setSaveStatus("synced"));
describe("phase B data layer boundaries", () => {
  it.each(["unsaved", "local", "synced"] as const)("keeps %s status invisible", (status) => {
    render(<SaveStatus status={status} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("rejects writes without permission and does not invent data", () => {
    render(<SaveStatus />);
    act(() => {
        expect(() => createClass({ name: "Lớp mẫu", weekdays: [1], time: "18:00" })).toThrow("quyền");
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(listClasses()).toEqual([]);
    expect(listMyChildren()).toEqual([]);
  });
  it("has no granted permissions or workspace-wide scope before authentication", () => {
    expect(can("scores", "write")).toBe(false);
    expect(visibleClassIds()).toEqual(new Set());
    function AccessProbe() { const access = useAccess(); return <span>{access.member ? "active" : "anonymous"}</span>; }
    render(<AccessProbe />);
    expect(screen.getByText("anonymous")).toBeInTheDocument();
  });
  it("sends requests through the phase B transport", async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const api = createApiClient({ baseUrl: "/v1", getToken: () => null, fetch: fetchStub });
    await api.request("GET /me");
    expect(fetchStub).toHaveBeenCalledOnce();
    expect(String(fetchStub.mock.calls[0][0])).toContain("/v1/me");
  });
});
