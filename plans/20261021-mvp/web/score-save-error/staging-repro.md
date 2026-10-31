# Tái hiện lỗi lưu điểm trên staging

- Fixture giả được tạo trong workspace tài khoản smoke: lớp, học sinh `enrolled_at=2026-10-24`, bài kiểm tra `2026-10-20`.
- Lệnh chuẩn bị `test.create`: `applied`.
- Lệnh 1 `score.set` (điểm 7 cho học sinh mới): `applied`, không có mã lỗi.
- Lệnh 2 `test.create` trong cùng POST `/sync/push`: `applied`, không có mã lỗi.
- Lệnh sau vẫn được xử lý; máy chủ trả HTTP 200 và kết quả cho cả hai lệnh. Không có lệnh nào bị từ chối.
- Dọn dẹp đã được thử: bài kiểm tra bị xoá/lưu trữ qua `test.delete`, học sinh đánh dấu nghỉ, lớp lưu trữ. Chưa xác minh trạng thái cuối của từng bản ghi.
- Kết quả này không tái hiện banner lỗi đã nêu; API staging hiện nhận cả hai lệnh.
