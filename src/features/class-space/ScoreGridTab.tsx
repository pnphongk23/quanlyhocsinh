import { Link, useParams } from "react-router-dom";
import { useStore } from "../../data/store";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import { listScores } from "../../data/repositories/scores";
import { useAccess } from "../../data/repositories/access";
import { orderScoreGridStudents } from "../../data/logic";
import { formatDayMonth, formatScore } from "../../shared/format";
import { Card, EmptyState, LinkButton, NoAccess } from "../../shared/ui";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import ScoreGridDesktop from "../scores/ScoreGridDesktop";
import s from "../scores/scores.module.css";

export default function ScoreGridTab() {
  useStore();
  const { classId = "" } = useParams();
  const access = useAccess();
  const desktop = useIsDesktop();
  const students = orderScoreGridStudents(listStudents(classId));
  const activeCount = students.filter(
    (student) => student.status === "active",
  ).length;
  const leftCount = students.filter(
    (student) => student.status === "left",
  ).length;
  const tests = [...listTests(classId)].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  if (!access.can("scores", "read")) return <NoAccess what="bảng điểm" />;
  const canWrite = access.can("scores", "write");

  if (desktop) return <ScoreGridDesktop key={classId} classId={classId} />;

  if (!tests.length)
    return (
      <EmptyState
        title="Chưa có bài kiểm tra"
        description="Tạo bài kiểm tra đầu tiên, sau đó nhập điểm cho cả lớp."
        action={
          canWrite ? (
            <LinkButton size="lg" to={`/lop/${classId}/bai-kiem-tra/moi`}>
              Tạo bài kiểm tra
            </LinkButton>
          ) : undefined
        }
      />
    );

  return (
    <div className={s.tab}>
        <div className={s.gridHead}>
        {canWrite && (
          <LinkButton
            variant="secondary"
            to={`/lop/${classId}/bai-kiem-tra/moi`}
          >
            + Bài kiểm tra mới
          </LinkButton>
        )}
      </div>
      <Card className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Học sinh</th>
              {tests.map((test) => (
                <th key={test.id}>
                  <Link
                    className={s.testLink}
                    to={`/lop/${classId}/bai-kiem-tra/${test.id}`}
                  >
                    <span>{test.name}</span>
                    <span className={s.testDate}>
                      {formatDayMonth(test.date)} · thang {test.max}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const scores = tests.map((test) =>
                listScores(test.id).find(
                  (score) => score.studentId === student.id,
                ),
              );
              return (
                <tr
                  key={student.id}
                  className={
                    student.status === "left" ? s.leftStudent : undefined
                  }
                >
                  <td className={s.studentCell}>
                    {student.name}
                    {student.status === "left" && (
                      <span className={s.leftStudentLabel}> Đã nghỉ</span>
                    )}
                  </td>
                  {tests.map((test, index) => {
                    const score = scores[index];
                    return (
                      <td key={test.id}>
                        <Link
                          className={s.cellLink}
                          to={`/lop/${classId}/bai-kiem-tra/${test.id}?hoc-sinh=${student.id}`}
                          aria-label={`Nhập điểm ${test.name} cho ${student.name}`}
                        >
                          {score && score.value !== null ? (
                            formatScore(score.value)
                          ) : (
                            <>
                              <span className={s.cellEmpty} aria-hidden="true">
                                –
                              </span>
                              <span className={s.cellMissing}>
                                Chưa có điểm
                              </span>
                            </>
                          )}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={s.gridNote}>
          Hiển thị {activeCount} học sinh đang học và {leftCount} học sinh đã
          nghỉ. Nhập 7,5 hoặc 7.5.
        </p>
      </Card>
    </div>
  );
}
