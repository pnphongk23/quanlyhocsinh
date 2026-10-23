import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getClass } from "../../data/repositories/classes";
import {
  cancelSession,
  listSessions,
  sessionPrefix,
} from "../../data/repositories/sessions";
import { splitSessions } from "../../data/sessionGroups";
import { useAccess } from "../../data/repositories/access";
import { useStore, hasStorageError } from "../../data/store";
import type { Session } from "../../data/types";
import { formatDayMonth, formatWeekdayDate, todayISO } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import SessionsDesktop from "./SessionsDesktop";
import {
  Button,
  Fab,
  Icon,
  NoAccess,
  Pill,
} from "../../shared/ui";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import AddSessionModal from "./AddSessionModal";
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
  const [error, setError] = useState("");
  const groups = splitSessions(sessions, today);
  const spotlight = groups.current[0] ?? null;
  const upcoming = [...groups.current.slice(1), ...groups.upcoming].sort((a, b) =>
    `${a.date} ${a.time ?? "00:00"}`.localeCompare(`${b.date} ${b.time ?? "00:00"}`),
  );

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function cancel(session: Session) {
    try {
      await cancelSession(session.id);
      setError("");
      setConfirmSession(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không hủy được buổi học. Vui lòng thử lại.",
      );
      setConfirmSession(null);
    }
  }

  const cancelling = useSaveAction<string | null>({
    baseline: null,
    value: confirmSession?.id ?? null,
    validate: (value) => value !== null,
    save: () => confirmSession && cancel(confirmSession),
  });

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
            <Button variant="danger" size="sm" onClick={() => setConfirmSession(session)}>
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
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      {!sessions.length ? (
        <div className={s.emptyBlock}>
          <span className={s.emptyIcon} aria-hidden="true">
            <Icon name="calendar" size={32} />
          </span>
          <div className={s.emptyText}>
            <h2 className={s.emptyTitle}>Lớp chưa có buổi học</h2>
            <p className={s.emptyHint}>
              Buổi học tự sinh theo lịch lặp của lớp. Bạn có thể thêm buổi lẻ
              ngoài lịch nếu cần.
            </p>
          </div>
          {canWrite && (
            <Button
              size="lg"
              onClick={() => {
                setError("");
                setModalSession(null);
              }}
            >
              Thêm buổi lẻ
            </Button>
          )}
        </div>
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
                  </p>
                </div>
                <Link
                  className={s.primaryAction}
                  to={`/lop/${classId}/buoi-hoc/${spotlight.id}`}
                >
                  {spotlight.date === today && spotlight.status === "planned"
                    ? "Điểm danh"
                    : "Xem buổi"}
                </Link>
                {spotlight.date > today && spotlight.status === "planned" && (
                  <p className={s.lockedHint}>Điểm danh mở vào ngày học.</p>
                )}
                {spotlight.status === "planned" && canWrite && (
                  <div className={s.rowActions}>
                    {spotlight.origin === "manual" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setModalSession(spotlight)}
                      >
                        Sửa buổi lẻ
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmSession(spotlight)}
                    >
                      Hủy buổi
                    </Button>
                  </div>
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
              <p className={s.inlineHint}>Chưa có buổi học nào đã qua.</p>
            )}
          </section>
        </>
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
        <Fab
          label="Thêm buổi"
          onClick={() => {
            setError("");
            setModalSession(null);
          }}
        />
      )}
      <ConfirmDialog
        open={confirmSession !== null}
        title={`Huỷ buổi học ${
          confirmSession ? formatDayMonth(confirmSession.date) : ""
        }?`}
        message="Buổi học sẽ được đánh dấu là đã huỷ. Không thể hoàn tác."
        actions={[
          {
            label: "Huỷ buổi học",
            variant: "danger",
            busy: !cancelling.canSave,
            onClick: () => void cancelling.submit(),
          },
          {
            label: "Giữ buổi học",
            variant: "neutral",
            onClick: () => setConfirmSession(null),
          },
        ]}
        onDismiss={() => setConfirmSession(null)}
      />
    </section>
  );
}
