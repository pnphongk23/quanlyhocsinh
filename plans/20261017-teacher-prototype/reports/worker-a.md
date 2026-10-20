# Báo cáo Worker A: auth, classes, students, settings

## Kết quả

- Thay stub ClassList, NewClass và Students bằng giao diện tiếng Việt có dữ liệu từ repositories; layout dùng lại mobile/desktop shell.
- Danh sách lớp có trạng thái lưu, tạo lớp, chọn lớp, sửa tên/lịch lặp/giờ học và lưu trữ. Thang điểm luôn hiển thị cố định 10.
- Danh sách học sinh có thêm học sinh với số điện thoại phụ huynh tuỳ chọn, trạng thái lưu, thống kê đang học/đã nghỉ. Đánh dấu nghỉ ghi ngày nghỉ và giữ hồ sơ trong danh sách; không có mời, SMS hoặc OTP.
- Settings hiển thị tài khoản và trạng thái đồng bộ. Đăng xuất bị vô hiệu khi còn thay đổi chờ, kèm số lượng và lý do. Đặt lại dữ liệu mẫu yêu cầu xác nhận.
- Login giữ luồng đăng nhập thử của foundation (email/mật khẩu không rỗng), không thêm quên/đổi mật khẩu thật.
- Không cần đổi API trong `src/data`, `src/shared` hoặc `src/app`; không thêm thư viện. Chỉ sửa các feature được giao và báo cáo này.

## Kiểm chứng

- `npm run typecheck`: thành công.
- `npm run build`: thành công; Vite build 93 modules.
- Mở thử Chrome, đăng nhập bằng dữ liệu giả và kiểm tra `/lop`, `/lop/6a/hoc-sinh`, `/cai-dat`. Nội dung lớp, học sinh đã nghỉ, trạng thái đồng bộ và cài đặt hiển thị.
- Screenshot trình duyệt ở kích thước mặc định desktop cho thấy shell desktop/sidebar và Settings render. Không có Playwright trong dependencies và phiên CUA hiện tại không cung cấp đặt kích thước viewport; do đó chưa xác minh riêng tại 390px và 1280px, cũng chưa kiểm tra console bằng DevTools. CSS đã có responsive layout, nhưng đây chưa phải bằng chứng nghiệm thu hai kích thước.

## Giới hạn

- Đăng nhập, đồng bộ và lưu trữ theo prototype local của foundation; không phải xác thực hoặc backend thật.
- Sửa metadata lịch lớp chỉ cập nhật cấu hình theo API hiện có, không tái sinh các buổi đã lên lịch. Đây là giới hạn đã ghi trong tài liệu foundation.
- Login còn dùng email vì repository auth của foundation yêu cầu email và mật khẩu; luồng đăng nhập thật theo SĐT/OTP nằm ngoài brief worker-a.

## Vòng sửa

| Mục | Kết quả | Bằng chứng |
| --- | --- | --- |
| R04 — validation tạo/sửa lớp | Đã sửa. `createClass` và `updateClass` gọi chung validation tên sau trim, có ít nhất một ngày hợp lệ và giờ `HH:mm` hợp lệ; tên được chuẩn hoá sau trim. Update validate trước khi commit nên lỗi không đổi dữ liệu. | `src/features/classes/classes.test.ts`: 3 test cover tên trắng, ngày rỗng, giờ sai, dữ liệu không đổi khi lỗi và tên được trim. Browser tái hiện ở form sửa: chỉ dấu cách + bỏ hết ngày, hộp thoại vẫn mở, báo lỗi và không lưu. |
| R08 — trạng thái lưu form | Đã sửa form tạo lớp, sửa lớp và thêm học sinh bằng `useSaveStatus`: sửa trường/ngày đánh dấu “Chưa lưu”, ghi thành công trở về trạng thái repository, lỗi lưu hiện “Lỗi lưu”. | Browser ở form tạo lớp: nhập tên/chọn ngày hiển thị “Chưa lưu”. Hộp thoại thêm học sinh: nhập tên hiển thị “Chưa lưu”. Hộp thoại sửa lớp: chỉnh tên/ngày hiển thị “Chưa lưu”; thử dữ liệu không hợp lệ giữ form và hiển thị lỗi lưu. |
| R09 — vùng chạm phần classes | Đã sửa các nút ngày học bảo đảm chiều rộng và cao ít nhất 44px ở lưới mobile. | Đo DOM tại 390×844: 7 nút ngày rộng 44.28–44.30px, cao 44px; trường giờ học 316×52px. |
| R11 — students desktop | Đã sửa. Từ breakpoint desktop hiển thị bảng học sinh gọn theo bố cục WebStudents; mobile tiếp tục dùng thẻ. Bảng có phụ huynh, lớp, chuyên cần, tình trạng và thao tác; phần trăm dùng trực tiếp giá trị 0–100 từ repository. | Browser 1280×900: bảng có 10 học sinh, không còn thẻ dọc, không tràn ngang; chuyên cần hiển thị 75%/100%. Browser 390×844: không có bảng, hiện 10 thẻ và không tràn ngang. |

Kiểm tra cuối vòng: `npm run typecheck` thành công; `npm run build` thành công (95 modules); `npm test` thành công (7 test files, 25/25 tests). Không thêm thư viện.

Status: DONE
