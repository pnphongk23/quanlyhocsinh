# Handback tạm dừng — lane iOS ux-v2 (2026-10-24)

Người dùng tạm dừng lane qua GL #4 (4350a256-dd3a-41d8-8827-4b118a422623). Không tạo worker/reviewer, không sửa gì thêm cho tới khi GL báo lại.

## Trạng thái mã
- Nhánh `mvp-ios`, HEAD `5991ede`, chưa push/merge. Staging test (worker F báo, tích hợp đủ lane): 160 test, 2 skip, 0 lỗi.
- Commit lane: `7bf2933` (nền trạng thái + Mít), `6f8c1e6` (test bảng chuỗi), `70beecb` (B3 phụ huynh/Auth), `a923dd9`+`68082b9` (B2), `b995239` (B1), `61a9db4`, `114646a`, `1dda0c1` (header dưới status bar), `be81b2b`+`3ed9de2` (Gb), `19a9ba8` (Ga), `5991ede` (F restoreSession Keychain).
- 4 file M của người dùng (Info.plist, Localizable.xcstrings, 2 entitlements) chưa commit, không đụng.

## Còn nợ
- Review sol hẹp 1 vòng trên `1dda0c1..5991ede` (review đầu `review.md`: chưa giao được; 2 Cao + Vừa/Thấp đã giao sửa ở Ga/Gb/F, chưa kiểm lại).
- `verify-h.md` chưa viết. Bằng chứng ảnh đã có `shots/after/h-*.png` (mở lạnh ngoại tuyến, lưu điểm danh spinner/saved/pending, buổi chưa bản ghi trước/sau, lỗi tạo bài kiểm tra, bàn phím che nút đăng nhập) nhưng chưa có kết luận.
- 5 bước offline/PH chưa có ảnh: đồng bộ lại khi có mạng, PH mở buổi xem BTVN/phiếu chưa gửi, Dynamic Type 2 tab PH, hàng chọn con có nền selected, màn "chưa có con".
- `handback.md` mỗi mục một dòng theo brief 81: chưa làm (file này là bản tạm dừng).

## Chưa dọn (theo quyết định người dùng: để nguyên)
- `/tmp/qlh-build.lock` (owner H), simulator iPhone 16 đang bật, `/tmp/qlh-h-*`, app trong simulator có thể là bản trỏ `API_BASE_URL` cổng đóng, lớp thử `ZZ-offline-…` trên staging (workspace demo).
- Worker H `d8ca830b-1ab2-4558-bfb1-64ec3a253706` bị người dùng huỷ (agent còn sống, không chạy).

## Đã biết, ngoài lane
- Báo cáo theo khoảng buổi + email/quên mật khẩu: task iOS riêng sau ux-v2.
- Trang lớp phụ huynh thiếu tên giáo viên/lịch lớp (model dữ liệu thiếu); bàn phím che nút "Đăng nhập" (Vừa).

Ledger: `ledger.md`. Brief: `briefs/`.
