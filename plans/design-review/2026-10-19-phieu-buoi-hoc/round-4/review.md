# Review UX/nghiệp vụ — Round 4

Đã đối chiếu 28 ảnh trong `round-4/` với `INDEX.md`, các màn tương ứng trong `source/round-4/project-r4.dc.html`, spec mục 4 (Nhận xét và báo cáo; BTVN), mục 8, mục 10 việc 4b và các quyết định round 1–3. Không lặp lại hai finding round 3 đã ghi trong INDEX.

| # | Ảnh/Màn | Vấn đề | Tham chiếu spec | Đề xuất sửa | Mức độ (cao/vừa/thấp) |
|---:|---|---|---|---|---|
| 1 | 41 · GV · Buổi · Nhận xét · Sheet nhận xét | Sheet cho sửa sao/ghi chú nhưng liên kết “Chấm ở tab Bài tập về nhà” cho phép rời sheet trước khi bấm “Lưu”. Thiết kế chưa cho biết phần đang nhập được giữ hay mất. Nếu mất, giáo viên phải nhập lại sau khi chấm BTVN; với 10–20 em đây là thao tác lặp đáng kể và dễ mất nhận xét. | Spec mục 4 “Nhận xét và báo cáo”: chạm học sinh mở sheet để chọn sao/ghi chú; kết quả BTVN chỉnh ở tab BTVN. | Giữ nháp sao/ghi chú khi chuyển tab và khi mở lại sheet; nếu không giữ được thì cảnh báo trước khi rời sheet. Sau chấm, có đường quay lại đúng học sinh đang nhận xét. | vừa |
| 2 | 51, 53, 57 · GV · BTVN · biểu tượng sửa phần | Nút sửa hiển thị như icon bút nhỏ ở mép phải từng phần; vùng thao tác nhìn thấy nhỏ hơn 44×44 px theo tỷ lệ ảnh 2x. Với 3–4 phần, giáo viên phải nhắm icon nhỏ nhiều lần; dễ chạm nhầm trên iPhone. | Spec mục 8: PWA/mobile. Quy ước vùng chạm tối thiểu 44×44 đã dùng ở quyết định round 1 (mục 12). | Tăng vùng hit-test của từng nút bút lên tối thiểu 44×44 px, giữ icon nhỏ bên trong; áp dụng nhất quán ở màn “Bài tập hôm nay” và các trạng thái có nút sửa. | vừa |
| 3 | 10 · PH · Báo cáo tháng · Sao và BTVN | Thanh “Tải PDF về máy” và thanh điều hướng cố định đè lên cuối bảng: hàng “Bài tập” bị che một phần, chú thích “Chỉ tính kết quả đã gửi…” không thấy trong khung ảnh. Phụ huynh khó đọc đủ số liệu và không thấy điều kiện tính như bản GV ở ảnh 07. | Spec mục 4 “Nhận xét và báo cáo”: báo cáo có kết quả BTVN; số liệu chỉ tính kết quả đã gửi, không tính “Chưa chấm”, không quy ra điểm (quyết định round 2, áp dụng cả GV và PH). | Bảo đảm cuộn tới hết bảng và chú thích mà không bị thanh tải PDF/điều hướng che; thêm khoảng đệm dưới nội dung hoặc thu gọn/ẩn thanh hành động khi cuộn. | vừa |

## Trạng thái đã chốt và đối chiếu

- Luồng 3 tab được thể hiện: danh sách nhận xét → sheet từng em; BTVN có phần buổi trước mặc định và phần hôm nay; gửi phiếu đặt ở tab Nhận xét. Sheet hiển thị BTVN chỉ đọc và có đường sang tab chấm, đúng phạm vi đã chốt. Điểm nghẽn chưa giải quyết là bảo toàn nháp khi đi theo đường này (finding 1).
- Có màn cho sửa phiếu đã gửi và thông báo phụ huynh thấy ngay (42); gửi khi còn “Chưa chấm” cùng số lượng (43); sửa/xoá phần đã/chưa chấm (53–54); học sinh rời lớp và giữ phiếu cũ (47); buổi chấm bị huỷ (57, 34); chưa có buổi chấm (58, 35); buổi trước không giao (46, 56); vắng buổi giao bài (59); buổi đầu (45, 55); gửi khi mất mạng (44). Trạng thái vắng buổi giao bài vẫn có thể chấm.
- Số liệu minh hoạ khớp ở các màn liên quan: 10 em, 4 em chưa chọn sao, 9 em chưa gửi, 5 phiếu đủ sao để gửi; xác nhận nêu 2 em còn 3 phần chưa chấm, phù hợp các dòng BTVN chưa chấm. Báo cáo GV/PH cùng có 8 buổi có phiếu, phân bố 5/2/1 và các tổng BTVN theo phần khớp. Các trạng thái buổi chấm bị huỷ ở GV/PH cùng chuyển từ buổi 19 sang buổi 20, 23/10.
- Không thấy chữ chồng/cắt trong các màn GV round 4. Ngoại lệ phần nội dung bị thanh cố định che ở báo cáo PH ảnh 10 (finding 3). Các tab, lựa chọn sao, nút lưu/gửi và segmented control chấm BTVN có kích thước chạm đủ lớn theo ảnh; icon bút sửa là ngoại lệ (finding 2).
- Chưa thấy câu hỏi nghiệp vụ còn mở.

Status: CHANGES_REQUESTED
