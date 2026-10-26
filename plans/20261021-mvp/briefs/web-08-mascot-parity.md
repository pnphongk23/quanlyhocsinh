# Việc G-C: Mascot Mít WebP + rà khác biệt giao diện còn lại + PWA

Worker: `codex/gpt-6-luna` (hoặc `peer`). BẮT BUỘC đọc `briefs/web-common-ui.md`, `briefs/74-decisions-20261022-b.md` (mục 7), `web/w3-report.md`, `web/w4-report.md`, `web/w5-report.md`, `src/README.md`.
Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Thư mục chính chỉ đọc (ngoại lệ: `plans/20261021-mvp/web/g-c-report.md` và `web/shots/gc/` ở thư mục chính). Không push/merge/checkout/reset/stash; không `git add -A`; không sửa `design/prototype`; không tạo agent; `srcwalk`.

## Bối cảnh song song
G-A làm `src/data/**`; G-B làm `src/roles/guardian/**`, `RegisterPage`, phần phụ huynh của `SettingsPage`. Bạn KHÔNG sửa các file đó.

## File được sửa (sở hữu)
`src/shared/ui/Mascot.tsx`, `src/shared/ui/EmptyState.tsx`, `src/shared/ui/ui.module.css` (phần mascot), `public/mascot/**`, và các màn giáo viên/tài khoản MỌI THƯ MỤC KHÁC trong `src/features/**` (ngoài `src/features/auth/RegisterPage.tsx` và phần phụ huynh của `SettingsPage`), `src/roles/staff/**`, `src/app/shell.module.css`, `index.html`, `public/manifest.webmanifest`, `vite.config.ts` (PWA).

## Làm
1. **Mascot WebP**: chép `design/prototype/public/mascot/*.webp` (+ `@2x`) vào `public/mascot` (bỏ PNG cũ nếu không dùng), thay `Mascot.tsx` bằng bản của prototype hiện tại (`design/prototype/src/shared/ui/Mascot.tsx`: `img` lazy + `srcset` 1x/2x, `width`/`height` theo tỉ lệ, trang trí `alt=""`; đủ tư thế main, vui, dong-vien, cho, chao, dang-tai, avatar, sao-1..3), đúng các chỗ prototype dùng trong màn giáo viên/tài khoản (Đăng nhập `chao`, EmptyState, phiếu nhận xét theo sao, ...: `srcwalk discover Mascot` ở prototype để lấy danh sách và đối chiếu từng chỗ; chữ ở Đăng nhập theo `plans/20261021-mvp/design/guardian/strings.md` mục "Mascot · đổi chữ": "Chưa có tài khoản? · Tạo tài khoản", bỏ thẻ gợi ý phụ huynh: NHƯNG file `LoginPage.tsx` chỉ sửa phần mascot; chữ đăng nhập/đăng ký do G-B sở hữu, báo G-B qua báo cáo "Cần G-B" nếu cần). Tổng dung lượng `public/mascot` và ảnh nạp ở màn đầu phải nhỏ (đo; ảnh không nằm trong JS bundle).
2. **Đối chiếu mọi màn giáo viên + tài khoản còn lại** với prototype hiện tại (đã đổi sau W-3/W-4: Design lead cập nhật prototype): tự chạy prototype (cổng khác 5173/5181) và bản thật (harness `src/test/w3-harness`, hoặc staging bằng tài khoản giáo viên demo, che SĐT) ở 390×844 và 1360×934 cho: Lớp, Tạo lớp, Lịch, Học sinh, Chi tiết lớp (5 tab), Buổi học (3 tab), Bài kiểm tra (tạo/sửa/lưu trữ), Điểm, Báo cáo (duyệt, xem trước), Đăng nhập, Quên mật khẩu, Chọn vai trò, Cài đặt (giáo viên), Đổi mật khẩu. Lập bảng khác biệt (màn, khác gì, sửa/chưa, lý do) trong `g-c-report.md`, sửa hết khác biệt hình thức nhìn thấy (so từng cặp ảnh; không chỉ tin báo cáo cũ). Lỗi đã biết: viết tắt avatar lấy "(" khi tên có ngoặc (`SettingsPage`/avatar: kiểm prototype xử lý thế nào; nếu cùng hành vi thì để, nếu prototype lọc thì làm giống).
3. **PWA**: kiểm hướng dẫn cài/“Mở bằng Safari” có trong prototype hiện tại không (inventory ghi: gắn với link mời đã bỏ ⇒ KHÔNG làm; xác nhận lại); inbox thông báo trong app: chỉ làm nếu prototype có UI (tìm trong `design/prototype/src`, ghi kết luận; thường là không). Kiểm lại manifest/icon (maskable), `theme-color`, màn khởi động; không thêm màn mới ngoài prototype.
4. Không sửa hành vi nghiệp vụ; chỉ giao diện/asset.

## Xong khi
`npm run typecheck`, `npm test`, `npm run build` xanh (dán số; JS ban đầu gzip, tổng KB `public/mascot`); ảnh + báo cáo; commit file của bạn. Kết thúc: Status + 2 câu.
