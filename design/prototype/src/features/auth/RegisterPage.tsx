import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  EMAIL_INVALID,
  PASSWORD_MIN_LENGTH,
  normalizePhone,
  rememberPhone,
} from "../../data/authAccounts";
import {
  PASSWORD_ERRORS,
  getAuthSession,
  registerGuardian,
  registerWorkspace,
} from "../../data/repositories/auth";
import { roleLandingPath } from "../../roles/guardian/roleLanding";
import { Button, Icon, Segmented } from "../../shared/ui";
import { CheckRow, EmailField, PasswordField, PasswordStrength, PhoneField } from "./authUi";
import s from "./auth.module.css";
import r from "./registerGuardian.module.css";

type RegisterRole = "teacher" | "guardian";

const ROLE_OPTIONS = [
  { value: "teacher", label: "Giáo viên" },
  { value: "guardian", label: "Phụ huynh" },
];

/**
 * Đăng ký dùng chung cho hai vai trò (spec mục 4 "Tài khoản"):
 * - Giáo viên: tạo không gian làm việc bằng SĐT + mật khẩu, người tạo là quản
 *   trị viên đầu tiên.
 * - Phụ huynh: tự đăng ký bằng SĐT + mật khẩu tự đặt (một lần, không mật khẩu
 *   tạm, không bắt đổi lần đầu). Hệ thống tự liên kết mọi học sinh có SĐT phụ
 *   huynh trùng SĐT này, kể cả khi hồ sơ được khai sau.
 * Không xác minh SĐT bằng SMS/OTP.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterRole>("teacher");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const action = useSaveAction({
    baseline: { role: "teacher", name: "", workspaceName: "", phone: "", email: "", password: "", confirm: "" },
    value: { role, name, workspaceName, phone, email, password, confirm },
    validate: (value) =>
      value.name.trim() !== "" &&
      (value.role === "guardian" || value.workspaceName.trim() !== "") &&
      value.phone.trim() !== "" &&
      value.password.length >= PASSWORD_MIN_LENGTH &&
      value.confirm === value.password,
    save: (value) => {
      try {
        if (value.role === "guardian") {
          registerGuardian({
            name: value.name,
            phone: value.phone,
            email: value.email,
            password: value.password,
            confirmPassword: value.confirm,
          });
        } else {
          registerWorkspace({
            name: value.name,
            workspaceName: value.workspaceName,
            phone: value.phone,
            email: value.email,
            password: value.password,
            confirmPassword: value.confirm,
          });
        }
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : PASSWORD_ERRORS.mismatch,
        );
        return false;
      }
      rememberPhone(normalizePhone(value.phone));
    },
  });
  if (getAuthSession()) return <Navigate to={roleLandingPath()} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) navigate(roleLandingPath(), { replace: true });
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  const guardian = role === "guardian";

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.backRow}>
          <Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập">
            <Icon name="back" />
          </Link>
          <Link to="/dang-nhap" className={s.backLink}>
            <Icon name="back" size={18} />
            Quay lại đăng nhập
          </Link>
        </div>
        <h1 className={s.title}>
          {guardian ? "Tạo tài khoản phụ huynh" : "Tạo không gian làm việc"}
        </h1>

        <div className={r.roleSwitch}>
          <span className={r.roleLabel}>Bạn đăng ký với vai trò</span>
          <Segmented
            label="Bạn đăng ký với vai trò"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(value) => {
              setRole(value as RegisterRole);
              setError("");
            }}
          />
        </div>

        {error && error !== EMAIL_INVALID && (
          <p className={s.banner + " " + s.bannerError + " " + s.bannerTop} role="alert">
            {error}
          </p>
        )}

        <form className={s.form} onSubmit={submit} noValidate>
          <div className={s.field}>
            <label htmlFor="register-name">Tên hiển thị</label>
            <div className={s.textBox}>
              <input
                id="register-name"
                className={s.textInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder={guardian ? "Mẹ của Minh Anh" : "Cô Lan"}
              />
            </div>
          </div>
          {!guardian && (
            <div className={s.field}>
              <label htmlFor="register-workspace">Tên không gian làm việc</label>
              <div className={s.textBox}>
                <input
                  id="register-workspace"
                  className={s.textInput}
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  autoComplete="organization"
                  placeholder="Lớp của cô Lan"
                />
              </div>
            </div>
          )}
          <PhoneField value={phone} onChange={setPhone} id="register-phone" />
          <EmailField
            label="Email khôi phục"
            optional
            value={email}
            onChange={(value) => {
              setEmail(value);
              setError("");
            }}
            errorText={error === EMAIL_INVALID ? error : undefined}
            id="register-email"
          />
          <p className={s.note + " " + r.fieldNote}>
            Email chỉ dùng để lấy lại mật khẩu. Có thể thêm sau trong Cài đặt.
          </p>
          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            id="register-password"
            hint={<PasswordStrength password={password} />}
          />
          <div className={s.checks}>
            <CheckRow ok={password.length >= PASSWORD_MIN_LENGTH}>
              Tối thiểu {PASSWORD_MIN_LENGTH} ký tự
            </CheckRow>
          </div>
          <PasswordField
            label="Nhập lại mật khẩu"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            id="register-confirm"
            error={mismatch}
            errorText={mismatch ? PASSWORD_ERRORS.mismatch : undefined}
          />
          {guardian ? (
            <p className={s.note}>
              Con sẽ tự hiện ở đây khi hồ sơ học sinh có đúng số điện thoại
              này. Chưa khớp hồ sơ nào thì bạn vẫn dùng được tài khoản.
            </p>
          ) : (
            <p className={s.note}>
              Người tạo là quản trị viên đầu tiên của không gian làm việc.
            </p>
          )}
          <Button type="submit" size="lg" block className={s.submitAction} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>
            {guardian ? "Tạo tài khoản" : "Tạo không gian làm việc"}
          </Button>
        </form>
      </div>
    </main>
  );
}
