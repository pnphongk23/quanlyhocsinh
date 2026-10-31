import { describe, expect, it } from "vitest";
import type { Student } from "../../data/types";
import { normalizePhone } from "../../data/auth/phone";
import { GOLDEN_SKIP_REASON, readGoldenFixture } from "../../test/goldenFixture";
import { assessImportRows, comparableStudentName, importSizeWarnings, normalizeStudentName, parseStudentsImport, shouldCreateImportRow } from "./importModel";

interface GoldenImportSuite {
  existingRoster: Array<{ id: string; fullName: string; guardianPhone: string | null }>;
  cases: Array<{ id: string; input: string; existingStudentCount: number; expect: { rows: Array<{ name: string | null; guardianPhone: string | null; flags: string[]; status: string }>; addCount: number; warnings: string[] } }>;
}

/** Fixture riêng tư (không có trong repo/CI): thiếu thì bỏ qua, không đọc file lúc import. */
const goldenImport = readGoldenFixture<GoldenImportSuite>("golden-import-cases.json");

const student = (id: string, name: string, parentPhone: string): Student => ({ id, classId: "class-1", name, parentPhone, enrolledAt: "2026-01-01", leftAt: null, status: "active" });

describe("student list import", () => {
  it("parses numbered names and common Vietnamese phone formats", () => {
    const phones = ["0912 345 678", "+84 912.345.679", "84 912 345 680", "0912345681"];
    const input = Array.from({ length: 20 }, (_, index) => `${String(index + 1).padStart(2, "0")} - học sinh ${index + 1}\t${phones[index % phones.length]}`).join("\n");
    const rows = parseStudentsImport(input, () => "row-id");
    expect(rows).toHaveLength(20);
    expect(rows[0]).toMatchObject({ name: "Học Sinh 1", phone: "+84912345678" });
    expect(rows[1].phone).toBe("+84912345679");
    expect(rows[2].phone).toBe("+84912345680");
  });

  it("supports quoted CSV cells and spreadsheet tab columns", () => {
    expect(parseStudentsImport('"An, Nguyễn",0912 345 678').map((row) => row.name)).toEqual(["An, Nguyễn"]);
    expect(parseStudentsImport('"Bình; Trần"; +84 912 345 679').map((row) => row.name)).toEqual(["Bình; Trần"]);
    expect(parseStudentsImport("Họ và tên\tSố điện thoại\n01) an nguyễn\t0912 345 678")).toMatchObject([{ name: "An Nguyễn", phone: "+84912345678" }]);
  });

  it("normalizes Vietnamese names without losing accents and compares without them", () => {
    expect(normalizeStudentName("  nGUYỄN   thỊ   an ")).toBe("Nguyễn Thị An");
    expect(comparableStudentName("Đỗ THỊ Hương")).toBe(comparableStudentName("Do Thi Huong"));
  });

  it("distinguishes same student, same name, and sibling phone matches", () => {
    const parsed = parseStudentsImport("Lan\t0912 345 678\nLan\t0912 345 679\nMai\t0912 345 678", () => crypto.randomUUID());
    const existing = [student("s1", "Lân", "+84912345678")];
    const result = assessImportRows(parsed, existing);
    expect(result.map((row) => row.match)).toEqual(["same", "name", "none"]);
    expect(result.map(shouldCreateImportRow)).toEqual([false, true, true]);
    expect(assessImportRows([{ ...parsed[0], forceAdd: true }], existing)[0].match).toBe("same");
  });

  it("marks pasted duplicates and invalid phone numbers without creating them", () => {
      const rows = parseStudentsImport("Chi\t0912 345 678\nChi\t0912 345 678\nMai\t091234567\n01 - Nam 4");
    const assessed = assessImportRows(rows, []);
    expect(assessed[1].duplicateInPaste).toBe(true);
    expect(assessed[2]).toMatchObject({ phoneInvalid: true, duplicateInPaste: false });
    expect(shouldCreateImportRow(assessed[2])).toBe(false);
    expect(assessed[3].suspiciousName).toBe(true);
  });

  it.skipIf(goldenImport === null)("matches every checked in golden import case without copying its data", () => {
    const suite = goldenImport!;
    const roster = suite.existingRoster.map((item) => student(item.id, item.fullName, item.guardianPhone ?? ""));
    for (const testCase of suite.cases) {
      const rows = assessImportRows(parseStudentsImport(testCase.input), roster);
      expect(rows.map((row) => ({
        name: row.name || null,
        guardianPhone: row.phoneInvalid ? null : normalizePhone(row.phone),
        flags: row.flags,
        status: row.status,
      })), testCase.id).toEqual(testCase.expect.rows);
      expect(rows.filter((row) => row.status === "add").length, testCase.id).toBe(testCase.expect.addCount);
      expect(importSizeWarnings(testCase.existingStudentCount, testCase.expect.addCount), testCase.id).toEqual(testCase.expect.warnings);
    }
  });

  if (goldenImport === null) it.skip(`golden import fixture: ${GOLDEN_SKIP_REASON}`, () => {});
});
