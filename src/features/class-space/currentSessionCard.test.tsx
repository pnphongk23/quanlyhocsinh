import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { replaceStore } from "../../data/store";
import { createSeed } from "../../test/fixtures/seed";
import SessionsTab from "./SessionsTab";

/**
 * Thẻ "Buổi hiện tại" (ảnh 26): dòng gợi ý "Điểm danh mở vào ngày học" từng là phần tử thứ ba của
 * hàng ngang nên cột ngày bị bóp còn 1 ký tự/dòng. Gợi ý phải nằm trong khối trái (dưới giờ),
 * khối trái giãn hết chỗ còn lại, nút "Xem buổi" theo nội dung và căn giữa dọc.
 */
const sessionsCssSource = readFileSync(resolve(process.cwd(), "src/features/class-space/sessions.module.css"), "utf8");

const TODAY = new Date();
const iso = (offset: number) => {
  const date = new Date(TODAY);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function renderCard() {
  const router = createMemoryRouter([{ path: "/lop/:classId/buoi-hoc", element: <SessionsTab /> }], {
    initialEntries: ["/lop/6a/buoi-hoc"],
  });
  render(<RouterProvider router={router} />);
  const card = [...document.querySelectorAll("a")].find((node) => node.className.includes("currentCard"));
  if (!card) throw new Error("Không tìm thấy thẻ Buổi hiện tại");
  const info = card.querySelector<HTMLElement>('[class*="currentInfo"]');
  const action = card.querySelector<HTMLElement>('[class*="primaryAction"]');
  if (!info || !action) throw new Error("Thẻ Buổi hiện tại thiếu khối ngày/giờ hoặc nút Xem buổi");
  return { card, info, action };
}

function seedWith(sessions: Array<{ id: string; date: string; time: string; status: "planned" | "held" }>) {
  const seed = createSeed();
  seed.sessions = seed.sessions.filter((session) => session.classId === "6a");
  for (const session of sessions) {
    seed.sessions.push({ classId: "6a", origin: "recurring", ...session } as (typeof seed.sessions)[number]);
  }
  replaceStore(seed);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("thẻ Buổi hiện tại (mobile)", () => {
  it("buổi chưa tới ngày: gợi ý nằm trong khối ngày/giờ, không thành cột thứ ba", () => {
    seedWith([{ id: "6a-future", date: iso(4), time: "18:00", status: "planned" }]);
    const { info, action } = renderCard();

    const hint = info.querySelector<HTMLElement>('[class*="lockedHint"]');
    expect(hint?.textContent).toBe("Điểm danh mở vào ngày học.");
    // Khối trái giữ đủ ngày + giờ + gợi ý; nút "Xem buổi" nằm ngoài khối trái.
    expect(info.querySelector('[class*="currentTitle"]')?.textContent).toBeTruthy();
    expect(info.querySelector('[class*="currentMeta"]')?.textContent).toBe("18:00");
    expect(info.contains(action)).toBe(false);
    expect(action.textContent?.trim()).toBe("Xem buổi");
  });

  it("buổi hôm nay và buổi đã điểm danh: không có gợi ý, vẫn đủ ngày giờ và nút", () => {
    seedWith([{ id: "6a-today", date: iso(0), time: "18:00", status: "held" }]);
    const { info, action } = renderCard();

    expect(info.querySelector('[class*="lockedHint"]')).toBeNull();
    expect(info.textContent).not.toContain("Điểm danh mở vào ngày học.");
    expect(info.querySelector('[class*="currentTitle"]')?.textContent).toBeTruthy();
    expect(info.querySelector('[class*="currentMeta"]')?.textContent).toBe("18:00");
    expect(action.textContent?.trim()).toBe("Xem buổi");
  });

  it("CSS: khối trái giãn, ngắt chữ hợp lý, nút theo nội dung, thẻ căn giữa dọc", () => {
    const block = (selector: string) =>
      sessionsCssSource.match(new RegExp(`\\${selector}\\s*\\{[^}]*\\}`, "s"))?.[0] ?? "";
    const info = block(".currentInfo");
    expect(info).toMatch(/flex:\s*1 1 auto/);
    expect(info).toMatch(/min-width:\s*0/);
    expect(block(".currentCard")).toMatch(/align-items:\s*center/);
    expect(block(".primaryAction")).toMatch(/flex:\s*none/);
    // Ngắt chữ theo từ (break-word), không bẻ từng ký tự và không đẩy gợi ý xuống dòng riêng.
    const titles = sessionsCssSource.match(/\.currentTitle,\s*\.currentMeta\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(titles).toMatch(/overflow-wrap:\s*break-word/);
    expect(titles).not.toMatch(/anywhere/);
    expect(sessionsCssSource).not.toMatch(/flex-basis:\s*100%/);
  });
});
