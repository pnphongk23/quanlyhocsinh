import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  GUARDIAN_GROUPS,
  PERMISSION_GROUPS,
  useAccess,
} from "../../data/repositories/access";
import { listClasses } from "../../data/repositories/classes";
import {
  cancelInvite,
  getMember,
  inviteMember,
  listRoles,
  resendInvite,
  roleDisplayKind,
} from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { formatClassSchedule } from "../../shared/format";
import { useOnline } from "../../shared/hooks/useOnline";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import {
  Button,
  Card,
  EmptyState,
  Input,
  LinkButton,
  Modal,
  NoAccess,
  PageHeader,
  Pill,
} from "../../shared/ui";
import {
  classAssignmentLabel,
  initials,
  inviteExpiry,
  inviteLink,
  maskPhone,
  memberStatusLabel,
  memberStatusTone,
  permissionSummary,
  validatePhone,
} from "./staffModel";
import s from "./staff.module.css";

export default function InvitePage() {
  useStore();
  const access = useAccess();
  const navigate = useNavigate();
  const online = useOnline();
  const save = useSaveStatus();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [sentId, setSentId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const roles = listRoles();
  const classes = listClasses();
  const selectedRole = roles.find((role) => role.id === roleId);
  const guardian = selectedRole?.kind === "guardian";

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Mời nhân sự" />
        <NoAccess what="quản lý nhân sự" />
      </section>
    );
  }

  const sentMember = sentId ? getMember(sentId) : undefined;

  if (sentId && !sentMember) {
    return (
      <section className={s.pageNarrow}>
        <PageHeader compact backTo="/nhan-su" title="Lời mời" />
        <EmptyState title="Lời mời không còn tồn tại">
          <p>Lời mời đã bị huỷ hoặc người nhận đã kích hoạt tài khoản.</p>
          <LinkButton to="/nhan-su">Về danh sách nhân sự</LinkButton>
        </EmptyState>
      </section>
    );
  }

  if (sentMember) {
    const sentRole = roles.find((role) => role.id === sentMember.roleId);
    const link = inviteLink(sentMember.id, window.location.origin);
    const expiry = sentMember.invitedAt
      ? inviteExpiry(sentMember.invitedAt, new Date())
      : null;

    async function copyLink() {
      try {
        await navigator.clipboard.writeText(link);
        setMessage("Đã sao chép link mời.");
      } catch {
        setMessage("Không sao chép được. Bạn hãy chọn và sao chép link thủ công.");
      }
    }

    function resend() {
      try {
        resendInvite(sentMember!.id);
        setMessage("Đã gửi lại lời mời. Hạn 7 ngày tính từ lúc này.");
        setError("");
        save.clearStatus();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không gửi lại được lời mời.");
        save.setStatus("error");
      }
    }

    function cancel() {
      try {
        cancelInvite(sentMember!.id);
        save.clearStatus();
        navigate("/nhan-su", { replace: true });
      } catch (cause) {
        setCancelOpen(false);
        setError(cause instanceof Error ? cause.message : "Không huỷ được lời mời.");
        save.setStatus("error");
      }
    }

    const assignedNames = classes
      .filter((item) => sentMember.classIds.includes(item.id))
      .map((item) => item.name);

    return (
      <main className={s.pageNarrow}>
        <PageHeader compact backTo="/nhan-su" title="Lời mời đã gửi" />

        <Card className={s.member}>
          <div className={s.avatar} aria-hidden="true">
            {initials(sentMember.name)}
          </div>
          <div className={s.details}>
            <div className={s.nameRow}>
              <strong>{sentMember.name}</strong>
              <Pill tone={memberStatusTone(sentMember.status)}>
                {memberStatusLabel(sentMember.status)}
              </Pill>
            </div>
            <span>
              {maskPhone(sentMember.phone)} · {sentRole?.name ?? "Chưa gán vai trò"}
            </span>
            <span>
              {classAssignmentLabel(
                sentMember.classIds.length,
                sentRole?.system ?? false,
              )}
            </span>
          </div>
        </Card>

        <Card className={s.linkBox}>
          <h2 className={s.sectionTitle}>Link mời dùng một lần</h2>
          <p className={s.linkValue}>{link}</p>
          <div className={s.meta}>
            <span>
              {expiry
                ? `Hết hạn ngày ${expiry.expiresAtLabel} · còn ${expiry.daysLeft} ngày`
                : "Hạn 7 ngày kể từ khi gửi"}
            </span>
          </div>
          <p className={s.note}>
            Người nhận mở link và xác nhận OTP đúng số điện thoại này. Link chỉ dùng
            được một lần; gửi lại sẽ tạo hạn mới và link cũ không dùng được nữa.
          </p>
          {assignedNames.length > 0 && (
            <p className={s.note}>Lớp được gán: {assignedNames.join(", ")}</p>
          )}
          {message && (
            <p role="status" className={s.noticeSuccess + " " + s.notice}>
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <SaveStatus status={save.status} />
          <div className={s.actions}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                void copyLink();
              }}
            >
              Sao chép link
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={resend}
              disabled={!online}
              aria-describedby={!online ? "resend-offline" : undefined}
            >
              Gửi lại lời mời
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setCancelOpen(true);
                setError("");
              }}
            >
              Huỷ lời mời
            </Button>
          </div>
          {!online && (
            <p className={s.notice} id="resend-offline">
              Gửi lại lời mời cần có mạng.
            </p>
          )}
        </Card>

        <LinkButton variant="ghost" size="md" to="/nhan-su">
          Về danh sách nhân sự
        </LinkButton>

        <Modal
          title="Huỷ lời mời?"
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
        >
          <div className={s.form}>
            <p className={s.note}>
              Link mời của {sentMember.name} sẽ không dùng được nữa và người này không
              còn trong danh sách nhân sự. Bạn có thể mời lại sau.
            </p>
            <Button variant="danger" onClick={cancel}>
              Huỷ lời mời
            </Button>
          </div>
        </Modal>
      </main>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Nhập họ và tên người được mời.");
      save.setStatus("unsaved");
      return;
    }
    const phoneMessage = validatePhone(phone);
    if (phoneMessage) {
      setError(phoneMessage);
      save.setStatus("unsaved");
      return;
    }
    if (!roleId) {
      setError("Chọn vai trò cho người được mời.");
      save.setStatus("unsaved");
      return;
    }
    try {
      const member = inviteMember({
        name: name.trim(),
        phone: phone.replace(/\D/g, ""),
        roleId,
        classIds: guardian ? [] : classIds,
      });
      setSentId(member.id);
      setMessage("");
      setError("");
      save.clearStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được lời mời.");
      save.setStatus("error");
    }
  }

  return (
    <section className={s.pageNarrow}>
      <PageHeader compact backTo="/nhan-su" title="Mời nhân sự" />
      <form className={s.form} onSubmit={submit} noValidate>
        <Input
          label="Họ và tên"
          name="name"
          autoComplete="name"
          placeholder="Ví dụ: Cô Thu Trang"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            save.markUnsaved();
            setError("");
          }}
          required
        />
        <Input
          label="Số điện thoại"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Ví dụ: 0912345678"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            save.markUnsaved();
            setError("");
          }}
          required
        />

        <div className={s.field}>
          <span className={s.label}>Vai trò</span>
          <div className={s.optionList}>
            {roles.map((role) => {
              const active = role.id === roleId;
              const groups =
                role.kind === "guardian"
                  ? GUARDIAN_GROUPS
                  : PERMISSION_GROUPS.map((group) => group.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  className={s.option + (active ? " " + s.optionOn : "")}
                  aria-pressed={active}
                  onClick={() => {
                    setRoleId(role.id);
                    if (role.kind === "guardian") setClassIds([]);
                    save.markUnsaved();
                    setError("");
                  }}
                >
                  <span className={s.optionMain}>
                    <strong>{role.name}</strong>
                    <span>
                      {roleDisplayKind(role.kind)} ·{" "}
                      {permissionSummary(role.permissions, groups)}
                    </span>
                  </span>
                  <span className={s.optionMark} aria-hidden="true">
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
          {roles.length === 0 && (
            <p className={s.note}>Chưa có vai trò nào. Tạo vai trò trước khi mời.</p>
          )}
        </div>

        <div className={s.field}>
          <span className={s.label}>Lớp được gán</span>
          {guardian ? (
            <p className={s.notice}>
              Vai trò phụ huynh chỉ xem con được liên kết, không gán theo lớp. Hệ thống
              tự liên kết mọi con có cùng số điện thoại.
            </p>
          ) : classes.length === 0 ? (
            <p className={s.note}>Workspace chưa có lớp nào để gán.</p>
          ) : (
            <>
              <p className={s.hint}>
                Chọn một hoặc nhiều lớp. Để trống thì người này chưa thấy lớp nào.
              </p>
              <div className={s.checkList}>
                {classes.map((item) => {
                  const checked = classIds.includes(item.id);
                  return (
                    <label key={item.id} className={s.check}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setClassIds((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id],
                          );
                          save.markUnsaved();
                          setError("");
                        }}
                      />
                      <span className={s.checkText}>
                        <strong>{item.name}</strong>
                        <span>{formatClassSchedule(item)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className={s.note}>
          Hệ thống gửi link dùng một lần qua SMS, hết hạn sau 7 ngày. Cần có mạng để
          gửi lời mời.
        </p>

        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <SaveStatus status={save.status} />
        <div className={s.actions}>
          <div className={s.stickyBar}>
            <Button
              type="submit"
              size="lg"
              disabled={!online}
              aria-describedby={!online ? "invite-offline" : undefined}
            >
              Gửi lời mời
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => navigate("/nhan-su")}
          >
            Huỷ
          </Button>
        </div>
        {!online && (
          <p className={s.notice} id="invite-offline">
            Thiết bị đang ngoại tuyến. Kết nối mạng để gửi lời mời.
          </p>
        )}
      </form>
    </section>
  );
}
