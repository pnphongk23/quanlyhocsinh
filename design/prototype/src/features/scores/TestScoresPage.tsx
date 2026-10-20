import { useState } from "react";
import { Link, useBlocker, useParams } from "react-router-dom";
import { useStore } from "../../data/store";
import { getClass, listClasses } from "../../data/repositories/classes";
import { listStudents } from "../../data/repositories/students";
import { listTests } from "../../data/repositories/tests";
import { listScores, saveScore } from "../../data/repositories/scores";
import { useAccess } from "../../data/repositories/access";
import { useSaveStatus } from "../../shared/SaveStatus";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { formatDayMonthLong } from "../../shared/format";
import type { SaveState } from "../../data/types";
import {
  EmptyState,
  Icon,
  LinkButton,
  NoAccess,
  PageHeader,
} from "../../shared/ui";
import {
  clearClassTestDrafts,
  draftsForClass,
  entriesForClassTests,
  type ClassScoreDrafts,
  type ScoreDraft,
} from "./scoreDrafts";
import { AlertTriangleIcon } from "./ScoreIcons";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import s from "./scores.module.css";

const keyFor = (testId: string, studentId: string) => `${testId}:${studentId}`;

const MAX_SCORE = 10;

/** Điểm gõ dở ngoài thang 0–10 (ô trống không tính là lỗi). */
function isInvalidDraft(draft: ScoreDraft): boolean {
  const raw = draft.value.trim();
  if (raw === "") return false;
  const parsed = Number(raw.replace(",", "."));
  return !Number.isFinite(parsed) || parsed < 0 || parsed > MAX_SCORE;
}

