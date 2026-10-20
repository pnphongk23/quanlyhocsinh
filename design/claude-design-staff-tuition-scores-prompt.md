# Prompt Claude Design: nhân sự, lương, học phí, báo cáo điểm

Gửi vào project "Import design folder vào Claude".

---

Thêm các màn hình mới vào bộ board hiện có của app "Quản lý lớp tiếng Anh" cho các nghiệp vụ mới bên dưới. BẮT BUỘC dùng đúng design system đã có trong project: màu, font, cỡ chữ, bo góc, khoảng cách, bóng đổ, chip, nút, thẻ, tab, sheet/modal, FAB, trạng thái rỗng và lỗi. Không thêm màu, font hay kiểu component mới; không đổi các màn đã có. Nếu thiếu component thì ghép từ component sẵn có. Giữ nguyên cách đặt tên board ("GV · ...", "Web · ...", "PH · ..."), tiếng Việt, vùng chạm tối thiểu 44px, một tay trên iPhone 390px. Trạng thái đồng bộ không hiện trên giao diện (chỉ hiện lỗi).

## Nghiệp vụ mới (tóm tắt)
- Phân công: mỗi lớp có 1 giáo viên chính và 0..n trợ giảng. Chỉ Admin phân công. Chỉ chọn được thành viên nhân sự đang hoạt động. Gán vào lớp thì tự thêm lớp vào phạm vi lớp người đó thấy; gỡ phân công không gỡ quyền thấy lớp.
- Dạy thay một buổi: Admin đổi người dạy cho một buổi (kể cả buổi lẻ học bù): chọn vị trí, người thay, lý do. Người được thay không tính buổi đó; người thay tính buổi theo vị trí họ đảm nhận và xem được buổi đó dù không được gán lớp. Không đổi người dạy buổi đã hủy.
- Lịch dạy theo tuần: liệt kê buổi một người dạy chính / trợ giảng / dạy thay, buổi bị thay (gạch, ghi "Được thay bởi …"), buổi hủy. Admin chọn được mọi người; nhân sự khác chỉ xem lịch của mình.
- Lương theo buổi. Mỗi người có đơn giá dạy chính và đơn giá trợ giảng (VND/buổi). Lương tháng = Σ buổi đã diễn ra trong tháng × đơn giá theo vị trí + khoản điều chỉnh (thưởng/trừ, có ghi chú). Buổi hủy, buổi chưa diễn ra không tính (buổi chưa diễn ra hiện "dự kiến"). Chỉ tính buổi người đó thực sự dạy; buổi hủy không tính, không phụ cấp. Chưa có đơn giá → cảnh báo "Chưa đặt đơn giá". Bảng lương tháng: Nháp → Đã chốt (khóa sửa). Admin quản lý toàn bộ; giáo viên, trợ giảng chỉ xem lương của mình (chỉ đọc), không thấy lương người khác.
- Học phí theo buổi: mỗi lớp có học phí/buổi và tuỳ chọn "Tính phí buổi vắng không phép" (mặc định bật). Buổi tính phí = buổi đã diễn ra trong tháng, trong khoảng ngày vào lớp..ngày rời lớp, trạng thái Có mặt/Muộn (+ Vắng nếu tuỳ chọn bật). Có phép và buổi hủy không tính. Buổi học bù tính phí hay không do Admin chọn theo lớp (tuỳ chọn "Tính phí buổi học bù"). Giảm học phí theo % từng học sinh. Phải thu làm tròn đến 1.000 đ.
- Học phí (team đề xuất): phiếu học phí theo tháng mỗi học sinh; ghi nhận thu (số tiền, ngày, tiền mặt/chuyển khoản, ghi chú; nhiều lần); trạng thái Chưa thu / Thu một phần / Đã thu đủ; công nợ = tổng còn thiếu các tháng trước; gửi thông báo học phí cho phụ huynh (từng em hoặc cả lớp, cần mạng); số tiền đổi sau khi gửi (sửa điểm danh) → ghi "Số tiền đã thay đổi, cần gửi lại". Tháng chưa hết hiện "Tạm tính". Chỉ Admin. Giáo viên và role khác Admin không xem được học phí. Không có gói trả trước. Phụ huynh xem phiếu và lịch sử thu.
- Báo cáo điểm từng học viên: mỗi em các bài theo ngày (điểm / Vắng thi / Chưa có điểm), trung bình, xu hướng (biểu đồ đường), chênh lệch bài gần nhất.
- Báo cáo điểm (team đề xuất): báo cáo tổng hợp lớp cho giáo viên: phân bố trung bình học sinh theo dải (<5, 5–6,4, 6,5–7,9, 8–10), tiến độ nhập điểm từng bài (đã có điểm / vắng thi / chưa nhập), danh sách "Cần chú ý" (TB < 5; hoặc bài gần nhất giảm ≥ 2 điểm so với bài có điểm trước đó; hoặc ≥ 2 bài vắng thi/chưa có điểm). KHÔNG hiện trung bình lớp hay trung bình từng bài.

## Màn cần thiết kế

