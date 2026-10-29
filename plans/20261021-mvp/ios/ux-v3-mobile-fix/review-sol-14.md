# Review vòng 1 · Brief 94

Phạm vi: a75d7f9, d27c5f6, 9d6fde4, 643fadd, 4532505; bỏ qua bốn file M. Đối chiếu spec chính, contract Brief 94, tokens/rules và HTML/PNG mock. Chỉ **Cao** chặn.

1. **Cao — Phụ huynh không tải được dashboard theo contract mới.** `ios/QuanLyLop/Core/Models/Entities.swift:159`; `ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:509`. API bỏ `note`, ghép vào `comment`; decoder vẫn bắt buộc `note`. Một phiếu mới gây `keyNotFound`, truyền lỗi qua `records` và toàn bộ dashboard. Cần nhận JSON phụ huynh mới; đồng thời giữ đoạn ghép của phiếu thang 3, vì `SlipRules.swift:60` hiện bỏ qua `comment` để dựng template.

2. **Cao — Chấm lại BTVN làm đổi phiếu đã gửi khi chỉ lưu ghi chú.** `ios/QuanLyLop/Features/Comments/SessionCommentsView.swift:390`–395, 743. Phiếu sent, criteria=15, hw_manual=false; chấm lại BTVN thành hoàn thành rồi mở phiếu: initializer đổi thành 31 bất kể status. Lưu note gửi cả criteria, đổi 4→5 sao và câu cho phụ huynh. Vi phạm quy tắc phiếu đã gửi giữ nguyên tới khi giáo viên tự đổi tiêu chí.

3. **Cao — Mất câu tay của phiếu 5 sao cũ.** `ios/QuanLyLop/Features/Comments/SessionCommentsView.swift:596`, 608, 743. Phiếu có comment riêng và note: mở chỉ thấy câu tự sinh; sửa note rồi Lưu vẫn gửi criteria dù không chạm tiêu chí. Theo contract, server sinh lại comment mỗi khi có criteria, nên câu tay bị thay vĩnh viễn. Cần giữ câu cũ khi mở và dùng payload chỉ-note nếu tiêu chí chưa đổi.

4. **Vừa — Lưới không thích ứng chữ trợ năng.** `ios/QuanLyLop/Features/Comments/SessionCommentsView.swift:538`, 570–571. Hai cột cố định, nhãn một dòng và chỉ co xuống 85%; ở cỡ Dynamic Type lớn, nhãn dài bị cắt, khó phân biệt tiêu chí. Cho xuống dòng hoặc đổi một cột tại cỡ trợ năng. Chưa xác minh bằng giao diện thực.

5. **Vừa — Thiếu test các đường tích hợp trên.** `ios/QuanLyLopTests/Core/SlipRulesTests.swift:38`; `ios/QuanLyLopTests/Classes/TeacherScreenshotTests.swift:59`; `ios/QuanLyLopTests/Scores/SendSlipsTests.swift:65`. Test câu giữ nguyên chỉ gọi helper, screenshot không thao tác; test nil chỉ bắt đầu với cờ false. Thiếu JSON phụ huynh bỏ note, lưu-note giữ câu cũ/phiếu sent, nil giữ hw_manual=true.

Kiểm chứng tĩnh: diff --check sạch; câu mẫu và vòng 32 mask đã đối chiếu; cờ true chỉ gửi khi chạm BTVN, nil giữ cờ cũ; cache thiếu cờ có fallback; không thấy log SĐT/nhận xét trong thay đổi. Màu/kích thước mới chủ yếu dùng token, nút tiêu chí ≥44pt.

Tôi không thể xác minh điều này hoạt động vì fixture Swift bị sandbox chặn module cache; Swift tự dò SDK qua xcodebuild. Không build dự án hoặc chạy simulator.

Status: DONE_WITH_CONCERNS
