# Việc: đồng bộ `docs/spec.md` và `docs/architecture.md` theo quyết định 71 + 74

Bạn là worker. Thư mục `/Users/phamnhuphong/Git/quanlyhocsinh` (KHÔNG commit, không git checkout/reset/stash). Chỉ sửa 2 file: `docs/spec.md`, `docs/architecture.md`.

## Đọc
`plans/20261021-mvp/briefs/71-decisions-20261022.md`, `plans/20261021-mvp/briefs/74-decisions-20261022-b.md` (nguồn quyết định), `AGENTS.md`, hai file docs, `plans/20261021-mvp/backend/api-spec.md` (mục 4, 6, 10 bản mới), `plans/20261021-mvp/backend/handoff-lead.md` mục "Việc còn lại" 3, `design/prototype/src/data/logic.ts` (`consecutiveAbsences`) và cách đánh số buổi (`sessionNumber`).

## Sửa (văn phong như hiện có, tiếng Việt, ngắn, ghi "(đã chốt 2026-10-22)")
1. Tài khoản: bỏ mọi "Cấp mật khẩu"/mật khẩu tạm/bắt buộc đổi lần đầu/giáo viên cấp lại; phụ huynh tự đăng ký SĐT + mật khẩu tự đặt, tự liên kết theo SĐT (kể cả giáo viên khai sau), SĐT chưa khớp vẫn tạo được; giáo viên không quản lý mật khẩu của ai; bỏ mã đăng ký; quên mật khẩu (mọi người) = người vận hành đặt lại thủ công, OTP phase sau; rủi ro chiếm SĐT được chấp nhận tới phase OTP (mục 7 spec). Cập nhật mục 1, 2, 4, 5.1, 5.2, 5.3, 7, 8, 10 spec và các chỗ liên quan architecture (mục 2 Đăng nhập, 4, 5, 7, 8).
2. Băm mật khẩu: PBKDF2 30.000 vòng, vừa gói Free theo đo thật (`plans/20261021-mvp/backend/stack-and-cpu.md` mục 4.2); bỏ "nâng gói 5 USD" khỏi quyết định (giữ là phương án nếu sau này vượt). Q8, Q1, Q3 chốt; Q2 bỏ.
3. Điểm: cho phép số lẻ bước 0,5 trong 0..max (Q6 chốt).
4. Q16: mọi buổi chưa hủy có số (kể cả buổi sắp tới), buổi hủy không số — sửa câu "Số buổi chỉ đếm buổi đã diễn ra". Q15: cảnh báo khi 2 buổi đã diễn ra gần nhất liên tiếp là "Vắng" (Có phép, Muộn không tính; buổi hủy bỏ qua; chỉ học sinh đang học). Bỏ dòng rủi ro Q15 ở architecture mục 7.
5. Đồng bộ: xung đột "tới sau thắng" đã có; bỏ `sync_conflicts` khỏi danh sách bảng đang dùng (ghi "không dùng ở MVP"). Thêm các mục docs còn lệch: CORS (Bearer, origin cho phép) ở architecture; PDF báo cáo phát qua Worker (Q9) đã có thì giữ; Q17 (đổi lịch lặp khi buổi hôm nay đã có dữ liệu: giữ buổi hôm nay, áp lịch mới từ ngày mai).
6. Mascot "Mít": ghi một dòng ở spec mục 8 Bản đầu: mascot là lớp trang trí bổ sung (đăng nhập, màn trống, thành công, lỗi), không đổi luồng/nghiệp vụ; chi tiết ở `plans/20261021-mvp/design/mascot-v2/`.
7. KHÔNG đổi phần PDF (chờ người dùng). Cập nhật dòng "Cập nhật:" đầu mỗi file.

## Kiểm
`git diff --stat docs/`; tìm lại: không còn "Cấp mật khẩu", "mật khẩu tạm", "mã đăng ký", "chờ xác nhận" của phần đã chốt (ngoại trừ câu lịch sử nói rõ đã bỏ). Báo cáo `plans/20261021-mvp/briefs/75-docs-sync-71-74.report.md`: danh sách chỗ sửa theo mục, chỗ còn nghi vấn. Status + 2 câu.
