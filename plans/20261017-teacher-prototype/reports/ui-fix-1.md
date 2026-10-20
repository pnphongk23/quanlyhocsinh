# Báo cáo sửa giao diện 1

Ngày: 2026-10-17  
Phạm vi: `design/prototype/`; F-01, F-02, F-04, F-08, F-09, F-13.

## Kết quả

| Mục | Bằng chứng trước sửa | Sửa và kiểm lại |
|---|---|---|
| F-01 | `reports/ui-test.md`, mục 2, F-01 ghi nhận `/lop` tràn ngang `scrollWidth=338` ở 320px; tên lớp dài làm thẻ giãn và cắt nút ở 390px. Follow-up: với tên lớp dài trên `/lop/6a/buoi-hoc`, `/bai-kiem-tra`, `/diem`, `/hoc-sinh`, `/bao-cao`, tái hiện trước sửa ở 320×568 cho `documentElement.scrollWidth=779` trên cả năm route. | Cho phần tử tiêu đề trong header co với `min-width: 0`, thêm ellipsis cho tên và để hàng nội dung header co theo chiều ngang. Sau sửa, trên cả năm route: `scrollWidth=320` tại viewport 320×568 và `scrollWidth=390` tại 390×844. `h1` giữ trong 223px; span tên dài rộng 199px, nội dung đo được 679px, `text-overflow: ellipsis`. |
| F-02 | `reports/ui-test.md`, mục 2, F-02: ở `/lop/6a/bao-cao`, tab Báo cáo có `left=409` trong viewport 390px và thanh cuộn chưa dịch. | Khi pathname đổi, tìm liên kết có `aria-current="page"` và cuộn thanh tab ngang để đưa nó vào giữa. Kiểm tra tại 390×844: tab Báo cáo đang chọn nằm trọn trong thanh tab (x=268–355, thanh x=0–375). |
| F-04 | `reports/ui-test.md`, mục 2, F-04: token 68px trong khi thanh tab dưới thực cao 64px, tạo khe 4px. | Đổi `--tabbar-height` thành 64px. Đo tại viewport 390×844: token `64px`, thanh điều hướng cao `64px`, đáy thanh trùng đáy viewport (khe `0px`). |
| F-08 | `reports/ui-test.md`, mục 2, F-08: gửi form thiếu thông tin có trạng thái “Lỗi lưu” dù chưa ghi. | Kiểm tra tên, ngày học và giờ trước khi gọi repository; lỗi hợp lệ được báo ngay trong form nhưng trạng thái lưu chuyển thành “Chưa lưu”. Browser riêng: điền tên, bỏ trống ngày, bấm Tạo lớp; thấy thông báo thiếu thông tin và “Chưa lưu”, không thấy “Lỗi lưu”. Nhánh `catch` chỉ còn bao quanh lần gọi tạo lớp đã qua validate. |
| F-09 | `reports/ui-test.md`, mục 2, F-09: nút ngày rộng 33px ở 320px và 43px ở 375px. | Đặt `min-width: 44px`; ở màn hẹp (tối đa 380px) xếp thành hai hàng. Trên `/lop/moi`, đo mỗi nút ngày cao 44px, rộng 61.75px tại viewport 320px và 75.5px tại 375px. |
| F-13 | `reports/ui-test.md`, mục 2, F-13: title luôn “Lớp của tôi”, kể cả đăng nhập. | Đặt title theo pathname cho đăng nhập, danh sách lớp, tạo lớp, các tab lớp, lịch và cài đặt. Browser riêng hiển thị title “Tạo lớp mới” ở form, “Lớp của tôi” ở danh sách và “Báo cáo” tại route báo cáo. |

## Kiểm chứng và giới hạn

- Browser Chrome dùng context thử riêng và cổng Vite `5191`. Đặt viewport qua browser capability rồi đo trực tiếp `innerWidth` và `document.documentElement.scrollWidth`; tên lớp dài được lưu từ giao diện Sửa lớp. Với năm route lớp, số đo sau sửa lần lượt là `320/320` (viewport/scrollWidth) ở 320×568 và `390/390` ở 390×844.
- Số đo tái hiện trước sửa cho năm route là `779` tại 320×568 trong browser riêng ở lượt kiểm tra trước. Số đo 390px trước sửa không được lưu.
- `npm run typecheck`: thành công.
- `npm run build`: thành công.
- `npm run test`: 8 test files, 30 tests passed.
- Không sửa test, không thêm thư viện, không commit.

Status: DONE
