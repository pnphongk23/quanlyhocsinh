import { afterEach, describe, expect, it, vi } from "vitest";
import { isFutureSession } from "../data/logic";
import { defaultChildMonth } from "../roles/guardian/guardianRead";
import { replaceStore } from "../data/store";
import { createSeed } from "../test/fixtures/seed";
import { dateISO, todayISO } from "./date";

vi.hoisted(() => {
  process.env.TZ = "Asia/Ho_Chi_Minh";
});

vi.mock("../data/repositories/guardian", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/repositories/guardian")>();
  return {
    ...actual,
    listMyChildren: () => [{
      student: { id: "linked-child", classId: "empty-class", enrolledAt: "2026-10-01", leftAt: null },
      className: "",
    }] as never,
  };
});

afterEach(() => vi.useRealTimers());

describe("ngày lịch địa phương", () => {
  it.each(["2026-10-31T17:30:00.000Z", "2026-10-31T23:59:00.000Z"])(
    "giữ ngày 01/11 tại mốc %s",
    (instant) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(instant));

      expect(todayISO()).toBe("2026-11-01");
      expect(isFutureSession("2026-11-01")).toBe(false);
      expect(isFutureSession("2026-11-02")).toBe(true);
      replaceStore(createSeed());
      expect(defaultChildMonth("linked-child")).toBe("2026-11");

      const localMidnight = new Date(2026, 10, 1);
      expect(dateISO(localMidnight)).toBe("2026-11-01");
    },
  );
});
