import { useParams } from "react-router-dom";
import {
  getChildHomework,
  type ChildHomework,
} from "../../data/repositories/guardian";
import { PageHeader } from "../../shared/ui";
import { useGuardianContext } from "./guardianContext";
import { dayMonth } from "./guardianFormat";
import {
  HomeworkSections,
  cancelledFlags,
  gradingLine,
} from "./GuardianHomeworkSections";
import { ChildEmpty, GuardianPill } from "./guardianUi";
import GuardianNoChild from "./guardianEmpty";
import g from "./guardian.module.css";

/**
 * PH · Bài tập về nhà của con (ảnh 09/34/35): đề hiện ngay, kết quả chấm chỉ
 * hiện khi phiếu buổi chấm đã gửi; buổi chấm bị hủy và chưa có buổi chấm có
 * nhãn riêng.
 */
export default function GuardianHomeworkPage() {
  const { sessionId } = useParams();
  const { child, error } = useGuardianContext();
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

  let items: ChildHomework[] = [];
  let loadError = "";
  try {
    items = getChildHomework(child.student.id, sessionId);
  } catch (cause) {
    loadError =
      cause instanceof Error
        ? cause.message
        : "Không đọc được bài tập về nhà của con.";
  }

  // Deep link theo buổi: chỉ buổi đó; không có buổi thì xem toàn bộ, mới nhất trước.
  const [newest, ...older] = items;
  const detailed = sessionId ? newest : undefined;
  const list = sessionId ? [] : older;

  return (
    <main className={g.page}>
      <PageHeader
        backTo={sessionId ? "/ph/btvn" : undefined}
        eyebrow={child.student.name}
        title="Bài tập về nhà"
      />

      {loadError && (
        <p className={g.error} role="alert">
          {loadError}
        </p>
      )}

      {!loadError && !newest && (
        <ChildEmpty title="Chưa có bài tập về nhà">
          <p>Bài tập cô giao sẽ hiện ở đây ngay khi cô lưu.</p>
        </ChildEmpty>
      )}

      {newest && (
        <>
          <h2 className={g.resultLabel}>Mới nhất</h2>
          <HomeworkCard item={newest} newest />
        </>
      )}

      {!detailed && list.length > 0 && (
        <>
          <h2 className={g.resultLabel}>Các buổi trước</h2>
          {list.map((item) => (
            <HomeworkCard key={item.session.id} item={item} />
          ))}
        </>
      )}
    </main>
  );
}

function HomeworkCard({
  item,
  newest = false,
}: {
  item: ChildHomework;
  newest?: boolean;
}) {
  const flags = cancelledFlags(item);
  return (
    <article className={g.hwCard + (newest ? " " + g.hwCardNew : "")}>
      <div className={g.hwHeader}>
        <div>
          <h2>
            Buổi {item.sessionNumber} · {dayMonth(item.date)}
          </h2>
          {newest && <p className={g.hwMeta}>{gradingLine(item)}</p>}
          {newest && item.grading.state === "none" && (
            <span className={g.hwFlag}>Cô sẽ báo khi có buổi chấm</span>
          )}
          {newest &&
            flags.map((flag) => (
              <span key={flag} className={g.hwFlag}>
                {flag}
              </span>
            ))}
        </div>
        {newest && <GuardianPill tone="primary">Mới</GuardianPill>}
      </div>
      <HomeworkSections
        sections={item.sections}
        showResults
        showDescriptions={newest}
      />
    </article>
  );
}
