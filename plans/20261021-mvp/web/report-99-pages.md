# Báo cáo brief 99: trang Privacy và Support (web)

## Kết quả
- Hai trang HTML tĩnh tiếng Việt: `public/privacy.html`, `public/support.html` (mvp-web, commit fd20893, chưa push).
- Không JS, không tracking, không font ngoài (chỉ font Plus Jakarta Sans tự host ở `/fonts`). Style inline, chép các token cần dùng từ `design/tokens/tokens.css`, không ghi cứng màu/cỡ chữ/khoảng cách (trừ độ dày viền 1px và mốc media 1024px).
- Link Google Form: `https://forms.gle/PENDING`, đúng một chỗ mỗi trang (privacy: mục "Quyền của bạn và xoá tài khoản"; support: mục "Liên hệ hỗ trợ và xoá tài khoản"). GL thay bằng link thật rồi build/deploy lại.
- Tên pháp lý: ghi "Nhà phát triển ứng dụng", có chú thích `<!-- TODO tên pháp lý -->` ở `privacy.html`.
- Nội dung đối chiếu `docs/spec.md` và `metadata-vi.md` mục 9. Không nhắc push/FCM (hiện chưa thu thập). Không công khai email liên hệ.

## Deploy staging
- Deployment 9de88c02-50d4-4c90-a8e7-b5400df20289 (fd20893). Rollback: 26d01d81-fc65-4b62-92c5-9ae224a20f22 (52b79ec).
- `_redirects` (`/* /index.html 200`) không nuốt hai đường dẫn: file tĩnh `privacy.html`, `support.html` được Pages phục vụ ở `/privacy`, `/support`; không cần sửa `_redirects`/`_headers`.

## Kiểm chứng (curl, không Chromium)
- `/privacy` 200 `text/html; charset=utf-8`, title "Chính sách quyền riêng tư"; nội dung khớp `dist/privacy.html` (cmp).
- `/support` và `/support/` 200 text/html, title "Hỗ trợ người dùng"; khớp `dist/support.html`.
- `/` vẫn trả SPA, bundle `index-BjTshgny.js` không đổi.
- Mỗi trang có đúng 1 link PENDING.
- Chưa kiểm: hiển thị thực tế trên iPhone (chưa chụp màn; cần lượt Chromium nếu muốn).
- Lưu ý nhỏ: `/privacy.html` trả SPA (không redirect về `/privacy`); không ảnh hưởng, App Store dùng `/privacy`.

Status: DONE
Summary: Hai trang đã lên staging tại /privacy và /support, đúng nội dung, SPA không bị ảnh hưởng. Còn chờ GL thay link Form và tên pháp lý.
Concerns/Blockers: chưa xem giao diện trên màn hình thật.
