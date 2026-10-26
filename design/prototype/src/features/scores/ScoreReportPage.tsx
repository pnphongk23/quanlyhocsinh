import { Link, useNavigate, useParams } from "react-router-dom";
import { useAccess, visibleClassIds } from "../../data/repositories/access";
import { getClass, listClasses } from "../../data/repositories/classes";
import { useStore } from "../../data/store";
import { formatDayMonth } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { Card, EmptyState, LinkButton, NoAccess, PageHeader, Pill } from "../../shared/ui";
import {
  classScoreReport,
  formatSignedPercent,
  type ClassScoreReport,
  type ScoreProgress,
  type StudentScoreReport,
} from "./scoreReport";
import s from "./scoreReport.module.css";

const WORKSPACE_NAME = "Lớp của cô Lan";

/** Quy tắc "Cần chú ý" hiện dưới tiêu đề (ảnh 22–25). */
const ATTENTION_RULE =
  "Gồm em có: bài gần nhất giảm từ 20% thang trở lên so với bài có điểm trước đó; hoặc từ 2 bài chưa có điểm.";

/** Mũi tên xu hướng nhỏ cạnh chênh lệch điểm (xanh tăng, đỏ giảm). */
function TrendIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className={s.trendIcon}
      width={14}
      height={10}
      viewBox="0 0 14 10"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direction === "up" ? (
        <path d="M1 8.5 4.6 4.6l2.6 2.4L13 1.5" />
      ) : (
        <path d="M1 1.5 4.6 5.4l2.6-2.4L13 8.5" />
      )}
    </svg>
  );
}

/** Chênh lệch bài gần nhất: icon + số có dấu; "—" khi chưa so sánh được. */
function TrendDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className={s.deltaNone}>–</span>;
  if (delta === 0)
    return (
      <span className={`${s.delta} ${s.deltaFlat}`}>
        <TrendIcon direction="up" />
        {formatSignedPercent(delta)}
      </span>
    );
  return (
    <span
      className={`${s.delta} ${delta > 0 ? s.deltaUp : s.deltaDown}`}
      data-direction={delta > 0 ? "up" : "down"}
    >
      <TrendIcon direction={delta > 0 ? "up" : "down"} />
      {formatSignedPercent(delta)}
    </span>
  );
}

