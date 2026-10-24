import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  HOMEWORK_KINDS,
  HOMEWORK_KIND_LABELS,
  HOMEWORK_LEVELS,
  HOMEWORK_LEVEL_LABELS,
  homeworkContext,
  studentsOnSession,
  type HomeworkGradingPlan,
} from "../../data/homework";
import {
  deleteHomeworkSectionDurable,
  listHomeworkGrades,
  saveHomeworkSectionDurable,
  setHomeworkGradeDurable,
  setHomeworkGradeForAllDurable,
} from "../../data/repositories/homework";
import { useAccess } from "../../data/repositories/access";
import { getStudent } from "../../data/repositories/students";
import {
  getSessionClass,
  sessionNumber,
  sessionPrefix,
} from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import { useSaveStatus } from "../../shared/SaveStatus";
import { formatDayMonth } from "../../shared/format";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useUnsavedCloseGuard } from "../../shared/hooks/useUnsavedCloseGuard";
import { Button, EmptyState, NoAccess, Pill, UnsavedChangesDialog } from "../../shared/ui";
import type {
  HomeworkKind,
  HomeworkLevel,
  HomeworkSection,
  Session,
} from "../../data/types";
import {
  DELETE_ALLOWED_MESSAGE,
  addPartLabel,
  canDeleteSection,
  commentsSearch,
  deleteBlockedMessage,
  gradePillLabel,
  initialsOf,
  kindLabel,
  nextGrade,
  parseHomeworkKind,
  partsCountLabel,
  previousEmptyCopy,
  type HomeworkView,
} from "./homeworkModel";
import styles from "./HomeworkPanel.module.css";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";

/* ------------------------------------------------------------------ icons */

const KIND_ICON_PATHS: Record<HomeworkKind, ReactNode> = {
  vocabulary: (
    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
  ),
  reading: (
    <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
  ),
  speaking: (
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
  ),
  exercise: (
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  ),
};

function Glyph({
  children,
  size = 16,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={styles.glyph}
    >
      {children}
    </svg>
  );
}

function KindGlyph({ kind, size = 16 }: { kind: HomeworkKind; size?: number }) {
  return <Glyph size={size}>{KIND_ICON_PATHS[kind]}</Glyph>;
}

const infoIcon = (
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </>
);
const pencilIcon = (
  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
);
const trashIcon = <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />;
const lockIcon = <path d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" />;
const checkIcon = <path d="m5 12 5 5 9-10" />;
const backIcon = <path d="m15 18-6-6 6-6" />;
const alertIcon = (
  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
);

/* --------------------------------------------------------------- helpers */

/** "Thứ Hai 19/10" — cùng kiểu chữ với ảnh 57/58. */
function weekdayDayMonth(iso: string): string {
  const weekday = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
  }).format(new Date(iso + "T12:00:00"));
  return `${weekday} ${formatDayMonth(iso)}`;
}

type Editor =
  | { mode: "add"; kind: HomeworkKind }
  | { mode: "edit"; id: string };

type PanelProps = {
  session: Session;
  /** Mặc định mở "Bài tập buổi trước" (ảnh 50). Chỉ dùng cho test/deep link. */
  initialView?: HomeworkView;
  /** Báo trang cha khi phần BTVN đang soạn dở (để hỏi trước khi rời màn/đổi tab). */
  onDirtyChange?: (dirty: boolean) => void;
};

