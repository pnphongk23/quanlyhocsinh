import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import { createReportBatch, listReportBatches } from "../../data/repositories/reports";
import { useStore } from "../../data/store";
import {
  defaultRange,
  rangeError,
  resolveRange,
  sessionChoices,
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
  const hasHeld = defaultRange(snapshot.sessions, klass.id) !== null;

  const addButton = canWrite && (
    <Button
      size={desktop ? "md" : "lg"}
      block={!desktop}
      disabled={!hasHeld}
      title={hasHeld ? undefined : "Lớp chưa có buổi nào đã diễn ra."}
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
          hasHeld
            ? "Thêm báo cáo để chọn khoảng buổi và tạo nháp cho cả lớp."
            : "Báo cáo cần ít nhất một buổi đã diễn ra."
        }
        action={canWrite && hasHeld ? addButton : undefined}
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
  const sessions = useStore().sessions;
  const choices = useMemo(() => sessionChoices(sessions, classId), [sessions, classId]);
  const initial = useMemo(() => defaultRange(sessions, classId), [sessions, classId]);
  const [from, setFrom] = useState(initial?.fromSessionId ?? "");
  const [to, setTo] = useState(initial?.toSessionId ?? "");
  const created = useRef("");
  const [failure, setFailure] = useState("");
  const problem = from && to ? rangeError(sessions, classId, from, to) : "Chọn buổi.";
  const action = useSaveAction({
    baseline: { from: "", to: "" },
    value: { from, to },
    validate: () => problem === null,
    save: async (value) => {
      try {
        created.current = (
          await createReportBatch({ classId, fromSessionId: value.from, toSessionId: value.to })
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

  const select = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    invalid: boolean,
  ) => (
    <div className={styles.rangeField}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={styles.rangeSelect}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          onChange(event.target.value);
          setFailure("");
        }}
      >
        {choices.map((choice) => (
          <option key={choice.session.id} value={choice.session.id}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );

  const invalidRange = problem !== null && Boolean(from && to);
  return (
    <ReportDialog
      open
      onClose={onClose}
      title="Thêm báo cáo"
      subtitle="Tạo một bản nháp cho mỗi học sinh có học trong khoảng buổi này."
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
        {select("report-from", "Buổi bắt đầu", from, setFrom, invalidRange)}
        {select("report-to", "Buổi kết thúc", to, setTo, invalidRange)}
        <p className={styles.blockNote}>
          Buổi đã hủy không có trong danh sách. Số liệu chỉ tính các buổi chưa hủy
          thuộc khoảng.
        </p>
        {(invalidRange || failure) && (
          <p role="alert" className={styles.error}>
            {failure || problem}
          </p>
        )}
      </form>
    </ReportDialog>
  );
}
