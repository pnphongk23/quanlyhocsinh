import { useNavigate, useParams } from "react-router-dom";
import { useAccess, visibleClassIds } from "../../data/repositories/access";
import { getClass } from "../../data/repositories/classes";
import { useStore } from "../../data/store";
import { formatDayMonth } from "../../shared/format";
import {
  Card,
  EmptyState,
  Icon,
  LinkButton,
  NoAccess,
  PageHeader,
  Pill,
} from "../../shared/ui";
import {
  classScoreReport,
  formatScoreDot,
  formatSignedPercent,
  scorePercent,
  studentScoreReport,
} from "./scoreReport";
import s from "./scoreReport.module.css";

const CHART_WIDTH = 340;
const CHART_HEIGHT = 160;
const PAD_LEFT = 20;
const PAD_RIGHT = 20;
const PAD_TOP = 30;
const PAD_BOTTOM = 30;
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const BASELINE = CHART_HEIGHT - PAD_BOTTOM;

interface TrendSlot {
  date: string;
  value: number | null;
  max: number;
}

/**
 * Xu hướng điểm theo ngày, chuẩn hoá theo thang điểm từng bài (trục 0–100%).
 * Mỗi bài giữ đúng một vị trí; bài chưa có điểm ghi "Chưa" và KHÔNG nối đường
 * giả thành điểm 0 — đường chỉ nối hai bài có điểm liền nhau.
 */
