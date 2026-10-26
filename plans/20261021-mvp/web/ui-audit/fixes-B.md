# fixes-B: desktop giáo viên 1440×900 + 1024×768 (2026-10-23)

Kiểm trên Chrome (Playwright, dữ liệu giả của `scripts/ui-audit-fixtures`), dev server cổng 5184. Ảnh: `plans/20261021-mvp/web/shots/ui-audit/after/B/r3-*.png` (1440 và 1024). Script kiểm tạm: `.qa-b/` (chưa theo dõi bởi git).

## Kiểm lại phát hiện cũ
| ID | Kết quả | Ghi chú |
|---|---|---|
| B-01 menu lớp mở sẵn | Hết sau T-01 | Sidebar nằm đúng cột 1; không có `[role=listbox]` trong DOM mặc định |
| B-02 panel báo cáo 380 dính | Đã đúng (file A) | `reports/ReportsPage.module.css:600-606` `minmax(0,1fr) 380px`, panel `sticky; top:24px`. Ảnh `r3-reports-1440/1024` |
| B-03 | Của T, đã xong | |
| Phụ thuộc T-01 (8 nhóm lỗi cột hẹp) | Hết sau T-01 | Tiêu đề lớp một dòng, breadcrumb một dòng, tab lớp đủ 5 tab, nút "Thêm học sinh/Tạo bài kiểm tra" nằm trong lề, thẻ "Hôm nay" nằm cột phải (sticky: `position: sticky; top: 24px` đo bằng `getComputedStyle`), báo cáo hai cột, tiêu đề "Lớp của Cô Demo" cùng lề |
| T-03 nút ⋯ đè meta | Hết sau T-01 | `ClassDesktopHeader`: ⋯ và nút chính cùng hàng, bên phải; meta không bị che (1440 và 1024) |
| T-04 tiêu đề vỡ dòng | Hết sau T-01 | "Lớp 6A", "Buổi 1 · Thứ Ba, 20 tháng 10 · 17:00", breadcrumb đều một dòng |

## Phát hiện mới và đã sửa (file của B)
| ID | Mức | Màn | Vấn đề | File, thay đổi | Cách kiểm |
|---|---|---|---|---|---|
| B-21 | Vừa | Học sinh: dialog Thêm học sinh, Sửa SĐT phụ huynh, Đánh dấu nghỉ | Nút chính nằm trong thân dialog, căn trái, trái rules §2 (nút chân form căn phải) | `students/StudentsDesktop.tsx`: nút chính chuyển sang prop `footer` của `Modal` (form có `id`, nút `form=...`); chữ giữ nguyên | `r3-addstudent-1440.png`: "Lưu học sinh" căn phải, có đường kẻ footer |
| B-22 | Vừa | Điểm (bảng điểm), cột "Học sinh" | Tên học sinh bám mép trên ô, lệch so với ô nhập (do `th` mặc định `vertical-align: top`) | `scores/ScoreGridDesktop.module.css` `.studentCell`: `vertical-align: middle` | `r3-grid-1440.png` tên căn giữa ô nhập |
| B-23 | Vừa | Điểm danh (tab buổi) | Khay trạng thái cao 52px trong dòng 55px: khay chạm đường kẻ hàng (nút bị `min-height: 44` toàn cục ghi đè `height: 34`) | `attendance/AttendanceDesktop.module.css`: `.statusButton` cao `--tap-desktop` (36), `td` thêm `padding-block: --space-4` | Đo DOM: khay 44px trong dòng 53px (trước 52/55); `r3-session-Điểmdanh-1440.png` |
| B-24 | Thấp | Buổi học, thẻ "Buổi hiện tại" | Tiêu đề buổi xuống dòng mồ côi ("17:00" một mình) | `class-space/SessionsDesktop.tsx`: `textWrap: "balance"` cho tiêu đề | `r3-sessions-1440.png` |
| B-25 | Thấp | Mọi file B | Giá trị cứng khớp token | 7 file css B: `font-size` 12/13/14/16/18/22/26/30 → `--text-*`; padding/margin/gap bội thang 4/8/12/16/20/24/32/48 → `--space-*` (cách viết từng dòng); z-index 1/2/3/9 → `--z-raised`(+offset)/`--z-menu`; `0 1px 2px rgb(20 24 31/.12)` → `--shadow-sm` | So ảnh trước/sau token: 37/38 ảnh trùng từng byte; ảnh còn lại (`testdetail-1440`) chỉ lệch 4px do chụp giữa lúc chuyển trang |

Số cứng còn lại (giữ, không có token khớp): `15px` (chữ bảng), `12.5px`, `10px`, `14px` gap trong khai báo một dòng, bóng cột dính `6px 0 8px -6px`, bóng menu hai lớp của TestsDesktop. Báo lead nếu muốn thêm token.

