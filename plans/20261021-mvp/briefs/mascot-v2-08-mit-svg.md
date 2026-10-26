# Worker · Bộ hình chính thức của Mít (SVG vector)

Người dùng đã CHỌN Mít (gà con). Làm bộ SVG vector gọn, nhẹ, đúng nhân vật concept. Ghi CHỈ trong `plans/20261021-mvp/design/mascot-v2/mit/`. KHÔNG sửa prototype, app, backend, docs, hay `design/prototype/public/mascot/`.

## Tham chiếu (đọc/mở từng ảnh)
- Concept: `design/mascot-v2/concepts/mit/{main,vui,dong-vien,cho}.png`, `profile.md` (bảng màu).
- Tư thế sao: `design/mascot-v2/concepts/mit/poses/{sao-1,sao-2,sao-3,chao}.png`.
- Đã dùng trong prototype: `design/prototype/public/mascot/mit-*.png` (chỉ đọc).
Nhân vật: gà con vàng tròn, đầu to hơn thân, 3 chỏm lông, mắt to nâu có highlight, má hồng cam nhẹ, mỏ cam nhỏ, cánh ngắn, chân cam, cặp sách xanh `#2F5BEA` có quai. Màu chính: lông `#FFD633`, mỏ/chân `#FF8A00`, mắt `#2B211B`, cặp `#2F5BEA`.

## Việc
1. Xây MỘT bộ phận dùng chung (đầu, thân, cặp, chân) rồi ghép tư thế để cả bộ NHẤT QUÁN. Style: vector phẳng có đổ khối đơn giản (gradient nhẹ/vài lớp bóng), KHÔNG filter nặng, KHÔNG nhúng ảnh raster, KHÔNG text/font. `viewBox` vuông thống nhất (ví dụ 0 0 512 512), nền trong suốt.
2. File (tên kebab-case): 
   - `mit-main.svg` (tư thế chính),
   - `mit-chao.svg` (chào/đăng nhập: vẫy cánh),
   - `mit-khen.svg` (khen/thành công: nhảy, cánh giơ, sao lấp lánh),
   - `mit-dong-vien.svg` (động viên khi lỗi: ấm áp, KHÔNG chê, KHÔNG buồn thảm),
   - `mit-cho.svg` (trống/chờ: nghiêng đầu, cánh chạm cằm),
   - `mit-dang-tai.svg` (đang tải: tư thế đơn giản, có phần tử dễ tạo chuyển động sau này như cánh/chỏm lông/dấu ba chấm, gom thành `<g id>` riêng),
   - `mit-sao-3.svg`, `mit-sao-2.svg`, `mit-sao-1.svg` (3 mức sao nhận xét, 1 sao hơi buồn nhẹ như `poses/sao-1.png`: mày cụp, mắt ngập ngừng, miệng mím, cánh ôm trước ngực, KHÔNG khóc),
   - `mit-avatar.svg`: đầu giản lược cho cỡ nhỏ 24–48 px (ít chi tiết, nét rõ).
3. Tối ưu: dọn id thừa, làm tròn toạ độ 1 chữ số thập phân, gộp path; mục tiêu mỗi file ≤ 30 KB (avatar ≤ 12 KB), cả thư mục SVG ≤ 250 KB. Dùng `<title>` ngắn tiếng Việt cho từng file, `role="img"` khi hợp lý.
4. `mit/spec.md` (tiếng Việt, lời đơn giản, ngắn):
   - bảng file: tên, dùng khi nào, dung lượng thật (byte), gzip;
   - bảng màu (hex) và độ tương phản trên nền trắng/kem/`#F6F7FB`/xanh `#2F5BEA`;
   - quy tắc dùng: cỡ tối thiểu (full ≥ 64 px, avatar ≥ 24 px), vùng trống quanh nhân vật, KHÔNG che nội dung/nút chính, KHÔNG dùng để chấm/đánh giá học sinh (sao chỉ minh hoạ câu mẫu giáo viên chọn), KHÔNG kèm chữ đóng vai Mít nói thay giáo viên, chạy ở chế độ giảm chuyển động;
   - chỗ xuất hiện đề xuất: đăng nhập (chao), màn trống (cho), gửi phiếu/phát hành thành công (khen), lỗi/nhập sai (dong-vien), đang tải (dang-tai), nhận xét theo sao (sao-1/2/3), avatar nhỏ ở danh sách;
   - ghi chú dựng sau: cách đưa vào prototype (import ảnh/inline), iOS (SVG→PDF/asset hoặc SwiftUI), bộ phận có id để làm hoạt ảnh;
   - "Ảnh concept do AI tạo, chưa rà nhãn hiệu/bản quyền; bộ SVG này vẽ lại dựa trên concept".
5. `mit/preview.html`: trang xem nhanh tất cả SVG (nền trắng, nền kem, nền `#2F5BEA`, và cỡ 32/64/128), mở được bằng file://.

## Tự kiểm (bắt buộc)
- Mỗi SVG: `xmllint --noout` (hoặc parser XML) hợp lệ; không có `<image>`, `<text>`, `<script>`, `filter`, link ngoài.
- Dựng PNG để xem (ví dụ Chrome headless / `qlmanage -t -s 512` / công cụ có sẵn; không cài gói nặng) rồi MỞ TỪNG ẢNH so với concept: cùng nhân vật, cùng màu, đúng biểu cảm; xấu hay lệch thì sửa. Lưu PNG xem thử trong `mit/_preview/` (≤ 1 MB tổng) hoặc xoá hết khi xong, ghi rõ trong spec nếu giữ.
- Báo dung lượng thật từng file.
- Dọn file tạm.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu, kèm bảng file/dung lượng.
