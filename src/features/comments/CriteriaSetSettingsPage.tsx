import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import type { CriteriaLevel, CriteriaSet, CriteriaSetItem } from "../../data/api/types";
import { criteriaSetError, getCachedCriteriaSet, getCriteriaSet, replaceCriteriaSet } from "../../data/repositories/criteriaSet";
import { isAdmin } from "../../data/repositories/access";
import { useOnline } from "../../shared/hooks/useOnline";
import { MasterDetailPage, PageShell, useLayout } from "../../shared/layout";
import { ActionFooter, Button, EmptyState, Field, InfoNotice, Input, Modal } from "../../shared/ui";
import { LevelChickMeter } from "../../shared/ui/LevelChickMeter";
import { codePointLength, CRITERIA_LEVEL_LABELS, CRITERIA_LEVELS, toCriteriaDraft, validateCriteria, type CriteriaDraft, type CriteriaField } from "../../data/criteriaSetModel";
import s from "./criteriaSetSettings.module.css";

const EMPTY_DRAFT: CriteriaDraft = { name: "", texts: { good: "", ok: "", needs_work: "" }, default_level: "good", homework: false };
const FIELD_TO_LEVEL: Record<CriteriaField, CriteriaLevel | "name" | "default_level"> = { name: "name", good: "good", ok: "ok", needs_work: "needs_work", default_level: "default_level" };

export default function CriteriaSetSettingsPage() {
  const enabled = import.meta.env.VITE_CRITERIA_LEVELS === "1";
  const admin = isAdmin();
  if (!enabled) return <Navigate to="/cai-dat" replace />;
  if (!admin) return <Navigate to="/cai-dat" replace />;
  return <CriteriaSetSettings />;
}

