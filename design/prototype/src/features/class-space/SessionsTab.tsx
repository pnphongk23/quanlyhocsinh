import { features } from "../../shared/features";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import { listSessions, sessionPrefix } from "../../data/repositories/sessions";
import { listSessionLectures } from "../../data/repositories/lectures";
import { splitSessions } from "../../data/sessionGroups";
import { useAccess } from "../../data/repositories/access";
import { useStore, hasStorageError } from "../../data/store";
import type { Session } from "../../data/types";
import { formatDayMonth, formatWeekdayDate, todayISO } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import SessionsDesktop from "./SessionsDesktop";
import {
  Button,
  EmptyState,
  Fab,
  Icon,
  NoAccess,
  Pill,
} from "../../shared/ui";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import AddSessionModal from "./AddSessionModal";
import { useCancelSession } from "./useCancelSession";
import s from "./sessions.module.css";

export default function SessionsTab() {
  useStore();
  const { classId = "" } = useParams();
  const access = useAccess();
  const desktop = useIsDesktop();
  const klass = getClass(classId);
  const sessions = listSessions(classId);
  const today = todayISO();
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [modalSession, setModalSession] = useState<Session | null | undefined>();
  const [confirmSession, setConfirmSession] = useState<Session | null>(null);
  const groups = splitSessions(sessions, today);
  const spotlight = groups.current[0] ?? null;
  const upcoming = [...groups.current.slice(1), ...groups.upcoming].sort((a, b) =>
    `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`),
  );
  const lectureCount =
    features.lectures && spotlight
    ? listSessionLectures(spotlight.id).length
    : 0;

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const cancelling = useCancelSession(() => setConfirmSession(null));

  const renderSessionRow = (session: Session) => {
    const missed = session.status === "planned" && session.date <= today;
    const manualPlanned = session.origin === "manual" && session.status === "planned";
    return (
      <div className={s.sessionItem} key={session.id}>
        <Link className={s.sessionRow} to={`/lop/${classId}/buoi-hoc/${session.id}`}>
          <span className={s.sessionInfo}>
            <span className={s.sessionTitle}>
              {sessionPrefix(session)} · {formatWeekdayDate(session.date)}
            </span>
            <span className={s.sessionMeta}>
              {session.time ?? klass?.time}
              {missed && " · Chưa điểm danh"}
              {session.origin === "manual" && session.note
                ? ` · ${session.note}`
                : ""}
            </span>
          </span>
          {session.status === "cancelled" ? (
            <Pill tone="warning">Đã huỷ</Pill>
          ) : (
            <span className={s.chevron} aria-hidden="true">
              <Icon name="chevron-right" size={22} />
            </span>
          )}
        </Link>
        {manualPlanned && canWrite && (
          <div className={s.rowActions}>
            <Button variant="secondary" size="sm" onClick={() => setModalSession(session)}>
              Sửa buổi lẻ
            </Button>
            <Button variant="danger" size="sm" onClick={() => {
              cancelling.clearError();
              setConfirmSession(session);
            }}>
              Hủy buổi
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (!access.can("sessions_attendance", "read"))
    return <NoAccess what="buổi học" />;
  const canWrite = access.can("sessions_attendance", "write");

  if (desktop) return <SessionsDesktop classId={classId} />;

  if (!klass) return <p className={s.inlineHint}>Không tìm thấy lớp.</p>;

  if (hasStorageError()) {
    return (
      <section className={s.statePanel} aria-labelledby="sessions-error-title">
        <h2 id="sessions-error-title">Không đọc được dữ liệu buổi học</h2>
        <p>Hãy tải lại trang để thử mở dữ liệu đã lưu trên thiết bị.</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
      </section>
    );
  }

  return (
    <section className={s.tab} aria-label="Buổi học">
      {!online && <p className={s.offline}>Ngoại tuyến · dữ liệu trên thiết bị</p>}
      {!sessions.length ? (
        <EmptyState
          title="Lớp chưa có buổi học"
          description="Buổi học tự sinh theo lịch lặp của lớp. Bạn có thể thêm buổi lẻ ngoài lịch nếu cần."
          action={
            canWrite && (
              <Button size="lg" onClick={() => setModalSession(null)}>
                Thêm buổi lẻ
              </Button>
            )
          }
        />
      ) : (
        <>
          {spotlight && (
            <section className={s.section} aria-labelledby="current-session-heading">
              <h2 id="current-session-heading" className={s.groupLabel}>
                Buổi hiện tại
              </h2>
              <article className={s.currentCard}>
                <div className={s.currentInfo}>
                  <p className={s.currentTitle}>
                    {sessionPrefix(spotlight)} ·{" "}
                    {formatWeekdayDate(spotlight.date)}
                  </p>
                  <p className={s.currentMeta}>
                    {spotlight.time ?? klass.time}
                    {lectureCount > 0 && ` · Bài giảng: ${lectureCount}`}
                  </p>
                </div>
                <Link
                  className={s.primaryAction}
                  to={`/lop/${classId}/buoi-hoc/${spotlight.id}`}
                >
                  Xem buổi
                </Link>
                {spotlight.date > today && spotlight.status === "planned" && (
                  <p className={s.lockedHint}>Điểm danh mở vào ngày học.</p>
                )}
              </article>
            </section>
          )}

          {upcoming.length > 0 && (
            <details className={s.upcoming}>
              <summary>
                <span>Sắp tới ({upcoming.length} buổi)</span>
                <Icon name="chevron-down" size={18} />
              </summary>
              <div className={s.sessionList}>{upcoming.map(renderSessionRow)}</div>
            </details>
          )}

          <section className={s.section} aria-labelledby="past-sessions-heading">
            <h2 id="past-sessions-heading" className={s.groupLabel}>
              Các buổi đã qua
            </h2>
            {groups.past.length ? (
              <div className={s.sessionList}>
                {groups.past.map(renderSessionRow)}
              </div>
            ) : (
              <EmptyState
                size="compact"
                title="Chưa có buổi học nào đã qua"
                description="Các buổi đã diễn ra sẽ hiện ở đây."
              />
            )}
          </section>
        </>
      )}

      {features.lectures && (
        <Link className={s.libraryLink} to="/bai-giang">
          <span className={s.libraryLabel}>Thư viện bài giảng</span>
          <Icon name="chevron-right" size={20} />
        </Link>
      )}

      {modalSession !== undefined && (
        <AddSessionModal
          classId={classId}
          classTime={klass.time}
          session={modalSession ?? undefined}
          onClose={() => setModalSession(undefined)}
        />
      )}
      {canWrite && (
        <Fab label="Thêm buổi" onClick={() => setModalSession(null)} />
      )}
      <ConfirmDialog
        open={confirmSession !== null}
        title={`Huỷ buổi học ${
          confirmSession ? formatDayMonth(confirmSession.date) : ""
        }?`}
        message="Buổi học sẽ được đánh dấu là đã huỷ. Không thể hoàn tác."
        error={cancelling.error}
        actions={[
          {
            label: "Huỷ buổi học",
            variant: "danger",
            busy: cancelling.busy,
            onClick: () => confirmSession && void cancelling.run(confirmSession.id),
          },
          {
            label: "Giữ buổi học",
            variant: "neutral",
            onClick: () => !cancelling.busy && setConfirmSession(null),
          },
        ]}
        onDismiss={() => !cancelling.busy && setConfirmSession(null)}
      />
    </section>
  );
}
