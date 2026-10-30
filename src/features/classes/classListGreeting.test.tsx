import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MeResponse } from "../../data/api/types";

vi.mock("../../data/sync", () => ({ api: { request: vi.fn() }, syncNow: vi.fn(), refreshNow: vi.fn(async () => ({ status: "ok" })), scheduleSync: vi.fn(), clearUserCache: vi.fn(async () => undefined) }));

import ClassListPage from "./ClassListPage";
import { activateSession, clearSession } from "../../data/auth/session";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import { greetingFor, initialsOf } from "../../shared/personName";
import s from "./classes.module.css";
import tokens from "../../../design/tokens/tokens.json";

const full = { classes: "write", students: "write", sessions_attendance: "write", scores: "write", lectures: "write", comments_reports: "write", send_comments: "write" } as const;
const membership = {
  id: "m-teacher", status: "active" as const, scope_epoch: 1, workspace: { id: "w1", name: "Lớp học" },
  role: { id: "r-teacher", name: "Giáo viên", system_key: "teacher", scope_kind: "assigned_classes" as const },
  permissions: full, class_ids: [] as string[],
};

async function startAs(displayName: string, includeClasses = false) {
  const user = { id: "u1", phone: "+84900000001", display_name: displayName, must_change_password: false };
  const me: MeResponse = { user, active_membership_id: membership.id, memberships: [membership] };
  await clearSession();
  await activateSession("tok", user, me, membership.id);
  const seed = createSeed();
  replaceStore({ ...seed, classes: includeClasses ? seed.classes : [] });
}
const renderPage = () => render(<MemoryRouter><ClassListPage /></MemoryRouter>);

describe("lời chào ở trang Lớp", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("chào theo tên đang đăng nhập, avatar là chữ cái đầu, không thêm cô/thầy", async () => {
    await startAs("Nguyễn Thu Hà");
    renderPage();
    expect(screen.getByText("Xin chào, Nguyễn Thu Hà")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cài đặt" }).textContent).toBe("TH");
    expect(screen.queryByText(/cô Lan/i)).toBeNull();
  });

  it("không có tên thì chỉ chào và avatar là biểu tượng", async () => {
    await startAs("  ");
    renderPage();
    expect(screen.getByText("Xin chào")).toBeTruthy();
    const avatar = screen.getByRole("link", { name: "Cài đặt" });
    expect(avatar.textContent).toBe("");
    expect(avatar.querySelector("svg")).not.toBeNull();
  });
});

describe("tên hiển thị", () => {
  it("greetingFor và initialsOf xử lý tên rỗng và tên một từ", () => {
    expect(greetingFor(undefined)).toBe("Xin chào");
    expect(greetingFor("Thu")).toBe("Xin chào, Thu");
    expect(initialsOf("")).toBe("");
    expect(initialsOf("Thu")).toBe("T");
    expect(initialsOf(" an  nhiên ")).toBe("AN");
  });
});

describe("thẻ lớp được chọn", () => {
  it("dùng màu chữ và chip theo token on-accent trên desktop", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    await startAs("QA teacher", true);
    renderPage();

    const link = document.querySelector('a[href="/lop/6a/buoi-hoc"]')!;
    const card = link.firstElementChild;
    expect(card?.className).toContain(s.classCardSelected);
    expect(card?.querySelector(`.${s.cardSchedule}`)).not.toBeNull();
    expect([...card!.querySelectorAll(`.${s.chips} > span`)].every((chip) => chip.className.includes(s.selectedChip))).toBe(true);
  });

  it("đạt tương phản chữ thường WCAG AA cho nền accent và chip", () => {
    const luminance = (hex: string) => {
      const rgb = hex.match(/[\da-f]{2}/gi)!.map((value) => parseInt(value, 16) / 255);
      const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const contrast = (foreground: string, background: string) => {
      const a = luminance(foreground);
      const b = luminance(background);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const foreground = tokens.color["color-on-accent"];
    expect(contrast(foreground, tokens.color["color-primary"])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(foreground, tokens.color["color-primary-ink"])).toBeGreaterThanOrEqual(4.5);
  });
});
