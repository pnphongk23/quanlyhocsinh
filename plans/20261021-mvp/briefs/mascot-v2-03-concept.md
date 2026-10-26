# Worker · Concept ảnh mascot (một hướng mỗi worker)

Bạn được giao MỘT hướng (xem cuối prompt giao việc). Ghi CHỈ trong `plans/20261021-mvp/design/mascot-v2/concepts/<slug>/`. Không sửa prototype/app/backend/docs, không sửa `design/mascot/` cũ.

## Bối cảnh
App quản lý lớp tiếng Anh cho giáo viên dạy lớp riêng ở Việt Nam. Người dùng là giáo viên + phụ huynh, nhưng mascot phải dễ thương, gần gũi học sinh tiểu học 6–11 tuổi. Màu chính app `#2F5BEA` (bảng màu mascot phải hợp màu này, không nhất thiết thân mascot màu xanh). Đọc thêm (nếu đã có) `plans/20261021-mvp/design/mascot-v2/research.md` để lấy mẹo; chưa có thì bỏ qua, không chờ.

## Cách tạo ảnh (đã kiểm chứng)
Dùng built-in `image_gen` của Codex (skill `imagegen`, không dùng API key). Xem ví dụ `design/mascot-v2/_probe/how.md`. Cấm vẽ bằng SVG/PIL thay cho ảnh AI (PIL chỉ để resize/ghép).

## Việc
1. Viết `concepts/<slug>/profile.md`: tên mascot, tính cách (3 ý), lý do hợp lớp tiếng Anh tiểu học, bảng màu (hex, gồm màu hợp `#2F5BEA`), dáng/hình khối (vài dòng), cách dùng ở cỡ nhỏ.
2. Tạo 5 PNG:
   - `main.png`: nhân vật chính, toàn thân, nền đồng nhất, nhìn rõ hình dáng.
   - `vui.png`: vui/khen (giơ tay, mắt sáng).
   - `dong-vien.png`: động viên khi học sinh làm lỗi (ấm áp, KHÔNG buồn thảm, không chê).
   - `cho.png`: đang chờ/trống (không có việc, hơi tò mò/ngáp nhẹ).
   - `tren-man-hinh.png`: mascot đặt thử trên một màn app: lấy một ảnh trong `plans/20261021-mvp/design/prototype-shots/` làm nền (ví dụ màn danh sách trống hoặc màn khen/điểm), đặt mascot vào chỗ hợp lý, không che nút chính. Làm bằng cách nhờ `image_gen` sửa ảnh, hoặc cắt nền mascot rồi ghép (PIL/sips). Cũng được vẽ khung giả nếu không có ảnh hợp.
   Giữ nhân vật NHẤT QUÁN giữa 5 ảnh: dùng `main.png` làm ảnh tham chiếu khi tạo ảnh còn lại.
3. `concepts/<slug>/prompts.md`: prompt đã dùng cho từng ảnh (nguyên văn) + ghi "Ảnh do AI tạo, chưa rà nhãn hiệu/bản quyền".
4. Mỗi PNG: cạnh dài ≤ 1024 px (dùng `sips -Z 1024`), ≤ 1,2 MB. Xoá file tạm/ảnh nguồn lớn.

## Ràng buộc
- ORIGINAL: không giống nhân vật có bản quyền (tránh dáng tai to xanh kiểu Stitch, cú Duolingo, Pikachu, Hello Kitty, Minion...). Nếu thấy giống thì tạo lại.
- Mắt to, đơn giản, đọc được ở cỡ nhỏ; không đáng sợ, không dùng chữ/logo/watermark trong ảnh (trừ chữ trên màn app giữ nguyên từ ảnh prototype).
- Không dùng ảnh/học sinh thật, không dữ liệu thật.
- Tự kiểm: `file` + kích thước + dung lượng cả 5 ảnh, mở từng ảnh xem đúng mô tả/nhất quán. Sai thì tạo lại.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu, kèm bảng 5 ảnh (kích thước, dung lượng).
