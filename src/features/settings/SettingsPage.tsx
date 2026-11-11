import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { logout } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { listMyChildren } from "../../data/repositories/guardian";
import { useStore } from "../../data/store";
import { pendingCommandCount } from "../../data/outbox";
import { scheduleSync } from "../../data/sync";
import { useOnline } from "../../shared/hooks/useOnline";
import { Button, Icon, Modal } from "../../shared/ui";
import { PageShell } from "../../shared/layout";
import { initialsOf, profileTitle } from "../../shared/personName";
import { EmailSettingsSummary } from "./EmailSettings";
import { roleBadge } from "../auth/roleBadge";
import a from "../auth/auth.module.css";
import s from "./settings.module.css";

function classShortLabel(name: string): string {
  const matches = name.match(/\d+[A-Za-z]?/g);
  return matches?.length ? matches[matches.length - 1] : name;
}

function phoneLabel(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
  if (digits.length !== 9) return value || "—";
  return `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function membershipSubtitle(membership: NonNullable<ReturnType<typeof getSession>>["me"]["memberships"][number]): string {
  if (membership.role.scope_kind !== "linked_students") return membership.workspace.name;
  const children = membership.students ?? listMyChildren().map(({ student, className }) => ({
    name: student.name,
    class_name: className,
  }));
  const labels = children.map((child) => `${child.name.trim().split(/\s+/).slice(-2).join(" ")} (${child.class_name ? classShortLabel(child.class_name) : "—"})`);
  return labels.length ? labels.join(", ") : "Chưa liên kết con";
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const state = useStore();
  const online = useOnline();
  const [signingOut, setSigningOut] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [error, setError] = useState("");

  if (!session) return <Navigate to="/dang-nhap" replace />;

  const memberships = session.me.memberships.filter((item) => item.status === "active");
  const current = memberships.find((item) => item.id === session.activeMembershipId);
  const guardian = current?.role.scope_kind === "linked_students" || (!current && session.guardianAccount === true);
  const admin = current?.role.system_key === "admin";
  const name = session.user.display_name ?? "";
  const roleLine = current
    ? `${roleBadge({
        id: current.role.id,
        name: current.role.name,
        kind: current.role.scope_kind === "linked_students" ? "guardian" : "staff",
        system: current.role.system_key === "admin",
        permissions: current.permissions,
      }).label} · ${membershipSubtitle(current)}`
    : guardian ? "Phụ huynh · Chưa liên kết con" : "";
  const pending = state.pending.length;

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      const count = await pendingCommandCount();
      if (count > 0) {
        setBlockedCount(count);
        setBlocked(true);
        return;
      }
      await logout();
      navigate("/dang-nhap", { replace: true });
    } catch {
      setBlockedCount(pending);
      setBlocked(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <PageShell
      eyebrow="Tài khoản"
      title="Cài đặt"
      subtitle="Hồ sơ, tài khoản và bộ tiêu chí dùng chung cho workspace."
      breadcrumb={guardian ? <><Link to="/ph">Phụ huynh</Link><span aria-hidden="true">/</span><span>Cài đặt</span></> : undefined}
      backTo={guardian ? "/ph" : undefined}
    >
      <div className={s.pageContent}>
        {pending > 0 && <p className={s.banner} role="status">{online ? `Đang đồng bộ · ${pending} thay đổi chưa đồng bộ` : `Đang ngoại tuyến · ${pending} thay đổi chưa đồng bộ`}</p>}

        <section className={`${s.card} ${s.profileCard}`} data-measure="block" aria-label="Hồ sơ">
          <span className={s.avatar} aria-hidden="true">{initialsOf(name) || <Icon name="user" />}</span>
          <div className={s.profileText}>
            <span className={s.profileName}>{profileTitle(name)}</span>
            <span className={s.profileMeta}>{roleLine}</span>
            <span className={s.profileMeta}>{phoneLabel(session.user.phone)}</span>
            {current && current.role.system_key !== "admin" && current.role.scope_kind !== "linked_students" && !name && <span className={s.profileMeta}>Admin đặt tên cho bạn</span>}
          </div>
        </section>

        <section className={s.card} data-measure="block" aria-label="Tài khoản">
          <h2 className={s.cardHead}>Tài khoản</h2>
          <nav aria-label="Mục cài đặt">
            <Link className={s.menuRow} data-measure="row" to="/cai-dat/doi-mat-khau">
              <span className={s.rowMain}><span className={s.rowTitle}>Đổi mật khẩu</span><span className={s.rowDescription}>Cập nhật mật khẩu đăng nhập của bạn</span></span>
              <Icon name="chevron-right" />
            </Link>
            <EmailSettingsSummary />
            {admin && <Link className={s.menuRow} data-measure="row" to="/cai-dat/nhan-su">
              <span className={s.rowMain}><span className={s.rowTitle}>Nhân sự</span><span className={s.rowDescription}>Thêm trợ giảng và phân quyền trong lớp</span></span>
              <Icon name="chevron-right" />
            </Link>}
            {import.meta.env.VITE_CRITERIA_LEVELS === "1" && admin && <Link className={s.menuRow} data-measure="row" to="/cai-dat/bo-tieu-chi">
              <span className={s.rowMain}><span className={s.rowTitle}>Bộ tiêu chí nhận xét</span><span className={s.rowDescription}>5 tiêu chí · áp dụng cho mọi lớp</span></span>
              <Icon name="chevron-right" />
            </Link>}
            {memberships.length > 1 && <button type="button" className={s.menuRow} data-measure="row" onClick={() => navigate("/chon-vai-tro")}>
              <span className={s.rowMain}><span className={s.rowTitle}>Đổi vai trò</span><span className={s.rowDescription}>Chuyển giữa các vai trò của tài khoản</span></span>
              <Icon name="chevron-right" />
            </button>}
          </nav>
        </section>

        {error && <p className={`${a.banner} ${a.bannerError}`} role="alert">{error}</p>}
        <Button variant="danger" disabled={signingOut} loading={signingOut} onClick={() => void signOut()}>Đăng xuất</Button>
        <LogoutBlocked open={blocked} onClose={() => setBlocked(false)} pending={blockedCount} online={online} sheet={guardian} />
      </div>
    </PageShell>
  );
}

function LogoutBlocked({ open, onClose, pending, online, sheet = false }: { open: boolean; onClose: () => void; pending: number; online: boolean; sheet?: boolean }) {
  return (
    <Modal title="Chưa thể đăng xuất" open={open} onClose={onClose} sheet={sheet}>
      <div>
        <p className={s.confirmText}>Còn {pending} thay đổi chưa đồng bộ. {online ? "Hãy chờ đồng bộ xong rồi đăng xuất." : "Máy đang ngoại tuyến, đăng xuất bây giờ sẽ làm mất dữ liệu. Hãy kết nối mạng để đồng bộ rồi thử lại."}</p>
        <div className={s.confirmActions}>
          <Button variant="secondary" onClick={onClose}>Đã hiểu</Button>
          <Button onClick={() => { scheduleSync(); onClose(); }}>Thử đồng bộ lại</Button>
        </div>
      </div>
    </Modal>
  );
}
