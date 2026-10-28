import { useEffect, useState } from "react";
import type { StaffMember, StaffRoleKey } from "../../data/api/types";
import { cancelPendingStaff, createStaff, staffErrorMessage, updateStaff } from "../../data/repositories/staff";
import { normalizePhone } from "../../data/auth/phone";
import { Button, Input, Modal, Segmented } from "../../shared/ui";
import { ASSIGNABLE_ROLES, isAssignableRole, sameClassSet } from "./staffModel";
import s from "./staff.module.css";

export interface StaffEditorProps {
  /** `null` = thêm mới; `StaffMember` = sửa. */
  target: StaffMember | "new" | null;
  classes: { id: string; name: string }[];
  onClose: () => void;
  onChanged: () => void;
  sheet?: boolean;
}

export function StaffEditor({ target, classes, onClose, onChanged, sheet }: StaffEditorProps) {
  const member = target && target !== "new" ? target : null;
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRoleKey>("teacher");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return;
    setError("");
    setBusy(false);
    if (target === "new") {
      setPhone(""); setName(""); setRole("teacher"); setClassIds([]);
    } else {
      setPhone(target.phone);
      setName(target.display_name);
      setRole(isAssignableRole(target.role.system_key) ? target.role.system_key : "teacher");
      setClassIds(target.class_ids);
    }
  }, [target]);

  const isAdminRow = member !== null && !isAssignableRole(member.role.system_key);
  const pending = member?.status === "pending";
  const normalized = normalizePhone(phone);
  const toggleClass = (id: string) => setClassIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      onChanged();
      onClose();
    } catch (e) {
      setError(staffErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const submit = () =>
    run(async () => {
      if (!member) {
        await createStaff({ phone: normalized ?? phone, display_name: name.trim(), role, class_ids: classIds });
        return;
      }
      const body: Parameters<typeof updateStaff>[1] = { base_version: member.version };
      if (role !== member.role.system_key) body.role = role;
      if (!sameClassSet(classIds, member.class_ids)) body.class_ids = classIds;
      if (pending && name.trim() !== member.display_name) body.display_name = name.trim();
      await updateStaff(member.id, body);
    });

  const canSave = member
    ? !isAdminRow && (role !== member.role.system_key || !sameClassSet(classIds, member.class_ids) || (pending && name.trim() !== member.display_name && name.trim() !== ""))
    : Boolean(normalized) && name.trim() !== "";
  const title = member ? member.display_name : "Thêm nhân sự";

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={title}
      sheet={sheet}
      footer={
        <div className={s.editorFooter}>
          {member && !member.is_self && member.status !== "pending" && (
            <Button
              variant={member.status === "disabled" ? "secondary" : "danger"}
              disabled={busy}
              onClick={() => void run(() => updateStaff(member.id, { status: member.status === "disabled" ? "active" : "disabled", base_version: member.version }))}
            >
              {member.status === "disabled" ? "Bật lại" : "Tắt quyền"}
            </Button>
          )}
          {pending && member && (
            <Button variant="danger" disabled={busy} onClick={() => void run(() => cancelPendingStaff(member.id))}>
              Huỷ khai báo
            </Button>
          )}
          <span className={s.footerSpacer} />
          {!isAdminRow && <Button onClick={() => void submit()} disabled={!canSave} loading={busy}>{member ? "Lưu" : "Thêm"}</Button>}
        </div>
      }
    >
      <div className={s.editorBody}>
        {error && <p className={s.error} role="alert">{error}</p>}
        {!member && (
          <Input label="Số điện thoại" id="staff-phone" inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} error={phone && !normalized ? "Số điện thoại không hợp lệ." : undefined} />
        )}
        {member && <p className={s.editorPhone}>{member.phone}</p>}
        <Input label="Tên hiển thị" id="staff-name" value={name} maxLength={100} disabled={Boolean(member) && !pending} onChange={(e) => setName(e.target.value)} />
        {isAdminRow ? (
          <p className={s.hint}>Admin có toàn quyền và thấy mọi lớp. Vai trò này không chỉnh ở đây.</p>
        ) : (
          <>
            <div className={s.fieldBlock}>
              <span className={s.fieldLabel}>Vai trò</span>
              <Segmented label="Vai trò" options={ASSIGNABLE_ROLES} value={role} onChange={(v) => setRole(v as StaffRoleKey)} />
            </div>
            <fieldset className={s.classPicker}>
              <legend className={s.fieldLabel}>Lớp được giao</legend>
              {classes.length === 0 && <p className={s.hint}>Chưa có lớp nào.</p>}
              {classes.map((c) => (
                <label key={c.id} className={s.classOption}>
                  <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                  <span>{c.name}</span>
                </label>
              ))}
              <p className={s.hint}>Người này chỉ thấy các lớp được chọn.</p>
            </fieldset>
          </>
        )}
      </div>
    </Modal>
  );
}
