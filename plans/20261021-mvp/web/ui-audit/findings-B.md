# Findings B · Desktop giáo viên 1440×900 (before)

Nguồn ảnh: `plans/20261021-mvp/web/shots/ui-audit/before/B/1440x900/` — bộ 49–57 theo `inventory.md` (chụp 11:20).
Bỏ qua: bộ 43–49 chụp 11:19 (nhiều file cùng 37050 byte, không đọc riêng); banner "Lỗi lưu — vui lòng thử lại" là máy chủ giả, không tính.
Ảnh đều bị vỡ khung do lỗi shell T-01 (banner chiếm ô lưới đầu, nội dung ép vào cột ~248px). Theo lead, mọi lỗi chỉ do cột hẹp được gộp vào một mục phụ thuộc T-01, chụp lại sau khi T sửa.
Chưa đối chiếu prototype trong `design/prototype-shots/ux-v2/`. Không sửa mã, không chạy dev server.

## Phụ thuộc T-01 — chụp lại sau

Các lỗi dưới đây chỉ xuất hiện do cột nội dung hẹp (~216–248px). Không tách thành phát hiện riêng; kiểm lại trên ảnh chụp sau khi T-01 xong:

- Chữ vỡ từng chữ hoặc nhiều dòng: tiêu đề "Lớp 6A" (L/ớ/p/6/A), "Buổi 1 · Thứ Ba, 20 tháng 10 · 17:00", breadcrumb "Buổi học" và "Bài kiểm tra" — `49`, `50`, `53`, `56`, `57`.
- Nút "…" đè lên dòng meta "8 học sinh · …" (che chữ "sinh") — `50`, `52`, `55`, `56`.
- Hàng tab lớp bị cắt ở x≈264 (chỉ thấy "Buổi học", "Bài kiểm tra", "Đi…") — `50`, `54`, `56`, `57`.
- Nút chính bị cắt ở mép phải: "+ Thêm học sinh", "Tạo bài kiểm tra" — `52`, `54`.
- Thẻ "Hôm nay · Thứ Sáu 23/10" đặt chồng lên lưới thẻ lớp, che ô tìm kiếm và cắt "Chuyên cần" — `49`.
- Màn báo cáo: danh sách co còn ~48px ("Sẵn / sàng / 3/8 / học / sinh"), chi tiết bị cắt — `56`.
- Tiêu đề "Lớp của Cô Demo" lệch lề (x≈290) so với tiêu đề trang (x≈48) do khối brand nằm sai cột — `50`, `52`.
- Bảng điểm và bài kiểm tra không hiện được để đánh giá — `54`, `55`.

Khi chụp lại: kiểm tra từng mục trên, đặc biệt là tiêu đề, nút "…" và hàng tab không còn bị đè hay cắt.

## Bảng phát hiện (lỗi còn tồn tại khi cột đủ rộng)

| ID | Màn (route) | Viewport | Ảnh | Vị trí | Vấn đề | Mức | Đề xuất | Token liên quan |
|---|---|---|---|---|---|---|---|---|
| B-01 | Mọi màn `/lop/:id/*` (đã chọn lớp) | 1440×900 | `49-classes-main.png`, `50-class-sessions-main.png`, `55-score-grid-main.png` | Menu "Đang xem lớp" (listbox) x 282–1405, y≈60–442 | Menu lớp mở sẵn trên desktop, phủ ~380px đầu vùng nội dung, kể cả khi đã chọn lớp. Chưa rõ menu mở do state mặc định hay do cách chụp; cần kiểm lại sau T-01 vì khối này nằm trong sidebar | Cao | Đóng menu mặc định (`classMenuOpen` mặc định `false`, `src/roles/staff/StaffShell.tsx:31`); kiểm `.staffClassMenu` (`src/app/shell.module.css:31`) xem có hiện khi không mở | `--z-menu`, `--radius-button`, `--color-border` |
| B-02 | `/lop/:id/bao-cao` | 1440×900 | `56-reports-main.png` | Panel chi tiết báo cáo | `changes.md` §2 yêu cầu danh sách \| panel 380px dính, nhưng `src/features/class-space/desktop.module.css` có `.sideColumn` 360px và `.sideColumnNarrow` 260px, không có 380px. Lỗi này nằm trong CSS, không phụ thuộc độ rộng cột | Cao | Dùng `minmax(0,1fr) 380px` với panel `position: sticky; top: 24px`; hàng chọn có padding để viền không đè chữ. Nếu màn báo cáo không dùng `.split` của nhóm B thì chuyển A | `--card-pad`, `--space-24` |

Tổng: Cao 2 · Vừa 0 · Thấp 0. Cộng thêm 1 mục phụ thuộc T-01 gồm 8 nhóm lỗi ở trên.

## Chuyển team khác

- **T**: B-01 (`src/roles/staff/StaffShell.tsx`, `src/app/shell.module.css`), cộng với T-01 (grid shell, banner lưu giả chiếm ô đầu).
- **A**: kiểm tra thẻ "Hôm nay" 360px dính ở màn Tất cả lớp (`changes.md` §2) trong `src/features/classes/**` sau khi T-01 xong. Không có file `*Desktop` cho màn này trong nhóm B.
- **B**: B-02 (`src/features/class-space/desktop.module.css`).

## Không chắc

- Cuộn đáy (`51`, `53`) giống hệt ảnh chính (cùng byte với `50`, `52`): không xác nhận được đệm đáy và khoảng cách với đáy trên desktop.
- Bảng điểm (`55`) và bài kiểm tra (`54`): không đánh giá được cột, khoảng cách và trạng thái bảng.
- Khối đỏ/hồng bên trái (x 48–213, y 24–441) trong mọi ảnh: là banner lưu giả, không tính.
- Menu B-01 mở sẵn: chưa biết do state hay do cách chụp. Cần xem `scripts/ui-audit-capture.mjs`.
- Tương phản chữ phụ (muted, cỡ nhỏ): nhìn chung đọc được, chưa đo.

Status: DONE_WITH_CONCERNS
Summary: 2 phát hiện còn tồn tại khi cột đủ rộng (Cao 2, Vừa 0, Thấp 0), cộng 1 mục phụ thuộc T-01 gồm các lỗi do cột hẹp, cần chụp lại sau khi T sửa.
Concerns/Blockers: Ảnh 1440 hiện bị vỡ bởi T-01, nên phần lớn lỗi chưa đánh giá được. Cần chụp lại sau khi T xong để xác nhận mục phụ thuộc. Ảnh cuộn đáy không có dữ liệu cuộn thật.