### A. Phân công và dạy thay (Admin; mobile + web)
1. **Phân công giảng dạy**: danh sách lớp, mỗi thẻ có GV chính và trợ giảng, nút sửa mở sheet chọn GV chính (chọn một) và trợ giảng (chọn nhiều) từ nhân sự đang hoạt động. Trạng thái lớp chưa có GV chính.
2. **Đổi người dạy buổi này**: trong chi tiết buổi, khu "Người dạy" (GV chính, trợ giảng, nhãn "Dạy thay" nếu có); sheet chọn vị trí, người thay, lý do; huỷ dạy thay. Buổi đã hủy: khoá, giải thích.

### B. Lịch dạy (mobile + web)
3. **Lịch dạy theo tuần**: chọn người (Admin) hoặc "Lịch của tôi"; tuần trước/sau; mỗi buổi: giờ, lớp, nhãn Dạy chính / Trợ giảng / Dạy thay; buổi bị thay gạch ngang "Được thay bởi …"; buổi hủy. Tổng số buổi tuần. Trạng thái rỗng.

### C. Lương (Admin; giáo viên/trợ giảng xem của mình; mobile + web)
4. **Bảng lương tháng**: chọn tháng, mỗi người: số buổi chính, trợ giảng, dạy thay, điều chỉnh, tổng; tổng chi tháng; cảnh báo "Chưa đặt đơn giá"; trạng thái Nháp / Đã chốt; nút Chốt bảng lương (xác nhận).
5. **Chi tiết lương một người**: đơn giá (sửa), danh sách buổi đã tính (ngày, lớp, vị trí, tiền), buổi dự kiến, khoản điều chỉnh (thêm, ghi chú), tổng. Bản đã chốt: chỉ xem.
5b. **Lương của tôi** (giáo viên, trợ giảng; mobile): chọn tháng; nhãn trạng thái Nháp (tạm tính) / Đã chốt; tổng tháng; số buổi theo vị trí với đơn giá; danh sách buổi đã tính (ngày, lớp, vị trí, tiền), buổi dự kiến, khoản điều chỉnh kèm ghi chú. Chỉ đọc: không sửa đơn giá, không thêm điều chỉnh, không nút Chốt. Lối vào từ Cài đặt "Lương của tôi". Trạng thái: chưa có buổi trong tháng.

### D. Học phí
6. **Học phí tháng** (Admin; mobile + web): chọn tháng và lớp; ba số Phải thu / Đã thu / Còn nợ; danh sách học sinh với số buổi tính phí, phải thu, trạng thái Chưa thu / Thu một phần / Đã thu đủ, công nợ tháng trước, nhãn "Tạm tính"; lọc theo trạng thái; nút "Gửi thông báo cả lớp"; sửa học phí lớp (học phí/buổi, tính phí buổi vắng không phép, tính phí buổi học bù).
7. **Phiếu học phí một học sinh** (Admin): bảng buổi (ngày, trạng thái điểm danh, nhãn "Học bù" cho buổi học bù, tính phí hay không và lý do theo tuỳ chọn lớp), giảm %, phải thu, các lần thu, nút "Ghi nhận thu" (sheet: số tiền, ngày, tiền mặt/chuyển khoản, ghi chú), "Gửi thông báo", ghi chú "Số tiền đã thay đổi, cần gửi lại". Lỗi: gửi khi mất mạng.
8. **PH · Học phí** (mobile phụ huynh): phiếu tháng của con (số buổi, phải thu, đã thu, còn lại), lịch sử thu, chuyển giữa các con. Chỉ xem.

Không thiết kế gói học phí trả trước. Giáo viên không có lối vào Học phí.

### E. Báo cáo điểm (giáo viên; mobile + web)
9. **Báo cáo điểm của lớp**: phân bố trung bình học sinh theo 4 dải (<5, 5–6,4, 6,5–7,9, 8–10), tiến độ nhập điểm từng bài, danh sách "Cần chú ý" kèm lý do, danh sách học sinh (TB, số bài có điểm/tổng, mũi tên xu hướng). Không có TB lớp.
10. **Báo cáo điểm một học sinh**: các bài theo ngày (điểm / Vắng thi / Chưa có điểm), trung bình, biểu đồ đường xu hướng, chênh lệch bài gần nhất, chuyển học sinh trước/sau.

## Yêu cầu xuất
- Mỗi màn có bản mobile 390px; màn 1, 3, 4, 6, 9 thêm bản web desktop.
- Đủ các trạng thái: bình thường, rỗng, đang tải, lỗi, và các biến thể đã nêu.
- Dùng dữ liệu mẫu tiếng Việt thực tế: lớp "Tiếng Anh giao tiếp 6A" (150.000 đ/buổi) và "IELTS 7.0" (250.000 đ/buổi); nhân sự Cô Lan, Thầy Quang Minh, Cô Thu Trang; tiền định dạng "1.200.000 đ".
- Thêm các board mới vào cuối bộ hiện có, gom theo nhóm A–E. Liệt kê danh sách board đã thêm ở cuối phản hồi.
