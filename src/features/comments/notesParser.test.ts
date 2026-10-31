import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNotes, type NoteImportOptions, type NoteRosterStudent } from "./notesParser";

const golden = JSON.parse(readFileSync("/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/golden-notes-cases.json", "utf8")) as {
  roster: { students: NoteRosterStudent[]; previousHomework: Record<string, string> };
  cases: Array<{ id: string; input: string; options: NoteImportOptions; expect: unknown }>;
};
const roster = golden.roster.students.map(student => ({ ...student, previousHomework: golden.roster.previousHomework[student.id] as NoteRosterStudent["previousHomework"] }));

describe("bộ phân tích ghi chú", () => {
    for (const testCase of golden.cases) {
      it(`đọc đúng ca vàng ${testCase.id}`, () => {
        expect(parseNotes(testCase.input, roster, testCase.options)).toEqual(testCase.expect);
      });
  }
});
