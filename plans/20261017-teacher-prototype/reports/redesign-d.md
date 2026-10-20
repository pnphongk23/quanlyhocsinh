# Báo cáo Worker D: Học sinh, Báo cáo

## Tóm tắt

Đã làm lại tab Học sinh với thẻ trên mobile, bảng desktop, ba thống kê và ngày vào/rời lớp. Form thêm học sinh chỉ lưu tên và SĐT phụ huynh; không có lời mời hay tin nhắn. Tab Báo cáo dùng bộ chọn tháng, danh sách tình trạng và chi tiết hai cột trên desktop; mobile xếp danh sách trước chi tiết. Logic báo cáo tháng, lưu nháp, phát hành, phát hành lại và xem trước bản in được giữ nguyên. Phần báo cáo ba tháng và gợi ý nhận xét không xuất hiện.

## Kiểm tra

- `npm run typecheck`: thành công (`tsc --noEmit`).
- `npm run build`: thành công (`vite build`, 111 modules).
- `npm test`: thành công, 7 file và 28 test.
- Mở `/lop/6a/hoc-sinh` và `/lop/6a/bao-cao` trong Chrome ở viewport 390px và 1280px. Mobile hiển thị thẻ/danh sách một cột; desktop hiển thị bảng/hai cột.
- Đo script vùng chạm ở cả hai route và hai viewport: `[]` (không có phần tử vi phạm 43.5px theo ngưỡng trong script). Đã đo `document.documentElement.scrollWidth <= innerWidth` cho Học sinh 390px (`390/390`) và Báo cáo 1280px (`1280/1280`). Ở hai tổ hợp còn lại, bố cục được xem trực tiếp và không thấy tràn ngang; chưa thu được số đo DOM đáng tin cậy.
- Console không có lỗi runtime. Có thông báo khuyến nghị cài React DevTools và cảnh báo metadata `apple-mobile-web-app-capable` đã deprecated từ `index.html`; file chung này ngoài phạm vi Worker D.

## File thay đổi

- Sửa `design/prototype/src/features/students/StudentsPage.tsx` và `students.module.css`.
- Sửa `design/prototype/src/features/reports/ReportsPage.tsx` và `ReportsPage.module.css`.
- Tạo báo cáo này. Không sửa `reportModel.ts`, test cũ hay file dùng chung.

## Màn được giao

| Màn | Kết quả |
|---|---|
| Học sinh, mobile | Thẻ có avatar, tên, SĐT phụ huynh, ngày vào/rời lớp, trạng thái và thao tác nghỉ học. Có trạng thái rỗng và form thêm học sinh. |
| Học sinh, desktop | Bảng gọn với Học sinh, Phụ huynh, Chuyên cần, Trạng thái và thao tác; bảng có vùng cuộn riêng từ 620px. |
| Báo cáo, mobile | Bộ chọn tháng, mức sẵn sàng, danh sách có thể chọn và phần chi tiết bên dưới. |
| Báo cáo, desktop | Danh sách và chi tiết chia cột; giữ điểm, chuyên cần, nhận xét đã gửi, trạng thái lưu và các thao tác báo cáo. |

## Bất biến mục 7.3

| # | Kết quả trong phạm vi Worker D |
|---|---|
| 1 | Không sửa điểm danh hoặc repository điểm danh; chưa thử thao tác điểm danh. |
| 2 | Hiển thị số học sinh vắng 2 buổi liền qua `studentAbsenceWarning`; chưa thử cảnh báo tại màn điểm danh. |
| 3 | `SaveStatus` hiển thị ở Học sinh và Báo cáo; form học sinh báo trạng thái sửa/lưu/lỗi. Các màn còn lại không thuộc phạm vi. |
| 4 | Không sửa đăng xuất/Cài đặt; chưa thử chặn đăng xuất offline. |
| 5 | Giữ `markStudentLeft` và `listStudents` để học sinh nghỉ còn trong danh sách; ngày vào/rời được định dạng. Chưa bấm xác nhận nghỉ trong trình duyệt để tránh sửa dữ liệu mẫu đang dùng chung. |
| 6 | Không sửa luồng điểm danh theo ngày; chưa thử. |
| 7 | Không sửa bản nháp điểm; chưa thử. |
| 8 | Không sửa nhận xét hoặc cache bản nháp; chưa thử. |
| 9 | Giữ nguyên `publishReport`/`saveReport`; chưa mô phỏng mất mạng khi phát hành. |
| 10 | Giữ cách đọc `needsRepublish`, nhãn phát hành lại và thao tác phát hành lại; chưa tạo thay đổi điểm để thử tình huống này. |
| 11 | Không thêm log và không đưa SĐT/nội dung nhận xét vào thông báo lỗi. |

## Giả định và file chung

- Áp dụng G7: bỏ phần báo cáo 3 tháng, nhận xét tổng hợp và gợi ý AI vì ngoài phạm vi bản đầu.
- Áp dụng G8: giữ SĐT phụ huynh làm thông tin hồ sơ, không gửi lời mời.
- Không gặp giả định mới làm chặn công việc.
- **Cần đổi file chung:** không. Cảnh báo metadata PWA hiện có nằm ngoài thư mục được giao.

## Chưa xác minh

Chưa thử thao tác thêm/nghỉ học hoặc phát hành có ghi dữ liệu vì trình duyệt dùng dữ liệu mẫu chung với các worker khác. Chưa xác minh các bất biến ngoài hai màn được giao hoặc toàn bộ tiêu chí A1–A11 của redesign tổng thể. Plus Jakarta Sans phụ thuộc kết nối Google Fonts trong prototype; bản thật cần tự host và precache font theo architecture.md.

Status: DONE_WITH_CONCERNS
Summary: Hai màn đã hoàn thành và typecheck, build, test đều đạt; bốn route/viewport đã mở, vùng chạm không có vi phạm.
Concerns/Blockers: Chưa thao tác các luồng ghi dữ liệu mẫu; một số bất biến và số đo tràn ngang chưa được thử trực tiếp.
