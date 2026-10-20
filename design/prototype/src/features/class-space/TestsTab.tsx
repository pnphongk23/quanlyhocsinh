import { Link, useParams } from "react-router-dom";
import { listScores } from "../../data/repositories/scores";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import { formatDayMonthLong } from "../../shared/format";
import { LinkButton, NoAccess, Pill } from "../../shared/ui";
import { ChartIcon } from "../scores/ScoreIcons";
import s from "../scores/scores.module.css";

export default function TestsTab() {
  useStore();
  const { classId = "" } = useParams();
  const access = useAccess();
  const students = listStudents(classId, false);
  const tests = [...listTests(classId)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  if (!access.can("scores", "read")) return <NoAccess what="bài kiểm tra" />;
  const canWrite = access.can("scores", "write");

  // Trạng thái rỗng: design/reference/75-trang-thai-rong-chua-co-bai-kiem-tra.html
  if (!tests.length)
    return (
      <div className={s.emptyScore}>
        <span className={s.emptyIcon}>
          <ChartIcon size={32} />
        </span>
        <div className={s.emptyText}>
          <p className={s.emptyTitle}>Chưa có bài kiểm tra</p>
          <p className={s.emptyDesc}>
            Tạo bài kiểm tra đầu tiên, sau đó nhập điểm cho cả lớp.
          </p>
        </div>
        {canWrite && (
          <div className={s.emptyActions}>
            <LinkButton size="lg" to={`/lop/${classId}/bai-kiem-tra/moi`}>
              Tạo bài kiểm tra
            </LinkButton>
          </div>
        )}
      </div>
    );

  return (
    <div className={s.tab}>
      {canWrite && (
        <div className={s.tabHead}>
          <LinkButton
            variant="secondary"
            to={`/lop/${classId}/bai-kiem-tra/moi`}
          >
            + Bài mới
          </LinkButton>
        </div>
      )}
      <div className={s.list}>
        {tests.map((test) => {
          const scores = listScores(test.id);
          // Chỉ có điểm hoặc "Chưa có điểm".
          const missing = students.filter(
            (student) =>
              !scores.some(
                (score) =>
                  score.studentId === student.id && score.value !== null,
              ),
          ).length;
          return (
            <Link
              key={test.id}
              className={s.testRow}
              to={`/lop/${classId}/bai-kiem-tra/${test.id}`}
            >
              <span className={s.testInfo}>
                <span className={s.testName}>{test.name}</span>
                <span className={s.testMeta}>
                  Ngày {formatDayMonthLong(test.date)} · Thang {test.max} điểm
                </span>
              </span>
              {missing ? (
                <Pill tone="warning">Còn {missing} em chưa có điểm</Pill>
              ) : (
                <Pill tone="success">Đủ điểm</Pill>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
