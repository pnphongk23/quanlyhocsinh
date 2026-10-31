# iOS-25 · Chẩn đoán dữ liệu phụ huynh lệch máy chủ

Ngày: 2026-10-23 · Nhánh `mvp-ios` · HEAD lúc bắt đầu `93b3228486d723369fbcc632afb6b7db43bc9c58`.

## Phạm vi và giới hạn

Chỉ đọc mã và chứng cứ đã lưu từ iOS-18/iOS-24; không gửi lệnh ghi nghiệp vụ staging và không đăng nhập trong lượt này. iOS-24 ghi tài khoản phụ huynh hai con đã dùng đủ 2 lượt đăng nhập (API HTTP 403 và UI thành công), nên lượt này không đăng nhập lại. Vì vậy không có token phiên hiện hành để lấy snapshot/pull, đếm SQLite sau đồng bộ, hoặc kiểm tra lại giao diện. Các dữ liệu staging bên dưới là kết quả lịch sử trong `report-i18.md` và `report-i24.md`, không được xác nhận lại trong lượt này.

## 1. Điểm danh 0/0 và nhận xét Buổi 0

**Kết luận:** Chưa đủ dữ liệu để chọn giữa sai lệch snapshot/kho cục bộ, bộ lọc client và ngày giờ. Chứng cứ staging gần nhất cho thấy API điểm danh riêng trả về 2 dòng mỗi học sinh trong tháng 10 (ngày 14 và 16, trạng thái present), trong khi UI iOS-24 không có buổi hiển thị cho tháng 10 (`ios/docs/report-i18.md:68`, `ios/docs/report-i24.md:15`). Không có số dòng hoặc ngày của `class_session`, `attendance`, `slip` và `report_publication` từ cùng phản hồi snapshot/pull và SQLite; cũng không có `window.from/to` để so với ngày buổi.

**Các nhánh client cần đối chiếu:** `GuardianRepository.dashboard(from:)` chỉ gắn buổi có `class_id` trùng học sinh, ngày không trước `enrolledAt` và không sau `leftAt` (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:438-452`). `attendanceMonth` tiếp tục lọc buổi `held` đúng tháng và bỏ buổi không có `sessionNumber`; bộ đếm `present/late/...` lấy từ các attendance có cùng `studentId` và `sessionId` (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:49-58`, `ios/QuanLyLop/Core/Models/Entities.swift:28-45`). Thẻ tổng quan tính `present + late` trên tổng số hàng sau lọc, tức 0/0 khi không còn hàng (`ios/QuanLyLop/Features/Guardian/GuardianPages.swift:27-33`).

`GuardianSentSlip` chỉ tạo được khi tìm thấy buổi theo `slip.sessionId`; thẻ nhận xét hiển thị `sessionNumber ?? 0`, nên “Buổi 0” phù hợp với buổi được tìm thấy nhưng thiếu số buổi (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:42-46`, `ios/QuanLyLop/Features/Guardian/GuardianPages.swift:35-54`). Chưa xác định được `sessionNumber` thiếu từ payload, bản ghi cục bộ hay trạng thái dữ liệu khác. `GuardianFormat.currentMonth` lấy tháng từ đồng hồ thiết bị; báo cáo iOS-24 ghi màn báo cáo giáo viên hiện tháng 12/2026, trong khi lịch máy chủ cần đối chiếu là tháng 10 (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:30-33,252-254`, `ios/docs/report-i24.md:23`). Không có chứng cứ cho thấy đã chỉnh được đồng hồ simulator hay lấy được `window.from/to`.

**Phân loại:** Chưa phân định lỗi client / dữ liệu staging / ngày giờ. Cần đo snapshot → SQLite → UI trên cùng phiên và ghi đếm/khóa/ngày, trạng thái buổi, `sessionNumber`, tháng được chọn; không ghi tên, SĐT hoặc nội dung nhận xét.

## 2. Báo cáo “chưa phát hành” dù có publication

