# P4 — Maestro + cổng kiểm UI

Commit (không push): 316861b `test(ios): update maestro flows for system tab bar`; 2f2a5cb `docs(ios): add ui verification gate`.

## Đã sửa
- guardian/01-tabs.yaml, guardian/tabs.yaml, guardian/02-ticket.yaml: bỏ id `guardian.tab.*` (tab bar hệ thống không có id) → chọn theo nhãn "Lớp học của con"/"Nhận xét của cô"/"Cài đặt"; Điểm/Báo cáo là nút trong tab Lớp (scrollUntilVisible rồi tap); quay lại bằng vuốt cạnh trái; nhãn phiếu đúng "Mở phiếu Buổi 8" (cũ "Mở phiếu buổi học buổi 8" đã sai từ trước); bỏ bước Điểm danh (không còn tab).
- staging/03-guardian-read.yaml: bỏ tab attendance, chờ "Nhận xét mới nhất", assert "Đi học", vào Báo cáo qua nút.
- auth/08-settings-guardian.yaml, auth/guardian-settings.yaml: Cài đặt là tab gốc, back bằng vuốt cạnh trái, bỏ assert 5 tab cũ. auth/09-settings-teacher.yaml: chỉ sửa chú thích.
- Flow GV khác (comments/homework/reports/scores) dùng màn demo riêng, không đụng shell → không đổi.
- Thêm ios/docs/ui-verification-gate.md (44 dòng) + trỏ trong ios/README.md.

## Đã chạy (iPhone 16, build /tmp/qlh-ux3-p3, màn demo qua run.sh, không đăng nhập)
- guardian/01-tabs.yaml: PASS toàn bộ (lần đầu fail vì "Danh sách buổi học" nằm dưới màn → đã đổi mốc chờ).
- guardian/02-ticket.yaml, auth/08-settings-guardian.yaml, auth/10-settings-blocked.yaml: PASS.

## Chưa chạy
- staging/03-guardian-read.yaml (cần đăng nhập staging, tránh khoá tài khoản; chưa submit lần nào).
- guardian/tabs.yaml, auth/guardian-settings.yaml (dùng launchApp arguments, Maestro 2.2.0 không truyền được; đã sửa nội dung theo cùng mẫu nhưng chưa kiểm).
