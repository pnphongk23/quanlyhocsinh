import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import { createReportBatch, listReportBatches } from "../../data/repositories/reports";
import { useStore } from "../../data/store";
import {
  defaultRange,
  rangeError,
  sessionChoices,
} from "../../data/reportRange";
import type { Class } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { SaveStatus } from "../../shared/SaveStatus";
import { Button, Card, EmptyState, Icon } from "../../shared/ui";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import { batchCounts, buildBatchRows, readClassReportSource } from "./batchRows";
import ReportDialog from "./ReportDialog";
import styles from "./ReportsPage.module.css";

/** Danh sách đợt báo cáo của lớp và nút "Thêm báo cáo". */
export default function ReportBatchList({ klass }: { klass: Class }) {
  const snapshot = useStore();
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const access = useAccess();
  const canWrite = access.can("comments_reports", "write");
  const [adding, setAdding] = useState(false);

  const items = useMemo(() => {
    const source = readClassReportSource(klass.id);
    return listReportBatches(klass.id).map((batch) => {
      const built = buildBatchRows(batch, source);
      return { batch, built, counts: built ? batchCounts(built.rows) : null };
    });
  }, [snapshot, klass.id]);
  const choices = useMemo(
    () => sessionChoices(snapshot.sessions, klass.id),
    [snapshot.sessions, klass.id],
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
      {items.map(({ batch, built, counts }) => (
        <li key={batch.id}>
          {built && counts ? (
            <Link
              to={`?dot=${batch.id}`}
              className={styles.batchRow}
              aria-label={`Mở báo cáo ${built.range.label}`}
            >
              <span className={styles.batchText}>
                <span className={styles.batchTitle}>{built.range.label}</span>
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
          ) : (
            <div className={styles.batchRow} aria-disabled="true">
              <span className={styles.batchText}>
                <span className={styles.batchTitle}>Khoảng buổi không còn hợp lệ</span>
                <span className={styles.batchMeta}>
                  Buổi đầu hoặc cuối của đợt này đã bị hủy.
                </span>
              </span>
            </div>
          )}
        </li>
      ))}
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

  const dialog = adding && (
    <AddReportDialog
      classId={klass.id}
      choices={choices}
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
        {content}
        {dialog}
      </main>
    );

  return (
    <main className={styles.page}>
      <SaveStatus />
      {items.length > 0 && addButton}
      {content}
      {dialog}
    </main>
  );
}

function AddReportDialog({
  classId,
  choices,
  onClose,
  onCreated,
}: {
  classId: string;
  choices: ReturnType<typeof sessionChoices>;
  onClose: () => void;
  onCreated: (batchId: string) => void;
}) {
  const sessions = useStore().sessions;
  const initial = defaultRange(sessions, classId);
  const [from, setFrom] = useState(initial?.fromSessionId ?? "");
  const [to, setTo] = useState(initial?.toSessionId ?? "");
  const created = useRef("");
  const [failure, setFailure] = useState("");
  const problem = from && to ? rangeError(sessions, classId, from, to) : "Chọn buổi.";
  const action = useSaveAction({
    baseline: { from: "", to: "" },
    value: { from, to },
    validate: () => problem === null,
    save: (value) => {
      try {
        created.current = createReportBatch({
          classId,
          fromSessionId: value.from,
          toSessionId: value.to,
        }).id;
      } catch (cause) {
        setFailure(
          cause instanceof Error ? cause.message : "Không thể tạo báo cáo.",
        );
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
