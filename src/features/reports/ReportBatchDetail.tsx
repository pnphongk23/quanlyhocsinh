import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSaveAndLeave } from "../../shared/hooks/useSavedPeek";
import { Mascot } from "../../shared/ui/Mascot";
import { useAccess } from "../../data/repositories/access";
import {
  publishBatch,
  publishReport,
  saveReportComment,
} from "../../data/repositories/reports";
import { useStore } from "../../data/store";
import type { PeriodStudentReport } from "../../data/reportModel";
import type { Class, ReportBatch } from "../../data/types";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import { SAVE_MIN_VISIBLE_MS } from "../../shared/hooks/useSaveAction";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  Pill,
  UnsavedChangesDialog,
} from "../../shared/ui";
import ReportPreviewDialog from "./ReportPreviewDialog";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import { latestTestLabel, latestTestScore } from "./latestTest";
import {
  buildBatchRows,
  readClassReportSource,
  type BatchRow,
} from "./batchRows";
import { publishAllLabel, reviewSummary } from "./reviewStatus";
import { Collapse } from "../../shared/motion";
import styles from "./ReportsPage.module.css";

/** Chi tiết một đợt báo cáo: danh sách học sinh, nhận xét chung, xem trước và phát hành. */
export default function ReportBatchDetail({
  klass,
  batch,
}: {
  klass: Class;
  batch: ReportBatch;
}) {
  const snapshot = useStore();
  const classId = klass.id;
  const access = useAccess();
  const desktop = useIsDesktop();
  const save = useSaveStatus();
  const [studentId, setStudentId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  // Nhận xét đang sửa, gắn theo "đợt:em" để không lẫn sang em khác.
  const [commentDraft, setCommentDraft] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    setPreviewOpen(false);
    setMessage("");
    setError("");
    setPublishError("");
  }, [studentId]);

  /** Dữ liệu của lớp, đọc qua repository (đã lọc theo phạm vi vai trò). */
  const source = useMemo(
    () => readClassReportSource(classId),
    [snapshot, classId],
  );
  const built = useMemo(() => buildBatchRows(batch, source), [batch, source]);
  const { range, rows } = built;

  // Nhận xét gõ dở chưa rời ô (blur tự lưu): hỏi khi rời màn hoặc tải lại.
  const draftStudentId = commentDraft ? commentDraft.key.slice(commentDraft.key.indexOf(":") + 1) : "";
  const draftRow = rows.find((row) => row.report.student.id === draftStudentId);
  const commentDirty = Boolean(
    commentDraft &&
      draftRow &&
      commentDraft.value.trim() !== (draftRow.record?.generalComment ?? ""),
  );
  const guard = useLeaveGuard(commentDirty);
  const leave = useSaveAndLeave();
  const [publishing, setPublishing] = useState<"row" | "all" | null>(null);
  const publishLock = useRef(false);
  const commentSaving = useRef<string | null>(null);
  /** Lần lưu nhận xét đang chạy; xem trước và phát hành chờ nó xong để lấy đúng nội dung. */
  const pendingSave = useRef<Promise<boolean> | null>(null);

  const canWrite = access.can("comments_reports", "write");
  const summary = reviewSummary(rows.map((row) => row.slot));
  const selected = rows.find((row) => row.report.student.id === studentId) ?? rows[0];
  const draftKey = selected ? `${batch.id}:${selected.report.student.id}` : "";
  const commentValue =
    (commentDraft?.key === draftKey ? commentDraft.value : null) ??
    selected?.record?.generalComment ??
    "";
  const suggestion = selected?.report.suggestion ?? null;

  function resetNotices() {
    setMessage("");
    setError("");
  }

  function selectStudent(id: string) {
    setStudentId(id);
    resetNotices();
  }

  /** Lưu nhận xét chung của đợt lên máy chủ (cần mạng). */
  function persistComment(value: string): Promise<boolean> {
    if (!selected || !canWrite) return Promise.resolve(true);
    if (value.trim() === selected.record.generalComment) return Promise.resolve(true);
    const lockKey = `${selected.record.id}:${value}`;
    if (commentSaving.current === lockKey) return pendingSave.current ?? Promise.resolve(true);
    commentSaving.current = lockKey;
    const run = (async () => {
      try {
        await saveReportComment(selected.record.id, value);
        save.clearStatus();
        resetNotices();
      } catch (cause) {
        save.setStatus("error");
        resetNotices();
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể lưu nhận xét chung.",
        );
        return false;
      } finally {
        if (commentSaving.current === lockKey) {
          commentSaving.current = null;
          pendingSave.current = null;
        }
      }
      return true;
    })();
    pendingSave.current = run;
    return run;
  }

  function useSuggestion() {
    if (!suggestion) return;
    setCommentDraft({ key: draftKey, value: suggestion });
    persistComment(suggestion);
  }

  /** Khoá bấm lặp: một lần phát hành tại một thời điểm (gửi tới phụ huynh). */
  async function guardedPublish(kind: "row" | "all", run: () => Promise<void>) {
    if (publishLock.current) return;
    publishLock.current = true;
    setPublishing(kind);
    const startedAt = Date.now();
    try {
      await run();
      const remaining = SAVE_MIN_VISIBLE_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    } finally {
      publishLock.current = false;
      setPublishing(null);
    }
  }

  const publishRow = (row: BatchRow) => guardedPublish("row", () => doPublishRow(row));
  const publishAll = () => guardedPublish("all", doPublishAll);

  async function openPreview() {
    await pendingSave.current;
    setPublishError("");
    setPreviewOpen(true);
  }

  async function doPublishRow(row: BatchRow) {
    if (!row.slot.publishable) return;
    save.markUnsaved();
    try {
      await pendingSave.current;
      await publishReport(row.record.id);
      save.clearStatus();
      resetNotices();
      setPublishError("");
      setPreviewOpen(false);
      setMessage(
        row.slot.status === "republish"
          ? "Đã phát hành lại báo cáo."
          : "Đã phát hành báo cáo.",
      );
    } catch (cause) {
      save.setStatus("error");
      resetNotices();
      const text = cause instanceof Error ? cause.message : "Không thể phát hành báo cáo.";
      if (previewOpen) setPublishError(text);
      else setError(text);
    }
  }

  async function doPublishAll() {
    const waiting = rows.filter((row) => row.slot.publishable);
    if (!waiting.length) return;
    save.markUnsaved();
    try {
      await pendingSave.current;
      const result = await publishBatch(batch.id);
      save.clearStatus();
      resetNotices();
      const skipped = result.skipped.map(({ reportId, missing }) => {
        const student = rows.find((row) => row.record.id === reportId)?.report.student;
        const labels: Record<string, string> = { attendance: "điểm danh", scores: "điểm", comment: "nhận xét chung" };
        const reasons = missing.map((item) => labels[item]).filter(Boolean);
        return `${student?.name ?? "Báo cáo"}: ${reasons.length ? `thiếu ${reasons.join(", ")}` : "còn thiếu dữ liệu"}`;
      });
      setMessage([
        `Đã phát hành ${result.published} báo cáo.`,
        ...(skipped.length ? [`Chưa phát hành: ${skipped.join("; ")}.`] : []),
      ].join(" "));
    } catch (cause) {
      save.setStatus("error");
      resetNotices();
      setError(
        cause instanceof Error ? cause.message : "Không thể phát hành báo cáo.",
      );
    }
  }

  const backLink = (
    <Link to={{ search: "" }} className={styles.backRow}>
      <Icon name="back" size={18} />
      Tất cả báo cáo
    </Link>
  );

  const notices = (
    <div className={styles.notices}>
      <SaveStatus status={save.status} />
      <UnsavedChangesDialog
        open={guard.blocked}
        title="Nhận xét chung chưa lưu"
        message="Bạn đang sửa dở nhận xét chung. Lưu trước khi rời màn này?"
        done={leave.done}
        onSave={() =>
          leave.run(async () => {
            return commentDraft ? persistComment(commentDraft.value) : true;
          }, guard.proceed)
        }
        onDiscard={() => {
          leave.cancel();
          setCommentDraft(null);
          guard.proceed();
        }}
        onStay={() => {
          leave.cancel();
          guard.stay();
        }}
      />
      {message && (
        <span role="status" className={styles.successMessage}>
          <Mascot pose="vui" size={32} className={styles.successMascot} />
          {message}
        </span>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );

  const emptyState = (
    <Card>
      <EmptyState title="Chưa có học sinh trong khoảng này" mascot="cho">
        <p>Không có em nào đang học trong các buổi của đợt báo cáo này.</p>
      </EmptyState>
    </Card>
  );

  const commentEditor = selected ? (
    <section className={styles.commentBlock}>
      <h3>Nhận xét chung của đợt</h3>
      {canWrite ? (
        <textarea
          className={styles.commentInput}
          aria-label="Nhận xét chung của đợt"
          value={commentValue}
          placeholder={
            suggestion ?? "Nhập nhận xét chung cho phụ huynh của em này."
          }
          rows={3}
          onChange={(event) => {
            setCommentDraft({ key: draftKey, value: event.target.value });
            save.markUnsaved();
          }}
          onBlur={(event) => persistComment(event.target.value)}
        />
      ) : commentValue ? (
        <p className={styles.commentText}>{commentValue}</p>
      ) : (
        <EmptyState size="compact" title="Chưa có nhận xét chung" />
      )}
      {canWrite && suggestion && (
        <Button
          variant="secondary"
          className={styles.suggestionButton}
          onClick={useSuggestion}
        >
          Dùng gợi ý làm bản nháp
        </Button>
      )}
    </section>
  ) : null;

  const previewDialog =
    previewOpen && selected ? (
      <ReportPreviewDialog
        row={selected}
        className={klass.name}
        heading={range}
        canPublish={canWrite}
        publishing={publishing === "row"}
        publishBusy={publishing !== null}
        error={publishError}
        onPublish={() => publishRow(selected)}
        onClose={() => setPreviewOpen(false)}
      />
    ) : null;

  const publishAllButton = canWrite && (
    <Button
      size={desktop ? "md" : "lg"}
      className={desktop ? styles.publishButton : undefined}
      onClick={publishAll}
      disabled={!summary.publishable || publishing !== null}
      loading={publishing === "all"}
      title={
        summary.publishable
          ? undefined
          : "Không còn báo cáo nào cần phát hành."
      }
    >
      {publishAllLabel(summary.publishable)}
    </Button>
  );

  const title = (
    <div className={styles.batchHead}>
      {backLink}
      <h2 className={styles.batchHeading}>{range.label}</h2>
    </div>
  );

  if (desktop) {
    return (
      <main className={styles.page}>
        <ClassDesktopHeader classId={classId} klass={klass} />
        {title}
        {!rows.length ? (
          emptyState
        ) : (
          <div className={styles.desktopLayout}>
            <Card className={styles.listCard}>
              <div className={styles.listHeading}>
                <h2>
                  Sẵn sàng <b>{summary.ready}/{summary.total}</b> học sinh
                </h2>
                <Pill tone={summary.missing ? "warning" : "success"}>
                  {summary.missing
                    ? `${summary.missing} thiếu dữ liệu`
                    : "Đã đủ dữ liệu"}
                </Pill>
              </div>
              <div className={styles.desktopList}>
                {rows.map((row) => {
                  const active = row.report.student.id === selected?.report.student.id;
                  return (
                    <button
                      key={row.report.student.id}
                      type="button"
                      aria-pressed={active}
                      className={
                        styles.desktopRow +
                        (active ? " " + styles.studentSelected : "")
                      }
                      onClick={() => selectStudent(row.report.student.id)}
                    >
                      <span className={styles.studentName}>
                        {row.report.student.name}
                        {row.slot.detail && <small>{row.slot.detail}</small>}
                      </span>
                      <Pill tone={row.slot.tone} className={styles.badge}>
                        {row.slot.label}
                      </Pill>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className={styles.detail}>
              {selected ? (
                <>
                  <header className={styles.detailHead}>
                    <h2>{selected.report.student.name}</h2>
                  </header>
                  <ReportFacts
                    report={selected.report}
                    latest={latestTestScore(
                      source.tests,
                      source.scores,
                      selected.report.student.id,
                    )}
                  />
                  {commentEditor}
                  <div className={styles.actions}>
                    <Button
                      variant="secondary"
                      className={styles.previewButton}
                      onClick={openPreview}
                    >
                      Xem trước
                    </Button>
                    {publishAllButton}
                  </div>
                  <p className={styles.publishNote}>
                    {canWrite
                      ? "Phụ huynh chỉ thấy báo cáo sau khi bạn phát hành."
                      : "Bạn chỉ có quyền xem báo cáo của lớp."}
                  </p>
                  {notices}
                </>
              ) : (
                <p className={styles.note}>
                  Chọn một em trong danh sách để xem báo cáo.
                </p>
              )}
            </Card>
          </div>
        )}
        {previewDialog}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <SaveStatus />
      {title}
      <p className={styles.summary}>
        <b>{summary.ready}/{summary.total}</b> sẵn sàng ·{" "}
        <b className={styles.summaryMissing}>{summary.missing}</b> thiếu dữ
        liệu · <b>{summary.published}</b> đã phát hành
      </p>
      {notices}
      {rows.length === 0 ? (
        emptyState
      ) : (
        <>
          <div className={styles.studentList}>
            {rows.map((row) => {
              const active =
                row.report.student.id === selected?.report.student.id;
              return (
                <div
                  key={row.report.student.id}
                  className={
                    styles.studentRow +
                    (active ? " " + styles.studentSelected : "")
                  }
                >
                  <button
                    type="button"
                    aria-expanded={active}
                    className={styles.studentButton}
                    onClick={() => selectStudent(row.report.student.id)}
                  >
                    <span className={styles.studentName}>
                      {row.report.student.name}
                      {row.slot.detail && <small>{row.slot.detail}</small>}
                    </span>
                    <Pill tone={row.slot.tone} className={styles.badge}>
                      {row.slot.label}
                    </Pill>
                  </button>
                  <Collapse open={active}>
                    {active && (
                      <div className={styles.studentExpanded}>
                        <ReportFacts report={row.report} />
                        {commentEditor}
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={openPreview}
                        >
                          Xem trước
                        </Button>
                      </div>
                    )}
                  </Collapse>
                </div>
              );
            })}
          </div>
          {publishAllButton}
          {canWrite && (
            <p className={styles.publishNote}>
              Phụ huynh chỉ thấy báo cáo sau khi bạn phát hành.
            </p>
          )}
        </>
      )}
      {previewDialog}
    </main>
  );
}

/** Khối chuyên cần và bài kiểm tra gần nhất của một em (ảnh 15). */
function ReportFacts({
  report,
  latest,
}: {
  report: PeriodStudentReport;
  latest?: ReturnType<typeof latestTestScore>;
}) {
  const detail = attendanceDetail(report);
  return (
    <div className={styles.statGrid}>
      <div className={styles.statCard}>
        <span>Chuyên cần</span>
        <strong>
          {report.attendanceCount}/{report.sessions.length} buổi
        </strong>
        {detail && <small>{detail}</small>}
      </div>
      {latest !== undefined ? (
        <div className={styles.statCard}>
          <span>Kiểm tra gần nhất</span>
          <strong>{latestTestLabel(latest)}</strong>
        </div>
      ) : (
        <div className={styles.statCard}>
          <span>Bài kiểm tra</span>
          <strong>
            {report.gradedTestCount}/{report.tests.length} bài
          </strong>
          <small>đã có điểm</small>
        </div>
      )}
    </div>
  );
}

/** Dòng nhỏ dưới "Chuyên cần": chỉ nêu các mục có số khác 0 (ảnh 07/13). */
function attendanceDetail(report: PeriodStudentReport): string {
  return [
    report.lateCount ? `${report.lateCount} muộn` : "",
    report.excusedCount ? `${report.excusedCount} có phép` : "",
    report.absentCount ? `${report.absentCount} vắng` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
