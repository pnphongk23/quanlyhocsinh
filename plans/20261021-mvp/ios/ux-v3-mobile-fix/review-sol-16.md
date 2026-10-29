# Review vòng 1 · iOS Brief 96

Phạm vi: `7f4d93e..e864f8f`, chỉ `ios/`; bỏ qua bốn file người dùng sửa. Đối chiếu spec `50003f7`, Brief 96, C8 v2, token và IOS-001/002. Không có phát hiện Cao.

Các đường dẫn dưới đây tính từ `ios/QuanLyLop/`.

1. **Vừa — Ghi đè phiếu vừa gửi.** `Features/Scores/ScoresFeatureStore.swift:357` và `Features/Comments/SessionCommentsView.swift:294`: khi gửi còn chờ phản hồi, vẫn bấm Quay lại rồi Gán mặc định được. Không đánh dấu phiếu đang gửi; danh sách mặc định chụp trạng thái draft. Nếu `slip.send` áp dụng trước `slip.set`, câu sửa tay/tiêu chí đã gửi bị thay bằng mặc định. Vòng ghi cũng không kiểm tra lại status sau mỗi lần sync. Cần chặn phiếu đang gửi và kiểm tra lại từng phiếu; thiếu test đảo thứ tự phản hồi.

2. **Vừa — Chấm BTVN có thể thiếu cập nhật phiếu sau gián đoạn.** `Features/Scores/ScoresFeatureStore.swift:529` ghi grade, rồi await refresh trước khi ghi `slip.set` ở dòng 545; lỗi lưu phiếu còn bị bỏ qua. App bị kết thúc giữa hai bước: grade còn trong outbox, phiếu giữ câu/sao cũ. Mở lại và gửi phiếu hiện có không tự sửa; C8 v2 đã bỏ tính lại phía server. Cần ghi hai thay đổi cùng transaction hoặc có cơ chế phục hồi; thiếu test restart/lỗi ghi bước hai.

3. **Vừa — Thiếu default cho phiếu legacy chưa chọn sao.** `Features/Comments/CommentsRules.swift:86`: phiếu thang 3 draft, stars=null, học sinh Vắng/chưa điểm danh vẫn thuộc danh sách gửi vì đã có phiếu, nhưng guard attendance loại default. Server trả `no_default` theo C8 v2, gửi không hết lớp. Chỉ áp điều kiện Có mặt/Muộn khi chưa có phiếu. Swift harness dùng hàm nguồn xác nhận số default lần lượt 1/0/0 cho Có mặt/Vắng/chưa điểm danh. Test hiện chỉ kiểm legacy Có mặt.

4. **Thấp — Chưa xử lý đủ lỗi phone-check.** `Features/Auth/AuthService.swift:630`: 422 có `fields.phone=invalid_phone` rơi vào thông báo validation chung; 429 bỏ qua Retry-After, nút tiếp tục dùng lại ngay. Ví dụ số đủ độ dài nhưng server từ chối định dạng, hoặc header yêu cầu đợi 900 giây. Thiếu test 422 và thời hạn retry.

5. **Thấp — Token/vùng chạm.** `Features/Auth/AuthComponents.swift:401` ghi cứng padding 16, chiều cao 56 thay token input 52; `Features/Comments/SessionCommentsView.swift:221` thêm spacing/font số trực tiếp. `Features/Auth/AuthScreens.swift:44` thêm nút Đổi số chỉ cao theo chữ, không bảo đảm 44pt. Cần dùng token và minHeight tap; chưa đo trên thiết bị.

IOS-001: callback onSuccess của chính AppSaveButton thay quan sát phase; IOS-002: copy đã dùng “nhận xét”. Đã kiểm diff, nguồn test, không thấy thêm log dữ liệu nhạy cảm; harness kiểm chọn buổi kế cùng ngày pass. Không chạy lại suite 289 theo yêu cầu. Tôi không thể xác minh UI/race chạy thực tế vì không chạy simulator/xcodebuild.

Status: DONE_WITH_CONCERNS
