# Worker · Bộ WebP (ảnh AI) đủ tư thế cho Mít

Người dùng chọn dùng ẢNH AI (WebP) cho Mít thay SVG. Ghi CHỈ trong `plans/20261021-mvp/design/mascot-v2/mit-webp/` (đã có `tools/make-webp.py`). Không sửa prototype, app, backend, docs, `concepts/`, `mit/`.

## Nhân vật và phong cách
Dùng đúng phong cách 3D mềm của `concepts/mit/main.png`: gà con vàng lông mềm, đầu to tròn, 3 chỏm lông, mắt nâu to có highlight, má hồng cam, mỏ cam, cặp sách xanh `#2F5BEA` có quai và khoá, chân cam. Nền phẳng kem `#FFFDF4`, toàn thân, không chữ/logo, không bóng đổ đậm. Mở/đọc để tham chiếu: `concepts/mit/{main,vui,dong-vien,cho}.png`, `concepts/mit/poses/{chao,sao-1,sao-2,sao-3}.png`.

## Việc
1. ĐÃ có sẵn (người dùng đã duyệt, dùng nguyên, chép vào `mit-webp/src/` làm nguồn): `main`=`concepts/mit/main.png`, `chao`=`poses/chao.png`, `cho`=`cho.png`, `sao-1`, `sao-2`, `sao-3` (trong `poses/`).
2. Dùng built-in `image_gen` của Codex (skill `imagegen`, tham chiếu `main.png` để giữ nhân vật GIỐNG HỆT) vẽ 4 tư thế còn thiếu, lưu nguồn 1024×1024 PNG vào `mit-webp/src/`:
   - `khen.png`: khen/thành công: nhảy lên, HAI cánh giơ cao, miệng mở to cười, mắt lấp lánh, vài ngôi sao vàng bay quanh (không che mặt).
   - `dong-vien.png`: động viên: nghiêng đầu, một cánh đặt lên ngực, mắt cong dịu (mắt hơi nhắm cười), ấm áp, KHÔNG buồn, KHÔNG chê. Phải KHÁC rõ `main.png` về dáng và mắt.
   - `dang-tai.png`: đang tải: dáng chạy, một chân nâng, thân hơi nghiêng về trước, hai cánh vẫy, vẻ hăng hái.
   - `avatar.png`: cận cảnh ĐẦU và một chút vai (không full body), mắt to, mỏ, má, 3 chỏm lông; đọc rõ ở 32–48 px; nền kem phẳng.
   Nhân vật phải CÙNG MỘT con với main.png ở cả 4 ảnh (màu, tỉ lệ, cặp sách). Lệch thì vẽ lại.
3. Với cả 10 ảnh nguồn chạy `python3 mit-webp/tools/make-webp.py <nguồn> <tên> mit-webp` để ra `mit-<tên>.webp` (256 px) và `mit-<tên>@2x.webp` (512 px) có alpha. Tên: main, chao, khen, dong-vien, cho, dang-tai, avatar, sao-1, sao-2, sao-3 (khen là tư thế vui/thành công; chép `vui` cũ KHÔNG dùng). Mục tiêu mỗi file ≤ 60 KB (công cụ tự hạ chất lượng; nếu vẫn lớn hơn, giảm bằng cách khác và báo).
4. Kiểm tách nền: mở từng WebP đặt trên nền trắng VÀ nền xanh `#2F5BEA` (ghép bằng Pillow), không còn quầng kem/bóng đổ xám, không mất sao bay, mép không răng cưa nặng. Lỗi thì chỉnh tham số hoặc vẽ lại ảnh nguồn.
5. `mit-webp/_sheet.png`: bảng ghép cả 10 tư thế (256 px, nền trắng, có tên), TỰ XEM để kiểm đồng đều phong cách; tư thế nào lệch phong cách/nhân vật thì vẽ lại.
6. `mit-webp/prompts.md`: prompt nguyên văn cho 4 ảnh mới + "Ảnh do AI tạo, chưa rà nhãn hiệu/bản quyền".
7. Cập nhật `design/mascot-v2/mit/spec.md`: thêm mục đầu "Bộ hình chính thức: WebP (người dùng chọn); SVG chỉ là dự phòng" kèm bảng file WebP (1x/2x, byte), quy tắc dùng giữ nguyên.
8. Xoá file tạm; thư mục `mit-webp/src/` giữ (≤ 12 MB), tổng thư mục ≤ 14 MB.

Nếu codex báo "model at capacity" thử lại tối đa 3 lần rồi báo BLOCKED (có thể giữ phần đã làm). Không hỏi lại người dùng.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu kèm bảng file/byte.
