import { useState } from "react";
import { useAccess } from "../../data/repositories/access";
import { listClasses } from "../../data/repositories/classes";
import { setClassStaff } from "../../data/repositories/staffing";
import { useStore } from "../../data/store";
import type { Member, Role } from "../../data/types";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Button,
  EmptyState,
  LinkButton,
  Modal,
  NoAccess,
  PageHeader,
  Pill,
} from "../../shared/ui";
import {
  activeStaff,
  classAssignments,
  roleNameOf,
  type AssignmentSelection,
  type ClassAssignment,
} from "./assignmentsModel";
import s from "./assignments.module.css";

const WORKSPACE_NAME = "Lớp của cô Lan";

/** Bút chì cho nút "Sửa" (Icon dùng chung chưa có hình này). */
function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

export default function AssignmentsPage() {
  const state = useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const [editingId, setEditingId] = useState<string | null>(null);

  const classes = listClasses().filter((item) => item.status === "active");
  const staff = activeStaff(state.members, state.roles);
  const views = classAssignments({
    classes,
    classStaff: state.classStaff,
    students: state.students,
    members: state.members,
  });
  const editing = views.find((view) => view.klass.id === editingId) ?? null;

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Phân công giảng dạy" />
        <NoAccess what="phân công giảng dạy" />
      </section>
    );
  }

  const subtitle = `${views.length} lớp · Chỉ Admin chỉnh sửa`;

  return (
    <main className={s.page}>
      <PageHeader
        compact={!desktop}
        backTo={desktop ? undefined : "/cai-dat"}
        eyebrow={desktop ? `Workspace ${WORKSPACE_NAME} · ${views.length} lớp` : undefined}
        title="Phân công giảng dạy"
        overlay={desktop ? undefined : <p className={s.subtitle}>{subtitle}</p>}
      />

      {views.length === 0 ? (
        <EmptyState title="Chưa có lớp" mascot="cho">
          <p>Tạo lớp trước khi phân công giảng dạy.</p>
          <LinkButton to="/lop/moi">Tạo lớp</LinkButton>
        </EmptyState>
      ) : desktop ? (
        <DesktopTable views={views} onEdit={setEditingId} />
      ) : (
        <div className={s.grid}>
          {views.map((view) => (
            <ClassCard
              key={view.klass.id}
              view={view}
              onEdit={() => setEditingId(view.klass.id)}
            />
          ))}
        </div>
      )}

      <AssignmentModal
        key={editing?.klass.id ?? "none"}
        view={editing}
        staff={staff}
        roles={state.roles}
        onClose={() => setEditingId(null)}
      />
    </main>
  );
}

