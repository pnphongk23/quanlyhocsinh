export type NoteCriterion = "attention" | "notes" | "participation" | "order" | "homework";
export type NoteRosterStudent = {
  id: string;
  fullName: string;
  attendance: "present" | "late" | "absent" | "not_marked";
  enrollment: "active" | "left" | "not_enrolled_yet";
  slip?: { state: "draft" | "sent" | "queued_send"; scale: 3 | 5; unchecked: NoteCriterion[]; note?: string };
  previousHomework?: "excellent" | "done" | "not_done";
};
export type NoteImportOptions = { includePraise?: boolean; includeSent?: boolean; createDefaultsForRest?: boolean; criterionOverrides?: Record<number, NoteCriterion | null> };
export type NameMatch = { raw: string; status: "matched" | "ambiguous" | "excluded" | "unmatched" | "whole_class" | "held"; studentIds: string[]; tier?: "T1" | "T2" | "T3" | "T4"; reason?: string; warnings?: string[] };
export type ParsedNoteLine = { phrase: string; criterion: NoteCriterion | null; flags: string[]; names: NameMatch[] };
export type NoteChange = { studentId: string; slipState: "none" | "draft" | "sent" | "queued_send"; isNewSlip: boolean; uncheck: NoteCriterion[]; appendNote: string[]; hwManual: boolean; uncheckedAfter: NoteCriterion[]; starsAfter: number };
export type NotesParseResult = { lines: ParsedNoteLine[]; unparsedLines: string[]; changes: NoteChange[]; skipped: Array<{studentId:string;reason:string}>; warnings: string[]; defaultSlips?: Array<{studentId:string;uncheckedAfter:NoteCriterion[];starsAfter:number}>; defaultSlipsDeferred?:string[]; defaultSlipsSkipped?:Array<{studentId:string;reason:string}> };

const criterionKeywords: Record<NoteCriterion, string[]> = {
  attention: ["mat tap trung", "khong chu y", "lo dang", "chua chu y"],
  notes: [], participation: [],
  order: ["noi chuyen rieng", "lam on", "dua nghich", "mat trat tu"],
  homework: ["chua hoan thanh bai tap", "chua hoan thanh btvn", "khong lam bai tap", "khong lam btvn", "chua lam bai tap", "chua lam btvn"],
};
const criteriaOrder: NoteCriterion[] = ["attention", "notes", "participation", "order", "homework"];
const praiseKeywords = ["phat bieu", "hang hai", "tien bo", "xuat sac", "rat tot", "lam tot"];
const negationWords = ["khong", "chua", "it"];
const wholeClassKeywords = ["ca lop", "tat ca", "con lai", "hau het"];

