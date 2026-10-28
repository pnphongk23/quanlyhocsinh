import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { RolePermissionsItem, StaffMember } from "../../data/api/types";
import { getSession } from "../../data/auth/session";
import { useAccess } from "../../data/repositories/access";
import { listRolePermissions, listStaff, staffErrorMessage } from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button, EmptyState, NoAccess, PageHeader, Pill, Spinner } from "../../shared/ui";
import { PermissionMatrix } from "./PermissionMatrix";
import { StaffEditor } from "./StaffEditor";
import { statusBadge } from "./staffModel";
import s from "./staff.module.css";

export default function StaffPage() {
  const access = useAccess();
  const desktop = useIsDesktop();
  const online = useOnline();
  const store = useStore();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [roles, setRoles] = useState<RolePermissionsItem[]>([]);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<StaffMember | "new" | null>(null);
  const classes = store.classes.map((c) => ({ id: c.id, name: c.name }));
  const classNames = new Map(classes.map((c) => [c.id, c.name]));

  const load = useCallback(async () => {
    setError("");
    try {
      const [members, perms] = await Promise.all([listStaff(), listRolePermissions()]);
      setStaff(members);
      setRoles(perms);
    } catch (e) {
      setError(staffErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (access.isAdmin) void load();
  }, [access.isAdmin, load]);

  if (!getSession()) return <Navigate to="/dang-nhap" replace />;
  if (!access.isAdmin) return <NoAccess what="mục nhân sự" />;

  const addButton = <Button onClick={() => setTarget("new")} disabled={!online}>Thêm nhân sự</Button>;
  const replaceRole = (next: RolePermissionsItem) => setRoles((all) => all.map((r) => (r.role.id === next.role.id ? next : r)));

  return (
    <main className={`${s.page}${desktop ? ` ${s.desktop}` : ""}`}>
      <PageHeader backTo="/cai-dat" title="Nhân sự" actions={desktop ? addButton : undefined} />
      {!online && <p className={s.banner} role="status">Đang ngoại tuyến. Cần có mạng để thay đổi nhân sự và quyền.</p>}
      {error && (
        <div className={s.errorBlock} role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => void load()}>Thử lại</Button>
        </div>
      )}
      {!staff && !error && <Spinner />}
      {staff && (
        <div className={s.layout}>
          <section className={s.card} aria-label="Danh sách nhân sự">
            <h2 className={s.cardHead}>Danh sách</h2>
            {staff.length === 0 && <EmptyState title="Chưa có nhân sự" size="compact" />}
            <ul className={s.list}>
              {staff.map((m) => {
                const badge = statusBadge(m);
                const assigned = m.class_ids.map((id) => classNames.get(id)).filter(Boolean);
                return (
                  <li key={m.id}>
                    <button type="button" className={s.row} onClick={() => setTarget(m)}>
                      <span className={s.rowMain}>
                        <span className={s.rowName}>{m.display_name}{m.is_self ? " (bạn)" : ""}</span>
                        <span className={s.rowMeta}>{m.phone}</span>
                        <span className={s.rowMeta}>
                          {m.role.system_key === "admin" ? "Mọi lớp" : assigned.length ? assigned.join(", ") : "Chưa giao lớp"}
                        </span>
                      </span>
                      <span className={s.rowPills}>
                        <Pill tone="primary">{m.role.name}</Pill>
                        {badge && <Pill tone={badge.tone}>{badge.label}</Pill>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!desktop && <div className={s.mobileAdd}>{addButton}</div>}
          </section>
          <section className={s.card} aria-label="Phân quyền">
            <h2 className={s.cardHead}>Quyền theo vai trò</h2>
            <p className={s.hint}>Admin luôn có toàn quyền. Quyền mới có hiệu lực ngay với mọi người cùng vai trò.</p>
            <PermissionMatrix items={roles} online={online} onSaved={replaceRole} />
          </section>
        </div>
      )}
      <StaffEditor target={target} classes={classes} sheet={!desktop} onClose={() => setTarget(null)} onChanged={() => void load()} />
    </main>
  );
}
