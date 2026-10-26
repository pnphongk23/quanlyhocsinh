# Brief 97 · Phiếu chưa có: không hiện sao, gán mặc định tạo phiếu, gửi cả lớp chỉ gửi phiếu đã có

Nguồn chuẩn: `docs/spec.md` mục 4 (Phiếu buổi học, "Gán tất cả mặc định", Tab Nhận xét), cập nhật cùng brief này. Áp dụng **web và iOS**. Giao diện chỉ dùng token (`design/tokens/`, `design/ux-v2/rules.md`).

## Lỗi người dùng báo (2026-10-26, ảnh iPhone)
Buổi mới, tab Nhận xét: 3 em đều hiện 5 sao + "Chưa gửi", nhưng nút "Gửi phiếu cả lớp (0)" không gửi được. Bấm "Gán tất cả mặc định" cũng không làm nút gửi được. Nguyên nhân theo quy tắc cũ: em chưa có phiếu chỉ là phiếu ảo 5 sao; gửi cả lớp bỏ qua em chưa điểm danh; gán mặc định chỉ đổi phiếu đã có.

## Quyết định người dùng (đã chốt 2026-10-26)
1. Em chưa có phiếu: thẻ trong danh sách **không hiện sao**, ghi "Chưa nhận xét". Mở phiếu em đó vẫn ra phiếu mới mặc định 5 tiêu chí như cũ (chưa lưu cho tới khi giáo viên lưu).
2. "Gán tất cả mặc định": ngoài việc đưa phiếu chưa gửi về mặc định như cũ, **tạo phiếu mặc định** (5 tiêu chí, BTVN theo chấm, `hw_manual=false`, câu tự sinh) cho mọi em trong danh sách chưa có phiếu, kể cả em chưa điểm danh hoặc Vắng. Phiếu đã gửi/đang chờ gửi không đổi. Ghi được khi mất mạng như sửa phiếu thường. Hộp xác nhận ghi đúng số phiếu sẽ gán.
3. "Gửi phiếu cả lớp": **chỉ gửi phiếu đã có** và chưa gửi. Bỏ việc tự tạo phiếu mặc định khi gửi (không gửi `defaults` cho em chưa có phiếu nữa). Số trên nút = số phiếu đã có, chưa gửi. Bấm "Gán tất cả mặc định" xong thì nút đếm đủ các em.

4. Nhãn trạng thái phiếu đã gửi trên thẻ danh sách (và nơi khác ở tab Nhận xét nếu có) chỉ ghi **"Đã gửi"**, bỏ giờ gửi (vd "Đã gửi · 22:14" → "Đã gửi"). Người dùng thêm 2026-10-26.
## Phân công
- **Web (Chu Du)** và **iOS (Lỗ Túc)**: làm 1–3 phía mình, test đỏ-khi-bỏ-fix cho: thẻ em chưa có phiếu không có sao; gán mặc định tạo phiếu cho em chưa có phiếu (kể cả chưa điểm danh) và không đụng phiếu đã gửi/đang gửi; số đếm gửi cả lớp chỉ tính phiếu đã có; gửi không kèm `defaults`. Sửa chữ hộp xác nhận gửi nếu còn nhắc "phiếu mặc định 5 sao" cho em chưa có phiếu.
- **Backend:** không đổi. Máy chủ vẫn nhận `defaults` (client cũ), client mới không gửi.
- **QA (Bàng Thống):** sau deploy, chạy lại ca CMT-021/022 theo quy tắc mới trên web rồi iOS, có ca buổi mới chưa điểm danh như ảnh người dùng.

## Quy trình bắt buộc
Như brief 96: test liên quan + full suite + typecheck; sol tối đa 2 vòng, chỉ High chặn; GL gate trước deploy; không push; không xcodegen ở main; simulator/Chromium do GL cấp lượt, không chạy song song; đĩa ≥4 GiB; không in cred/SĐT/nội dung nhận xét ra log; không đụng 4 file iOS người dùng đang sửa.
