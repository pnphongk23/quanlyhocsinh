import { features } from "../../shared/features";
import { useSaveAndLeave } from "../../shared/hooks/useSavedPeek";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAccess, canAccessClass } from "../../data/repositories/access";
import {
  getSession,
  getSessionClass,
  hasSession,
  sessionPrefix,
} from "../../data/repositories/sessions";
import { listMembers, listRoles } from "../../data/repositories/staff";
import {
  clearSubstitute,
  listSubstitutes,
  substituteSession,
} from "../../data/repositories/staffing";
import { useStore } from "../../data/store";
import { isFutureSession } from "../../data/logic";
import { sessionStaff } from "../../data/teaching";
import type {
  Member,
  Role,
  SessionSubstitute,
  StaffPosition,
} from "../../data/types";
import { formatDayMonth, formatWeekdayDate } from "../../shared/format";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useLeaveGuard } from "../../shared/hooks/useLeaveGuard";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  LinkButton,
  Modal,
  NoAccess,
  Pill,
  Segmented,
  Sheet,
  UnsavedChangesDialog,
} from "../../shared/ui";
import AttendancePanel from "../attendance/AttendancePanel";
import CommentsPanel from "../comments/CommentsPanel";
import HomeworkPanel from "../homework/HomeworkPanel";
import SessionLecturesPanel from "../lectures/SessionLecturesPanel";
import { ConfirmDialog } from "../classes/ConfirmDialog";
import SessionDetailDesktop from "./SessionDetailDesktop";
import AddSessionModal from "./AddSessionModal";
import { useCancelSession } from "./useCancelSession";
import s from "./sessionDetail.module.css";
import st from "./sessionTeachers.module.css";

/**
 * Ba tab ngang hàng của màn buổi học (spec mục 4, ảnh 60/61): Điểm danh ·
 * Nhận xét · Bài tập về nhà. Tab nằm ở URL (?tab=diem-danh|nhan-xet|btvn) để
 * mở thẳng được và để tab BTVN quay lại đúng em ở tab Nhận xét.
 */
export type SessionTab = "diem-danh" | "nhan-xet" | "btvn";

export const SESSION_TABS: ReadonlyArray<{ value: SessionTab; label: string }> =
  [
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

const POSITION_LABEL: Record<StaffPosition, string> = {
  main: "Giáo viên chính",
  assistant: "Trợ giảng",
};

/** Hai chữ đầu của hai từ cuối, cùng quy ước với avatar ở Cài đặt/Nhân sự. */
function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

/** Mũi tên đổi qua lại cho nút "Đổi". */
function SwapIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}

