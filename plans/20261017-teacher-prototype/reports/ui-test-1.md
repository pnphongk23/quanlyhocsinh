# Báo cáo kiểm thử giao diện — Tester 1

## 1. Môi trường

- **PHẠM VI:** Tester 1 (N=1), cổng `5181`, viewport chính 390×844.
- Công cụ: Paseo browser (Chromium) để thao tác và đo DOM; Chrome/CUA để kiểm bộ chuyển lớp.
- Origin riêng: `http://127.0.0.1:5181`.
- Viewport thật đặt được: **390×844 CSS px**. `innerWidth=390`, `innerHeight=844`.
- **DPR 3 và touch không đặt được**: viewport capability chỉ nhận width/height; thực tế `devicePixelRatio=1`, `ontouchstart=false`, `navigator.maxTouchPoints=0`.
- Ảnh bằng chứng nằm tại `/tmp/ui-test-1/`. Không sửa mã nguồn hay tệp repo nào khác báo cáo này.

## 2. Phát hiện

| ID | Mức | Route | Viewport | Các bước tái hiện | Thực tế vs mong đợi | Bằng chứng | Đề xuất sửa |
|---|---|---|---|---|---|---|---|
| T1-01 | **Blocker** | `/lop/6a/buoi-hoc/6a-session-8` | 390×844 | Mở tab Điểm danh → đổi Nguyễn Minh Anh sang Muộn → nhập giờ `18:10` và ghi chú `Ghi chú cho muộn` → chuyển tab Nhận xét → quay lại Điểm danh. | Trạng thái Muộn còn nguyên, nhưng giờ đến muộn và ghi chú bị xóa. Mong đợi toàn bộ bản nháp điểm danh còn nguyên khi đổi tab; việc rời tab nội bộ làm mất dữ liệu vừa nhập. | Trước khi đổi tab: `input.value` là `18:10` và `Ghi chú cho muộn`; sau khi quay lại: cả hai là chuỗi rỗng, trong khi nút vẫn ghi `Nguyễn Minh Anh: Muộn`. Ảnh: `/tmp/ui-test-1/07-session-attendance.png`. | Lưu giờ đến muộn và ghi chú trong state bản nháp theo học sinh/buổi, không để giá trị chỉ nằm trong input bị tháo khỏi DOM khi đổi tab. |
| T1-02 | **Blocker** | `/lop/6a/buoi-hoc/6a-session-7` | 390×844 | Đổi trạng thái điểm danh để `SaveStatus` thành Chưa lưu → dùng Back của trình duyệt. | Trang rời sang `/lop/6a/buoi-hoc` và bản nháp biến mất mà không hỏi. Back trong trang có hiện `Bạn có thay đổi chưa lưu. Rời đi và bỏ thay đổi?`; chọn ở lại giữ nguyên trang. Mong đợi Back trình duyệt cũng chặn và hỏi xác nhận như nút trong trang. | Trước Back: `SaveStatus=Chưa lưu`, Nguyễn Minh Anh chuyển sang Có mặt; ảnh `/tmp/ui-test-1/17-unsaved-attendance.png`. Sau Back: URL `/lop/6a/buoi-hoc`; không còn màn xác nhận. | Chặn điều hướng lịch sử trình duyệt khi có bản nháp chưa lưu, cùng hành vi với nút Quay lại trong app. |
| T1-03 | **Major** | `/lop/6a/buoi-hoc/6a-session-8` → `/lop/6a/buoi-hoc` | 390×844 | Mở buổi 9 ngày 19/10 đang Sắp tới → lưu điểm danh → quay lại danh sách buổi học. | Buổi tương lai chuyển khỏi nhóm “Cần điểm danh và sắp tới” sang “Đã diễn ra”, nhãn thành “Đã điểm danh”; nút “Hủy buổi” không còn trong chi tiết. Mong đợi ngày tương lai vẫn được nhận diện là buổi sắp tới và có thể hủy theo trạng thái planned. | Trước lưu: chi tiết có nút “Hủy buổi” (ảnh `/tmp/ui-test-1/16-session-planned.png`). Sau lưu: danh sách DOM ghi `Đã diễn ra` và `Đã điểm danh`; không còn nút `Hủy buổi`. Không chụp được ảnh sau thay đổi vì Paseo báo `The tab has not painted yet` hai lần. | Không suy ra buổi đã diễn ra chỉ từ việc đã lưu điểm danh; giữ trạng thái/ngày buổi tách biệt và tiếp tục cho hủy buổi tương lai theo nghiệp vụ. |
| T1-04 | **Minor** | `/lop/moi` | 390×844 | Để trống tên lớp và ngày học → bấm “Tạo lớp”. | Form chặn lưu và báo rõ `Nhập tên lớp, chọn ít nhất một ngày và kiểm tra giờ học.`; đồng thời SaveStatus báo `Lỗi lưu — vui lòng thử lại`, gây hiểu nhầm đây là lỗi ghi dữ liệu. Mong đợi trạng thái xác thực không bị biểu diễn thành lỗi lưu. | DOM có `role=alert` với thông báo trên; `:invalid` gồm form và input tên lớp required; route vẫn `/lop/moi`. Ảnh `/tmp/ui-test-1/03-new-class.png`. | Giữ thông báo lỗi xác thực, không chuyển SaveStatus sang lỗi lưu khi chưa thử ghi dữ liệu. |

