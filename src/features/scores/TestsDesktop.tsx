import { useRef, useState, type FormEvent } from "react";
import { useDismiss } from "../../shared/hooks/useDismiss";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Link } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import {
  createTestDurable,
  deleteTestDurable,
  listTests,
  updateTestDurable,
} from "../../data/repositories/tests";
import { listScores } from "../../data/repositories/scores";
import { listStudents } from "../../data/repositories/students";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import type { Class, Student, Test } from "../../data/types";
import { useSavedPeek } from "../../shared/hooks/useSavedPeek";
import { todayISO } from "../../shared/format";
import {
  Button,
  EmptyState,
  Input,
  Modal,
  Pill,
  UnsavedChangesDialog,
} from "../../shared/ui";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import s from "./TestsDesktop.module.css";
import d from "../class-space/desktop.module.css";

/** Ngày kiểm tra kiểu "25/09/26" như ảnh 08. */
export function testDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(iso + "T12:00:00"));
}

/** Số em đã có điểm / sĩ số của lớp, dùng cho cột "Đã có điểm". */
export function scoredCount(testId: string, students: Student[]): number {
  const scores = listScores(testId);
  return students.filter((student) =>
    scores.some(
      (score) => score.studentId === student.id && score.value !== null,
    ),
  ).length;
}

/** Nhãn cột "Đã có điểm": đủ thì xanh, một phần thì xanh dương, chưa có thì vàng. */
export function scoredPill(scored: number, total: number): {
  label: string;
  tone: "success" | "primary" | "warning";
} {
  if (scored === 0) return { label: "Chưa có điểm", tone: "warning" };
  if (scored === total) return { label: `${scored}/${total} em`, tone: "success" };
  return { label: `${scored}/${total} em`, tone: "primary" };
}

/**
 * Nội dung hộp thoại xoá bài kiểm tra, theo spec mục 4: chưa có điểm thì xoá
 * hẳn, đã có điểm (kể cả 0) thì lưu trữ.
 */
export function deleteDialogCopy(
  scored: number,
  total: number,
): {
  kind: "delete" | "archive";
  badge: string;
  message: string;
  action: string;
} {
  if (scored === 0)
    return {
      kind: "delete",
      badge: "Chưa có điểm: xoá hẳn",
      message:
        "Chưa em nào có điểm ở bài này, nên bài sẽ bị xoá hẳn và không khôi phục được.",
      action: "Xoá hẳn",
    };
  return {
    kind: "archive",
    badge: "Đã có điểm: lưu trữ",
    message: `${scored}/${total} em đã có điểm. Bài sẽ được lưu trữ: ẩn khỏi bảng điểm, điểm đã nhập vẫn được giữ.`,
    action: "Lưu trữ bài",
  };
}

type Dialog =
  | { mode: "create" }
  | { mode: "edit"; test: Test }
  | { mode: "delete"; test: Test }
  | null;

