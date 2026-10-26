# Worker · Một vòng làm đẹp bộ SVG Mít

Sửa/ghi đè các SVG trong `plans/20261021-mvp/design/mascot-v2/mit/` (giữ tên file, thêm không đổi tên). Cập nhật `mit/spec.md` (dung lượng, ghi chú) và `mit/preview.html`. KHÔNG sửa prototype, app, backend, docs, `concepts/`.

## Vấn đề của bản hiện tại (so với concept `concepts/mit/main.png` và các PNG trong `concepts/mit/`, `concepts/mit/poses/`)
Đầu hơi vuông; cặp sách xanh gần như bị che; nét mặt các tư thế giống nhau; thân dẹt; mỏ nhỏ; thiếu độ mềm.

## Mục tiêu (bắt buộc, mở ảnh concept ra so từng điểm)
- Đầu TRÒN to, tách rõ khỏi thân, đầu chiếm ~60% chiều cao nhân vật; thân tròn nhỏ hơn đầu; 3 chỏm lông mềm như concept.
- Má hồng cam, mỏ cam, MỞ khi vui (có lưỡi hồng), mắt to nâu đậm với 2 điểm sáng (một lớn, một nhỏ).
- Cặp sách xanh `#2F5BEA` thấy rõ cả TÚI (phía sau/bên) lẫn QUAI đeo vắt qua vai/ngực (quai xanh đậm, khoá nhỏ như concept).
- Chân cam rõ (hai chân có ngón), bóng đổ mềm dưới chân (ellipse mờ bằng radialGradient, KHÔNG filter).
- Dùng gradient mềm (`linearGradient`/`radialGradient`) cho đầu, thân, cánh, cặp để có khối; vẫn nhẹ.
- Mỗi tư thế phải KHÁC NHAU thấy được ở cỡ 64 px (thay đổi dáng/cánh/đạo cụ, không chỉ đổi mắt):
  - `mit-main.svg`: đứng, hai cánh dang nhẹ, cười.
  - `mit-chao.svg`: MỘT cánh giơ cao vẫy (kèm 2–3 vạch chuyển động nhỏ), cánh kia thả.
  - `mit-khen.svg`: hai cánh giơ cao, nhảy lên (chân rời đất), miệng mở to, sao vàng lấp lánh quanh.
  - `mit-dong-vien.svg`: nghiêng đầu, một cánh đặt lên ngực, mắt cong dịu (mắt nhắm cười hình vòng cung), vẻ ấm áp, không buồn.
  - `mit-cho.svg`: cầm một quyển sách nhỏ (hoặc đồng hồ cát), ngước nhìn, miệng nhỏ.
  - `mit-dang-tai.svg`: dáng chạy (một chân nâng, thân nghiêng về trước, cánh vẫy), giữ `<g id>` cho chuyển động sau này.
  - `mit-sao-3.svg`: 3 sao rạng rỡ (nhảy, 3 sao bay quanh).
  - `mit-sao-2.svg`: giơ ngón cái ("ổn"), 2 sao.
  - `mit-sao-1.svg`: NGƯỜI DÙNG đã quyết 1 sao phải HƠI BUỒN NHẸ (mày cụp ngoài, mắt ngập ngừng nhìn lên, miệng mím nhỏ) kết hợp cử chỉ "cố lên nhé": một cánh nắm lại giơ lên ngang ngực (cổ vũ), 1 sao nhỏ. KHÔNG khóc, không giận.
  - `mit-avatar.svg`: đầu giản lược cho 24–48 px, tròn, mắt to, mỏ, má; ≤ 3 KB.
- Giữ nhân vật đúng concept: lông vàng `#FFD633` (gradient từ `#FFE66B` đến `#F8BE18`), mỏ/chân `#FF8A00`, mắt `#2B211B`.
- Khung `viewBox="0 0 512 512"`; nhân vật + sao + đạo cụ nằm gọn trong vùng x 56–456, y 50–450 (prototype cắt vùng này). Nền trong suốt.

## Ràng buộc kỹ thuật
- Mỗi file ≤ 8 KB (avatar ≤ 3 KB). Không `<image>`, `<text>`, `<script>`, `filter`, link ngoài, font. Gradient được phép. Làm tròn toạ độ 1 chữ số thập phân, dọn id thừa; id gradient phải DUY NHẤT trong mỗi file và có tiền tố theo file để không đụng nhau khi inline nhiều SVG trong một trang.
- Giữ các `<g id>` để làm hoạt ảnh sau (cánh, chỏm, dấu chấm).

## Tự kiểm (bắt buộc)
- `xmllint --noout` từng file; `rsvg-convert` (có sẵn tại /opt/homebrew/bin) dựng PNG 512 và 64 px; MỞ TỪNG ẢNH so với concept; chưa đạt thì sửa. Lập `mit/_compare.png`: hàng 1 = concept PNG (main, vui, dong-vien, cho, chao, sao-1, sao-2, sao-3) ở 256 px, hàng 2 = SVG mới tương ứng ở 256 px, hàng 3 = SVG ở 64 px (nền `#F6F7FB`). Khoảng cách tương ứng: main↔mit-main, vui↔mit-khen, dong-vien↔mit-dong-vien, cho↔mit-cho, chao↔mit-chao, sao-1/2/3↔mit-sao-1/2/3. Chạy mit-dang-tai thêm cột cuối (không có concept thì để trống ô concept).
- Báo dung lượng thật từng file. Dọn file tạm; thư mục `_preview/` làm mới bằng PNG 256 px của bản mới (xoá bản cũ).
- Nếu codex báo "model at capacity" thử lại tối đa 3 lần rồi báo BLOCKED.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu kèm bảng dung lượng.
