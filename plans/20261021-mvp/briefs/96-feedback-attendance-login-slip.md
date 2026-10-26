# Brief 96 · Góp ý 2026-10-26: điểm danh 3 trạng thái, đăng nhập 2 bước, phiếu sửa câu

Nguồn chuẩn: `docs/spec.md` (đã cập nhật trong commit kèm brief này). Đọc mục 4 (Điểm danh, Nhận xét, Tài khoản) và mục 8.
Mọi thay đổi áp dụng **cả web và iOS** trừ khi ghi khác. Giao diện chỉ dùng token (`design/tokens/`, `design/ux-v2/rules.md`).

## Quyết định người dùng (đã chốt 2026-10-26)

### A. Điểm danh
1. Còn 3 trạng thái: Có mặt, Muộn, Vắng. Bỏ Có phép.
2. Dữ liệu cũ `excused` → `absent` (migration máy chủ, có backup trước, đếm số dòng trước/sau). Cảnh báo vắng 2 buổi tính cả các dòng đã chuyển.
3. Muộn không còn ô giờ đến và ghi chú. Dữ liệu giờ/ghi chú cũ giữ trong DB, không hiện, không gửi.
4. iOS: vuốt trái một dòng học sinh hiện nút Có mặt / Muộn / Vắng (kiểu swipe actions). Chạm nhãn trạng thái vẫn đổi được. Web: chạm chọn như cũ, chỉ còn 3 lựa chọn.
5. Máy chủ từ chối `excused` cho lệnh mới (mã lỗi rõ ràng). Client cũ còn lệnh `excused` trong hàng đợi: máy chủ trả lỗi validation như lệnh không hợp lệ khác.

### B. Màn buổi học
6. Thứ tự tab: Điểm danh, Bài tập về nhà, Nhận xét.

### C. Phiếu nhận xét
7. Bỏ nhãn "Tự sinh theo tiêu chí" trong ô nhận xét.
8. Câu tự sinh **sửa tay được**. Tích/bỏ tích một tiêu chí → câu tự sinh lại, ghi đè phần sửa tay. Phần gõ thêm (note) giữ riêng như hiện tại.
   - Hợp đồng đổi: `slip.set` nhận `comment` từ client khi giáo viên sửa tay. Máy chủ vẫn tự sinh khi lệnh có `criteria` mà không kèm `comment`, và khi chấm lại BTVN đổi phiếu nháp (ghi đè câu sửa tay, đúng quy tắc "đổi tiêu chí thì ghi đè"). Backend chốt hình dạng chính xác (vd. cờ `comment_manual` hoặc quy tắc "có comment thì dùng") và ghi `plans/20261021-mvp/data-api/contract-changes.md` trước khi web/iOS code.
9. Tiêu chí BTVN: buổi trước không giao BTVN → nhãn "Buổi trước chưa có BTVN" thay "Theo chấm BTVN", tiêu chí vẫn mặc định tích.
10. Nút "Gán tất cả mặc định" cạnh "Gửi phiếu cả lớp" (web; iOS đặt cùng khu vực nút gửi cả lớp). Hỏi xác nhận → mọi phiếu chưa gửi của các em trong danh sách: tích đủ 5 tiêu chí, BTVN theo chấm (bỏ lựa chọn tay, `hw_manual=0`), câu tự sinh lại; giữ note. Phiếu đã gửi/đang chờ gửi không đổi. Ghi được khi mất mạng như sửa phiếu thường.

### D. Đăng nhập (web và iOS)
11. Bỏ: dòng tên app + logo chữ, dòng "Dành cho giáo viên và phụ huynh", "Chưa có không gian làm việc? Đăng ký cho giáo viên", "Tạo tài khoản phụ huynh", hộp hướng dẫn phụ huynh. Mít trang trí giữ nếu đang có.
12. Ô SĐT không giới hạn số ký tự khi gõ; chấp nhận `0…`, `+84…`, khoảng trắng; chuẩn hoá khi gửi, báo lỗi định dạng sau khi bấm Tiếp tục.
13. Bước 1: chỉ SĐT + nút Tiếp tục. Máy chủ (endpoint mới, có rate limit theo IP và SĐT, chấp nhận rủi ro dò số) trả 1 trong 3:
    - đã có tài khoản → hiện ô mật khẩu + "Quên mật khẩu?" + nút Đăng nhập;
    - chưa có tài khoản, số đã được khai cho ≥1 học sinh → màn phụ huynh tự đặt mật khẩu lần đầu (mật khẩu + nhập lại), xong vào app như đăng ký phụ huynh hiện nay;
    - còn lại → màn đăng ký workspace giáo viên, SĐT điền sẵn.
14. Phụ huynh không tự đăng ký số chưa khai nữa: endpoint đăng ký phụ huynh từ chối số chưa khai. Tài khoản phụ huynh cũ giữ nguyên.

## Phân công
- **Backend (Tiêu Hà):** A1–A3, A5 (migration + validation), C8 hợp đồng + sinh câu, C9 dữ liệu cần cho nhãn nếu client chưa đủ, D13 endpoint kiểm tra số, D14. Cập nhật `contract-changes.md`, `docs/architecture.md` nếu đổi API. Deploy staging chỉ sau GL gate.
- **Web (Chu Du):** A3–A4, B6, C7–C10, D11–D13 phía web. Đợi hợp đồng backend cho C8 và D13.
- **iOS (Lỗ Túc):** như web phía iOS + A4 vuốt. Đợi hợp đồng backend cho C8 và D13. Không đụng 4 file người dùng đang sửa.
- **QA (Bàng Thống):** sau khi xong lượt iPhone hiện tại, viết testcase cho brief 96; chạy khi các lane deploy.

## Quy trình bắt buộc
Như brief 95: test liên quan trong lúc làm, full suite + typecheck cuối đợt; sol tối đa 2 vòng, chỉ High chặn; GL gate trước deploy; không push; không xcodegen ở main; simulator/Chromium do GL cấp lượt, không chạy song song; đĩa ≥4 GiB; không in cred/SĐT/nội dung nhận xét ra log.