function ScoreTrend({ slots }: { slots: TrendSlot[] }) {
  if (!slots.length)
    return <p className={s.note}>Lớp chưa có bài kiểm tra để vẽ biểu đồ.</p>;
  const xFor = (index: number) =>
    slots.length <= 1
      ? PAD_LEFT + PLOT_WIDTH / 2
      : PAD_LEFT + (PLOT_WIDTH * index) / (slots.length - 1);
  const yFor = (slot: TrendSlot) => {
    const percent = Math.min(
      100,
      Math.max(0, scorePercent(slot.value as number, slot.max)),
    );
    return PAD_TOP + (BASELINE - PAD_TOP) * (1 - percent / 100);
  };
  const points = slots.map((slot, index) => ({
    ...slot,
    x: xFor(index),
    y: slot.value === null ? null : yFor(slot),
  }));
  const segments: string[] = [];
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous.y !== null && current.y !== null)
      segments.push(`${previous.x},${previous.y} ${current.x},${current.y}`);
  }
  // Nhiều bài thì bớt nhãn ngày để không chồng chữ trên màn hẹp.
  const labelEvery = slots.length > 6 ? Math.ceil(slots.length / 6) : 1;
  const scoredCount = slots.filter((slot) => slot.value !== null).length;

  return (
    <svg
      className={s.chart}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="img"
      aria-label={`Biểu đồ điểm ${slots.length} bài, ${scoredCount} bài có điểm, thang 0 đến 100%`}
    >
      <line
        className={s.chartBase}
        x1={PAD_LEFT}
        y1={BASELINE}
        x2={CHART_WIDTH - PAD_RIGHT}
        y2={BASELINE}
      />
      {segments.map((segment, index) => (
        <polyline key={index} className={s.chartLine} points={segment} />
      ))}
      {points.map((point, index) => (
        <g key={`${point.date}-${index}`}>
          {point.y !== null ? (
            <>
              <circle className={s.chartDot} cx={point.x} cy={point.y} r={4} />
              <text
                className={s.chartValue}
                x={point.x}
                y={point.y - 9}
                textAnchor="middle"
              >
                {Math.round(scorePercent(point.value as number, point.max))}%
              </text>
            </>
          ) : (
            <text
              className={s.chartGap}
              x={point.x}
              y={BASELINE - 9}
              textAnchor="middle"
            >
              Chưa
            </text>
          )}
          {index % labelEvery === 0 && (
            <text
              className={s.chartDate}
              x={point.x}
              y={BASELINE + 18}
              textAnchor="middle"
            >
              {formatDayMonth(point.date)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Mũi tên xu hướng nhỏ cạnh chênh lệch điểm (xanh tăng, đỏ giảm). */
function TrendIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className={s.trendIcon}
      width={16}
      height={12}
      viewBox="0 0 16 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direction === "up" ? (
        <path d="M1 10.5 5 6l3 2.8L15 1.5" />
      ) : (
        <path d="M1 1.5 5 6l3-2.8L15 10.5" />
      )}
    </svg>
  );
}

/** Báo cáo điểm của một học viên (quy tắc 3.1); không dùng trung bình lớp. */
export default function StudentScoreReportPage() {
  const state = useStore();
  const { classId = "", studentId = "" } = useParams();
  const access = useAccess();
  const navigate = useNavigate();
  const backTo = `/lop/${classId}/bao-cao-diem`;

  if (!access.can("scores", "read")) return <NoAccess what="báo cáo điểm" />;

  const klass = getClass(classId);
  const scope = visibleClassIds();
  const student = state.students.find((item) => item.id === studentId);
  if (
    !klass ||
    (scope !== null && !scope.has(classId)) ||
    !student ||
    student.classId !== classId
  )
    return (
      <div className={s.page}>
        <PageHeader
          compact
          backTo={backTo}
          title="Báo cáo điểm"
          overlay={<p className={s.subtitle}>Không tìm thấy học sinh</p>}
        />
        <EmptyState title="Không tìm thấy học sinh">
          <p>Học sinh này không tồn tại hoặc không thuộc lớp đang mở.</p>
          <LinkButton to={backTo}>Về báo cáo điểm của lớp</LinkButton>
        </EmptyState>
      </div>
    );

  const report = studentScoreReport(state, studentId);
  const roster = classScoreReport(state, classId).students;
  const index = roster.findIndex((item) => item.student.id === studentId);
  const previous = index > 0 ? roster[index - 1] : null;
  const next =
    index >= 0 && index < roster.length - 1 ? roster[index + 1] : null;
  const rowsDescending = [...report.rows].reverse();
  const slots: TrendSlot[] = report.rows.map((row) => ({
    date: row.test.date,
    value: row.value,
    max: row.test.max,
  }));
  const shortName = student.name.trim().split(/\s+/).slice(-1)[0] ?? student.name;
  const deltaText =
    report.latestDelta === null ? null : formatSignedPercent(report.latestDelta);

  return (
    <section className={s.page}>
      <PageHeader
        compact
        backTo={backTo}
        title={student.name}
        overlay={<p className={s.subtitle}>Báo cáo điểm · {klass.name}</p>}
      />

      {index >= 0 && (
        <div className={s.navigator}>
          <button
            type="button"
            className={s.navButton}
            disabled={!previous}
            aria-label="Học sinh trước"
            onClick={() =>
              previous &&
              navigate(`/lop/${classId}/bao-cao-diem/${previous.student.id}`)
            }
          >
            <Icon name="back" />
          </button>
          <span className={s.navigatorLabel}>
            {shortName} · {index + 1}/{roster.length}
          </span>
          <button
            type="button"
            className={s.navButton}
            disabled={!next}
            aria-label="Học sinh sau"
            onClick={() =>
              next && navigate(`/lop/${classId}/bao-cao-diem/${next.student.id}`)
            }
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      )}

      <Card className={s.summaryCard}>
        <div className={s.summary}>
          <div className={s.summaryBox}>
            <span className={s.summaryLabel}>Bài gần nhất</span>
            {deltaText === null ? (
              <>
                <span className={s.summaryEmpty}>—</span>
                <span className={s.summaryCaption}>
                  Chưa có bài gần nhất để so sánh
                </span>
              </>
            ) : (
              <>
                <span
                  className={`${s.summaryDelta} ${
                    (report.latestDelta as number) > 0
                      ? s.deltaUp
                      : (report.latestDelta as number) < 0
                        ? s.deltaDown
                        : s.deltaFlat
                  }`}
                >
                  <TrendIcon
                    direction={
                      (report.latestDelta as number) < 0 ? "down" : "up"
                    }
                  />
                  {deltaText}
                </span>
                <span className={s.summaryCaption}>
                  So với bài có điểm trước đó
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>Xu hướng điểm</h3>
        </div>
        <ScoreTrend slots={slots} />
      </Card>

      <Card className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>Các bài theo ngày</h3>
        </div>
        {rowsDescending.length ? (
          <ul className={s.testList}>
            {rowsDescending.map((row) => (
              <li className={s.testRow} key={row.test.id}>
                <span className={s.testRowDate}>
                  {formatDayMonth(row.test.date)}
                </span>
                <span className={s.testRowName}>{row.test.name}</span>
                {row.value === null ? (
                  <Pill tone="neutral">Chưa có điểm</Pill>
                ) : (
                  <span className={s.testScore}>
                    {formatScoreDot(row.value)}
                    <span className={s.testScoreUnit}>/{row.test.max}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Chưa có bài kiểm tra">
            <p>Lớp chưa có bài kiểm tra nào nên chưa có điểm.</p>
          </EmptyState>
        )}
      </Card>
    </section>
  );
}
