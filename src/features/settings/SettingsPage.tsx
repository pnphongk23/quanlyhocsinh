import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  authFailureMessage,
  logout,
  switchMembership,
  changePassword,
} from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { listMyChildren } from "../../data/repositories/guardian";
import { getStore, useStore } from "../../data/store";
import { pendingCommandCount } from "../../data/outbox";
import { scheduleSync } from "../../data/sync";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useOnline } from "../../shared/hooks/useOnline";
import { Icon, Modal } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import a from "../auth/auth.module.css";
import { roleBadge } from "../auth/roleBadge";
import s from "./settings.module.css";

const PASSWORD_MIN_LENGTH = 8;

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
}

/** SĐT trong ô chỉ đọc: "+84 900 000 001" như prototype. */
function phoneLabel(value: string): string {
  const digits = normalizePhone(value);
  if (digits.length !== 9) return value || "—";
  return `+84 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/** Nhãn lớp ngắn trong hồ sơ phụ huynh: "Tiếng Anh giao tiếp 6A" → "6A". */
function classShortLabel(name: string): string {
  const matches = name.match(/\d+[A-Za-z]?/g);
  return matches?.length ? matches[matches.length - 1] : name;
}

/**
 * Cài đặt tài khoản (spec mục 4 "Tài khoản"): hồ sơ tên + SĐT chỉ đọc, đổi mật
 * khẩu, đổi vai trò khi tài khoản có nhiều vai trò, đăng xuất. Đăng xuất bị
 * chặn khi còn thay đổi chưa đồng bộ, kèm giải thích lý do (spec mục 5.3).
 */
export default function SettingsPage() {
  const desktop = useIsDesktop();
  return desktop ? <SettingsDesktop /> : <SettingsMobile />;
}

/** Dữ liệu dùng chung cho hai giao diện. */
function useSettingsData() {
  const state = useStore();
  const session = getSession();
  const memberships = (session?.me.memberships ?? []).filter(
    (item) => item.status === "active",
  );
  const current = memberships.find(
    (item) => item.id === session?.activeMembershipId,
  );
  const name = session?.user.display_name ?? "";
  const phone = session?.user.phone ?? "";

  /**
   * Dòng phụ dưới tên: "Giáo viên · Lớp của cô Lan", "Phụ huynh · Minh Anh
   * (6A), Gia Bảo (7B)" hoặc "Phụ huynh · Chưa liên kết con" (spec mục 4).
   * Con đọc từ `students` của membership phụ huynh qua repository được phân
   * quyền; danh sách này phản ánh các hồ sơ hiện đang liên kết với tài khoản.
   */
  function subtitleFor(membership: (typeof memberships)[number]): string {
    if (membership.role.scope_kind !== "linked_students") {
      return membership.workspace.name;
    }
    const children = listMyChildren().map(({ student, className }) => {
      const shortName = student.name.trim().split(/\s+/).slice(-2).join(" ");
      return `${shortName} (${className ? classShortLabel(className) : "—"})`;
    });
    return children.length ? children.join(", ") : "Chưa liên kết con";
  }

  const roleLine = current
    ? `${roleBadge({
        id: current.role.id,
        name: current.role.name,
        kind: current.role.scope_kind === "linked_students" ? "guardian" : "staff",
        system: current.role.system_key === "admin",
        permissions: current.permissions,
      }).label} · ${subtitleFor(current)}`
    : "";

  return {
    state,
    memberships,
    current,
    multipleRoles: memberships.length > 1,
    name,
    phone,
    roleLine,
    subtitleFor,
  };
}

function SettingsMobile() {
  const navigate = useNavigate();
  const { state, memberships, current, multipleRoles, name, phone, roleLine } =
    useSettingsData();
  const pending = state.pending.length;
  const online = useOnline();
  const [blocked, setBlocked] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [error, setError] = useState("");
  if (!getSession()) return <Navigate to="/dang-nhap" replace />;

  async function signOut() {
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
    }
  }

  return (
    <main className={s.page}>
      <h1 className={s.pageTitle}>Cài đặt</h1>
      {pending > 0 && (
        <p className={s.banner} role="status">
          {online
            ? `Đang đồng bộ · ${pending} thay đổi chưa đồng bộ`
            : `Đang ngoại tuyến · ${pending} thay đổi chưa đồng bộ`}
        </p>
      )}

      <section className={s.card} aria-label="Hồ sơ">
        <div className={s.profileHead}>
          <span className={s.avatar} aria-hidden="true">
            {initialsOf(name) || "GV"}
          </span>
          <span className={s.profileText}>
            <span className={s.profileName}>{name || "Chưa đăng nhập"}</span>
            <span className={s.profileMeta}>{roleLine}</span>
          </span>
        </div>
        <div className={s.row}>
          <span className={s.rowLabel}>Tên hiển thị</span>
          <span className={s.rowValue}>{name || "—"}</span>
        </div>
        <div className={s.row}>
          <span className={s.rowLabel}>Số điện thoại</span>
          <span className={s.rowValue}>
            <span className={s.rowLock} aria-hidden="true">
              <Icon name="lock" size={16} />
            </span>
            {phoneLabel(phone)}
          </span>
        </div>
      </section>

      <section className={s.card} aria-label="Tài khoản">
        <Link to="/cai-dat/doi-mat-khau" className={s.menuRow}>
          Đổi mật khẩu
          <span className={s.rowLock} aria-hidden="true">
            <Icon name="chevron-right" />
          </span>
        </Link>
        {multipleRoles && (
          <button
            type="button"
            className={s.menuRow}
            onClick={() => navigate("/chon-vai-tro")}
          >
            Đổi vai trò
            <span className={s.menuValue}>
              {current
                ? roleBadge({
                    id: current.role.id,
                    name: current.role.name,
                    kind:
                      current.role.scope_kind === "linked_students"
                        ? "guardian"
                        : "staff",
                    system: current.role.system_key === "admin",
                    permissions: current.permissions,
                  }).label
                : "Chưa chọn"}
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        )}
      </section>

      {error && (
        <p className={`${a.banner} ${a.bannerError}`} role="alert">
          {error}
        </p>
      )}

      <button type="button" className={s.logout} onClick={() => void signOut()}>
        Đăng xuất
      </button>

      <LogoutBlocked
        open={blocked}
        onClose={() => setBlocked(false)}
        pending={blockedCount}
        online={online}
        sheet
      />
    </main>
  );
}

function SettingsDesktop() {
  const navigate = useNavigate();
  const { state, memberships, current, multipleRoles, name, phone, roleLine, subtitleFor } =
    useSettingsData();
  const pending = state.pending.length;
  const online = useOnline();
  const [blocked, setBlocked] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!getSession()) return <Navigate to="/dang-nhap" replace />;

  const mismatch = confirm.length > 0 && confirm !== next;
  const invalid =
    !currentPassword || next.length < PASSWORD_MIN_LENGTH || mismatch || !confirm;

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (currentPassword === next) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, next);
      setSaved(true);
      setCurrentPassword("");
      setNext("");
      setConfirm("");
    } catch (cause) {
      setError(authFailureMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
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
    }
  }

  return (
    <main className={s.page}>
      <header>
        <p className={s.breadcrumb}>
          <span>Cài đặt</span>
          <span aria-hidden="true">/</span>
          <span className={s.breadcrumbCurrent}>Tài khoản</span>
        </p>
        <h1 className={s.pageTitle}>Tài khoản của tôi</h1>
      </header>

      {pending > 0 && (
        <p className={s.banner} role="status">
          {online
            ? `Đang đồng bộ · ${pending} thay đổi chưa đồng bộ`
            : `Đang ngoại tuyến · ${pending} thay đổi chưa đồng bộ`}
        </p>
      )}

      <div className={s.grid}>
        <div className={s.column}>
          <section className={s.card} aria-label="Hồ sơ">
            <h2 className={s.cardHead}>Hồ sơ</h2>
            <div className={s.profileHead}>
              <span className={s.avatar} aria-hidden="true">
                {initialsOf(name) || "GV"}
              </span>
              <span className={s.profileText}>
                <span className={s.profileName}>{name || "Chưa đăng nhập"}</span>
                <span className={s.profileMeta}>{roleLine}</span>
              </span>
            </div>
            <div className={s.fieldBlock} style={{ marginTop: 16 }}>
              <span className={s.fieldLabel}>Tên hiển thị</span>
              <span className={s.readonlyBox}>
                <span className={s.readonlyValue}>{name || "—"}</span>
                <span className={s.readonlyTag}>
                  <Icon name="lock" size={15} />
                  Chỉ đọc
                </span>
              </span>
            </div>
            <div className={s.fieldBlock} style={{ marginBottom: 24 }}>
              <span className={s.fieldLabel}>Số điện thoại</span>
              <span className={s.readonlyBox}>
                <span className={s.readonlyPrefix}>+84</span>
                <span className={s.readonlyValue}>
                  {normalizePhone(phone).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") || "—"}
                </span>
                <span className={s.readonlyTag}>
                  <Icon name="lock" size={15} />
                  Chỉ đọc
                </span>
              </span>
            </div>
          </section>

          {multipleRoles && (
            <section className={s.card} aria-label="Vai trò">
              <h2 className={s.cardHead}>Vai trò</h2>
              <p className={s.roleNote}>
                Tài khoản này có {memberships.length} vai trò. Đổi vai trò để vào
                phần tương ứng.
              </p>
              <div className={s.roleList}>
                {memberships.map((item) => {
                  const badge = roleBadge({
                    id: item.role.id,
                    name: item.role.name,
                    kind:
                      item.role.scope_kind === "linked_students"
                        ? "guardian"
                        : "staff",
                    system: item.role.system_key === "admin",
                    permissions: item.permissions,
                  });
                  const currentRole = item.id === current?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={s.roleRow}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await switchMembership(item.id);
                          navigate(
                            item.role.scope_kind === "linked_students"
                              ? "/ph"
                              : "/lop",
                            { replace: true },
                          );
                        } catch (cause) {
                          setError(authFailureMessage(cause));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <span className={s.roleAvatar} aria-hidden="true">
                        {badge.initials}
                      </span>
                      <span className={s.roleText}>
                        <span className={s.roleName}>
                          {badge.label}
                          {currentRole ? " · đang dùng" : ""}
                        </span>
                        <span className={s.roleMeta}>{subtitleFor(item)}</span>
                      </span>
                      <span className={s.roleChevron} aria-hidden="true">
                        <Icon name="chevron-right" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <div className={s.column}>
          <section className={s.card} aria-label="Đổi mật khẩu và đăng xuất">
            <h2 className={s.cardHead}>Đổi mật khẩu</h2>
            <form className={s.formBody} onSubmit={savePassword} noValidate>
              <PasswordField
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChange={(value) => {
                  setCurrentPassword(value);
                  setSaved(false);
                }}
                autoComplete="current-password"
                id="settings-current"
              />
              <PasswordField
                label="Mật khẩu mới"
                value={next}
                onChange={(value) => {
                  setNext(value);
                  setSaved(false);
                }}
                autoComplete="new-password"
                id="settings-new"
                hint={<PasswordStrength password={next} />}
              />
              <PasswordField
                label="Nhập lại mật khẩu mới"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                id="settings-confirm"
                error={mismatch}
                errorText={mismatch ? "Mật khẩu nhập lại chưa khớp." : undefined}
              />
              <div className={a.checks}>
                <CheckRow ok={next.length >= PASSWORD_MIN_LENGTH}>
                  Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
                </CheckRow>
              </div>
              {error && (
                <p className={a.fieldError} role="alert">
                  {error}
                </p>
              )}
              {saved && (
                <p className={s.saved} role="status">
                  Đã lưu mật khẩu mới.
                </p>
              )}
              <div className={s.formFooter}>
                <button
                  type="submit"
                  className={s.saveButton}
                  disabled={invalid || busy}
                >
                  {busy ? "Đang lưu…" : "Lưu mật khẩu mới"}
                </button>
              </div>
            </form>
            <div className={s.divider} />
            <div className={s.logoutRow}>
              <div>
                <p className={s.logoutTitle}>Đăng xuất</p>
                <p className={s.logoutHint}>
                  Thoát khỏi tài khoản trên trình duyệt này.
                </p>
              </div>
              <button type="button" className={s.logout} onClick={() => void signOut()}>
                Đăng xuất
              </button>
            </div>
          </section>
        </div>
      </div>

      <LogoutBlocked
        open={blocked}
        onClose={() => setBlocked(false)}
        pending={blockedCount}
        online={online}
      />
    </main>
  );
}

/** Hộp thoại/bottom sheet "Chưa thể đăng xuất" khi còn thay đổi chưa đồng bộ. */
function LogoutBlocked({
  open,
  onClose,
  pending,
  online,
  sheet = false,
}: {
  open: boolean;
  onClose: () => void;
  pending: number;
  online: boolean;
  sheet?: boolean;
}) {
  return (
    <Modal title="Chưa thể đăng xuất" open={open} onClose={onClose} sheet={sheet}>
      <div>
        <p className={s.confirmText}>
          Còn {pending} thay đổi chưa đồng bộ.{" "}
          {online
            ? "Hãy chờ đồng bộ xong rồi đăng xuất."
            : "Máy đang ngoại tuyến, đăng xuất bây giờ sẽ làm mất dữ liệu. Hãy kết nối mạng để đồng bộ rồi thử lại."}
        </p>
        <div className={s.confirmActions}>
          <button type="button" className={s.confirmSecondary} onClick={onClose}>
            Đã hiểu
          </button>
          <button
            type="button"
            className={s.confirmPrimary}
            onClick={() => {
              scheduleSync();
              onClose();
            }}
          >
            Thử đồng bộ lại
          </button>
        </div>
      </div>
    </Modal>
  );
}
