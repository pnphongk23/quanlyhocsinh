import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import {
  cancelSession,
  getSession,
  getSessionClass,
  hasSession,
  sessionPrefix,
  setSessionStatus,
} from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import { formatDayMonth, formatWeekdayDate } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  EmptyState,
  Icon,
  LinkButton,
  Modal,
  NoAccess,
  Pill,
  Segmented,
  Sheet,
} from "../../shared/ui";
import AttendancePanel from "../attendance/AttendancePanel";
import CommentsPanel from "../comments/CommentsPanel";
import HomeworkPanel from "../homework/HomeworkPanel";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import SessionDetailDesktop from "./SessionDetailDesktop";
import s from "./sessionDetail.module.css";

/**
 * Ba tab ngang hàng của màn buổi học (spec mục 4, ảnh 60/61): Điểm danh ·
 * Nhận xét · Bài tập về nhà. Tab nằm ở URL (?tab=diem-danh|nhan-xet|btvn) để
 * mở thẳng được và để tab BTVN quay lại đúng em ở tab Nhận xét.
 */
export type SessionTab = "diem-danh" | "nhan-xet" | "btvn";

export const SESSION_TABS: ReadonlyArray<{ value: SessionTab; label: string }> = [
  { value: "diem-danh", label: "Điểm danh" },
  { value: "nhan-xet", label: "Nhận xét" },
  { value: "btvn", label: "Bài tập về nhà" },
];

export const DEFAULT_SESSION_TAB: SessionTab = "diem-danh";

/** Giá trị `?tab=` hợp lệ; thiếu hoặc lạ thì mặc định Điểm danh. */
export function sessionTabOf(value: string | null | undefined): SessionTab {
  const found = SESSION_TABS.find((tab) => tab.value === value);
  return found ? found.value : DEFAULT_SESSION_TAB;
}

