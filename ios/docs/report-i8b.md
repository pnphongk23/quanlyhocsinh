# Báo cáo I-8B · Đối chiếu Giáo viên A (Lớp, Buổi học, Điểm danh)

Nhánh `mvp-ios`, worktree `mvp-ios`, thư mục `ios/`. Nguồn chuẩn: `briefs/ios-08-cmp-common.md`,
`briefs/ios-08b-cmp-teacher-a.md`, `briefs/ios-common-feature.md`, `briefs/ios-ui-rule.md`,
prototype `design/prototype/src` (chạy `npm run dev -- --port 5182`, chỉ đọc).

Phạm vi: `Features/Classes/**`, `Features/Attendance/**` và `QuanLyLopTests/Classes/**`.
Không sửa `App/**`, `Core/**`, `project.yml`, không đụng file của gói khác.

## Đã làm

Dựng lại toàn bộ giao diện giáo viên A theo đúng số đo prototype (390×844), thay bản I-3
dùng `Form`/`AppCard` mặc định:

- **Tab bar giáo viên**: thanh tab tự dựng thay `TabView` bản địa — 3 mục Lớp / Lịch / Cài đặt,
  icon 22, nhãn 12/600, viền trên 1px, mục đang chọn có gạch 3px màu primary (`shell.module.css`).
- **Lớp của tôi**: eyebrow “Xin chào, …”, tiêu đề 26/700, avatar 44 (mở tab Cài đặt), thẻ “Hôm nay”
  nền primary (đệm 12/16, chữ 14 + 18/700, nút “Điểm danh” nền trắng), thẻ lớp 16/700 + hai chip
  đệm 8/10 bo 10 với số in đậm, FAB 56 nền primary đổ bóng. Bỏ ô tìm kiếm (prototype mobile không có).
- **Tạo lớp mới**: màn đẩy (không phải sheet), nút back trong suốt 44, tiêu đề 22/700, ô nhập 52
  bo 14 viền 1.5, 7 ô ngày T2→CN (44 cao, bo 12, chọn = nền primary), ô giờ 52 có icon đồng hồ,
  dòng ghi chú thang điểm 14 xám, thẻ “Thêm học sinh vào lớp”, nút “Tạo lớp” 52 sát đáy.
- **Chi tiết lớp**: đầu màn trắng (back 44, tên lớp 22/700, nút “⋯”), 5 tab chữ 13/600 cao 48
  gạch chân 3px đúng thứ tự Buổi học · Bài kiểm tra · Điểm · Học sinh · Báo cáo; menu “⋯” là bảng
  220px (mục 48 cao, 15/600, icon 18, mục nguy hiểm đỏ, scrim 40%), gồm Sửa lớp · Sửa lịch học ·
  Lưu trữ lớp (lưu trữ ngay, lỗi hiện băng đỏ, lớp đã lưu trữ chỉ còn dòng “Lớp này đã lưu trữ.”).
- **Buổi học**: nhãn nhóm 14/600, thẻ “Buổi hiện tại” (16 đệm, tiêu đề 18/700, giờ 14 xám, nút chính
  52 “Điểm danh”/“Xem buổi”, dòng “Điểm danh mở vào ngày học.”, hai nút phụ “Sửa buổi lẻ”/“Hủy buổi”),
  khối “Sắp tới (n buổi)” thu gọn được, danh sách “Các buổi đã qua” (hàng 56, bo 12, tiêu đề 16/600,
  meta 14 xám, mũi tên 44), pill “Đã huỷ”, FAB “Thêm buổi”, hộp xác nhận huỷ buổi.
- **Chi tiết buổi**: đầu màn trắng (tên lớp 13 xám, “Buổi N · dd/mm” 20/700, pill “Đã huỷ”, nút “⋯”),
  3 tab đều nhau 14/600, thẻ “Người dạy” (Giáo viên chính + Trợ giảng “Không có”, avatar 40), trạng thái
  huỷ theo ảnh 76 (thẻ ngày + khối rỗng + “Về danh sách buổi”).
