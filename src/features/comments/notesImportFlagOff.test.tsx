import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { createSeed } from "../../test/fixtures/seed";
import { replaceStore } from "../../data/store";
import { FEATURE_NOTES_IMPORT } from "../../shared/featureFlags";
import CommentsPanel from "./CommentsPanel";

vi.mock("../../data/repositories/access", async (original) => ({
  ...(await original<typeof import("../../data/repositories/access")>()),
  useAccess: () => ({ can: () => true, member: null, role: null, isAdmin: true, multipleRoles: false }),
}));

describe("cờ ẩn Nhập từ ghi chú", () => {
  it("cờ mặc định tắt và không còn lối vào dù có quyền sửa", () => {
    expect(FEATURE_NOTES_IMPORT).toBe(false);
    replaceStore(createSeed());
    render(<MemoryRouter><CommentsPanel classId="6a" sessionId="6a-session-7" /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Nhập từ ghi chú" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Gửi|Gán/ }).length).toBeGreaterThan(0);
  });
});
