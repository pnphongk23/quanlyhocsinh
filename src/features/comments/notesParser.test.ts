import { describe, expect, it } from "vitest";
import { parseNotes, type NoteImportOptions, type NoteRosterStudent } from "./notesParser";
import { GOLDEN_SKIP_REASON, readGoldenFixture } from "../../test/goldenFixture";

interface GoldenNotes {
  roster: { students: NoteRosterStudent[]; previousHomework: Record<string, string> };
  cases: Array<{ id: string; input: string; options: NoteImportOptions; expect: unknown }>;
}

/** Fixture riêng tư (không có trong repo/CI): thiếu thì bỏ qua, không đọc file lúc import. */
const golden = readGoldenFixture<GoldenNotes>("golden-notes-cases.json");
const roster = (golden?.roster.students ?? []).map(student => ({ ...student, previousHomework: golden!.roster.previousHomework[student.id] as NoteRosterStudent["previousHomework"] }));

describe.skipIf(golden === null)("bộ phân tích ghi chú", () => {
  for (const testCase of golden?.cases ?? []) {
    it(`đọc đúng ca vàng ${testCase.id}`, () => {
      expect(parseNotes(testCase.input, roster, testCase.options)).toEqual(testCase.expect);
    });
  }
});

if (golden === null) it.skip(`golden notes fixture: ${GOLDEN_SKIP_REASON}`, () => {});