## 3. Đã kiểm / không kiểm được

### Đã kiểm

Tất cả lượt dưới đây dùng viewport 390×844. Trên các màn đã đo, script vùng chạm trả `[]`; trang không tràn ngang (`document.documentElement.scrollWidth <= innerWidth`). Thanh dưới có đúng ba mục Lớp/Lịch/Cài đặt. Ngoại lệ cuộn được giữ trong khung riêng: tab con và bảng điểm.

| Route / tình huống | Kết quả | Ảnh |
|---|---|---|
| `/dang-nhap` — bố cục, trường email/mật khẩu, hiện mật khẩu, submit trống, đăng nhập thành công | OK; nút mắt đổi input `password` thành `text`; trường required chặn submit trống; đăng nhập mẫu chuyển `/lop` | `/tmp/ui-test-1/01-login.png` |
| `/lop` — thẻ lớp, hai liên kết thao tác, nhãn hôm nay, nút tạo lớp, avatar CL | OK; sau tạo lớp mới thẻ “Hôm nay” và “Điểm danh hôm nay” hiện đúng; nút tạo lớp nền `rgb(47, 91, 234)`; 3 mục điều hướng | `/tmp/ui-test-1/02-class-list.png`, `/tmp/ui-test-1/04-class-created.png` |
| `/lop/moi` — validate, ngày T2–CN, giờ học, tạo lớp, trạng thái lưu | OK về chặn validate và tạo lớp; lần chọn ngày đã bấm đủ T2–CN, giờ mặc định `18:30`; tạo thành công về `/lop`, trạng thái “Đã lưu trên máy” | `/tmp/ui-test-1/03-new-class.png` |
| Menu lớp — Sửa lớp, lưu, Lưu trữ lớp (đang online) | OK; modal sửa có SaveStatus, tên mới cập nhật sau Lưu; lưu trữ báo “Lớp này đã lưu trữ.” | `/tmp/ui-test-1/05-edit-class-modal.png` |
| Bộ chuyển lớp nhanh | OK; chọn IELTS 7.0 chuyển `/lop/6a/buoi-hoc` sang `/lop/ielts/buoi-hoc`, giữ nguyên tab Buổi học | Không có ảnh riêng |
| Không gian lớp và tab con | OK; đủ 5 tab, mỗi route đánh dấu đúng `aria-current="page"`, màu tab chọn chữ trắng/nền `rgb(47, 91, 234)`; tab con cuộn từ `scrollLeft=0` lên `141` (`scrollWidth=516`, `clientWidth=375`) | `/tmp/ui-test-1/06-sessions.png`, `/tmp/ui-test-1/10-tests.png`–`/tmp/ui-test-1/13-report.png` |
| `/lop/6a/buoi-hoc` — nhóm buổi sắp tới/đã diễn ra và mở chi tiết | OK trước thay đổi dữ liệu: nhóm và pill hiển thị; mở được buổi 9 và buổi 8 | `/tmp/ui-test-1/06-sessions.png` |
| `/lop/6a/buoi-hoc/6a-session-8` — vòng 4 trạng thái, tóm tắt, Cần chú ý, Lưu điểm danh | OK về vòng Có mặt → Muộn → Có phép → Vắng → Có mặt; số đếm lần lượt đổi đúng; có ô giờ đến muộn/ghi chú khi Muộn; cảnh báo “Cần chú ý”; nút Lưu điểm danh nền `rgb(47, 91, 234)`, nằm y=716–768, thanh dưới bắt đầu y=780, không che nhau | `/tmp/ui-test-1/07-session-attendance.png`, `/tmp/ui-test-1/16-session-planned.png` |
| `/lop/6a/buoi-hoc/6a-session-7` — buổi đã diễn ra và Back | OK; buổi đã diễn ra mở được; Quay lại trong trang về danh sách; Back trình duyệt được kiểm và có lỗi T1-02 | `/tmp/ui-test-1/09-session-past.png`, `/tmp/ui-test-1/17-unsaved-attendance.png` |
| Tab Nhận xét — bộ lọc, chọn học sinh, câu mẫu, Lưu nháp, Lưu và gửi, offline mô phỏng | OK; câu mẫu chèn “Em cần luyện nghe.”; đổi học sinh rồi quay lại giữ chữ; Lưu nháp báo đã lưu trên máy; mô phỏng mất mạng báo `Đã lưu nháp trên máy; hãy bấm gửi khi có mạng.`; gửi online báo `Đã gửi nhận xét cho phụ huynh.` | `/tmp/ui-test-1/08-comments.png` |
| Hủy buổi planned và xem lại danh sách | OK; hủy buổi 9 chuyển chi tiết sang “Buổi đã hủy” và không cho điểm danh/nhận xét; danh sách có nhãn “Đã hủy” | Ảnh trước hủy: `/tmp/ui-test-1/16-session-planned.png`; **không có ảnh sau hủy**, xem mục Không kiểm được |
| `/lop/6a/bai-kiem-tra`, `/lop/6a/diem`, `/lop/6a/hoc-sinh`, `/lop/6a/bao-cao` | OK về mở route, hiển thị nội dung, không tràn trang, script vùng chạm `[]`; bảng điểm có khung cuộn riêng 672×350px với `overflow-x:auto` | `/tmp/ui-test-1/10-tests.png`–`/tmp/ui-test-1/13-report.png` |
| `/lich`, `/cai-dat`; avatar CL từ `/lop` | OK; tab chính đang chọn có `aria-current="page"`; avatar CL mở Cài đặt | `/tmp/ui-test-1/14-schedule.png`, `/tmp/ui-test-1/15-settings.png` |

