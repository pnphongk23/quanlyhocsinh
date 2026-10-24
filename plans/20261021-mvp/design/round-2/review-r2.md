# Review vòng 2 · Web · Chi tiết lớp

## A. Đối chiếu finding đã chấp nhận

| Finding | Kết quả | Ảnh và bằng chứng |
|---|---|---|
| R1-01 | **ĐÃ SỬA ĐÚNG** | Ảnh 03: thẻ Người dạy chỉ có ảnh đại diện, “Cô Lan”, “Giáo viên phụ trách lớp”; không còn nút “Đổi người dạy”. |
| R1-02 | **ĐÃ SỬA ĐÚNG** | Ảnh 14: bảng có cột “Tài khoản phụ huynh” với ba trạng thái và nút cấp/cấp lại mật khẩu; thống kê 10 đang học = 7 đang dùng + 2 chờ đổi + 1 chưa cấp. Menu dòng có Sửa số điện thoại, Cấp lại mật khẩu, Đánh dấu nghỉ. Không còn trạng thái/nút mời hay “Thêm từ lớp khác”; bảng tách đúng cột, có chú thích dùng chung số điện thoại. |
| R1-03 | **ĐÃ SỬA ĐÚNG** | Ảnh 15: bộ chọn chỉ có một tháng “Tháng 10/2026”, không còn “3 tháng gần nhất”. |
| R1-05 | **ĐÃ SỬA ĐÚNG** | Ảnh 14: tiêu đề và nội dung được chia thành các cột Học sinh, Lớp đang học, Chuyên cần, Tài khoản phụ huynh; các dòng không còn dính thành đoạn chữ. |
| R1-06 | **ĐÃ SỬA ĐÚNG** | Ảnh 13 cho Trần Gia Bảo 14 ở “Kiểm tra nói Unit 6” tối đa 20; ảnh 15 hiển thị “Kiểm tra nói Unit 6 · 14/20”. Chuyên cần 16/18 ở ảnh 15 cũng khớp 16/18 ở ảnh 14. |
| R1-07 | **CHƯA SỬA ĐỦ** | Ảnh 04 và HTML nguồn có câu mức 2 sao nguyên văn theo spec, gồm `🌟🌟` và dấu câu. HTML cũng có câu 3 sao nguyên văn; không tìm thấy câu mẫu 1 sao trong HTML, dù ảnh 04 có lựa chọn 1 sao. Chưa có bằng chứng rằng trạng thái chọn 1 sao sẽ hiện đúng mẫu. |
| GL-01 | **ĐÃ SỬA ĐÚNG** | Ảnh 01: buổi hủy 7/10 ghi “Buổi đã hủy” không có số; 11/10 là Buổi 6, 12/10 Buổi 7, 14/10 Buổi 8, 19/10 Buổi 9. Ảnh 03–07 thống nhất tiêu đề/breadcrumb Buổi 9 · Thứ Hai, 19 tháng 10 · 18:00. |
| GL-02 | **ĐÃ SỬA ĐÚNG** | Ảnh 01: Buổi hiện tại là Buổi 10 · Thứ Tư, 21 tháng 10 · 18:00; không có chip “Buổi lẻ” hay nút “Sửa buổi lẻ” trên thẻ. |

## B. Bốn chỗ Claude Design tự quyết

**(a) Báo cáo — ĐỒNG Ý, có giới hạn xác minh.** Ảnh 15 liệt kê đúng 10 học sinh; Dũng và Kiệt là hai em thiếu dữ liệu, nên 8/10 sẵn sàng. Có 6 trạng thái Nháp và một “Cần phát hành lại”, khớp nút “Phát hành 7 báo cáo”. Gợi ý của Bảo ghi 2 buổi 3 sao, 1 buổi 2 sao, 1 buổi 1 sao; HTML có đúng chuỗi gợi ý này, còn ảnh 04 xác nhận Bảo đang có 3 sao ở buổi đang xem. Ảnh 03 là Điểm danh, không cho thấy lịch sử sao của đủ bốn buổi, nên không thể xác nhận độc lập toàn bộ phép đếm. Chuyên cần 16/18 khớp ảnh 14.

**(b) Học sinh — ĐỒNG Ý.** Ảnh 14 giữ lớp Kids Starters của Ngô Bảo Ngọc như INDEX yêu cầu; cùng SĐT với Trần Gia Bảo được ghi rõ. Menu đang mở ở Dũng chỉ có ba mục đã yêu cầu và không che tên, lớp, chuyên cần hay trạng thái tài khoản; nó che các dấu ba chấm của những dòng phía sau trong lúc mở.

**(c) Nhận xét — ĐỒNG Ý, không cần thêm ảnh cho từng mức.** Spec yêu cầu câu mẫu cố định theo mức đang chọn, vì vậy ảnh chỉ cần thể hiện mức hiện hành. Ảnh 04 và HTML xác nhận mẫu 2 sao; HTML có mẫu 3 sao đúng nguyên văn. Câu 1 sao cần có trong thiết kế/nguồn để hoàn tất lựa chọn đó, nhưng không cần tạo thêm màn hình riêng.

