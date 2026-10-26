# FCM B2 review r1 — quyết định General Lead

Candidate r1: SHA256(manifest)=0936ec365dbfedc22eac53d55aaedbd7df1c82a9836b352bb02192464ad8e706, giữ bất biến. Hai reviewer CHANGES_REQUIRED.

- C-01 (correctness) REQUIRED: offline queue cho token có thể để thiết bị đổi chủ/role trước khi server thu hồi đăng ký. CHẤP NHẬN.
- R-01 (risk) REQUIRED: sender chưa yêu cầu token membership khớp membership hiện hành của auth_session sau PUT /session/membership. CHẤP NHẬN; gộp với C-01 thành một sửa vòng đời token.
- R-02 (risk) REQUIRED: fanout tạo deliveries chưa có bound số inbox/thiết bị mỗi invocation. CHẤP NHẬN.

Không cần người dùng chốt lại nghiệp vụ: các sửa chỉ cụ thể hoá yêu cầu token không còn nhận theo chủ/role cũ và giới hạn CPU. Không thay mật khẩu tạm, Q1/Q2/Q3/Q8 hay auth khác. Không implement runtime hoặc deploy.

## Hướng kỹ thuật chốt cho packet sửa

1. Đổi account/role và đăng xuất cần mạng + server acknowledgement trước khi client chuyển identity/cache/UI. Có token đang đăng ký mà mất mạng: không đưa thao tác đó vào outbox nghiệp vụ để rồi đổi identity ngay; giữ identity hiện tại, báo cần mạng. Server đổi membership phải gỡ đăng ký token của đúng auth_session hiện tại và bỏ deliveries của đăng ký đó trong cùng batch TRƯỚC response đổi role; phiên khác/thiết bị khác không bị gỡ. Client sau response đăng ký FCM theo membership mới; việc chưa nhận quyền push không cản dùng app. Đổi tài khoản thu hồi phiên/registration cũ trước, rồi mới kích hoạt tài khoản mới. Không mở cơ chế reset mật khẩu hay đổi schema auth không liên quan.
2. Sender mỗi lần gọi FCM phải đối chiếu auth_session active/unrevoked/unexpired, user và membership của token KHỚP chính user/membership hiện hành của phiên, cộng quyền con/nhóm/version như đã có; mismatch skipped, không chỉ kiểm hai object đều active. Thông báo OS/FCM đã được nhận/chấp nhận trước khi server ack thu hồi không thể được hứa thu hồi từ xa: ghi giới hạn rõ, client xoá notification cũ/không dùng payload cấp quyền; không tự tuyên bố tuyệt đối không có push đang bay. Lựa chọn ngăn account/role switch offline là đồng bộ vòng đời token, không đổi các quyết định đăng nhập CHỜ.
3. Mở rộng inbox: hard bound đề xuất tối đa 5 inbox và tổng 20 device registrations được xét trong một invocation, cùng ngân sách CPU/subrequests hiện hành; không tải toàn bộ token một inbox vào RAM trước rồi mới cắt. Keyset paging server-side, lưu tiến độ để cron sau tiếp tục; chỉ đánh dấu deliveries_expanded_at khi đã xét hết đăng ký đủ điều kiện. Nếu cần thêm cursor/state cột ở notifications thì tối thiểu, mô tả ràng buộc và cập nhật API/test nhất quán; không bảng dịch vụ/hệ thống queue mới. Khi expansion bắt đầu, nhóm điểm phải đóng/freeze đúng một lần để concurrent score không kéo ready_at/cursor của job đang gửi; nhập mới mở nhóm mới. Chốt mốc xét đăng ký theo binding user/membership/phiên hiện hành (không lấy created_at ban đầu qua lần chuyển chủ làm lộ push lịch sử); refresh cùng binding không làm thiết bị mất quyền nhận job hiện tại. Nếu gặp lựa chọn không suy được từ các ràng buộc này: báo parent thay vì tự mở kiến trúc.

Cần verify vòng 2 đúng hai nhóm root cause; các câu hỏi worker nêu khác chỉ sửa nếu phụ thuộc trực tiếp các điều trên, còn lại ghi riêng chưa chốt, không biến thành user blocker giả.
