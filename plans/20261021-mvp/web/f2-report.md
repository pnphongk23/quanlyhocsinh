# F-2 — Privacy và hiệu năng

Ngày kiểm: 2026-10-23 · Worktree `mvp-web` · Staging: `https://qlh-staging-web.pages.dev`

## Đã làm

- Logout vẫn chặn khi outbox còn lệnh; sau khi `POST /auth/logout` thành công, một transaction Dexie xoá mọi entity, cursor/epoch và outbox theo tất cả workspace/membership của user đó. Mất quyền membership tiếp tục ẩn cache membership và giữ lệnh bị từ chối theo F-1.
- Tự lưu Plus Jakarta Sans variable WOFF2, đủ subset latin, latin-ext và Vietnamese; thêm OFL, `font-display: swap`, preload latin và Vietnamese. Service worker precache cả ba subset. Bỏ Google Fonts khỏi HTML và CSP.
- Thêm `HydrateFallback: () => null`, meta `mobile-web-app-capable`, và `robots.txt` staging `Disallow: /`. Mascot đã có `width`/`height` theo tỉ lệ nên không cần sửa.
- Đồng nhất import tĩnh của `sync.ts` và `api/client.ts`; build không còn cảnh báo Vite.

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm test`: 25 file đạt, 1 bỏ qua; 216 test đạt, 1 bỏ qua. Test mới dùng fake IndexedDB xác nhận cache/outbox của user A qua hai membership bị xoá, cache user B còn nguyên; test auth xác nhận chỉ dọn cache sau khi API xác nhận logout.
- `VITE_API_BASE_URL=https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1 npm run build`: đạt, không còn cảnh báo chunk. JS đầu tiên gzip 146.099 B; CSS gzip 3.154 B; JS tới route nhân sự 158.483 B và phụ huynh 165.696 B.
- Lighthouse 13, mobile Slow 4G `/dang-nhap`: trước W-6 Performance 78, LCP 3,9–4,4 giây, TBT 0 ms, CLS 0; sau F-2 Performance 91, LCP 2,9 giây, TBT 0 ms, CLS 0, Accessibility 100, Best Practices 100. Lượt sau ghi 219.666 B truyền; ảnh mascot đã cache (0 B), cộng lại ảnh lạnh 28.974 B thì 248.640 B, thấp hơn baseline 284.268 B khoảng 35.628 B (12,5%). Font ở lượt sau 37.735 B so với 75.604 B trong baseline W-6.
- Lighthouse `/dang-ky` trên preview W-6 và staging sau F-2: Performance 79 → 93, LCP 3,8 → 2,9 giây, chuyển tải 242.877 → 220.864 B.
- Lighthouse staging: `errors-in-console` 0, không có runtime error và không gọi Google Fonts. SEO 63 do kiểm tra `is-crawlable` báo trang bị chặn index; đây là kết quả mong muốn của `Disallow: /` trên staging. Audit `robots.txt` hợp lệ.
- HTTP staging `/dang-nhap` trả 200 cùng CSP mới; font trả 200 `font/woff2`; `robots.txt` trả 200 `text/plain`. Ảnh trước/sau cho hai màn Đăng nhập và Tạo không gian làm việc được chụp, đã so mắt và không thấy đổi chữ hay bố cục: `/tmp/f2-shots/{before,after}-{login,register}.jpg`.
- Deploy Pages staging thành công: `https://af7bcd0c.qlh-staging-web.pages.dev`; staging chính được cập nhật. CUA trình duyệt không khả dụng, nên kiểm console được thay bằng audit Lighthouse và kiểm tra HTTP.

Status: DONE_WITH_CONCERNS

Lighthouse xác nhận font không còn chặn render và LCP giảm; số KB login đã chuẩn hoá cache hit của mascot để so với lượt lạnh W-6. Console audit không có lỗi, nhưng không thể kiểm trực tiếp DevTools vì CUA không khả dụng trong phiên này.
