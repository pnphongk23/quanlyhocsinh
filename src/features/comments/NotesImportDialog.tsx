import { useMemo, useState } from "react";
import type { TicketRow } from "../../data/homework";
import { saveNotesImportDurable } from "../../data/repositories/comments";
import type { Attendance, HomeworkGrade } from "../../data/types";
import { Button, Modal } from "../../shared/ui";
import { defaultSlipCriteria } from "../../data/slip";
import { resetSessionDrafts } from "./draftStore";
import CriteriaMode from "./CriteriaMode";
import { normalizeNoteText, parseNotes, type NoteCriterion, type NoteImportOptions, type NoteRosterStudent, type NotesParseResult } from "./notesParser";
import s from "./notesImport.module.css";

const criterionKeys: NoteCriterion[] = ["attention", "notes", "participation", "order", "homework"];
const criterionLabels = ["Chú ý nghe giảng", "Ghi chép đầy đủ", "Tham gia hoạt động sôi nổi", "Không mất trật tự", "Hoàn thành BTVN"];
type DraftChange = { uncheckMask: number; appendNote: string[]; hwManual: boolean; isNew: boolean; isDefault: boolean };

function nameFor(studentId: string, rows: TicketRow[]): string {
  return rows.find(row => row.student.id === studentId)?.student.name ?? studentId;
}

