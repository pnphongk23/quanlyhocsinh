import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { useSaveAndLeave } from "../../shared/hooks/useSavedPeek";
import { Link } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import { listTests } from "../../data/repositories/tests";
import { listScores, saveScoreDurable } from "../../data/repositories/scores";
import { listStudents } from "../../data/repositories/students";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import { orderScoreGridStudents } from "../../data/logic";
import type { Class } from "../../data/types";
import { formatDayMonth } from "../../shared/format";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, EmptyState, LinkButton, UnsavedChangesDialog } from "../../shared/ui";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import s from "./ScoreGridDesktop.module.css";
import d from "../class-space/desktop.module.css";
import { formatScore, parseHalfScore } from "../../data/scoreFormat";
import {
  STUDENT_COLUMN,
  clampColumn,
  gridTokens,
  loadColumnWidths,
  saveColumnWidths,
  type ColumnWidths,
} from "./scoreColumns";

/** Giá trị ô điểm trong nháp: chuỗi người dùng đang gõ. */
export type ScoreDraft = { testId: string; studentId: string; value: string };

/**
 * Đọc giá trị một ô điểm: "" (ô trống, tức "Chưa có điểm"), null khi gõ chữ
 * không phải số, hoặc số đã đổi dấu phẩy thành dấu chấm.
 */
export function parseScoreInput(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  const value = parseHalfScore(text);
  if (value === null) return { ok: false };
  return { ok: true, value };
}

/** Khoá nháp của một ô: bài kiểm tra + học sinh. */
export function draftKey(testId: string, studentId: string): string {
  return `${testId}:${studentId}`;
}

/**
 * Bảng điểm nhập trực tiếp trên web (ảnh 13): học sinh × bài kiểm tra, mỗi cột
 * ghi "/điểm tối đa", cột học sinh ghim khi cuộn ngang, nút "Lưu điểm".
 * Không có điểm trung bình ở bất kỳ đâu.
 */
