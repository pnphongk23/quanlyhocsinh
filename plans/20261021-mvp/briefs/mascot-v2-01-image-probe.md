# Worker · Thử codex có tạo ảnh được không (mascot v2)

Chỉ làm một việc nhỏ. Không sửa file ngoài `plans/20261021-mvp/design/mascot-v2/_probe/`.

1. Dùng khả năng tạo ảnh (image generation) của chính Codex để tạo 1 ảnh PNG nhỏ: mascot gốc dễ thương cho học sinh tiểu học, nền trắng, một con vật tròn xanh dương `#2F5BEA`, mắt to, cầm cuốn sách. Không giống nhân vật có bản quyền.
2. Lưu ảnh tại `plans/20261021-mvp/design/mascot-v2/_probe/probe.png`. Ghi lại CÁCH bạn tạo (tool/skill/lệnh nào, vd imagegen skill, `$imagegen`, API) vào `_probe/how.md`, kèm prompt đã dùng.
3. Kiểm: `file`, kích thước, dung lượng; mở ảnh xem có đúng mô tả.
4. Nếu KHÔNG tạo được ảnh thật (chỉ vẽ SVG/PIL/code thì KHÔNG tính): dừng, báo `Status: BLOCKED` kèm lý do chính xác. Không tự đổi công cụ, không dùng API cần khoá ngoài.

Kết thúc: `Status: DONE | BLOCKED` + 2 câu, nêu rõ cách tạo ảnh để lead dùng lại cho worker khác.
