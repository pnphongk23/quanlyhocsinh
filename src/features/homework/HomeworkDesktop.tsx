import { useState, type FormEvent, type ReactNode } from "react";
import {
  HOMEWORK_KINDS,
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVELS,
  HOMEWORK_LEVEL_LABELS,
  homeworkContext,
} from "../../data/homework";
import {
  deleteHomeworkSection,
  listHomeworkGrades,
  saveHomeworkSection,
  setHomeworkGrade,
} from "../../data/repositories/homework";
import { useAccess } from "../../data/repositories/access";
import { sessionNumber, sessionPrefix } from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import { useSaveStatus } from "../../shared/SaveStatus";
import { formatDayMonth } from "../../shared/format";
import { Button, Pill } from "../../shared/ui";
import { Mascot } from "../../shared/ui/Mascot";
import type {
  HomeworkKind,
  HomeworkLevel,
  HomeworkSection,
  Session,
} from "../../data/types";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import {
  canDeleteSection,
  gradePillLabel,
  nextGrade,
  partsCountLabel,
  previousEmptyCopy,
} from "./homeworkModel";
import s from "./HomeworkDesktop.module.css";
import d from "../class-space/desktop.module.css";

const LEVEL_CLASS: Record<HomeworkLevel, string> = {
  excellent: s.levelExcellent,
  done: s.levelDone,
  not_done: s.levelNotDone,
};

type Editor =
  | { mode: "add"; kind: HomeworkKind }
  | { mode: "edit"; sectionId: string };

const EDITOR_FORM_ID = "homework-desktop-form";

/** "Thứ Hai 19/10" trong banner buổi chấm — chỉ để đối chiếu, không bắt buộc. */
function weekdayDay(iso: string): string {
  return formatDayMonth(iso);
}

/**
 * Tab Bài tập về nhà trên web desktop (ảnh 05/06/07): chấm theo phần ở cột
 * trái, danh sách cả lớp ở cột phải; giao bài có khung sửa phần bên cạnh.
 */
