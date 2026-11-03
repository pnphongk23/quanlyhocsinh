import { afterEach, describe, expect, it, vi } from "vitest";
import { FEATURE_NOTES_IMPORT, criteriaLevelsEnabled } from "./featureFlags";

describe("cờ VITE_CRITERIA_LEVELS", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("mặc định tắt (không có trong bản build dev/staging ngoài .env.dev)", () => {
    expect(criteriaLevelsEnabled()).toBe(false);
    expect(FEATURE_NOTES_IMPORT).toBe(false);
  });

  it("chỉ bật khi biến bằng đúng chuỗi 1", () => {
    vi.stubEnv("VITE_CRITERIA_LEVELS", "1");
    expect(criteriaLevelsEnabled()).toBe(true);

    vi.stubEnv("VITE_CRITERIA_LEVELS", "true");
    expect(criteriaLevelsEnabled()).toBe(false);

    vi.stubEnv("VITE_CRITERIA_LEVELS", "0");
    expect(criteriaLevelsEnabled()).toBe(false);
  });
});
