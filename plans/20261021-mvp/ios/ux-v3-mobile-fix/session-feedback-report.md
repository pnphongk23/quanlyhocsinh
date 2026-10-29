# Phản hồi màn chi tiết buổi học GV: điểm lệch so với prototype web và spec

Để GL hỏi người dùng có áp dụng cho web không. iOS đã làm theo yêu cầu người dùng; web/prototype và spec không bị sửa.

| # | Prototype web | iOS (P7) |
|---|---|---|
| 1 | Tab buổi học (`sessionDetail.module.css .tab/.tabActive`) đã dùng gạch chân 3px màu primary, không có nền. Tab chi tiết lớp (`.subTabs`) cần kiểm riêng. | `TeacherTextTabs` bỏ nền ô chọn, dùng gạch 3px `AppColors.primary` dưới mục chọn. Áp cho tab buổi học và tab chi tiết lớp. Lần này iOS chỉ khớp lại phần gạch chân của tab buổi học. |
| 2 | Có dòng phụ "Lớp · Thứ, ngày · giờ" dưới tiêu đề. Không có nút info. | Bỏ dòng phụ. Thêm nút `info.circle` ở thanh điều hướng, mở sheet gồm lớp, thứ ngày, giờ, người dạy. |
| 3 | Thẻ "Người dạy" ở tab Điểm danh (`sessionDetailTabs.test.tsx` kiểm thẻ này có mặt). | Bỏ khỏi tab, chuyển vào sheet info. Web vẫn còn thẻ và có test khẳng định. |
| 4 | `AttendancePanel.tsx:316` có dòng "Vuốt phải: vắng · Vuốt trái: muộn". Bấm nhãn đổi vòng tròn qua `cycle()`. | Bỏ dòng hướng dẫn. Bấm nhãn mở Menu chọn trạng thái, nhãn có chevron. Vuốt vẫn còn nhưng không có chữ hướng dẫn. |
| 5 | Thẻ "Cần chú ý" luôn hiện, rỗng thì ghi "Chưa có học sinh vắng 2 buổi liên tiếp." | Chỉ hiện khi có học sinh cần chú ý, rỗng thì ẩn hẳn. |
| 6 | Mobile đã có `stickyBar` ghim nút Lưu. | Trước đó iOS để nút Lưu cuộn theo danh sách. Giờ ghim đáy bằng `safeAreaInset`, danh sách có đệm đáy. Khớp prototype. |
| 7 | `MobileShell` luôn hiện tab bar ở mọi route. | iOS ẩn tab bar trong chi tiết lớp và chi tiết buổi (và Tạo lớp từ P3), hiện lại ở gốc tab. |

## Quyết định đã chốt (người dùng/GL, 24/10)

- **Trạng thái điểm danh:** giữ 4 trạng thái theo spec (Có mặt, Vắng, Muộn, Có phép). Menu hiện tại đúng, không đổi.
- **Người dạy trong sheet info:** dùng đúng nguồn dữ liệu của thẻ Người dạy cũ, không đổi schema hay API. Giới hạn:
  - GV chính là tên tài khoản đang đăng nhập (`data.displayName`), không phải người được phân công cho buổi hay lớp.
  - Trợ giảng chưa có nguồn dữ liệu, luôn hiện "Không có".
  - Chưa có nhánh "chưa phân công". Tài khoản trợ giảng hoặc Admin vẫn thấy tên mình ở ô GV chính.
  - Phân công thật thuộc màn nhân sự (spec mục 8, "Làm sau").

## Ghi chú về spec

- Spec không bắt buộc hiển thị thẻ Người dạy hay hướng dẫn vuốt. Cảnh báo vắng 2 buổi (spec mục 4, 8) vẫn hiện khi có học sinh vắng, chỉ ẩn trạng thái rỗng.
- Không sửa spec và không sửa docs. `ios/docs` không mô tả các hành vi này.

## Cập nhật (người dùng yêu cầu)

Bỏ mục "Người dạy" khỏi sheet thông tin buổi; sheet chỉ còn lớp, ngày, giờ. Giới hạn dữ liệu người dạy ở các mục trên không còn áp dụng cho iOS. Chuỗi cũ trong Localizable.xcstrings không bị xoá (file của người dùng).
