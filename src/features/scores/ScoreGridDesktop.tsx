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
import { Button, LinkButton } from "../../shared/ui";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!klass) return null;

  function valueOf(testId: string, studentId: string): string {
    const key = draftKey(testId, studentId);
    if (key in drafts) return drafts[key];
    const score = listScores(testId).find(
      (item) => item.studentId === studentId,
    );
  return score && score.value !== null ? formatScore(score.value) : "";
  }

  function setCell(testId: string, studentId: string, raw: string) {
    setError("");
    setMessage("");
    setDrafts((current) => ({
      ...current,
      [draftKey(testId, studentId)]: raw,
    }));
  }

  function save() {
    const entries = Object.entries(drafts);
    if (!entries.length) {
      setMessage("Không có thay đổi cần lưu.");
      return;
    }
    try {
      for (const [key, raw] of entries) {
        const [testId, studentId] = key.split(":");
        const parsed = parseScoreInput(raw);
        if (!parsed.ok)
            throw new Error("Điểm phải theo bước 0,5. Ví dụ 7,5 hoặc 7.5.");
        saveScore({ testId, studentId, value: parsed.value });
      }
      setDrafts({});
      setError("");
      setMessage(`Đã lưu ${entries.length} ô điểm.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được điểm.",
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
            <Button size="md" onClick={save}>
              Lưu điểm
            </Button>
          ) : undefined
        }
      />

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
                          value={valueOf(test.id, student.id)}
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
    </main>
  );
}