export default function SessionDetailPage() {
    useStore();
  const desktop = useIsDesktop();
  const { classId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  const access = useAccess();
    const klass = getSessionClass(sessionId);
    const session = getSession(sessionId);
  const future = session ? session.date > new Date().toISOString().slice(0, 10) : false;
  const canWrite = access.can("sessions_attendance", "write");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = sessionTabOf(searchParams.get("tab"));
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const saveRef = useRef<(() => void) | null>(null);
  // Đổi tab trong cùng màn không phải rời màn: chỉ hỏi khi đổi đường dẫn.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    setDirty(false);
    setError("");
    setMenuOpen(false);
  }, [sessionId]);
  if (!session)
    return hasSession(sessionId) ? (
      <NoAccess what="buổi học này" />
    ) : (
      <EmptyState title="Không tìm thấy buổi học">
        <LinkButton to={`/lop/${classId}/buoi-hoc`}>Về danh sách buổi</LinkButton>
      </EmptyState>
    );

  function cancel() {
    if (!session) return;
    try {
      cancelSession(session.id);
      setError("");
      navigate(`/lop/${classId}/buoi-hoc`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không hủy được buổi học.",
      );
    }
  }

  function restore() {
    if (!session) return;
    try {
      setSessionStatus(session.id, "planned");
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không khôi phục được buổi học.",
      );
    }
  }

  function openTab(next: SessionTab) {
    if (next === tab) return;
    setSearchParams(new URLSearchParams({ tab: next }));
  }

  const cancelled = session.status === "cancelled";
  const cancelDialog = !cancelled && session.status === "planned" && (
    <ConfirmDialog
      open={confirmCancel}
      title={`Huỷ buổi học ${formatDayMonth(session.date)}?`}
      message="Buổi học sẽ được đánh dấu là đã huỷ. Bạn có thể khôi phục lại sau."
      actions={[
        {
          label: "Huỷ buổi học",
          variant: "danger",
          onClick: cancel,
        },
        {
          label: "Giữ buổi học",
          variant: "neutral",
          onClick: () => setConfirmCancel(false),
        },
      ]}
      onDismiss={() => setConfirmCancel(false)}
    />
  );

  const unsavedDialog = (
    <ConfirmDialog
      open={blocker.state === "blocked"}
      title="Điểm danh chưa lưu"
      message="Bạn đang điểm danh dở buổi học. Lưu trước khi rời màn này?"
      actions={[
        {
          label: "Lưu",
          variant: "primary",
          onClick: () => {
            saveRef.current?.();
            if (blocker.state === "blocked") blocker.proceed();
          },
        },
        {
          label: "Bỏ thay đổi",
          variant: "danger",
          onClick: () => {
            if (blocker.state === "blocked") blocker.proceed();
          },
        },
        {
          label: "Ở lại",
          variant: "neutral",
          onClick: () => {
            if (blocker.state === "blocked") blocker.reset();
          },
        },
      ]}
      onDismiss={() => {
        if (blocker.state === "blocked") blocker.reset();
      }}
    />
  );

  if (desktop && klass)
    return (
      <>
        <SessionDetailDesktop
            classId={classId}
            klass={klass}
            session={session}
          tab={tab}
          onTab={openTab}
          canWrite={canWrite}
          readOnly={future}
          onDirtyChange={setDirty}
          saveRef={saveRef}
          onCancel={() => {
            setError("");
            setConfirmCancel(true);
          }}
          onRestore={restore}
        />
        {cancelDialog}
        {unsavedDialog}
      </>
    );

  return (
    <section className={s.detail}>
      <header className={s.header}>
        <div className={s.headerRow}>
          <Link
            to={`/lop/${classId}/buoi-hoc`}
            className={s.iconButton}
            aria-label="Quay lại"
          >
            <Icon name="back" />
          </Link>
          <div className={s.titleBlock}>
            <p className={s.eyebrow}>{klass?.name ?? "Lớp học"}</p>
            <div className={s.titleLine}>
              <h1 className={s.title}>
                {sessionPrefix(session)} · {formatDayMonth(session.date)}
              </h1>
              {cancelled && <Pill tone="warning">Đã huỷ</Pill>}
            </div>
          </div>
          {!cancelled && session.status === "planned" && canWrite && (
            <button
              type="button"
              className={s.moreButton}
              aria-label="Tuỳ chọn buổi học"
              title="Tuỳ chọn buổi học"
              onClick={() => {
                setMenuOpen(true);
                setError("");
              }}
            >
              <Icon name="more" />
            </button>
          )}
        </div>
        {!cancelled && (
          <div className={s.tabs} role="tablist" aria-label="Nội dung buổi học">
            {SESSION_TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                className={s.tab + (tab === item.value ? " " + s.tabActive : "")}
                onClick={() => openTab(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={s.body}>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
          {cancelled ? (
          <>
            <div className={s.dateCard}>
              <p className={s.dateTitle}>{formatWeekdayDate(session.date)}</p>
              <p className={s.dateMeta}>
                {sessionPrefix(session)} · đã huỷ
              </p>
            </div>
            <div className={s.emptyBlock}>
              <span className={s.emptyIcon} aria-hidden="true">
                <Icon name="calendar" size={32} />
              </span>
              <div className={s.emptyText}>
                <h2 className={s.emptyTitle}>Buổi này đã huỷ</h2>
                <p className={s.emptyTextLine}>
                  Không cần điểm danh. Khôi phục nếu bạn huỷ nhầm.
                </p>
              </div>
              <div className={s.emptyActions}>
                {canWrite && (
                  <Button size="lg" onClick={restore}>
                    Khôi phục buổi học
                  </Button>
                )}
                <LinkButton
                  variant="secondary"
                  size="lg"
                  to={`/lop/${classId}/buoi-hoc`}
                >
                  Về danh sách buổi
                </LinkButton>
              </div>
            </div>
          </>
          ) : (
            <>
              <div hidden={tab !== "diem-danh"}>
              <AttendancePanel
                classId={classId}
                sessionId={session.id}
                readOnly={future}
                onDirtyChange={setDirty}
                saveRef={saveRef}
              />
            </div>
            <div hidden={tab !== "nhan-xet"}>
              <CommentsPanel
                classId={classId}
                sessionId={session.id}
                readOnly={future}
              />
            </div>
            <div hidden={tab !== "btvn"}>
              <HomeworkPanel session={session} />
            </div>
          </>
        )}
      </div>

      {!cancelled && session.status === "planned" && canWrite && (
        <Sheet
          title="Tuỳ chọn buổi học"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        >
          <div className={s.sheetActions}>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setMenuOpen(false);
                setError("");
                setConfirmCancel(true);
              }}
            >
              Huỷ buổi
            </Button>
          </div>
        </Sheet>
      )}
      {cancelDialog}

      {unsavedDialog}
    </section>
  );
}
