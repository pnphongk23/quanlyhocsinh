import { useState } from "react";
import { Card, PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import {
  childMonths,
  childScoresMonth,
  defaultChildMonth,
} from "./guardianRead";
import { longDayMonth, scoreText } from "./guardianFormat";
import { MonthSwitch, useBackTarget } from "./guardianUi";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

/**
 * PH · Điểm số (tối giản): điểm từng bài của con theo tháng. Không hiện trung
 * bình nào (spec quy tắc 3.1); ảnh chuẩn không có màn này nên làm theo bản thiết
 * kế cũ (design/reference/110-ph-diem-so.html).
 */
export default function GuardianScoresPage() {
  const { child, error } = useGuardianContext();
  const back = useBackTarget();
  const [month, setMonth] = useState<string | null>(null);
  if (error) {
    return (
      <p className={g.error} role="alert">
        {error}
      </p>
    );
  }
  if (!child) {
    return <GuardianNoChild />;
  }
  const studentId = child.student.id;
  const months = childMonths(studentId);
  const current =
    month && months.includes(month) ? month : defaultChildMonth(studentId);

  let data: ReturnType<typeof childScoresMonth> | null = null;
  let loadError = "";
  try {
    data = childScoresMonth(studentId, current);
  } catch (cause) {
    loadError =
      cause instanceof Error ? cause.message : "Không đọc được điểm của con.";
  }

  return (
    <main className={g.page}>
      <PageHeader backTo={back} eyebrow={child.student.name} title="Điểm số" />
      <MonthSwitch
        month={current}
        months={months.length ? months : [current]}
        onChange={setMonth}
      />

      {loadError && (
        <p className={g.error} role="alert">
          {loadError}
        </p>
      )}

      {data && (
        <>
          {data.rows.length === 0 ? (
            <p className={g.muted}>Chưa có bài kiểm tra nào trong tháng này.</p>
          ) : (
            <Card className={g.card}>
              <div className={g.cardHead}>
                <h2>Điểm từng bài</h2>
                <span className={g.statSub}>
                  {data.rows.filter((row) => row.value !== null).length} bài có
                  điểm
                </span>
              </div>
              <ul className={g.scoreList}>
                {data.rows.map((row) => (
                  <li key={row.test.id} className={g.scoreRow}>
                    <span className={g.scoreName}>
                      {row.test.name}
                      <span className={g.scoreDate}>
                        {longDayMonth(row.test.date)}
                      </span>
                    </span>
                    <b className={g.scoreValue}>
                      {row.value === null
                        ? "Chưa có điểm"
                        : `${scoreText(row.value)}/${row.test.max}`}
                    </b>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </main>
  );
}
