import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mascot } from "../../shared/ui/Mascot";
import { getClass } from "../../data/repositories/classes";
import { useAccess, visibleClassIds } from "../../data/repositories/access";
import { listAttendance } from "../../data/repositories/attendance";
import { listComments } from "../../data/repositories/comments";
import { listHomeworkGrades, listHomeworkSections } from "../../data/repositories/homework";
import {
  listReports,
  publishReport,
  saveReport,
  saveReportComment,
} from "../../data/repositories/reports";
import { listScores } from "../../data/repositories/scores";
import { listSessions } from "../../data/repositories/sessions";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import { useStore } from "../../data/store";
import type { Report, Student } from "../../data/types";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import { Collapse } from "../../shared/motion";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  Card,
  EmptyState,
  NoAccess,
  PageHeader,
  Pill,
} from "../../shared/ui";
import ReportPreview from "./ReportPreview";
import ClassDesktopHeader from "../class-space/ClassDesktopHeader";
import { latestTestLabel, latestTestScore } from "./latestTest";
import { buildMonthlyStudentReport, type MonthlyStudentReport } from "../../data/reportModel";
import {
  monthOptionLabel,
  monthPeriodLabel,
  stepMonthChoice,
  publishAllLabel,
  reportSlot,
  reviewSummary,
  type ReportSlot,
} from "./reviewStatus";
import styles from "./ReportsPage.module.css";

/** Tháng mặc định: tháng của buổi học hoặc bài kiểm tra gần nhất của lớp. */
function defaultMonth(classId: string) {
  const candidates = [
    ...listSessions(classId).map((item) => item.date),
    ...listTests(classId).map((item) => item.date),
  ].sort();
  return candidates.at(-1)?.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
}

interface ReviewRow {
  report: MonthlyStudentReport;
  slot: ReportSlot;
  /** Bản ghi Report của em trong kỳ (nếu đã lưu). */
  record?: Report;
}