function ClassCard({
  view,
  onEdit,
}: {
  view: ClassAssignment;
  onEdit: () => void;
}) {
  const { klass, schedule, studentCount, mainName, assistantNames } = view;
  return (
    <article className={s.card}>
      <div className={s.cardTop}>
        <div className={s.cardInfo}>
          <h2 className={s.className}>{klass.name}</h2>
          <p className={s.classMeta}>
            {schedule} · {studentCount} học sinh
          </p>
        </div>
        <button
          type="button"
          className={view.needsMain ? s.chooseButton : s.editButton}
          onClick={onEdit}
          aria-label={
            view.needsMain
              ? `Chọn giáo viên chính cho ${klass.name}`
              : `Sửa phân công lớp ${klass.name}`
          }
        >
          {view.needsMain ? "Chọn" : <PencilIcon />}
        </button>
      </div>
      <div className={s.divider} />
      <dl className={s.rows}>
        <div className={s.row}>
          <dt className={s.rowLabel}>GV chính</dt>
          <dd className={s.rowValue}>
            {mainName ?? <Pill tone="warning">Chưa có GV chính</Pill>}
          </dd>
        </div>
        <div className={s.row}>
          <dt className={s.rowLabel}>Trợ giảng</dt>
          <dd className={s.rowValue}>
            {assistantNames.length ? (
              assistantNames.join(", ")
            ) : (
              <span className={s.rowEmpty}>Chưa có</span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function DesktopTable({
  views,
  onEdit,
}: {
  views: ClassAssignment[];
  onEdit: (classId: string) => void;
}) {
  return (
    <div className={s.table}>
      <div className={`${s.tableRow} ${s.tableHead}`} role="row">
        <span role="columnheader">Lớp</span>
        <span role="columnheader">Lịch học</span>
        <span role="columnheader">GV chính</span>
        <span role="columnheader">Trợ giảng</span>
        <span role="columnheader" aria-label="Thao tác" />
      </div>
      {views.map((view) => (
        <div className={s.tableRow} role="row" key={view.klass.id}>
          <span className={s.tableClass}>{view.klass.name}</span>
          <span className={s.tableText}>
            {view.schedule}
            <span className={s.tableHint}>{view.studentCount} học sinh</span>
          </span>
          <span className={s.tableText}>
            {view.mainName ?? <Pill tone="warning">Chưa có GV chính</Pill>}
          </span>
          <span className={s.tableText}>
            {view.assistantNames.length ? (
              view.assistantNames.join(", ")
            ) : (
              <span className={s.rowEmpty}>Chưa có</span>
            )}
          </span>
          <span className={s.tableAction}>
            <Button
              variant={view.needsMain ? "primary" : "secondary"}
              onClick={() => onEdit(view.klass.id)}
              aria-label={
                view.needsMain
                  ? `Chọn giáo viên chính cho ${view.klass.name}`
                  : `Sửa phân công lớp ${view.klass.name}`
              }
            >
              {view.needsMain ? (
                "Chọn GV chính"
              ) : (
                <>
                  <PencilIcon />
                  Sửa
                </>
              )}
            </Button>
          </span>
        </div>
      ))}
    </div>
  );
}

function AssignmentModal({
  view,
  staff,
  roles,
  onClose,
}: {
  view: ClassAssignment | null;
  staff: Member[];
  roles: Role[];
  onClose: () => void;
}) {
  useStore();
  const desktop = useIsDesktop();
  const [mainId, setMainId] = useState<string>(() => view?.mainId ?? "");
  const [assistantIds, setAssistantIds] = useState<string[]>(() => [
    ...(view?.assistantIds ?? []),
  ]);
  const [error, setError] = useState("");

  const selection: AssignmentSelection = {
    mainId: mainId || null,
    assistantIds,
  };
  const inactiveMain =
    view?.mainId != null && !staff.some((member) => member.id === view.mainId);

  function toggleAssistant(memberId: string) {
    setError("");
    setAssistantIds((ids) =>
      ids.includes(memberId)
        ? ids.filter((id) => id !== memberId)
        : [...ids, memberId],
    );
  }

  function save() {
    if (!view) return;
    if (!selection.mainId) {
      setError("Chọn giáo viên chính để lưu");
      return;
    }
    setError("");
    try {
      // Một commit duy nhất: lỗi lưu thì cả phân công lẫn phạm vi lớp giữ nguyên.
      setClassStaff(view.klass.id, [
        { memberId: selection.mainId, position: "main" },
        ...selection.assistantIds.map((memberId) => ({
          memberId,
          position: "assistant" as const,
        })),
      ]);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không lưu được phân công.",
      );
    }
  }

  return (
    <Modal
      open={view !== null}
      onClose={onClose}
      sheet={!desktop}
      title={view ? `Phân công · ${view.klass.name}` : "Phân công lớp"}
      footer={
        view && staff.length > 0 ? (
          <Button
            type="submit"
            form="assignment-form"
            size="lg"
            disabled={!selection.mainId}
          >
            Lưu phân công
          </Button>
        ) : undefined
      }
    >
      {view && staff.length === 0 ? (
        <div className={s.staffEmpty}>
          <h3 className={s.staffEmptyTitle}>Chưa có nhân sự đang hoạt động</h3>
          <p className={s.staffEmptyText}>
            Thêm nhân sự trước, sau đó quay lại để phân công.
          </p>
          <LinkButton to="/nhan-su" variant="secondary" size="lg">
            Xem nhân sự
          </LinkButton>
        </div>
      ) : view ? (
        <form
          id="assignment-form"
          className={s.form}
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <fieldset className={s.group}>
            <legend className={s.label}>Giáo viên chính · chọn một</legend>
            {staff.map((member) => {
              const selected = mainId === member.id;
              return (
                <label
                  key={member.id}
                  className={`${s.option} ${selected ? s.optionOn : ""}`.trim()}
                >
                  <input
                    type="radio"
                    name="assignment-main"
                    className={s.optionInput}
                    value={member.id}
                    checked={selected}
                    onChange={() => {
                      setMainId(member.id);
                      setAssistantIds((ids) =>
                        ids.filter((id) => id !== member.id),
                      );
                      setError("");
                    }}
                  />
                  <span className={s.optionText}>
                    <span className={s.optionName}>{member.name}</span>
                    <span className={s.optionRole}>
                      {roleNameOf(member.roleId, roles)}
                    </span>
                  </span>
                </label>
              );
            })}
            {inactiveMain && (
              <p className={s.hint}>
                Giáo viên chính hiện tại đã ngừng hoạt động. Chọn người thay thế
                để lưu.
              </p>
            )}
            {error && (
              <p role="alert" className={s.error}>
                {error}
              </p>
            )}
          </fieldset>

          <fieldset className={s.group}>
            <legend className={s.label}>Trợ giảng · chọn nhiều</legend>
            {staff.map((member) => {
              const isMain = mainId === member.id;
              const checked = assistantIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className={`${s.option} ${checked ? s.optionOn : ""} ${
                    isMain ? s.optionDisabled : ""
                  }`.trim()}
                >
                  <input
                    type="checkbox"
                    className={s.optionInput}
                    value={member.id}
                    checked={checked && !isMain}
                    disabled={isMain}
                    onChange={() => toggleAssistant(member.id)}
                  />
                  <span className={s.optionText}>
                    <span className={s.optionName}>{member.name}</span>
                    <span className={s.optionRole}>
                      {isMain
                        ? "Đang là GV chính"
                        : roleNameOf(member.roleId, roles)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <p className={s.note}>
            Gán vào lớp sẽ tự thêm lớp vào phạm vi lớp người đó thấy. Gỡ phân
            công không gỡ quyền thấy lớp. Chỉ hiện nhân sự đang hoạt động.
          </p>
        </form>
      ) : null}
    </Modal>
  );
}
