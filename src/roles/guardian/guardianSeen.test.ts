import { beforeEach, describe, expect, it, vi } from "vitest";

const identity = vi.hoisted(() => ({ userId: "user-a", membershipId: "membership-a" }));
vi.mock("../../data/auth/session", () => ({
  getSession: () => ({
    user: { id: identity.userId },
    activeMembershipId: identity.membershipId,
  }),
}));

import { markSessionSeen, seenSessionIds } from "./guardianSeen";

beforeEach(() => {
  localStorage.clear();
  identity.userId = "user-a";
  identity.membershipId = "membership-a";
});

describe("guardian seen state", () => {
  it("keeps viewed sessions isolated by user and membership", () => {
    markSessionSeen("student-a", "session-a");
    expect(seenSessionIds("student-a").has("session-a")).toBe(true);

    identity.membershipId = "membership-b";
    expect(seenSessionIds("student-a").has("session-a")).toBe(false);
    markSessionSeen("student-a", "session-b");

    identity.userId = "user-b";
    identity.membershipId = "membership-a";
    expect(seenSessionIds("student-a").size).toBe(0);

    identity.userId = "user-a";
    identity.membershipId = "membership-a";
    expect(seenSessionIds("student-a").has("session-a")).toBe(true);
    expect(seenSessionIds("student-a").has("session-b")).toBe(false);
  });
});
