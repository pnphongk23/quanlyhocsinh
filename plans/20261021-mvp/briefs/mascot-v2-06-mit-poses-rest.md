# Worker · Thêm tư thế cho Mít (gà con mascot)

Ghi CHỈ trong `plans/20261021-mvp/design/mascot-v2/concepts/mit/poses/` (tạo thư mục) + `poses/prompts.md`. Không sửa gì khác.

Nhân vật: Mít, xem `concepts/mit/main.png` (gà con vàng tròn, 3 chỏm lông, mỏ cam, cặp sách xanh `#2F5BEA`). Dùng built-in `image_gen` của Codex (skill `imagegen`), LẤY `main.png` làm ảnh tham chiếu để giữ nhân vật GIỐNG HỆT (cùng màu, tỉ lệ, cặp sách, kiểu 3D mềm), nền kem phẳng `#FFFDF4` như ảnh gốc, toàn thân, không bóng đổ dưới chân quá đậm, không chữ/logo.

`sao-3.png` và `sao-2.png` ĐÃ có sẵn trong poses/ (đừng tạo lại, dùng làm tham chiếu thêm cho độ nhất quán). Chỉ tạo 2 ảnh còn thiếu `sao-1.png` và `chao.png`, PNG 1024×1024 (≤ 1,2 MB, dùng `sips -Z 1024` nếu cần):
- `sao-3.png`: 3 sao, rạng rỡ nhất: nhảy lên, hai cánh giơ cao, mắt lấp lánh, miệng cười tươi, có thể có 3 ngôi sao vàng nhỏ bay quanh đầu.
- `sao-2.png`: 2 sao, vui vừa: đứng thẳng, một cánh giơ ngón "ổn", cười hiền, có 2 ngôi sao vàng nhỏ cạnh.
- `sao-1.png`: 1 sao, nhắc nhẹ KHÔNG buồn, KHÔNG khóc, KHÔNG chê: nghiêng đầu nhẹ, mỉm cười ấm, một cánh vỗ nhẹ lên ngực kiểu "cố lên nhé", có 1 ngôi sao vàng nhỏ cạnh.
- `chao.png`: vẫy cánh chào, miệng cười, mắt nhìn thẳng (dùng cho màn đăng nhập/chào).

Chỉ giữ ngôi sao vàng nhỏ làm phụ kiện bay quanh, không che mặt. Cả 4 phải cùng một nhân vật với `main.png`. Tự kiểm: mở từng ảnh, `file` kích thước, dung lượng; sai nhân vật thì tạo lại. Ghi prompt nguyên văn vào `poses/prompts.md`, ghi "Ảnh do AI tạo, chưa rà nhãn hiệu/bản quyền". Xoá file tạm.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu kèm bảng kích thước/dung lượng.