- **Điểm danh**: hàng tóm tắt “N vắng mặt” (số đỏ) + nút “Tất cả có mặt”, dòng nhắc vuốt, hàng học sinh
  (56 cao, avatar 36, tên 16/500, nút trạng thái 96×44 chứa pill 13/600), ô “Đến lúc”/“Ghi chú” khi
  Muộn, thẻ “Cần chú ý”, nút “Lưu điểm danh” 52. Bốn trạng thái Có mặt → Vắng → Muộn → Có phép theo
  đúng thứ tự hợp đồng; bấm để đổi hoặc **vuốt** (phải = vắng, trái = muộn) như prototype.
  Trước ngày học: băng nhắc nền primary-soft, hàng mờ 0.6, nút “Điểm danh” bị vô hiệu hoá xám.
- **Học sinh**: dòng thống kê “n đang học · n đã nghỉ (giữ lịch sử) · n vắng 2 buổi liền”, thẻ 64 cao
  (avatar 40, tên 16/600, “Phụ huynh · SĐT” 13, “Vào lớp …” 12, pill “Đã nghỉ”, nút “⋯”), FAB
  “Thêm học sinh”, sheet thêm (nhãn “Họ và tên học sinh”, “Số điện thoại phụ huynh (tuỳ chọn)”, ghi chú,
  “Lưu học sinh”), sheet “Tuỳ chọn học sinh”, hộp “Đánh dấu học sinh đã nghỉ?”, sheet mật khẩu tạm hiện
  đúng một lần.
- **Lịch**: tiêu đề 26/700, segmented Ngày | Tháng (14/600, bo 8, mục chọn có bóng), chip lọc theo lớp
  (36 cao, bo 8), thanh ngày (thẻ trắng đệm 6, hai nút 44 nền bg, “Hôm nay”/“Về hôm nay”), thẻ buổi
  (lead 56, tên lớp 16/600, meta “Buổi N · …”, pill trạng thái hoặc nút “Điểm danh”), lịch tháng
  (grid 7 cột, T2→CN 13/600, ô 44 bo 12, hôm nay viền primary 1.5, ngày chọn nền primary + chấm trắng,
  chấm 5px cho ngày có buổi, “Về tháng này”), trạng thái rỗng 72 vòng tròn + tiêu đề 20/700 + mô tả 16.

Quy tắc nghiệp vụ đưa về đúng prototype (đều có test):

- `sessionNumber` chỉ lấy từ server; buổi huỷ không có số → nhãn “Buổi bù”/“Buổi học”
  (`sessionPrefix` của prototype).
- Chia buổi “hiện tại / sắp tới / đã qua” theo `splitSessions` (hôm nay, nếu không có thì buổi kế tiếp).
- Cảnh báo vắng: đếm số buổi `held` liền kề gần nhất bị Vắng (`consecutiveAbsences`), hiện ở thẻ
  “Cần chú ý” và dòng thống kê học sinh.
- Chuyên cần bỏ “Có phép” khỏi mẫu số (`attendanceRate` của prototype; khớp ghi chú
  “Có phép không bị trừ chuyên cần”).

## Lệnh và kết quả

| Lệnh | Kết quả |
|---|---|
| `cd ios && xcodegen generate` | Tạo project OK. |
| `xcodebuild … -derivedDataPath /tmp/qlh-dd-i8b build` (worktree chung) | **ĐỎ**, nhưng chỉ ở file của gói khác đang sửa dở: `Features/Auth/DemoScreens.swift`, `Features/Auth/AuthScreens.swift`, `Features/Auth/AuthSettingsView.swift`, `Features/Guardian/GuardianRepository.swift`, `Features/Guardian/GuardianPages.swift`. Không có lỗi nào thuộc `Features/Classes/**`, `Features/Attendance/**`. |
| `git archive HEAD` → `/tmp/i8b-verify` + chỉ chép file của gói này → `xcodegen` + `xcodebuild … build` | `** BUILD SUCCEEDED **` (không cảnh báo Swift mới). |
| `… test -only-testing:QuanLyLopTests/TeacherFeatureTests -only-testing:QuanLyLopTests/TeacherScreenshotTests` (cùng cây sạch) | `** TEST SUCCEEDED **` — 8 test, 0 lỗi: 4 test cũ + 4 test mới cho quy tắc prototype + 1 test render ảnh. |
| `TEST_RUNNER_QLH_SCREENSHOT_DIR=ios/docs/screens xcodebuild … test -only-testing:…/TeacherScreenshotTests` | Sinh 16 ảnh `ios/docs/screens/{classes,attendance}/*-ios.png` (+ bản `-ios-full.png` toàn trang). |

