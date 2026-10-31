import { Link, useParams } from "react-router-dom";
import { listScores } from "../../data/repositories/scores";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import { useAccess } from "../../data/repositories/access";
import { useStore } from "../../data/store";
import { formatDayMonthLong } from "../../shared/format";
import { EmptyState, LinkButton, NoAccess, Pill } from "../../shared/ui";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import TestsDesktop from "../scores/TestsDesktop";
import s from "../scores/scores.module.css";

export default function TestsTab() {
  useStore();
  const { classId = "" } = useParams();
  const access = useAccess();
  const desktop = useIsDesktop();
  const students = listStudents(classId, false);
  const tests = [...listTests(classId)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  if (!access.can("scores", "read")) return <NoAccess what="bài kiểm tra" />;
  const canWrite = access.can("scores", "write");

  if (desktop) return <TestsDesktop classId={classId} />;

  // Trạng thái rỗng: design/reference/75-trang-thai-rong-chua-co-bai-kiem-tra.html
  if (!tests.length)
    return (
      <EmptyState
        title="Chưa có bài kiểm tra"
        description="Tạo bài kiểm tra đầu tiên, sau đó nhập điểm cho cả lớp."
        action={
          canWrite && (
            <LinkButton size="lg" to={`/lop/${classId}/bai-kiem-tra/moi`}>
              Tạo bài kiểm tra
            </LinkButton>
          )
        }
      />
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
                    Ngày {formatDayMonthLong(test.date)}
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
