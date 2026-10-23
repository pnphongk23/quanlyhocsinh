import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useStore } from "../../data/store";
import { getClass, listClasses } from "../../data/repositories/classes";
import { listStudents } from "../../data/repositories/students";
import { deleteTest, listTests, updateTest } from "../../data/repositories/tests";
import { listScores, saveScore } from "../../data/repositories/scores";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import { useSaveAction, type SaveAction } from "../../shared/hooks/useSaveAction";
import { savedPeek } from "../closeAfterSaved";
import { useAccess } from "../../data/repositories/access";
import { useSaveStatus } from "../../shared/SaveStatus";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { formatDayMonthLong } from "../../shared/format";
import type { SaveState, Test } from "../../data/types";
import {
  ActionFooter,
  Button,
  EmptyState,
  Icon,
  Input,
  LinkButton,
  Modal,
  NoAccess,
  PageHeader,
  Sheet,
  UnsavedChangesDialog as SharedUnsavedChangesDialog,
} from "../../shared/ui";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import {
  clearClassTestDrafts,
  draftsForClass,
  entriesForClassTests,
  type ClassScoreDrafts,
  type ScoreDraft,
} from "./scoreDrafts";
import { AlertTriangleIcon } from "./ScoreIcons";
import { formatScore, parseHalfScore } from "../../data/scoreFormat";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useUnsavedCloseGuard } from "../../shared/hooks/useUnsavedCloseGuard";
import s from "./scores.module.css";

const keyFor = (testId: string, studentId: string) => `${testId}:${studentId}`;

/** Điểm gõ dở ngoài thang 0–max của bài (ô trống không tính là lỗi). */
export function isInvalidDraft(draft: ScoreDraft, max: number): boolean {
  const raw = draft.value.trim();
  if (raw === "") return false;
  const parsed = parseHalfScore(raw);
  return parsed === null || parsed < 0 || parsed > max;
}

