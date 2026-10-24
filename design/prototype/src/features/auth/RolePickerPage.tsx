import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthSession } from "../../data/repositories/auth";
import {
  listMyMemberships,
  switchRole,
} from "../../data/repositories/access";
import { currentPhoneLabel } from "../../data/repositories/auth";
import { currentWorkspaceName } from "../../data/repositories/auth";
import { landingPathFor } from "../../roles/guardian/roleLanding";
import { shortNameOf } from "../../roles/guardian/guardianFormat";
import type { Member, Role, RoleKind } from "../../data/types";
import { roleBadge } from "./roleBadge";
import { useStore } from "../../data/store";
import { Icon } from "../../shared/ui";
import s from "./auth.module.css";

/**
 * Màn chọn vai trò chỉ hiện khi tài khoản có nhiều hơn một vai trò (spec mục 4
 * "Tài khoản"). Mỗi thẻ là một vai trò trong workspace; chọn để vào.
 */
export default function RolePickerPage() {
  const navigate = useNavigate();
  const state = useStore();
  const [error, setError] = useState("");
  const session = getAuthSession();

  if (!session) return <Navigate to="/dang-nhap" replace />;

  const memberships = listMyMemberships();
  const usable = memberships.filter(
    (item) => item.member.status !== "disabled",
  );
  const activeMembership = memberships.find(
    (item) => item.member.id === state.activeMemberId,
  );
  const activeValid =
    activeMembership !== undefined &&
    activeMembership.member.status !== "disabled";
  // Vai trò đang dùng bị thu hồi: thành viên bị vô hiệu hoá hoặc không còn.
  const revoked = state.activeMemberId !== null && !activeValid;

  // Chỉ hiện màn chọn khi thật sự cần: chưa chọn, bị thu hồi, hoặc có nhiều vai trò.
  if (!revoked && activeValid && usable.length <= 1)
    return (
      <Navigate to={landingPathFor(activeMembership?.role.kind)} replace />
    );

  function choose(memberId: string, kind: RoleKind) {
    try {
      switchRole(memberId);
      navigate(landingPathFor(kind), { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể đổi vai trò. Vui lòng thử lại.",
      );
    }
  }

  function subtitle(member: Member, role: Role): string {
    if (role.kind === "guardian") {
      const first = (member.studentIds ?? [])
        .map((id) => state.students.find((student) => student.id === id)?.name)
        .find(Boolean);
      return first ? `Bé ${shortNameOf(first)}` : "Phụ huynh";
    }
    return currentWorkspaceName();
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>Chọn vai trò</h1>
        <p className={s.description}>
          Số {currentPhoneLabel()} có hơn một vai trò. Chọn một để vào.
        </p>

        {revoked && (
          <p className={s.banner + " " + s.bannerWarn + " " + s.bannerTop} role="status">
            Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn.
          </p>
        )}

        {usable.length === 0 && (
          <p className={s.note}>
            Tài khoản của bạn chưa có vai trò nào đang hoạt động trong không gian
            làm việc này.
          </p>
        )}

        <div className={s.roleList}>
          {usable.map(({ member, role }) => {
            const badge = roleBadge(role);
            return (
              <button
                key={member.id}
                type="button"
                className={s.roleCard}
                onClick={() => choose(member.id, role.kind)}
              >
                <span className={s.roleAvatar} aria-hidden="true">
                  {badge.initials}
                </span>
                <span className={s.roleText}>
                  <span className={s.roleName}>{badge.label}</span>
                  <span className={s.roleMeta}>{subtitle(member, role)}</span>
                </span>
                <span className={s.roleChevron} aria-hidden="true">
                  <Icon name="chevron-right" />
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className={s.banner + " " + s.bannerError + " " + s.bannerTop} role="alert">
            {error}
          </p>
        )}

        <p className={s.pickerFooter}>
          Bạn đổi được vai trò bất cứ lúc nào trong Cài đặt.
        </p>
      </div>
    </main>
  );
}
