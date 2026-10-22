import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authFailureMessage, changePassword } from "../../data/auth";
import { getSession } from "../../data/auth/session";
import { useIsDesktop } from "../../shared/hooks/useIsDesktop";
import { Icon } from "../../shared/ui";
import { CheckRow, PasswordField, PasswordStrength } from "../auth/authUi";
import a from "../auth/auth.module.css";
import s from "./settings.module.css";

export default function ChangePasswordPage() {
  const desktop=useIsDesktop(); const navigate=useNavigate(); const [current,setCurrent]=useState("");const [next,setNext]=useState("");const [confirm,setConfirm]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  if(!getSession()) return <Navigate to="/dang-nhap" replace/>; if(desktop) return <Navigate to="/cai-dat" replace/>;
  const mismatch=Boolean(confirm&&confirm!==next); const blocked=!current||next.length<8||mismatch||!confirm;
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");if(current===next){setError("Mật khẩu mới phải khác mật khẩu hiện tại.");return;}setBusy(true);try{await changePassword(current,next);navigate("/cai-dat",{replace:true});}catch(cause){setError(authFailureMessage(cause));}finally{setBusy(false);}}
  return <main className={s.passwordPage}><Link to="/cai-dat" className={s.backButton} aria-label="Quay lại"><Icon name="back"/></Link><h1 className={s.pageTitle}>Đổi mật khẩu</h1><form className={`${a.form} ${a.formFill}`} onSubmit={submit} noValidate>
    <PasswordField label="Mật khẩu hiện tại" value={current} onChange={setCurrent} autoComplete="current-password" id="change-current"/>
    <PasswordField label="Mật khẩu mới" value={next} onChange={setNext} autoComplete="new-password" id="change-new" error={Boolean(error)} errorText={error||undefined} hint={<PasswordStrength password={next}/>}/>
    <PasswordField label="Nhập lại mật khẩu mới" value={confirm} onChange={setConfirm} autoComplete="new-password" id="change-confirm" error={mismatch} errorText={mismatch?"Mật khẩu nhập lại chưa khớp.":undefined}/>
    <div className={a.checks}><CheckRow ok={next.length>=8}>Tối thiểu 8 ký tự</CheckRow></div><button type="submit" className={`${a.submit} ${a.submitSticky}`} disabled={blocked||busy}>{busy?"Đang lưu…":"Lưu mật khẩu mới"}</button>
  </form></main>;
}
