# Review sol 6 — khép bằng chứng app thật SE3 cho P7

Ngày 24/10/2026. Candidate/HEAD đã kiểm: `4929b051dc42f560c9e734db9b36e54d28fc08cc`.

ĐẠT cổng nghiệm thu P7 cho 7 yêu cầu, khép Chặn G1. Đã xem đủ 10 ảnh real-SE3 và đối chiếu đủ 8 ảnh real-iPhone16. Tab bar, nút Lưu ghim đáy, nhãn tab, menu và sheet phù hợp; indicator Nhận xét/BTVN xác nhận trên SE3. Ảnh SE3-02 giữa chuyển cảnh không dùng riêng để nghiệm thu, nhưng SE3-07 ổn định đã bù cùng màn nên không bắt buộc thay. Không còn Chặn/Cao; các khoảng trống cũ giữ Vừa, không coi là PASS. Chỉ kiểm artifact, không chạy app hay đổi dữ liệu.

## Phạm vi và nguồn bằng chứng

Chỉ tái kiểm mục Chặn G1 của [review-sol-5.md](review-sol-5.md), đọc [p7-report.md](p7-report.md), spec và gate UI. Không sửa mã, build, chạy simulator, đăng nhập, chọn trạng thái mới hoặc bấm Lưu. Đây là kiểm ảnh/artifact có sẵn, không phải lần chạy độc lập hay xác minh trên iPhone phần cứng. Các kết luận mã/test và quyết định C1/C2 đã khép ở review-sol-5 được giữ nguyên, không tuyên bố đã chạy lại.

Đã mở và XEM từng ảnh sau trong `shots/after-session-fb/` (không suy nội dung từ tên file):

- `real-SE3-01-goc-lop-tab-bar-hien.png`
- `real-SE3-02-chi-tiet-lop-tab-bar-an.png`
- `real-SE3-03-diem-danh-dau.png`
- `real-SE3-04-menu-trang-thai.png`
- `real-SE3-05-diem-danh-cuoi.png`
- `real-SE3-06-sheet-thong-tin.png`
- `real-SE3-07-back-ve-chi-tiet-lop.png`
- `real-SE3-08-back-ve-goc-tab-bar-hien.png`
- `real-SE3-09-tab-nhan-xet.png`
- `real-SE3-10-tab-bai-tap-ve-nha.png`
- `real-iPhone16-01-goc-lop-tab-bar-hien.png`
- `real-iPhone16-02-chi-tiet-lop-tab-bar-an.png`
- `real-iPhone16-03-diem-danh-dau.png`
- `real-iPhone16-04-menu-trang-thai.png`
- `real-iPhone16-05-diem-danh-cuoi.png`
- `real-iPhone16-06-sheet-thong-tin.png`
- `real-iPhone16-07-back-ve-chi-tiet-lop.png`
- `real-iPhone16-08-back-ve-goc-tab-bar-hien.png`

Đã đọc `/private/tmp/qlh-ux3-p7/flows/real2.yaml:3–57`: gốc → lớp → buổi, mở/đóng menu, cuộn, mở/đóng info, chọn Nhận xét/BTVN, back hai lần; không nhập chữ, không chọn mục trạng thái và không bấm Lưu. File flow hỗ trợ diễn giải thứ tự ảnh; có flow không tự chứng minh đã thực thi PASS. Báo cáo P7 ghi bộ SE3 dùng phiên staging có sẵn; không dùng tên tài khoản chứa “demo” để kết luận đó là DemoScreens.

## Đối chiếu bảy yêu cầu P7

Số ảnh trong bảng dùng hai tiền tố `real-SE3-` và `real-iPhone16-` ở danh sách trên.

