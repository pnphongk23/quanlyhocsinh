# Bộ hình chính thức của Mít

## Bộ hình chính thức: WebP (người dùng chọn); SVG chỉ là dự phòng

| Tư thế | Tệp 1x (256 px) | Byte | Tệp 2x (512 px) | Byte |
|---|---|---:|---|---:|
| Chính | `mit-main.webp` | 11,532 | `mit-main@2x.webp` | 27,148 |
| Chào | `mit-chao.webp` | 12,060 | `mit-chao@2x.webp` | 28,266 |
| Khen / thành công | `mit-khen.webp` | 15,606 | `mit-khen@2x.webp` | 36,098 |
| Động viên | `mit-dong-vien.webp` | 10,952 | `mit-dong-vien@2x.webp` | 25,816 |
| Chờ | `mit-cho.webp` | 10,788 | `mit-cho@2x.webp` | 25,032 |
| Đang tải | `mit-dang-tai.webp` | 11,122 | `mit-dang-tai@2x.webp` | 25,768 |
| Avatar | `mit-avatar.webp` | 10,484 | `mit-avatar@2x.webp` | 25,112 |
| Một sao | `mit-sao-1.webp` | 12,194 | `mit-sao-1@2x.webp` | 28,574 |
| Hai sao | `mit-sao-2.webp` | 14,342 | `mit-sao-2@2x.webp` | 33,598 |
| Ba sao | `mit-sao-3.webp` | 12,304 | `mit-sao-3@2x.webp` | 28,516 |

Tổng 20 file WebP: **405,312 byte**. Mọi file đều có alpha và dưới 60 KB.

## Bộ SVG dự phòng

## Tệp và dung lượng

| Tệp | Dùng khi nào | Byte | Gzip (byte) |
|---|---|---:|---:|
| mit-main.svg | Minh hoạ chính, tư thế đứng cười. | 4863 | 1635 |
| mit-chao.svg | Chào ban đầu; một cánh vẫy cao. | 5121 | 1731 |
| mit-khen.svg | Phản hồi tích cực; nhảy với hai cánh giơ cao. | 5047 | 1716 |
| mit-dong-vien.svg | Động viên ấm áp; nghiêng đầu, cánh đặt lên ngực. | 4723 | 1586 |
| mit-cho.svg | Màn hình trống hoặc chờ; cầm sách, nhìn lên. | 5156 | 1699 |
| mit-dang-tai.svg | Đang tải; có nhóm cánh, chỏm và chấm riêng. | 5171 | 1708 |
| mit-sao-3.svg | Minh hoạ chọn ba sao. | 5075 | 1707 |
| mit-sao-2.svg | Minh hoạ chọn hai sao; giơ ngón cái. | 5517 | 1808 |
| mit-sao-1.svg | Minh hoạ một sao với vẻ hơi lo và cử chỉ cổ vũ. | 5507 | 1781 |
| mit-avatar.svg | Ảnh đại diện 24–48 px. | 1232 | 564 |

Tổng dung lượng SVG: **47,412 byte**. Tổng thư mục _preview/ (10 PNG mới 256 px): **211,000 byte**.

### Ghi chú polish · 2026-10-22

- Tư thế được vẽ riêng để còn phân biệt ở 64 px: chào vẫy một cánh, khen nhảy, động viên nhắm mắt và đặt cánh lên ngực, chờ cầm sách, chạy nghiêng người, ba mức sao có cử chỉ riêng.
- Đầu tròn chiếm xấp xỉ 60% chiều cao; dùng vàng gradient, má cam, mắt nâu có hai điểm sáng, mỏ và chân cam. Cặp xanh được mở rộng ở sau/bên, quai có khoá nhỏ.
- SVG trong suốt, viewBox 0 0 512 512, artwork co trong vùng prototype. Không dùng filter hay bitmap nhúng; từng file có tiền tố riêng cho gradient.
- mit-avatar.svg giữ nét mặt đơn giản, nhẹ hơn 3 KB. _compare.png xếp concept / SVG 256 px / SVG 64 px theo cùng cột; cột cuối dành cho chạy.

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
- Giữ SVG tĩnh khi bật giảm chuyển động. Nếu sau này thêm chuyển động, tôn trọng `prefers-reduced-motion` và tắt animation theo lựa chọn hệ thống.

## Vị trí gợi ý

| Tình huống | Tệp |
|---|---|
| Hình chính trong phần giới thiệu hoặc khu vực trống cần hình nhân vật. | `mit-main.svg` |
| Màn đăng nhập và lời chào ban đầu. | `mit-chao.svg` |
| Gửi phiếu hoặc phát hành thành công. | `mit-khen.svg` |
| Lỗi nhập liệu; giữ vẻ ấm áp, không trách móc. | `mit-dong-vien.svg` |
| Màn hình trống hoặc đang chờ lựa chọn. | `mit-cho.svg` |
| Đang tải; nhóm cánh, chỏm và dấu chấm có thể chuyển động riêng. | `mit-dang-tai.svg` |
| Minh hoạ câu mẫu 3 sao do giáo viên chọn. | `mit-sao-3.svg` |
| Minh hoạ câu mẫu 2 sao do giáo viên chọn. | `mit-sao-2.svg` |
| Minh hoạ câu mẫu 1 sao do giáo viên chọn. | `mit-sao-1.svg` |
| Ảnh đại diện nhỏ trong danh sách. | `mit-avatar.svg` |

## Dựng cho prototype và iOS

- Prototype web có thể import từng SVG như ảnh (`<img src="...">`) hoặc inline SVG nếu cần điều khiển các nhóm có `id`. Giữ các SVG trong cùng thư mục và đường dẫn tương đối.
- iOS có thể chuyển SVG sang PDF/asset vector khi đóng gói, hoặc vẽ bằng SwiftUI theo các nhóm hình. Kiểm tra màu và kích thước sau khi chuyển đổi.
- Các nhóm như `wing-wave`, `wing-chin`, `wing-comfort`, `wing-hug-left`, `wing-hug-right`, `crest`, `loading-dots` và `sparkles` có `id` để làm hoạt ảnh nhẹ sau này.

## Ghi chú nguồn

Ảnh concept do AI tạo, chưa rà nhãn hiệu/bản quyền; bộ SVG này vẽ lại dựa trên concept.

## Đã đưa vào prototype (2026-10-22)

- SVG chép sang `design/prototype/public/mascot/`; component `src/shared/ui/Mascot.tsx` (`pose`, `size`, `className`). Tư thế `vui` dùng `mit-khen.svg`; có thêm `dang-tai`, `avatar`.
- Nhân vật chiếm vùng giữa 400×400 của khung 512×512, nên `Mascot` cắt khung về vùng đó: `size` là cỡ nhìn thấy thật của Mít (iOS nên cắt tương tự hoặc dùng viewBox chặt).
- Cần cải thiện nếu có vòng sửa: cặp sách xanh còn nhỏ, nét mặt chào/động viên/chờ chưa khác nhiều.
