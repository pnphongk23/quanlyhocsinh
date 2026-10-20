# UI test — Tester 2

## 1. Môi trường

- Công cụ: trình duyệt Paseo, thao tác snapshot/click/fill/type/evaluate/screenshot trên tab tại `http://127.0.0.1:5182`.
- Viewport thực đặt được: 390×844 px. Công cụ không cho đặt DPR hoặc touch; số đo trình duyệt thực tế là `devicePixelRatio=1`, `'ontouchstart' in window === false` (không đạt DPR 3/touch như cấu hình yêu cầu).
- Tài khoản prototype: `tester2@example.com`; dữ liệu mẫu ban đầu theo ngày 17/10/2026.
- Ảnh bằng chứng nằm tại `/tmp/ui-test-2/` (không lưu ảnh vào repo). Ảnh chụp ở 390×844.
- Đã so màu nền trang mobile tại các màn chính: `rgb(246, 247, 249)`, trùng token. Font computed bắt đầu bằng “Plus Jakarta Sans”. Các màn đã chụp có bố cục/nút/chip/pill gần thiết kế tham chiếu; không đo pixel-perfect từng thành phần.

## 2. Phát hiện

| ID | Mức | Route | Viewport | Các bước tái hiện | Thực tế vs mong đợi | Bằng chứng | Đề xuất sửa |
|---|---|---|---|---|---|---|---|
| T2-01 | Major | `/lop/6a/diem` | 390×844 | Mở tab Điểm, ghi nhận điểm của Nguyễn Minh Anh; vào tab Học sinh, chọn học sinh này → “Đánh dấu nghỉ” → xác nhận; quay lại tab Điểm. | Mong đợi điểm cũ còn trong bảng Điểm. Thực tế: hàng Nguyễn Minh Anh biến mất khỏi bảng sau khi nghỉ lớp (bảng còn 8 học sinh). Báo cáo tháng vẫn còn hiển thị điểm/lịch sử của em, nên dữ liệu chưa bị mất hẳn nhưng không xem được tại tab Điểm. | `/tmp/ui-test-2/score-grid.png`, `/tmp/ui-test-2/students.png`; trước khi nghỉ bảng hiện điểm 6,0 / 7,0 / 8,0 / 9,0 / 7,5; sau khi nghỉ hàng không còn. | Hiển thị cả học sinh đã nghỉ trong bảng điểm và giữ trạng thái nghỉ/ngày rời lớp; không lọc lịch sử theo danh sách đang học. |
| T2-02 | Minor | `/lop/6a/bai-kiem-tra/moi` | 390×844 | Mở tạo bài mới, để trống tên, nhấn “Tạo bài kiểm tra”. | Validate đúng “Nhập tên bài kiểm tra.”, nhưng SaveStatus chuyển sang “Lỗi lưu — vui lòng thử lại” dù chưa có lỗi lưu trữ/mạng. Mong đợi phân biệt lỗi nhập liệu với lỗi lưu. | Snapshot có `role=alert` “Nhập tên bài kiểm tra.” đồng thời status “Lỗi lưu — vui lòng thử lại”; ảnh màn tạo bài `/tmp/ui-test-2/new-test.png`. | Dùng trạng thái lỗi trường/validate riêng; chỉ hiện “Lỗi lưu” khi thao tác lưu thất bại. |

## 3. ĐÃ KIỂM

Kết quả tràn ngang: ở tất cả màn có đo, `document.documentElement.scrollWidth <= innerWidth`; bảng Điểm cuộn ngang trong khung riêng 722 px, cột Học sinh `position: sticky; left: 0px`. Script vùng chạm đã chạy trên các màn được liệt kê dưới đây; không có phần tử vi phạm ngưỡng 43,5 px (`[]`). Liên kết “Đến nội dung” ngoài màn hình được loại trừ theo hướng dẫn.

