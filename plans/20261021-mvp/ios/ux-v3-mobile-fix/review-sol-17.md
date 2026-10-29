# Review vòng 2 · iOS

Phạm vi: `e864f8f..93ccb17`, chỉ `ios/`; bỏ qua bốn file M, không kiểm #2. Không phát hiện Cao. Đường dẫn dưới tính từ `ios/`.

- **#1 — Sửa phần chính, backlog Vừa:** `QuanLyLop/Features/Scores/ScoresFeatureStore.swift:362–391` refresh từng phiếu, bỏ phiếu sent, chặn khi session đang gửi; UI khóa Gán mặc định lúc saving. Draft hợp lệ vẫn được ghi, giữ note, reset hwManual; test dòng 227–245 bao phủ. Tuy nhiên guard đang-gửi nằm trước `await refresh()`, chưa kiểm lại sau await: gửi bắt đầu trong khoảng này vẫn có thể xen vào. Hai test mới (`QuanLyLopTests/Scores/SendSlipsTests.swift:248–272`) seed chỉ slip, thiếu student; nếu bỏ cả guard, vòng ghi vẫn skip vì không tìm thấy student. Cần fixture đủ và test đảo thứ tự/chuyển sent giữa các lượt.
- **#3 — Đúng:** `QuanLyLop/Features/Comments/CommentsRules.swift:87–92` chỉ ràng attendance khi chưa có phiếu; legacy chưa sao nhận default dù Vắng/chưa điểm danh. Test `QuanLyLopTests/Comments/CommentsRulesTests.swift:66–73` bao phủ hai nhánh. Đường gửi cả lớp truyền defaults qua `QuanLyLop/Features/Scores/ScoresFeatureStore.swift:407–412,453–460`; chưa có integration test legacy này.
- **Phone-check — Đúng qua đọc mã:** 422 invalid_phone, 429 dùng Retry-After; unlock xóa deadline, Observation mở nút, controller lỗi về idle nên thử lại được. Test mới chỉ kiểm khóa ban đầu, thiếu hết hạn rồi gửi lại.
- **Token/tap — Đúng ở nguồn:** input 52, padding token, dialog dùng token, Đổi số có minHeight 44/contentShape. Chưa đo UI; không thấy regression trực tiếp.

`git diff --check` pass. Tôi không thể xác minh điều này hoạt động khi chạy vì yêu cầu cấm simulator/xcodebuild; số 293 pass/0 fail/2 skip do bên giao cung cấp.

Status: DONE_WITH_CONCERNS
