# Findings T: audit theo ảnh before (shell, tab dưới, sidebar, component chung)

Nguồn: `plans/20261021-mvp/web/shots/ui-audit/before/T/**` (12 ảnh) và `before/A/390x844/14-create-class-main.png` (đo chồng lấn). Ảnh chụp sau commit 0c06a7c. Banner "Lỗi lưu — vui lòng thử lại" là artifact máy chủ giả, không tính là phát hiện.

Đường dẫn ảnh viết tắt từ `plans/20261021-mvp/web/shots/ui-audit/before/`.

## Kết quả nhanh
- 390×844, 375×667, 430×932 (route `/lop`, `/lop/demo-6a/buoi-hoc`, `/…/demo-past`): lề trái/phải thống nhất 20px ở đa số phần tử, FAB ở 314–370 × 708–764 (khớp fixes-T), tab dưới 64px không che nội dung chính của `/lop`. Lỗi mobile chủ yếu nằm ở tab lớp, nhãn mục và pill trạng thái (T-06 → T-09).
- 1440×900: lỗi nặng. Shell không ra đúng bố cục sidebar + nội dung; mọi màn lớp bị ép vào cột ~230px và bị cắt.

## Bảng phát hiện

| ID | Màn (route) | Viewport | Ảnh | Vị trí | Vấn đề | Mức | Đề xuất | Token liên quan |
|---|---|---|---|---|---|---|---|---|
| T-01 | `/lop` (shell) | 1440×900 | `T/1440x900/10-shell-tabs-main.png` | Toàn shell: cột nội dung y≈60–442 và cột sidebar x≈16–264 | Menu điều hướng (Lớp, Điểm danh, Điểm số, Học sinh, Báo cáo, Cài đặt) nằm dạng danh sách mở rộng ở đầu cột nội dung, không ở sidebar. Khối "Học kỳ này · Tất cả lớp" bị dồn vào khung ~248px (x≈48–264) và cắt đột ngột tại x≈264 và y≈442. Thẻ lớp, "Buổi tới", "Chuyên cần" bị cắt. | Cao | Kiểm grid `StaffShell.tsx` + `shell.module.css` ở ≥1024: cột sidebar cố định `--sidebar-width`, cột nội dung `minmax(0,1fr)` và giới hạn `--content-max`. Kiểm DOM để biết menu đang render ở vùng nào. | `--sidebar-width`, `--content-max`, `--page-x` |
| T-02 | `/lop/demo-6a/buoi-hoc`, `/…/demo-past` | 1440×900 | `T/1440x900/11-shell-class-tabs-main.png`, `T/1440x900/12-session-sheet-menu-main.png` | Thanh tab lớp (y≈745–775), segmented "Điểm danh · Nhận xét" (y≈790–840) | Tab "Buổi học · Bài kiểm tra · Đi…" bị cắt tại x≈264, nên "Điểm", "Học sinh", "Báo cáo" không nhìn thấy/không bấm được. Segmented "Điểm danh · Nhận xét" bị cắt, "Bài tập về nhà" nằm ngoài khung. | Cao | Cùng gốc với T-01 (cột nội dung quá hẹp). Sau khi sửa shell, kiểm lại tab. Nếu tab/segmented vẫn tràn, cho `overflow-x: auto` có `--page-x` đệm hai đầu; không ẩn tab. | `--page-x`, `--control-h`, `--tap-desktop` |
| T-03 | `/lop/demo-6a/buoi-hoc` | 1440×900 | `T/1440x900/11-shell-class-tabs-main.png` | Khối tiêu đề lớp, x≈48–246, y≈700–890 | Nút "⋯" (x≈64–108, y≈743–787) đè lên dòng "8 học sinh · Thứ Ba, Thứ Sáu 17:00" (chữ "sinh", "·" bị che). Nút "Thêm buổi lẻ" (x≈116–246) tràn ra ngoài cột ~232px. **Chuyển B** (`ClassDesktopHeader.tsx`). | Cao | Xếp hàng ngang: tên lớp + meta một khối, nút hành động xuống hàng riêng hoặc vào `…` khi hẹp. Nút desktop theo nội dung, min `--button-min-w-desktop`. | `--button-min-w-desktop`, `--space-12` |
| T-04 | `/lop/demo-6a/buoi-hoc`, `/…/demo-past` | 1440×900 | `T/1440x900/11-shell-class-tabs-main.png`, `T/1440x900/12-session-sheet-menu-main.png` | Tên "Lớp 6A", breadcrumb, tiêu đề "Buổi 1 · Thứ Ba, 20 tháng 10 · 17:00" | Tên lớp xuống dòng từng chữ (L/ớ/p/6/A). Tiêu đề buổi tách 5 dòng. Breadcrumb "Buổi học" gãy 2 dòng. Chữ không mất, nhưng khó đọc và lệch phân cấp. **Chuyển B**. | Vừa | Cho tiêu đề `min-width: 0` và `overflow-wrap: anywhere` chỉ khi cần. Cỡ tiêu đề desktop theo `--text-3xl`, không ép vào cột hẹp. Sửa cùng T-01. | `--text-3xl`, `--text-2xl`, `--title-gap` |
| T-05 | `/lop/moi` | 390×844 | `A/390x844/14-create-class-main.png` | Nút "Tạo lớp" (y≈742–794) và thanh tab dưới (y≈780–844) | Nút chính "Tạo lớp" nằm dưới thanh tab dưới: chữ bị che nửa dưới, vùng bấm thực bị cắt. Khớp dòng "BUTTON 20,741.5,350,52 trùng FAB" trong inventory. Lưu ý: inventory ghi đây là FAB, nhưng ảnh cho thấy đây là nút form, không phải FAB. | Cao | Hành động đáy (sticky footer) phải đặt trên `--tabbar-total` (`bottom: var(--tabbar-total)`), hoặc ẩn thanh tab dưới ở màn form tạo/sửa. Chia việc: T sửa vị trí footer chung, A sửa form. | `--tabbar-total`, `--tabbar-height`, `--safe-bottom` |
| T-06 | `/lop/demo-6a/buoi-hoc`, `/…/demo-past` | 375×667 | `T/375x667/05-shell-class-tabs-main.png` | Thanh tab lớp, mép phải "Báo cáo" | Tab kéo tới x≈363, vượt lề 20px (mép trong 355). Ở 390 và 430 tab khớp lề, nên lỗi chỉ xuất hiện ở 375. **Chuyển A** (tab lớp thuộc class-space); nếu là component `Tabs` chung thì T. | Vừa | Tab bọc trong vùng có `padding-inline: var(--page-x)`, cho phép cuộn ngang khi thiếu chỗ thay vì co giãn theo viewport. | `--page-x` |
| T-07 | `/lop/demo-6a/buoi-hoc` | 390×844, 375×667, 430×932 | `T/390x844/02-shell-class-tabs-main.png`, `T/375x667/05-shell-class-tabs-main.png`, `T/430x932/08-shell-class-tabs-main.png` | Nhãn "Buổi hiện tại" và "Các buổi đã qua" | Nhãn bắt đầu tại x=24, thẻ bắt đầu tại x=20. Lệch 4px so với lề trang, lặp ở cả ba viewport. **Chuyển A** (`class-space`). | Vừa | Nhãn nhóm dùng `padding-inline: var(--page-x)` hoặc căn cùng mép thẻ. Không dùng số lẻ 4px. | `--page-x`, `--space-4` |
| T-08 | `/lop/demo-6a/buoi-hoc/demo-past` (tab Điểm danh) | 390×844, 375×667, 430×932 | `T/390x844/03-session-sheet-menu-main.png`, `T/375x667/06-session-sheet-menu-main.png`, `T/430x932/09-session-sheet-menu-main.png` | Pill "Có mặt" và "Vắng" ở cột phải hàng học sinh | Mép phải pill "Vắng" lệch ~7px so với pill "Có mặt" (ở 390: 684 so với 698 trong ảnh 2×). Cột trạng thái không căn thẳng. **Chuyển A** (`attendance`). | Vừa | Pill trạng thái đặt trong cột có `width` cố định hoặc `justify-self: end` để mép phải thẳng hàng. | `--radius-pill`, `--space-16` |
| T-09 | `/lop/demo-6a/buoi-hoc` | 390×844 | `T/390x844/02-shell-class-tabs-main.png` | Gạch chỉ báo dưới tab "Buổi học" | Gạch bắt đầu x=12, chữ bắt đầu x=20. Lệch do padding tab. Lỗi polish. | Thấp | Căn gạch theo chữ hoặc giữ nguyên nếu đây là padding có chủ ý. | `--page-x` |

