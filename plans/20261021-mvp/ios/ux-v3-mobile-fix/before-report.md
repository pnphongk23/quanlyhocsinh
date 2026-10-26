# Ảnh TRƯỚC — app iOS thật

Ngày 24/10/2026. App được build từ bản sao `/tmp/qlh-ux3-before/ios` (scheme `QuanLyLop`, configuration `Staging`, ký ad-hoc); `xcodebuild` kết thúc `BUILD SUCCEEDED`. Không chạy XcodeGen hay build trong worktree. Worktree giữ nguyên bốn file người dùng đã sửa; không đổi mã.

Ảnh nằm trong [`shots/before/`](shots/before/). Đây là ảnh `simctl screenshot` của app thật sau đăng nhập, không dùng `DemoScreens`.

## Ma trận

| Màn | iPhone 16 | iPhone SE (3rd gen) |
|---|---|---|
| GV · Lớp | [iPhone16-lop.png](shots/before/iPhone16-lop.png) | Không chụp: chưa đăng nhập được |
| GV · Lịch | [iPhone16-lich.png](shots/before/iPhone16-lich.png) | Không chụp: chưa đăng nhập được |
| GV · Cài đặt | [iPhone16-cai-dat.png](shots/before/iPhone16-cai-dat.png) | Không chụp: chưa đăng nhập được |
| GV · Chi tiết lớp · Buổi học | [iPhone16-lop-buoi-hoc.png](shots/before/iPhone16-lop-buoi-hoc.png) | Không chụp: chưa đăng nhập được |
| GV · Chi tiết lớp · Bài kiểm tra | [iPhone16-lop-bai-kiem-tra.png](shots/before/iPhone16-lop-bai-kiem-tra.png) | Không chụp: chưa đăng nhập được |
| GV · Chi tiết lớp · Điểm | [iPhone16-lop-diem.png](shots/before/iPhone16-lop-diem.png) | Không chụp: chưa đăng nhập được |
| GV · Chi tiết lớp · Học sinh | [iPhone16-lop-hoc-sinh.png](shots/before/iPhone16-lop-hoc-sinh.png) | Không chụp: chưa đăng nhập được |
| GV · Chi tiết lớp · Báo cáo | [iPhone16-lop-bao-cao.png](shots/before/iPhone16-lop-bao-cao.png) | Không chụp: chưa đăng nhập được |
| GV · Buổi học | [iPhone16-buoi-hoc.png](shots/before/iPhone16-buoi-hoc.png) | Không chụp: chưa đăng nhập được |
| GV · Tạo lớp | [iPhone16-tao-lop.png](shots/before/iPhone16-tao-lop.png) | Không chụp: chưa đăng nhập được |
| PH · Tổng quan, Điểm danh, Điểm, Nhận xét, Báo cáo, Cài đặt | Không chụp: chưa chuyển tài khoản | Không chụp: chưa đăng nhập được |

Trên iPhone 16 đã có sẵn phiên giáo viên hợp lệ trước khi bắt đầu; các ảnh GV được chụp từ phiên đó. Sau khi đăng xuất, một lần đăng nhập PH staging không tới trang PH nên không chụp được PH; không thử PH lại. Trên SE đã có hai lần submit thất bại trước đó; lượt Maestro bổ sung duy nhất cũng không tới trang GV (flow thoát lỗi, ảnh trạng thái còn ở form đăng nhập). Dừng tại giới hạn đã định, không thử thêm. Vì vậy chưa có ảnh PH hoặc ảnh SE. Không lưu nội dung nhận xét hay nhập dữ liệu nghiệp vụ; form Tạo lớp chỉ mở, không lưu.

## Lỗi thấy được trên iPhone 16

