# Bộ hình chính thức của Mít

## Bộ hình chính thức: WebP (người dùng chọn)

Ảnh giao nằm ở `../mit-webp/`. Cạnh dài 1x là 256 px, @2x là 512 px; giữ nguyên tỉ lệ, nền trong suốt RGBA, mỗi file dưới 60 KB. Các dáng hiện tại đều cao hơn rộng, nên chiều cao là 256/512 px, chiều rộng tuỳ dáng. Không kéo giãn ảnh thành hình vuông.

| Tư thế | Tệp 1x | Byte | Tệp 2x | Byte |
|---|---|---:|---|---:|
| Chính | `mit-main.webp` | 11,532 | `mit-main@2x.webp` | 27,148 |
| Chào | `mit-chao.webp` | 12,060 | `mit-chao@2x.webp` | 28,266 |
| Khen / thành công | `mit-khen.webp` | 15,606 | `mit-khen@2x.webp` | 36,098 |
| Động viên | `mit-dong-vien.webp` | 10,952 | `mit-dong-vien@2x.webp` | 25,816 |
| Chờ | `mit-cho.webp` | 10,788 | `mit-cho@2x.webp` | 25,032 |
| Đang tải | `mit-dang-tai.webp` | 11,122 | `mit-dang-tai@2x.webp` | 25,768 |
| Avatar | `mit-avatar.webp` | 10,484 | `mit-avatar@2x.webp` | 25,112 |
| Không sao · mới | `mit-sao-0.webp` | 10,842 | `mit-sao-0@2x.webp` | 25,420 |
| Một sao | `mit-sao-1.webp` | 12,194 | `mit-sao-1@2x.webp` | 28,574 |
| Hai sao | `mit-sao-2.webp` | 14,342 | `mit-sao-2@2x.webp` | 33,598 |
| Ba sao | `mit-sao-3.webp` | 12,304 | `mit-sao-3@2x.webp` | 28,516 |
| Bốn sao · mới | `mit-sao-4.webp` | 14,600 | `mit-sao-4@2x.webp` | 34,178 |
| Năm sao · mới | `mit-sao-5.webp` | 15,222 | `mit-sao-5@2x.webp` | 35,844 |

Tổng 26 file WebP: **541,418 byte**. Mọi file đều có alpha và dưới 60 KB. Sáu file mới chờ duyệt, chưa đưa vào app.

## Quy trình tạo và duyệt mascot · 2026-10-25

**Công cụ tạo ảnh Codex + ảnh tham chiếu → PNG nguồn → WebP 1x/@2x → ảnh so sánh → duyệt → đưa vào app.**

1. Tham chiếu **chỉ dùng PNG gốc lông xù 3D**: `../mit-webp/src/sao-1.png`, `sao-2.png`, `sao-3.png` cùng thư mục; có thể thêm `khen.png`, `main.png`. Đây là nguồn chuẩn về nhân vật, bảng màu, tỉ lệ, góc nhìn và chất lông. Không dùng ảnh trong `mit/_preview/` để tạo dáng mới.
2. Dùng công cụ tạo ảnh Codex tạo từng dáng. Lưu PNG nguồn ở `../mit-webp/src/sao-0.png`, `sao-4.png`, `sao-5.png`, **1024×1024 RGB**, nền kem phẳng `#FFFDF4` như các nguồn 1–3. Công cụ sinh ảnh 1254×1254; thu về 1024×1024 bằng ImageMagick trước khi lưu nguồn. Giữ toàn bộ chỏm, cánh, chân, cặp và sao rời trong khung có lề.
3. Dùng quy trình hiện có `../mit-webp/tools/make-webp.py` để tách nền kem, giữ alpha và xuất `../mit-webp/mit-sao-N.webp` / `mit-sao-N@2x.webp`, cạnh dài 256/512 px. Lần xuất này dùng quality 82, method 6, alpha quality 90; mỗi file dưới 60 KB, không đổi tỉ lệ. Ví dụ từ thư mục `mit-webp`: `python3 tools/make-webp.py src/sao-0.png sao-0 .`.
4. Tạo `_compare-0-5.png`: **một hàng duy nhất gồm WebP thực tế 0–5**, có nhãn. Mở riêng từng ảnh 1x/@2x, so cạnh 1–3; kiểm tra mép alpha trên nền sáng/tối, không méo/cắt hoặc giữ nền kem.
5. Người dùng duyệt bảng so sánh trước; sau đó mới đưa vào app, cập nhật ánh xạ dáng và tỉ lệ rộng/cao theo ảnh thật. Không tự thay dáng cũ.

