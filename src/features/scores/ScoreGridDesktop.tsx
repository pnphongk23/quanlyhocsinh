import { useState } from "react";
import { Link } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import { listTests } from "../../data/repositories/tests";
import { listScores, saveScore } from "../../data/repositories/scores";
import { listStudents } from "../../data/repositories/students";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import { orderScoreGridStudents } from "../../data/logic";
import type { Class } from "../../data/types";
import { formatDayMonth } from "../../shared/format";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, LinkButton, UnsavedChangesDialog } from "../../shared/ui";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import s from "./ScoreGridDesktop.module.css";
import d from "../class-space/desktop.module.css";
import { formatScore, parseHalfScore } from "../../data/scoreFormat";

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
  const maxOf = new Map(tests.map((test) => [test.id, test.max]));
  const isInvalid = (key: string): boolean => {
    if (value[key] === baseline[key]) return false;
    const parsed = parseScoreInput(value[key]);
    if (!parsed.ok) return true;
    const max = maxOf.get(key.split(":")[0]);
    return parsed.value !== null && max !== undefined && parsed.value > max;
  };
  const invalidCount = Object.keys(drafts).filter(isInvalid).length;

  const action = useSaveAction<Record<string, string>>({
    baseline,
    value,
    validate: () => invalidCount === 0,
    save: (next) => {
      for (const key of Object.keys(next)) {
        if (next[key] === baseline[key]) continue;
        const [testId, studentId] = key.split(":");
        const parsed = parseScoreInput(next[key]);
        if (!parsed.ok) throw new Error("Điểm phải theo bước 0,5. Ví dụ 7,5 hoặc 7.5.");
        saveScore({ testId, studentId, value: parsed.value });
      }
      setDrafts({});
    },
  });
  const guard = useLeaveGuard(action.dirty);

  if (!klass) return null;

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
        <div className={d.card + " " + d.emptyCard}>
          <p className={d.emptyTitle}>Chưa có bài kiểm tra</p>
          <p className={d.emptyText}>
            Tạo bài kiểm tra đầu tiên, sau đó nhập điểm cho cả lớp.
          </p>
          {canWrite && (
            <LinkButton size="md" to={`/lop/${classId}/bai-kiem-tra/moi`}>
              Tạo bài kiểm tra
            </LinkButton>
          )}
        </div>
      ) : (
        <div className={d.card + " " + s.card}>
          <div className={s.scroll}>
            <table className={s.table}>
              <colgroup>
                <col style={{ width: 210 }} />
                {tests.map((test) => (
                  <col key={test.id} style={{ width: 176 }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className={s.studentHead}>Học sinh</th>
                  {tests.map((test) => (
                    <th key={test.id}>
                      <Link
                        className={d.link}
                        to={`/lop/${classId}/bai-kiem-tra/${test.id}`}
                      >
                        {test.name}
                      </Link>
                      <span className={s.testMeta}>
                        {formatDayMonth(test.date)} ·{" "}
                        <b>/{test.max}</b>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <th scope="row" className={s.studentCell}>
                      {student.name}
                      {student.status === "left" && (
                        <span className={s.leftLabel}> Đã nghỉ</span>
                      )}
                    </th>
                    {tests.map((test) => (
                      <td key={test.id}>
                        <input
                          className={s.cell}
                          type="text"
                          inputMode="decimal"
                          aria-label={`Điểm ${test.name} của ${student.name}`}
                          placeholder="Chưa có điểm"
                          value={value[draftKey(test.id, student.id)] ?? ""}
                          aria-invalid={isInvalid(draftKey(test.id, student.id)) || undefined}
                          disabled={!canWrite}
                          onChange={(event) =>
                            setCell(test.id, student.id, event.target.value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.note}>
              Ô trống là “Chưa có điểm”. Nhập điểm theo bước 0,5, ví dụ 7,5 hoặc 7.5. Mỗi bài hiện điểm
            riêng theo thang điểm của bài đó.
          </p>
        </div>
      )}
      {guard.blocked && (
        <UnsavedChangesDialog
          open
          title="Điểm chưa lưu"
          message="Bạn đang nhập điểm dở. Lưu trước khi rời màn này?"
          saving={action.saving}
          onSave={async () => {
            if (await action.submit()) guard.proceed();
          }}
          onDiscard={() => {
            setDrafts({});
            guard.proceed();
          }}
          onStay={guard.stay}
        />
      )}
    </main>
  );
}