| Route / tình huống | Viewport | Kết quả |
|---|---|---|
| `/lop` | 390×844 | OK: 2 lớp mẫu, điều hướng dưới có Lớp/Lịch/Cài đặt; nền đúng token; không tràn, không phần tử chạm nhỏ. |
| `/lop/6a/bai-kiem-tra` | 390×844 | OK: danh sách có pill “Đủ điểm” và “Còn 1 em chưa có điểm”; không tràn; vùng chạm đạt. |
| `/lop/6a/bai-kiem-tra/moi` | 390×844 | OK: ngày mặc định 17/10/2026; thang 10; không có hệ số; validate tên bắt buộc. Tạo bài “Kiểm tra tester 2” thành công và chuyển trang nhập điểm. |
| `/lop/6a/bai-kiem-tra/6a-test-0` | 390×844 | OK: trường điểm bỏ trống được để trống; `7,5` được nhận; điểm `11` bị chặn với “Điểm phải từ 0 đến 10.”; đổi Vắng thi làm ô điểm thành chữ “Vắng thi”; lưu thành công. Điểm trung bình bỏ Vắng thi/chưa nhập; chỉ có thể xác nhận số dòng đã đổi qua hàng chờ sau lưu, chưa đối chiếu server từng dòng. |
| Bài vừa tạo `/lop/6a/bai-kiem-tra/<id mới>` | 390×844 | OK: nhập hai điểm và đánh dấu một học sinh Vắng thi, lưu báo thành công; status chuyển Đã đồng bộ → Chưa lưu → Đã lưu trên máy. Sửa nháp rồi bấm Quay lại hiện confirm “Bạn có thay đổi chưa lưu. Rời đi và bỏ thay đổi?”; đóng confirm giữ nguyên nháp. |
| Bàn phím trên trang nhập điểm | 390×844 | Nút Lưu điểm dính đáy ở khoảng y=716–768; hàng cuối cuộn dưới thanh lưu. Không mô phỏng được bàn phím ảo iPhone để xác nhận nút có bị bàn phím che hay không. |
| `/lop/6a/diem` | 390×844 | OK: bảng chỉ đọc, cuộn ngang trong khung riêng, cột Học sinh dính trái; không có hệ số/TB lớp. Đối chiếu tay: Nguyễn Minh Anh (6+7+8+9+7,5)/5 = 7,5; Trần Gia Bảo = 8,4; Lê Khánh Chi (8+9+10+6)/4 = 8,25, hiển thị 8,3 khi loại Vắng thi. Phát hiện T2-01 về học sinh nghỉ. |
| `/lop/6a/hoc-sinh` | 390×844 | OK: ba số thống kê; modal thêm học sinh có tên bắt buộc, SĐT tùy chọn; thêm “Học sinh tester hai” thành công, SaveStatus từ Chưa lưu sang Đã lưu trên máy. Modal nghỉ có ngày rời lớp; học sinh vẫn ở danh sách với “Đã nghỉ”. Không thấy nội dung mời phụ huynh/OTP/SMS/Zalo. |
| `/lop/6a/bao-cao` | 390×844 | OK: chọn tháng 10/2026; tóm tắt Sẵn sàng 2/11; danh sách thiếu/lý do; chọn học sinh và xem card chi tiết; Xem trước bản in; Lưu nháp; Phát hành một báo cáo và Phát hành hàng loạt. Khi offline, Phát hành báo rõ “Thao tác này cần có mạng.” và status lỗi. Sửa điểm sau phát hành làm báo cáo hiện “Điểm có cập nhật, cần phát hành lại”; phát hành lại cập nhật điểm TB/điểm bài. |
| `/lich` | 390×844 | OK: nhóm theo ngày 19/10 và 20/10, mỗi nhóm hiện buổi “Sắp tới”; mở buổi 9 ngày 19/10 được. Dữ liệu mẫu có lịch đến 20/10 nên không trống. Không có buổi “Chưa điểm danh” trong khoảng 14 ngày đang hiển thị ở ngày máy này. |
| `/lop/6a/buoi-hoc/6a-session-8` (mở từ Lịch) | 390×844 | OK: mở trang Buổi 9, tab Điểm danh, danh sách 9 học sinh và nút trạng thái; lưu đang đồng bộ. Ảnh `/tmp/ui-test-2/session.png`. |
| `/cai-dat` | 390×844 | OK: hồ sơ `tester2@example.com`, trạng thái dữ liệu, đặt lại mẫu và đăng xuất. Offline bằng `navigator.onLine=false` + sự kiện offline, sửa điểm/lưu → status Đã lưu trên máy, 1 thay đổi chờ; Đăng xuất bị khóa kèm lý do. Khôi phục online, hàng chờ về 0 và Đăng xuất mở lại. Đặt lại dữ liệu có modal xác nhận, đưa về hai lớp mẫu và yêu cầu đăng nhập lại; xác minh đăng nhập lại thấy đúng hai lớp. Đăng xuất bình thường chuyển về `/dang-nhap`. |
| SaveStatus qua các luồng | 390×844 | Đã thấy Chưa lưu khi sửa điểm/thêm học sinh; Đã lưu trên máy sau tạo bài/thêm học sinh/lưu điểm offline/lưu nháp báo cáo; Đã đồng bộ ở màn ban đầu và sau đồng bộ; Lỗi lưu sau điểm ngoài phạm vi và thao tác phát hành báo cáo offline. Không tạo được lỗi ghi dữ liệu thực sự độc lập với validate/offline. |
| Các màn đã đo: danh sách lớp, bài kiểm tra, tạo bài, nhập điểm, điểm, học sinh, báo cáo, lịch, cài đặt | 390×844 | Script vùng chạm: không có vi phạm; tràn ngang: không có. Primary actions nhìn thấy/đến được khi cuộn; không thấy tab dưới che nút chính trong ảnh đã lưu. |

