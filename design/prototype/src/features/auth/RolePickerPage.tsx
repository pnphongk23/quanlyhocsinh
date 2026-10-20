import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuthSession, logout } from "../../data/repositories/auth";
import {
  listMyMemberships,
  switchRole,
} from "../../data/repositories/access";
import { roleDisplayKind } from "../../data/repositories/staff";
import { landingPathFor } from "../../roles/guardian/roleLanding";
import type { RoleKind } from "../../data/types";
import { useStore } from "../../data/store";
import { Button, Card, Icon, PageHeader, Pill } from "../../shared/ui";
import s from "./auth.module.css";

const WORKSPACE_NAME = "Lớp của cô Lan";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

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
  // Trang đầu theo loại vai trò đang dùng: phụ huynh vào /ph, nhân sự vào /lop.
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

  function signOut() {
    try {
      logout();
      navigate("/dang-nhap", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng xuất.");
    }
  }

  return (
    <main className={s.pickerPage}>
      <PageHeader eyebrow={session.email} title="Chọn vai trò" />

      {revoked && (
        <p className={s.notice} role="status">
          Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn.
        </p>
      )}

      <p className={s.pickerIntro}>
        {usable.length > 0
          ? "Mỗi lúc chỉ dùng một vai trò. Chọn vai trò bạn muốn dùng bây giờ."
          : "Tài khoản của bạn chưa có vai trò nào đang hoạt động trong workspace này."}
      </p>

      {usable.length > 0 && (
        <div className={s.roleList}>
          {usable.map(({ member, role }) => {
            const current = member.id === state.activeMemberId;
            // Vai trò phụ huynh: hiện tên con để phân biệt với vai trò nhân sự
            // trùng tên người dùng (Cô Lan có 3 membership).
            const childNames =
              role.kind === "guardian"
                ? (member.studentIds ?? [])
                    .map(
                      (studentId) =>
                        state.students.find(
                          (student) => student.id === studentId,
                        )?.name ?? "",
                    )
                    .filter(Boolean)
                : [];
            return (
              <Card key={member.id} selected={current} className={s.roleCard}>
                <button
                  type="button"
                  className={s.roleButton}
                  onClick={() => choose(member.id, role.kind)}
                >
                  <span className={s.roleAvatar} aria-hidden="true">
                    {initialsOf(member.name) || "?"}
                  </span>
                  <span className={s.roleText}>
                    <span className={s.roleName}>{role.name}</span>
                    <span className={s.roleMeta}>
                      {roleDisplayKind(role.kind)} · {WORKSPACE_NAME}
                    </span>
                    {childNames.length > 0 && (
                      <span className={s.roleMeta}>
                        Con: {childNames.join(", ")}
                      </span>
                    )}
                    <span className={s.roleMeta}>{member.name}</span>
                  </span>
                  {current ? (
                    <Pill tone="primary">Đang dùng</Pill>
                  ) : (
                    <span className={s.roleChevron} aria-hidden="true">
                      <Icon name="chevron-right" />
                    </span>
                  )}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <Button variant={usable.length > 0 ? "secondary" : "danger"} size="lg" onClick={signOut}>
        Đăng xuất
      </Button>

      <p className={s.footer}>
        Đăng xuất chỉ khả dụng khi không còn thay đổi chờ đồng bộ.
      </p>
    </main>
  );
}
