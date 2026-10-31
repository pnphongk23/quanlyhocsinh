import type { MutableRefObject, ReactNode } from "react";
import type { Class, Session } from "../../data/types";
import { EmptyState } from "../../shared/ui";
import ClassDesktopHeader from "./ClassDesktopHeader";
import AttendanceDesktop from "../attendance/AttendanceDesktop";
import CommentsDesktop from "../comments/CommentsDesktop";
import HomeworkDesktop from "../homework/HomeworkDesktop";
import { RefreshButton } from "../../shared/ui/PullToRefresh";
import type { PullToRefreshController } from "../../shared/hooks/usePullToRefresh";
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
  onHomeworkDirtyChange,
  homeworkSaveRef,
  onCancel,
  onEdit,
  refreshController,
}: {
  classId: string;
  klass: Class;
  session: Session;
  tab: SessionTab;
  onTab: (tab: SessionTab) => void;
  canWrite: boolean;
  readOnly: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  saveRef?: MutableRefObject<(() => unknown) | null>;
  onHomeworkDirtyChange?: (dirty: boolean) => void;
  homeworkSaveRef?: MutableRefObject<(() => unknown) | null>;
  onCancel: () => void;
  refreshController?: PullToRefreshController;
  /** Chỉ có với buổi lẻ đang chờ học. */
  onEdit?: () => void;
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
        actions={refreshController ? <RefreshButton controller={refreshController} /> : undefined}
        extraMenuItems={
          canWrite && !cancelled && session.status === "planned"
            ? [
                ...(onEdit
                  ? [{ label: "Sửa buổi lẻ", icon: "edit" as const, onSelect: onEdit }]
                  : []),
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
        <div className={s.card}>
          <EmptyState
            title="Buổi này đã huỷ"
            description="Không cần điểm danh, nhận xét hay giao bài."
          />
        </div>
      ) : (
        // Ba tab cùng gắn sẵn (chỉ ẩn tab khác) để đổi tab không mất điểm danh
        // hay phần BTVN đang soạn dở, giống bản mobile.
        <>
          <div hidden={tab !== "diem-danh"}>
            <AttendanceDesktop
              classId={classId}
              sessionId={session.id}
              readOnly={readOnly}
              onDirtyChange={onDirtyChange}
              saveRef={saveRef}
              tabBar={tabBar}
            />
          </div>
          <div hidden={tab !== "nhan-xet"}>
            <CommentsDesktop
              sessionId={session.id}
              readOnly={readOnly}
              tabBar={tabBar}
            />
          </div>
          <div hidden={tab !== "btvn"}>
            <HomeworkDesktop
              session={session}
              tabBar={tabBar}
              onDirtyChange={onHomeworkDirtyChange}
              saveRef={homeworkSaveRef}
            />
          </div>
        </>
      )}
    </main>
  );
}
