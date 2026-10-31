import { describe, expect, it } from "vitest";
import { replaceStore } from "./store";
import { createSeed } from "../test/fixtures/seed";
import { buildTicketRows } from "./homework";
import { ticketBadge } from "../features/comments/commentsModel";

describe("buildTicketRows: em chưa có phiếu", () => {
  it("không có sao, trạng thái none, nhãn Chưa nhận xét", () => {
    const seed = createSeed();
    const sessionId = "6a-session-6";
    seed.comments = seed.comments.filter((comment) => comment.sessionId !== sessionId);
    replaceStore(seed);
    const rows = buildTicketRows(seed, sessionId);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.comment).toBeNull();
      expect(row.stars).toBeNull();
      expect(row.status).toBe("none");
      expect(ticketBadge(row)).toEqual({ label: "Chưa nhận xét", tone: "neutral" });
    }
  });
});
