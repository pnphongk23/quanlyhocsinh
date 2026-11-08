import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db, setCacheIdentity } from "../../data/db";
import type { CriteriaSetItem } from "../../data/api/types";
import { useCriteriaSet } from "./useCriteriaSet";

const identity = "teacher:workspace:member";
const key = `${identity}|criteria_set|current`;
const item: CriteriaSetItem = { id: "focus", name: "Focus", texts: { good: "Good.", ok: "Okay.", needs_work: "Try." }, default_level: "good", homework: false };

beforeEach(async () => {
  setCacheIdentity({ userId: "teacher", workspaceId: "workspace", membershipId: "member" });
  await db.open();
  await db.criteriaSets.clear();
});
afterEach(async () => {
  setCacheIdentity(null);
  await db.criteriaSets.clear();
});

describe("useCriteriaSet", () => {
  it("nhận bản bộ tiêu chí mới khi cache đổi trong lúc màn đang mở", async () => {
    await db.criteriaSets.put({ version: 1, criteria: [item], identity, key, entity: "criteria_set" });
    const hook = renderHook(() => useCriteriaSet(true));
    await waitFor(() => expect(hook.result.current?.version).toBe(1));

    await act(async () => {
      await db.criteriaSets.put({ version: 2, criteria: [{ ...item, name: "New name" }], identity, key, entity: "criteria_set" });
    });

    await waitFor(() => expect(hook.result.current?.version).toBe(2));
    expect(hook.result.current?.criteria[0]?.name).toBe("New name");
  });
});
