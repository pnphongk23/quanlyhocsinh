import { describe, expect, it } from "vitest";
import { DEFAULT_API_BASE, resolveApiBase } from "../data/api/baseUrl";

describe("API base URL configuration", () => {
  it("defaults to the existing staging API", () => {
    expect(resolveApiBase()).toBe("https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1");
    expect(resolveApiBase()).toBe(DEFAULT_API_BASE);
  });

  it("uses a configured build-time API base", () => {
    expect(resolveApiBase("https://qlh-dev-api.tolaphamnhuphong.workers.dev/v1"))
      .toBe("https://qlh-dev-api.tolaphamnhuphong.workers.dev/v1");
  });
});
