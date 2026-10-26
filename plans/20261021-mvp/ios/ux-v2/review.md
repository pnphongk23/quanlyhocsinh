# Review iOS ux-v2

Ứng viên `af8082a..1dda0c1`; bốn file M ngoài phạm vi. Đường dẫn Swift dưới `ios/QuanLyLop/`; ảnh dưới `shots/after/`.

| # | Tiêu chí | Kết quả, bằng chứng |
|---|---|---|
|1|Parity/IA|CHƯA: hai tab/chip/avatar đúng (`GuardianRootView.swift:163,230`); danh sách buổi sai IA (`GuardianPages.swift:79`). Ngày dạy đúng (`TeacherSessionDetailView.swift:87`), header đúng ảnh `e1-se3-scores.png`.|
|2|Lưu/gửi/tạo|CHƯA: controller đúng timing (`SaveController.swift:38`), tích hợp còn lỗi bên dưới. Nút báo cáo cũ: `MonthlyReportView.swift:223,293,367,621` (chỉ áp trạng thái chung). `AuthSubmitButton` còn ở `AuthScreens.swift:190` chỉ là Quay lại; nút Tạo mở editor không ghi dữ liệu.|
|3|Empty/Mít|CHƯA: wrapper cũ đã gọi chung (`TeacherUI.swift:370`, `GuardianComponents.swift:543`); empty PH vẫn chữ thường (`GuardianPages.swift:66,95,151`, `GuardianTicketView.swift:43,75`). Không thấy gọi Mít trực tiếp trong Features.|
|4|Selected fill|CHƯA: tab/chip/card đúng (`Components.swift:178,205,369`); hàng chọn con chỉ check (`GuardianRootView.swift:218`).|
|5|Token|CHƯA: mã thêm ghi cứng spacing/font (`SaveStatus.swift:111,112`, `SaveButton.swift:24`, `AuthScreens.swift:317,337`). Chỉ xét dòng thêm.|
|6|API/sync/storage/log|ĐẠT: diff không đổi Core Networking/Sync/Storage/Security/backend; đăng ký dùng endpoint có sẵn (`AuthService.swift:184`); không thêm lời gọi log.|
|7|Test/localization|CHƯA: `verify-e.md:9`: 151 test, 2 skip, 0 lỗi; Keychain signing/screenshot bị skip. Test timing/lỗi/chống submit kép có assertion (`DesignSystemStatesTests.swift:39,63,82`); catalog riêng được phủ (`LocalizationCatalogTests.swift:64,92`). Tự kiểm 32 tham chiếu bảng: không thiếu. Features không thêm literal Việt; gallery mới còn ghi thẳng (`Previews.swift:122`).|
|8|Truy cập|CHƯA: nút ≥44/VoiceOver/Reduce Motion có mã (`Components.swift:24,487`, `SaveButton.swift:36`); PH Dynamic Type chưa kiểm, font cố định (`Tokens.swift:92,178`).|
|9|Logic/Auth|CHƯA: hồi quy điểm danh bên dưới; logout vẫn chặn pending (`SessionController.swift:20`), Keychain không đổi. Không thấy leak vô hạn; chống submit kép có guard (`SaveController.swift:39`).|
|10|Kiểm chạy|CHƯA: ảnh xác nhận IA/ngày/header/Mít/selected; `p16-gv-state-saving.png` có spinner, `p16-gv-state-saved.png` không có “Đã lưu”. Ngoại tuyến/lưu lỗi/PH Dynamic Type/chưa có con chưa có bằng chứng chạy (`verify.md:51,53,56`; `verify-e.md:18`).|

Phát hiện:

- **Chặn:** không phát hiện mới.
- **Cao — `TeacherAttendanceView.swift:53,103`:** buổi chưa có bản ghi mặc định Có mặt; “Tất cả có mặt” vẫn không bật Lưu. Đã chạy Swift với nguyên predicate: cả hai trường hợp trả false. Phân biệt thiếu bản ghi với bản ghi Có mặt; thêm test tích hợp.
- **Cao — `GuardianRootView.swift:101` / `GuardianPages.swift:98`:** gắn danh sách điểm danh không có action, chỉ lấy buổi held (`GuardianRepository.swift:57`). Không mở được buổi chưa gửi phiếu để xem BTVN đã giao. Dùng danh sách buổi có action, gồm buổi tương lai/hủy.
- **Vừa — `SaveStatus.swift:17`:** lỗi mạng đồng bộ ghi failed, lấn nhãn offline (`SyncCoordinator.swift:88`). Swift tái hiện offline→error; tách lỗi mạng khỏi từ chối lệnh.
- **Vừa — `TeacherClassDetailView.swift:170` / `AuthService.swift:221`:** timer đóng chạy trước success; Auth chuyển màn ngay trong work. Success bị rút ngắn/mất; điều hướng sau phase success.
- **Vừa:** token, empty, Dynamic Type và thiếu kiểm chạy ở mục 3/5/8/10: dùng token/thành phần chung, font co giãn; bổ sung bằng chứng.
- **Thấp — `GuardianRootView.swift:218` / `Previews.swift:122`:** hàng chọn con thiếu fill; gallery ghi thẳng tiếng Việt. Thêm nền selected và dùng catalog riêng.

Đã biết: cold-start offline **Cao**, ngoài diff (`AuthService.swift:105`); bàn phím **Vừa**; metadata lớp PH **Vừa**. Không báo lại thành lỗi mới. Không chấm lỗi giờ kết thúc/bảng cuộn ngang; báo cáo không dựng lại.

**Chưa giao được:** sửa hai Cao và các mục CHƯA. Reviewer tự chạy predicate/catalog/diff-check, đọc ảnh; không chạy lại toàn suite/app. Tôi không thể xác minh các flow còn thiếu hoạt động vì chưa có bằng chứng runtime tương ứng.
