import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  GUARDIAN_GROUPS,
  PERMISSION_GROUPS,
  useAccess,
} from "../../data/repositories/access";
import {
  createRole,
  getRole,
  roleDisplayKind,
  roleMemberCount,
  updateRole,
} from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import type { PermissionGroup, PermissionLevel, Role, RoleKind } from "../../data/types";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  NoAccess,
  PageHeader,
  Pill,
  Segmented,
} from "../../shared/ui";
import {
  GUARDIAN_LEVELS,
  levelOf,
  levelOptions,
  permissionSummary,
  sanitizeGuardianLevels,
  STAFF_LEVELS,
  type PermissionDraft,
  validateRoleName,
  withLevel,
} from "./staffModel";
import s from "./staff.module.css";

function initialDraft(role: Role | undefined): PermissionDraft {
  const draft: PermissionDraft = {};
  for (const group of PERMISSION_GROUPS) {
    draft[group.id] = role?.permissions[group.id] ?? "none";
  }
  return draft;
}

export default function RoleEditorPage() {
  useStore();
  const access = useAccess();
  const { roleId } = useParams();
  const navigate = useNavigate();
  const save = useSaveStatus();

  const role = roleId ? getRole(roleId) : undefined;
  const isNew = !roleId;
  const isSystem = role?.system ?? false;

  const [name, setName] = useState(() => role?.name ?? "");
  const [kind, setKind] = useState<RoleKind>(() => role?.kind ?? "staff");
  const [staffLevels, setStaffLevels] = useState<PermissionDraft>(() =>
    initialDraft(role),
  );
  const [guardianLevels, setGuardianLevels] = useState<PermissionDraft>(() =>
    sanitizeGuardianLevels(initialDraft(role), GUARDIAN_GROUPS),
  );
  const [error, setError] = useState("");

  const memberCount = roleId ? roleMemberCount(roleId) : 0;
  const rows =
    kind === "guardian"
      ? PERMISSION_GROUPS.filter((group) => GUARDIAN_GROUPS.includes(group.id))
      : PERMISSION_GROUPS;
  const levels = kind === "guardian" ? GUARDIAN_LEVELS : STAFF_LEVELS;
  const draft = kind === "guardian" ? guardianLevels : staffLevels;

  function setLevel(group: PermissionGroup, level: PermissionLevel) {
    if (kind === "guardian") {
      setGuardianLevels((prev) => withLevel(prev, group, level));
    } else {
      setStaffLevels((prev) => withLevel(prev, group, level));
    }
    save.markUnsaved();
    setError("");
  }

  function changeKind(next: RoleKind) {
    setKind(next);
    if (next === "guardian") {
      setGuardianLevels(sanitizeGuardianLevels(staffLevels, GUARDIAN_GROUPS));
    }
    save.markUnsaved();
    setError("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nameError = validateRoleName(name);
    if (nameError) {
      setError(nameError);
      save.setStatus("unsaved");
      return;
    }
    const permissions =
      kind === "guardian"
        ? sanitizeGuardianLevels(guardianLevels, GUARDIAN_GROUPS)
        : staffLevels;
    try {
      if (isNew) createRole({ name: name.trim(), kind, permissions });
      else if (roleId) updateRole(roleId, { name: name.trim(), permissions });
      setError("");
      save.clearStatus();
      navigate("/vai-tro", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được vai trò.");
      save.setStatus("error");
    }
  }

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Vai trò" />
        <NoAccess what="quản lý vai trò" />
      </section>
    );
  }

  if (roleId && !role) {
    return (
      <section className={s.pageNarrow}>
        <PageHeader compact backTo="/vai-tro" title="Vai trò" />
        <EmptyState title="Không tìm thấy vai trò">
          <p>Vai trò có thể đã bị xoá hoặc không còn trong workspace.</p>
          <LinkButton to="/vai-tro">Về danh sách vai trò</LinkButton>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className={s.pageNarrow}>
      <PageHeader
        compact
        backTo="/vai-tro"
        eyebrow="Quản trị workspace"
        title={isNew ? "Tạo vai trò" : role?.name ?? "Vai trò"}
      />

      {isSystem ? (
        <Card className={s.roleCard}>
          <div className={s.roleHead}>
            <h2 className={s.sectionTitle}>Vai trò Admin</h2>
            <Pill tone="primary">Cố định</Pill>
          </div>
          <p className={s.notice}>
            Vai trò Admin là cố định: luôn có toàn quyền và thấy mọi lớp. Không sửa
            được tên, loại hay ma trận quyền. Quản trị workspace (mời nhân sự, vai trò,
            gán lớp, vô hiệu hoá) luôn chỉ Admin làm.
          </p>
        </Card>
      ) : (
        memberCount > 0 && (
          <p className={s.notice + " " + s.noticeWarning} role="status">
            Vai trò này đang được gán cho {memberCount} người dùng. Thay đổi quyền có
            hiệu lực ngay với họ; dữ liệu và lịch sử vẫn được giữ.
          </p>
        )
      )}

      <form className={s.form} onSubmit={submit} noValidate>
        <Input
          label="Tên vai trò"
          value={name}
          placeholder="Ví dụ: Trợ giảng"
          disabled={isSystem}
          readOnly={isSystem}
          className={isSystem ? s.lockedInput : undefined}
          onChange={(event) => {
            setName(event.target.value);
            save.markUnsaved();
            setError("");
          }}
          required
        />

        <div className={s.field}>
          <span className={s.label}>Loại vai trò</span>
          <div className={!isNew || isSystem ? s.locked : undefined}>
            <Segmented
              label="Loại vai trò"
              options={[
                { value: "staff", label: roleDisplayKind("staff") },
                { value: "guardian", label: roleDisplayKind("guardian") },
              ]}
              value={kind}
              onChange={(value) => changeKind(value as RoleKind)}
              disabled={!isNew || isSystem}
            />
          </div>
          <p className={s.hint}>
            {isNew
              ? "Loại quyết định phạm vi dữ liệu: nhân sự theo lớp được gán, phụ huynh theo con được liên kết."
              : "Loại vai trò không đổi sau khi tạo."}
          </p>
        </div>

        <div className={s.field}>
          <span className={s.label}>Ma trận quyền</span>
          <p className={s.hint}>
            "Sửa" gồm tạo, sửa, lưu trữ; không xoá cứng dữ liệu.
          </p>
          <div className={s.matrix + (isSystem ? " " + s.locked : "")}>
            {rows.map((group) => (
              <div key={group.id} className={s.matrixRow}>
                <span className={s.matrixLabel}>{group.label}</span>
                <Segmented
                  label={`Quyền nhóm ${group.label}`}
                  options={levelOptions(levels)}
                  value={levelOf(draft, group.id)}
                  onChange={(value) =>
                    setLevel(group.id, value as PermissionLevel)
                  }
                  disabled={isSystem}
                />
              </div>
            ))}
          </div>
          <p className={s.summary}>
            {permissionSummary(
              draft,
              rows.map((group) => group.id),
            )}
          </p>
          {kind === "guardian" && (
            <p className={s.notice}>
              Phụ huynh chỉ xem con được liên kết. Vai trò phụ huynh luôn giới hạn ở
              mức Đọc, chỉ thấy nội dung đã gửi hoặc phát hành, không bao giờ sửa dữ
              liệu.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <SaveStatus status={save.status} />

        {isSystem ? (
          <LinkButton to="/vai-tro" variant="secondary" size="lg">
            Về danh sách vai trò
          </LinkButton>
        ) : (
          <div className={s.actions}>
            <div className={s.stickyBar}>
              <Button type="submit" size="lg">
                {isNew ? "Tạo vai trò" : "Lưu thay đổi"}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate("/vai-tro")}
            >
              Huỷ
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
