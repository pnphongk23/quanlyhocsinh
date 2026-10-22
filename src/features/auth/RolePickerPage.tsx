import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, switchMembership } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { useStore } from "../../data/store";
import { Icon } from "../../shared/ui";
import s from "./auth.module.css";

function badge(role: { name: string; system_key: string | null; scope_kind: string }) {
  if (role.scope_kind === "linked_students") return { label: "Phụ huynh", initials: "PH" };
  if (role.system_key === "admin") return { label: "Quản trị viên", initials: "QT" };
  if (role.name === "Trợ giảng") return { label: "Trợ giảng", initials: "TG" };
  return { label: role.name, initials: "GV" };
}

export default function RolePickerPage() {
  const navigate = useNavigate(); const state = useStore(); const session = getSession();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  if (!session) return <Navigate to="/dang-nhap" replace/>;
  const memberships = session.me.memberships.filter(item=>item.status!=="disabled");
  const active = memberships.find(item=>item.id===state.activeMemberId);
  const activeValid = Boolean(active);
  const revoked = state.activeMemberId!==null && !activeValid;
  if (!revoked && activeValid && memberships.length<=1) return <Navigate to={active?.role.scope_kind==="linked_students"?"/ph":"/lop"} replace/>;

  async function choose(id:string, guardian:boolean) {
    setBusy(true);setError("");
    try { await switchMembership(id);navigate(guardian?"/ph":"/lop",{replace:true}); }
    catch(cause) { setError(authFailureMessage(cause)); }
    finally { setBusy(false); }
  }
  return <main className={s.page}><div className={s.card}>
    <h1 className={s.title}>Chọn vai trò</h1>
    <p className={s.description}>Số {session.user.phone.replace(/^\+84/, "+84 ")} có hơn một vai trò. Chọn một để vào.</p>
    {revoked&&<p className={`${s.banner} ${s.bannerWarn} ${s.bannerTop}`} role="status">Vai trò của bạn đã thay đổi, dữ liệu đã được ẩn.</p>}
    {memberships.length===0&&<p className={s.note}>Tài khoản của bạn chưa có vai trò nào đang hoạt động trong không gian làm việc này.</p>}
    <div className={s.roleList}>{memberships.map(item=>{
      const roleBadge=badge(item.role);const guardian=item.role.scope_kind==="linked_students";
      return <button key={item.id} type="button" className={s.roleCard} disabled={busy} onClick={()=>choose(item.id,guardian)}>
        <span className={s.roleAvatar} aria-hidden="true">{roleBadge.initials}</span>
        <span className={s.roleText}><span className={s.roleName}>{roleBadge.label}</span><span className={s.roleMeta}>{guardian?"Phụ huynh":item.workspace.name}</span></span>
        <span className={s.roleChevron} aria-hidden="true"><Icon name="chevron-right"/></span>
      </button>;
    })}</div>
    {error&&<p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{error}</p>}
    <p className={s.pickerFooter}>Bạn đổi được vai trò bất cứ lúc nào trong Cài đặt.</p>
  </div></main>;
}
