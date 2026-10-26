# Audit theo ảnh — Team A (giáo viên mobile), trước khi sửa

Nguồn: `web/shots/ui-audit/before/A/{390x844,375x667,430x932}/`. Ảnh chụp sau commit 0c06a7c. Banner "Lỗi lưu — vui lòng thử lại" là máy chủ giả, không tính. Dữ liệu giả, không có SĐT thật.

Quy ước: ảnh 2× (390 → 780px, 375 → 750px, 430 → 860px). Tọa độ trong bảng là CSS px ước lượng từ ảnh.

## Phát hiện

| ID | Màn (route) | Viewport | Ảnh | Vị trí | Vấn đề | Mức | Đề xuất | Token liên quan |
|---|---|---|---|---|---|---|---|---|
| A-01 | `/lop/moi` | 390x844 | `A/390x844/02-create-class-main.png` | Nút "Tạo lớp" cuối form | Thanh tab dưới che mép dưới nút chính (khoảng 24px cuối bị che). Nút không có footer dính tính đến tab dưới | Cao | Đưa "Tạo lớp" vào footer cố định phía trên tab dưới; đáy trang cộng `--tabbar-total` | `--tabbar-total`, `--page-bottom` |
| A-02 | `/lop/moi` | 375x667 | `A/375x667/26-create-class-main.png` | Nút "Tạo lớp" | Nút nằm dưới mép khung nhìn (khoảng y 678–730), phải cuộn mới thấy. Không có footer dính | Vừa | Như A-01 | `--tabbar-total` |
| A-03 | `/lop/moi` | 430x932 | `A/430x932/38-create-class-main.png` | Nút "Tạo lớp" | Mép dưới nút sát thanh tab dưới, không có khoảng đệm | Vừa | Như A-01 | `--page-bottom` |
| A-04 | `/lop/moi` | 390, 375, 430 | `02-`, `26-`, `38-create-class-main.png` | Hàng chip "Ngày học trong tuần" (T2–CN) | 390 và 430 là một hàng 7 ô. 375 xuống 4+3 nên lưới không đồng nhất. Ở 390 ô CN tràn lề phải khoảng 1px | Vừa | Dùng lưới 7 cột với gap theo thang 4/8 và kích thước co theo `--page-x` | `--page-x`, `--space-8` |
| A-05 | `/lich` | 390, 375, 430 | `03-`, `27-`, `39-schedule-main.png` | Cột ngày của mục "Sắp tới" | Nhãn "Thứ Bảy" xuống 2 dòng ("Thứ / Bảy"), còn "Thứ Ba" một dòng. Cột ngày không có độ rộng cố định | Vừa | Đặt `min-width` cố định cho cột ngày, không xuống dòng | — |
| A-06 | `/lop/demo-6a/hoc-sinh` | 390x844 | `A/390x844/06-class-students-main.png` | FAB góc phải dưới, đè hàng "Học sinh 6" khi danh sách cuộn | FAB che nút "⋯" của hàng học sinh | Cao | Chừa đáy danh sách bằng `--fab-clearance`. Cân nhắc thu hoặc ẩn FAB khi cuộn xuống hàng | `--fab-clearance`, `--fab-size` |
| A-07 | `/lop/demo-6a/hoc-sinh` | 375x667 | `A/375x667/30-class-students-main.png` | FAB góc phải, đè hàng "Học sinh 4" | FAB che nút "⋯" của hàng học sinh | Cao | Như A-06 | `--fab-clearance` |
| A-08 | `/lop/demo-6a/buoi-hoc` | 390, 375, 430 | `04-`, `28-`, `40-class-sessions-main.png` | Nhãn "Buổi hiện tại", "Các buổi đã qua" | Nhãn lệch khoảng 4px so với mép thẻ (x ≈ 24 so với 20) | Vừa | Nhãn section dùng `--page-x` như thẻ | `--page-x` |
| A-09 | `/lop/demo-6a/*` (header lớp) | 390, 375, 430 | `04-`, `32-`, `46-` | Nút back chevron và tiêu đề "Lớp 6A" | Chevron bắt đầu x ≈ 28–30px, lệch với mép 20px của tab và thẻ bên dưới | Vừa | Header lớp dùng `--page-x` | `--page-x` |
| A-10 | `/lop/demo-6a/*` (tab lớp) | 375x667 | `A/375x667/32-tests-main.png` | Hàng tab "Buổi học … Báo cáo" | "Báo cáo" sát mép phải, không có dấu hiệu cuộn ngang | Thấp | Thêm gợi ý cuộn (mép mờ) hoặc giảm khoảng cách tab | `--space-16` |
| A-11 | `/lop/demo-6a/bai-kiem-tra/demo-test` | 390x844 | `A/390x844/09-test-scores-main.png` | Footer dính: banner lỗi, "Sửa 1 ô lỗi", nút "Lưu điểm" | Footer dính cộng tab dưới chiếm khoảng 1/3 màn hình, danh sách chỉ còn khoảng 3 hàng khi lỗi hiện. Hàng "Học sinh 5" bị cắt bởi footer | Vừa | Gom banner lỗi thành một dòng gọn trên nút lưu. Chừa đáy danh sách bằng footer thực tế | `--space-12`, `--page-bottom` |
| A-12 | `/lop/demo-6a/bai-kiem-tra/demo-test` | 375x667 | `A/375x667/33-test-scores-main.png` | Cùng footer như A-11 | Footer chiếm khoảng 250px của khung 667px | Vừa | Như A-11 | `--space-12` |
| A-13 | `/lop/demo-6a/diem` | 390, 375, 430 | `10-score-grid-main.png`, `34-score-grid-main.png`, `46-score-grid-main.png` | Bảng điểm (tab "Điểm") | Bảng chỉ có cột "Học sinh", không có cột cho "Kiểm tra giữa kỳ" dù lớp đã có một bài. Thiếu trạng thái/nội dung rõ ràng | Vừa | Kiểm tra dữ liệu fixture trước; nếu lỗi thật thì thêm cột bài kiểm tra và trạng thái trống | — |
| A-14 | `/lop/demo-6a/buoi-hoc/demo-past` | 430x932 | `A/430x932/48-session-detail-main.png` | Thẻ "Cần chú ý" ở cuối và nút "Lưu điểm danh" | Nút dính đáy che phần đầu thẻ "Cần chú ý" khi cuộn, không có khoảng đệm đáy | Vừa | Chừa đáy danh sách bằng chiều cao footer | `--page-bottom` |
| A-15 | `/lop/demo-6a/buoi-hoc/demo-past` | 390x844 | `A/390x844/12-session-detail-main.png` | Nút "Lưu điểm danh" | Cùng vấn đề như A-14 | Vừa | Như A-14 | `--page-bottom` |
| A-16 | `/lop/demo-6a/bao-cao` | 390, 430 | `A/390x844/11-reports-main.png`, `A/430x932/47-reports-main.png` | Nút "Phát hành báo cáo" đáy trang | Nút trông nhạt, chữ trắng trên nền xanh nhạt, độ tương phản thấp. Không rõ có phải trạng thái vô hiệu hóa hay không (xem Không chắc) | Vừa | Nếu là trạng thái vô hiệu hóa, ghi rõ bằng dòng hướng dẫn. Nếu không thì tăng độ tương phản | Màu nút (token) |

