import { useParams, useSearchParams } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import { useAccess, visibleClassIds } from "../../data/repositories/access";
import { getReportBatch } from "../../data/repositories/reports";
import { useStore } from "../../data/store";
import { Card, EmptyState, NoAccess, PageHeader } from "../../shared/ui";
import ReportBatchDetail from "./ReportBatchDetail";
import ReportBatchList from "./ReportBatchList";
import styles from "./ReportsPage.module.css";

/** Tên tham số URL chứa mã đợt báo cáo đang mở (không có = danh sách đợt). */
export const BATCH_PARAM = "dot";

/**
 * Tab Báo cáo của lớp: danh sách đợt báo cáo theo khoảng buổi, và chi tiết một
 * đợt (`?dot=`) để soạn nhận xét chung, xem trước và phát hành.
 */
export default function ReportsPage() {
  useStore();
  const { classId = "" } = useParams();
  const [params] = useSearchParams();
  const access = useAccess();

  if (!access.can("comments_reports", "read"))
    return <NoAccess what="báo cáo" />;

  const klass = getClass(classId);
  const scope = visibleClassIds();
  if (!klass || (scope !== null && !scope.has(classId)))
    return (
      <main className={styles.page}>
        <PageHeader compact backTo="/lop" title="Báo cáo" overlay={<p className={styles.subtitle}>Không tìm thấy lớp</p>} />
        <Card>
          <EmptyState title="Không tìm thấy lớp">
            <p>Lớp này không tồn tại hoặc không thuộc phạm vi bạn quản lý.</p>
          </EmptyState>
        </Card>
      </main>
    );

  const batch = getReportBatch(params.get(BATCH_PARAM) ?? "");
  return batch && batch.classId === classId ? (
    <ReportBatchDetail key={batch.id} klass={klass} batch={batch} />
  ) : (
    <ReportBatchList klass={klass} />
  );
}
