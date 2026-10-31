import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOLDEN_FILES_DIR, goldenCandidates, goldenFixturePath, readGoldenFixture } from "./goldenFixture";

const FILE = "golden-notes-cases.json";
const envDir = path.join("/tmp", "qlh-golden-env");
const envTarget = path.join(envDir, FILE);
const repoTarget = path.join(GOLDEN_FILES_DIR, FILE);

beforeEach(() => {
  delete process.env.QLH_GOLDEN_DIR;
});

afterEach(() => {
  delete process.env.QLH_GOLDEN_DIR;
});

describe("goldenFixture", () => {
  it("dò fixture trong thư mục repo suy ra từ vị trí helper, độc lập cwd", () => {
    // Gốc repo tính từ file helper: `plans/` nằm cạnh `src/`, không dựa vào process.cwd().
    expect(path.isAbsolute(GOLDEN_FILES_DIR)).toBe(true);
    expect(existsSync(path.join(GOLDEN_FILES_DIR, "..", "..", "src", "test", "goldenFixture.ts"))).toBe(true);
    expect(goldenCandidates(FILE)).toEqual([repoTarget]);
    expect(goldenFixturePath(FILE)).toBe(repoTarget);
    expect(readGoldenFixture<{ cases: unknown[] }>(FILE).cases.length).toBeGreaterThan(0);
  });

  it("đặt QLH_GOLDEN_DIR thì dùng bản đó trước, rồi mới tới thư mục repo", () => {
    process.env.QLH_GOLDEN_DIR = envDir;
    expect(goldenCandidates(FILE)).toEqual([envTarget, repoTarget]);
    // Bản riêng không có thì quay về fixture trong repo.
    expect(goldenFixturePath(FILE)).toBe(repoTarget);
  });

  it("thiếu fixture là lỗi ENOENT nêu đường dẫn đã thử, không bỏ qua", () => {
    expect(() => goldenFixturePath("khong-co-bo-ca-vang-nay.json")).toThrowError(/ENOENT: không thấy golden fixture "khong-co-bo-ca-vang-nay\.json"\. Đã thử: /);
    expect(() => readGoldenFixture("khong-co-bo-ca-vang-nay.json")).toThrowError(/ENOENT/);
  });
});
