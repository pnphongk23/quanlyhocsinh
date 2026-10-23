import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, switchMembership } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { useStore } from "../../data/store";
import { Icon } from "../../shared/ui";
import { roleBadge } from "./roleBadge";
import s from "./auth.module.css";

function shortName(name: string): string {
  return name.trim().split(/\s+/).slice(-2).join(" ");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
}

export default function RolePickerPage() {
  const navigate = useNavigate();
  const state = useStore();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const session = getSession();
  const memberships = (session?.me.memberships ?? []).filter((item) => item.status === "active");
  const active = memberships.find((item) => item.id === state.activeMemberId);
  const revoked = state.activeMemberId !== null && !active;
  const single = session && !revoked && !active && memberships.length === 1 ? memberships[0] : null;
  const singleId = single?.id;
  useEffect(() => {
    if (single) void choose(single.id, single.role.scope_kind === "linked_students");
  }, [singleId]);
  if (!session) return <Navigate to="/dang-nhap" replace />;
  const phoneLabel = `+84 ${normalizePhone(session.user.phone).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}`;
  if (!revoked && active && memberships.length <= 1) {
    return <Navigate to={active.role.scope_kind === "linked_students" ? "/ph" : "/lop"} replace />;
  }
  if (!revoked && memberships.length === 0) return <Navigate to="/ph" replace />;
  if (single && !error) return null;

  function subtitle(membership: (typeof memberships)[number]): string {
    if (membership.role.scope_kind !== "linked_students") return membership.workspace.name;
    const first = membership.students?.[0];
    return first ? `Bé ${shortName(first.name)}` : "Phụ huynh";
  }

  async function choose(membershipId: string, guardian: boolean) {
    setBusy(true);
    setError("");
    try {
      await switchMembership(membershipId);
      navigate(guardian ? "/ph" : "/lop", { replace: true });
    } catch (cause) {
      setError(authFailureMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>Chọn vai trò</h1>
        <p className={s.description}>
          {memberships.length > 1 ? `Số ${phoneLabel} có hơn một vai trò. Chọn một để vào.` : "Chọn vai trò để vào."}
        </p>

        {revoked && (
          <p className={`${s.banner} ${s.bannerWarn} ${s.bannerTop}`} role="status">
            Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn.
          </p>
        )}
        {memberships.length === 0 && (
          <p className={s.note}>Tài khoản của bạn chưa có vai trò nào đang hoạt động trong không gian làm việc này.</p>
        )}

        <div className={s.roleList}>
          {memberships.map((membership) => {
            const badge = roleBadge({
              id: membership.role.id,
              name: membership.role.name,
              kind: membership.role.scope_kind === "linked_students" ? "guardian" : "staff",
              system: membership.role.system_key === "admin",
              permissions: membership.permissions,
            });
            const guardian = membership.role.scope_kind === "linked_students";
            return (
              <button
                key={membership.id}
                type="button"
                className={s.roleCard}
                disabled={busy}
                onClick={() => void choose(membership.id, guardian)}
              >
                <span className={s.roleAvatar} aria-hidden="true">{badge.initials}</span>
                <span className={s.roleText}>
                  <span className={s.roleName}>{badge.label}</span>
                  <span className={s.roleMeta}>{subtitle(membership)}</span>
                </span>
                <span className={s.roleChevron} aria-hidden="true"><Icon name="chevron-right" /></span>
              </button>
            );
          })}
        </div>

        {error && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
        <p className={s.pickerFooter}>Bạn đổi được vai trò bất cứ lúc nào trong Cài đặt.</p>
      </div>
    </main>
  );
}