export default function TestsDesktop({ classId }: { classId: string }) {
  useStore();
  const access = useAccess();
  const klass = getClass(classId) as Class | undefined;
  const students = listStudents(classId);
  const tests = [...listTests(classId)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const canWrite = access.can("scores", "write");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [menuTestId, setMenuTestId] = useState<string | null>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  useDismiss(menuTestId !== null, () => setMenuTestId(null), menuWrapRef);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!klass) return null;

  async function confirmDelete(test: Test) {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteTestDurable(test.id);
      setDialog(null);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không xoá được bài kiểm tra.",
      );
    } finally {
      setDeleting(false);
    }
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
              onClick={() => {
                setError("");
                setDialog({ mode: "create" });
              }}
            >
              Tạo bài kiểm tra
            </Button>
          ) : undefined
        }
      />

      {error && !(dialog && dialog.mode === "delete") && (
        <p role="alert" className={d.error}>
          {error}
        </p>
      )}

      <div className={d.card + " " + s.card}>
        <table className={s.table}>
          <colgroup>
            <col />
            <col style={{ width: 130 }} />
              <col style={{ width: 170 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Tên bài kiểm tra</th>
              <th>Ngày</th>
              <th>Đã có điểm</th>
              <th aria-label="Thao tác" />
            </tr>
          </thead>
          <tbody>
            {tests.length ? (
              tests.map((test) => {
                const scored = scoredCount(test.id, students);
                const pill = scoredPill(scored, students.length);
                return (
                  <tr key={test.id}>
                    <td>
                      <Link
                        className={d.link + " " + s.testName}
                        to={`/lop/${classId}/bai-kiem-tra/${test.id}`}
                      >
                        {test.name}
                      </Link>
                    </td>
                    <td>{testDateLabel(test.date)}</td>
                    <td>
                      <Pill tone={pill.tone}>{pill.label}</Pill>
                    </td>
                    <td>
                      <div
                        ref={menuTestId === test.id ? menuWrapRef : undefined}
                        className={s.menuWrap}
                      >
                        <button
                          type="button"
                          className={d.rowButton}
                          aria-label={`Thêm tùy chọn ${test.name}`}
                          aria-haspopup="menu"
                          aria-expanded={menuTestId === test.id}
                          onClick={() =>
                            setMenuTestId(
                              menuTestId === test.id ? null : test.id,
                            )
                          }
                        >
                          <span aria-hidden="true">⋯</span>
                        </button>
                        {canWrite && menuTestId === test.id && (
                          <div className={s.menu} role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              className={s.menuItem}
                              onClick={() => {
                                setMenuTestId(null);
                                setError("");
                                setDialog({ mode: "edit", test });
                              }}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className={s.menuItemDanger}
                              onClick={() => {
                                setMenuTestId(null);
                                setError("");
                                setDialog({ mode: "delete", test });
                              }}
                            >
                              Xoá
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    size="compact"
                    title="Chưa có bài kiểm tra"
                    description="Tạo bài đầu tiên để nhập điểm cho cả lớp."
                    action={
                      canWrite ? (
                        <Button
                          size="md"
                          onClick={() => {
                            setError("");
                            setDialog({ mode: "create" });
                          }}
                        >
                          Tạo bài kiểm tra
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && dialog.mode !== "delete" && (
        <TestFormModal
          classId={classId}
          test={dialog.mode === "edit" ? dialog.test : undefined}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog && dialog.mode === "delete" && (() => {
        const scored = scoredCount(dialog.test.id, students);
        const copy = deleteDialogCopy(scored, students.length);
        return (
          <Modal
            title={`Xoá bài “${dialog.test.name}”?`}
            open
            onClose={() => setDialog(null)}
          >
            <div className={s.form}>
              <Pill
                tone={copy.kind === "delete" ? "warning" : "primary"}
                className={s.badge}
              >
                {copy.badge}
              </Pill>
              <p className={s.confirmText}>{copy.message}</p>
              {error && (
                <p role="alert" className={d.error}>
                  {error}
                </p>
              )}
              <div className={s.dialogActions}>
                <Button variant="neutral" onClick={() => setDialog(null)}>
                  Hủy
                </Button>
                <Button
                  className={s.solidDanger}
                  loading={deleting}
                  onClick={() => confirmDelete(dialog.test)}
                >
                  {copy.action}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </main>
  );
}

const MAX_SCORE_LIMIT = 1000;

/** Form tạo/sửa bài kiểm tra: chỉ lưu khi có thay đổi hợp lệ; đóng khi nhập dở thì hỏi. */
function TestFormModal({
  classId,
  test,
  onClose,
}: {
  classId: string;
  test?: Test;
  onClose: () => void;
}) {
  const initial = {
    name: test?.name ?? "",
    date: test?.date ?? todayISO(),
  };
  const [name, setName] = useState(initial.name);
  const [date, setDate] = useState(initial.date);
  const [asking, setAsking] = useState(false);
  const action = useSaveAction({
    baseline: initial,
      value: { name: name.trim(), date },
    isEqual: (a, b) =>
        a.name.trim() === b.name.trim() && a.date === b.date,
      validate: (next) => next.name !== "" && next.date !== "",
    save: async (next) => {
        const input = { name: next.name, date: next.date };
      if (test) await updateTestDurable(test.id, input);
      else await createTestDurable({ classId, ...input });
    },
  });
  const saved = useSavedPeek();
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if ((await action.submit()) && (await saved.peek())) onClose();
  }
  const closeNow = () => {
    saved.cancel();
    onClose();
  };
  const requestClose = () => (action.dirty ? setAsking(true) : closeNow());
  return (
    <>
      <Modal
        title={test ? "Sửa bài kiểm tra" : "Tạo bài kiểm tra"}
        open
        onClose={requestClose}
      >
        <form className={s.form} onSubmit={submit}>
          <Input
            label="Tên bài kiểm tra"
            name="name"
            placeholder="Ví dụ: Kiểm tra Unit 8"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            required
          />
          <Input
            label="Ngày kiểm tra"
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          {action.error != null && (
            <p role="alert" className={d.error}>
              {action.error instanceof Error &&
              action.error.message !== "save_failed"
                ? action.error.message
                : "Không lưu được bài kiểm tra."}
            </p>
          )}
          <div className={s.dialogActions}>
            <Button variant="neutral" onClick={requestClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              loading={action.saving}
              done={action.justSaved}
              disabled={!action.canSave}
            >
              {test ? "Lưu thay đổi" : "Tạo bài"}
            </Button>
          </div>
        </form>
      </Modal>
      {asking && (
        <UnsavedChangesDialog
          open
          title="Bài kiểm tra chưa lưu"
          message="Bạn đang nhập dở thông tin bài kiểm tra. Lưu trước khi đóng?"
          saving={action.saving}
          done={action.justSaved}
          onSave={() => void submit()}
          onDiscard={closeNow}
          onStay={() => {
            saved.cancel();
            setAsking(false);
          }}
        />
      )}
    </>
  );
}