export default function ReportsPage() {
  const snapshot = useStore();
  const { classId = "" } = useParams();
  const access = useAccess();
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const save = useSaveStatus();
  const [month, setMonth] = useState(() => defaultMonth(classId));
  const [studentId, setStudentId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  // Nhận xét đang sửa, gắn theo "tháng:em" để không lẫn sang em khác.
  const [commentDraft, setCommentDraft] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMonth(defaultMonth(classId));
    setStudentId("");
    setPreviewOpen(false);
    setCommentDraft(null);
    setMessage("");
    setError("");
  }, [classId]);

  useEffect(() => {
    setPreviewOpen(false);
    setMessage("");
    setError("");
  }, [studentId, month]);

  /** Dữ liệu của lớp, đọc qua repository (đã lọc theo phạm vi vai trò). */
  const source = useMemo(() => {
    const sessions = listSessions(classId);
    const homeworkSections = sessions.flatMap((session) =>
      listHomeworkSections(session.id),
    );
    return {
      students: listStudents(classId),
      sessions,
      attendance: sessions.flatMap((session) => listAttendance(session.id)),
      tests: listTests(classId),
      scores: listTests(classId).flatMap((test) => listScores(test.id)),
      comments: listComments(classId),
      homeworkSections,
      homeworkGrades: homeworkSections.flatMap((section) =>
        listHomeworkGrades(section.id),
      ),
      reports: listReports(classId),
    };
  }, [snapshot, classId]);

  /** Một dòng cho mỗi em có học trong tháng (gồm em đã rời lớp trong tháng). */
  const rows = useMemo<ReviewRow[]>(() => {
    return source.students.flatMap((student) => {
      const record = source.reports.find(
        (item) => item.studentId === student.id && item.month === month,
      );
      const report = buildMonthlyStudentReport(student, month, {
        sessions: source.sessions,
        attendance: source.attendance,
        tests: source.tests,
        scores: source.scores,
        comments: source.comments,
        homeworkSections: source.homeworkSections,
        homeworkGrades: source.homeworkGrades,
        generalComment: record?.generalComment ?? "",
      });
      return report ? [{ report, record, slot: reportSlot(report, record) }] : [];
    });
  }, [source, month]);

  if (!access.can("comments_reports", "read"))
    return <NoAccess what="báo cáo" />;
  const canWrite = access.can("comments_reports", "write");

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

  const monthChoices = [
    ...new Set([
      ...source.sessions.map((session) => session.date.slice(0, 7)),
      ...source.tests.map((test) => test.date.slice(0, 7)),
      ...source.reports.map((record) => record.month),
      month,
    ]),
  ].sort((a, b) => b.localeCompare(a));
  const summary = reviewSummary(rows.map((row) => row.slot));
  const monthLabel = `Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
  const monthIndex = monthChoices.indexOf(month);
  const stepMonth = (delta: number) => {
    const next = stepMonthChoice(monthChoices, month, delta);
    if (next !== month) handleMonthChange(next);
  };
  const selected = rows.find((row) => row.report.student.id === studentId) ?? rows[0];
  const draftKey = selected ? `${month}:${selected.report.student.id}` : "";
  const commentValue =
    (commentDraft?.key === draftKey ? commentDraft.value : null) ??
    selected?.record?.generalComment ??
    "";
  const suggestion = selected?.report.suggestion ?? null;

  function resetNotices() {
    setMessage("");
    setError("");
  }

  function handleMonthChange(value: string) {
    if (!value) return;
    setMonth(value);
    setStudentId("");
    resetNotices();
  }

  function selectStudent(id: string) {
    setStudentId(id);
    resetNotices();
  }

  function ensureReport(student: Student): Report {
    return saveReport({ classId, studentId: student.id, month });
  }

  /** Lưu nhận xét chung của tháng qua API. */
  async function persistComment(value: string) {
    if (!selected || !canWrite) return;
    if (value.trim() === (selected.record?.generalComment ?? "")) return;
    save.markUnsaved();
    try {
      const record = ensureReport(selected.report.student);
      await saveReportComment(record.id, value);
      save.clearStatus();
      resetNotices();
      setMessage("Đã lưu nhận xét chung.");
    } catch (cause) {
      save.setStatus("error");
      resetNotices();
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu nhận xét chung.",
      );
    }
  }

  function useSuggestion() {
    if (!suggestion) return;
    setCommentDraft({ key: draftKey, value: suggestion });
    persistComment(suggestion);
  }

  async function publishRow(row: ReviewRow) {
    if (!row.slot.publishable) return;
    save.markUnsaved();
    try {
      const record = row.record ?? ensureReport(row.report.student);
        await publishReport(record.id);
      save.clearStatus();
      resetNotices();
      setMessage(
        row.slot.status === "republish"
          ? "Đã phát hành lại báo cáo."
          : "Đã phát hành báo cáo.",
      );
    } catch (cause) {
      resetNotices();
      setError(
        cause instanceof Error ? cause.message : "Không thể phát hành báo cáo.",
      );
    }
  }

  async function publishAll() {
    const waiting = rows.filter((row) => row.slot.publishable);
    if (!waiting.length) return;
    save.markUnsaved();
    try {
      for (const row of waiting) {
        const record = row.record ?? ensureReport(row.report.student);
        await publishReport(record.id);
      }
      save.clearStatus();
      resetNotices();
      setMessage(`Đã phát hành ${waiting.length} báo cáo.`);
    } catch (cause) {
      resetNotices();
      setError(
        cause instanceof Error ? cause.message : "Không thể phát hành báo cáo.",
      );
    }
  }

  const monthControl = (
    <label className={styles.monthPicker}>
      Chọn tháng
      <select
        className={styles.monthSelect}
        value={month}
        aria-label="Chọn tháng báo cáo"
        onChange={(event) => handleMonthChange(event.target.value)}
      >
        {monthChoices.map((value) => (
          <option key={value} value={value}>
            {monthOptionLabel(value)}
          </option>
        ))}
      </select>
    </label>
  );

  const notices = (
    <div className={styles.notices}>
      <SaveStatus status={save.status} />
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
      <EmptyState title="Chưa có dữ liệu báo cáo" mascot="cho">
        <p>Chọn tháng có buổi học hoặc bài kiểm tra để xem báo cáo.</p>
      </EmptyState>
    </Card>
  );

  const commentEditor = selected ? (
    <section className={styles.commentBlock}>
      <h3>Nhận xét chung của tháng</h3>
      {canWrite ? (
        <textarea
          className={styles.commentInput}
          aria-label="Nhận xét chung của tháng"
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
      ) : (
        <p className={styles.commentText}>
          {commentValue || "Chưa có nhận xét chung."}
        </p>
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

  const preview = selected ? (
    <ReportPreview
      report={{
        ...selected.report,
        generalComment: commentValue.trim() || selected.report.generalComment,
      }}
      className={klass.name}
      published={selected.record?.status === "published"}
      canPublish={canWrite}
      publishable={selected.slot.publishable}
      onPublish={() => publishRow(selected)}
      onBack={() => setPreviewOpen(false)}
    />
  ) : null;

  if (desktop) {
    const header = (
      <ClassDesktopHeader
        classId={classId}
        klass={klass}
        actions={
          <div className={styles.monthStepper}>
            <button
              type="button"
              className={styles.monthArrow}
              aria-label="Tháng trước"
              disabled={monthIndex >= monthChoices.length - 1}
              onClick={() => stepMonth(1)}
            >
              ‹
            </button>
            <span className={styles.monthValue}>{monthLabel}</span>
            <button
              type="button"
              className={styles.monthArrow}
              aria-label="Tháng sau"
              disabled={monthIndex <= 0}
              onClick={() => stepMonth(-1)}
            >
              ›
            </button>
          </div>
        }
      />
    );

    if (!rows.length)
      return (
        <main className={styles.page}>
          {header}
          <p className={styles.summary}>
            <span>{monthPeriodLabel(month)}</span>
          </p>
          {emptyState}
        </main>
      );

    return (
      <main className={styles.page}>
        {header}
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
                  <h2>
                    {selected.report.student.name} ·{" "}
                    {monthPeriodLabel(month)}
                  </h2>
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
                    onClick={() => setPreviewOpen(true)}
                  >
                    Xem trước PDF
                  </Button>
                  {canWrite && (
                    <Button
                      className={styles.publishButton}
                      onClick={publishAll}
                      disabled={!summary.publishable}
                      title={
                        summary.publishable
                          ? undefined
                          : "Không còn báo cáo nào cần phát hành."
                      }
                    >
                      {publishAllLabel(summary.publishable)}
                    </Button>
                  )}
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
        {previewOpen && preview}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <SaveStatus />
      {previewOpen && selected ? (
        <>
          {notices}
          {preview}
        </>
      ) : (
        <>
          <div className={styles.monthBar}>{monthControl}</div>
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
                        <Collapse open={active} className={styles.studentExpanded}>
                            <ReportFacts report={row.report} />
                            {commentEditor}
                          <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => setPreviewOpen(true)}
                          >
                            Xem trước
                          </Button>
                        </Collapse>
                    </div>
                  );
                })}
              </div>

              {canWrite && (
                <Button
                  size="lg"
                  onClick={publishAll}
                  disabled={!summary.publishable}
                  title={
                    summary.publishable
                      ? undefined
                      : "Không còn báo cáo nào cần phát hành."
                  }
                >
                  {publishAllLabel(summary.publishable)}
                </Button>
              )}
              {canWrite && (
                <p className={styles.publishNote}>
                  Phụ huynh chỉ thấy báo cáo sau khi bạn phát hành.
                </p>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}

/** Khối chuyên cần và bài kiểm tra gần nhất của một em (ảnh 15). */
function ReportFacts({
  report,
  latest,
}: {
  report: MonthlyStudentReport;
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
function attendanceDetail(report: MonthlyStudentReport): string {
  return [
    report.lateCount ? `${report.lateCount} muộn` : "",
    report.excusedCount ? `${report.excusedCount} có phép` : "",
    report.absentCount ? `${report.absentCount} vắng` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