Prompt mẫu (mỗi lần chỉ tạo một mức):

> Tạo một dáng toàn thân của đúng nhân vật Mít trong các PNG nguồn `mit-webp/src/sao-1.png`, `sao-2.png`, `sao-3.png` (có thể thêm `khen.png`, `main.png`). Giữ phong cách hoạt hình 3D lông xù vàng mềm, đầu tròn lớn/thân nhỏ, đúng ba lọn chỏm, mắt nâu bóng với viền trắng và điểm sáng, má cam hồng, mỏ cam ngắn có lỗ mũi, chân cam ba ngón, ba lô xanh hoàng gia với quai đệm và khoá. Cùng góc nhìn hơi nghiêng ba phần tư, ba lô ở bên trái người xem, ánh sáng studio ấm và tỉ lệ của bộ gốc. Mức 0: buồn nhẹ/trung tính, mỏ khép, giữ quai cặp, không nước mắt, không sao. Mức 4: vui hơn mức 3, mắt mở sáng, cười rộng, cánh cao, bật nhảy, đúng bốn sao vàng 3D rời quanh đầu. Mức 5: hân hoan như dáng khen, mắt nhắm cười tự nhiên, cánh cao, hai chân tung ra, đúng năm sao vàng 3D. Mỗi lần chỉ tạo một mức. Nền kem phẳng #FFFDF4, khung vuông, toàn thân và sao nằm gọn trong lề. Không chữ, logo, watermark hoặc cảnh nền. Không chuyển sang minh hoạ phẳng.

Checklist trước khi duyệt:

- Nhận ra đúng Mít; nét mặt và cử chỉ rõ ở 64 px, không đáng sợ hoặc làm học sinh xấu hổ. Đếm đúng 0/4/5 sao; sao không đè mặt, chỏm hoặc cánh.
- Alpha thật, không in nền caro vào ảnh, không đốm rời/viền sáng trên nền sáng và tối. Không méo, cắt hoặc mất chi tiết ở mép.
- Cả 1x/@2x giải mã được, đúng cạnh dài 256/512 px, giữ tỉ lệ (có thể lệch một pixel do làm tròn), mỗi file dưới 60 KB.
- Duyệt với **WebP app thực tế 1–3**: cả sáu mức phải cùng chất lông xù 3D, ánh sáng ấm, tỉ lệ đầu/thân, mắt/mỏ/chân, góc nhìn và ba lô xanh. Không dùng PNG phẳng làm tham chiếu.

| Mức | Biểu cảm |
|---|---|
| 0 | Buồn nhẹ, mỏ hơi cụp, cánh thấp giữ quai cặp, không nước mắt. |
| 1 | Hơi lo nhưng cổ vũ, miệng khép, giơ ngón cái. |
| 2 | Cười mở mắt, giơ ngón cái cổ vũ. |
| 3 | Vui, hai cánh giơ và nhảy nhẹ. |
| 4 | Rạng rỡ, mắt mở, cười rộng, hai cánh dang cao và bật nhảy. |
| 5 | Hân hoan, mắt nhắm cười, hai chân tung lên và năm sao quanh đầu. |

| Dáng mới | 1x (rộng × cao) | @2x (rộng × cao) |
|---|---|---|
| 0 | 160 × 256 | 321 × 512 |
| 4 | 236 × 256 | 471 × 512 |
| 5 | 255 × 256 | 511 × 512 |

### Đặc điểm nhận dạng

Đầu tròn lớn/thân nhỏ theo PNG gốc; lông vàng xù 3D mềm, má cam hồng, mắt nâu bóng, mỏ/chân cam. Cặp xanh có quai và khoá nhỏ. Tư thế phân biệt bằng nét mặt và cử chỉ ở 64 px.

## Màu và độ tương phản

Tỉ lệ dưới đây là độ tương phản của màu phẳng so với nền (1:1 là trùng mức sáng; đây không phải nội dung chữ). Các phần minh hoạ lớn không thay thế nhãn hoặc trạng thái bằng chữ/icon giao diện.