| Màn | Quan sát trong ảnh |
|---|---|
| Lớp | Trang gốc không thấy nội dung chồng status bar; tab bar nằm sát đáy. |
| Lịch | Tiêu đề, bộ chọn ngày/tháng và danh sách hiển thị trong vùng an toàn. |
| Cài đặt | Có nút quay lại dù là tab gốc, avatar nổi ở góc trên phải và khoảng trống lớn trên tiêu đề. Khớp ảnh tham chiếu 05. |
| Chi tiết lớp · Buổi học | Header và tab không chồng status bar; nội dung có lề. |
| Chi tiết lớp · Bài kiểm tra | Nút “+ Bài mới” sát lề phải; hai thẻ bài kiểm tra có lề. |
| Chi tiết lớp · Điểm | Header lớp chồng lên status bar; cột kiểm tra cuối bị cắt bên phải, hàng điểm cuối tiếp tục xuống dưới mép màn. Tên học sinh và số điểm đầu tiên lệch đường căn dọc thấy được. Khớp ảnh tham chiếu 04. |
| Chi tiết lớp · Học sinh | Danh sách có padding và avatar trong thẻ; không thấy chồng status bar. |
| Chi tiết lớp · Báo cáo | Nội dung báo cáo bị đẩy lên dưới status bar/notch; danh sách dài tiếp tục quá mép dưới. Khớp ảnh tham chiếu 01. |
| Buổi học | Header, ba tab và danh sách điểm danh nằm dưới status bar, không thấy cắt. |
| Tạo lớp | Form nằm dưới status bar; nút lưu ghim phía dưới, không thấy lỗi safe area rõ. |

## Đối chiếu ba gốc

- **G1 — xác nhận.** Ảnh Cài đặt có back thừa, avatar nổi và khoảng hở; Điểm/Báo cáo có nội dung chồng status bar. Mã bọc `TeacherRootView` bằng `NavigationStack` ngoài và gắn avatar tại [AuthFlowView.swift:101](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Auth/AuthFlowView.swift:101); mỗi tab giáo viên lại tạo stack riêng tại [TeacherRootView.swift:30](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Classes/TeacherRootView.swift:30). Chi tiết lớp cộng safe-area top và ẩn navigation bar tại [TeacherClassDetailView.swift:209](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Classes/TeacherClassDetailView.swift:209). Tab Cài đặt truyền `onClose`, nên `backRow` hiện tại [AuthSettingsView.swift:17](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Auth/AuthSettingsView.swift:17) và dựng ở dòng 47–63.
- **G2 — xác nhận một phần theo ảnh, xác nhận cấu trúc mã.** `tabBody` nhúng thẳng các tab nghiệp vụ [TeacherClassDetailView.swift:263](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Classes/TeacherClassDetailView.swift:263). Tab bài kiểm tra dùng `VStack` không khung cuộn/padding ngoài tại [TestsTabView.swift:20](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Scores/TestsTabView.swift:20); Báo cáo cũng là `VStack` tại [MonthlyReportView.swift:63](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Reports/MonthlyReportView.swift:63). Ảnh xác nhận Báo cáo tràn lên status bar; ảnh Bài kiểm tra cho thấy nút thêm ở sát mép. Màn Học sinh và Buổi học có khung/lề phù hợp trong ảnh.
- **G3 — xác nhận.** Ảnh Điểm cho thấy cột ngoài cùng bị cắt bên phải và tên/số điểm không căn cùng đường dọc. Mã tách tên học sinh và từng bài thành các `VStack` riêng, chỉ cuộn ngang các cột bài tại [ScoreGridTabView.swift:53](../../../../../../.paseo/worktrees/0fvr24l0/mvp-ios/ios/QuanLyLop/Features/Scores/ScoreGridTabView.swift:53); chiều cao header tên là 60pt còn header bài có thêm padding 8pt tại dòng 73–141.

## Giới hạn

Chỉ ma trận GV trên iPhone 16 hoàn tất. PH: một lần đăng nhập sau đăng xuất GV không thành công. SE: ba lần submit tổng cộng (hai lần trước lượt Maestro cuối); lượt Maestro cuối không đạt màn đích, và app vẫn hiển thị form đăng nhập. Đã dừng theo giới hạn, không dùng harness thay thế. Do đó PH, SE và so sánh hai kích thước chưa xác minh được.
