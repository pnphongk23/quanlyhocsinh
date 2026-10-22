import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../shared/ui";
import { PhoneField } from "./authUi";
import s from "./auth.module.css";

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const digits = (params.get("sdt") ?? "").replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
  const phone = digits.length === 9 ? digits.match(/\d{1,3}/g)?.join(" ") ?? "" : digits;
  return <main className={s.page}><div className={s.card}>
    <div className={s.backRow}><Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập"><Icon name="back"/></Link><Link to="/dang-nhap" className={s.backLink}><Icon name="back" size={18}/> Quay lại đăng nhập</Link></div>
    <h1 className={s.title}>Quên mật khẩu?</h1>
    <p className={s.description}>Người vận hành sẽ đặt lại mật khẩu cho bạn. Không gửi mã xác nhận.</p>
    <div className={s.forgotPhone}><PhoneField value={phone} readOnly label="Số điện thoại của bạn" id="forgot-phone"/></div>
    <ol className={s.steps}><li className={s.step}><span className={s.stepNum} aria-hidden="true">1</span><span>Liên hệ người vận hành và cung cấp số điện thoại tài khoản.</span></li><li className={s.step}><span className={s.stepNum} aria-hidden="true">2</span><span>Người vận hành sẽ đặt lại mật khẩu thủ công.</span></li></ol>
    <Link to="/dang-nhap" className={`${s.buttonLink} ${s.submit}`}>Quay lại đăng nhập</Link>
  </div></main>;
}
