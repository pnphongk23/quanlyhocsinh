import type { MutableRefObject, ReactNode } from "react";
import type { Class, Session } from "../../data/types";
import { Button } from "../../shared/ui";
import ClassDesktopHeader from "./ClassDesktopHeader";
import AttendanceDesktop from "../attendance/AttendanceDesktop";
import CommentsDesktop from "../comments/CommentsDesktop";
import HomeworkDesktop from "../homework/HomeworkDesktop";
import { SESSION_TABS, type SessionTab } from "./SessionDetailPage";
import s from "./desktop.module.css";

/**
 * Màn chi tiết buổi học trên web desktop (ảnh 03…07): khung lớp + 3 tab ngang
 * hàng Điểm danh / Nhận xét / Bài tập về nhà, nút chính nằm cùng hàng tab.
 */
export default function SessionDetailDesktop({
  classId,
    klass,
    session,
  tab,
  onTab,
  canWrite,
  readOnly,
  onDirtyChange,
  saveRef,
  onCancel,
  onRestore,
}: {
  classId: string;
    klass: Class;
    session: Session;
  tab: SessionTab;
  onTab: (tab: SessionTab) => void;
  canWrite: boolean;
  readOnly: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  saveRef?: MutableRefObject<(() => void) | null>;
  onCancel: () => void;
  onRestore: () => void;
}) {
  const cancelled = session.status === "cancelled";

  const tabBar = (actions?: ReactNode) => (
    <div className={s.sessionTabRow}>
      <div className={s.segmented} role="tablist" aria-label="Nội dung buổi học">
        {SESSION_TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={
              s.segment + (tab === item.value ? " " + s.segmentActive : "")
            }
            onClick={() => onTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {actions && <div className={s.actionsRow}>{actions}</div>}
    </div>
  );

  return (
    <main className={s.page}>
      <ClassDesktopHeader
        classId={classId}
        klass={klass}
        session={session}
        extraMenuItems={
          canWrite && !cancelled && session.status === "planned"
            ? [
                {
                  label: "Hủy buổi",
                  icon: "archive",
                  danger: true,
                  onSelect: onCancel,
                },
              ]
            : undefined
        }
      />

      {cancelled ? (
        <div className={s.card + " " + s.emptyCard}>
          <p className={s.emptyTitle}>Buổi này đã huỷ</p>
          <p className={s.emptyText}>
            Không cần điểm danh, nhận xét hay giao bài. Khôi phục nếu bạn huỷ
            nhầm.
          </p>
          {canWrite && (
            <Button size="md" onClick={onRestore}>
              Khôi phục buổi học
            </Button>
          )}
        </div>
        ) : tab === "diem-danh" ? (
          <AttendanceDesktop
            classId={classId}
            sessionId={session.id}
            readOnly={readOnly}
            onDirtyChange={onDirtyChange}
            saveRef={saveRef}
            tabBar={tabBar}
          />
      ) : tab === "nhan-xet" ? (
        <CommentsDesktop
          sessionId={session.id}
          readOnly={readOnly}
          tabBar={tabBar}
        />
      ) : (
        <HomeworkDesktop session={session} tabBar={tabBar} />
      )}
    </main>
  );
}