**Kết luận:** Mã hiện tại được thiết kế để bản lỗi không chặn các publication hợp lệ, nhưng chưa xác minh được số publication giải mã và khớp từng học sinh trên phiên staging/UI hiện tại. Chứng cứ lịch sử ghi snapshot có 3 publication của báo cáo tháng 10: bản #1 có schema BTVN cũ, còn #2/#3 có các trường schema hiện tại; API báo cáo trả `publication_count=3` cho một học sinh, và không có báo cáo cho học sinh còn lại (`ios/docs/report-i18.md:66-75`).

`recordsSkippingInvalid` bỏ từng hàng chỉ khi gặp lỗi giải mã và trả số hàng bỏ (`ios/QuanLyLop/Core/Storage/SQLiteStore.swift:119-130`); `GuardianRepository` dùng hàm này cho `report_publication` (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:425-434`). Báo cáo mới nhất được chọn theo đúng `studentId` và tháng, sau đó theo `publicationNo` lớn nhất (`ios/QuanLyLop/Features/Guardian/GuardianRepository.swift:162-165`). Màn hình hiện trạng thái rỗng khi kết quả đó nil (`ios/QuanLyLop/Features/Guardian/GuardianTicketView.swift:94-107`). Theo mã, nếu #2/#3 tồn tại trong kho, giải mã được và có `studentId` trùng hồ sơ học sinh, bản #3 phải được chọn; bản #1 lỗi riêng lẻ không đủ để giải thích trạng thái rỗng. Chưa có đối chiếu kho cục bộ theo từng ID rút gọn để xác nhận các điều kiện đó.

**Phân loại:** Chưa phân định; khả năng nằm ở khác biệt snapshot/kho cục bộ hoặc khóa `student_id`/tháng, sau khi đã có nhánh bỏ publication lỗi schema. Đề xuất kiểm chứng (không thực hiện sửa): log tạm chỉ gồm tổng số publication đọc được/bị bỏ và số khớp từng học sinh/tháng; đối chiếu với snapshot và SQLite.

## 3. HTTP 403 từ đăng nhập phụ huynh

**Kết luận:** Lịch sử iOS-24 ghi `POST /auth/login` HTTP 403 nhưng không lưu `error.code`; lượt này không thử lại theo giới hạn đăng nhập, nên không thể xác nhận `password_change_required` hay kiểm tra màn UI đổi mật khẩu. Nếu login thành công và `mustChangePassword` là true, client điều hướng sang `forcedPassword`; nếu API trả lỗi, nhánh catch giữ màn đăng nhập và hiển thị thông báo lỗi (`ios/QuanLyLop/Features/Auth/AuthService.swift:122-139`). Không có bằng chứng để kết luận server đã trả `password_change_required`.

**Phân loại:** Chưa xác định; cần một kết quả lỗi đã ghi `HTTP status` và `error.code` từ phiên được phép. Không ghi body hoặc bí mật xác thực.

## Số lượt đăng nhập

| Tài khoản | Trong lượt iOS-25 | Chứng cứ lịch sử được biết |
|---|---:|---|
| Phụ huynh hai con | 0 | iOS-24 ghi tổng 2: một API HTTP 403 và một UI thành công; đã đạt giới hạn brief nên không đăng nhập thêm. |
| Giáo viên | 0 | Không đăng nhập trong lượt này. |
| Tài khoản đa vai trò | 0 | Không đăng nhập trong lượt này. |

Không ghi SĐT, tên học sinh, mật khẩu, token hoặc nội dung nhận xét. Không tạo log chẩn đoán chứa dữ liệu người dùng.

## Kiểm chứng và dọn dẹp

- `xcodegen generate`: thành công.
- Build Staging cho iPhone 16 theo lệnh trong brief: `BUILD SUCCEEDED`.
- Simulator iPhone 16 đã erase và ở trạng thái shutdown; `/tmp/qlh-dd-i25` và log build tạm đã được xóa.
- Không sửa mã app; chưa thể xác minh trực tiếp snapshot, SQLite, UI hiện tại hoặc `error.code` vì giới hạn đăng nhập đã đạt.

Status: DONE_WITH_CONCERNS