Cây chung hiện chưa build được vì các gói I-8A/I-8C đang sửa song song `Features/Auth`,
`Features/Guardian` trong cùng worktree; tôi không sửa các file đó. Trước khi báo DONE cần chạy lại
lệnh build/test đầy đủ khi các gói kia xanh.

## Ảnh đối chiếu (390×844)

Prototype: `npm run dev -- --port 5182`, đăng nhập demo → vai trò Giáo viên, chụp bằng Chrome headless
(`agent-browser set viewport 390 844`).

| Màn | Prototype | iOS |
|---|---|---|
| Lớp của tôi | `classes/class-list-proto.png` | `classes/class-list-ios.png` |
| Tạo lớp mới | `classes/new-class-proto.png` | `classes/new-class-ios.png` |
| Chi tiết lớp (tab Buổi học) | `classes/class-detail-proto.png` | `classes/class-detail-ios.png` |
| Menu “⋯” của lớp | `classes/class-detail-menu-proto.png` | `classes/class-detail-menu-ios.png` |
| Buổi học | `classes/sessions-proto.png` | `classes/sessions-ios.png` |
| Học sinh | `classes/students-proto.png` | `classes/students-ios.png` |
| Sheet thêm học sinh | `classes/students-add-proto.png` | `classes/students-add-ios.png` |
| Sheet tuỳ chọn học sinh | `classes/students-options-proto.png` | `classes/students-options-ios.png` |
| Lịch theo ngày (+ rỗng) | `classes/schedule-day-proto.png` | `classes/schedule-day-ios.png` |
| Lịch theo tháng | `classes/schedule-month-proto.png` | `classes/schedule-month-ios.png` |
| Rỗng: chưa có lớp / học sinh / lịch | (dùng chung `EmptyState`, không có ảnh riêng) | `classes/class-list-empty-ios.png`, `classes/students-empty-ios.png`, `classes/schedule-empty-ios.png` |
| Điểm danh | `attendance/attendance-proto.png` | `attendance/attendance-ios.png` |
| Điểm danh khi chưa tới ngày | `attendance/attendance-locked-proto.png` | `attendance/attendance-locked-ios.png` |
| Buổi đã huỷ | `attendance/session-cancelled-proto.png` | `attendance/session-cancelled-ios.png` |

**Cách chụp iOS (khác brief, cần lead biết):** app không có đường đăng nhập demo và `ContentView`/
`AuthFlowView` nằm ngoài phạm vi file của gói này, nên ảnh iOS là `ImageRenderer` của **chính các view
SwiftUI thật** với dữ liệu tổng hợp (`Features/Classes/TeacherDemoScreens.swift`, chỉ biên dịch ở Debug),
khung 390×844, scale 2. Hệ quả: không có thanh trạng thái/safe-area của thiết bị, `TextField` được vẽ
bằng chữ trong cùng khung (UIKit text field không rasterise được), và sheet không có tay nắm/bo góc
trên. Nếu lead mở một dòng `QLH_DEMO_SCREEN=teacher-*` trong `App/ContentView.swift` (giống
`DemoScreens` của I-8A) thì có thể chụp lại bằng `xcrun simctl io` đúng brief.

## Bảng khác biệt

