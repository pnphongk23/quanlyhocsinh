# Thay đổi UX v2 cho web thật và iOS (2026-10-23)

Nguồn: prototype `design/prototype` sau đợt UX v2. Quy tắc nền: [rules.md](rules.md); IA phụ huynh: [guardian-ia.md](guardian-ia.md). Ảnh trước/sau: `design/prototype-shots/ux-v2/{before,after}/`. Chi tiết theo file: `plans/20261021-mvp/briefs/ux-0{1,2,3}-*.report.md`.

## 1. Chuyển động (cả app)
- Token: 150ms (nhấn, hover), 200ms (tab, mở/đóng, chuyển trang), 250ms (sheet/dialog vào). Easing ra/vào theo rules mục 4. Chỉ animate transform/opacity (mở/đóng dùng `grid-template-rows 0fr↔1fr`).
- Chuyển trang: chỉ trang mới vào (fade + lên 8px); trang đi sâu trên mobile trượt từ phải 16px.
- Sheet mobile trượt lên, dialog desktop phóng nhẹ + fade, nền mờ fade. Đóng chạy xong animation (~200ms) rồi mới đóng hẳn; mở lại giữa chừng thì huỷ đóng.
- Thanh tab/segmented: gạch chỉ báo 3px trượt tới tab đang chọn; lần hiện đầu không animate.
- Giảm chuyển động (`prefers-reduced-motion` / iOS Reduce Motion): mọi chuyển động tức thì.
- iOS: dùng animation hệ thống tương đương (`.easeOut` 0.2s, sheet chuẩn), không cần đo pixel.

## 2. Desktop giáo viên
- Vùng nội dung tối đa 1200px. Form đơn lẻ (tạo/sửa lớp, cài đặt): thẻ ≤ 640px căn giữa, nút chân form theo nội dung, căn phải, "Huỷ" trái nút chính.
- Nút desktop luôn rộng theo nội dung (min 96px); chỉ tràn ngang khi chủ động. Mobile: chỉ nút chính ở đáy màn/sheet tràn ngang.
- Tất cả lớp: hai cột `minmax(0,1fr) 360px`. Trái: ô tìm + "Tạo lớp mới", lưới thẻ lớp tự co 1–3 cột, thẻ có lịch và "Buổi tới: Thứ X dd/mm · hh:mm". Phải (dính): thẻ "Hôm nay · Thứ X dd/mm" gồm buổi hôm nay (hoặc buổi kế tiếp) và "Việc còn dở" của các buổi đã qua trong 14 ngày (bỏ buổi huỷ): "Điểm danh chưa xong", "Phiếu chưa gửi (n em)", "BTVN chưa chấm (n em)", mỗi dòng mở đúng tab buổi; tối đa 5 dòng + "và n việc khác". Mobile: cùng thẻ ở trên danh sách lớp.
- Bảng: cột chữ dài lấy phần dư; ngày/số/trạng thái rộng theo nội dung; bỏ cột lặp tên lớp ở tab Học sinh. Thống kê: một thẻ nhiều số.
- Báo cáo: danh sách | panel 380px dính; hàng chọn có padding để viền không đè chữ.
- Tiêu đề có nút quay lại: nút và khối tiêu đề căn giữa dọc.
- Buổi chưa tới (mobile): chỉ thông báo khoá, không thêm nút xám.

## 2b. Định dạng điểm (mọi nơi)
- Bỏ ".0", số lẻ dùng dấu phẩy: "10", "7,5", "10/10", "7,5/15". Một hàm duy nhất (`formatScore`, `src/data/scoreFormat.ts`). Ô nhập vẫn nhận "7,5" và "7.5".

## 3. Phụ huynh: 2 tab (người dùng đã duyệt)
- Tab "Lớp học của con" và "Nhận xét của cô". Đầu trang: chip con (▾ khi ≥ 2 con → sheet "Chọn con") và avatar → Cài đặt (hồ sơ, đổi mật khẩu, đổi vai trò, đăng xuất). Desktop: thanh trên chip · tab · avatar, nội dung ≤ 960px.
- Lớp học của con: tên lớp, lịch, giáo viên; số nhanh (chuyên cần tháng, bài kiểm tra mới nhất); hàng "Điểm" (điểm từng bài, không trung bình) và "Báo cáo tháng"; danh sách buổi mới nhất trên cùng, nhóm theo tháng, nhãn điểm danh/sao/"Mới", buổi huỷ "Đã huỷ", buổi sắp tới đã có BTVN "Sắp học".
- Buổi học (`/ph/buoi/:id`): phiếu (sao, câu mẫu, ghi chú), điểm danh của con, kết quả BTVN buổi trước, BTVN mới. Thay hai màn Phiếu và BTVN cũ.
- Nhận xét của cô: dòng thời gian mới nhất trên cùng, nhóm theo tháng, gồm phiếu đã gửi và "Lời cô" của báo cáo đã phát hành; Mít chỉ ở mục mới nhất. Bấm → Buổi học, tab 2 vẫn sáng, quay lại đúng tab.
- Đường dẫn cũ chuyển hướng: `/ph/diem-danh`, `/ph/btvn` → `/ph`; `/ph/diem-so` → `/ph/diem`; `/ph/nhan-xet/:id`, `/ph/btvn/:id` → `/ph/buoi/:id`.
- Nhãn ẩn theo quyền nhóm của role phụ huynh (điểm danh / nhận xét-báo cáo / điểm). Chuỗi mới và chuỗi bỏ: xem `ux-03-guardian-ia.report.md` mục "Cho web/iOS".

## Điểm mở
- Chấm "Mới" ở prototype lưu trên máy (lần đầu mở mọi phiếu đều "Mới"); web/iOS nên lấy trạng thái đã xem từ máy chủ hoặc chỉ đánh dấu phiếu gửi sau lần mở gần nhất.
