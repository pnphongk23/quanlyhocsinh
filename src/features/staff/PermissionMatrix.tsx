import { useEffect, useState } from "react";
import type { RolePermissionsItem, StaffPermissions, StaffRoleKey } from "../../data/api/types";
import { isRevokedError, saveRolePermissions, staffErrorMessage } from "../../data/repositories/staff";
import { PERMISSION_GROUPS } from "../../data/repositories/access";
import type { PermissionLevel } from "../../data/types";
import { Button, Segmented } from "../../shared/ui";
import { LEVEL_OPTIONS, SEND_COMMENTS_OPTIONS, changedPermissions, isAssignableRole, withSendCommentsFallback } from "./staffModel";
import s from "./staff.module.css";

function RolePermissions({ item, online, onSaved, onForbidden }: { item: RolePermissionsItem; online: boolean; onSaved: (item: RolePermissionsItem) => void; onForbidden: () => void }) {
  const savedPermissions = withSendCommentsFallback(item.permissions);
  const [draft, setDraft] = useState<StaffPermissions>(savedPermissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setDraft(withSendCommentsFallback(item.permissions)), [item]);
  const diff = changedPermissions(savedPermissions, draft);
  const dirty = Object.keys(diff).length > 0;
  const key = item.role.system_key as StaffRoleKey;

  async function save() {
    setBusy(true);
    setError("");
    try {
      onSaved(await saveRolePermissions(key, diff));
    } catch (e) {
      if (isRevokedError(e)) {
        onForbidden();
        return;
      }
      setError(staffErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={s.roleCard} aria-label={`Quyền ${item.role.name}`}>
      <h3 className={s.roleTitle}>{item.role.name}</h3>
        {PERMISSION_GROUPS.map((group) => (
        <div key={group.id} className={s.matrixRow}>
          <span className={s.matrixLabel}>{group.label}</span>
          <Segmented
            label={`${item.role.name}: ${group.label}`}
            options={LEVEL_OPTIONS}
            value={draft[group.id as keyof StaffPermissions]}
            disabled={!online || busy}
            onChange={(v) => setDraft((d) => ({ ...d, [group.id]: v as PermissionLevel }))}
          />
        </div>
        ))}
        <div className={s.matrixRow}>
          <span className={s.matrixLabel}>Gửi nhận xét</span>
          <Segmented
            label={`${item.role.name}: Gửi nhận xét`}
            options={SEND_COMMENTS_OPTIONS}
            value={draft.send_comments}
            disabled={!online || busy}
            onChange={(v) => setDraft((d) => ({ ...d, send_comments: v as "none" | "write" }))}
          />
        </div>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.matrixActions}>
        <Button disabled={!dirty || !online} loading={busy} onClick={() => void save()}>Lưu quyền</Button>
      </div>
    </section>
  );
}

export function PermissionMatrix({ items, online, onSaved, onForbidden }: { items: RolePermissionsItem[]; online: boolean; onSaved: (item: RolePermissionsItem) => void; onForbidden: () => void }) {
  return (
    <div className={s.matrix}>
      {items.filter((item) => isAssignableRole(item.role.system_key)).map((item) => (
        <RolePermissions key={item.role.id} item={item} online={online} onSaved={onSaved} onForbidden={onForbidden} />
      ))}
    </div>
  );
}