function CriteriaSetSettings() {
  const layout = useLayout();
  const online = useOnline();
  const [set, setSet] = useState<CriteriaSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CriteriaDraft>(EMPTY_DRAFT);
  const [previewLevel, setPreviewLevel] = useState<CriteriaLevel>("good");
  const [errors, setErrors] = useState<Partial<Record<CriteriaField | "homework", string>>>({});
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState<CriteriaSetItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteConflict, setDeleteConflict] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function loadSet() {
    setLoadError("");
    try {
      const latest = await getCriteriaSet();
      setSet(latest);
      return latest;
    } catch (error) {
      setLoadError(criteriaSetError(error).message);
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await getCachedCriteriaSet().catch(() => null);
      if (cached && !cancelled) { setSet(cached); setLoading(false); }
      if (navigator.onLine) {
        const latest = await loadSet();
        if (cancelled) return;
        if (!latest && cached) setLoadError("Đang dùng bộ tiêu chí đã lưu trên máy.");
      } else if (!cached) setLoadError("Chưa có bộ tiêu chí đã lưu trên máy.");
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const ordered = useMemo(() => set?.criteria ?? [], [set]);
  const editorTitle = editingId ? "Sửa tiêu chí" : "Thêm tiêu chí";
  const closeEditor = () => setEditorOpen(false);

  function openNew() {
    setEditingId(null); setDraft({ ...EMPTY_DRAFT, texts: { ...EMPTY_DRAFT.texts } });
    setErrors({}); setFormError(""); setConflict(false); setPreviewLevel("good"); setEditorOpen(true);
  }
  function openEdit(item: CriteriaSetItem) {
    setEditingId(item.id); setDraft(toCriteriaDraft(item)); setErrors({}); setFormError(""); setConflict(false); setPreviewLevel("good"); setEditorOpen(true);
  }

  function fieldMessages(items: ReturnType<typeof validateCriteria>): Partial<Record<CriteriaField | "homework", string>> {
    const result: Partial<Record<CriteriaField | "homework", string>> = {};
    for (const item of items) {
      if (item.index !== undefined && item.index !== (editingId ? ordered.findIndex((row) => row.id === editingId) : ordered.length)) continue;
        if (item.field) result[item.field] = item.reason === "text_length" ? "Câu cần có từ 1 đến 200 ký tự." : item.reason === "name_length" ? "Tên cần có từ 1 đến 40 ký tự." : item.reason === "homework_multiple" ? "Chỉ một tiêu chí được theo chấm BTVN." : "Trường này chưa hợp lệ.";
      if (item.reason === "name_duplicate") result.name = "Tên tiêu chí không được trùng nhau.";
    }
    return result;
  }

  async function saveEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!set || !online || saving) return;
    const next = editingId
      ? ordered.map((item) => item.id === editingId ? { ...draft, id: item.id } : toCriteriaDraft(item))
      : [...ordered.map(toCriteriaDraft), draft];
    if (draft.homework) {
      const targetIndex = editingId ? ordered.findIndex((item) => item.id === editingId) : ordered.length;
      next.forEach((item, index) => { if (index !== targetIndex) item.homework = false; });
    }
    const validation = validateCriteria(next);
    if (validation.length) { setErrors(fieldMessages(validation)); setFormError(validation.some((item) => item.reason === "criteria_count") ? "Bộ tiêu chí cần có từ 1 đến 8 mục." : "Hãy kiểm tra thông tin được đánh dấu."); return; }
    setSaving(true); setSaved(false); setFormError(""); setConflict(false); setErrors({});
    const start = Date.now();
    try {
      const updated = await replaceCriteriaSet(set.version, next);
      const remaining = Math.max(0, 400 - (Date.now() - start));
      if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));
        setSet(updated); setEditorOpen(false); setSaved(true); setConflict(false);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (error) {
        const result = criteriaSetError(error);
        setFormError(result.message);
        setConflict(result.reason === "version_conflict");
        if (result.reason === "name_duplicate") setErrors({ name: result.message });
        if (result.reason === "homework_multiple") setErrors({ homework: result.message });
      if (result.index !== undefined && result.field) {
        const editingIndex = editingId ? ordered.findIndex((item) => item.id === editingId) : ordered.length;
          const mappedField = result.field === "texts.good" ? "good" : result.field === "texts.ok" ? "ok" : result.field === "texts.needs_work" ? "needs_work" : result.field;
          if (result.index === editingIndex && mappedField in FIELD_TO_LEVEL) {
            const key = mappedField as CriteriaField;
            setErrors({ [key]: result.message });
        }
      }
    } finally { setSaving(false); }
  }

  async function move(item: CriteriaSetItem, direction: -1 | 1) {
    if (!set || !online || saving) return;
    const from = ordered.findIndex((row) => row.id === item.id), to = from + direction;
    if (from < 0 || to < 0 || to >= ordered.length) return;
    const next = ordered.map(toCriteriaDraft); [next[from], next[to]] = [next[to]!, next[from]!];
    await updateWholeSet(next);
  }

  async function moveTo(item: CriteriaSetItem, targetIndex: number) {
    if (!set || !online || saving) return;
    const from = ordered.findIndex((row) => row.id === item.id);
    if (from < 0 || targetIndex < 0 || targetIndex >= ordered.length || from === targetIndex) return;
    const next = ordered.map(toCriteriaDraft);
    const [moving] = next.splice(from, 1);
    next.splice(targetIndex, 0, moving!);
    await updateWholeSet(next);
  }

  async function updateWholeSet(next: CriteriaDraft[]) {
    if (!set || saving) return;
    setSaving(true); setSaved(false); setFormError(""); setConflict(false);
    try {
      const updated = await replaceCriteriaSet(set.version, next);
      setSet(updated); setSaved(true); window.setTimeout(() => setSaved(false), 1600);
    } catch (error) { const result = criteriaSetError(error); setFormError(result.message); setConflict(result.reason === "version_conflict"); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!set || !deleting || !online || deleteSaving) return;
    setDeleteSaving(true); setDeleteError(""); setDeleteConflict(false);
    try {
      const updated = await replaceCriteriaSet(set.version, ordered.filter((item) => item.id !== deleting.id).map(toCriteriaDraft));
      setSet(updated); setDeleting(null); setEditingId(null); setEditorOpen(false); setSaved(true); window.setTimeout(() => setSaved(false), 1600);
    } catch (error) { const result = criteriaSetError(error); setDeleteError(result.message); setDeleteConflict(result.reason === "version_conflict"); }
    finally { setDeleteSaving(false); }
  }

  function serverReload() {
    setEditorOpen(false); setFormError(""); void loadSet();
  }

    const editorBody = (
      <form id="criteria-editor" className={s.form} onSubmit={(event) => void saveEditor(event)}>
        <Field label="Tên tiêu chí" htmlFor="criteria-name" error={errors.name}>
          <Input id="criteria-name" value={draft.name} maxLength={160} onChange={(event) => setDraft((value) => ({ ...value, name: Array.from(event.target.value).slice(0, 40).join("") }))} aria-invalid={Boolean(errors.name)} />
          <span className={s.counter}>{codePointLength(draft.name.trim().normalize("NFC"))}/40 ký tự</span>
        </Field>
        {CRITERIA_LEVELS.map((level) => (
          <div key={level} className={s.levelField}>
            <label htmlFor={`criteria-${level}`} className={s.levelLabel}>
              <span>Câu mức {CRITERIA_LEVEL_LABELS[level]}</span>
              <LevelChickMeter level={level} decorative />
            </label>
            <textarea id={`criteria-${level}`} className={s.textarea} value={draft.texts[level]} maxLength={800} rows={3} onChange={(event) => setDraft((value) => ({ ...value, texts: { ...value.texts, [level]: Array.from(event.target.value).slice(0, 200).join("") } }))} aria-invalid={Boolean(errors[level])} />
            <span className={s.counter}>{codePointLength(draft.texts[level].trim().normalize("NFC"))}/200 ký tự</span>
            {errors[level] && <span className={s.fieldError} role="alert">{errors[level]}</span>}
          </div>
        ))}
        <Field label="Mức mặc định" htmlFor="criteria-default" error={errors.default_level}>
          <select id="criteria-default" className={s.select} value={draft.default_level} onChange={(event) => { setDraft((value) => ({ ...value, default_level: event.target.value as CriteriaLevel })); setErrors((value) => ({ ...value, default_level: undefined })); }}>
            {CRITERIA_LEVELS.map((level) => <option value={level} key={level}>{CRITERIA_LEVEL_LABELS[level]}</option>)}
          </select>
        </Field>
        <label className={s.homeworkToggle}>
          <input type="checkbox" checked={draft.homework} onChange={(event) => { setDraft((value) => ({ ...value, homework: event.target.checked })); setErrors((value) => ({ ...value, homework: undefined })); }} />
          <span>Theo chấm BTVN</span>
        </label>
        {errors.homework && <p className={s.error} role="alert">{errors.homework}</p>}
        {draft.homework && ordered.some((item) => item.homework && item.id !== editingId) && (
          <InfoNotice title="Chỉ có một tiêu chí được theo chấm BTVN" description="Khi lưu, tiêu chí BTVN đang bật sẽ được tắt." />
        )}
        <div className={s.preview}>
          <strong>Xem trước · {CRITERIA_LEVEL_LABELS[previewLevel]}</strong>
          <p>{draft.texts[previewLevel] || "Câu nhận xét sẽ hiện ở đây."}</p>
          <div className={s.previewLevels} aria-label="Chọn mức xem trước">
            {CRITERIA_LEVELS.map((level) => <Button key={level} variant={previewLevel === level ? "primary" : "secondary"} size="sm" onClick={() => setPreviewLevel(level)}>{CRITERIA_LEVEL_LABELS[level]}</Button>)}
          </div>
        </div>
        {editingId && <div className={s.editorDelete}>
          <Button variant="danger" onClick={() => { setDeleteError(""); setDeleteConflict(false); setDeleting(ordered.find((item) => item.id === editingId) ?? null); }} disabled={!online || saving || ordered.length === 1}>Xoá tiêu chí</Button>
        </div>}
        {formError && <div className={s.error} role="alert">{formError}{conflict && <Button variant="secondary" onClick={serverReload}>Tải lại</Button>}</div>}
      </form>
    );
  const editorFooter = <ActionFooter className={s.footer}>
    <Button variant="secondary" onClick={() => setEditorOpen(false)} disabled={saving}>Huỷ</Button>
    <Button type="submit" form="criteria-editor" loading={saving} done={saved}>{editingId ? "Lưu" : "Thêm tiêu chí"}</Button>
  </ActionFooter>;

  function startDrag(event: DragEvent, item: CriteriaSetItem) {
    setDraggedId(item.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.id);
  }

  function dropAt(event: DragEvent, index: number) {
    event.preventDefault();
    const moving = ordered.find((item) => item.id === draggedId);
    if (moving) void moveTo(moving, index);
    setDraggedId(null);
  }

  function dragHandle(item: CriteriaSetItem) {
    return <button type="button" className={s.orderButton} aria-label={`Kéo để đổi thứ tự: ${item.name}`} disabled={!online || saving} draggable onDragStart={(event) => { event.stopPropagation(); startDrag(event, item); }} onDragEnd={() => setDraggedId(null)}>⠿</button>;
  }

  function rowMenu(item: CriteriaSetItem, index: number) {
    return <div className={s.menuWrap}>
      <button type="button" className={s.orderButton} aria-label={`Thao tác cho ${item.name}`} aria-haspopup="menu" aria-expanded={openMenuId === item.id} onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>•••</button>
      {openMenuId === item.id && <div className={s.rowMenu} role="menu" aria-label={`Thao tác cho ${item.name}`}>
        <button type="button" role="menuitem" disabled={!online || saving || index === 0} onClick={() => { setOpenMenuId(null); void move(item, -1); }}>Lên</button>
        <button type="button" role="menuitem" disabled={!online || saving || index === ordered.length - 1} onClick={() => { setOpenMenuId(null); void move(item, 1); }}>Xuống</button>
        <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); openEdit(item); }}>Sửa tiêu chí</button>
      </div>}
    </div>;
  }

  const addEmptyAction = <Button onClick={openNew} disabled={!online}>Thêm tiêu chí</Button>;
  const criteriaTable = <section className={`${s.listPanel} ${ordered.length === 0 ? s.emptyPanel : ""}`} aria-label="Danh sách tiêu chí">
    <div className={s.listHead}><div><h2>Tiêu chí</h2><p>Áp dụng cho mọi lớp trong workspace</p></div></div>
    {ordered.length === 0 ? <EmptyState size="compact" title="Chưa có tiêu chí" description="Thêm tiêu chí để tạo bộ nhận xét dùng chung." action={addEmptyAction} /> : <div className={s.tableWrap}>
      <table className={s.table}>
        <thead><tr><th>Thứ tự</th><th>Tên</th><th>Mặc định</th><th>BTVN</th><th>Thao tác</th></tr></thead>
        <tbody>{ordered.map((item, index) => <tr key={item.id} className={editingId === item.id ? s.tableRowSelected : ""} data-measure="row" draggable={online && !saving} onDragStart={(event) => startDrag(event, item)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event, index)} onDragEnd={() => setDraggedId(null)}>
          <td className={s.orderCell}>{dragHandle(item)}<span>{index + 1}</span></td>
          <td><button type="button" className={s.tableName} onClick={() => openEdit(item)} aria-label={`Sửa tiêu chí ${item.name}`} aria-pressed={editingId === item.id} disabled={!online || saving}>{item.name}</button></td>
          <td className={s.tableMeta}>Mặc định: {CRITERIA_LEVEL_LABELS[item.default_level]}</td>
          <td className={s.tableHomework}>{item.homework ? <span className={s.homeworkLabel}>Theo chấm BTVN</span> : <span className={s.tableMuted}>—</span>}</td>
          <td className={s.tableActions}>{rowMenu(item, index)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {saved && <p className={s.success} role="status" aria-live="polite">✓ Đã lưu</p>}
  </section>;
  const criteriaList = <section className={`${s.listPanel} ${ordered.length === 0 ? s.emptyPanel : ""}`} aria-label="Danh sách tiêu chí">
    <div className={s.listHead}><div><h2>Tiêu chí</h2><p>Áp dụng cho mọi lớp trong workspace</p></div></div>
    <ol className={s.list}>
      {ordered.length === 0 && <li className={s.emptyRow} data-measure="block"><EmptyState size="compact" title="Chưa có tiêu chí" description="Thêm tiêu chí để tạo bộ nhận xét dùng chung." action={addEmptyAction} /></li>}
      {ordered.map((item, index) => <li className={s.listItem} key={item.id} data-measure="row" draggable={online && !saving} onDragStart={(event) => startDrag(event, item)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropAt(event, index)} onDragEnd={() => setDraggedId(null)}>
        <div className={`${s.item} ${editingId === item.id ? s.selected : ""}`}>
          <button type="button" className={s.itemSelect} onClick={() => openEdit(item)} aria-label={`Sửa tiêu chí ${item.name}`} aria-pressed={editingId === item.id} disabled={!online || saving}>
            <span className={s.itemName}>{item.name}</span>
            {item.homework && <span className={s.homeworkLabel}>Theo chấm BTVN</span>}
            <span className={s.itemMeta}>Mặc định: {CRITERIA_LEVEL_LABELS[item.default_level]}</span>
          </button>
          {dragHandle(item)}
          {rowMenu(item, index)}
        </div>
      </li>)}
    </ol>
    {saved && <p className={s.success} role="status" aria-live="polite">✓ Đã lưu</p>}
  </section>;

    const detail = editorOpen ? editorBody : null;
    const detailFooter = editorOpen ? editorFooter : null;
    return (
      <PageShell
        breadcrumb={<><Link to="/cai-dat">Cài đặt</Link><span aria-hidden="true">/</span><span>Bộ tiêu chí nhận xét</span></>}
        backTo="/cai-dat"
        title="Bộ tiêu chí nhận xét"
        subtitle="Một bộ tiêu chí dùng chung cho mọi lớp trong workspace."
        actions={<Button onClick={openNew} disabled={!online || saving || ordered.length >= 8}>Thêm tiêu chí</Button>}
      >
        {!online && <InfoNotice title="Đang ngoại tuyến" description="Bạn có thể xem bộ đã lưu trên máy. Chỉnh sửa cần kết nối mạng." />}
        {loadError && <div className={s.error} role="status">{loadError}{online && <Button variant="secondary" onClick={() => void loadSet()}>Tải lại</Button>}</div>}
        {formError && !editorOpen && <div className={s.error} role="alert">{formError}{conflict && <Button variant="secondary" onClick={() => void loadSet()}>Tải lại</Button>}</div>}
        {loading && !set ? <p role="status">Đang tải bộ tiêu chí…</p> : set && <>
          <MasterDetailPage
            detailOpen={editorOpen}
            onCloseDetail={closeEditor}
            detailTitle={editorTitle}
            detail={detail}
            footer={detailFooter}
            mobileDetail="sheet"
            master={criteriaTable}
            mobileMaster={criteriaList}
          />
        </>}
        <Modal
          open={deleting !== null}
          onClose={() => setDeleting(null)}
          title="Xoá tiêu chí này?"
          sheet={layout !== "desktop"}
          footer={<div className={s.deleteActions}>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleteSaving}>Huỷ</Button>
            <Button variant="danger" loading={deleteSaving} onClick={() => void confirmDelete()}>Xoá tiêu chí</Button>
          </div>}
        >
          <p>Bạn có chắc muốn xoá “{deleting?.name}” khỏi bộ tiêu chí?</p>
          <p>Phiếu đã gửi không đổi.</p>
          {deleteError && <div className={s.error} role="alert">{deleteError}{deleteConflict && <Button variant="secondary" onClick={() => { setDeleting(null); void loadSet(); }}>Tải lại</Button>}</div>}
        </Modal>
      </PageShell>
    );
}
