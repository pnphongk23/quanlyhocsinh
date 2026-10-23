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
import { Button, Icon, Modal, PageHeader } from "../../shared/ui";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import { EMPTY_PASSWORD_FORM, isPasswordFormValid } from "./ChangePasswordPage";
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
    const children =
      membership.id === current?.id
        ? listMyChildren().map(({ student, className }) => ({
            name: student.name,
            className,
          }))
        : (membership.students ?? []).map((student) => ({
            name: student.name,
            className: student.class_name,
          }));
    const labels = children.map(({ name: childName, className }) => {
      const shortName = childName.trim().split(/\s+/).slice(-2).join(" ");
      return `${shortName} (${className ? classShortLabel(className) : "—"})`;
    });
    return labels.length ? labels.join(", ") : "Chưa liên kết con";
  }

  const roleLine = current
    ? `${roleBadge({
        id: current.role.id,
        name: current.role.name,
        kind: current.role.scope_kind === "linked_students" ? "guardian" : "staff",
        system: current.role.system_key === "admin",
        permissions: current.permissions,
      }).label} · ${subtitleFor(current)}`
    : session?.guardianAccount
      ? "Phụ huynh · Chưa liên kết con"
      : "";

  return {
    state,
    memberships,
    current,
    multipleRoles: memberships.length > 1,
    name,
    phone,
    roleLine,
    guardian:
      current?.role.scope_kind === "linked_students" ||
      (!current && session?.guardianAccount === true),
    subtitleFor,
  };
}

function SettingsMobile() {
  const navigate = useNavigate();
  const { state, memberships, current, multipleRoles, name, phone, roleLine, guardian } =
    useSettingsData();
  const pending = state.pending.length;
  const online = useOnline();
  const [signingOut, setSigningOut] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [error, setError] = useState("");
  if (!getSession()) return <Navigate to="/dang-nhap" replace />;

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
      <main className={`${s.page}${guardian ? ` ${s.guardianPage}` : ""}`}>
        {guardian ? (
          <PageHeader backTo="/ph" title="Cài đặt" />
        ) : (
          <h1 className={s.pageTitle}>Cài đặt</h1>
        )}
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

      <button type="button" className={s.logout} disabled={signingOut} aria-busy={signingOut || undefined} onClick={() => void signOut()}>
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
  const { state, memberships, current, multipleRoles, name, phone, roleLine, subtitleFor, guardian } =
    useSettingsData();
  const pending = state.pending.length;
  const online = useOnline();
  const [signingOut, setSigningOut] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM);
  const { current: currentPassword, next, confirm } = form;
  const [roleError, setRoleError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const action = useSaveAction({
    baseline: EMPTY_PASSWORD_FORM,
    value: form,
    validate: isPasswordFormValid,
    save: (v) => changePassword(v.current, v.next),
  });
  if (!getSession()) return <Navigate to="/dang-nhap" replace />;

  const setField = (key: keyof typeof form) => (value: string) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const mismatch = confirm.length > 0 && confirm !== next;
  const sameAsCurrent = next.length > 0 && next === currentPassword;
  const error = action.error
    ? authFailureMessage(action.error)
    : sameAsCurrent
      ? "Mật khẩu mới phải khác mật khẩu hiện tại."
      : roleError;

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) {
      setSaved(true);
      setForm(EMPTY_PASSWORD_FORM);
    }
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
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
      <main className={`${s.page}${guardian ? ` ${s.guardianPage}` : ""}`}>
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

        <div className={`${s.grid}${guardian ? ` ${s.guardianGrid}` : ""}`}>
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
                      aria-busy={busy || undefined}
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
                          setRoleError(authFailureMessage(cause));
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
                onChange={setField("current")}
                autoComplete="current-password"
                id="settings-current"
              />
              <PasswordField
                label="Mật khẩu mới"
                value={next}
                onChange={setField("next")}
                autoComplete="new-password"
                id="settings-new"
                hint={<PasswordStrength password={next} />}
              />
              <PasswordField
                label="Nhập lại mật khẩu mới"
                value={confirm}
                onChange={setField("confirm")}
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
                <Button
                  type="submit"
                  size="md"
                  disabled={!action.canSave}
                  loading={action.saving}
                  done={action.justSaved}
                >
                  Lưu mật khẩu mới
                </Button>
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
              <button type="button" className={s.logout} disabled={signingOut} aria-busy={signingOut || undefined} onClick={() => void signOut()}>
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
