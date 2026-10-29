import { useMemo, useState } from "react";
import type { Student } from "../../data/types";
import { createStudentWithId } from "../../data/repositories/students";
import { todayISO } from "../../shared/format";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button, Modal } from "../../shared/ui";
import { assessImportRows, importSizeWarnings, parseStudentsImport, shouldCreateImportRow, type ImportRow } from "./importModel";
import s from "./importStudents.module.css";

export default function ImportStudentsDialog({ classId, existing, onClose }: { classId: string; existing: Student[]; onClose: () => void }) {
  const online = useOnline();
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState("");
  const assessed = useMemo(() => assessImportRows(rows, existing), [rows, existing]);
  const pending = assessed.filter((row) => shouldCreateImportRow(row) && !created.includes(row.id));
  const selected = assessed.filter(shouldCreateImportRow);
  const activeCount = existing.filter((student) => student.status === "active").length;
  const sizeWarnings = selected.length > 0 ? importSizeWarnings(activeCount, selected.length) : [];

  function replaceText(value: string) {
    setRaw(value);
    setRows(parseStudentsImport(value));
    setCreated([]);
    setAttempted(false);
    setErrors({});
    setProgress(0);
    setFileError("");
  }

  function edit(id: string, patch: Partial<ImportRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
    setErrors((current) => { const next = { ...current }; delete next[id]; return next; });
  }

  function readFile(file?: File) {
    if (!file) return;
    if (!file.name.toLocaleLowerCase("vi-VN").endsWith(".csv")) { setFileError("Chọn tệp có định dạng .csv."); return; }
    const reader = new FileReader();
    reader.onload = () => replaceText(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setFileError("Không đọc được tệp. Hãy thử lại.");
    reader.readAsText(file, "utf-8");
  }

  async function createRemaining() {
    if (!online || busy || pending.length === 0) return;
    setAttempted(true);
    setRaw("");
    setBusy(true);
    let done = created.length;
    setProgress(done);
    const enrolledAt = todayISO();
    const failed: Record<string, string> = {};
    for (const row of pending) {
      if (!navigator.onLine) { failed[row.id] = "Cần có mạng. Các dòng còn lại chưa được gửi."; break; }
      try {
        const phone = row.phone.trim();
        await createStudentWithId(row.id, { classId, name: row.name.trim(), parentPhone: phone, enrolledAt });
        setCreated((current) => [...current, row.id]);
        done++;
        setProgress(done);
      } catch {
        failed[row.id] = "Không thêm được dòng này. Bạn có thể thử lại.";
        break;
      }
    }
    setErrors((current) => ({ ...current, ...failed }));
    setBusy(false);
    if (Object.keys(failed).length === 0) onClose();
  }

  const finishCount = selected.length;
  return (
    <Modal
      title="Nhập danh sách học sinh"
      open
      sheet
      onClose={onClose}
      beforeClose={() => !busy}
      footer={<div className={s.footer}>
        <span className={s.progress} aria-live="polite">{busy ? `Đã tạo ${progress}/${finishCount}` : created.length ? `Đã tạo ${created.length}/${finishCount}` : ""}</span>
        <Button size="lg" disabled={!online || busy || pending.length === 0} loading={busy} onClick={() => void createRemaining()}>
          {online ? `Thêm ${pending.length} học sinh` : "Cần có mạng"}
        </Button>
      </div>}
    >
      <div className={s.content}>
        <p className={s.note}>Dán các cột tên và SĐT phụ huynh, hoặc chọn tệp CSV. Số điện thoại sẽ được chuẩn hoá theo mã +84.</p>
        <label className={s.label} htmlFor="student-import-text">Danh sách cần nhập</label>
        <textarea id="student-import-text" className={s.textarea} value={raw} disabled={busy || attempted} onChange={(event) => replaceText(event.target.value)} rows={5} placeholder={'1. Nguyễn Thị An\t0912 345 678'} />
        <label className={s.fileLabel}>Chọn tệp .csv<input type="file" accept=".csv,text/csv" disabled={busy || attempted} onChange={(event) => readFile(event.target.files?.[0])} /></label>
        {fileError && <p role="alert" className={s.error}>{fileError}</p>}
        {!online && <p className={s.warning}>Cần có mạng để thêm học sinh.</p>}
        {sizeWarnings.includes("under_20") && <p className={s.warning}>Sau khi thêm, lớp sẽ có {activeCount + selected.length} học sinh (dưới 20 em).</p>}
        {sizeWarnings.includes("over_20") && <p className={s.warning}>Sau khi thêm, lớp có thể vượt mốc 20 học sinh. Hiện có {activeCount} em đang học.</p>}
        {assessed.length > 0 && <p className={s.summary}>Xem trước · {assessed.length} dòng · {selected.length} sẽ được thêm</p>}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead><tr><th>Tên học sinh</th><th>SĐT phụ huynh</th><th>Trạng thái</th><th aria-label="Bỏ dòng" /></tr></thead>
            <tbody>{assessed.map((row) => {
              const same = row.match === "same" && !row.forceAdd;
              const warnings = [!row.name && "Thiếu tên", row.phoneInvalid && "SĐT chưa đúng định dạng", row.suspiciousName && row.name && "Kiểm tra tên", row.duplicateInPaste && "Trùng tên và SĐT trong danh sách", row.match === "same" && (row.forceAdd ? "Đã có trong lớp · sẽ thêm" : "Đã có trong lớp"), row.match === "name" && "Trùng tên, vẫn sẽ thêm"].filter(Boolean);
              return <tr key={row.id} className={same ? s.skipped : undefined}>
                <td><label className={s.mobileLabel}>Tên học sinh</label><input disabled={busy || created.includes(row.id)} aria-label={`Tên học sinh dòng ${row.line}`} value={row.name} onChange={(event) => edit(row.id, { name: event.target.value })} /></td>
                <td><label className={s.mobileLabel}>SĐT phụ huynh</label><input disabled={busy || created.includes(row.id)} aria-label={`SĐT phụ huynh dòng ${row.line}`} type="tel" inputMode="tel" value={row.phone} onChange={(event) => edit(row.id, { phone: event.target.value })} /></td>
                <td className={s.status}>{warnings.length ? warnings.join(" · ") : "Sẵn sàng"}{errors[row.id] && <span className={s.error}>{errors[row.id]}</span>}{same && <label className={s.force}><input type="checkbox" checked={row.forceAdd} onChange={(event) => edit(row.id, { forceAdd: event.target.checked })} /> Buộc thêm</label>}</td>
                <td><button type="button" disabled={busy || created.includes(row.id)} className={s.remove} aria-label={`Bỏ dòng ${row.line}`} onClick={() => { setRows((current) => current.filter((item) => item.id !== row.id)); setCreated((current) => current.filter((id) => id !== row.id)); }}>Bỏ</button></td>
              </tr>;
            })}</tbody>
          </table>
          {assessed.map((row) => <div className={s.mobileCard} key={`card-${row.id}`}>
            <label>Tên học sinh<input disabled={busy || created.includes(row.id)} aria-label={`Tên học sinh dòng ${row.line}`} value={row.name} onChange={(event) => edit(row.id, { name: event.target.value })} /></label>
            <label>SĐT phụ huynh<input disabled={busy || created.includes(row.id)} aria-label={`SĐT phụ huynh dòng ${row.line}`} type="tel" inputMode="tel" value={row.phone} onChange={(event) => edit(row.id, { phone: event.target.value })} /></label>
            <p className={row.phoneInvalid || row.suspiciousName || row.match !== "none" ? s.warning : s.status}>{!row.name ? "Thiếu tên · " : ""}{row.phoneInvalid ? "SĐT chưa đúng định dạng · " : ""}{row.suspiciousName && row.name ? "Kiểm tra tên · " : ""}{row.duplicateInPaste ? "Trùng tên và SĐT trong danh sách · " : ""}{row.match === "same" ? (row.forceAdd ? "Đã có trong lớp · sẽ thêm" : "Đã có trong lớp") : row.match === "name" ? "Trùng tên, vẫn sẽ thêm" : "Sẵn sàng"}</p>
            {row.match === "same" && <label className={s.force}><input type="checkbox" checked={row.forceAdd} onChange={(event) => edit(row.id, { forceAdd: event.target.checked })} /> Buộc thêm</label>}
            {errors[row.id] && <p className={s.error}>{errors[row.id]}</p>}
            <button type="button" disabled={busy || created.includes(row.id)} className={s.remove} onClick={() => { setRows((current) => current.filter((item) => item.id !== row.id)); setCreated((current) => current.filter((id) => id !== row.id)); }}>Bỏ dòng {row.line}</button>
          </div>)}
        </div>
        {assessed.some((row) => row.status === "needs_fix") && <p className={s.note}>Sửa hoặc bỏ các dòng cần kiểm tra trước khi thêm.</p>}
      </div>
    </Modal>
  );
}
