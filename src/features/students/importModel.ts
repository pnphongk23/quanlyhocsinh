import { normalizePhone } from "../../data/auth/phone";
import type { Student } from "../../data/types";

export type ImportRow = {
  id: string;
  line: number;
  name: string;
  phone: string;
  included: boolean;
  forceAdd: boolean;
};

export type ImportAssessment = ImportRow & {
  phoneInvalid: boolean;
  suspiciousName: boolean;
  duplicateInPaste: boolean;
  match: "none" | "same" | "name";
  status: "add" | "skip_existing" | "skip_duplicate_in_paste" | "needs_fix";
  flags: string[];
};

export function normalizeStudentName(value: string): string {
  const lower = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
  return lower.replace(/(^|[^\p{L}])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase("vi-VN"));
}

export function comparableStudentName(value: string): string {
  return value.toLocaleLowerCase("vi-VN").replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function delimiterFor(firstLine: string): string {
  let best = "\t", bestCount = -1;
  for (const delimiter of ["\t", ";", ","]) {
    let quoted = false, count = 0;
    for (let i = 0; i < firstLine.length; i++) {
      if (firstLine[i] === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && firstLine[i] === delimiter) count++;
    }
    if (count > bestCount) { best = delimiter; bestCount = count; }
  }
  return best;
}

function splitDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) { row.push(cell); cell = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function cleanLine(value: string): string {
  return value.replace(/^\s*(?:\d+\s*[.):]|\d+\s*[-–—]|\d{1,3}\s+(?=\p{L}))/u, "").replace(/\s+/g, " ").trim();
}

function phoneLike(value: string): boolean {
  const compact = value.replace(/[\s().-]/g, "");
  return compact.replace(/\D/g, "").length >= 8 && /^\+?\d+$/.test(compact);
}

function trailingPhone(value: string): { name: string; phone: string } | null {
  const match = value.match(/(?:^|\s)((?:\+?84|0)[\d\s().-]+)$/);
  if (!match || !phoneLike(match[1])) return null;
  return { name: value.slice(0, match.index).trim(), phone: match[1].trim() };
}

function isHeader(cells: string[]): boolean {
  const text = cells.join(" ").toLocaleLowerCase("vi-VN").replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /ho\s*(?:va\s*)?ten|ten hoc sinh/.test(text) && /sdt|dien thoai|phone/.test(text);
}

export function parseStudentsImport(text: string, makeId: () => string = () => crypto.randomUUID()): ImportRow[] {
  const source = text.replace(/^\uFEFF/, "");
  const lines = source.split(/\r?\n/);
  const firstDataLine = lines.find((line) => line.trim()) ?? "";
  const preferredDelimiter = delimiterFor(firstDataLine);
  const rows: ImportRow[] = [];
  let firstNonEmpty = true;
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    let delimiter = preferredDelimiter;
    if (!line.includes(delimiter)) delimiter = delimiterFor(line);
    let cells = splitDelimited(line, delimiter)[0] ?? [line];
    if (firstNonEmpty && isHeader(cells)) { firstNonEmpty = false; return; }
    firstNonEmpty = false;
    if (cells.length > 1 && /^\d{1,3}$/.test(cells[0].trim())) cells = cells.slice(1);
    const cleaned = cells.map((cell) => cell.trim().replace(/\s+/g, " ")).filter(Boolean);
    let phoneIndex = cleaned.findIndex((cell) => normalizePhone(cell) !== null || phoneLike(cell));
    let rawPhone = phoneIndex >= 0 ? cleaned[phoneIndex] : "";
    let rawName = phoneIndex >= 0 ? cleaned.filter((_, cellIndex) => cellIndex !== phoneIndex).join(" ") : cleaned.join(" ");
    rawName = cleanLine(rawName);
    if (phoneIndex < 0) {
      const suffix = trailingPhone(rawName);
      if (suffix) { rawName = suffix.name; rawPhone = suffix.phone; }
    }
    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null;
    rows.push({ id: makeId(), line: index + 1, name: normalizeStudentName(rawName), phone: normalizedPhone ?? rawPhone, included: true, forceAdd: false });
  });
  return rows;
}

export function assessImportRows(rows: ImportRow[], existing: Student[]): ImportAssessment[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const normalizedPhone = row.phone ? normalizePhone(row.phone) : null;
    const phoneInvalid = Boolean(row.phone && !normalizedPhone);
    const key = comparableStudentName(row.name);
    const suspiciousName = !row.name || /\d|[^\p{L}\s.'’\-]/u.test(row.name);
    const phoneKey = normalizedPhone ?? row.phone.replace(/\D/g, "");
    const pair = `${key}|${phoneKey}`;
    const duplicateInPaste = Boolean(key && seen.has(pair));
    if (key) seen.add(pair);
    const named = existing.filter((student) => student.status === "active" && comparableStudentName(student.name) === key);
    const match = named.some((student) => normalizedPhone && normalizePhone(student.parentPhone) === normalizedPhone) ? "same" : named.length ? "name" : "none";
    const flags = [!row.name ? "missing_name" : "", phoneInvalid ? "invalid_phone" : "", suspiciousName && row.name ? "suspicious_name" : "", duplicateInPaste ? "duplicate_in_paste" : "", match === "name" ? "same_name_different_phone" : ""].filter(Boolean);
    const status: ImportAssessment["status"] = flags.includes("missing_name") || phoneInvalid || suspiciousName ? "needs_fix" : duplicateInPaste ? "skip_duplicate_in_paste" : match === "same" && !row.forceAdd ? "skip_existing" : "add";
    return { ...row, phone: normalizedPhone ?? row.phone, phoneInvalid, suspiciousName, duplicateInPaste, match, flags, status };
  });
}

export function shouldCreateImportRow(row: ImportAssessment): boolean {
  return row.included && (row.status === "add" || (row.match === "same" && row.forceAdd && row.status !== "needs_fix"));
}

export function importSizeWarnings(existingCount: number, addCount: number): string[] {
  if (existingCount + addCount < 20) return ["under_20"];
  if (existingCount >= 20 || existingCount + addCount > 20) return ["over_20"];
  return [];
}