export default function NotesImportDialog({ sessionId, rows, attendance, previousGrades, onClose }: {
  sessionId: string;
  rows: TicketRow[];
  attendance: Attendance[];
  previousGrades: (studentId: string) => readonly HomeworkGrade[] | null;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [includePraise, setIncludePraise] = useState(false);
  const [includeSent, setIncludeSent] = useState(false);
  const [createDefaultsForRest, setCreateDefaultsForRest] = useState(true);
  const [parsed, setParsed] = useState<NotesParseResult | null>(null);
  const [overrides, setOverrides] = useState<Record<number, NoteCriterion | null>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftChange>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ locallySaved: number; waiting: number; applied: number; rejected: number } | null>(null);

  const roster: NoteRosterStudent[] = useMemo(() => rows.map(row => {
    const mark = attendance.find(item => item.sessionId === sessionId && item.studentId === row.student.id);
    const criteria = row.comment?.criteria ?? (row.comment?.stars == null ? 31 : (1 << row.comment.stars) - 1);
    const unchecked = criterionKeys.filter((_, index) => (criteria & (1 << index)) === 0);
    const grades = previousGrades(row.student.id) ?? [];
    return {
      id: row.student.id,
      fullName: row.student.name,
      enrollment: "active",
      attendance: mark?.status ?? "not_marked",
      ...(row.comment ? { slip: { state: row.comment.sendQueued ? "queued_send" as const : row.comment.status, scale: row.comment.scale ?? 3, unchecked, note: row.comment.note } } : {}),
      ...(grades.some(grade => grade.level === "not_done") ? { previousHomework: "not_done" as const } : grades.length ? { previousHomework: "done" as const } : {}),
    };
  }), [rows, attendance, sessionId, previousGrades]);

  function makeDrafts(result: NotesParseResult): Record<string, DraftChange> {
    const next: Record<string, DraftChange> = {};
    const rowById = new Map(rows.map(row => [row.student.id, row]));
    for (const change of result.changes) {
      const row = rowById.get(change.studentId);
        const uncheckMask = change.uncheck.reduce((mask, c) => mask | (1 << criterionKeys.indexOf(c)), 0);
        const additions = change.appendNote.filter(line => !normalizeNoteText(row?.comment?.note ?? "").includes(normalizeNoteText(line)));
        next[change.studentId] = { uncheckMask, appendNote: additions, hwManual: change.hwManual, isNew: change.isNewSlip, isDefault: false };
      }
      for (const item of result.defaultSlips ?? []) {
        next[item.studentId] = { uncheckMask: 0, appendNote: [], hwManual: false, isNew: true, isDefault: true };
      }
    return next;
  }

  function preview() {
    const options: NoteImportOptions = { includePraise, includeSent, createDefaultsForRest, criterionOverrides: overrides };
    const result = parseNotes(text, roster, options);
    setParsed(result);
    setDrafts(makeDrafts(result));
    setError("");
  }

  function updateOverride(index: number, value: string) {
    const next = { ...overrides, [index]: value === "review" ? null : value as NoteCriterion };
    setOverrides(next);
    const result = parseNotes(text, roster, { includePraise, includeSent, createDefaultsForRest, criterionOverrides: next });
    setParsed(result);
    setDrafts(makeDrafts(result));
  }

  function updateOption(key: "includePraise" | "includeSent" | "createDefaultsForRest", value: boolean) {
    if (key === "includePraise") setIncludePraise(value);
    if (key === "includeSent") setIncludeSent(value);
    if (key === "createDefaultsForRest") setCreateDefaultsForRest(value);
    if (!parsed) return;
    const options = { includePraise, includeSent, createDefaultsForRest, criterionOverrides: overrides, [key]: value };
    const result = parseNotes(text, roster, options);
    setParsed(result);
    setDrafts(makeDrafts(result));
  }

  function toggleCriterion(studentId: string, index: number) {
    const row = rows.find(item => item.student.id === studentId);
    if (!row || row.comment?.scale === 3) return;
    setDrafts(current => {
      const existing = current[studentId];
        const baseline = row.comment?.criteria ?? (row.comment?.stars == null ? defaultSlipCriteria(previousGrades(studentId)) : (1 << row.comment.stars) - 1);
        const draft = existing ?? { uncheckMask: 0, appendNote: [], hwManual: false, isNew: !row.comment, isDefault: false };
        return { ...current, [studentId]: { ...draft, uncheckMask: ((baseline & ~draft.uncheckMask) & (1 << index)) === 0 ? draft.uncheckMask & ~(1 << index) : draft.uncheckMask | (1 << index), hwManual: index === 4 ? true : draft.hwManual, isNew: draft.isNew, isDefault: false } };
    });
  }

  const baselineByStudent = new Map(rows.map(row => [row.student.id, row.comment?.criteria ?? (row.comment?.stars == null ? defaultSlipCriteria(previousGrades(row.student.id)) : (1 << row.comment.stars) - 1)]));
  const dirtyDrafts = Object.entries(drafts).filter(([studentId, draft]) => {
    const row = rows.find(item => item.student.id === studentId);
    return draft.isNew || draft.uncheckMask !== 0 || draft.appendNote.length > 0 || draft.hwManual;
  });
  const newCount = dirtyDrafts.filter(([, value]) => value.isNew).length;
  const changeCount = dirtyDrafts.length - newCount;

  async function save() {
    setBusy(true);
    setError("");
    try {
          const result = await saveNotesImportDurable(sessionId, dirtyDrafts.map(([studentId, value]) => ({
            studentId,
            ...(!value.isDefault && value.uncheckMask ? { uncheckMask: value.uncheckMask } : {}),
            ...(value.appendNote.length ? { appendNote: value.appendNote } : {}),
            ...(value.hwManual ? { hwManual: true } : {}),
            ...(value.isDefault ? { isDefault: true } : {}),
          })));
        resetSessionDrafts(sessionId);
        setSaved(result);
      setText("");
      setParsed(null);
    } catch {
      setError("Không lưu được đợt nhập. Dữ liệu vẫn được giữ để thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const previewCriteria = Object.fromEntries(rows.map(row => [row.student.id, (baselineByStudent.get(row.student.id) ?? 31) & ~(drafts[row.student.id]?.uncheckMask ?? 0)]));
  const criteriaPreview = parsed ? {
    banner: "Gợi ý từ ghi chú, kiểm tra rồi Lưu",
      summary: `${changeCount} phiếu sẽ đổi, ${newCount} phiếu mới${(parsed.skipped.length + (parsed.defaultSlipsSkipped?.length ?? 0)) ? ` · ${parsed.skipped.length + (parsed.defaultSlipsSkipped?.length ?? 0)} phiếu bỏ qua` : ""}`,
    criteriaByStudent: previewCriteria,
      onToggle: toggleCriterion,
      includeSent,
  } : undefined;

  return <Modal open sheet onClose={onClose} title="Nhập từ ghi chú" footer={
    <div className={s.actions}>
      <Button variant="neutral" onClick={onClose} disabled={busy}>Huỷ</Button>
      {parsed ? <Button onClick={() => void save()} disabled={busy || !dirtyDrafts.length} loading={busy}>Lưu</Button> : <Button onClick={preview} disabled={!text.trim()}>Xem trước</Button>}
    </div>
  }>
    <div className={s.body}>
          {saved !== null && <p className={s.success} role="status">Lưu cục bộ: {saved.locallySaved} · Chờ đồng bộ: {saved.waiting} · Đã áp dụng: {saved.applied} · Bị từ chối: {saved.rejected}</p>}
      {!parsed ? <>
        <label className={s.label} htmlFor="notes-import-text">Dán ghi chú theo dạng “Lý do: tên, tên”</label>
          <textarea id="notes-import-text" className={s.textarea} value={text} onChange={event => { setText(event.target.value); setOverrides({}); }} rows={8} />
      </> : <>
        <div className={s.lines}>
          {parsed.lines.map((line, index) => <div className={s.line} key={`${index}:${line.phrase}`}>
            <span>{line.phrase}</span>
            <label className={s.lineSelectLabel}>
              <span className={s.visuallyHidden}>Tiêu chí cho cụm {line.phrase}</span>
              <select value={Object.prototype.hasOwnProperty.call(overrides, index) ? overrides[index] ?? "review" : line.criterion ?? "review"} onChange={event => updateOverride(index, event.target.value)}>
                <option value="review">Cần xem · ghi thêm</option>
                {criterionKeys.map((criterion, criterionIndex) => <option value={criterion} key={criterion}>{criterionLabels[criterionIndex]}</option>)}
              </select>
            </label>
            <span className={s.lineNames}>{line.names.map((name, nameIndex) => {
              const normalized = normalizeNoteText(name.raw);
              const suggestions = name.status === "unmatched" ? roster.filter(student => normalizeNoteText(student.fullName).split(" ").some(part => part.includes(normalized) || (normalized.length >= 4 && part.startsWith(normalized.slice(0, 3))))).slice(0, 3).map(student => student.fullName) : [];
                return <span key={`${name.raw}:${nameIndex}`}>
                  {nameIndex ? ", " : ""}{name.status === "matched" ? nameFor(name.studentIds[0], rows) : name.raw}
                  {name.status === "ambiguous" && <small> · Trùng tên</small>}
                  {name.status === "excluded" && <small> · {name.reason === "left" ? "Đã rời lớp" : "Chưa vào lớp"}</small>}
                  {name.status === "held" && <small> · Chưa áp dụng</small>}
                  {name.status === "unmatched" && <small> · Chưa khớp{suggestions.length ? `, gợi ý: ${suggestions.join(", ")}` : ""}</small>}
                  {name.warnings?.includes("absent") && <small> · Vắng</small>}
                </span>;
            })}</span>
          </div>)}
        </div>
        {parsed.unparsedLines.length > 0 && <p className={s.warning}>Có {parsed.unparsedLines.length} dòng chưa nhận dạng; các dòng này chưa được áp dụng.</p>}
        {parsed.warnings.includes("whole_class") && <p className={s.warning}>Cụm nói về cả lớp chưa được tự áp dụng cho học sinh nào.</p>}
          {(parsed.skipped.length + (parsed.defaultSlipsSkipped?.length ?? 0)) > 0 && <p className={s.warning}>{parsed.skipped.length + (parsed.defaultSlipsSkipped?.length ?? 0)} phiếu bỏ qua, gồm phiếu đã gửi/đang chờ gửi, phiếu thang cũ hoặc em Vắng.</p>}
        <CriteriaMode rows={rows} sessionId={sessionId} canWrite preview={criteriaPreview} previousGrades={previousGrades} />
        {parsed.changes.some(change => change.appendNote.length) && <div className={s.notePreview}>
          <strong>Phần gõ thêm</strong>
          {parsed.changes.filter(change => change.appendNote.length).map(change => <p key={change.studentId}>{nameFor(change.studentId, rows)}: {change.appendNote.join(" ")}</p>)}
        </div>}
        <Button variant="neutral" onClick={() => setParsed(null)} disabled={busy}>Sửa ghi chú</Button>
      </>}
      <div className={s.options}>
        <label className={s.check}><input type="checkbox" checked={includePraise} onChange={event => updateOption("includePraise", event.target.checked)} /> Thêm câu khen khi có tên học sinh</label>
        <label className={s.check}><input type="checkbox" checked={includeSent} onChange={event => updateOption("includeSent", event.target.checked)} /> Cho phép sửa phiếu đã gửi hoặc đang chờ gửi</label>
        <label className={s.check}><input type="checkbox" checked={createDefaultsForRest} onChange={event => updateOption("createDefaultsForRest", event.target.checked)} /> Tạo phiếu mặc định cho các em còn lại</label>
      </div>
      {error && <p className={s.error} role="alert">{error}</p>}
    </div>
  </Modal>;
}
