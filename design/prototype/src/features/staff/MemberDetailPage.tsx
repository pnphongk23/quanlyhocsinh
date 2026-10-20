import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  GUARDIAN_GROUPS,
  PERMISSION_GROUPS,
  useAccess,
} from "../../data/repositories/access";
import { listClasses } from "../../data/repositories/classes";
import {
  cancelInvite,
  getMember,
  listRoles,
  resendInvite,
  roleDisplayKind,
  setMemberClasses,
  setMemberDisabled,
  setMemberRole,
} from "../../data/repositories/staff";
import { useStore } from "../../data/store";
import { formatClassSchedule } from "../../shared/format";
import { useOnline } from "../../shared/hooks/useOnline";
import { SaveStatus, useSaveStatus } from "../../shared/SaveStatus";
import {
  Button,
  Card,
  EmptyState,
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
  maskPhone,
  memberStatusLabel,
  memberStatusTone,
  permissionSummary,
} from "./staffModel";
import s from "./staff.module.css";

export default function MemberDetailPage() {
  useStore();
  const access = useAccess();
  const { memberId = "" } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const save = useSaveStatus();
  const [disableOpen, setDisableOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const member = getMember(memberId);
  const roles = listRoles();
  const classes = listClasses();
  const role = member ? roles.find((item) => item.id === member.roleId) : undefined;
  const isAdminRole = role?.system ?? false;

  function run(action: () => void, success: string) {
    try {
      action();
      setError("");
      setMessage(success);
      save.clearStatus();
    } catch (cause) {
      setMessage("");
      setError(cause instanceof Error ? cause.message : "Không thực hiện được thao tác.");
      save.setStatus("error");
    }
  }

  if (!access.isAdmin) {
    return (
      <section className={s.page}>
        <PageHeader compact backTo="/cai-dat" title="Nhân sự" />
        <NoAccess what="quản lý nhân sự" />
      </section>
    );
  }

  if (!member) {
    return (
      <section className={s.pageNarrow}>
        <PageHeader compact backTo="/nhan-su" title="Thành viên" />
        <EmptyState title="Không tìm thấy thành viên">
          <p>Thành viên có thể đã bị huỷ lời mời hoặc không còn trong workspace.</p>
          <LinkButton to="/nhan-su">Về danh sách nhân sự</LinkButton>
        </EmptyState>
      </section>
    );
  }

  const expiry = member.invitedAt
    ? inviteExpiry(member.invitedAt, new Date())
    : null;
  const assignedClasses = classes.filter((item) => member.classIds.includes(item.id));

  return (
    <main className={s.pageNarrow}>
      <PageHeader
        compact
        backTo="/nhan-su"
        eyebrow={role ? `${role.name} · ${roleDisplayKind(role.kind)}` : "Chưa gán vai trò"}
        title={member.name}
      />

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
          <span>{maskPhone(member.phone)}</span>
          <span>
            {classAssignmentLabel(member.classIds.length, isAdminRole)}
          </span>
        </div>
      </Card>

      {message && (
        <p role="status" className={s.notice + " " + s.noticeSuccess}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <SaveStatus status={save.status} />

      {member.status === "invited" && (
        <Card className={s.roleCard}>
          <h2 className={s.sectionTitle}>Lời mời đang chờ</h2>
          <p className={s.note}>
            {expiry
              ? `Link mời hết hạn ngày ${expiry.expiresAtLabel} · còn ${expiry.daysLeft} ngày`
              : "Link mời có hạn 7 ngày kể từ khi gửi"}
          </p>
          <p className={s.note}>
            Link dùng một lần, OTP phải khớp số điện thoại {maskPhone(member.phone)}.
            Gửi lại sẽ tạo hạn mới.
          </p>
          <div className={s.actions}>
            <Button
              variant="secondary"
              size="md"
              disabled={!online}
              aria-describedby={!online ? "member-resend-offline" : undefined}
              onClick={() =>
                run(() => resendInvite(member.id), "Đã gửi lại lời mời nhân sự.")
              }
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
            <p className={s.notice} id="member-resend-offline">
              Gửi lại lời mời cần có mạng.
            </p>
          )}
        </Card>
      )}

      <Card className={s.roleCard}>
        <h2 className={s.sectionTitle}>Vai trò</h2>
        <p className={s.note}>
          Đổi vai trò có hiệu lực ngay với người này. Dữ liệu và lịch sử đã tạo vẫn
          được giữ.
        </p>
        <div className={s.optionList}>
          {roles.map((item) => {
            const active = item.id === member.roleId;
            const groups =
              item.kind === "guardian"
                ? GUARDIAN_GROUPS
                : PERMISSION_GROUPS.map((group) => group.id);
            return (
              <button
                key={item.id}
                type="button"
                className={s.option + (active ? " " + s.optionOn : "")}
                aria-pressed={active}
                disabled={active}
                onClick={() =>
                  run(
                    () => setMemberRole(member.id, item.id),
                    `Đã đổi vai trò sang ${item.name}.`,
                  )
                }
              >
                <span className={s.optionMain}>
                  <strong>
                    {item.name}
                    {item.system ? " · Cố định" : ""}
                  </strong>
                  <span>
                    {roleDisplayKind(item.kind)} ·{" "}
                    {permissionSummary(item.permissions, groups)}
                  </span>
                </span>
                <span className={s.optionMark} aria-hidden="true">
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className={s.roleCard}>
        <h2 className={s.sectionTitle}>Lớp được gán</h2>
        {isAdminRole ? (
          <p className={s.notice}>
            Vai trò Admin thấy mọi lớp trong workspace, không cần gán từng lớp.
          </p>
        ) : classes.length === 0 ? (
          <p className={s.note}>Workspace chưa có lớp nào để gán.</p>
        ) : (
          <>
            <p className={s.hint}>
              Bỏ chọn một lớp thì người này không còn thấy dữ liệu lớp đó. Dữ liệu của
              lớp vẫn được giữ.
            </p>
            <div className={s.checkList}>
              {classes.map((item) => {
                const checked = member.classIds.includes(item.id);
                return (
                  <label key={item.id} className={s.check}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        run(
                          () =>
                            setMemberClasses(
                              member.id,
                              checked
                                ? member.classIds.filter((id) => id !== item.id)
                                : [...member.classIds, item.id],
                            ),
                          "Đã cập nhật lớp được gán.",
                        )
                      }
                    />
                    <span className={s.checkText}>
                      <strong>{item.name}</strong>
                      <span>{formatClassSchedule(item)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {assignedClasses.length > 0 && (
              <p className={s.meta}>
                Đang gán: {assignedClasses.map((item) => item.name).join(", ")}
              </p>
            )}
          </>
        )}
      </Card>

      <Card className={s.roleCard}>
        <h2 className={s.sectionTitle}>Tài khoản</h2>
        {member.status === "disabled" ? (
          <>
            <p className={s.note}>
              Tài khoản đang bị vô hiệu hoá: người này không đăng nhập được. Dữ liệu và
              lịch sử đã tạo vẫn được giữ.
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={() =>
                run(
                  () => setMemberDisabled(member.id, false),
                  "Đã kích hoạt lại tài khoản.",
                )
              }
            >
              Kích hoạt lại
            </Button>
          </>
        ) : (
          <>
            <p className={s.note}>
              Vô hiệu hoá tài khoản có hiệu lực ngay. Không xoá dữ liệu: điểm, điểm
              danh, nhận xét và lịch sử người này đã tạo vẫn được giữ.
            </p>
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                setDisableOpen(true);
                setError("");
              }}
            >
              Vô hiệu hoá tài khoản
            </Button>
          </>
        )}
        <LinkButton variant="secondary" size="md" to="/vai-tro">
          Xem vai trò và quyền
        </LinkButton>
      </Card>

      <Modal
        title="Vô hiệu hoá tài khoản?"
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
      >
        <div className={s.form}>
          <p className={s.note}>
            {member.name} sẽ không đăng nhập được nữa. Hệ thống không xoá dữ liệu: điểm,
            điểm danh, nhận xét, báo cáo và lịch sử do người này tạo vẫn được giữ. Bạn
            có thể kích hoạt lại sau.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              setDisableOpen(false);
              run(
                () => setMemberDisabled(member.id, true),
                "Đã vô hiệu hoá tài khoản.",
              );
            }}
          >
            Vô hiệu hoá tài khoản
          </Button>
          <Button variant="ghost" size="md" onClick={() => setDisableOpen(false)}>
            Giữ nguyên
          </Button>
        </div>
      </Modal>

      <Modal
        title="Huỷ lời mời?"
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      >
        <div className={s.form}>
          <p className={s.note}>
            Link mời của {member.name} sẽ không dùng được nữa và người này không còn
            trong danh sách nhân sự. Bạn có thể mời lại sau.
          </p>
          <Button
            variant="danger"
            onClick={() =>
              run(() => {
                cancelInvite(member.id);
                navigate("/nhan-su", { replace: true });
              }, "Đã huỷ lời mời.")
            }
          >
            Huỷ lời mời
          </Button>
        </div>
      </Modal>
    </main>
  );
}
