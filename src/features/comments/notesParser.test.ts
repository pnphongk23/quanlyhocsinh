import { describe, expect, it } from "vitest";
import { parseNotes, type NoteImportOptions, type NoteRosterStudent } from "./notesParser";
import { readGoldenFixture } from "../../test/goldenFixture";

interface GoldenNotes {
  roster: { students: NoteRosterStudent[]; previousHomework: Record<string, string> };
  cases: Array<{ id: string; input: string; options: NoteImportOptions; expect: unknown }>;
}

/** Bộ ca vàng nằm trong repo (dữ liệu riêng tư); thiếu file thì lỗi rõ ràng, không bỏ qua. */
const golden = readGoldenFixture<GoldenNotes>("golden-notes-cases.json");
const roster = golden.roster.students.map(student => ({ ...student, previousHomework: golden.roster.previousHomework[student.id] as NoteRosterStudent["previousHomework"] }));

describe("bộ phân tích ghi chú", () => {
    for (const testCase of golden.cases) {
      it(`đọc đúng ca vàng ${testCase.id}`, () => {
        expect(parseNotes(testCase.input, roster, testCase.options)).toEqual(testCase.expect);
      });
  }
});