## Cần team A (không sửa, ngoài ranh giới)
| ID | Mức | File | Vấn đề |
|---|---|---|---|
| B-26 | Vừa | `classes/ConfirmDialog.tsx`, `classes/dialogs.module.css` | Hộp xác nhận (Huỷ buổi học, và các nơi dùng chung) render `position: fixed` trong `.page` đang có transform → nền mờ chỉ phủ vùng nội dung (x 296–1392), sidebar không mờ; cùng gốc FAB. Hai nút xếp dọc căn trái, trái rules §2 (desktop căn phải, hành động phụ ở trái). Gợi ý: `createPortal` ra `document.body` hoặc dùng `Modal` chung. Ảnh `r3-cancelsession-1440.png` |
| B-27 | Vừa | `class-space/AddSessionModal.tsx` | Footer desktop: "Lưu buổi học" bên trái, "Đóng" ở giữa. Nên dùng prop `footer` của Sheet/Modal (căn phải, phụ ở trái chính). Có thêm nút "Đóng" ở đầu dialog trùng với footer. Ảnh `r3-addsession-1440.png` |
| B-28 | Vừa | `scores/TestScoresPage.tsx` (`/lop/:id/bai-kiem-tra/:testId`) | Desktop vẫn dùng bố cục mobile: danh sách học sinh rộng ~720px, tiêu đề cột "Điểm" ở mép phải 1392 nên lệch hàng ô; nửa phải trống. Cần dùng `ScoreGridDesktop`/bảng desktop hoặc giới hạn `max-width` cho cả hàng tiêu đề. Ảnh `r3-testdetail-1440.png` |
| B-29 | Vừa | `scores/NewTestPage.tsx` | `/bai-kiem-tra/moi` trên desktop: form trần căn trái, không phải thẻ ≤ 640 căn giữa như `/lop/moi`; nút "Tạo bài và nhập điểm" + "Huỷ" căn trái, Huỷ đứng sau nút chính. Cần theo changes.md §2 (thẻ ≤ 640 căn giữa, nút chân form căn phải, Huỷ trái nút chính). Ảnh `r3-newtest-1440.png` |
| B-30 | Vừa | `reports/ReportsPage.module.css` | Hàng học sinh đang chọn: viền xanh sát chữ ("Học sinh 1" chạm mép viền), changes.md §2 yêu cầu padding để viền không đè chữ. `.studentRow { padding: 12px }` nằm trong media desktop nhưng không thấy tác dụng ở hàng chọn; ở 1024 tiêu đề "Sẵn sàng 3/8 học sinh" xuống 2 dòng. Ảnh `r3-reports-1440.png`, `r3-reports-1024.png` |
| B-31 | Thấp | `schedule/**` | `/lich` desktop: cột ngày "Thứ Bảy", "Thứ Sáu" xuống 2 dòng; cột nhãn nên `white-space: nowrap` hoặc rộng theo nội dung. Danh sách căn giữa 720px (không theo lề trái sidebar), cần xác nhận chủ ý. Ảnh `r3-schedule-1440.png` |
| B-32 | Thấp | `comments/CommentsPanel.module.css` (`.templateBox`), `TicketEditor.tsx` | Tab Nhận xét ở 1024: hộp "Câu mẫu" hẹp (~250px), mascot chiếm cột trái, nhãn 3 dòng, câu mẫu 6 dòng. Gợi ý xếp mascot trên chữ ở < 1200 hoặc thu mascot. Ảnh `r3-session-Nhậnxét-1024.png` |

## Cần team T (`src/shared/**`)
| ID | Mức | File | Vấn đề |
|---|---|---|---|
| B-33 | Vừa | `shared/ui/ui.module.css` `.sheet` (dòng ~347) | `margin-bottom: 0` và bo chỉ hai góc trên áp dụng mọi cỡ màn, chỉ khối `max-width: 1023px` mới bị giới hạn. Trên desktop `Sheet` (AddSessionModal, CommentTicketSheet, SessionDetail, TestScores) dính đáy viewport, góc dưới vuông, hộp không căn giữa như `Modal`. Đo: 1440×900 dialog top 338, bottom 900. Cần đưa `margin-bottom: 0` và bo góc vào media `max-width: 1023px`. |

## Không kiểm / không chắc
- Menu ⋯ ("Tuỳ chọn lớp", "Tuỳ chọn học sinh") ở desktop: script không tìm thấy nút theo `aria-label` đã dùng ở bản mobile, chưa chụp mở menu. Chưa kết luận.
- "4/2 buổi" ở panel báo cáo và 6 lớp thay vì 3 ở "Tất cả lớp": do fixture/seed (bản ghi trùng), không phải lỗi giao diện.
- Ảnh điểm "12,1…12,7 theo bước 0,5" báo lỗi: do dữ liệu mẫu, không phải lỗi giao diện.
- Chưa kiểm trên Safari/iPhone thật.

## Kiểm
- `npm run typecheck` xanh.
- `npm test`: 36 file pass, 1 skipped; 284 test pass, 1 skipped.
- `npm run build` exit 0; JS gzip lớn nhất 147 634 B (< 200 KB).
- Trình duyệt: đã chụp và xem `/lop`, `/lop/:id/{buoi-hoc, hoc-sinh, bai-kiem-tra, diem, bao-cao}`, bài kiểm tra chi tiết, tạo bài kiểm tra, buổi học 3 tab, `/lop/moi`, `/lich`, lớp trống, dialog thêm buổi lẻ/thêm học sinh/huỷ buổi ở 1440×900; phần lớn lặp ở 1024×768. Không có cuộn ngang (`scrollWidth == clientWidth`) ở cả hai khổ.

Status: DONE_WITH_CONCERNS
