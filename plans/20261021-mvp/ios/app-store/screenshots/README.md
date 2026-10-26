# Ảnh chụp App Store

`raw/NN-*.png`: ảnh gốc 1179×2556 chụp từ app thật trên simulator iPhone 16. `final/`: ảnh ghép 1320×2868 và `contact-sheet.png`.

```
python3 compose/compose.py            # raw/ -> final/
python3 compose/compose.py --raw DIR --out DIR
```
Chỉ cần Python 3 + Pillow (có sẵn trên máy này). Cấu hình ở `compose/shots.json`: tiêu đề, thứ tự 6 ảnh, mascot từng ảnh. Màu, cỡ chữ, bóng đọc từ `design/tokens/tokens.json` theo tên token; phần hình học khung máy là bố cục ảnh marketing. Font theo danh sách trong `shots.json` (hiện dùng SF của hệ thống, nằm trong chuỗi font dự phòng của token; chưa có file Plus Jakarta Sans dạng TTF trong repo). Mít lấy từ `design/prototype/public/mascot/`.

Ảnh gốc đặt tên `01-…` đến `06-…` theo thứ tự: lớp/lịch, điểm danh, phiếu nhận xét, chấm BTVN, nhập điểm, phụ huynh xem phiếu.