export default function TestScoresPage() {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const { classId = "", testId = "" } = useParams();
  useStore();
  const access = useAccess();
  const { status, markUnsaved, clearStatus, setStatus } = useSaveStatus();
  const classItem = getClass(classId);
  const test = listTests(classId).find((item) => item.id === testId);
  const testMax = test?.max ?? 0;
  const students = listStudents(classId, false);
  const [drafts, setDrafts] = useState<ClassScoreDrafts>({});
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [leaveAfterDelete, setLeaveAfterDelete] = useState(false);
  const listPath = `/lop/${classId}/bai-kiem-tra`;
  const currentTestIds = new Set([testId]);
  const classDrafts = draftsForClass(drafts, classId);
  const currentDraftEntries = entriesForClassTests(drafts, classId, currentTestIds);
  const otherDraftClasses = listClasses().filter(
    (item) =>
      item.id !== classId &&
      Object.keys(draftsForClass(drafts, item.id)).length > 0,
  );
  const draftValue = (studentId: string): ScoreDraft => {
    const draft = classDrafts[keyFor(testId, studentId)];
    if (draft) return draft;
    const score = listScores(testId).find((item) => item.studentId === studentId);
    return {
      value:
        score?.value === null || score?.value === undefined
          ? ""
          : formatScore(score.value),
    };
  };
  const storedValues: Record<string, string> = {};
  const typedValues: Record<string, string> = {};
  for (const student of students) {
    const score = listScores(testId).find((item) => item.studentId === student.id);
    storedValues[student.id] =
      score?.value === null || score?.value === undefined ? "" : formatScore(score.value);
    typedValues[student.id] = draftValue(student.id).value;
  }
  const invalidTotal = students.filter((student) =>
    isInvalidDraft({ value: typedValues[student.id] }, testMax),
  ).length;
  const action = useSaveAction({
    baseline: storedValues,
    value: typedValues,
    validate: () => invalidTotal === 0,
    save: () => save(),
  });
  const dirty = action.dirty;
  const guard = useLeaveGuard(dirty);
  // Bấm một ô trong bảng điểm sẽ mở kèm `?hoc-sinh=…` để focus đúng ô của em đó.
  const [searchParams] = useSearchParams();
  const focusStudentId = searchParams.get("hoc-sinh") ?? "";
  const focusRef = useRef<HTMLInputElement>(null);
  const removeLock = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const focusMatched = students.some(
    (student) => student.id === focusStudentId,
  );
  useEffect(() => {
    if (!focusMatched) return;
    focusRef.current?.scrollIntoView({ block: "center" });
  }, [focusMatched]);
  // Đã xoá/lưu trữ bài thì rời danh sách sau khi nháp của bài được dọn, để
  // không bị hỏi lại "còn thay đổi chưa lưu".
  useEffect(() => {
    if (leaveAfterDelete && !dirty) navigate(listPath);
  }, [dirty, leaveAfterDelete, listPath, navigate]);

  if (!access.can("scores", "read")) return <NoAccess what="bảng điểm" />;
  const canWrite = access.can("scores", "write");

  const valueFor = draftValue;
  const change = (studentId: string, patch: Partial<ScoreDraft>) => {
    markUnsaved();
    setDrafts((current) => {
      const now = draftsForClass(current, classId);
      const key = keyFor(testId, studentId);
      return {
        ...current,
        [classId]: {
          ...now,
          [key]: { ...(now[key] ?? valueFor(studentId)), ...patch },
        },
      };
    });
  };
  /** Trả về true khi đã lưu xong, false khi còn lỗi. */
  const save = (): boolean => {
    try {
      for (const [key, draft] of currentDraftEntries) {
        const [entryTestId, studentId] = key.split(":");
        const old = listScores(entryTestId).find(
          (item) => item.studentId === studentId,
        );
          const parsed = draft.value.trim() === "" ? null : parseHalfScore(draft.value);
          if (isInvalidDraft(draft, testMax))
            throw new Error(`Điểm phải từ 0 đến ${testMax}, theo bước 0,5.`);
        if (old && old.value === parsed) continue;
        if (!old && parsed === null) continue;
        // `absent` đã bỏ khỏi Score (đã chốt 2026-10-19); ép kiểu để file này
        // chạy được cả trước và sau khi kiểu dữ liệu bỏ hẳn trường đó.
        saveScore({
          testId: entryTestId,
          studentId,
          value: parsed,
        } as Parameters<typeof saveScore>[0]);
      }
      setDrafts((current) => clearClassTestDrafts(current, classId, currentTestIds));
      setError("");
      clearStatus();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được điểm.");
      setStatus("error");
      return false;
    }
  };
  /** Enter chuyển xuống em kế tiếp; ở em cuối thì đóng bàn phím. */
  const onScoreEnter = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const next = listRef.current?.querySelector<HTMLInputElement>(
      `input[data-row="${index + 1}"]:not(:disabled)`,
    );
    if (next) {
      next.focus();
      next.select();
    } else event.currentTarget.blur();
  };
  const discardDrafts = () => {
    setDrafts((current) => clearClassTestDrafts(current, classId, currentTestIds));
    setError("");
    clearStatus();
  };

  if (!test)
    return (
      <EmptyState title="Không tìm thấy bài kiểm tra">
        <LinkButton to={`/lop/${classId}/bai-kiem-tra`}>
          Về danh sách bài kiểm tra
        </LinkButton>
      </EmptyState>
    );

  const invalidCount = students.filter((student) =>
    isInvalidDraft(valueFor(student.id), testMax),
  ).length;
  // Mọi ô đều trống nghĩa là bài chưa có điểm nào: xoá hẳn thay vì lưu trữ.
  const hasScores = listScores(testId).some(
    (score) => score.value !== null && score.value !== undefined,
  );
  const remove = () => {
    if (removeLock.current) return;
    removeLock.current = true;
    try {
      deleteTest(testId);
    } catch (cause) {
      removeLock.current = false;
      setConfirmDelete(false);
      setError(cause instanceof Error ? cause.message : "Không xoá được bài kiểm tra.");
      return;
    }
    setConfirmDelete(false);
    discardDrafts();
    setLeaveAfterDelete(true);
  };

  return (
    <section className={s.page}>
      <PageHeader
        backTo={listPath}
        eyebrow={classItem?.name ?? "Lớp học"}
        title="Điểm số"
        actions={
          canWrite ? (
            <button
              type="button"
              className={s.moreButton}
              aria-label="Tuỳ chọn bài kiểm tra"
              title="Tuỳ chọn bài kiểm tra"
              onClick={() => {
                setMenuOpen(true);
                setError("");
              }}
            >
              <Icon name="more" />
            </button>
          ) : undefined
        }
      />
      <div className={s.testCard}>
        <div className={s.testCardText}>
          <p className={s.testCardName}>{test.name}</p>
          <p className={s.testCardMeta}>
            Ngày {formatDayMonthLong(test.date)} · Thang {test.max} điểm
          </p>
        </div>
        <Link className={s.switchTest} to={listPath}>
          Đổi bài
          <Icon name="chevron-down" size={18} />
        </Link>
      </div>
      {canWrite && (
        <Sheet
          title="Tuỳ chọn bài kiểm tra"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        >
          <div className={s.sheetActions}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setMenuOpen(false);
                setEditing(true);
              }}
            >
              Sửa bài
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setMenuOpen(false);
                setError("");
                setConfirmDelete(true);
              }}
            >
              Xoá bài
            </Button>
          </div>
        </Sheet>
      )}
      {otherDraftClasses.map((item) => (
        <p className={s.draftNotice} key={item.id}>
          Còn bản nháp chưa lưu của lớp {item.name}.{" "}
          <Link to={`/lop/${item.id}/diem`}>Quay lại lớp này</Link>
        </p>
      ))}
      {!canWrite && (
        <p className={s.draftNotice}>Bạn chỉ có quyền xem điểm của lớp này.</p>
      )}
      <div className={s.columns}>
        <span className={s.colStudent}>Học sinh</span>
        <span className={s.colScore}>Điểm</span>
      </div>
      <div className={s.studentList} ref={listRef}>
        {students.map((student, index) => {
          const draft = valueFor(student.id);
          const invalid = isInvalidDraft(draft, testMax);
          const missing = draft.value.trim() === "";
          return (
            <div
              key={student.id}
              className={
                s.studentRow + (invalid ? " " + s.studentRowInvalid : "")
              }
            >
              <div className={s.studentRowMain}>
                <div className={s.studentNameBox}>
                  <span className={s.studentName}>{student.name}</span>
                  {missing && (
                    <span className={s.studentMissing}>Chưa có điểm</span>
                  )}
                </div>
                <input
                  ref={student.id === focusStudentId ? focusRef : undefined}
                  autoFocus={student.id === focusStudentId}
                  className={
                    s.scoreInput +
                    (missing ? " " + s.scoreInputEmpty : "") +
                    (invalid ? " " + s.scoreInputInvalid : "")
                  }
                  aria-label={`Điểm ${student.name}`}
                  aria-invalid={invalid || undefined}
                  inputMode="decimal"
                  placeholder="–"
                  value={draft.value}
                  disabled={!canWrite}
                  enterKeyHint={index === students.length - 1 ? "done" : "next"}
                  data-row={index}
                  onChange={(event) =>
                    change(student.id, { value: event.target.value })
                  }
                  onKeyDown={(event) => onScoreEnter(event, index)}
                />
              </div>
              {invalid && (
                <span className={s.rowError}>
                  <AlertTriangleIcon />
                    Điểm từ 0 đến {testMax}, theo bước 0,5
                </span>
              )}
            </div>
          );
        })}
      </div>
      {canWrite &&
        (desktop ? (
          <div className={s.desktopSaveRow}>
            <SaveBarContent
              status={status}
              error={error}
              invalidCount={invalidCount}
              action={action}
            />
          </div>
        ) : (
          <ActionFooter>
            <SaveBarContent
              status={status}
              error={error}
              invalidCount={invalidCount}
              action={action}
            />
          </ActionFooter>
        ))}
      <UnsavedChangesDialog
        open={guard.blocked}
        testName={test.name}
        onSave={async () => {
          if (await action.submit()) guard.proceed();
        }}
        onDiscard={() => {
          discardDrafts();
          guard.proceed();
        }}
        onStay={guard.stay}
      />
      {editing && (
        <EditTestModal test={test} onClose={() => setEditing(false)} />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={hasScores ? "Lưu trữ bài kiểm tra?" : "Xoá bài kiểm tra?"}
        message={
          hasScores
            ? "Bài đã có điểm nên sẽ được lưu trữ; điểm đã nhập vẫn giữ, bài ẩn khỏi bảng điểm và báo cáo."
            : "Bài chưa có điểm nào nên sẽ bị xoá hẳn."
        }
        actions={[
          hasScores
            ? { label: "Lưu trữ bài", variant: "danger", onClick: remove }
            : { label: "Xoá bài", variant: "danger", onClick: remove },
          {
            label: "Giữ bài",
            variant: "neutral",
            onClick: () => setConfirmDelete(false),
          },
        ]}
        onDismiss={() => setConfirmDelete(false)}
      />
    </section>
  );
}

