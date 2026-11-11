import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import { getSession, getSessionClass, hasSession, sessionPrefix } from "../../data/repositories/sessions";
import { useStore } from "../../data/store";
import { formatDayMonth, formatWeekdayDate } from "../../shared/format";
import { todayISO } from "../../shared/date";
import { useSaveAndLeave } from "../../shared/hooks/useSavedPeek";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import { usePullToRefresh } from "../../shared/hooks/usePullToRefresh";
import { refreshNow } from "../../data/sync";
import { PageShell, ResponsiveSlot } from "../../shared/layout";
import { Button, EmptyState, Icon, LinkButton, NoAccess, Sheet, UnsavedChangesDialog } from "../../shared/ui";
import { PullToRefresh } from "../../shared/ui/PullToRefresh";
import AttendancePanel from "../attendance/AttendancePanel";
import CommentsPanel from "../comments/CommentsPanel";
import CommentsDesktop from "../comments/CommentsDesktop";
import HomeworkPanel from "../homework/HomeworkPanel";
import HomeworkDesktop from "../homework/HomeworkDesktop";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import AddSessionModal from "./AddSessionModal";
import { useCancelSession } from "./useCancelSession";
import s from "./sessionDetail.module.css";

/** Ba tab ngang hàng của buổi học; URL giữ nguyên tab đang mở. */
export type SessionTab = "diem-danh" | "nhan-xet" | "btvn";

export const SESSION_TABS: ReadonlyArray<{ value: SessionTab; label: string }> = [
  { value: "diem-danh", label: "Điểm danh" },
  { value: "btvn", label: "Bài tập về nhà" },
  { value: "nhan-xet", label: "Nhận xét" },
];

export const DEFAULT_SESSION_TAB: SessionTab = "diem-danh";

/** Giá trị `?tab=` hợp lệ; thiếu hoặc lạ thì mặc định Điểm danh. */
export function sessionTabOf(value: string | null | undefined): SessionTab {
  const found = SESSION_TABS.find((tab) => tab.value === value);
  return found ? found.value : DEFAULT_SESSION_TAB;
}

type SessionHeader = { eyebrow: string; title: string; actions?: ReactNode };

export default function SessionDetailPage() {
  const { classId = "" } = useParams();
  const [header, setHeader] = useState<SessionHeader>({ eyebrow: "Lớp học", title: "Chi tiết buổi học" });
  const backTo = `/lop/${classId}/buoi-hoc`;
  const breadcrumb = <><Link to={backTo}>Buổi học</Link><span aria-hidden="true">/</span><span>{header.eyebrow}</span></>;
  return <PageShell className={s.page} breadcrumb={breadcrumb} backTo={backTo} eyebrow={header.eyebrow} title={header.title} actions={header.actions}>
    <Suspense fallback={<div className={s.body}><p role="status">Đang tải buổi học…</p></div>}>
      <SessionDetailBody onHeaderChange={setHeader} />
    </Suspense>
  </PageShell>;
}

