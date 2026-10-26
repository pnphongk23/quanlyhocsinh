import { Link, useNavigate } from "react-router-dom";
import {
  GUARDIAN_GROUPS,
  PERMISSION_GROUPS,
  useAccess,
} from "../../data/repositories/access";
import {
  listMembers,
  listRoles,
  roleDisplayKind,
  roleMemberCount,
} from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Card,
  EmptyState,
  Fab,
  LinkButton,
  NoAccess,
  PageHeader,
  Pill,
} from "../../shared/ui";
import { permissionSummary } from "./staffModel";
import s from "./staff.module.css";

export default function RolesPage() {
  useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const navigate = useNavigate();

  const roles = listRoles();
  const members = listMembers();

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Vai trò" />
        <NoAccess what="quản lý vai trò" />
      </section>
    );
  }

  return (
    <main className={s.page}>
      <PageHeader
        compact={!desktop}
        backTo="/cai-dat"
        eyebrow="Quản trị workspace"
        title="Vai trò"
        actions={
          desktop ? (
            <LinkButton variant="secondary" size="md" to="/nhan-su">
              Nhân sự
            </LinkButton>
          ) : undefined
        }
      />

      <p className={s.stats}>
        {roles.length} vai trò · {members.length} nhân sự
      </p>
      <p className={s.note}>
        Quyền theo nhóm, mỗi nhóm ba mức Không, Đọc, Sửa. Sửa quyền có hiệu lực ngay
        với người đang dùng vai trò đó. Quản trị workspace luôn chỉ Admin làm và không
        nằm trong ma trận quyền.
      </p>

      {roles.length === 0 ? (
        <EmptyState title="Chưa có vai trò" mascot="cho">
          <p>Workspace luôn có vai trò Admin cố định. Tạo thêm vai trò cho nhân sự.</p>
        </EmptyState>
      ) : (
        <div className={s.list}>
          {roles.map((role) => {
            const groups =
              role.kind === "guardian"
                ? GUARDIAN_GROUPS
                : PERMISSION_GROUPS.map((group) => group.id);
            const count = roleMemberCount(role.id);
            return (
              <Link key={role.id} to={`/vai-tro/${role.id}`} className={s.rowLink}>
                <Card className={s.roleCard}>
                  <div className={s.roleHead}>
                    <strong>{role.name}</strong>
                    {role.system && <Pill tone="primary">Cố định</Pill>}
                  </div>
                  <div className={s.roleMeta}>
                    <span>{roleDisplayKind(role.kind)}</span>
                    <span>
                      {count} người dùng
                    </span>
                    <span>{permissionSummary(role.permissions, groups)}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Fab label="Tạo vai trò" onClick={() => navigate("/vai-tro/moi")} />
    </main>
  );
}
