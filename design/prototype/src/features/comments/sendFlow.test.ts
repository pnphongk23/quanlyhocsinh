import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTicketRows } from "../../data/homework";
import {
  flushQueuedTickets,
  sendSessionTickets,
} from "../../data/repositories/comments";
import { createSeed } from "../../data/seed";
import { getStore, replaceStore } from "../../data/store";
import { sendableCount, ticketBadge } from "./commentsModel";

/** Id phiếu mà nút "Gửi phiếu cả lớp (n)" sẽ gửi (giống CommentsPanel). */
function sendableIds(sessionId: string): string[] {
  return buildTicketRows(getStore(), sessionId)
    .filter((row) => row.stars !== null && row.status !== "sent")
    .map((row) => row.student.id);
}

function badgeOf(sessionId: string, studentId: string) {
  const row = buildTicketRows(getStore(), sessionId).find(
    (item) => item.student.id === studentId,
  );
  if (!row) throw new Error("Thiếu dòng phiếu của em cần kiểm tra.");
  return ticketBadge(row);
}

beforeEach(() => {
  replaceStore(createSeed());
  vi.stubGlobal("navigator", { onLine: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gửi phiếu cả lớp từ tab Nhận xét", () => {
  it("chỉ gửi phiếu đã chọn sao, bỏ qua em chưa chọn sao", () => {
    const ids = sendableIds("6a-session-7");
    expect(ids).toHaveLength(2);
    expect(ids).toHaveLength(sendableCount(buildTicketRows(getStore(), "6a-session-7")));

    const result = sendSessionTickets("6a-session-7", ids);
    expect(result.queued).toBe(false);
    expect([...result.sent].sort()).toEqual([...ids].sort());
    // Vẫn gửi được khi còn phần BTVN chưa chấm: Phạm Đức Dũng thiếu 1 phần.
    expect(result.ungraded.ungradedParts).toBe(1);

    const after = buildTicketRows(getStore(), "6a-session-7");
    expect(after.filter((row) => row.status === "sent")).toHaveLength(3);
    expect(after.filter((row) => row.status === "none")).toHaveLength(6);
    expect(badgeOf("6a-session-7", "6a-student-2").label.startsWith("Đã gửi")).toBe(
      true,
    );
  });

  it("mất mạng: phiếu thành Chờ mạng rồi tự gửi khi có mạng (ảnh 44)", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const ids = sendableIds("6a-session-7");
    const result = sendSessionTickets("6a-session-7", ids);
    expect(result.queued).toBe(true);
    expect(badgeOf("6a-session-7", ids[0]).label).toBe("Chờ mạng");

    vi.stubGlobal("navigator", { onLine: true });
    expect(flushQueuedTickets()).toBeGreaterThanOrEqual(ids.length);
    expect(badgeOf("6a-session-7", ids[0]).label.startsWith("Đã gửi")).toBe(true);
  });

  it("không có phiếu nào đã chọn sao thì không gửi gì", () => {
    const ids = sendableIds("6a-session-0");
    expect(ids).toHaveLength(0);
    const result = sendSessionTickets("6a-session-0", ids);
    expect(result.sent).toHaveLength(0);
  });
});
