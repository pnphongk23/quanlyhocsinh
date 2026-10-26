# Fixture iOS cho brief 96: lớp có BTVN buổi trước

Lý do: lớp `Lớp Smoke FB2` buổi trước không giao BTVN nên iOS chưa kiểm được TC-CMT-014/020/022 (tự tích BTVN, chấm lại sửa phiếu nháp buổi kế, nhãn). Buổi tương lai khoá phiếu và gửi; buổi quá khứ không tạo mới được. Công thức dùng được (đã chạy trên web, `qa/maestro/web/slip-homework-regrade.mjs`):

1. Tạo lớp `QA-iOS-HW-<ddmm>` trong workspace smoke bằng web (Playwright, một lượt Chromium do GL cấp; script hiện tạo lớp và buổi ở các bước đầu):
   - Buổi N = buổi lặp hôm nay có sẵn (18:00); buổi N+1 = buổi lẻ hôm nay 21:00 (buổi lẻ trùng giờ buổi lặp bị từ chối).
   - 4 học sinh QA: HS-1..HS-4. Điểm danh Có mặt cho cả bốn ở N và N+1 (gửi phiếu cần điểm danh đã lưu).
2. Ở N tab Bài tập về nhà → "Bài tập hôm nay": giao 1 phần BTVN cho cả lớp.
3. Ở N+1 tab Bài tập về nhà → "Bài tập buổi trước": chấm HS-1 "Chưa hoàn thành", HS-2 "Hoàn thành", để HS-3 chưa chấm; HS-4 thêm sau (chưa có phiếu).
4. Trạng thái phiếu N+1 để kiểm: HS-1 nháp; HS-2 nháp đã tích tay BTVN; HS-3 đã gửi (sau khi điểm danh); HS-4 mới thêm chưa phiếu; thêm buổi N+2 (lẻ hôm nay 22:00) để kiểm "buổi kế".
5. Trên iOS: đăng nhập chỉ qua Maestro `-e` (không gõ tay), mở lớp, "Xem buổi" N+1, tab Nhận xét. Chấm lại ở N rồi quay N+1 để kiểm TC-CMT-020.

Chưa làm được trong lượt hiện tại: GL chưa cấp lượt Chromium/simulator cho brief 96, nên fixture chưa được tạo (chỉ có công thức). Chưa có iOS build có tính năng brief 96 (câu sửa tay, vuốt điểm danh, đăng nhập 2 bước, Gán tất cả mặc định); chờ lane iOS xong rồi QA chạy.
