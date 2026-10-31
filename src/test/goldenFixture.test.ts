import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOLDEN_FILES_DIR, GOLDEN_LOCAL_FALLBACK_DIR, GOLDEN_SKIP_REASON, goldenCandidates, pickGoldenPath, readGoldenFixture } from "./goldenFixture";

const FILE = "golden-notes-cases.json";
const envDir = path.join("/tmp", "qlh-golden-env");
const envTarget = path.join(envDir, FILE);
const repoTarget = path.resolve(process.cwd(), GOLDEN_FILES_DIR, FILE);
const localTarget = path.join(GOLDEN_LOCAL_FALLBACK_DIR, FILE);

beforeEach(() => {
  delete process.env.QLH_GOLDEN_DIR;
});

afterEach(() => {
  delete process.env.QLH_GOLDEN_DIR;
});

describe("goldenFixture", () => {
  it("thứ tự tìm fixture: QLH_GOLDEN_DIR, thư mục repo, rồi máy dev", () => {
    expect(goldenCandidates(FILE)).toEqual([repoTarget, localTarget]);
    process.env.QLH_GOLDEN_DIR = envDir;
    expect(goldenCandidates(FILE)).toEqual([envTarget, repoTarget, localTarget]);
  });

  it("lấy chỗ đầu tiên có file và trả null khi không chỗ nào có, để test golden skip thay vì crash", () => {
    expect(pickGoldenPath([envTarget, repoTarget, localTarget], (candidate) => candidate === localTarget)).toBe(localTarget);
    expect(pickGoldenPath([envTarget, repoTarget, localTarget], () => false)).toBeNull();
    expect(readGoldenFixture("khong-co-bo-ca-vang-nay.json")).toBeNull();
    expect(GOLDEN_SKIP_REASON).toBe("golden fixture is private and not in the repo");
  });
});