/** Ổ khoá cho trạng thái buổi đã huỷ không đổi được người dạy. */
function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Chỉ nhân sự (role.kind "staff") đang hoạt động mới được chọn dạy thay. */
function activeStaffMembers(): Member[] {
  const roleById = new Map(listRoles().map((role) => [role.id, role] as const));
  return listMembers()
    .filter(
      (member) =>
        member.status === "active" &&
        roleById.get(member.roleId)?.kind === "staff",
    )
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export default function SessionDetailPage() {
  const state = useStore();
  const desktop = useIsDesktop();
  const { classId = "", sessionId = "" } = useParams();
  const navigate = useNavigate();
  const access = useAccess();
  const klass = getSessionClass(sessionId);
  const session = getSession(sessionId);
  const future = session ? isFutureSession(session.date) : false;
  const canWrite = access.can("sessions_attendance", "write");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = sessionTabOf(searchParams.get("tab"));
  // Điểm danh và chấm/soạn BTVN: cả hai giữ nguyên khi đổi tab nên dirty là hợp của hai phần.
  const [attendanceDirty, setDirty] = useState(false);
  const [homeworkDirty, setHomeworkDirty] = useState(false);
  const dirty = attendanceDirty || homeworkDirty;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState("");
  const cancelling = useCancelSession(() =>
    navigate(`/lop/${classId}/buoi-hoc`),
  );
  const [teacherModal, setTeacherModal] = useState(false);
  const [teacherError, setTeacherError] = useState("");
  const [confirmSub, setConfirmSub] = useState<SessionSubstitute | null>(null);
  const leave = useSaveAndLeave();
  const saveRef = useRef<(() => unknown) | null>(null);
  const homeworkSaveRef = useRef<(() => unknown) | null>(null);
  const [leaving, setLeaving] = useState(false);
  // Đổi tab trong cùng màn không phải rời màn: chỉ hỏi khi đổi đường dẫn.
  const guard = useLeaveGuard(dirty);
  useEffect(() => {
    setDirty(false);
    setHomeworkDirty(false);
    setError("");
    setMenuOpen(false);
    setTeacherModal(false);
    setTeacherError("");
    setConfirmSub(null);
  }, [sessionId]);
  if (!session)
    return hasSession(sessionId) ? (
      <NoAccess what="buổi học này" />
    ) : (
      <EmptyState title="Không tìm thấy buổi học">
        <LinkButton to={`/lop/${classId}/buoi-hoc`}>
          Về danh sách buổi
        </LinkButton>
      </EmptyState>
    );

  function openTab(next: SessionTab) {
    if (next === tab) return;
    setSearchParams(new URLSearchParams({ tab: next }));
  }

  const cancelled = session.status === "cancelled";
  const nameOf = (memberId: string): string =>
    state.members.find((member) => member.id === memberId)?.name ?? "Không rõ";
  // Người dạy hiệu lực của buổi (đã áp dụng dạy thay nếu có).
  const teachers = sessionStaff(state, session.id);
  const substitutes = cancelled ? [] : listSubstitutes(session.id);
  const substituteAt = (
    row: { position: StaffPosition; memberId: string },
  ): SessionSubstitute | undefined =>
    substitutes.find(
      (item) =>
        item.position === row.position &&
        item.substituteMemberId === row.memberId,
    );
  const staffOptions = access.isAdmin && !cancelled ? activeStaffMembers() : [];

  function teacherRow(
    position: StaffPosition,
    row: { position: StaffPosition; memberId: string },
  ) {
    const substitute = substituteAt(row);
    return (
      <div key={`${row.position}-${row.memberId}`} className={st.teacherRow}>
        <span className={st.avatar} aria-hidden="true">
          {initialsOf(nameOf(row.memberId))}
        </span>
        <div className={st.teacherText}>
          <span className={st.teacherPosition}>{POSITION_LABEL[position]}</span>
          <span className={st.teacherName}>{nameOf(row.memberId)}</span>
          {substitute && (
            <span className={st.substituteNote}>
              Thay{" "}
              {substitute.originalMemberId
                ? nameOf(substitute.originalMemberId)
                : "buổi này"}{" "}
              · Lý do: {substitute.reason}
            </span>
          )}
        </div>
        {substitute && <Pill tone="warning">Dạy thay</Pill>}
      </div>
    );
  }

  function teacherRows(position: StaffPosition) {
    const rows = teachers.filter((row) => row.position === position);
    if (rows.length === 0)
      return (
        <div key={position} className={st.teacherRow}>
          <span
            className={`${st.avatar} ${st.avatarEmpty}`.trim()}
            aria-hidden="true"
          >
            –
          </span>
          <div className={st.teacherText}>
            <span className={st.teacherPosition}>
              {POSITION_LABEL[position]}
            </span>
            <span className={st.teacherName}>Không có</span>
          </div>
        </div>
      );
    return rows.map((row) => teacherRow(position, row));
  }

  function cancelSubstitute(substitute: SessionSubstitute) {
    setTeacherError("");
    try {
      clearSubstitute(substitute.id);
      setConfirmSub(null);
    } catch (cause) {
      setConfirmSub(null);
      setTeacherError(
        cause instanceof Error ? cause.message : "Không hủy được dạy thay.",
      );
    }
  }

  const cancelDialog = !cancelled && session.status === "planned" && (
    <ConfirmDialog
      open={confirmCancel}
      title={`Huỷ buổi học ${formatDayMonth(session.date)}?`}
      message="Buổi học sẽ được đánh dấu là đã huỷ. Không thể hoàn tác."
      error={cancelling.error}
      actions={[
        {
          label: "Huỷ buổi học",
          variant: "danger",
          busy: cancelling.busy,
          onClick: () => void cancelling.run(session.id),
        },
        {
          label: "Giữ buổi học",
          variant: "neutral",
          onClick: () => !cancelling.busy && setConfirmCancel(false),
        },
      ]}
      onDismiss={() => !cancelling.busy && setConfirmCancel(false)}
    />
  );
  const manualPlanned = session.origin === "manual" && session.status === "planned";
  const editModal = editOpen && klass && (
    <AddSessionModal
      classId={classId}
      classTime={klass.time}
      session={session}
      onClose={() => setEditOpen(false)}
    />
  );

  const unsavedDialog = guard.blocked && (
    <UnsavedChangesDialog
      open
      title="Chưa lưu thay đổi"
      message="Bạn đang điểm danh hoặc chấm bài dở. Lưu trước khi rời màn này?"
      saving={leaving}
      done={leave.done}
      onSave={() =>
        leave.run(async () => {
          setLeaving(true);
          try {
            // Bản mobile của BTVN chưa có hàm lưu để gọi từ đây: ở lại để người dùng bấm Lưu.
            if (homeworkDirty && !homeworkSaveRef.current) {
              guard.stay();
              return false;
            }
            const results = [
              await saveRef.current?.(),
              await homeworkSaveRef.current?.(),
            ];
            return results.every((result) => result !== false);
          } finally {
            setLeaving(false);
          }
        }, guard.proceed)
      }
      onDiscard={() => {
        leave.cancel();
        guard.proceed();
      }}
      onStay={() => {
        leave.cancel();
        guard.stay();
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
          onHomeworkDirtyChange={setHomeworkDirty}
          homeworkSaveRef={homeworkSaveRef}
          onCancel={() => {
            setError("");
            cancelling.clearError();
            setConfirmCancel(true);
          }}
          onEdit={manualPlanned ? () => setEditOpen(true) : undefined}
        />
        {cancelDialog}
        {editModal}
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
                className={
                  s.tab + (tab === item.value ? " " + s.tabActive : "")
                }
                onClick={() => openTab(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={s.body}>
        {/* Ảnh 40–47: tab Nhận xét và BTVN không có thẻ "Người dạy"; chỉ tab Điểm danh giữ. */}
        {(cancelled || tab === "diem-danh") && (
          <Card className={st.teachers}>
          <div className={st.teachersHead}>
            <h2 className={st.teachersTitle}>Người dạy</h2>
            {access.isAdmin && !cancelled && (
              <Button
                variant="secondary"
                onClick={() => setTeacherModal(true)}
              >
                <SwapIcon />
                Đổi
              </Button>
            )}
            {access.isAdmin && cancelled && (
              <Button variant="secondary" disabled>
                <LockIcon />
                Đổi người dạy
              </Button>
            )}
          </div>
          {teacherRows("main")}
          {teacherRows("assistant")}
          {cancelled && (
            <p className={st.lockedNote}>
              <LockIcon />
              Buổi đã huỷ nên không đổi được người dạy.
            </p>
          )}
          {!cancelled &&
            access.isAdmin &&
            substitutes.map((substitute) => (
              <Button
                key={substitute.id}
                variant="danger"
                className={st.cancelSubstitute}
                onClick={() => setConfirmSub(substitute)}
                aria-label={`Hủy dạy thay của ${nameOf(
                  substitute.substituteMemberId,
                )}`}
              >
                Huỷ dạy thay
              </Button>
            ))}
          {teacherError && (
            <p role="alert" className={st.teachersError}>
              {teacherError}
            </p>
          )}
          </Card>
        )}

        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        {cancelled ? (
          <>
            <div className={s.dateCard}>
              <p className={s.dateTitle}>{formatWeekdayDate(session.date)}</p>
              <p className={s.dateMeta}>{sessionPrefix(session)} · đã huỷ</p>
            </div>
            <EmptyState
              title="Buổi này đã huỷ"
              description="Không cần điểm danh."
              action={
                <LinkButton
                  variant="secondary"
                  size="lg"
                  to={`/lop/${classId}/buoi-hoc`}
                >
                  Về danh sách buổi
                </LinkButton>
              }
            />
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
              <HomeworkPanel
                session={session}
                onDirtyChange={setHomeworkDirty}
              />
            </div>
            {features.lectures &&
              tab === "diem-danh" &&
              access.can("lectures", "read") &&
              canAccessClass(classId) && (
                <SessionLecturesPanel sessionId={session.id} />
              )}
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
            {manualPlanned && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
              >
                Sửa buổi lẻ
              </Button>
            )}
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setMenuOpen(false);
                setError("");
                cancelling.clearError();
                setConfirmCancel(true);
              }}
            >
              Huỷ buổi
            </Button>
          </div>
        </Sheet>
      )}
      {cancelDialog}
      {editModal}

      {access.isAdmin && !cancelled && teacherModal && (
        <TeacherModal
          sessionId={session.id}
          teachers={teachers}
          substitutes={substitutes}
          members={state.members}
          roles={state.roles}
          staffOptions={staffOptions}
          onClose={() => setTeacherModal(false)}
        />
      )}

      <ConfirmDialog
        open={confirmSub !== null}
        title={`Huỷ dạy thay buổi ${formatDayMonth(session.date)}?`}
        message={
          confirmSub
            ? `${
                confirmSub.originalMemberId
                  ? nameOf(confirmSub.originalMemberId)
                  : "Người được phân công"
              } dạy lại buổi này và được tính buổi. ${nameOf(
                confirmSub.substituteMemberId,
              )} không còn được tính buổi.`
            : ""
        }
        actions={[
          {
            label: "Huỷ dạy thay",
            variant: "danger",
            onClick: () => {
              if (confirmSub) cancelSubstitute(confirmSub);
            },
          },
          {
            label: "Giữ nguyên",
            variant: "neutral",
            onClick: () => setConfirmSub(null),
          },
        ]}
        onDismiss={() => setConfirmSub(null)}
      />

      {unsavedDialog}
    </section>
  );
}

function TeacherModal({
  sessionId,
  teachers,
  substitutes,
  members,
  roles,
  staffOptions,
  onClose,
}: {
  sessionId: string;
  teachers: Array<{ position: StaffPosition; memberId: string }>;
  substitutes: SessionSubstitute[];
  members: Member[];
  roles: Role[];
  staffOptions: Member[];
  onClose: () => void;
}) {
  const [position, setPosition] = useState<StaffPosition>("main");
  const desktop = useIsDesktop();
  const [originalId, setOriginalId] = useState(() => holdersFor("main")[0] ?? "");
  const [substituteId, setSubstituteId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const nameOf = (memberId: string): string =>
    members.find((member) => member.id === memberId)?.name ?? "Không rõ";
  const roleNameOf = (memberId: string): string => {
    const member = members.find((item) => item.id === memberId);
    if (!member) return "Nhân sự";
    return roles.find((role) => role.id === member.roleId)?.name ?? "Nhân sự";
  };

  /**
   * Người gốc đang giữ một vị trí. Vị trí đang do người dạy thay đảm nhận thì
   * lấy lại người bị thay; buổi lẻ/học bù (dạy thay không có người gốc) thì
   * không có ai để chọn.
   */
  function holdersFor(place: StaffPosition): string[] {
    const holders: string[] = [];
    for (const row of teachers.filter((item) => item.position === place)) {
      const substitute = substitutes.find(
        (item) =>
          item.position === row.position &&
          item.substituteMemberId === row.memberId,
      );
      if (substitute) {
        if (substitute.originalMemberId && !holders.includes(substitute.originalMemberId))
          holders.push(substitute.originalMemberId);
      } else if (!holders.includes(row.memberId)) {
        holders.push(row.memberId);
      }
    }
    return holders;
  }

  const holders = holdersFor(position);

  function changePosition(next: StaffPosition) {
    setPosition(next);
    setOriginalId(holdersFor(next)[0] ?? "");
    setSubstituteId("");
    setError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!substituteId) {
      setError("Chọn người thay.");
      return;
    }
    if (!reason.trim()) {
      setError("Nhập lý do.");
      return;
    }
    try {
      substituteSession({
        sessionId,
        position,
        originalMemberId: originalId || null,
        substituteMemberId: substituteId,
        reason: reason.trim(),
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không lưu được người dạy thay.",
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      sheet={!desktop}
      title="Đổi người dạy buổi này"
      footer={
        <Button type="submit" size="lg" form="teacher-assign-form">
          Lưu dạy thay
        </Button>
      }
    >
      <form className={st.form} id="teacher-assign-form" onSubmit={save}>
        <div className={st.field}>
          <span className={st.label}>Vị trí</span>
          <Segmented
            label="Vị trí dạy"
            options={[
              { value: "main", label: "Giáo viên chính" },
              { value: "assistant", label: "Trợ giảng" },
            ]}
            value={position}
            onChange={(value) => changePosition(value as StaffPosition)}
          />
        </div>

        {holders.length === 0 ? (
          <p className={st.holderLine}>
            Vị trí này chưa có người dạy. Chọn người thay cho buổi lẻ/học bù.
          </p>
        ) : holders.length === 1 ? (
          <p className={st.holderLine}>
            Người được thay: <strong>{nameOf(holders[0])}</strong>
          </p>
        ) : (
          <label className={st.field} htmlFor="teacher-original">
            <span className={st.label}>Người được thay</span>
            <select
              id="teacher-original"
              className={st.select}
              value={originalId}
              onChange={(event) => {
                setOriginalId(event.target.value);
                if (event.target.value === substituteId) setSubstituteId("");
                setError("");
              }}
            >
              {holders.map((memberId) => (
                <option key={memberId} value={memberId}>
                  {nameOf(memberId)}
                </option>
              ))}
              <option value="">Không có (buổi lẻ/học bù)</option>
            </select>
          </label>
        )}

        <fieldset className={st.group}>
          <legend className={st.label}>Người thay · chọn một</legend>
          {staffOptions.map((member) => {
            const isOriginal = member.id === originalId;
            const selected = substituteId === member.id;
            return (
              <label
                key={member.id}
                className={[
                  st.option,
                  selected ? st.optionOn : "",
                  isOriginal ? st.optionDisabled : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="teacher-substitute"
                  className={st.optionInput}
                  value={member.id}
                  checked={selected}
                  disabled={isOriginal}
                  onChange={() => {
                    setSubstituteId(member.id);
                    setError("");
                  }}
                />
                <span className={st.optionText}>
                  <span className={st.optionName}>{member.name}</span>
                  <span className={st.optionRole}>
                    {isOriginal ? "Đang dạy buổi này" : roleNameOf(member.id)}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <label className={st.field} htmlFor="teacher-reason">
          <span className={st.label}>Lý do</span>
          <input
            id="teacher-reason"
            className={st.input}
            type="text"
            maxLength={200}
            value={reason}
            placeholder="Ví dụ: Cô Lan ốm"
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
          />
          <span className={st.hint}>Bắt buộc</span>
        </label>

        {error && (
          <p role="alert" className={st.error}>
            {error}
          </p>
        )}
        <p className={st.note}>
          Người được thay không tính buổi này. Người thay tính buổi theo vị trí
          và xem được buổi dù không được gán lớp.
        </p>
      </form>
    </Modal>
  );
}