| Màu | Hex | Trắng | Kem | `#F6F7FB` | Xanh `#2F5BEA` |
|---|---|---:|---:|---:|---:|
| Lông | `#FFD633` | 1.41:1 | 1.38:1 | 1.31:1 | 3.92:1 |
| Mỏ, chân | `#FF8A00` | 2.36:1 | 2.32:1 | 2.21:1 | 2.34:1 |
| Mắt, nét mặt | `#2B211B` | 15.72:1 | 15.42:1 | 14.68:1 | 2.85:1 |
| Cặp | `#2F5BEA` | 5.52:1 | 5.42:1 | 5.15:1 | 1.00:1 |
| Má | `#F48D58` | 2.39:1 | 2.34:1 | 2.23:1 | 2.31:1 |

## Cách dùng

- Hình đầy đủ: tối thiểu **64 px**; avatar: tối thiểu **24 px**. Avatar đã lược bớt thân và phụ kiện để rõ ở cỡ nhỏ.
- Để khoảng trống quanh hình khoảng **8% chiều rộng hình**; tránh đặt sát mép hoặc cắt chỏm, cánh, sao.
- Không che nội dung, trường nhập hoặc nút chính; chỉ dùng ở vùng phụ trợ.
- Không dùng hình sao để tự chấm hay xếp loại học sinh. Sao chỉ minh hoạ câu mẫu mà giáo viên đã chọn.
- Không để Mít có lời thoại thay giáo viên; dùng nhân vật như hình minh hoạ, không gắn câu nói trực tiếp cho Mít.
- Giữ ảnh tĩnh khi bật giảm chuyển động. Nếu sau này thêm chuyển động, tôn trọng `prefers-reduced-motion` và tắt animation theo lựa chọn hệ thống.

## Vị trí gợi ý

| Tình huống | Tệp |
|---|---|
| Hình chính trong phần giới thiệu hoặc khu vực trống cần hình nhân vật. | `mit-main.webp` |
| Màn đăng nhập và lời chào ban đầu. | `mit-chao.webp` |
| Gửi phiếu hoặc phát hành thành công. | `mit-khen.webp` |
| Lỗi nhập liệu; giữ vẻ ấm áp, không trách móc. | `mit-dong-vien.webp` |
| Màn hình trống hoặc đang chờ lựa chọn. | `mit-cho.webp` |
| Đang tải (ảnh tĩnh). | `mit-dang-tai.webp` |
| Minh hoạ câu mẫu 0–5 sao do giáo viên chọn. | `mit-sao-0.webp` … `mit-sao-5.webp` |
| Ảnh đại diện nhỏ trong danh sách. | `mit-avatar.webp` |

## Dựng cho web và iOS

- Web dùng ảnh WebP, khai báo kích thước/tỉ lệ thật để giữ chỗ, có thể dùng `srcset` cho @2x. Các tên file trong bảng vị trí là tương đối với `../mit-webp/`.
- iOS hiện dùng cặp `mit-<pose>.webp` / `mit-<pose>@2x.webp` trong bundle, giải mã có alpha theo scale và giữ tỉ lệ ảnh thật. Lần này chỉ tạo asset và tài liệu, chưa chép vào app.
- `preview.html` giữ ảnh lịch sử và trỏ ba dáng mới tới PNG nguồn trong `mit-webp/src/`; không dùng trang này làm nguồn tạo ảnh. Bảng duyệt hiện tại: `_compare-0-5.png`, một hàng WebP thật 0–5.
- Mít là trang trí cho luồng đã có, không đổi nghiệp vụ. Ảnh đầy đủ tối thiểu 64 px, avatar tối thiểu 24 px; chừa lề khoảng 8% ở layout, không thêm viền nền vào WebP.

## Ghi chú nguồn

Ảnh concept và ba PNG mới được tạo bằng AI, chưa rà nhãn hiệu/bản quyền. Ba dáng mới dùng công cụ tạo ảnh Codex và PNG nguồn lông xù 3D trong `mit-webp/src/` làm tham chiếu. Nguồn mới lưu 1024×1024 cùng kích thước/nền như nguồn 1–3 để duyệt và tái xuất.
