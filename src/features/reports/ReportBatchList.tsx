import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import { createReportBatch, listReportBatches } from "../../data/repositories/reports";
import { useStore } from "../../data/store";
import {
  resolveRange,
} from "../../data/reportRange";
import type { Class } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useOnline } from "../../shared/hooks/useOnline";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { SaveStatus } from "../../shared/SaveStatus";
import { Button, Card, EmptyState, Icon } from "../../shared/ui";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import { batchCounts } from "./batchRows";
import ReportDialog from "./ReportDialog";
import ReportBatchDeleteMenu from "./ReportBatchDeleteMenu";
import styles from "./ReportsPage.module.css";

/** Danh sách đợt báo cáo của lớp và nút "Thêm báo cáo". */
export default function ReportBatchList({ klass }: { klass: Class }) {
  const snapshot = useStore();
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const access = useAccess();
  const online = useOnline();
  const canWrite = access.can("comments_reports", "write");
  const [adding, setAdding] = useState(false);

  const items = useMemo(
    () =>
      listReportBatches(klass.id).map((batch) => ({
        batch,
        range: resolveRange(snapshot.sessions, batch),
        counts: batchCounts(snapshot.reports.filter((report) => report.batchId === batch.id)),
      })),
    [snapshot, klass.id],
  );
  const addButton = canWrite && (
    <Button
      size={desktop ? "md" : "lg"}
      block={!desktop}
        onClick={() => setAdding(true)}
    >
      Thêm báo cáo
    </Button>
  );

  const content = items.length ? (
    <ul className={styles.batchList}>
      {items.map(({ batch, range, counts }) => {
        const batchReports = snapshot.reports.filter((report) => report.batchId === batch.id);
        const reportIds = new Set(batchReports.map((report) => report.id));
        const hasPublished =
          batchReports.some((report) => report.status === "published") ||
          snapshot.reportPublications.some(
            (publication) => publication.batch_id === batch.id || reportIds.has(publication.report_id),
          );
        return (
          <li key={batch.id} className={styles.batchItem}>
            <Link
              to={`?dot=${batch.id}`}
              className={styles.batchRow}
              aria-label={`Mở báo cáo ${range.label}`}
            >
              <span className={styles.batchText}>
                <span className={styles.batchTitle}>{range.label}</span>
                <span className={styles.batchMeta}>
                  <b>{counts.published}</b> đã phát hành · <b>{counts.draft}</b> nháp
                  {counts.republish > 0 && (
                    <>
                      {" "}· <b className={styles.metaAlert}>{counts.republish}</b> cần phát hành lại
                    </>
                  )}
                </span>
              </span>
              <Icon name="chevron-right" />
            </Link>
            {canWrite && <ReportBatchDeleteMenu batch={batch} hasPublished={hasPublished} />}
          </li>
        );
      })}
    </ul>
  ) : (
    <Card>
      <EmptyState
        title="Chưa có báo cáo nào"
        mascot="cho"
        description={
            "Thêm báo cáo theo tháng để tạo nháp cho cả lớp."
        }
        action={canWrite ? addButton : undefined}
      />
    </Card>
  );

  const offline = canWrite && !online && (
    <p role="status" className={styles.note}>
      Đang offline. Thêm và phát hành báo cáo cần kết nối mạng.
    </p>
  );

  const dialog = adding && (
    <AddReportDialog
      classId={klass.id}
      onClose={() => setAdding(false)}
      onCreated={(batchId) => {
        setAdding(false);
        navigate(`?dot=${batchId}`);
      }}
    />
  );

  if (desktop)
    return (
      <main className={styles.page}>
        <ClassDesktopHeader
          classId={klass.id}
          klass={klass}
          actions={items.length ? addButton : undefined}
        />
        {offline}
        {content}
        {dialog}
      </main>
    );

  return (
    <main className={styles.page}>
      <SaveStatus />
      {items.length > 0 && addButton}
      {offline}
      {content}
      {dialog}
    </main>
  );
}

function AddReportDialog({
  classId,
  onClose,
  onCreated,
}: {
  classId: string;
  onClose: () => void;
  onCreated: (batchId: string) => void;
}) {
    const current = new Date();
    const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    const [month, setMonth] = useState(currentMonth);
  const created = useRef("");
  const [failure, setFailure] = useState("");
    const action = useSaveAction({
    baseline: { month: "" },
    value: { month },
    validate: () => /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
    save: async (value) => {
      try {
        created.current = (
          await createReportBatch({ classId, month: value.month })
        ).id;
      } catch (cause) {
        setFailure(cause instanceof Error ? cause.message : "Không thể tạo báo cáo.");
        return false;
      }
    },
  });

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setFailure("");
    if (await action.submit()) onCreated(created.current);
  }

    return (
    <ReportDialog
      open
      onClose={onClose}
      title="Thêm báo cáo"
        subtitle="Tạo một bản nháp cho mỗi học sinh trong tháng đã chọn."
      footer={
        <Button
          type="submit"
          form="add-report-form"
          size="lg"
          disabled={!action.canSave}
          loading={action.saving}
          done={action.justSaved}
        >
          Tạo báo cáo
        </Button>
      }
    >
        <form id="add-report-form" className={styles.rangeForm} onSubmit={submit} noValidate>
          <div className={styles.rangeField}>
            <label htmlFor="report-month">Tháng báo cáo</label>
            <input id="report-month" className={styles.rangeSelect} type="month" value={month} onChange={(event) => { setMonth(event.target.value); setFailure(""); }} />
          </div>
          {failure && (
            <p role="alert" className={styles.error}>
              {failure}
          </p>
        )}
      </form>
    </ReportDialog>
  );
}
