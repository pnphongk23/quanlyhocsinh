# Save action inventory — before

Ảnh bổ sung dùng fixture local giả, Vite :5181; không dùng staging. HEAD ban đầu của lượt bổ sung là 1d8dc8e, sau đó HEAD tiến tới 4e1130e. Trong lúc capture có thay đổi chưa commit đồng thời trong src/features/attendance/AttendanceDesktop.tsx, homework/HomeworkDesktop.tsx, scores/ScoreGridDesktop.tsx, students/StudentsPage.tsx và thêm các component classes/students. Harness không sửa src/**; tuy vậy Vite HMR có thể khiến ảnh của các route này phản ánh nội dung đang thay đổi, không thể cam kết toàn bộ ảnh cùng một tree snapshot. Ảnh baseline f79d640 được giữ; số ảnh mới tiếp nối.

Đã quan sát browser ở 390×844/1440×900. Bảng ghi trạng thái disabled/aria-busy lúc mở route; các workflow còn lại liệt kê dưới mục coverage. Tổng mock push trong lượt mới: 15; tổng commands: 78.

| ID | Team | Màn/route | Hành động (nhãn nút) | File:dòng | Cần mạng? | Hiện trạng đo trong browser |
|---|---|---|---|---|---|---|
| S001 | A | create-class · /lop/moi · 390x844 | Tạo lớp | `src/features/classes/NewClassPage.tsx:19-100` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S002 | A | test-scores · /lop/demo-6a/bai-kiem-tra/demo-test · 390x844 | Lưu điểm | `src/features/scores/TestScoresPage.tsx:224-251,316-375` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S003 | A | reports · /lop/demo-6a/bao-cao · 390x844 | Phát hành 1 báo cáo | `src/features/reports/ReportsPage.tsx:334-358,463-485,568-589` | Có mạng | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S004 | A | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 390x844 | Điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S005 | A | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 390x844 | Lưu điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S006 | A | create-class · /lop/moi · 1440x900 | Tạo lớp | `src/features/classes/NewClassPage.tsx:19-100` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S007 | A | class-sessions · /lop/demo-6a/buoi-hoc · 1440x900 | Hủy buổi | `src/features/class-space/SessionsTab.tsx:98-105,153-210` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S008 | A | class-students · /lop/demo-6a/hoc-sinh · 1440x900 | + Thêm học sinh | `src/features/students/StudentsPage.tsx:48-161` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S009 | A | empty-students · /lop/demo-empty/hoc-sinh · 1440x900 | + Thêm học sinh | `src/features/students/StudentsPage.tsx:48-161` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S010 | A | tests · /lop/demo-6a/bai-kiem-tra · 1440x900 | Tạo bài kiểm tra | `src/features/scores/NewTestPage.tsx:29-53,107-120` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S011 | A | test-scores · /lop/demo-6a/bai-kiem-tra/demo-test · 1440x900 | Lưu điểm | `src/features/scores/TestScoresPage.tsx:224-251,316-375` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S012 | A | score-grid · /lop/demo-6a/diem · 1440x900 | Lưu điểm | `src/features/scores/ScoreGridDesktop.tsx:45-206` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S013 | A | reports · /lop/demo-6a/bao-cao · 1440x900 | Phát hành 1 báo cáo | `src/features/reports/ReportsPage.tsx:334-358,463-485,568-589` | Có mạng | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S014 | A | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 1440x900 | Điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S015 | A | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 1440x900 | Lưu điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S016 | B | reports · /lop/demo-6a/bao-cao · 390x844 | Phát hành 1 báo cáo | `src/features/reports/ReportsPage.tsx:334-358,463-485,568-589` | Có mạng | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S017 | B | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 390x844 | Điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S018 | B | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 390x844 | Lưu điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S019 | B | class-sessions · /lop/demo-6a/buoi-hoc · 1440x900 | Hủy buổi | `src/features/class-space/SessionsTab.tsx:98-105,153-210` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S020 | B | class-students · /lop/demo-6a/hoc-sinh · 1440x900 | + Thêm học sinh | `src/features/students/StudentsPage.tsx:48-161` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S021 | B | tests · /lop/demo-6a/bai-kiem-tra · 1440x900 | Tạo bài kiểm tra | `src/features/scores/NewTestPage.tsx:29-53,107-120` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S022 | B | score-grid · /lop/demo-6a/diem · 1440x900 | Lưu điểm | `src/features/scores/ScoreGridDesktop.tsx:45-206` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S023 | B | reports · /lop/demo-6a/bao-cao · 1440x900 | Phát hành 1 báo cáo | `src/features/reports/ReportsPage.tsx:334-358,463-485,568-589` | Có mạng | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S024 | B | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 1440x900 | Điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=false; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S025 | B | session-detail · /lop/demo-6a/buoi-hoc/demo-past · 1440x900 | Lưu điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S026 | C | login · /dang-nhap · 390x844 | Đăng nhập | `src/features/auth/LoginPage.tsx` | Có mạng | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S027 | C | register · /dang-ky · 390x844 | Tạo không gian làm việc | `src/features/auth/RegisterPage.tsx` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S028 | C | change-password · /cai-dat/doi-mat-khau · 390x844 | Lưu mật khẩu mới | `src/features/settings/ChangePasswordPage.tsx` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S029 | C | login · /dang-nhap · 1440x900 | Đăng nhập | `src/features/auth/LoginPage.tsx` | Có mạng | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S030 | C | register · /dang-ky · 1440x900 | Tạo không gian làm việc | `src/features/auth/RegisterPage.tsx` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |
| S031 | C | settings · /cai-dat · 1440x900 | Lưu mật khẩu mới | `src/features/settings/ChangePasswordPage.tsx` | Local/offline hoặc cần xác minh | Mở route: disabled=true; aria-busy=false; title=—; leave/save-after-edit chưa đo cho hành động này |

## Source map (HEAD 4e1130e)

| Action family | File:dòng |
|---|---|
| Tạo lớp | `src/features/classes/NewClassPage.tsx:19-100` |
| Thêm học sinh, đánh dấu nghỉ/xác nhận | `src/features/students/StudentsPage.tsx:48-161` |
| Lưu lịch lớp | `src/features/classes/EditClassSchedule.tsx:43-263` |
| Thêm/sửa/hủy buổi lẻ | `src/features/class-space/SessionsTab.tsx:98-105,153-210` |
| Điểm danh | `src/features/attendance/AttendancePanel.tsx:189-220,267-283,462-474`; `AttendanceDesktop.tsx:149-154` |
| Gửi nhận xét | `src/features/comments/CommentsPanel.tsx:245-260`; `SendTicketsDialog.tsx:90-105` |
| Bài tập về nhà | `src/features/homework/HomeworkPanel.tsx:768-840` |
| Tạo bài kiểm tra | `src/features/scores/NewTestPage.tsx:29-53,107-120` |
| Sửa/xóa bài, lưu điểm | `src/features/scores/TestScoresPage.tsx:224-251,316-375` |
| Phát hành báo cáo | `src/features/reports/ReportsPage.tsx:334-358,463-485,568-589` |
| Đăng nhập/đăng ký | `src/features/auth/LoginPage.tsx`; `RegisterPage.tsx` |
| Đổi mật khẩu | `src/features/settings/ChangePasswordPage.tsx` |
| Hành động phụ huynh | `src/roles/guardian/GuardianReportPage.tsx`; `GuardianCommentsPage.tsx` |

## Kết quả bổ sung theo workflow

| Hành động | Viewport/team | Ảnh / trạng thái | Request / lệnh / outbox | Kết quả |
|---|---|---|---|---|
| Điểm danh | A/B · 390, 1440 | `attendance-edited-valid`, `attendance-saving-double-tap`, `attendance-after-save` trong inventory route | 1 push; 8 commands; outbox 1→8 (A/390), 0→8 (B/390 và desktop rows ghi trong inventory route) | Chụp pending 3 giây; double-click tạo 1 push request. |
| Thêm học sinh | A/B · 1440 | `add-student-edited-valid`, `saving-double-tap`, `after-save` | 0 push; 0 commands; outbox 0→0 | Ghi nhận lưu local; không có lệnh outbox quan sát được trong mock. Không có chuỗi mobile hoàn chỉnh. |
| Phát hành báo cáo | A/B · 390, 1440 | `publish-report-edited-valid`, `saving-double-tap`, `after-save` | 0 push; 0 commands; outbox A/390 1→0; các viewport khác 0→0 | Nút cho phép thao tác nhưng trong cửa sổ đo không thấy push. Không kết luận request gửi báo cáo đã tới mạng. |

## Chưa chụp đủ

- Đánh dấu nghỉ: chỉ có ảnh menu/xác nhận B/390; chưa bấm xác nhận hai lần hoặc đo lệnh.
- Nhận xét: chưa có ảnh edit/gửi; BTVN: chưa có ảnh lưu; thêm buổi: chỉ có ảnh sheet mở; tạo bài kiểm tra và sửa lớp: chưa có workflow.
- Đăng nhập, đăng ký, đổi mật khẩu: chỉ có ảnh form ban đầu/validation; chưa có ảnh dữ liệu hợp lệ, pending, success, double-click hay leave-unsaved.
- Sửa thông tin học sinh và sửa nhận xét chưa tìm thấy flow tương ứng trong UI capture hiện có.

Không suy luận khi thao tác không tạo request/outbox quan sát được. Route URL và ảnh cụ thể ghi tại `inventory.md`.
