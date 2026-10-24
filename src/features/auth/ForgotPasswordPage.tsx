import { useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { lookupPasswordReset, requestPasswordReset } from "../../data/auth";
import { rememberedEmailFor } from "../../data/auth/rememberedEmail";
import { ApiError } from "../../data/api/client";
import { useSaveAction } from "../../shared/hooks/useSaveAction";
import { Button, Icon } from "../../shared/ui";
import { EmailField, PhoneField, looksLikeEmail } from "./authUi";
import s from "./auth.module.css";

const RATE_LIMITED = "Bạn thử quá nhiều lần. Hãy chờ ít phút rồi thử lại.";
const OFFLINE = "Không thể kết nối. Hãy kiểm tra mạng rồi thử lại.";

/** Lỗi bước kiểm tra SĐT. */
export function lookupFailureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return OFFLINE;
  if (error.status === 429) return RATE_LIMITED;
  if (error.status === 422) return "Số điện thoại không hợp lệ.";
  return "Không thể hoàn thành yêu cầu.";
}

/** Lỗi bước gửi link: `field` hiện tại ô email, `banner` hiện đầu thẻ. */
export function requestFailure(error: unknown): { field: string; banner: string } {
  if (!(error instanceof ApiError)) return { field: "", banner: OFFLINE };
  const emailError = error.error.details?.fields;
  const fieldCode =
    emailError && typeof emailError === "object" && "email" in emailError
      ? emailError.email
      : null;
  if (error.status === 422 && fieldCode === "email_mismatch") return { field: "Email không khớp email đã lưu.", banner: "" };
  if (error.status === 422 && fieldCode === "invalid_email") return { field: "Email chưa đúng định dạng.", banner: "" };
  if (error.status === 429) return { field: "", banner: RATE_LIMITED };
  if (error.status === 503) return { field: "", banner: "Chưa gửi được email lúc này. Hãy thử lại sau ít phút." };
  if (error.status === 404) return { field: "", banner: "Không có tài khoản dùng số điện thoại này." };
  if (error.status === 409) return { field: "", banner: "Tài khoản này chưa có email. Hãy liên hệ người vận hành để đặt lại mật khẩu." };
  return { field: "", banner: "Không thể hoàn thành yêu cầu." };
}

type Lookup = { account: boolean; has_email: boolean; email_masked: string | null };

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const digits = (params.get("sdt") ?? "").replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");
  const [phone, setPhone] = useState(digits.length === 9 ? digits.match(/\d{1,3}/g)?.join(" ") ?? "" : digits);
  const [found, setFound] = useState<{ phone: string; result: Lookup } | null>(null);
  const [sent, setSent] = useState(false);
  const fullPhone = `+84${phone.replace(/\D/g, "")}`;
  const fetched = useRef<{ phone: string; result: Lookup } | null>(null);
  const lookup = useSaveAction({
    baseline: { phone: "" },
    value: { phone },
    validate: (v) => v.phone.replace(/\D/g, "").length === 9,
    save: async () => {
      fetched.current = { phone: fullPhone, result: await lookupPasswordReset(fullPhone) };
    },
  });
  const current = found?.phone === fullPhone ? found.result : null;
  const lookupError = lookup.error ? lookupFailureMessage(lookup.error) : "";

  async function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    if (await lookup.submit()) setFound(fetched.current);
  }

  return <main className={s.page}><div className={s.card}>
    <div className={s.backRow}><Link to="/dang-nhap" className={s.backButton} aria-label="Quay lại đăng nhập"><Icon name="back"/></Link><Link to="/dang-nhap" className={s.backLink}><Icon name="back" size={18}/> Quay lại đăng nhập</Link></div>
    <h1 className={s.title}>Quên mật khẩu?</h1>
    {sent ? <SentNotice/> : <>
      <p className={s.description}>Nhập số điện thoại, chúng tôi gửi link đặt lại mật khẩu tới email đã lưu trong tài khoản.</p>
      {lookupError && <p className={`${s.banner} ${s.bannerError} ${s.bannerTop}`} role="alert">{lookupError}</p>}
      <form className={s.form} onSubmit={submitLookup} noValidate>
        <PhoneField value={phone} onChange={setPhone} id="forgot-phone" error={Boolean(lookupError)}/>
        {!current && <Button type="submit" size="lg" block className={s.submitAction} disabled={!lookup.canSave} loading={lookup.saving} done={lookup.justSaved}>Tiếp tục</Button>}
      </form>
      {current && !current.account && <p className={`${s.banner} ${s.bannerInfo} ${s.bannerTop}`} role="status">Không có tài khoản dùng số điện thoại này.</p>}
      {current?.account && !current.has_email && <p className={`${s.banner} ${s.bannerInfo} ${s.bannerTop}`} role="status">Tài khoản này chưa lưu email. Hãy liên hệ người vận hành để đặt lại mật khẩu thủ công.</p>}
      {current?.account && current.has_email && <SendLinkForm key={fullPhone} phone={fullPhone} masked={current.email_masked ?? ""} onSent={() => setSent(true)}/>}
    </>}
  </div></main>;
}

function SendLinkForm({ phone, masked, onSent }: { phone: string; masked: string; onSent: () => void }) {
  const [email, setEmail] = useState(() => rememberedEmailFor(phone));
  const action = useSaveAction({
    baseline: { email: "" },
    value: { email },
    validate: (v) => looksLikeEmail(v.email),
    save: (v) => requestPasswordReset(phone, v.email.trim()),
  });
  const failure = action.error ? requestFailure(action.error) : { field: "", banner: "" };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action.submit()) onSent();
  }
  return <form className={s.form} onSubmit={submit} noValidate>
    <p className={s.note}>Gửi link đặt lại mật khẩu tới {masked}?</p>
    <EmailField label="Nhập email đã lưu" value={email} onChange={setEmail} id="forgot-email" errorText={failure.field}/>
    {failure.banner && <p className={`${s.banner} ${s.bannerError}`} role="alert">{failure.banner}</p>}
    <Button type="submit" size="lg" block className={s.submitAction} disabled={!action.canSave} loading={action.saving} done={action.justSaved}>Gửi link</Button>
  </form>;
}

function SentNotice() {
  return <>
    <p className={`${s.banner} ${s.bannerInfo} ${s.bannerTop}`} role="status">Đã gửi link, hạn 30 phút. Mở email và bấm vào link để đặt mật khẩu mới.</p>
    <Link to="/dang-nhap" className={`${s.buttonLink} ${s.submit}`}>Quay lại đăng nhập</Link>
  </>;
}
