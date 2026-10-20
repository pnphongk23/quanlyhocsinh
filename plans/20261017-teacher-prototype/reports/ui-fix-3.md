# Báo cáo vòng sửa giao diện 3

Ngày kiểm tra: 18/10/2026. Phạm vi: F-03, F-07, F-10, F-11.

## Đã sửa

- **F-03:** Bảng điểm lấy cả học sinh đang học và đã nghỉ, sắp các em đã nghỉ xuống cuối, làm mờ hàng và gắn nhãn “Đã nghỉ”. Phép tính vẫn dùng `averageScore` hiện có, trung bình cộng đơn giản.
- **F-10:** Repository từ chối `saveAttendance` và `saveAttendanceBatch` cho buổi có ngày sau hôm nay bằng lỗi “Chỉ có thể điểm danh từ ngày học trở đi.” Trang buổi tương lai chỉ đọc danh sách; các trạng thái không tương tác, chưa có bản ghi ghi “Chưa điểm danh”, nút “Lưu điểm danh” bị khóa kèm lý do. Nút “Hủy buổi” vẫn dùng được. UI không mở tab Nhận xét hoặc thao tác “Tất cả có mặt” ở buổi tương lai.
- **F-07:** Bỏ outline lớp hiện tại ở mobile; giữ outline xanh 2px trên desktop theo `WebClasses.dc.html` (desktop có outline chọn, `ClassList.dc.html` mobile không có).
- **F-11:** `--color-placeholder` đổi thành `#6b7280`, dùng token chung cho các placeholder.

## Xác minh

### Trình duyệt

Mở prototype trong Chrome với seed mặc định, ngày máy 18/10/2026. Dữ liệu cục bộ ở origin thử nghiệm được đặt lại từ màn Cài đặt; origin prototype đang dùng của người dùng không bị đặt lại.

| Màn / viewport | Kết quả và số đo |
|---|---|
| `/lop/6a/diem`, 390×844 | `innerWidth=390`; `documentElement.clientWidth=375`, `scrollWidth=375` (không tràn trang). Khung bảng rộng 335px, bảng rộng 672px và cuộn ngang bên trong. Có 10 hàng: 9 đang học rồi Đỗ Hải Nam “Đã nghỉ” ở cuối; opacity hàng nghỉ `0.62`; TB vẫn `7,8`. |
| `/lop`, 390×844 | `innerWidth=390`; `clientWidth=390`, `scrollWidth=390`. Outline computed của các thẻ là `none`. |
| `/lop`, 1280×900 | `innerWidth=1280`; `clientWidth=1280`, `scrollWidth=1280`. Lớp hiện tại IELTS 7.0 có outline `rgb(47, 91, 234) solid 2px`; thẻ còn lại `none`. |
| Buổi 19/10, 390×844 | Nút “Lưu điểm danh” và trạng thái từng học sinh disabled; thông báo nêu rõ chỉ điểm danh từ ngày học trở đi; danh sách ghi “Chưa điểm danh”; nút “Hủy buổi” hiện và khả dụng. `scrollWidth=375` so với `clientWidth=375`. |
| Buổi 20/10, 1280×900 | Cùng trạng thái chỉ đọc; nút lưu disabled, lý do hiện ngày 20/10, nút “Hủy buổi” hiện và khả dụng. `clientWidth=scrollWidth=1280`. |
| Placeholder ở `/lop`, 1280px | Browser computed: chữ `rgb(107, 114, 128)` trên nền ô trắng `rgb(255, 255, 255)`. Tỷ lệ WCAG tính được: **4.83:1** trên `#FFFFFF`, **4.51:1** trên `#F6F7F9`. |

Console Chrome không có lỗi hoặc cảnh báo ở các route đã kiểm.

### Lệnh kiểm tra

- `npm run typecheck` — đạt.
- `npm run build` — đạt; Vite build 116 modules.
- `npm test` — đạt: 8 test files, 33 tests.

Test mới kiểm tra thứ tự học sinh trên bảng điểm, so sánh ngày hôm nay/ngày tương lai, và repository từ chối cả hai cách lưu điểm danh mà không thay đổi store.

Status: DONE