export default function TestScoresPage() {
  const desktop = useIsDesktop();
  const { classId = "", testId = "" } = useParams();
  useStore();
  const access = useAccess();
  const { status, markUnsaved, clearStatus, setStatus } = useSaveStatus();
  const classItem = getClass(classId);
  const test = listTests(classId).find((item) => item.id === testId);
  const students = listStudents(classId, false);
  const [drafts, setDrafts] = useState<ClassScoreDrafts>({});
  const [error, setError] = useState("");
  const currentTestIds = new Set([testId]);
  const classDrafts = draftsForClass(drafts, classId);
  const currentDraftEntries = entriesForClassTests(drafts, classId, currentTestIds);
  const otherDraftClasses = listClasses().filter(
    (item) =>
      item.id !== classId &&
      Object.keys(draftsForClass(drafts, item.id)).length > 0,
  );
  const dirty = currentDraftEntries.length > 0;
  const blocker = useBlocker(dirty);

  if (!access.can("scores", "read")) return <NoAccess what="bảng điểm" />;
  const canWrite = access.can("scores", "write");

  const valueFor = (studentId: string): ScoreDraft => {
    const draft = classDrafts[keyFor(testId, studentId)];
    if (draft) return draft;
    const score = listScores(testId).find(
      (item) => item.studentId === studentId,
    );
    return {
      value:
        score?.value === null || score?.value === undefined
          ? ""
          : String(score.value),
    };
  };
  const change = (studentId: string, patch: Partial<ScoreDraft>) => {
    markUnsaved();
    setDrafts((current) => {
      const now = draftsForClass(current, classId);
      const key = keyFor(testId, studentId);
      return {
        ...current,
        [classId]: {
          ...now,
          [key]: { ...(now[key] ?? valueFor(studentId)), ...patch },
        },
      };
    });
  };
  /** Trả về true khi đã lưu xong, false khi còn lỗi. */
  const save = (): boolean => {
    try {
      for (const [key, draft] of currentDraftEntries) {
        const [entryTestId, studentId] = key.split(":");
        const old = listScores(entryTestId).find(
          (item) => item.studentId === studentId,
        );
        const parsed =
          draft.value.trim() === "" ? null : Number(draft.value.replace(",", "."));
        if (isInvalidDraft(draft))
          throw new Error("Điểm phải từ 0 đến 10.");
        if (old && old.value === parsed) continue;
        if (!old && parsed === null) continue;
        // `absent` đã bỏ khỏi Score (đã chốt 2026-10-19); ép kiểu để file này
        // chạy được cả trước và sau khi kiểu dữ liệu bỏ hẳn trường đó.
        saveScore({
          testId: entryTestId,
          studentId,
          value: parsed,
        } as Parameters<typeof saveScore>[0]);
      }
      setDrafts((current) => clearClassTestDrafts(current, classId, currentTestIds));
      setError("");
      clearStatus();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được điểm.");
      setStatus("error");
      return false;
    }
  };
  const discardDrafts = () => {
    setDrafts((current) => clearClassTestDrafts(current, classId, currentTestIds));
    setError("");
    clearStatus();
  };

  if (!test)
    return (
      <EmptyState title="Không tìm thấy bài kiểm tra">
        <LinkButton to={`/lop/${classId}/bai-kiem-tra`}>
          Về danh sách bài kiểm tra
        </LinkButton>
      </EmptyState>
    );

  const invalidCount = students.filter((student) =>
    isInvalidDraft(valueFor(student.id)),
  ).length;
  const listPath = `/lop/${classId}/bai-kiem-tra`;

  return (
    <section className={s.page}>
      <PageHeader
        backTo={listPath}
        eyebrow={classItem?.name ?? "Lớp học"}
        title="Điểm số"
        actions={
          canWrite ? (
            <LinkButton variant="secondary" to={`${listPath}/moi`}>
              + Bài mới
            </LinkButton>
          ) : undefined
        }
      />
      <div className={s.testCard}>
        <div className={s.testCardText}>
          <p className={s.testCardName}>{test.name}</p>
          <p className={s.testCardMeta}>
            Ngày {formatDayMonthLong(test.date)} · Thang 10 điểm
          </p>
        </div>
        <Link className={s.switchTest} to={listPath}>
          Đổi bài
          <Icon name="chevron-down" size={18} />
        </Link>
      </div>
      {otherDraftClasses.map((item) => (
        <p className={s.draftNotice} key={item.id}>
          Còn bản nháp chưa lưu của lớp {item.name}.{" "}
          <Link to={`/lop/${item.id}/diem`}>Quay lại lớp này</Link>
        </p>
      ))}
      {!canWrite && (
        <p className={s.draftNotice}>Bạn chỉ có quyền xem điểm của lớp này.</p>
      )}
      <div className={s.columns}>
        <span className={s.colStudent}>Học sinh</span>
        <span className={s.colScore}>Điểm</span>
      </div>
      <div className={s.studentList}>
        {students.map((student) => {
          const draft = valueFor(student.id);
          const invalid = isInvalidDraft(draft);
          const missing = draft.value.trim() === "";
          return (
            <div
              key={student.id}
              className={
                s.studentRow + (invalid ? " " + s.studentRowInvalid : "")
              }
            >
              <div className={s.studentRowMain}>
                <div className={s.studentNameBox}>
                  <span className={s.studentName}>{student.name}</span>
                  {missing && (
                    <span className={s.studentMissing}>Chưa có điểm</span>
                  )}
                </div>
                <input
                  className={
                    s.scoreInput +
                    (missing ? " " + s.scoreInputEmpty : "") +
                    (invalid ? " " + s.scoreInputInvalid : "")
                  }
                  aria-label={`Điểm ${student.name}`}
                  aria-invalid={invalid || undefined}
                  inputMode="decimal"
                  placeholder="–"
                  value={draft.value}
                  disabled={!canWrite}
                  onChange={(event) =>
                    change(student.id, { value: event.target.value })
                  }
                />
              </div>
              {invalid && (
                <span className={s.rowError}>
                  <AlertTriangleIcon />
                  Điểm từ 0 đến {MAX_SCORE}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {canWrite &&
        (desktop ? (
          <div className={s.desktopSaveRow}>
            <SaveBarContent
              status={status}
              error={error}
              invalidCount={invalidCount}
              dirty={dirty}
              onSave={save}
            />
          </div>
        ) : (
          <div className={s.saveBar}>
            <SaveBarContent
              status={status}
              error={error}
              invalidCount={invalidCount}
              dirty={dirty}
              onSave={save}
            />
          </div>
        ))}
      <UnsavedChangesDialog
        open={blocker.state === "blocked"}
        testName={test.name}
        onSave={() => {
          if (blocker.state !== "blocked") return;
          if (save()) blocker.proceed();
        }}
        onDiscard={() => {
          if (blocker.state !== "blocked") return;
          discardDrafts();
          blocker.proceed();
        }}
        onStay={() => {
          if (blocker.state !== "blocked") return;
          blocker.reset();
        }}
      />
    </section>
  );
}

function SaveBarContent({
  status,
  error,
  invalidCount,
  dirty,
  onSave,
}: {
  status: SaveState;
  error: string;
  invalidCount: number;
  dirty: boolean;
  onSave: () => void;
}) {
  return (
    <>
      {status === "error" && (
        <div className={s.errorBanner} role="alert">
          <AlertTriangleIcon size={18} />
          <span className={s.errorBannerText}>
            {error || "Lỗi lưu, vui lòng thử lại"}
          </span>
          <button type="button" className={s.retryButton} onClick={onSave}>
            Thử lại
          </button>
        </div>
      )}
      {invalidCount > 0 ? (
        <p className={s.saveReason}>Sửa 1 ô lỗi để lưu điểm</p>
      ) : (
        !dirty && (
          <p className={s.saveReason + " " + s.saveReasonMuted}>
            Chưa có thay đổi để lưu
          </p>
        )
      )}
      <button
        type="button"
        className={s.saveButton}
        disabled={invalidCount > 0 || !dirty}
        onClick={onSave}
      >
        Lưu điểm
      </button>
    </>
  );
}
