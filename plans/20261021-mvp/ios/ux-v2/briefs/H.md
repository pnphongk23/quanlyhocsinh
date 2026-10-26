# Brief H — Bằng chứng chạy thật cho HEAD 5991ede (luna, KHÔNG sửa Swift)

Đọc: `b-common.md`, `briefs/F.md` mục 3 (kiểm UI offline, quy tắc dữ liệu thử), `review.md` mục 10 (những gì còn thiếu bằng chứng), `verify.md`, `verify-e.md`, `verify-f.md`, `diagnosis-login.md`.
Ứng viên: nhánh `mvp-ios` HEAD `5991ede` (test Staging 160/2 skip/0 lỗi do F báo). Snapshot vào `/tmp/qlh-h-src`, build ad-hoc, khoá build owner "H". Chỉ iPhone 16 (SE chỉ khi nêu rõ).
Công cụ: Maestro (`~/.maestro/bin/maestro --device <UDID> test --no-reinstall-driver`) + `xcrun simctl`; KHÔNG dùng "CUA"/tool GUI khác (lượt F timeout). Đăng nhập: flow `ios/maestro/staging/01-login.yaml` (`-e STAGING_PHONE`, `-e STAGING_PASSWORD`, SĐT 9 số) đúng 1 lượt mỗi tài khoản; nếu kẹt: dừng, ghi ảnh + log, báo — không lặp.
Dữ liệu: mọi thao tác GHI chỉ trong lớp thử `ZZ-offline-<số>` (1 học sinh giả) tạo qua UI trong workspace demo khi còn online. Không đổi gì khác của demo. Xong: xoá/lưu trữ lớp thử nếu UI cho phép, không thì ghi tên vào verify-h.md.

## Việc (mỗi mục: đạt/chưa + ảnh/khung trong `shots/after/h-*.png`, ghi `ux-v2/verify-h.md`)
1. **Ngoại tuyến mở lạnh** (lỗi Cao đã sửa ở F): đăng nhập GV (online), tạo lớp ZZ-offline + 1 học sinh, tạo 1 buổi hôm nay nếu lớp chưa có (hoặc dùng buổi sinh sẵn); đảm bảo đồng bộ xong; cài đè build `API_BASE_URL='http:/$()/127.0.0.1:9/v1'` CÙNG chữ ký/bundle (không uninstall); `simctl terminate` + mở lại ⇒ phải vào "Lớp của tôi" từ cache (ảnh), KHÔNG ở màn đăng nhập.
2. **Lưu ngoại tuyến**: trong lớp ZZ, điểm danh buổi (đổi học sinh sang Vắng) ⇒ Lưu ⇒ quay video `simctl io recordVideo`, trích khung (`ffmpeg -vf fps=15` hoặc tương đương; ffmpeg thiếu thì AVFoundation/`sips`… hoặc báo) để có: spinner, "✓ Đã lưu", rồi pill "Chờ đồng bộ"/"Đã lưu trên máy · sẽ đồng bộ khi có mạng". Ghi thời lượng ước lượng của từng pha (≥400 ms spinner, ≈1,6 s "Đã lưu"). Thử thêm nhập 1 ô điểm (lớp ZZ có 1 bài kiểm tra tạo online trước).
3. **Buổi chưa có bản ghi** (lỗi Cao đã sửa ở Ga): lớp ZZ buổi mới ⇒ nút "Lưu điểm danh" bật khi bấm "Tất cả có mặt" (ảnh trước/sau).
4. **Phục hồi mạng**: cài lại build thường ⇒ mở app ⇒ đồng bộ đẩy lệnh chờ lên (pill biến mất, kiểm bằng ảnh), xác nhận bản ghi còn đúng.
5. **Lỗi máy chủ từ chối** (nếu tạo được an toàn trong lớp ZZ; nếu không, ghi "không tạo được an toàn"): ghi nhận lỗi giữ editor + dữ liệu.
6. **PH**: đăng nhập PH demo (đúng 1 lượt), tab "Lớp học của con" ⇒ danh sách buổi ⇒ mở 1 buổi (đã diễn ra có BTVN) xem BTVN/phiếu chưa gửi ("Cô chưa gửi phiếu buổi này") — ảnh; Dynamic Type `extra-extra-large` ở tab 1 và tab 2 (ảnh `h-ph-dt-*.png`, trả về `large` sau); hàng chọn con (tài khoản 2 con) có nền selected; empty có Mít (nếu có tài khoản/ca nào; không tạo tài khoản thật).
7. Bàn phím che nút "Đăng nhập": chụp 1 ảnh minh hoạ trên iPhone 16 khi bàn phím mở (mức Vừa đã biết) và ghi phím Return có gửi form không (`submitLabel`/`onSubmit` trong AuthScreens/AuthComponents — chỉ đọc).

## Dọn
Nhả khoá; xoá `/tmp/qlh-h-*`; tắt simulator; trả cỡ chữ về `large`; cài lại build thường (không để bản endpoint-lỗi).

Handback ≤150 từ: mục đạt/chưa 1–7, ảnh chính, lớp ZZ còn lại hay đã dọn, lỗi mới (mức + file:dòng nếu đọc được).
