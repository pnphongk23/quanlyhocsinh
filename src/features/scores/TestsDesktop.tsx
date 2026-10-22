import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import {
  createTest,
  DEFAULT_TEST_MAX,
  deleteTest,
  listTests,
  updateTest,
} from "../../data/repositories/tests";
import { listScores } from "../../data/repositories/scores";
import { listStudents } from "../../data/repositories/students";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import type { Class, Student, Test } from "../../data/types";
import { todayISO } from "../../shared/format";
import { Button, Input, Modal, Pill } from "../../shared/ui";
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
  const [error, setError] = useState("");

  if (!klass) return null;

  function submitTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || dialog.mode === "delete") return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const date = String(data.get("date") ?? "");
    const max = Number(String(data.get("max") ?? "").trim());
    setError("");
    try {
      if (dialog.mode === "create") {
        createTest({ classId, name, date, max });
      } else {
        updateTest(dialog.test.id, { name, date, max });
      }
      setDialog(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không lưu được bài kiểm tra.",
      );
    }
  }

  function confirmDelete(test: Test) {
    try {
      deleteTest(test.id);
      setDialog(null);
      setError("");
    } catch (cause) {
      setDialog(null);
      setError(
        cause instanceof Error ? cause.message : "Không xoá được bài kiểm tra.",
      );
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

      {error && (
        <p role="alert" className={d.error}>
          {error}
        </p>
      )}

      <div className={d.card + " " + s.card}>
        <table className={s.table}>
          <colgroup>
            <col />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Tên bài kiểm tra</th>
              <th>Ngày</th>
              <th>Điểm tối đa</th>
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
                    <td>{test.max}</td>
                    <td>
                      <Pill tone={pill.tone}>{pill.label}</Pill>
                    </td>
                    <td>
                      <div className={s.menuWrap}>
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
                  <p className={d.muted14}>
                    Chưa có bài kiểm tra. Tạo bài đầu tiên để nhập điểm cho cả
                    lớp.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && dialog.mode !== "delete" && (
        <Modal
          title={
            dialog.mode === "create" ? "Tạo bài kiểm tra" : "Sửa bài kiểm tra"
          }
          open
          onClose={() => {
            setDialog(null);
            setError("");
          }}
        >
          <form className={s.form} onSubmit={submitTest}>
            <Input
              label="Tên bài kiểm tra"
              name="name"
              placeholder="Ví dụ: Kiểm tra Unit 8"
              defaultValue={dialog.mode === "edit" ? dialog.test.name : ""}
              autoFocus
              required
            />
            <Input
              label="Ngày kiểm tra"
              name="date"
              type="date"
              defaultValue={
                dialog.mode === "edit" ? dialog.test.date : todayISO()
              }
              required
            />
            <div>
              <Input
                label="Điểm tối đa"
                name="max"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                step={1}
                defaultValue={
                  dialog.mode === "edit" ? dialog.test.max : DEFAULT_TEST_MAX
                }
                required
              />
              <p className={d.hint}>Số nguyên từ 1 đến 1000. Mặc định 15.</p>
            </div>
            {error && (
              <p role="alert" className={d.error}>
                {error}
              </p>
            )}
            <div className={s.dialogActions}>
              <Button
                variant="neutral"
                onClick={() => {
                  setDialog(null);
                  setError("");
                }}
              >
                Hủy
              </Button>
              <Button type="submit">
                {dialog.mode === "create" ? "Tạo bài" : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </Modal>
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
