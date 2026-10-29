# Báo cáo F — Chụp và kiểm tra giao diện web

## Trạng thái: DONE_WITH_CONCERNS

### Kết quả

- Đã chụp A–D ở 390 và 1440 CSS px bằng Chromium (Chrome hệ thống) và WebKit: 16 ảnh trong `plans/20261028-ai-features/shots-web/`.
- Đã che SĐT bằng `*** ***` trong văn bản, ô nhập và ô dán trước khi chụp. A, B, C, D chỉ mở/xem; không chạm chip, không Lưu/Thêm/Gửi và không đổi quyền.
- Console: Chromium 0 lỗi; WebKit 1 lỗi (chỉ ghi số lượng, không ghi nội dung).

### Lỗi giao diện

- A desktop: panel phiếu bên phải chồng tiêu đề “Nhận xét gửi phụ huynh” lên hàng sao; vùng nhận xét cũng đè lên khu vực tiêu chí. Thấy ở cả Chromium và WebKit (`A-1440-*`).
- Ảnh mobile chụp full-page giữ thanh hành động/thanh tab cố định ở vị trí viewport, nên chúng phủ một phần nội dung cuộn trong ảnh; đây là giới hạn cách chụp full-page.

### Kiểm chứng

- Build worktree: `npm run build` đạt; còn cảnh báo import tĩnh/động của `src/data/auth/index.ts`.
- Preview cục bộ dùng API staging chỉ để đọc. Không sửa `src/`, không commit. Không chạy test.
