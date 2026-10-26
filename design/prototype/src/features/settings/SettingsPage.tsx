import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listMyMemberships, switchRole, useAccess } from "../../data/repositories/access";
import {
  PASSWORD_ERRORS,
  changePassword,
  currentPhoneInput,
  currentWorkspaceName,
  getAuthSession,
  logout,
} from "../../data/repositories/auth";
import { PASSWORD_MIN_LENGTH, formatPhone } from "../../data/authAccounts";
import { landingPathFor } from "../../roles/guardian/roleLanding";
import type { Member, Role } from "../../data/types";
import { resetSeed } from "../../data/repositories/maintenance";
import { scheduleSync, usePendingCount } from "../../data/outbox";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useOnline } from "../../shared/hooks/useOnline";
import { useStore } from "../../data/store";
import { Button, Icon, Modal } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import { roleBadge } from "../auth/roleBadge";
import a from "../auth/auth.module.css";
import RecoveryEmailCard from "./RecoveryEmailCard";
import s from "./settings.module.css";

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

/** Nhãn lớp ngắn trong hồ sơ phụ huynh: "Tiếng Anh giao tiếp 6A" → "6A". */
export function classShortLabel(name: string): string {
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
  const { member, role, multipleRoles } = useAccess();
  const session = getAuthSession();
  const phone = session ? formatPhone(session.phone) : "";
  const memberships = listMyMemberships().filter(
    (item) => item.member.status !== "disabled",
  );
  const name = member?.name ?? "";

  /**
   * Dòng phụ dưới tên: "Giáo viên · Lớp của cô Lan", "Phụ huynh · Minh Anh
   * (6A), Gia Bảo (7B)" hoặc "Phụ huynh · Chưa liên kết con" (spec mục 4
   * "Tài khoản": chưa khớp hồ sơ nào thì ghi rõ chưa có con).
   */
  function subtitleFor(item: Member, itemRole: Role): string {
    if (itemRole.kind !== "guardian") return currentWorkspaceName();
    const children = (item.studentIds ?? [])
      .map((id) => {
        const student = state.students.find((entry) => entry.id === id);
        if (!student) return "";
        // Đọc tên lớp theo hồ sơ của con: role phụ huynh không có quyền xem
        // danh sách lớp (nhóm Lớp = Không) nên không dùng `listClasses`.
        const klass = state.classes.find((entry) => entry.id === student.classId);
        const shortName = student.name.split(/\s+/).slice(-2).join(" ");
        return `${shortName} (${klass ? classShortLabel(klass.name) : "—"})`;
      })
      .filter(Boolean);
    return children.length ? children.join(", ") : "Chưa liên kết con";
  }

  const roleLine =
    role && member ? `${roleBadge(role).label} · ${subtitleFor(member, role)}` : "";
  return {
    member,
    role,
    multipleRoles,
    phone,
    memberships,
    name,
    roleLine,
    subtitleFor,
  };
}

function SettingsMobile() {
  const navigate = useNavigate();
  const { member, role, multipleRoles, phone, memberships, name, roleLine } =
    useSettingsData();
  const pending = usePendingCount();
  const online = useOnline();
  const [blocked, setBlocked] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState("");

  function signOut() {
    if (pending > 0) {
      setBlocked(true);
      return;
    }
    try {
      logout();
      navigate("/dang-nhap", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng xuất.");
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
            {phone || "—"}
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
              {role ? roleBadge(role).label : "Chưa chọn"}
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        )}
      </section>

      <RecoveryEmailCard />

      {error && (
        <p className={a.banner + " " + a.bannerError} role="alert">
          {error}
        </p>
      )}

      <button type="button" className={s.logout} onClick={signOut}>
        Đăng xuất
      </button>

      <p className={s.sampleData}>
        Dữ liệu mẫu của prototype ·{" "}
        <button
          type="button"
          className={s.sampleDataButton}
          onClick={() => setConfirmReset(true)}
        >
          Đặt lại
        </button>
      </p>

      <LogoutBlocked
        open={blocked}
        onClose={() => setBlocked(false)}
        pending={pending}
        online={online}
        sheet
      />

      <Modal
        title="Đặt lại dữ liệu mẫu?"
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
      >
        <div>
          <p className={s.confirmText}>
            Mọi thay đổi thử nghiệm trên máy này sẽ được thay bằng dữ liệu mẫu.
            Bạn sẽ cần đăng nhập lại.
          </p>
          <div className={s.confirmActions}>
            <button
              type="button"
              className={s.confirmPrimary}
              onClick={() => {
                try {
                  resetSeed();
                  navigate("/dang-nhap", { replace: true });
                } catch {
                  setConfirmReset(false);
                }
              }}
            >
              Đặt lại dữ liệu
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function SettingsDesktop() {
  const navigate = useNavigate();
  const {
    member,
    multipleRoles,
    phone,
    memberships,
    name,
    roleLine,
    subtitleFor,
  } = useSettingsData();
  const pending = usePendingCount();
  const online = useOnline();
  const [blocked, setBlocked] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== next;
  const passwordAction = useSaveAction({
    baseline: { current: "", next: "", confirm: "" },
    value: { current, next, confirm },
    validate: (value) =>
      Boolean(value.current) &&
      value.next.length >= PASSWORD_MIN_LENGTH &&
      value.confirm === value.next,
    save: (value) => {
      try {
        changePassword(value.current, value.next, value.confirm);
      } catch (cause) {
        setSaved(false);
        setError(cause instanceof Error ? cause.message : PASSWORD_ERRORS.wrong);
        return false;
      }
    },
  });
  const invalid = !passwordAction.canSave;

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await passwordAction.submit()) {
      setSaved(true);
      setError("");
      setCurrent("");
      setNext("");
      setConfirm("");
    }
  }

  function signOut() {
    if (pending > 0) {
      setBlocked(true);
      return;
    }
    try {
      logout();
      navigate("/dang-nhap", { replace: true });
    } catch {
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
                  {currentPhoneInput() || "—"}
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
                {memberships.map(({ member: item, role: itemRole }) => {
                  const badge = roleBadge(itemRole);
                  const currentRole = item.id === member?.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={s.roleRow}
                      onClick={() => {
                        switchRole(item.id);
                        navigate(landingPathFor(itemRole.kind), {
                          replace: true,
                        });
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
                        <span className={s.roleMeta}>
                          {subtitleFor(item, itemRole)}
                        </span>
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
          <RecoveryEmailCard />
          <section className={s.card} aria-label="Đổi mật khẩu và đăng xuất">
            <h2 className={s.cardHead}>Đổi mật khẩu</h2>
            <form className={s.formBody} onSubmit={savePassword} noValidate>
              <PasswordField
                label="Mật khẩu hiện tại"
                value={current}
                onChange={(value) => {
                  setCurrent(value);
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
                errorText={mismatch ? PASSWORD_ERRORS.mismatch : undefined}
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
                  disabled={invalid}
                  loading={passwordAction.saving}
                  done={passwordAction.justSaved}
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
              <button type="button" className={s.logout} onClick={signOut}>
                Đăng xuất
              </button>
            </div>
          </section>
        </div>
      </div>

      <LogoutBlocked
        open={blocked}
        onClose={() => setBlocked(false)}
        pending={pending}
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
          <button
            type="button"
            className={s.confirmSecondary}
            onClick={onClose}
          >
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
