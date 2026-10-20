import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAccess } from "../../data/repositories/access";
import { listClasses } from "../../data/repositories/classes";
import {
  listMembers,
  listRoles,
  roleDisplayKind,
} from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import {
  Card,
  EmptyState,
  Fab,
  Icon,
  Input,
  LinkButton,
  NoAccess,
  PageHeader,
  Pill,
} from "../../shared/ui";
import {
  classAssignmentLabel,
  initials,
  maskPhone,
  matchesMember,
  memberStatusLabel,
  memberStatusTone,
} from "./staffModel";
import s from "./staff.module.css";

export default function MembersPage() {
  useStore();
  const access = useAccess();
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const members = listMembers();
  const roles = listRoles();
  const classes = listClasses();
  const roleById = new Map(roles.map((role) => [role.id, role] as const));
  const rows = members.map((member) => ({
    member,
    role: roleById.get(member.roleId),
  }));
  const visible = rows.filter(({ member, role }) =>
    matchesMember(member, role?.name ?? "", query),
  );
  const activeCount = members.filter((member) => member.status === "active").length;
  const invitedCount = members.filter((member) => member.status === "invited").length;
  const disabledCount = members.filter((member) => member.status === "disabled").length;

  const roleLabel = (role: ReturnType<typeof roleById.get>): string =>
    role ? `${role.name} · ${roleDisplayKind(role.kind)}` : "Chưa gán vai trò";

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Nhân sự" />
        <NoAccess what="quản lý nhân sự" />
      </section>
    );
  }

  return (
    <main className={s.page}>
      <PageHeader
        compact={!desktop}
        backTo="/cai-dat"
        eyebrow="Quản trị workspace"
        title="Nhân sự"
        actions={
          desktop ? (
            <LinkButton variant="secondary" size="md" to="/vai-tro">
              Vai trò và quyền
            </LinkButton>
          ) : undefined
        }
      />

      <Link to="/vai-tro" className={s.rowLink}>
        <Card className={s.entry}>
          <div className={s.entryText}>
            <strong>Vai trò và quyền</strong>
            <span>
              {roles.length} vai trò · {members.length} nhân sự
            </span>
          </div>
          <Icon name="chevron-right" />
        </Card>
      </Link>

      <div className={s.searchRow}>
        <Input
          label="Tìm nhân sự"
          type="search"
          placeholder="Tên, số điện thoại hoặc vai trò"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <p className={s.stats} aria-label="Thống kê nhân sự">
        {members.length} nhân sự · {activeCount} đang hoạt động · {invitedCount} đã mời ·{" "}
        {disabledCount} vô hiệu hoá · {classes.length} lớp trong workspace
      </p>

      {members.length === 0 ? (
        <EmptyState title="Chưa có nhân sự">
          <p>Mời giáo viên hoặc trợ giảng bằng số điện thoại để bắt đầu.</p>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title="Không tìm thấy nhân sự">
          <p>Thử tìm bằng tên, số điện thoại hoặc tên vai trò khác.</p>
        </EmptyState>
      ) : desktop ? (
        <Card className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Vai trò</th>
                <th>Lớp được gán</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ member, role }) => (
                <tr key={member.id}>
                  <td>
                    <Link className={s.tableLink} to={`/nhan-su/${member.id}`}>
                      <strong>{member.name}</strong>
                    </Link>
                    <br />
                    <small>{maskPhone(member.phone)}</small>
                  </td>
                  <td>{roleLabel(role)}</td>
                  <td>
                    {classAssignmentLabel(
                      member.classIds.length,
                      role?.system ?? false,
                    )}
                  </td>
                  <td>
                    <Pill tone={memberStatusTone(member.status)}>
                      {memberStatusLabel(member.status)}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className={s.list}>
          {visible.map(({ member, role }) => (
            <Link
              key={member.id}
              to={`/nhan-su/${member.id}`}
              className={s.rowLink}
              aria-label={`${member.name}, ${roleLabel(role)}, ${memberStatusLabel(member.status)}`}
            >
              <Card className={s.member}>
                <div className={s.avatar} aria-hidden="true">
                  {initials(member.name)}
                </div>
                <div className={s.details}>
                  <div className={s.nameRow}>
                    <strong>{member.name}</strong>
                    <Pill tone={memberStatusTone(member.status)}>
                      {memberStatusLabel(member.status)}
                    </Pill>
                  </div>
                  <span>
                    {maskPhone(member.phone)} · {roleLabel(role)}
                  </span>
                  <span>
                    {classAssignmentLabel(
                      member.classIds.length,
                      role?.system ?? false,
                    )}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Fab label="Mời nhân sự" onClick={() => navigate("/nhan-su/moi")} />
    </main>
  );
}