export default function HomeworkPanel({
  session,
  initialView = "previous",
  onDirtyChange,
}: PanelProps) {
  const state = useStore();
  const access = useAccess();
  const save = useSaveStatus();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const partFromUrl = parseHomeworkKind(params.get("part"));
  const fromId = params.get("from");
  const fromStudent = fromId ? getStudent(fromId) : undefined;
  const ctx = homeworkContext(state, session.id);
  const canWrite = access.can("comments_reports", "write");
  const [view, setView] = useState<HomeworkView>(initialView);
  const [selectedKind, setSelectedKind] =
    useState<HomeworkKind | null>(partFromUrl);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedKind(partFromUrl);
    setView(initialView);
    setEditor(null);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    if (!partFromUrl) return;
    setSelectedKind(partFromUrl);
    setView("previous");
  }, [partFromUrl]);

  async function act(action: () => Promise<unknown>, fallback: string) {
    setError("");
    save.markUnsaved();
    try {
      await action();
      save.clearStatus();
    } catch (cause) {
      save.setStatus("error");
      setError(cause instanceof Error ? cause.message : fallback);
    }
  }

  const backBar =
    fromId && fromStudent ? (
      <button
        type="button"
        className={styles.backBar}
        onClick={() =>
          navigate({ search: commentsSearch(params, fromId) })
        }
      >
        <Glyph size={18}>{backIcon}</Glyph>
        <span>Quay lại nhận xét {fromStudent.name}</span>
      </button>
    ) : null;

  if (!access.can("comments_reports", "read"))
    return <NoAccess what="bài tập về nhà" />;

  if (!ctx) return <EmptyState title="Không tìm thấy buổi học" />;

  if (ctx.cancelled)
    return (
      <section className={styles.panel} aria-label="Bài tập về nhà">
        {backBar}
        <EmptyState title="Buổi học đã hủy nên không giao hoặc chấm bài tập" />
      </section>
    );

  const previous = ctx.previous;
  const previousSections = previous.sections;
  const activeProgress =
    previousSections.find(
      (progress) => progress.section.kind === selectedKind,
    ) ?? previousSections[0];
  const activeSection = activeProgress?.section;
  const currentNumber = sessionNumber(session);
  const grading = ctx.today.grading;
  const gradingNumber = grading.session ? sessionNumber(grading.session) : null;
  const classTime = getSessionClass(session.id)?.time ?? session.time ?? "";

  const errorBanner = error ? (
    <div className={styles.errorBanner} role="alert">
      <Glyph size={18}>{alertIcon}</Glyph>
      <span>{error}</span>
    </div>
  ) : null;

  const segmented = (
    <div className={styles.segmented} role="tablist" aria-label="Phần bài tập">
      <button
        type="button"
        role="tab"
        aria-selected={view === "previous"}
        className={
          styles.segment + (view === "previous" ? " " + styles.segmentOn : "")
        }
        onClick={() => setView("previous")}
      >
        Bài tập buổi trước
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "today"}
        className={
          styles.segment + (view === "today" ? " " + styles.segmentOn : "")
        }
        onClick={() => setView("today")}
      >
        Bài tập hôm nay
      </button>
    </div>
  );

  const goToToday = (
    <Button
      variant="secondary"
      size="md"
      className={styles.fullButton}
      onClick={() => setView("today")}
    >
      Giao BTVN ở Bài tập hôm nay
    </Button>
  );

  const previousBody = (() => {
    if (previous.state !== "has" || !previousSections.length) {
      const copy = previousEmptyCopy(
        previous.state === "first" ? "first" : "none-given",
      );
      return (
        <EmptyState
          title={copy.title}
          description={copy.body}
          action={canWrite ? goToToday : undefined}
        />
      );
    }
    if (!activeProgress || !activeSection) return null;
    return (
      <>
        <div className={styles.card}>
          <div>
            <p className={styles.cardTitle}>
              BTVN {sessionPrefix(previous.givingSession ?? session).toLowerCase()} ·{" "}
              {formatDayMonth(
                (previous.givingSession ?? session).date,
              )}
            </p>
            <p className={styles.cardMeta}>
              Chấm hôm nay ở buổi {currentNumber}. Kết quả gửi kèm phiếu.
            </p>
          </div>
          <div
            className={styles.kindChips}
            role="group"
            aria-label="Chọn phần bài tập"
          >
            {previousSections.map((progress) => {
              const kind = progress.section.kind;
              const active = progress.section.id === activeSection.id;
              return (
                <button
                  key={progress.section.id}
                  type="button"
                  aria-pressed={active}
                  className={
                    styles.kindChip + (active ? " " + styles.kindChipOn : "")
                  }
                  onClick={() => setSelectedKind(kind)}
                >
                  <KindGlyph kind={kind} />
                  {HOMEWORK_KIND_LABELS[kind]}
                </button>
              );
            })}
          </div>
          <div className={styles.partBlock}>
            <p className={styles.partKind}>
              {HOMEWORK_KIND_LABELS[activeSection.kind].toLocaleUpperCase(
                "vi-VN",
              )}
            </p>
            <p className={styles.partTitle}>{activeSection.title}</p>
          </div>
          <div className={styles.progressRow}>
            <span className={styles.progressStrong}>
              {activeProgress.graded}/{activeProgress.total} em đã chấm
            </span>
            <span className={styles.cardMeta}>
              {activeProgress.ungraded} còn Chưa chấm
            </span>
          </div>
          <button
            type="button"
            className={styles.softButton}
            disabled={!canWrite}
            onClick={() =>
              act(
                () => setHomeworkGradeForAllDurable(activeSection.id, "done"),
                "Không đánh dấu được cả lớp.",
              )
            }
          >
            Đánh dấu cả lớp: Hoàn thành
          </button>
        </div>

        {previous.rows.map((row) => {
          const level = row.grades[activeSection.id] ?? null;
          return (
            <article className={styles.studentCard} key={row.student.id}>
              <div className={styles.studentHead}>
                <span className={styles.avatar} aria-hidden="true">
                  {initialsOf(row.student.name)}
                </span>
                <span className={styles.studentName}>{row.student.name}</span>
                <span className={styles.badges}>
                  {row.absentAtGiving && (
                    <span className={styles.absentChip}>
                      Vắng buổi giao bài
                    </span>
                  )}
                  {!level && <span className={styles.pendingChip}>Chưa chấm</span>}
                </span>
              </div>
              <div
                className={styles.levels}
                role="group"
                aria-label={`Chấm bài của ${row.student.name}`}
              >
                {HOMEWORK_LEVELS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={level === option}
                    disabled={!canWrite}
                    className={
                      styles.levelButton +
                      (level === option
                        ? " " + styles["level_" + option]
                        : "")
                    }
                    onClick={() =>
                      act(
                        () =>
                          setHomeworkGradeDurable(
                            activeSection.id,
                            row.student.id,
                            nextGrade(level, option),
                          ),
                        "Không lưu được kết quả chấm.",
                      )
                    }
                  >
                    {HOMEWORK_LEVEL_LABELS[option]}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </>
    );
  })();

  const todayGradingText = (plan: HomeworkGradingPlan) =>
    plan.session ? (
      <span>chấm ở {sessionPrefix(plan.session).toLowerCase()}</span>
    ) : (
      <b className={styles.warningText}>Chưa có buổi chấm</b>
    );

  const gradingBanner = (() => {
    if (grading.state === "moved" && grading.session) {
      const cancelled = grading.cancelled
        .map((item) => `Buổi ${formatDayMonth(item.date)}`)
        .join(", ");
      return (
        <div className={styles.gradingBanner} role="status">
          <span className={styles.gradingBannerIcon}>
            <Glyph size={20}>{infoIcon}</Glyph>
          </span>
          <span>
            {cancelled} đã bị hủy. BTVN buổi {currentNumber} chấm ở buổi{" "}
            {gradingNumber} · {weekdayDayMonth(grading.session.date)}. Phụ huynh
            thấy thay đổi này.
          </span>
        </div>
      );
    }
    if (grading.state === "none") {
      return (
        <div className={styles.gradingBanner} role="status">
          <span className={styles.gradingBannerIcon}>
            <Glyph size={20}>{infoIcon}</Glyph>
          </span>
          <span>
            Lịch lớp không còn buổi nào sau buổi {currentNumber}. Phụ huynh thấy
            “Chưa có buổi chấm” cho tới khi bạn thêm buổi vào lịch.
          </span>
        </div>
      );
    }
    return null;
  })();

  const todayBody = (() => {
    const { sections, missingKinds } = ctx.today;
    const addLabel = addPartLabel(missingKinds);
    return (
      <>
        {gradingBanner}
        <div className={styles.card}>
          <div>
            <p className={styles.cardTitle}>BTVN giao hôm nay</p>
            <p className={styles.cardMeta}>
              Một lần cho cả lớp · {partsCountLabel(sections.length)} ·{" "}
              {todayGradingText(grading)}
            </p>
          </div>
          {sections.length > 0 ? (
            <div className={styles.sectionList}>
              {sections.map((section) => (
                <div className={styles.sectionRow} key={section.id}>
                  <span className={styles.sectionIcon} aria-hidden="true">
                    <KindGlyph kind={section.kind} size={18} />
                  </span>
                  <div className={styles.sectionText}>
                    <p className={styles.sectionKind}>
                      {HOMEWORK_KIND_LABELS[section.kind].toLocaleUpperCase(
                        "vi-VN",
                      )}
                    </p>
                    <p className={styles.sectionTitle}>{section.title}</p>
                    {section.description && (
                      <p className={styles.sectionDescription}>
                        {section.description}
                      </p>
                    )}
                  </div>
                  {canWrite && (
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Sửa phần ${HOMEWORK_KIND_LABELS[section.kind]}`}
                      onClick={() => setEditor({ mode: "edit", id: section.id })}
                    >
                      <Glyph size={20}>{pencilIcon}</Glyph>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState size="compact" title="Chưa giao phần bài tập nào" />
          )}
          {canWrite && addLabel && (
            <button
              type="button"
              className={styles.softButton}
              onClick={() => {
                const kind = missingKinds[0];
                if (kind) setEditor({ mode: "add", kind });
              }}
            >
              + Thêm phần <span className={styles.addHint}>· {addLabel}</span>
            </button>
          )}
        </div>
      </>
    );
  })();

  const editingSection =
    editor?.mode === "edit"
      ? ctx.today.sections.find((section) => section.id === editor.id)
      : undefined;
  const editingGrades = editingSection
    ? listHomeworkGrades(editingSection.id)
    : [];
  const gradingTotal = grading.session
    ? studentsOnSession(state, grading.session).length
    : 0;

  return (
    <section className={styles.panel} aria-label="Bài tập về nhà">
      {backBar}
      {segmented}
      {errorBanner}
      {!canWrite && (
        <p className={styles.readOnlyNotice}>
          Bạn chỉ có quyền xem bài tập về nhà của buổi này.
        </p>
      )}
      {view === "previous" ? previousBody : todayBody}

      {editor && (editor.mode === "add" || editingSection) && (
        <SectionEditor
          key={editor.mode === "edit" ? editor.id : `add-${editor.kind}`}
          mode={editor.mode}
          sessionId={session.id}
          section={editingSection}
          initialKind={editor.mode === "add" ? editor.kind : undefined}
          existingKinds={ctx.today.sections.map((section) => section.kind)}
          missingKinds={ctx.today.missingKinds}
          gradeCount={editingGrades.length}
          gradingTotal={gradingTotal}
          onClose={() => setEditor(null)}
          onDirtyChange={onDirtyChange}
        />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- editor */

function SectionEditor({
  mode,
  sessionId,
  section,
  initialKind,
  existingKinds,
  missingKinds,
  gradeCount,
  gradingTotal,
  onClose,
  onDirtyChange,
}: {
  mode: "add" | "edit";
  sessionId: string;
  section?: HomeworkSection;
  initialKind?: HomeworkKind;
  existingKinds: HomeworkKind[];
  missingKinds: HomeworkKind[];
  gradeCount: number;
  gradingTotal: number;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const save = useSaveStatus();
  const initialKindValue = initialKind ?? missingKinds[0] ?? null;
  const [form, setForm] = useState<{
    kind: HomeworkKind | null;
    title: string;
    description: string;
  }>({
    kind: initialKindValue,
    title: section?.title ?? "",
    description: section?.description ?? "",
  });
  const kind = form.kind;
  const title = form.title;
  const description = form.description;
  const setKind = (next: HomeworkKind | null) => setForm((current) => ({ ...current, kind: next }));
  const setTitle = (next: string) => setForm((current) => ({ ...current, title: next }));
  const setDescription = (next: string) =>
    setForm((current) => ({ ...current, description: next }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const existing = new Set(existingKinds);
  const used = form.kind;
  const deletable = canDeleteSection(gradeCount);
  const action = useSaveAction({
    baseline: {
      kind: mode === "edit" ? (section?.kind ?? null) : initialKindValue,
      title: section?.title ?? "",
      description: section?.description ?? "",
    },
    value: { ...form, kind: mode === "edit" ? (section?.kind ?? null) : form.kind },
    validate: (value) => value.kind !== null && value.title.trim() !== "",
    save: async (value) => {
      if (!value.kind) return false;
      await saveHomeworkSectionDurable({
        id: section?.id,
        sessionId: section?.sessionId ?? sessionId,
        kind: value.kind,
        title: value.title,
        description: value.description,
      });
    },
  });
  const saved = useSavedPeek();
  const closeNow = () => {
    saved.cancel();
    onClose();
  };
  const dirtyNow = action.dirty;
  useEffect(() => {
    onDirtyChange?.(dirtyNow);
    return () => onDirtyChange?.(false);
  }, [dirtyNow, onDirtyChange]);
  const guard = useUnsavedCloseGuard(action, { onClose: closeNow });
  const requestClose = () => {
    if (guard.beforeClose()) closeNow();
  };
  const confirmDialog = <UnsavedChangesDialog {...guard.dialogProps} />;
  const error = removeError
    ? removeError
    : action.error
      ? action.error instanceof Error && action.error.message !== "save_failed"
        ? action.error.message
        : "Không lưu được phần bài tập."
      : "";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Chặn hành động mặc định của Esc: nếu không, trình duyệt đóng luôn hộp thoại "chưa lưu" vừa mở.
      event.preventDefault();
      requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  async function submit() {
    if (await action.submit()) {
      save.clearStatus();
      if (await saved.peek()) onClose();
    } else {
      save.setStatus("error");
    }
  }

  async function remove() {
    if (!section) return;
    setRemoveError("");
    try {
      await deleteHomeworkSectionDurable(section.id);
      save.clearStatus();
      onClose();
    } catch (cause) {
      save.setStatus("error");
      setConfirmDelete(false);
      setRemoveError(
        cause instanceof Error
          ? cause.message
          : "Không xoá được phần bài tập.",
      );
    }
  }

  const sheetTitle =
    mode === "add"
      ? "Thêm phần BTVN"
      : `Sửa phần · ${kindLabel(section?.kind ?? "exercise")}`;

  return (
    <>
    <div className={styles.overlay} onClick={requestClose} role="presentation">
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={sheetTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.grabber} aria-hidden="true" />
        {mode === "add" ? (
          <>
            <h2 className={styles.sheetTitle}>Thêm phần BTVN</h2>
            <div className={styles.kindField}>
              <p className={styles.label} id="hw-kind-label">
                Loại
              </p>
              <div
                className={styles.kindGrid}
                role="group"
                aria-labelledby="hw-kind-label"
              >
                {HOMEWORK_KINDS.map((option) => {
                  const taken = existing.has(option);
                  const chosen = kind === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={
                        styles.kindOption +
                        (chosen ? " " + styles.kindOptionOn : "") +
                        (taken ? " " + styles.kindOptionTaken : "")
                      }
                      aria-pressed={chosen}
                      disabled={taken}
                      onClick={() => setKind(option)}
                    >
                      <KindGlyph kind={option} size={18} />
                      <span className={styles.kindOptionLabel}>
                        {HOMEWORK_KIND_LABELS[option]}
                      </span>
                      {taken && <span className={styles.takenLabel}>Đã có</span>}
                    </button>
                  );
                })}
              </div>
              <p className={styles.helper}>
                Mỗi loại chỉ có một phần trong một buổi.
              </p>
            </div>
          </>
        ) : (
          <div className={styles.editHead}>
            <span className={styles.editBadge} aria-hidden="true">
              <KindGlyph kind={section?.kind ?? "exercise"} size={18} />
            </span>
            <h2 className={styles.editTitle}>{sheetTitle}</h2>
            <Pill tone={gradeCount > 0 ? "warning" : "neutral"}>
              {gradePillLabel(gradeCount, gradingTotal)}
            </Pill>
          </div>
        )}

        <div className={styles.formField}>
          <label className={styles.label} htmlFor="hw-title">
            Tiêu đề
          </label>
          <input
            id="hw-title"
            className={styles.input}
            value={title}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.label} htmlFor="hw-description">
            Mô tả{" "}
            <span className={styles.optional}>· không bắt buộc</span>
          </label>
          <textarea
            id="hw-description"
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        {error && (
          <p className={styles.sheetError} role="alert">
            {error}
          </p>
        )}

        {mode === "add" ? (
          <>
            <p className={styles.footHint}>
              <Glyph size={16}>{infoIcon}</Glyph>
              Phụ huynh thấy ngay khi lưu. Không đính kèm tệp.
            </p>
            {!action.valid && (
              <p className={styles.footHint}>Nhập tiêu đề để lưu phần bài tập</p>
            )}
            <Button size="lg" onClick={submit} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
              Lưu phần
            </Button>
          </>
        ) : (
          <>
            {confirmDelete ? (
              <div
                className={styles.confirmBox}
                role="alertdialog"
                aria-label="Xác nhận xoá phần"
              >
                <p className={styles.confirmTitle}>
                  Xoá phần “{section?.title}”?
                </p>
                <p className={styles.confirmText}>
                  Phụ huynh sẽ không thấy phần này nữa. Không thể hoàn tác.
                </p>
                <div className={styles.confirmActions}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Huỷ
                  </Button>
                  <Button variant="danger" size="md" onClick={remove}>
                    Xoá phần
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.deleteRow}>
                {deletable ? (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Glyph size={16}>{trashIcon}</Glyph>
                    Xoá phần
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.deleteButtonDisabled}
                    disabled
                    aria-describedby="hw-delete-reason"
                  >
                    <Glyph size={16}>{lockIcon}</Glyph>
                    Xoá phần
                  </button>
                )}
                <p id="hw-delete-reason" className={styles.deleteHint}>
                  {deletable
                    ? DELETE_ALLOWED_MESSAGE
                    : deleteBlockedMessage(gradeCount)}
                </p>
              </div>
            )}
            <p className={styles.savedHint}>
              <Glyph size={16}>{checkIcon}</Glyph>
              Phụ huynh thấy ngay khi lưu
            </p>
            {!action.dirty && (
              <p className={styles.footHint}>Chưa có thay đổi để lưu</p>
            )}
            <Button size="lg" onClick={submit} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
              Lưu
            </Button>
          </>
        )}
      </div>
    </div>
    {confirmDialog}
    </>
  );
}
