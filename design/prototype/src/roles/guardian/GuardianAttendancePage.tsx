import { useState } from "react";
import { PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import {
  childAttendanceMonth,
  childMonths,
  defaultChildMonth,
} from "./guardianRead";
import {
  attendanceText,
  attendanceTone,
  weekdayDayMonth,
} from "./guardianFormat";
import { ChildEmpty, GuardianPill, MonthSwitch } from "./guardianUi";
import g from "./guardian.module.css";

/**
 * PH · Điểm danh (tối giản): ảnh chuẩn không có màn này, làm theo bố cục bản
 * thiết kế cũ (design/reference/109-ph-diem-danh.html) với dữ liệu thật của
 * đúng con đang chọn. Không hiện thống kê của lớp.
 */
export default function GuardianAttendancePage() {
  const { child, error } = useGuardianContext();
  const [month, setMonth] = useState<string | null>(null);
  if (error) {
    return (
      <p className={g.error} role="alert">
        {error}
      </p>
    );
  }
  if (!child) {
    return (
      <ChildEmpty title="Chưa có con nào được liên kết">
        <p>Liên hệ giáo viên nếu bạn cần xem dữ liệu của con.</p>
      </ChildEmpty>
    );
  }
  const studentId = child.student.id;
  const months = childMonths(studentId);
  const current =
    month && months.includes(month) ? month : defaultChildMonth(studentId);

  let data: ReturnType<typeof childAttendanceMonth> | null = null;
  let loadError = "";
  try {
    data = childAttendanceMonth(studentId, current);
  } catch (cause) {
    loadError =
      cause instanceof Error
        ? cause.message
        : "Không đọc được điểm danh của con.";
  }

  return (
    <main className={g.page}>
      <PageHeader eyebrow={child.student.name} title="Điểm danh" />
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
          <div className={g.stats4}>
            <div className={g.statCell}>
              <strong className={g.statNum}>{data.present}</strong>
              <span className={g.statName}>có mặt</span>
            </div>
            <div className={g.statCell}>
              <strong className={g.statNum}>{data.late}</strong>
              <span className={g.statName}>muộn</span>
            </div>
            <div className={g.statCell}>
              <strong className={g.statNum}>{data.excused}</strong>
              <span className={g.statName}>có phép</span>
            </div>
            <div className={g.statCell}>
              <strong className={g.statNum}>{data.absent}</strong>
              <span className={g.statName}>vắng</span>
            </div>
          </div>

          {data.rows.length === 0 ? (
            <p className={g.muted}>Chưa có buổi học nào trong tháng này.</p>
          ) : (
            <ul className={g.rowList}>
              {data.rows.map((row) => (
                <li key={row.session.id} className={g.row}>
                  <div className={g.rowMain}>
                    <span className={g.rowTitle}>
                      Buổi {row.number} · {weekdayDayMonth(row.session.date)}
                    </span>
                    {row.status === "late" && row.lateAt && (
                      <span className={g.rowNote}>Đến muộn {row.lateAt}</span>
                    )}
                    {row.note && (
                      <span className={g.rowNote}>Ghi chú: {row.note}</span>
                    )}
                  </div>
                  {row.status ? (
                    <GuardianPill tone={attendanceTone(row.status)}>
                      {attendanceText[row.status]}
                    </GuardianPill>
                  ) : (
                    <span className={g.hint}>Chưa điểm danh</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