export default function HomeworkDesktop({
  session,
  tabBar,
}: {
  session: Session;
  tabBar: (actions: ReactNode) => ReactNode;
}) {
  const state = useStore();
  const access = useAccess();
  const save = useSaveStatus();
  const ctx = homeworkContext(state, session.id);
  const canWrite = access.can("comments_reports", "write");
  const [view, setView] = useState<"previous" | "today">("previous");
  const [selectedKind, setSelectedKind] = useState<HomeworkKind | null>(null);
  const [drafts, setDrafts] = useState<Record<string, HomeworkLevel | null>>(
    {},
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<HomeworkSection | null>(
    null,
  );

  if (!ctx) return null;
  const previousSections = ctx.previous.sections;
  const activeProgress =
    previousSections.find((item) => item.section.kind === selectedKind) ??
    previousSections[0];
  const activeSection = activeProgress?.section;
  const currentNumber = sessionNumber(session);
  const grading = ctx.today.grading;
  const editingSection =
    editor?.mode === "edit"
      ? ctx.today.sections.find((section) => section.id === editor.sectionId)
      : undefined;
  const editingGrades = editingSection
    ? listHomeworkGrades(editingSection.id)
    : [];

  function levelOf(sectionId: string, studentId: string): HomeworkLevel | null {
    const key = `${sectionId}:${studentId}`;
    if (key in drafts) return drafts[key];
    const row = ctx?.previous.rows.find((item) => item.student.id === studentId);
    return row?.grades[sectionId] ?? null;
  }

  function pick(sectionId: string, studentId: string, level: HomeworkLevel) {
    if (!canWrite) return;
    setError("");
    setMessage("");
    setDrafts((current) => ({
      ...current,
      [`${sectionId}:${studentId}`]: nextGrade(
        levelOf(sectionId, studentId),
        level,
      ),
    }));
  }

  function draftAll(level: HomeworkLevel) {
    if (!canWrite || !activeSection) return;
    setError("");
    setMessage("");
    const next: Record<string, HomeworkLevel | null> = {};
    for (const row of ctx?.previous.rows ?? [])
      next[`${activeSection.id}:${row.student.id}`] = level;
    setDrafts((current) => ({ ...current, ...next }));
  }

  function saveGrades() {
    const entries = Object.entries(drafts);
    save.markUnsaved();
    try {
      for (const [key, level] of entries) {
        const [sectionId, studentId] = key.split(":");
        setHomeworkGrade(sectionId, studentId, level ?? null);
      }
      setDrafts({});
      setError("");
      setMessage(
        entries.length
          ? `Đã lưu kết quả chấm ${entries.length} ô.`
          : "Không có thay đổi cần lưu.",
      );
      save.clearStatus();
    } catch (cause) {
      save.setStatus("error");
      setError(
        cause instanceof Error ? cause.message : "Không lưu được kết quả chấm.",
      );
    }
  }

  const gradingBanner = (() => {
    if (view !== "today") return null;
    if (grading.state === "moved" && grading.session)
      return `Buổi ${weekdayDay(grading.session.date)} là buổi chấm BTVN hôm nay.`;
    if (grading.state === "none")
      return "Lịch lớp không còn buổi nào sau buổi này, nên chưa có buổi chấm.";
    return null;
  })();

  function openAdd(kind: HomeworkKind) {
    setEditor({ mode: "add", kind });
    setView("today");
    setError("");
    setMessage("");
  }

  const headerAction =
    view === "previous" ? (
      <Button size="md" onClick={saveGrades}>
        Lưu kết quả chấm
      </Button>
    ) : editor ? (
      <Button size="md" type="submit" form={EDITOR_FORM_ID}>
        Lưu bài tập
      </Button>
    ) : (
      <Button size="md" disabled>
        Lưu bài tập
      </Button>
    );

  const viewSwitch = (
    <div className={s.viewRow}>
      <div className={d.segmented} role="tablist" aria-label="Phần bài tập">
        <button
          type="button"
          role="tab"
          aria-selected={view === "previous"}
          className={
            d.segment + (view === "previous" ? " " + d.segmentActive : "")
          }
          onClick={() => setView("previous")}
        >
          Bài tập buổi trước
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "today"}
          className={d.segment + (view === "today" ? " " + d.segmentActive : "")}
          onClick={() => setView("today")}
        >
          Bài tập hôm nay
        </button>
      </div>
      <span className={d.inlineHint}>
        {view === "previous"
          ? ctx.previous.givingSession
            ? `Để chấm · giao ở ${sessionPrefix(ctx.previous.givingSession)}`
            : "Không có BTVN buổi trước"
          : "Để giao cho buổi này"}
      </span>
    </div>
  );

  const previousBody = (() => {
    if (ctx.previous.state !== "has" || !previousSections.length) {
      const copy = previousEmptyCopy(
        ctx.previous.state === "first" ? "first" : "none-given",
      );
      return (
          <div className={d.card + " " + d.emptyCard}>
            <Mascot pose="cho" size={88} />
            <p className={d.emptyTitle}>{copy.title}</p>
          <p className={d.emptyText}>{copy.body}</p>
          {canWrite && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setView("today")}
            >
              Giao BTVN ở Bài tập hôm nay
            </Button>
          )}
        </div>
      );
    }
    if (!activeProgress || !activeSection) return null;
    return (
      <div className={s.split}>
        <div className={s.kindCard}>
          <h2 className={s.kindTitle}>Chọn phần</h2>
          {previousSections.map((progress) => {
            const active = progress.section.id === activeSection.id;
            return (
              <button
                key={progress.section.id}
                type="button"
                aria-pressed={active}
                className={s.kindRow + (active ? " " + s.kindRowOn : "")}
                onClick={() => {
                  setSelectedKind(progress.section.kind);
                  setDrafts({});
                  setMessage("");
                }}
              >
                <span className={s.kindName}>
                  {HOMEWORK_KIND_LABELS[progress.section.kind]}
                </span>
                <span className={s.kindCount}>
                  {progress.graded}/{progress.total} đã chấm
                </span>
              </button>
            );
          })}
        </div>

        <div className={s.rosterCard}>
          <div className={s.rosterHead}>
            <h2 className={s.rosterTitle}>
              {HOMEWORK_KIND_LABELS[activeSection.kind]} · cả lớp
            </h2>
            {canWrite && (
              <div className={s.markAll}>
                <span className={d.inlineHint}>Đánh dấu cả lớp</span>
                {HOMEWORK_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={s.markAllButton}
                    onClick={() => draftAll(level)}
                  >
                    {HOMEWORK_LEVEL_LABELS[level]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={s.rosterRows}>
            {ctx.previous.rows.map((row) => {
              const level = levelOf(activeSection.id, row.student.id);
              return (
                <div className={s.rosterRow} key={row.student.id}>
                  <span className={s.rosterName}>{row.student.name}</span>
                  <span className={s.rosterBadge}>
                    {!level && <Pill tone="warning">Chưa chấm</Pill>}
                  </span>
                  <span className={s.levels}>
                    {HOMEWORK_LEVELS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={level === option}
                        disabled={!canWrite}
                        className={
                          s.levelButton +
                          (level === option ? " " + LEVEL_CLASS[option] : "")
                        }
                        onClick={() =>
                          pick(activeSection.id, row.student.id, option)
                        }
                      >
                        {HOMEWORK_LEVEL_LABELS[option]}
                      </button>
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  })();

  const todayBody = (() => {
    if (!ctx.today.sections.length && !editor) {
      return (
          <div className={d.card + " " + d.emptyCard}>
            <Mascot pose="cho" size={88} />
            <p className={d.emptyTitle}>Buổi này chưa có bài tập về nhà</p>
          <p className={d.emptyText}>
            Thêm phần để giao cho cả lớp. Tối đa 4 phần, mỗi loại một phần. Có
            thể bỏ trống nếu buổi này không giao bài.
          </p>
          {canWrite && (
            <div className={s.addButtons}>
              {HOMEWORK_KINDS.map((kind) => (
                <Button
                  key={kind}
                  variant="secondary"
                  size="md"
                  onClick={() => openAdd(kind)}
                >
                  + {HOMEWORK_KIND_LABELS[kind]}
                </Button>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className={s.split}>
        <div className={d.card + " " + s.todayCard}>
          <div className={s.todayHead}>
            <div>
              <h2 className={s.rosterTitle}>
                Bài tập hôm nay ·{" "}
                {partsCountLabel(ctx.today.sections.length)}
              </h2>
              <p className={d.muted13}>
                Mỗi loại một phần.
                {ctx.today.missingKinds.length
                  ? ` Còn có thể thêm: ${ctx.today.missingKinds
                      .map((kind) => HOMEWORK_KIND_LABELS[kind])
                      .join(", ")}.`
                  : " Đã đủ bốn loại phần."}
              </p>
            </div>
            {canWrite && ctx.today.missingKinds.length > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  const kind = ctx.today.missingKinds[0];
                  if (kind) openAdd(kind);
                }}
              >
                + Thêm phần
              </Button>
            )}
          </div>
          {gradingBanner && <p className={d.muted13}>{gradingBanner}</p>}
          <div className={s.sectionList}>
            {ctx.today.sections.map((section) => {
              const gradeCount = listHomeworkGrades(section.id).length;
              const active =
                editor?.mode === "edit" && editor.sectionId === section.id;
              return (
                <div
                  key={section.id}
                  className={s.sectionRow + (active ? " " + s.sectionRowOn : "")}
                >
                  <div className={s.sectionText}>
                    <div className={s.sectionTitleLine}>
                      <Pill tone="primary">
                        {HOMEWORK_KIND_LABELS[section.kind]}
                      </Pill>
                      <span className={s.sectionTitle}>{section.title}</span>
                    </div>
                    {section.description && (
                      <p className={s.sectionDescription}>
                        {section.description}
                      </p>
                    )}
                    {gradeCount > 0 && (
                      <p className={s.sectionLocked}>
                        Đã chấm {gradeCount} em · không thể xoá
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <>
                      <button
                        type="button"
                        className={s.iconButton}
                        aria-label={`Sửa phần ${HOMEWORK_KIND_LABELS[section.kind]}`}
                        onClick={() =>
                          setEditor({ mode: "edit", sectionId: section.id })
                        }
                      >
                        <svg
                          width={20}
                          height={20}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={
                          canDeleteSection(gradeCount)
                            ? s.deleteButton
                            : s.deleteButtonDisabled
                        }
                        aria-label={`Xoá phần ${HOMEWORK_KIND_LABELS[section.kind]}`}
                        disabled={!canDeleteSection(gradeCount)}
                        onClick={() => setConfirmDelete(section)}
                      >
                        <svg
                          width={20}
                          height={20}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          {canDeleteSection(gradeCount) ? (
                            <>
                              <path d="M4 7h16" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M6 7l1 13h10l1-13" />
                              <path d="M9 7V4h6v3" />
                            </>
                          ) : (
                            <>
                              <rect x="5" y="11" width="14" height="9" rx="2" />
                              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                            </>
                          )}
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {editor && (
          <div className={s.editorCard}>
            <SectionForm
              key={
                editor.mode === "edit"
                  ? editor.sectionId
                  : `add-${editor.kind}`
              }
              sessionId={session.id}
              mode={editor.mode}
              section={editingSection}
              initialKind={editor.mode === "add" ? editor.kind : undefined}
              existingKinds={ctx.today.sections.map((section) => section.kind)}
              missingKinds={ctx.today.missingKinds}
              gradeCount={editingGrades.length}
              gradingTotal={ctx.previous.rows.length}
              onDone={() => {
                setEditor(null);
                setMessage("Đã lưu bài tập · phụ huynh thấy ngay.");
                setError("");
              }}
              onCancel={() => setEditor(null)}
            />
          </div>
        )}
      </div>
    );
  })();

  return (
    <div className={d.page}>
      {tabBar(headerAction)}
      {viewSwitch}
      {error && (
        <p role="alert" className={d.error}>
          {error}
        </p>
      )}
      {message && !error && (
        <p role="status" className={d.successNote}>
          {message}
        </p>
      )}
      {view === "previous" ? previousBody : todayBody}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={`Xoá phần “${confirmDelete?.title ?? ""}”?`}
        message="Phụ huynh sẽ không thấy phần này nữa. Không thể hoàn tác."
        actions={[
          {
            label: "Xoá phần",
            variant: "danger",
            onClick: () => {
              if (!confirmDelete) return;
              try {
                deleteHomeworkSection(confirmDelete.id);
                setConfirmDelete(null);
                setMessage("Đã xoá phần bài tập.");
                setError("");
              } catch (cause) {
                setConfirmDelete(null);
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Không xoá được phần bài tập.",
                );
              }
            },
          },
          {
            label: "Huỷ",
            variant: "neutral",
            onClick: () => setConfirmDelete(null),
          },
        ]}
        onDismiss={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/** Khung sửa/thêm một phần BTVN nằm cạnh danh sách (ảnh 06). */
function SectionForm({
  sessionId,
  mode,
  section,
  initialKind,
  existingKinds,
  missingKinds,
  gradeCount,
  gradingTotal,
  onDone,
  onCancel,
}: {
  sessionId: string;
  mode: "add" | "edit";
  section?: HomeworkSection;
  initialKind?: HomeworkKind;
  existingKinds: HomeworkKind[];
  missingKinds: HomeworkKind[];
  gradeCount: number;
  gradingTotal: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const save = useSaveStatus();
  const [kind, setKind] = useState<HomeworkKind | null>(
    initialKind ?? section?.kind ?? missingKinds[0] ?? null,
  );
  const [title, setTitle] = useState(section?.title ?? "");
  const [description, setDescription] = useState(section?.description ?? "");
  const [error, setError] = useState("");
  const existing = new Set(existingKinds);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kind) return;
    setError("");
    save.markUnsaved();
    try {
      saveHomeworkSection({
        id: section?.id,
        sessionId: section?.sessionId ?? sessionId,
        kind,
        title,
        description,
      });
      save.clearStatus();
      onDone();
    } catch (cause) {
      save.setStatus("error");
      setError(
        cause instanceof Error ? cause.message : "Không lưu được phần bài tập.",
      );
    }
  }

  return (
    <form id={EDITOR_FORM_ID} className={s.editorForm} onSubmit={submit}>
      <h2 className={s.rosterTitle}>
        {mode === "add"
          ? `Thêm phần · ${kind ? HOMEWORK_KIND_LABELS[kind] : ""}`
          : `Sửa phần · ${kind ? HOMEWORK_KIND_LABELS[kind] : ""}`}
      </h2>

      <p className={d.fieldLabel}>Loại phần</p>
      {mode === "add" ? (
        <div className={s.kindOptions}>
          {HOMEWORK_KINDS.map((option) => {
            const taken = existing.has(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                disabled={taken}
                className={
                  s.kindOption + (kind === option ? " " + s.kindOptionOn : "")
                }
                onClick={() => setKind(option)}
              >
                {HOMEWORK_KIND_LABELS[option]}
              </button>
            );
          })}
        </div>
      ) : (
        <p className={s.lockedKind}>
          <Pill tone="primary">
            {HOMEWORK_KIND_LABELS[section?.kind ?? "exercise"]}
          </Pill>
          <span className={d.muted13}>Không đổi được loại</span>
        </p>
      )}

      <label className={d.fieldLabel} htmlFor="hw-desktop-title">
        Tiêu đề
      </label>
      <input
        id="hw-desktop-title"
        className={d.input}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />

      <label className={d.fieldLabel} htmlFor="hw-desktop-description">
        Mô tả <span className={s.optional}>· không bắt buộc</span>
      </label>
      <textarea
        id="hw-desktop-description"
        className={d.textarea}
        style={{ minHeight: 96 }}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      {mode === "edit" && (
        <p className={d.muted13}>
          {gradePillLabel(gradeCount, gradingTotal)}
          {gradeCount > 0
            ? " · Đã chấm nên không xoá được phần này."
            : " · Chưa chấm em nào nên xoá được."}
        </p>
      )}

      {error && (
        <p role="alert" className={s.formError}>
          {error}
        </p>
      )}

      <div className={s.formActions}>
        <Button variant="neutral" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" className={s.flex14}>
          Lưu phần
        </Button>
      </div>
    </form>
  );
}