| Màn | Khác gì | Đã sửa/chưa | Lý do |
|---|---|---|---|
| Tab bar | Prototype dựng tab bar riêng (icon nét 22, nhãn 12/600, gạch 3px trên); trước đây iOS dùng `TabView` bản địa (icon SF Symbol khác, nhãn 10, không gạch trên). | Đã sửa (tab bar tự dựng) | Cần khớp hình thức; icon SF Symbol gần nhất (`book`, `calendar`, `slider.horizontal.3`) thay bộ icon SVG của prototype. |
| Lớp của tôi | Bỏ ô tìm kiếm mobile và nút “Tạo lớp mới” dạng thanh dưới; thêm FAB 56, thẻ “Hôm nay”, chip có số in đậm. | Đã sửa | Theo `ClassListPage.tsx` + `classes.module.css`. |
| Danh sách lớp | Prototype hiện cả lớp đã lưu trữ trong “Lớp của tôi”; iOS giữ nguyên cách hiện mọi lớp và sắp theo tên. | Giữ | Prototype không có ảnh trạng thái lớp đã lưu trữ; thứ tự chữ cái là hành vi có từ I-3, không phải khác biệt hình thức. |
| Tạo lớp | Trước là `Form` trong sheet; nay là màn đẩy đúng bố cục, ô giờ 52 có icon đồng hồ, chọn giờ bằng wheel của iOS. | Đã sửa | Chọn ngày/giờ là hành vi bản địa được phép khác; hình thức khi thu gọn khớp prototype. |
| Chi tiết lớp | Đổi thứ tự/nhãn tab thành Buổi học · Bài kiểm tra · Điểm · Học sinh · Báo cáo (trước: Buổi học · Học sinh · Điểm danh · Bài kiểm tra · Bảng điểm · Báo cáo), bỏ tab thừa, tab 13/600 có gạch chân, menu “⋯” 220px thay `Menu` hệ thống. | Đã sửa | Theo `ClassSpaceLayout.tsx`. |
| Menu lớp | Prototype lưu trữ lớp ngay, không hỏi; trước đây iOS có hộp xác nhận. | Đã sửa | Theo `ClassOptionsMenu`/`ClassSpaceLayout`; lỗi lưu trữ hiện băng đỏ trong màn. |
| Sửa lịch học | Prototype xem trước buổi thêm/bớt/đổi giờ trước khi lưu (`previewScheduleChange`); iOS chỉ sửa ngày + giờ rồi lưu. | Chưa | Core/API iOS chưa có endpoint xem trước thay đổi lịch; ghi thành câu hỏi bên dưới. |
| Buổi học | Trước là danh sách thẻ có nút Điểm danh/Huỷ trên mọi thẻ; nay đúng nhóm “Buổi hiện tại”/“Sắp tới”/“Các buổi đã qua”, thẻ hiện tại có nút chính 52. | Đã sửa | Theo `SessionsTab.tsx` + `sessions.module.css`. |
| Khôi phục buổi huỷ | Prototype có nút “Khôi phục buổi học”; iOS không có. | Chưa | API spec không có endpoint đổi buổi `cancelled` → `planned`; không tự thêm. |
| Điểm danh | Trước là thẻ + nút chu kỳ có icon; nay hàng 56, pill trạng thái 96×44, hàng tóm tắt, thẻ “Cần chú ý”, khoá trước ngày học, thêm thao tác vuốt. | Đã sửa | Theo `AttendancePanel.tsx` + `AttendancePanel.module.css`. Ô “Đến lúc” là `TextField` (prototype là `input[type=time]`); nhập giờ bằng bàn phím là khác biệt bản địa. |
| Học sinh | Trước là thẻ có menu “Thao tác”; nay dòng thống kê + thẻ 64 + FAB + sheet thêm/sheet tuỳ chọn/hộp xác nhận nghỉ. | Đã sửa | Theo `StudentsPage.tsx`. |
| Tuỳ chọn học sinh | Prototype mobile chỉ có “Đánh dấu nghỉ”; iOS thêm “Sửa số điện thoại” và “Cấp mật khẩu” trong cùng sheet. | Đã sửa (khác prototype) | Brief I-8B yêu cầu hai thao tác này; chúng chỉ có ở `StudentsDesktop` của prototype. Cần lead duyệt vị trí. |
| Thứ tự học sinh | Prototype liệt kê theo thứ tự dữ liệu; iOS sắp theo tên (A→Z). | Giữ | Sắp theo tên là quy ước có từ I-3 ở tầng dữ liệu, không phải khác biệt bố cục/màu/chữ. |
| Thẻ “Người dạy” | Prototype lấy giáo viên/trợ giảng từ phân công; iOS hiện người đang đăng nhập là “Giáo viên chính”, trợ giảng “Không có”. | Chưa | Phân công giảng dạy nằm ngoài Bản đầu (spec mục 8) và không có trong dữ liệu iOS. |
| Lịch | Trước là `DatePicker` tháng hệ thống; nay segmented Ngày/Tháng, chip lọc lớp, thanh ngày, lịch tháng 7 cột tự dựng, nhóm “Chưa điểm danh”/“Sắp tới”. | Đã sửa | Theo `SchedulePage.tsx` + `schedule.module.css`. |
| Trạng thái rỗng | Dùng đúng khối rỗng 72px vòng tròn, tiêu đề 20/700, mô tả 16 xám. | Đã sửa | Theo `.empty` của prototype. |
| Thanh “đang lưu”/lỗi đồng bộ | Băng trạng thái nằm ở khung app (`Core/DesignSystem/SaveStatusBanner.swift`, gói I-8A), không nằm trong ảnh của gói này. | Chưa (ngoài phạm vi) | Thuộc `App/**`/`Core/**`; ảnh chụp bằng `ImageRenderer` không có khung app. |

