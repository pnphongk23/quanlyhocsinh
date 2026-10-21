import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { SaveStatus } from "../shared/SaveStatus";
import { setSaveStatus } from "../data/saveStatus";
import { createClass, listClasses } from "../data/repositories/classes";
import { listMyChildren } from "../data/repositories/guardian";
import { can, visibleClassIds, useAccess } from "../data/repositories/access";
import { FoundationUnavailableError } from "../data/foundation";
import { createApiClient } from "../data/api/client";
afterEach(() => setSaveStatus("synced"));
describe("phase A safety boundaries", () => {
  it.each(["unsaved", "local", "synced"] as const)("keeps %s status invisible", (status) => {
    render(<SaveStatus status={status} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("shows an error when an unimplemented write is attempted, without inventing data", () => {
    render(<SaveStatus />);
    act(() => {
      expect(() => createClass({ name: "Lớp mẫu", weekdays: [1], time: "18:00" })).toThrow(FoundationUnavailableError);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Lỗi lưu");
    expect(listClasses()).toEqual([]);
    expect(listMyChildren()).toEqual([]);
  });
  it("has no granted permissions or workspace-wide scope before authentication", () => {
    expect(can("scores", "write")).toBe(false);
    expect(visibleClassIds()).toEqual(new Set());
    expect(useAccess().member).toBeNull();
  });
  it("does not send requests until the phase B transport exists", async () => {
    const fetchStub = vi.fn();
    const api = createApiClient({ baseUrl: "/v1", getToken: () => null, fetch: fetchStub });
    await expect(api.request("GET /me")).rejects.toThrow(FoundationUnavailableError);
    expect(fetchStub).not.toHaveBeenCalled();
  });
});
