import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../data/seed";

const outbox = vi.hoisted(() => ({ persistCommand: vi.fn() }));
vi.mock("../data/outbox", async (original) => ({ ...(await original<object>()), ...outbox }));
vi.mock("../data/repositories/access", async (original) => ({ ...(await original<object>()), requirePermission: () => undefined, requireSessionAccess: (id: string) => ({ id, classId: "c1", date: "2026-10-01", status: "planned" }) }));

beforeEach(async () => {
  const { replaceStore } = await import("../data/store");
  replaceStore({ ...createSeed(), homeworkSections: [] });
});
afterEach(() => outbox.persistCommand.mockReset());

const input = { sessionId: "s1", kind: "reading" as never, title: "Đọc bài", description: "" };

describe("saveHomeworkSectionDurable", () => {
  it("throws when the outbox write fails and leaves no section in memory", async () => {
    const { getStore } = await import("../data/store");
    const { saveHomeworkSectionDurable } = await import("../data/repositories/homework");
    outbox.persistCommand.mockRejectedValue(new Error("Không lưu được vào bộ nhớ trên thiết bị."));
    await expect(saveHomeworkSectionDurable(input)).rejects.toThrow(/Không lưu được/);
    expect(getStore().homeworkSections).toHaveLength(0);
  });

  it("restores the previous section when an edit fails to persist", async () => {
    const { getStore } = await import("../data/store");
    const { saveHomeworkSectionDurable } = await import("../data/repositories/homework");
    outbox.persistCommand.mockResolvedValueOnce(undefined);
    const created = await saveHomeworkSectionDurable(input);
    outbox.persistCommand.mockRejectedValueOnce(new Error("disk"));
    await expect(saveHomeworkSectionDurable({ ...input, id: created.id, title: "Sửa" })).rejects.toThrow("disk");
    expect(getStore().homeworkSections.map((x) => x.title)).toEqual(["Đọc bài"]);
  });

  it("returns the section once the write succeeds", async () => {
    const { getStore } = await import("../data/store");
    const { saveHomeworkSectionDurable } = await import("../data/repositories/homework");
    outbox.persistCommand.mockResolvedValue(undefined);
    const item = await saveHomeworkSectionDurable(input);
    expect(getStore().homeworkSections).toEqual([item]);
  });
});