/** Sửa tên, ngày và thang điểm của bài đang mở. */
function EditTestModal({
  test,
  onClose,
}: {
  test: Test;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: test.name,
    date: test.date,
    max: String(test.max),
  });
  const action = useSaveAction({
    baseline: { name: test.name, date: test.date, max: String(test.max) },
    value: form,
    validate: (value) => {
      const max = Number(value.max.trim());
      return (
        value.name.trim() !== "" &&
        value.date !== "" &&
        Number.isInteger(max) &&
        max >= 1 &&
        max <= 1000
      );
    },
    save: (value) =>
      updateTest(test.id, {
        name: value.name,
        date: value.date,
        max: Number(value.max.trim()),
      }),
  });
  const closeNow = onClose;
  const guard = useUnsavedCloseGuard(action, { onClose: closeNow });
  const confirmDialog = <UnsavedChangesDialog {...guard.dialogProps} />;
  const error = action.error
    ? action.error instanceof Error && action.error.message !== "save_failed"
      ? action.error.message
      : "Không lưu được bài kiểm tra."
    : "";
  return (
    <>
      <Modal title="Sửa bài kiểm tra" open onClose={closeNow}
        beforeClose={guard.beforeClose}>
        <form
          className={s.form}
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (await action.submit()) {
              await savedPeek();
              onClose();
            }
          }}
          noValidate
        >
          <Input
            label="Tên bài kiểm tra"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <Input
            label="Ngày kiểm tra"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
          <Input
            label="Điểm tối đa"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            step={1}
            value={form.max}
            onChange={(event) => setForm({ ...form, max: event.target.value })}
            required
          />
          {error && (
            <p role="alert" className={s.errorBanner}>
              <AlertTriangleIcon size={18} />
              <span className={s.errorBannerText}>{error}</span>
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            loading={action.saving}
            done={action.justSaved}
            disabled={!action.canSave}
          >
            Lưu thay đổi
          </Button>
        </form>
      </Modal>
      {confirmDialog}
    </>
  );
}

function SaveBarContent({
  status,
  error,
  invalidCount,
  action,
}: {
  status: SaveState;
  error: string;
  invalidCount: number;
  action: SaveAction;
}) {
  const { canSave } = action;
  const onSave = () => void action.submit();
  return (
    <>
      {status === "error" && (
        <div className={s.errorBanner} role="alert">
          <AlertTriangleIcon size={18} />
          <span className={s.errorBannerText}>
            {error || "Lỗi lưu, vui lòng thử lại"}
          </span>
          <button type="button" className={s.retryButton} onClick={onSave}>
            Thử lại
          </button>
        </div>
      )}
      {invalidCount > 0 ? (
        <p className={s.saveReason}>Sửa {invalidCount} ô lỗi để lưu điểm</p>
      ) : (
        !canSave &&
        !action.saving &&
        !action.justSaved && (
          <p className={s.saveReason + " " + s.saveReasonMuted}>
            Chưa có thay đổi để lưu
          </p>
        )
      )}
      <Button
        size="lg"
        block
        className={s.saveButton}
        loading={action.saving}
        done={action.justSaved}
        disabled={!canSave}
        onClick={onSave}
      >
        Lưu điểm
      </Button>
    </>
  );
}
