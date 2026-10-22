import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, logout, switchMembership, changePassword } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { assertCanLogout } from "../../data/outbox";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { Card, Icon } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import a from "../auth/auth.module.css";
import s from "./settings.module.css";

function initials(name:string) { return name.trim().split(/\s+/).slice(-2).map(part=>part[0]).join("").toLocaleUpperCase("vi-VN"); }
function PasswordEditor() {
  const [current,setCurrent]=useState(""); const [next,setNext]=useState(""); const [confirm,setConfirm]=useState(""); const [error,setError]=useState(""); const [saved,setSaved]=useState(false); const [busy,setBusy]=useState(false);
  const mismatch=Boolean(confirm && confirm!==next); const invalid=!current || next.length<8 || mismatch || !confirm;
  async function save(event:FormEvent<HTMLFormElement>) { event.preventDefault(); setError("");setSaved(false); if(current===next){setError("Mật khẩu mới phải khác mật khẩu hiện tại.");return;} setBusy(true); try { await changePassword(current,next); setSaved(true);setCurrent("");setNext("");setConfirm(""); } catch(cause) { setError(authFailureMessage(cause)); } finally {setBusy(false);} }
  return <><h2 className={s.cardHead}>Đổi mật khẩu</h2><form className={`${s.formBody} ${a.form}`} onSubmit={save} noValidate>
    <PasswordField label="Mật khẩu hiện tại" value={current} onChange={setCurrent} autoComplete="current-password" id="settings-current"/>
    <PasswordField label="Mật khẩu mới" value={next} onChange={setNext} autoComplete="new-password" id="settings-new" hint={<PasswordStrength password={next}/>}/>
    <PasswordField label="Nhập lại mật khẩu mới" value={confirm} onChange={setConfirm} autoComplete="new-password" id="settings-confirm" error={mismatch} errorText={mismatch ? "Mật khẩu nhập lại chưa khớp." : undefined}/>
    <div className={a.checks}><CheckRow ok={next.length>=8}>Tối thiểu 8 ký tự</CheckRow></div>
    {error && <p className={a.fieldError} role="alert">{error}</p>}{saved && <p className={s.saved} role="status">Đã lưu mật khẩu mới.</p>}
    <div className={s.formFooter}><button type="submit" className={s.saveButton} disabled={invalid||busy}>{busy?"Đang lưu…":"Lưu mật khẩu mới"}</button></div>
  </form></>;
}

export default function SettingsPage() {
  const navigate=useNavigate(); const desktop=useIsDesktop(); const session=getSession(); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  if(!session) return <Navigate to="/dang-nhap" replace/>;
  const memberships=session.me.memberships.filter(m=>m.status==="active"); const current=memberships.find(m=>m.id===session.activeMembershipId); const name=session.user.display_name || "Tài khoản"; const phone=session.user.phone;
  async function signOut(){setError("");setBusy(true);try{await assertCanLogout();await logout();navigate("/dang-nhap",{replace:true});}catch(cause){setError(authFailureMessage(cause));}finally{setBusy(false);}}
  return <main className={s.page}>
    {desktop?<header><p className={s.breadcrumb}><span>Cài đặt</span><span aria-hidden="true">/</span><span className={s.breadcrumbCurrent}>Tài khoản</span></p><h1 className={s.pageTitle}>Tài khoản của tôi</h1></header>:<h1 className={s.pageTitle}>Cài đặt</h1>}
    <div className={desktop?s.grid:undefined}>
      <div className={s.column}>
        <Card className={s.card} aria-label="Hồ sơ"><div className={s.profileHead}><span className={s.avatar}>{initials(name)||"GV"}</span><span className={s.profileText}><span className={s.profileName}>{name}</span><span className={s.profileMeta}>{current?.role.name} · {current?.workspace.name}</span></span></div>
          <div className={s.row}><span className={s.rowLabel}>Tên hiển thị</span><span className={s.rowValue}>{name}</span></div><div className={s.row}><span className={s.rowLabel}>Số điện thoại</span><span className={s.rowValue}><span className={s.rowLock}><Icon name="lock" size={16}/></span>{phone}</span></div>
        </Card>
        {memberships.length>1 && <Card className={s.card} aria-label="Vai trò"><h2 className={s.cardHead}>Vai trò</h2><p className={s.roleNote}>Tài khoản này có {memberships.length} vai trò. Đổi vai trò để vào phần tương ứng.</p><div className={s.roleList}>{memberships.map(item=><button key={item.id} type="button" className={s.roleRow} disabled={busy} onClick={async()=>{setBusy(true);try{await switchMembership(item.id);navigate(item.role.scope_kind==="linked_students"?"/ph":"/lop",{replace:true});}catch(cause){setError(authFailureMessage(cause));}finally{setBusy(false);}}}><span className={s.roleAvatar}>{initials(item.role.name)}</span><span className={s.roleText}><span className={s.roleName}>{item.role.name}{item.id===current?.id?" · đang dùng":""}</span><span className={s.roleMeta}>{item.workspace.name}</span></span><span className={s.roleChevron}><Icon name="chevron-right"/></span></button>)}</div></Card>}
        {!desktop&&<Card className={s.card}><Link to="/cai-dat/doi-mat-khau" className={s.menuRow}>Đổi mật khẩu<Icon name="chevron-right"/></Link></Card>}
      </div>
      {desktop&&<div className={s.column}><Card className={s.card}><PasswordEditor/><div className={s.divider}/><div className={s.logoutRow}><div><p className={s.logoutTitle}>Đăng xuất</p><p className={s.logoutHint}>Thoát khỏi tài khoản trên trình duyệt này.</p></div><button type="button" className={s.logout} onClick={signOut} disabled={busy}>Đăng xuất</button></div></Card></div>}
    </div>
    {!desktop&&<button type="button" className={s.logout} onClick={signOut} disabled={busy}>Đăng xuất</button>}
    {error&&<p className={`${a.banner} ${a.bannerError}`} role="alert">{error}</p>}
    <p className={s.sampleData}>Đăng xuất chỉ khả dụng khi không còn thay đổi chờ đồng bộ.</p>
  </main>;
}
