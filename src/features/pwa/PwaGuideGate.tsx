import { useState, type ReactNode } from "react";
import { PWA_GUIDE_DISMISSED_KEY, pwaGuideReason } from "./pwaPrompt";
import s from "./pwa.module.css";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function wasDismissed() {
  try {
    return localStorage.getItem(PWA_GUIDE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function PwaGuideGate({ children }: { children: ReactNode }) {
  const [showGuide, setShowGuide] = useState(() =>
    !wasDismissed() && Boolean(pwaGuideReason(navigator.userAgent, isStandalone())),
  );
  const [reason] = useState(() => pwaGuideReason(navigator.userAgent, isStandalone()));

  if (!showGuide || !reason) return children;

  function continueInBrowser() {
    try {
      localStorage.setItem(PWA_GUIDE_DISMISSED_KEY, "1");
    } catch {
      // Keep the in-memory dismissal even when browser storage is unavailable.
    }
    setShowGuide(false);
  }

  return (
    <main className={s.page}>
      <section className={s.sheet} aria-labelledby="pwa-title">
        <div className={s.content}>
          <h1 id="pwa-title">
            {reason === "in-app-browser" ? "Mở link bằng Safari" : "Thêm app vào Màn hình chính"}
          </h1>
          <p className={s.intro}>
            {reason === "in-app-browser"
              ? "Mở trong ứng dụng khác thì không cài được app. Làm 3 bước sau trên iPhone."
              : "Thêm app vào Màn hình chính để mở nhanh hơn. Làm 3 bước sau trên iPhone."}
          </p>

          <ol className={s.steps}>
            <li className={s.step}>
              <span className={s.number}>1</span>
              <div className={s.stepContent}>
                <h2>Chạm nút ba chấm ở góc phải trên</h2>
                <p>Trang đang mở trong trình duyệt của ứng dụng.</p>
                <div className={s.browserBar} aria-hidden="true"><span>Trang đang mở</span><span className={s.more}>•••</span></div>
              </div>
            </li>
            <li className={s.step}>
              <span className={s.number}>2</span>
              <div className={s.stepContent}>
                <h2>Chọn “Mở bằng Safari”</h2>
                <p>Trang sẽ mở lại trong Safari.</p>
                <div className={s.menuMock} aria-hidden="true"><span>Sao chép</span><span className={s.highlight}>Mở bằng Safari</span></div>
              </div>
            </li>
            <li className={s.step}>
              <span className={s.number}>3</span>
              <div className={s.stepContent}>
                <h2>Chia sẻ → Thêm vào Màn hình chính</h2>
                <p>Chạm Chia sẻ ở thanh dưới Safari, kéo xuống chọn mục này.</p>
                <div className={s.shareMock} aria-hidden="true"><span className={s.shareIcon}>⇧</span><span>›</span><span className={s.highlight}>+ Thêm vào Màn hình chính</span></div>
              </div>
            </li>
          </ol>

          <p className={s.android}>Dùng Android? Chạm nút ba chấm rồi chọn “Mở bằng Chrome”.</p>
          <button className={s.continue} type="button" onClick={continueInBrowser}>Dùng tạm trên trình duyệt</button>
        </div>
      </section>
    </main>
  );
}
