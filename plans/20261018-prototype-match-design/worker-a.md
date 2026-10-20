# Worker A: Nhập điểm và Tạo bài kiểm tra (mobile + web)

Đọc `brief.md` trước.

## Reference ↔ route

| Reference (design/reference) | Route prototype |
|---|---|
| 19-gv-tao-bai-kiem-tra.html | `/lop/:classId/bai-kiem-tra/moi` (và `/lop/:classId/diem/bai-moi`) |
| 20-gv-nhap-diem.html | `/lop/:classId/bai-kiem-tra/:testId` (nhập điểm) |
| 21-gv-nhap-diem-ban-phim.html | cùng route, khi đang gõ điểm (ô đang focus, bàn phím) |
| 22-gv-nhap-diem-loi-gia-tri.html | cùng route, giá trị điểm không hợp lệ |
| 75-trang-thai-rong-chua-co-bai-kiem-tra.html | `/lop/:classId/bai-kiem-tra` khi chưa có bài |
| 90-web-bang-diem.html | `/lop/:classId/diem` (bảng điểm cả lớp, desktop) |
| 81-trang-thai-nut-bi-vo-hieu-hoa.html, 78-trang-thai-loi-luu.html, 80-trang-thai-chua-luu-hoi-khi-roi-man.html | trạng thái của các màn trên |

Cũng xem danh sách bài kiểm tra của lớp (tab "Bài kiểm tra" trong chi tiết lớp, xem trong reference 11 để biết tab) nếu design có vẽ; nếu không có màn riêng thì giữ bố cục hiện tại nhưng dùng cùng kiểu thẻ với design.

## Được sửa

- `src/features/scores/**`
- `src/features/class-space/TestsTab.tsx`, `src/features/class-space/ScoreGridTab.tsx`
- Tạo module CSS riêng cho TestsTab và ScoreGridTab nếu hiện đang dùng chung `classSpace.module.css` (file đó thuộc worker C, không sửa).

## Cấm sửa

`src/shared/**`, `src/app/**`, `src/data/**`, `ClassSpaceLayout.tsx`, `classSpace.module.css`, và mọi thứ ngoài danh sách trên.

## Điểm cần khớp (người dùng đã chê "không giống")

- Màn nhập điểm: hàng học sinh (tên trái, ô điểm, công tắc "Vắng thi"), cỡ ô điểm, trạng thái ô đang focus (viền, màu), thanh tiêu đề bài (tên bài, ngày, thang điểm, nút đổi bài), nút "Lưu điểm" dính đáy, tiêu đề cột. Giá trị lỗi hiện thế nào (viền, chữ lỗi) lấy từ file 22.
- Tạo bài kiểm tra: các trường (tên, ngày, thang điểm cố định 10, KHÔNG có hệ số), nút chính, kiểu trường nhập, khoảng cách.
- Bảng điểm web (90): cột, hàng, tiêu đề bảng, cách hiện "chưa có điểm"/vắng thi, KHÔNG có "TB lớp", KHÔNG có hệ số.