| Yêu cầu | Quan sát và giới hạn |
|---|---|
| 1. Tab chữ, bỏ nền, gạch chỉ báo | Cả hai máy ảnh 03: ba nhãn Điểm danh/Nhận xét/Bài tập về nhà đọc đủ, không cắt chữ, nền không dạng pill, gạch xanh ở Điểm danh. SE3-09/10: nhãn chọn đổi màu và gạch chuyển đúng Nhận xét/BTVN, nội dung tương ứng hiện. iPhone16 chưa có ảnh chọn hai tab sau; không suy rộng thành đã kiểm. |
| 2. Bỏ dòng phụ, đưa thông tin vào info | 03 hai máy: tiêu đề gọn và nút info, không dòng phụ. 06 hai máy: sheet đọc đủ lớp/ngày/giờ và hai vị trí người dạy, có nút Đóng. Nguồn người dạy giữ quyết định C1, không chứng minh dữ liệu phân công thực tế. |
| 3. Bỏ thẻ Người dạy trong Điểm danh | 03 và 05 hai máy không có thẻ đó; thông tin người dạy nằm trong sheet 06. |
| 4. Bỏ hướng dẫn vuốt, trạng thái có menu | 03/05 không có hướng dẫn vuốt; pill có chevron. 04 hai máy mở rõ Có mặt/Vắng/Muộn/Có phép, dấu chọn Có mặt. Không chứng minh chọn từng trạng thái hay lưu. Giữ bốn trạng thái theo quyết định C2. |
| 5. Ẩn Cần chú ý khi rỗng | Không có thẻ rỗng ở 03/05 hai máy. Điều kiện dữ liệu và assertion đã được review trước; ảnh này không tự chứng minh mọi nhánh có/không có học sinh cần chú ý. Không thay dữ liệu để kiểm. |
| 6. Lưu ghim đáy, danh sách cuộn | 03 so với 05 trên từng máy: nội dung đã cuộn đến dòng cuối, nút Lưu giữ vị trí đáy; dòng cuối nằm phía trên thanh Lưu, không bị che. Chưa có bàn phím. Dòng “Đã lưu trên máy” không phải bằng chứng vừa lưu thành công. |
| 7. Ẩn tab bar ở chi tiết, hiện lại ở gốc | 01/08 hai máy: tab bar hiện, không có back ở gốc. 03–05 và 07: không tab bar; 07 có back ở chi tiết lớp. SE3-09/10 cũng ẩn tab bar. Chuỗi ảnh và flow hỗ trợ back buổi → lớp → gốc; không chứng nhận mọi đường điều hướng. |

## Ảnh SE3-02 và quyết định G1

SE3-02 lệch ngang, lộ màn trước ở cạnh trái và cắt phần phải; không dùng ảnh này để chứng nhận bố cục ổn định hoặc suy thành lỗi tràn ngang. SE3-07 chụp cùng màn chi tiết lớp ở trạng thái ổn định: back/menu hiện rõ, các nhãn tab đọc đủ, gạch Buổi học đúng, nội dung không lệch và tab bar ẩn. Đối chiếu iPhone16-02/07 cho cùng kết quả bố cục/ẩn tab bar.

**Chấp nhận bộ bằng chứng hiện tại; không bắt buộc ảnh thay thế để khép P7.** Nếu cần ảnh riêng cho thời điểm vừa push vào lớp, nên thay SE3-02 bằng ảnh đợi chuyển cảnh xong, chỉ điều hướng và chụp; không cần đổi dữ liệu. Đây là cải thiện artifact mức Thấp, không giữ Chặn khi đã có SE3-07 bù đúng màn.

Gate yêu cầu app thật trên cả iPhone 16 và SE3; khoảng trống thiết bị của G1 nay được khép cho phần màn/luồng P7 đã nêu. Kết luận **ĐẠT cổng nghiệm thu P7 (7 yêu cầu người dùng)** kế thừa các mục đã khép ở vòng trước và bổ sung bằng chứng SE3 mới. Không phải nghiệm thu toàn bộ ma trận UI dự án hoặc toàn bộ đường ghi dữ liệu.

## Mục còn lại theo mức độ

- **Chặn:** không còn trong phạm vi P7 tái kiểm; G1 khép.
- **Cao:** không còn; giữ kết luận C1/C2 đã khép, không mở lại nghiệp vụ người dạy hay bốn trạng thái.
- **Vừa:** bàn phím/giờ muộn/ghi chú; Lưu thành công/lỗi/loading/disabled và chọn trạng thái rồi lưu; chi tiết buổi hủy/chưa tới ngày; Dynamic Type lớn; Lịch → buổi → back, đổi tab gốc và push sâu. Giữ khoảng trống ảnh Nhận xét/BTVN đang chọn trên iPhone16; phần indicator/nội dung của hai tab đã có bằng chứng SE3-09/10. Các mục này chưa kiểm PASS, không nâng thành Chặn. Bằng chứng flow phụ huynh 03/người dùng thực tế và trạng thái “Đã lưu trên máy” thường trực vẫn giữ Vừa theo review-sol-5, không có bằng chứng mới để đổi mức.
- **Thấp:** nên thay ảnh SE3-02 nếu muốn bộ ảnh trình bày sạch và ghi hash `4929b05` trực tiếp trong P7 để truy vết; không bắt buộc cho quyết định này.

Tôi không thể xác minh điều này vì bộ artifact chưa có các ca Vừa vừa liệt kê và phạm vi reviewer cấm chạy app/build/simulator/đăng nhập mới. Cụ thể, chưa xác minh đầy đủ đường lưu, mọi trạng thái và mọi đường điều hướng; kết luận ĐẠT chỉ áp dụng cổng P7 trong phạm vi bằng chứng đã kiểm ở trên.