export default function ScoreGridDesktop({ classId }: { classId: string }) {
  useStore();
  const access = useAccess();
  const klass = getClass(classId) as Class | undefined;
  const students = orderScoreGridStudents(listStudents(classId));
  const tests = [...listTests(classId)].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const canWrite = access.can("scores", "write");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [widths, setWidths] = useState<ColumnWidths>(() =>
    loadColumnWidths(classId),
  );
  const widthsRef = useRef(widths);
  const tableRef = useRef<HTMLTableElement>(null);

  // Giá trị đã lưu của mọi ô; bản nháp chỉ ghi đè ô người dùng đã gõ.
  const baseline: Record<string, string> = {};
  for (const test of tests) {
    const scores = listScores(test.id);
    for (const student of students) {
      const score = scores.find((item) => item.studentId === student.id);
      baseline[draftKey(test.id, student.id)] =
        score && score.value !== null ? formatScore(score.value) : "";
    }
  }
  const value = { ...baseline, ...drafts };
  const isInvalid = (key: string): boolean => {
    if (value[key] === baseline[key]) return false;
    const parsed = parseScoreInput(value[key]);
    if (!parsed.ok) return true;
      return parsed.value !== null && (parsed.value < 0 || parsed.value > 1000 || Math.round(parsed.value * 2) !== parsed.value * 2);
  };
  const invalidCount = Object.keys(drafts).filter(isInvalid).length;

  const action = useSaveAction<Record<string, string>>({
    baseline,
    value,
    validate: () => invalidCount === 0,
    save: async (next) => {
      for (const key of Object.keys(next)) {
        if (next[key] === baseline[key]) continue;
        const [testId, studentId] = key.split(":");
        const parsed = parseScoreInput(next[key]);
        if (!parsed.ok) throw new Error("Điểm phải theo bước 0,5. Ví dụ 7,5 hoặc 7.5.");
        await saveScoreDurable({ testId, studentId, value: parsed.value });
      }
      setDrafts({});
    },
  });
  const guard = useLeaveGuard(action.dirty);
  const leave = useSaveAndLeave();

  if (!klass) return null;

  const widthStyle = (id: string): CSSProperties | undefined =>
    widths[id] === undefined ? undefined : { width: widths[id] };


  const measureColumn = (id: string): number =>
    tableRef.current
      ?.querySelector(`[data-col="${id}"]`)
      ?.getBoundingClientRect().width ?? 0;

  function resizeColumn(id: string, width: number, commit: boolean) {
    const next = { ...widthsRef.current, [id]: clampColumn(width) };
    widthsRef.current = next;
    setWidths(next);
    if (commit) saveColumnWidths(classId, next);
  }

  /** Chuyển focus sang ô khác trong bảng; false khi không còn ô ở hướng đó. */
  function moveFocus(from: HTMLInputElement, rows: number, cols: number): boolean {
    const row = Number(from.dataset.row) + rows;
    const col = Number(from.dataset.col) + cols;
    const target = tableRef.current?.querySelector<HTMLInputElement>(
      `input[data-row="${row}"][data-col="${col}"]:not(:disabled)`,
    );
    if (!target) return false;
    target.focus();
    target.select();
    return true;
  }

  /** Phím di chuyển giữa các ô như Excel; Tab và các tổ hợp phím giữ nguyên. */
  function onCellKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    const input = event.currentTarget;
    const length = input.value.length;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    switch (event.key) {
      case "Enter":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(input, 1, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(input, -1, 0);
        break;
      case "ArrowLeft":
        if (start === 0 && (end === 0 || end === length) && moveFocus(input, 0, -1))
          event.preventDefault();
        break;
      case "ArrowRight":
        if (end === length && (start === length || start === 0) && moveFocus(input, 0, 1))
          event.preventDefault();
        break;
    }
  }

  function setCell(testId: string, studentId: string, raw: string) {
    setDrafts((current) => ({
      ...current,
      [draftKey(testId, studentId)]: raw,
    }));
  }

  return (
    <main className={d.page}>
      <ClassDesktopHeader
        classId={classId}
        klass={klass}
        actions={
          canWrite ? (
            <Button
              size="md"
              loading={action.saving}
              done={action.justSaved}
              disabled={!action.canSave}
              onClick={() => void action.submit()}
            >
              Lưu điểm
            </Button>
          ) : undefined
        }
      />

      {action.error != null && (
        <p role="alert" className={d.error}>
          {action.error instanceof Error && action.error.message !== "save_failed"
            ? action.error.message
            : "Không lưu được điểm."}
        </p>
      )}
      {invalidCount > 0 && (
        <p className={d.error}>Sửa {invalidCount} ô lỗi để lưu điểm</p>
      )}

      {!tests.length ? (
        <div className={d.card}>
          <EmptyState
            title="Chưa có bài kiểm tra"
            description="Tạo bài kiểm tra đầu tiên, sau đó nhập điểm cho cả lớp."
            action={
              canWrite ? (
                <LinkButton size="md" to={`/lop/${classId}/bai-kiem-tra/moi`}>
                  Tạo bài kiểm tra
                </LinkButton>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className={d.card + " " + s.card}>
          <div className={s.scroll}>
            <table className={s.table} ref={tableRef}>
              <thead>
                <tr>
                  <th className={s.studentHead}>
                    <div
                      className={s.studentBody}
                      data-col={STUDENT_COLUMN}
                      style={widthStyle(STUDENT_COLUMN)}
                    >
                      Học sinh
                    </div>
                    <ColumnResizer
                      label="Đổi độ rộng cột Học sinh"
                      measure={() => measureColumn(STUDENT_COLUMN)}
                      fallback={widths[STUDENT_COLUMN] ?? gridTokens().nameMin}
                      onResize={(width, commit) =>
                        resizeColumn(STUDENT_COLUMN, width, commit)
                      }
                    />
                  </th>
                  {tests.map((test) => (
                    <th key={test.id}>
                      <div
                        className={s.testBody}
                        data-col={test.id}
                        style={widthStyle(test.id)}
                      >
                        <Link
                          className={d.link + " " + s.testName}
                          to={`/lop/${classId}/bai-kiem-tra/${test.id}`}
                          title={test.name}
                        >
                          {test.name}
                        </Link>
                          <span className={s.testMeta}>{formatDayMonth(test.date)}</span>
                      </div>
                      <ColumnResizer
                        label={`Đổi độ rộng cột ${test.name}`}
                        measure={() => measureColumn(test.id)}
                        fallback={widths[test.id] ?? gridTokens().cellMin}
                        onResize={(width, commit) =>
                          resizeColumn(test.id, width, commit)
                        }
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, row) => (
                  <tr key={student.id}>
                    <th scope="row" className={s.studentCell}>
                      <div
                        className={s.studentBody}
                        style={widthStyle(STUDENT_COLUMN)}
                        title={student.name}
                      >
                        {student.name}
                        {student.status === "left" && (
                          <span className={s.leftLabel}> Đã nghỉ</span>
                        )}
                      </div>
                    </th>
                    {tests.map((test, col) => (
                      <td key={test.id}>
                        <input
                          className={s.cell}
                          style={widthStyle(test.id)}
                          type="text"
                          inputMode="decimal"
                          data-row={row}
                          data-col={col}
                          aria-label={`Điểm ${test.name} của ${student.name}`}
                          placeholder="Chưa có điểm"
                          value={value[draftKey(test.id, student.id)] ?? ""}
                          aria-invalid={isInvalid(draftKey(test.id, student.id)) || undefined}
                          disabled={!canWrite}
                          onChange={(event) =>
                            setCell(test.id, student.id, event.target.value)
                          }
                          onKeyDown={onCellKeyDown}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.note}>
              Ô trống là “Chưa có điểm”. Nhập điểm từ 0 đến 1000 theo bước 0,5, ví dụ 7,5 hoặc 7.5.
          </p>
        </div>
      )}
      {guard.blocked && (
        <UnsavedChangesDialog
          open
          title="Điểm chưa lưu"
          message="Bạn đang nhập điểm dở. Lưu trước khi rời màn này?"
          saving={action.saving}
          done={leave.done}
          onSave={() => leave.run(action.submit, guard.proceed)}
          onDiscard={() => {
            leave.cancel();
            setDrafts({});
            guard.proceed();
          }}
          onStay={() => {
            leave.cancel();
            guard.stay();
          }}
        />
      )}
    </main>
  );
}

/**
 * Tay nắm ở mép phải tiêu đề cột: kéo bằng chuột/cảm ứng, hoặc focus rồi bấm
 * ←/→ để đổi từng bước. `onResize(width, true)` báo lần chỉnh cuối để lưu.
 */
function ColumnResizer({
  label,
  measure,
  fallback,
  onResize,
}: {
  label: string;
  measure: () => number;
  fallback: number;
  onResize: (width: number, commit: boolean) => void;
}) {
  const drag = useRef<{ x: number; width: number; last: number } | null>(null);
  const current = () => measure() || fallback;

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const width = current();
    drag.current = { x: event.clientX, width, last: width };
  }
  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    const state = drag.current;
    if (!state) return;
    state.last = state.width + event.clientX - state.x;
    onResize(state.last, false);
  }
  function onPointerEnd() {
    const state = drag.current;
    drag.current = null;
    if (state) onResize(state.last, true);
  }
  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const delta = event.key === "ArrowLeft" ? -gridTokens().step : gridTokens().step;
    onResize(current() + delta, true);
  }

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      className={s.resizer}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    />
  );
}