export function normalizeNoteText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}
function editDistanceOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) === 1;
}
function findNameTier(name: string, candidate: NoteRosterStudent[]): { tier: NonNullable<NameMatch["tier"]>; found: NoteRosterStudent[] } | null {
  const tiers: Array<[NonNullable<NameMatch["tier"]>, (student: NoteRosterStudent) => boolean]> = [
    ["T1", student => normalizeNoteText(student.fullName) === name],
    ["T2", student => name.split(" ").length === 1 && normalizeNoteText(student.fullName).split(" ").at(-1) === name],
    ["T3", student => name.split(" ").length > 1 && (` ${normalizeNoteText(student.fullName)} `).includes(` ${name} `)],
    ["T4", student => !name.includes(" ") && name.length >= 4 && editDistanceOne(normalizeNoteText(student.fullName).split(" ").at(-1) ?? "", name)],
  ];
  for (const [tier, matches] of tiers) {
    const found = candidate.filter(matches);
    if (found.length) return { tier, found };
  }
  return null;
}
function matchName(raw: string, roster: NoteRosterStudent[]): NameMatch {
  const name = normalizeNoteText(raw);
  const active = roster.filter(s => s.enrollment === "active");
  const activeMatch = findNameTier(name, active);
  if (activeMatch) return { raw, status: activeMatch.found.length === 1 ? "matched" : "ambiguous", studentIds: activeMatch.found.map(s => s.id), tier: activeMatch.tier, ...(activeMatch.found.length === 1 && activeMatch.found[0].attendance === "absent" ? { warnings: ["absent"] } : {}) };
  for (const enrollment of ["left", "not_enrolled_yet"] as const) {
    const excludedMatch = findNameTier(name, roster.filter(s => s.enrollment === enrollment));
    if (excludedMatch) return { raw, status: "excluded", studentIds: excludedMatch.found.map(s => s.id), reason: enrollment };
  }
  return { raw, status: "unmatched", studentIds: [], reason: "no_match" };
}
function classifyPhrase(phrase: string): { criterion: NoteCriterion | null; flags: string[] } {
  const normalized = normalizeNoteText(phrase);
  const matches = criteriaOrder.filter(criterion => criterionKeywords[criterion].some(keyword => normalized.includes(keyword)));
  if (matches.length === 1) return { criterion: matches[0], flags: [] };
  if (matches.length > 1) return { criterion: null, flags: ["multi_criteria", "needs_review"] };
  const praise = praiseKeywords.some(word => normalized.includes(word)) && !negationWords.some(word => normalized.split(" ").includes(word));
  return { criterion: null, flags: [praise ? "praise" : "needs_review"] };
}
function sentence(phrase: string): string {
  const value = phrase.replace(/\s+/g, " ").trim();
  const capitalized = value ? value[0].toLocaleUpperCase("vi-VN") + value.slice(1) : value;
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
function criterionUnchecked(student: NoteRosterStudent): NoteCriterion[] {
  const set = new Set(student.slip?.unchecked ?? []);
  if (!student.slip && student.previousHomework === "not_done") set.add("homework");
  return criteriaOrder.filter(c => set.has(c));
}

export function parseNotes(input: string, roster: NoteRosterStudent[], options: NoteImportOptions = {}): NotesParseResult {
  const result: NotesParseResult = { lines: [], unparsedLines: [], changes: [], skipped: [], warnings: [] };
  const changes = new Map<string, NoteChange>();
  const ambiguousIds = new Set<string>();
  const noteTexts = new Map(roster.map(s => [s.id, s.slip?.note ?? ""]));
  for (const rawLine of input.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon < 0) { result.unparsedLines.push(trimmed); continue; }
    const phrase = trimmed.slice(0, colon).replace(/\s+/g, " ").trim();
    const rawNames = trimmed.slice(colon + 1).split(/[,;/]|\s+và\s+/i).map(n => n.trim()).filter(Boolean);
    const lineIndex = result.lines.length;
    const classification = options.criterionOverrides && Object.prototype.hasOwnProperty.call(options.criterionOverrides, lineIndex)
      ? (options.criterionOverrides[lineIndex] ? { criterion: options.criterionOverrides[lineIndex]!, flags: [] } : { criterion: null, flags: ["needs_review"] })
      : classifyPhrase(phrase);
    const names: NameMatch[] = rawNames.map(raw => {
      if (wholeClassKeywords.some(k => normalizeNoteText(raw).includes(k))) return { raw, status: "whole_class", studentIds: [] };
      return matchName(raw, roster);
    });
    const whole = names.some(n => n.status === "whole_class");
    if (whole) {
      for (const name of names) if (name.status !== "whole_class") { name.status = "held"; name.studentIds = []; delete name.tier; }
      classification.flags.push("whole_class");
      if (!result.warnings.includes("whole_class")) result.warnings.push("whole_class");
    }
    result.lines.push({ phrase, ...classification, names });
    if (whole) continue;
    for (const name of names) {
      if (name.status === "ambiguous") name.studentIds.forEach(id => ambiguousIds.add(id));
      if (name.status !== "matched") continue;
      const student = roster.find(s => s.id === name.studentIds[0])!;
      const current = changes.get(student.id);
      const praise = classification.flags.includes("praise");
      const append = classification.criterion === null && (!praise || options.includePraise) ? sentence(phrase) : null;
      let shouldAppend = Boolean(append);
      if (append) {
        const normalizedLine = normalizeNoteText(append);
        const existing = normalizeNoteText(noteTexts.get(student.id) ?? "");
        const appended = current?.appendNote ?? [];
        shouldAppend = !existing.includes(normalizedLine) && !appended.some(line => normalizeNoteText(line) === normalizedLine);
      }
      if (praise && !options.includePraise && !classification.criterion) {
        if (!result.skipped.some(s => s.studentId === student.id && s.reason === "praise_not_applied")) result.skipped.push({ studentId: student.id, reason: "praise_not_applied" });
        continue;
      }
      let change = current;
      if (!change) {
        const slip = student.slip;
        if (slip?.scale === 3) { result.skipped.push({ studentId: student.id, reason: "legacy_scale" }); continue; }
        if ((slip?.state === "sent" || slip?.state === "queued_send") && !options.includeSent) { result.skipped.push({ studentId: student.id, reason: slip.state === "sent" ? "sent_slip" : "queued_send" }); continue; }
        change = { studentId: student.id, slipState: slip?.state ?? "none", isNewSlip: !slip, uncheck: [], appendNote: [], hwManual: false, uncheckedAfter: [], starsAfter: 5 };
        changes.set(student.id, change);
      }
      if (append && shouldAppend && !change.appendNote.includes(append)) change.appendNote.push(append);
      if (classification.criterion && !change.uncheck.includes(classification.criterion)) change.uncheck.push(classification.criterion);
      if (classification.criterion === "homework") change.hwManual = true;
    }
  }
  for (const [studentId, change] of changes) {
    const student = roster.find(s => s.id === studentId)!;
    const unchecked = new Set(change.isNewSlip ? criterionUnchecked(student) : student.slip?.unchecked ?? []);
    change.uncheck.forEach(c => unchecked.add(c));
    change.uncheck = criteriaOrder.filter(c => change.uncheck.includes(c));
    change.uncheckedAfter = criteriaOrder.filter(c => unchecked.has(c));
    change.starsAfter = 5 - change.uncheckedAfter.length;
    if (!change.uncheck.length && !change.appendNote.length) { changes.delete(studentId); result.skipped.push({ studentId, reason: "no_change" }); }
  }
  if (result.unparsedLines.length) result.warnings.push("unparsed_lines");
  result.changes = [...changes.values()].sort((a,b) => a.studentId.localeCompare(b.studentId));
  const changedIds = new Set(result.changes.map(c => c.studentId));
  result.skipped = result.skipped.filter(item => item.reason !== "praise_not_applied" || !changedIds.has(item.studentId));
  result.skipped = result.skipped.filter((item,index,array) => array.findIndex(other => other.studentId===item.studentId && other.reason===item.reason)===index).sort((a,b)=>a.studentId.localeCompare(b.studentId));
  if (options.createDefaultsForRest) {
    const defaults = roster.filter(s => s.enrollment === "active" && !s.slip && s.attendance !== "absent" && !changedIds.has(s.id) && !ambiguousIds.has(s.id)).map(s => {
      const unchecked = criterionUnchecked(s); return { studentId: s.id, uncheckedAfter: unchecked, starsAfter: 5-unchecked.length };
    });
    result.defaultSlips = defaults.sort((a,b)=>a.studentId.localeCompare(b.studentId));
    result.defaultSlipsDeferred = [...ambiguousIds].sort();
    result.defaultSlipsSkipped = roster.filter(s=>s.enrollment === "active" && !s.slip && s.attendance === "absent" && !changedIds.has(s.id)).map(s=>({studentId:s.id,reason:"absent"})).sort((a,b)=>a.studentId.localeCompare(b.studentId));
  }
  return result;
}