function SessionDetailBody({ onHeaderChange }: { onHeaderChange: (header: SessionHeader) => void }) {
  useStore();
  const refresh = usePullToRefresh(refreshNow);
  const { classId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  const access = useAccess();
  const klass = getSessionClass(sessionId);
  const session = getSession(sessionId);
  const future = session ? session.date > todayISO() : false;
  const canWrite = access.can("sessions_attendance", "write");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = sessionTabOf(searchParams.get("tab"));
  const [attendanceDirty, setDirty] = useState(false);
  const [homeworkDirty, setHomeworkDirty] = useState(false);
  const dirty = attendanceDirty || homeworkDirty;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState("");
  const cancelling = useCancelSession(() => navigate(`/lop/${classId}/buoi-hoc`));
  const leave = useSaveAndLeave();
  const saveRef = useRef<(() => unknown) | null>(null);
  const homeworkSaveRef = useRef<(() => unknown) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const guard = useLeaveGuard(dirty);

  useEffect(() => {
    setDirty(false);
    setHomeworkDirty(false);
    setError("");
    setMenuOpen(false);
  }, [sessionId]);

  function openTab(next: SessionTab) {
    if (next !== tab) setSearchParams(new URLSearchParams({ tab: next }));
  }

  const cancelled = session?.status === "cancelled";
  const manualPlanned = session?.origin === "manual" && session.status === "planned";
  const canShowOptions = Boolean(session && !cancelled && session.status === "planned" && canWrite);
  const actions = useMemo(() => canShowOptions ? <button type="button" className={s.moreButton} aria-label="Tuỳ chọn buổi học" title="Tuỳ chọn buổi học" onClick={() => { setMenuOpen(true); setError(""); }}><Icon name="more" /></button> : undefined, [canShowOptions]);
  const backTo = `/lop/${classId}/buoi-hoc`;
  const title = session ? sessionPrefix(session) : "Chi tiết buổi học";
  const eyebrow = klass?.name ?? "Lớp học";
  useEffect(() => { onHeaderChange({ eyebrow, title, actions }); }, [actions, eyebrow, onHeaderChange, title]);
  const tabBar = (tabActions?: ReactNode) => <div className={s.tabRow}>
    <div className={s.tabs} role="tablist" aria-label="Nội dung buổi học">
      {SESSION_TABS.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={`${s.tab} ${tab === item.value ? s.tabActive : ""}`} onClick={() => openTab(item.value)}>{item.label}</button>)}
    </div>
    {tabActions && <div className={s.actionsRow}>{tabActions}</div>}
  </div>;

  const cancelDialog = session && !cancelled && session.status === "planned" ? <ConfirmDialog
    open={confirmCancel}
    title={`Huỷ buổi học ${formatDayMonth(session.date)}?`}
    message="Buổi học sẽ được đánh dấu là đã huỷ. Không thể hoàn tác."
    error={cancelling.error}
    actions={[
      { label: "Huỷ buổi học", variant: "danger", busy: cancelling.busy, onClick: () => void cancelling.run(session.id) },
      { label: "Giữ buổi học", variant: "neutral", onClick: () => !cancelling.busy && setConfirmCancel(false) },
    ]}
    onDismiss={() => !cancelling.busy && setConfirmCancel(false)}
  /> : null;
  const editModal = editOpen && session && klass ? <AddSessionModal classId={classId} classTime={klass.time} session={session} onClose={() => setEditOpen(false)} /> : null;
  const unsavedDialog = guard.blocked ? <UnsavedChangesDialog
    open
    title="Chưa lưu thay đổi"
    message="Bạn đang điểm danh hoặc chấm bài dở. Lưu trước khi rời màn này?"
    saving={leaving}
    done={leave.done}
    onSave={() => leave.run(async () => {
      setLeaving(true);
      try {
        if (homeworkDirty && !homeworkSaveRef.current) { guard.stay(); return false; }
        const results = [await saveRef.current?.(), await homeworkSaveRef.current?.()];
        return results.every((result) => result !== false);
      } finally { setLeaving(false); }
    }, guard.proceed)}
    onDiscard={() => { leave.cancel(); guard.proceed(); }}
    onStay={() => { leave.cancel(); guard.stay(); }}
  /> : null;

  const missingSession = hasSession(sessionId)
    ? <NoAccess what="buổi học này" />
    : <EmptyState title="Không tìm thấy buổi học"><LinkButton to={backTo}>Về danh sách buổi</LinkButton></EmptyState>;
  const cancelledContent = session && cancelled ? <>
    <div className={s.dateCard} data-measure="block"><p className={s.dateTitle}>{formatWeekdayDate(session.date)}</p><p className={s.dateMeta}>{sessionPrefix(session)} · đã huỷ</p></div>
    <EmptyState title="Buổi này đã huỷ" description="Không cần điểm danh." action={<LinkButton variant="secondary" size="lg" to={backTo}>Về danh sách buổi</LinkButton>} />
  </> : null;
  const mobileContent = <div className={s.body}>
    <PullToRefresh controller={refresh} />
    {session ? cancelled ? cancelledContent : <>
      {tabBar()}
      {error && <p role="alert" className={s.error}>{error}</p>}
      <div className={s.tabPane} hidden={tab !== "diem-danh"}><AttendancePanel classId={classId} sessionId={session.id} variant="mobile" readOnly={future} onDirtyChange={setDirty} saveRef={saveRef} /></div>
      <div className={s.tabPane} hidden={tab !== "nhan-xet"}><CommentsPanel classId={classId} sessionId={session.id} readOnly={future} /></div>
      <div className={s.tabPane} hidden={tab !== "btvn"}><HomeworkPanel session={session} onDirtyChange={setHomeworkDirty} /></div>
    </> : missingSession}
  </div>;
  const tabletContent = <div className={s.body}>
    <PullToRefresh controller={refresh} />
    {session ? cancelled ? cancelledContent : tab === "diem-danh" ? <AttendancePanel classId={classId} sessionId={session.id} variant="tablet" tabBar={tabBar} readOnly={future} onDirtyChange={setDirty} saveRef={saveRef} /> : <>
      {tabBar()}
      {error && <p role="alert" className={s.error}>{error}</p>}
      {tab === "nhan-xet" ? <CommentsPanel classId={classId} sessionId={session.id} readOnly={future} /> : <HomeworkPanel session={session} onDirtyChange={setHomeworkDirty} />}
    </> : missingSession}
  </div>;
  const desktopContent = <div className={s.body}>
    <PullToRefresh controller={refresh} />
    {session ? cancelled ? cancelledContent : tab === "diem-danh" ? <AttendancePanel classId={classId} sessionId={session.id} variant="desktop" tabBar={tabBar} readOnly={future} onDirtyChange={setDirty} saveRef={saveRef} /> : tab === "nhan-xet" ? <CommentsDesktop sessionId={session.id} readOnly={future} tabBar={tabBar} /> : <HomeworkDesktop session={session} tabBar={tabBar} onDirtyChange={setHomeworkDirty} saveRef={homeworkSaveRef} /> : missingSession}
  </div>;

  return <>
    <ResponsiveSlot mobile={mobileContent} tablet={tabletContent} desktop={desktopContent} />
    {session && canShowOptions && <Sheet title="Tuỳ chọn buổi học" open={menuOpen} onClose={() => setMenuOpen(false)}>
      <div className={s.sheetActions}>
        {manualPlanned && <Button variant="secondary" onClick={() => { setMenuOpen(false); setEditOpen(true); }}>Sửa buổi lẻ</Button>}
        <Button variant="danger" onClick={() => { setMenuOpen(false); setError(""); cancelling.clearError(); setConfirmCancel(true); }}>Huỷ buổi</Button>
      </div>
    </Sheet>}
    {cancelDialog}{editModal}{unsavedDialog}
  </>;
}