## Câu hỏi

1. **Khôi phục buổi học đã huỷ**: prototype cho khôi phục, `api-spec.md` chưa có endpoint đổi
   `cancelled` → `planned`. Có bổ sung API (và làm nút “Khôi phục buổi học”) trong Bản đầu không?
2. **Sửa lịch học có xem trước**: prototype tính trước số buổi thêm/bớt/đổi giờ trước khi lưu. iOS chỉ
   có PATCH lớp. Cần lead quyết định có mở preview ở core/API hay chấp nhận lưu trực tiếp.
3. **Vị trí “Sửa SĐT” và “Cấp mật khẩu”**: prototype mobile không có hai mục này (chỉ có ở bảng desktop),
   brief I-8B yêu cầu. Tôi đặt trong sheet “Tuỳ chọn học sinh” cùng “Đánh dấu nghỉ” — cần duyệt.
4. **Ảnh so sánh**: do app chưa có đường đăng nhập demo và `App/` ngoài phạm vi gói này, ảnh iOS hiện
   là render của view thật bằng `ImageRenderer` (chi tiết ở mục “Cách chụp”). Lead có muốn mở
   `QLH_DEMO_SCREEN=teacher-*` trong `ContentView` để chụp bằng simulator cho đúng brief không?
5. **Thẻ “Người dạy”**: Bản đầu chưa có phân công giảng dạy; hiện hiển thị người đang đăng nhập. Có cần
   ẩn thẻ này cho tới khi có phân công không?

Status: DONE_WITH_CONCERNS
Đã dựng lại toàn bộ giao diện giáo viên A (Lớp, Buổi học, Điểm danh, Học sinh, Lịch) theo đúng số đo prototype và thêm test cho các quy tắc lấy từ prototype; cây sạch chỉ chứa thay đổi của gói này build + 8 test xanh, ảnh đối chiếu đã lưu trong `ios/docs/screens/{classes,attendance}`.
Còn ba điểm cần lead quyết: build/test toàn app đang đỏ vì các gói I-8A/I-8C sửa song song `Features/Auth` và `Features/Guardian`, ảnh iOS là render `ImageRenderer` (chưa chụp được simulator vì app không có đăng nhập demo và `App/` ngoài phạm vi), và ba câu hỏi nghiệp vụ về khôi phục buổi huỷ, xem trước đổi lịch, vị trí “Cấp mật khẩu”.