**(d) Buổi lẻ 25/10 — KHÔNG ĐỒNG Ý với trạng thái hiện tại.** Ảnh 01 chỉ ghi chú “Buổi lẻ Chủ Nhật 17:00 nằm ngoài lịch lặp”; buổi 25/10 không có trong bảng hoặc thẻ Buổi hiện tại, nên không thấy đường xem, sửa hay hủy. Đề xuất tối thiểu: thêm một dòng/thẻ “Buổi lẻ sắp tới · Chủ Nhật 25/10 · 17:00” trong cột phải, kèm Xem buổi, Sửa buổi lẻ, Hủy buổi; giữ Buổi hiện tại là buổi gần nhất 21/10. Điều này thực hiện khả năng thêm và quản lý buổi lẻ trong MVP mà không đổi lịch lặp.

## C. Finding mới

### R2-01 · MAJOR · Ảnh 01 · Buổi lẻ tương lai không thể thao tác

- **Mô tả:** Buổi lẻ Chủ Nhật 25/10 bị loại khỏi cả “Các buổi đã qua” và “Buổi hiện tại”; ảnh chỉ còn ghi chú ngoài lịch lặp. Người dùng không thấy cách mở, sửa hoặc hủy buổi đã tạo.
- **Căn cứ:** `docs/spec.md` mục 8, Bản đầu: thêm buổi lẻ ngoài lịch lặp; màn Buổi học chia buổi hiện tại và các buổi đã qua. INDEX vòng 2 mục (d) xác nhận đúng tình trạng này.
- **Đề xuất sửa:** Thêm một mục tối giản cho buổi lẻ sắp tới ở cột phải, ghi ngày/giờ và cung cấp Xem, Sửa buổi lẻ, Hủy buổi; không thay thẻ buổi gần nhất 21/10.

### R2-02 · MINOR · Ảnh 04 · Chưa có mẫu 1 sao trong HTML nguồn

- **Mô tả:** Ảnh có nút chọn 1 sao nhưng chỉ hiện mẫu 2 sao. Tìm trong HTML nguồn thấy mẫu 2 sao và 3 sao nguyên văn, không thấy câu mẫu 1 sao theo `docs/spec.md` mục 4; do đó chưa xác minh được nội dung khi chọn mức này.
- **Căn cứ:** `docs/spec.md` mục 4 quy định cả ba câu cố định, giáo viên không sửa câu mẫu; ảnh 04 là trạng thái 2 sao đang chọn.
- **Đề xuất sửa:** Bổ sung câu `Con chỉ đạt 1 sao 🌟. Chưa tập trung, nói chuyện làm việc riêng. Đã ghi chép bài đầy đủ.` làm mẫu của nút 1 sao trong HTML nguồn. Không cần thêm ảnh/màn riêng.

## D. Hồi quy, chất lượng UI và các điểm đạt

- Ảnh 01 giữ bố cục Buổi học hai cột; ảnh 06 giữ khung sửa BTVN cạnh danh sách. Ảnh 08–13 giữ bảng Bài kiểm tra/Điểm và các chip trạng thái; ảnh 09–12 thể hiện điểm tối đa theo bài, xác nhận xóa hẳn khi chưa có điểm và lưu trữ khi đã có điểm.
- Không thấy “Điểm trung bình”, “Vắng thi”, bài giảng, học phí, nhân sự, mời/OTP trong 15 ảnh. Các nhãn tiếng Việt đọc được; không thấy chữ chồng hoặc cắt ở ảnh đã xem ngoài ghi chú về ảnh 13 dưới đây.
- Cột Unit 7 Test ở ảnh 13 bị cắt ở mép phải; cùng hiện tượng đã có trong ảnh 13 vòng 1, nên đây không phải hồi quy vòng 2. Cần bảo đảm cột cuối truy cập được khi triển khai, nhưng không tính là finding mới của vòng này.
- Menu “…” mở ở Dũng (ảnh 14) chỉ chứa các mục trong outbox; lớp bổ sung của Ngọc đúng như controller báo, không tạo nút thêm học sinh từ lớp khác.

## Kết luận

**CHANGES_REQUESTED** — còn một finding MAJOR về buổi lẻ 25/10 không có đường thao tác và một finding MINOR chưa xác minh đủ mẫu 1 sao.

Status: DONE_WITH_CONCERNS
Summary: Đã đối chiếu đủ 15 ảnh với các finding vòng 1, spec và các quyết định tự chọn; báo cáo ghi nhận hai điểm cần xử lý/xác minh. Kết luận thiết kế là CHANGES_REQUESTED do buổi lẻ 25/10 không thể mở, sửa hoặc hủy từ các màn hiện có.