## Chuyển team khác
- **B** (desktop, file `*Desktop*`, `class-space/ClassDesktopHeader.tsx`): T-03 (nút "⋯" đè dòng meta, "Thêm buổi lẻ" tràn cột), T-04 (tên lớp và tiêu đề buổi bị vỡ dòng).
- **A** (mobile, `src/features/**`): T-05 (form "Tạo lớp" bị tab dưới che, phần form), T-06 (tab lớp ở 375 vượt lề), T-07 (nhãn nhóm lệch 4px), T-08 (pill trạng thái không thẳng cột).
- **C**: không có phát hiện trong ảnh của T.

## Không chắc
- **Chụp toàn trang (fullPage) hay lỗi thật:** ở `T/375x667/04`, `T/390x844/02`, `T/390x844/03`, `T/430x932/09` có dải xám dưới thanh tab dưới, và thanh tab cùng nút "Lưu điểm danh" nằm giữa trang. Có thể do chụp toàn trang với phần tử `fixed`. Cần ảnh viewport sau khi cuộn đáy để xác nhận nội dung cuối không bị tab dưới che. Brief chỉ có ảnh "main", nên chưa kết luận.
- **FAB trên 1440:** không thấy FAB ở `T/1440x900/10–12`. Inventory cũng ghi "FAB chưa tìm thấy" cho các màn này. Có thể do cột bị cắt, nên chưa kết luận FAB có/không hiển thị trên desktop.
- **Menu "Đang xem lớp" ở 1440 (T-01):** chưa rõ đây là bộ chọn lớp của sidebar bị đặt sai vùng hay một thành phần khác. Cần DOM để xác định.
- **Banner "Lỗi lưu" ở 1440** chiếm một khối 165×400px ở cột sidebar. Đây là artifact máy chủ giả, không tính là phát hiện. Không kết luận được sidebar thật trông thế nào khi không có banner.
- **Vùng bấm nút "⋯" và nút quay lại trên mobile:** đo từ ảnh không chắc. Cần đo DOM (`getBoundingClientRect`).
- **Safe-area iPhone:** ảnh chụp trên Chrome, không kiểm được notch và home indicator.
- **So với prototype:** chưa đối chiếu `design/prototype-shots/`, vì các ảnh before ở trên đã đủ để kết luận lỗi chính. Ảnh trạng thái (sheet/dialog/form lỗi, thư mục `v2/`) chưa có, không kết luận về chúng.
- **`/pwa`:** không có ảnh (inventory ghi "unavailable"), không thuộc phạm vi T.

Status: DONE_WITH_CONCERNS
Summary: 4 Cao (T-01, T-02, T-03, T-05), 4 Vừa (T-04, T-06, T-07, T-08), 1 Thấp (T-09). Lỗi Cao nằm chủ yếu ở shell desktop 1440, ngoài ra có một nút chính ở `/lop/moi` bị tab dưới che.
Concerns/Blockers: Chưa có ảnh viewport sau cuộn đáy và DOM để xác nhận nguyên nhân T-01/T-02 và FAB desktop. Không sửa mã, không commit.