/** Mũi tên xu hướng trong danh sách học sinh mobile: chỉ icon, không kèm số. */
function TrendArrow({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return <span className={s.deltaNone}>—</span>;
  return (
    <span
      className={`${s.delta} ${delta > 0 ? s.deltaUp : s.deltaDown}`}
      aria-label={
        delta > 0
          ? `Tăng ${delta}% so với bài trước`
          : `Giảm ${Math.abs(delta)}% so với bài trước`
      }
    >
      <TrendIcon direction={delta > 0 ? "up" : "down"} />
    </span>
  );
}

/** Hai chữ đầu của hai từ cuối, cùng quy ước avatar toàn app. */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

function Avatar({ name }: { name: string }) {
  return (
    <span className={s.avatar} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

function ProgressPanel({ progress }: { progress: ScoreProgress[] }) {
  return (
    <Card className={s.section}>
      <div className={s.sectionHead}>
        <h3 className={s.sectionTitle}>Tiến độ nhập điểm</h3>
      </div>
      {progress.length ? (
        <ul className={s.progressList}>
          {progress.map((item) => {
            const total = item.scored + item.missing;
            const widthFor = (count: number) =>
              total === 0 ? 0 : (count / total) * 100;
            return (
              <li className={s.progressItem} key={item.test.id}>
                <div className={s.progressHead}>
                  <span className={s.progressName}>
                    {item.test.name} · {formatDayMonth(item.test.date)}
                  </span>
                </div>
                <div className={s.bar} aria-hidden="true">
                  <span
                    className={`${s.barPart} ${s.barScored}`}
                    style={{ width: `${widthFor(item.scored)}%` }}
                  />
                  <span
                    className={`${s.barPart} ${s.barMissing}`}
                    style={{ width: `${widthFor(item.missing)}%` }}
                  />
                </div>
                <p className={s.progressCounts}>
                  {item.scored} có điểm · {item.missing} chưa có điểm
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={s.note}>Lớp chưa có bài kiểm tra nào.</p>
      )}
    </Card>
  );
}

function AttentionPanel({
  attention,
  classId,
}: {
  attention: ClassScoreReport["attention"];
  classId: string;
}) {
  return (
    <Card className={s.section}>
      <div className={s.sectionHead}>
        <h3 className={s.sectionTitle}>Cần chú ý</h3>
        <Pill
          tone={attention.length ? "warning" : "success"}
          className={s.attentionCount}
        >
          {attention.length}
        </Pill>
      </div>
      <p className={s.attentionRule}>{ATTENTION_RULE}</p>
      {attention.length ? (
        <ul className={s.attentionList}>
          {attention.map((item) => (
            <li key={item.student.id}>
              <Link
                className={s.attentionRow}
                to={`/lop/${classId}/bao-cao-diem/${item.student.id}`}
              >
                <Avatar name={item.student.name} />
                <span className={s.attentionMain}>
                  <span className={s.attentionName}>{item.student.name}</span>
                  {item.reasons.map((reason) => (
                    <span className={s.attentionReason} key={reason}>
                      {reason}
                    </span>
                  ))}
                </span>
                <span className={s.chevron} aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.note}>Hiện chưa có học sinh nào cần chú ý.</p>
      )}
    </Card>
  );
}

function EmptyReport({ classId }: { classId: string }) {
  return (
    <EmptyState
      title="Chưa có điểm để báo cáo"
      description="Nhập điểm cho ít nhất một bài kiểm tra để xem tiến độ nhập điểm và danh sách cần chú ý."
      action={<LinkButton to={`/lop/${classId}/diem`}>Nhập điểm</LinkButton>}
    />
  );
}

/** Báo cáo điểm của lớp (quy tắc 3.1): không có trung bình nào. */
export default function ScoreReportPage() {
  const state = useStore();
  const { classId = "" } = useParams();
  const access = useAccess();
  const desktop = useIsDesktop();
  const navigate = useNavigate();

  if (!access.can("scores", "read")) return <NoAccess what="báo cáo điểm" />;

  const klass = getClass(classId);
  const scope = visibleClassIds();
  if (!klass || (scope !== null && !scope.has(classId)))
    return (
      <div className={s.page}>
        <PageHeader
          compact
          backTo="/lop"
          title="Báo cáo điểm"
          overlay={<p className={s.subtitle}>Không tìm thấy lớp</p>}
        />
        <p className={s.note}>
          Lớp này không tồn tại hoặc không thuộc phạm vi bạn quản lý.
        </p>
        <LinkButton to="/lop">Về danh sách lớp</LinkButton>
      </div>
    );

  const report = classScoreReport(state, classId);
  const hasScore = report.progress.some((item) => item.scored > 0);
  const attentionIds = new Set(
    report.attention.map((item) => item.student.id),
  );
  const classOptions = listClasses().filter(
    (item) => item.status === "active" || item.id === classId,
  );

  const header = (
    <PageHeader
      compact={!desktop}
      backTo={desktop ? undefined : `/lop/${classId}/diem`}
      eyebrow={desktop ? `Workspace ${WORKSPACE_NAME} · ${access.role?.name ?? "Nhân sự"}` : undefined}
      title="Báo cáo điểm"
      overlay={desktop ? undefined : <p className={s.subtitle}>{klass.name}</p>}
      actions={
        desktop ? (
          <div className={s.picker}>
            <select
              className={s.pickerSelect}
              value={classId}
              aria-label="Chọn lớp"
              onChange={(event) =>
                navigate(`/lop/${event.target.value}/bao-cao-diem`)
              }
            >
              {classOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <span className={s.pickerChevron} aria-hidden="true">
              ▾
            </span>
          </div>
        ) : undefined
      }
    />
  );

  if (!hasScore) {
    return (
      <div className={s.page}>
        {header}
        {desktop ? (
          <div className={s.emptyCard}>
            <EmptyReport classId={classId} />
          </div>
        ) : (
          <EmptyReport classId={classId} />
        )}
      </div>
    );
  }

  if (desktop) {
    return (
      <div className={s.page}>
        {header}
        <div className={s.desktopLayout}>
          <div className={s.tableColumn}>
            <div className={s.tableCard}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Học sinh</th>
                  <th scope="col">Bài có điểm</th>
                  <th scope="col">Bài gần nhất</th>
                  <th scope="col">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((row) => {
                  const scoredCount = row.rows.filter(
                    (item) => item.value !== null,
                  ).length;
                  return (
                    <tr key={row.student.id}>
                      <td className={s.tdName}>
                        <Link
                          className={s.rowLink}
                          to={`/lop/${classId}/bao-cao-diem/${row.student.id}`}
                        >
                          {row.student.name}
                        </Link>
                      </td>
                      <td className={s.tdMuted}>
                        {scoredCount}/{row.rows.length}
                      </td>
                      <td>
                        <TrendDelta delta={row.latestDelta} />
                      </td>
                      <td>
                        {attentionIds.has(row.student.id) && (
                          <Pill tone="warning">Cần chú ý</Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <p className={s.tableNote}>{ATTENTION_RULE}</p>
          </div>
          <div className={s.sidePanels}>
            <ProgressPanel progress={report.progress} />
            <AttentionPanel attention={report.attention} classId={classId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      {header}
      <ProgressPanel progress={report.progress} />
      <AttentionPanel attention={report.attention} classId={classId} />
      <section className={s.studentSection}>
        <h3 className={s.studentSectionTitle}>
          Học sinh · {report.students.length}
        </h3>
        {report.students.length ? (
          <ul className={s.studentList}>
            {report.students.map((row) => (
              <li key={row.student.id}>
                <StudentRow row={row} classId={classId} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.note}>Lớp chưa có học sinh đang học.</p>
        )}
      </section>
    </div>
  );
}

function StudentRow({
  row,
  classId,
}: {
  row: StudentScoreReport;
  classId: string;
}) {
  const scoredCount = row.rows.filter((item) => item.value !== null).length;
  return (
    <Link
      className={s.studentRow}
      to={`/lop/${classId}/bao-cao-diem/${row.student.id}`}
    >
      <Avatar name={row.student.name} />
      <span className={s.studentMain}>
        <span className={s.studentName}>{row.student.name}</span>
        <span className={s.studentMeta}>
          {scoredCount}/{row.rows.length} bài có điểm
        </span>
      </span>
      <TrendArrow delta={row.latestDelta} />
      <span className={s.chevron} aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