## Chuyển team khác

- **T (token + UI chung)**, ranh giới `src/shared/**`, `src/app/**`:
  - FAB chồng hàng khi cuộn (A-06, A-07). Vị trí FAB đã neo theo viewport, lề phải 20px đúng `--page-x`. Phần còn lại là chồng nội dung khi cuộn và thiếu `--fab-clearance` ở danh sách.
  - Footer dính và nút chính đáy màn không tính đến `--tabbar-total` (A-01, A-02, A-03, A-11, A-12, A-14, A-15). Đây là pattern chung cho mọi màn có action đáy.
  - Liên kết "Đến nội dung" (skip link) hiện trong ảnh cuộn (xem Không chắc).
- **B**: không có ảnh desktop trong bộ A. Không có mục chuyển B.
- **C**: không có mục chuyển C.

## Không chắc

- **Ảnh không tìm thấy lớp**: nhiều ảnh 390 chụp trạng thái "Không tìm thấy lớp" (`05-class-students-main`, `06-tests-main`, `08-score-grid-main`, `08-tests-main`, `09-reports-main`, `10-session-detail-main`). Các màn này chưa được audit. Cần kiểm tra lại bộ chụp (route hoặc id lớp trong fixture).
- **Lệch tên ảnh**: các file 390 có số trùng nhau (05, 06, 07, 08, 09, 10). Ở 375, `36-session-detail-main.png` hiện màn buổi học chứ không phải chi tiết điểm danh. Phát hiện ở đây dựa theo nội dung ảnh, không theo tên. Nên đối chiếu với log chụp.
- **Chưa có ảnh điểm danh ở 375**: chỉ có ở 390 và 430.
- **Ảnh "cuộn đáy" không cuộn thật** (`04`, `05` ở 390; `28`, `29` ở 375): nội dung ngắn nên không chứng minh được khoảng đệm đáy.
- **Kích thước vùng bấm**: không đo được nút "⋯" trên hàng học sinh và ô nhập điểm từ ảnh. Cần đo bằng `elementFromPoint` hoặc DOM.
- **Đáy ảnh 390 `02-create-class-main`**: có dải xám dưới thanh tab, ảnh cao hơn viewport 844. Có thể do cách chụp, chưa kết luận.
- **Liên kết "Đến nội dung"** hiện trong `07-class-students-scrolled-bottom` và `31-class-students-scrolled-bottom`: có thể là trạng thái focus lúc chụp, không phải lỗi giao diện.
- **Ảnh 13–24 (390) và 13–24 lặp**: đã bỏ qua theo chỉ dẫn. Ảnh trạng thái bổ sung ở `v2/` chưa có.

## Tổng kết

Cao: 3 (A-01, A-06, A-07). Vừa: 12 (A-02, A-03, A-04, A-05, A-08, A-09, A-11, A-12, A-13, A-14, A-15, A-16). Thấp: 1 (A-10).
