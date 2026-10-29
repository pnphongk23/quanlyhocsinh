# Web F: chụp và kiểm tra giao diện A/B/C/D

Đọc `briefs-web/common.md`. Chỉ đọc code và chụp; KHÔNG sửa `src/`, không commit. Ghi script/ảnh vào `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261028-ai-features/shots-web/` (script `shots.mjs` ở đó, ảnh tên `A-...`, `B-...`, `C-...`, `D-...` + `-390`/`-1440` + `-chromium`/`-webkit`).

Chạy bản web của worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh mvp-web đã commit; build `VITE_API_BASE_URL=https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1 npm run build` rồi `npx vite preview --port 4173`, tắt tiến trình khi xong; chỉ kill tiến trình bạn khởi chạy bằng PID đã lưu). Đăng nhập tài khoản QA web admin trong `~/.config/qlh/staging-smoke.txt` (khoá `phone`, `password`; không in ra; cách đăng nhập xem `plans/20261028-roles-permissions/smoke-deploy.mjs` và `plans/20261028-ai-features/smoke-send-comments.mjs`, dùng `getByLabel('Số điện thoại')` và `#login-password`). Browser: Playwright chưa có browser tải sẵn: dùng Chrome hệ thống (`channel: 'chrome'`) cho Chromium; cho Safari thử `npx playwright install webkit` rồi chạy webkit (iPhone 13 device ở 390; desktop 1440); nếu cài được thì chụp cả hai, nếu không được ghi rõ vào báo cáo "không chụp được WebKit vì ...".

Chỉ ĐỌC trên staging: không bấm Lưu/Thêm/Gửi, không tạo/sửa dữ liệu, không đổi quyền. Che SĐT trong ảnh (thay văn bản bằng `*** ***` bằng JS trước khi chụp; tên học sinh để nguyên vì là dữ liệu QA giả; nếu tên giống người thật thì che bằng CSS blur). Mở: một lớp có học sinh và buổi gần nhất:
- A: tab Nhận xét → "Theo tiêu chí" (mobile 390 và desktop 1440 hai cột), chạm 1-2 chip bằng chế độ xem (không lưu được thì chỉ chụp trạng thái mặc định; KHÔNG chạm chip vì chạm ghi vào outbox/staging — chỉ chụp).
- B: "Nhập từ ghi chú" mở hộp dán (dán một đoạn ghi chú giả có tên học sinh trong lớp), chụp màn xem trước với banner "Gợi ý từ ghi chú, kiểm tra rồi Lưu"; KHÔNG bấm Lưu.
- C: tab Học sinh → "Nhập danh sách" dán 5 dòng giả (tên + SĐT giả 09xx), chụp bảng xem trước (cảnh báo/trùng nếu có); KHÔNG bấm Thêm.
- D: Cài đặt → Nhân sự → ma trận có hàng "Gửi nhận xét" (Không/Sửa) ở cả hai thẻ; KHÔNG đổi giá trị.
Ghi nhận mọi lỗi giao diện thấy được (tràn chữ, che nút, chip tràn, hai cột lệch, chữ trắng trên nền sáng, thiếu hover/focus, console lỗi) kèm ảnh. Kiểm console (đếm lỗi, không in nội dung nhận xét/tên/SĐT).
Báo cáo `briefs-web/report-F.md` + trả lời ≤150 chữ: Status, danh sách ảnh, lỗi giao diện tìm thấy.