Ảnh bằng chứng đã lưu:

- `/tmp/ui-test-2/lop.png`
- `/tmp/ui-test-2/new-test.png`
- `/tmp/ui-test-2/new-score.png`
- `/tmp/ui-test-2/score-grid.png`
- `/tmp/ui-test-2/students.png`
- `/tmp/ui-test-2/students-add.png`
- `/tmp/ui-test-2/report.png`
- `/tmp/ui-test-2/calendar.png`
- `/tmp/ui-test-2/settings.png`
- `/tmp/ui-test-2/settings-offline-pending.png`
- `/tmp/ui-test-2/session.png`

## 4. KHÔNG KIỂM ĐƯỢC

- DPR 3 và touch thật: Paseo không có điều khiển cho DPR/touch; trình duyệt thực tế dùng DPR 1, touch=false.
- Bàn phím ảo iPhone che nút Lưu điểm: công cụ không mô phỏng được bàn phím hệ điều hành.
- Bất biến 7.3 mục 7 (nháp lớp A rồi chuyển lớp B và bấm Lưu): chưa kiểm tra được theo thao tác UI mà không bỏ nháp lớp A. Thao tác điều hướng trực tiếp của công cụ không tương đương chuyển lớp trong ứng dụng.
- Tên/SĐT học sinh: trường bắt buộc của tên được kiểm tra qua modal/native validity; không kiểm tra riêng số điện thoại sai định dạng.
- Console theo từng route và desktop viewport: không kiểm đủ từng route/viewport. Đã đọc log tổng trong tab sau các luồng đã chạy.
- Các route cũ chuyển hướng, session 6a-session-7 và đầy đủ mọi tiêu chí A1–A11 chưa nằm trong lượt kiểm này.

## 5. Console

- Đã đọc 48 mục console trong tab. Không thấy lỗi JavaScript hay lỗi mạng được ghi ở console.
- Các dòng quan sát được là thông tin Vite lặp lại khi tải lại trang (`[vite] connecting...`, `[vite] connected.`) và thông tin React DevTools: `%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold` (ví dụ tại `/lop/6a/bai-kiem-tra/6a-test-0`). Không thấy warning/error; Paseo trả level số thay vì tên level.

Status: DONE_WITH_CONCERNS
Summary: Đã kiểm các luồng chính của Tester 2 trên viewport 390×844; có một lỗi Major về điểm lịch sử của học sinh đã nghỉ và một lỗi Minor về SaveStatus khi validate. DPR/touch, bàn phím ảo iPhone và chuyển lớp khi còn nháp chưa thể xác minh bằng công cụ hiện có.
Concerns/Blockers: Phạm vi chưa đủ để xác nhận toàn bộ tiêu chí A1–A11 hoặc hành vi trên thiết bị iPhone thật.