Đối chiếu thiết kế trên `/lop`: body nền `rgb(246, 247, 249)`; font-family bắt đầu `"Plus Jakarta Sans"`, `document.fonts.check('16px "Plus Jakarta Sans"')=true`; card trắng, bo `16px`, border `0px`; chip `rgb(246, 247, 249)`, bo `10px`; pill bo `999px`. Màn chi tiết: nút chính `rgb(47, 91, 234)` và thanh tab dưới vẫn hiện, không che nút lưu.

### Không kiểm được

- Không đặt được DPR 3 hoặc bật touch; trình duyệt chạy DPR 1, `maxTouchPoints=0`.
- Không chặn mạng thật. Đã dùng công tắc “Mô phỏng mất mạng” theo hướng dẫn; không kiểm luồng gửi bằng offline ở tầng trình duyệt.
- Vuốt ngang bảng điểm bằng thao tác browser bị timeout. Chỉ đo được khung riêng `overflow-x:auto`, `scrollWidth=672`, `clientWidth=350`; chưa xác nhận scrollLeft đổi bằng thao tác.
- Ảnh trạng thái sau hủy buổi không lưu được: Paseo trả `The tab has not painted yet` trong hai lần chụp. Trạng thái đã xác nhận bằng DOM: nhãn “Đã hủy” trong danh sách và thông báo trên chi tiết.
- Chưa mở `/lop/6a/bai-kiem-tra/moi`, `/lop/6a/bai-kiem-tra/6a-test-0` và các route cũ chuyển hướng; không nằm trong các luồng tương tác được giao ở bước 1–8.

## 4. Console

Không thấy lỗi hoặc cảnh báo runtime. Các thông điệp lặp lại khi mở route, nguyên văn:

- Route `/dang-nhap`, `/lop` và các route lớp: `[vite] connected.`
- Route `/dang-nhap` và các route lớp: `%cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold`

## 5. Kết luận

Status: DONE_WITH_CONCERNS
Summary: Đã kiểm các luồng chính bằng trình duyệt ở 390×844, đo vùng chạm/tràn ngang và lưu ảnh cho các màn đã mở. Có hai lỗi chặn liên quan mất dữ liệu bản nháp điểm danh, một lỗi trạng thái buổi tương lai; còn hạn chế DPR/touch, cuộn ngang thực tế và một số route phụ chưa kiểm.
Concerns/Blockers: T1-01, T1-02; ảnh trạng thái sau hủy buổi và một số route phụ chưa có bằng chứng chụp.
