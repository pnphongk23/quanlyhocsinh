# fixes-A: giáo viên mobile (2026-10-23)

Kiểm trên Chrome headless qua dev server 5183, 390×844 và 375×667 (bộ seed/fixture của `scripts/ui-audit-fixtures`). Ảnh sau: `web/shots/ui-audit/after/A/r2-*.png`.

## Đã sửa
| ID | File | Thay đổi | Cách kiểm |
|---|---|---|---|
| A-01, A-02, A-03, T-05 | `classes/NewClassPage.tsx`, `classesForm.module.css` | Nút "Tạo lớp" (+ "Huỷ" chỉ hiện desktop) vào `<ActionFooter>`; `.page` `min-height` → `--content-min-h`; bỏ `.actions/.stickyBar` cục bộ | 390: nút y=704–756, tab y=780. 375 (cuộn): nút y=542–594, tab y=603. 1440: nút căn phải trong thẻ form |
| A-04 | `classes/classesForm.module.css` | Lưới 7 ngày một hàng ở mọi khổ mobile: bỏ `min-width:44px` và mốc 380px (4+3), khe `--space-4` (desktop `--space-8`) | 390: ô x=20…370, rộng 46,6. 375: x=20…355, rộng 44,4 (≥44), không tràn |
| A-05 | `schedule/schedule.module.css` | `.cardLead` `width:56px` → `min-width:72px; white-space:nowrap` ("Thứ Bảy", "Thứ Sáu" một dòng, cột thẳng) | Ảnh `r2-schedule-375` |
| A-08, T-07 | `class-space/sessions.module.css`, `schedule/schedule.module.css` | `.groupLabel` bỏ `padding: 0 4px` (nhãn "Buổi hiện tại", "Các buổi đã qua", "Sắp tới", "Chưa điểm danh" thẳng mép thẻ x=20) | Ảnh `r2-sessions-375`, `r2-schedule-375` |
| A-09 | `class-space/classSpace.module.css`, `sessionDetail.module.css` | Header lớp/buổi: `padding-inline` `12` → `calc(--page-x - --space-16)` để glyph mũi tên lùi và nút ⋯ thẳng lề 20; `.space/.detail` lề âm và `.body` dùng `--page-top/--page-x/--page-bottom`; tab buổi `padding 0 20px` → `--page-x` | Mũi tên x≈20, ⋯ mép phải 355 ở 375 |
| A-06, A-07 | (không cần sửa mã A) | Đo ở 390 và 375, cuộn tới đáy: ⋯ cuối y=614–658 (390), 437–481 (375); FAB nằm dưới hàng cuối (390: y=708), không chồng, ⋯ bấm được. Gốc lỗi trước đó là `.page` rút gọn và FAB đã portal (T) | Ảnh `r2-students-390`, `r2-students-375` |
| A-11, A-12 | `scores/TestScoresPage.tsx`, `scores.module.css` | Footer lưu → `<ActionFooter>`; bỏ `.saveBar`. Dòng lý do "Sửa 1 ô lỗi" hardcode số 1, nay `Sửa {invalidCount} ô lỗi` (ảnh có 6 ô lỗi vẫn ghi 1). Trang trống/form tạo bài dùng `--content-min-h` | 390 cuộn đáy: lý do + nút `Lưu điểm` nằm trên tab (`r2-testscores-390-bot`). Banner lỗi có nút "Thử lại" 44px giữ nguyên chiều cao (52) |
| A-13 | `scores/scores.module.css`, `class-space/ScoreGridTab.tsx` (không đổi) | **Lỗi UI thật, không phải fixture**: bảng `min-width:640px` + cột "Học sinh" rộng 279px nên cột bài kiểm tra bắt đầu x=315, nằm ngoài vùng thấy (vùng cuộn ngang 350 rộng, scrollLeft 0). Nay bỏ min-width 640, cột tên 112px (cắt `…`), cột bài ≥120px; thêm bài thì bảng cuộn ngang. `.cellLink` căn giữa dọc (điểm trước lệch trên tên) | 390/375: cột "Kiểm tra giữa kỳ" nằm trong khung, điểm 0 / 12,1… hiện (`r2-grid-390`, `r2-grid-375`) |
| A-14, A-15 | `attendance/AttendancePanel.tsx`, `.module.css`; `class-space/classSpace.module.css` | Footer điểm danh → `<ActionFooter className={stickyBar}>` (giữ bo/nút disabled); `.space` thêm đáy `--page-bottom` (trước đây lề âm -16 triệt tiêu đệm của shell: tab Báo cáo, Điểm, các tab lớp kết thúc sát tab dưới) | Cuộn đáy 390, 375: nút "Lưu điểm danh" trên tab, thẻ "Cần chú ý" không bị che; chữ cuối "Phụ huynh chỉ thấy…" cách tab ≥16 |
| A-16 | `reports/ReportsPage.tsx` | Nút "Phát hành báo cáo" disabled khi `!summary.publishable`. Màu disabled đã do T sửa (nền `--color-neutral-soft`, chữ `--color-muted`, đọc được). Thêm dòng lý do hiển thị "Không còn báo cáo nào cần phát hành." (cùng chuỗi đã có ở `title`) và `aria-describedby`; trước chỉ có tooltip, không thấy trên cảm ứng | `r2-reports-375-bot` |
| T-06, A-10 | `class-space/classSpace.module.css` | Hàng tab lớp: `.subTabs` `gap:4px` → `0`. Ở 375 tổng rộng 384 > 375 nên tab "Báo cáo" cuộn ra x=372 (chữ 364 > 355). Nay sw=cw=375, chữ cuối kết thúc x=355, không cuộn ngang. 390 không đổi. ≤360 vẫn cuộn ngang (chưa có gợi ý mờ) | Đo DOM 390/375/360 |
| T-08 | `attendance/AttendancePanel.module.css` | `.statusButton` `justify-content:center` → `flex-end` (pill "Có mặt"/"Vắng" cùng mép phải); desktop giữ `center` | `r2-session-375-bot` |
| A-21 | `students/students.module.css` | **Mới.** Trang Học sinh (mobile) lề 37px thay vì 20px: `.page{margin:0 auto}` trong cột flex của `.staffContent` nên co theo nội dung. Thêm `width:100%` | Thẻ x=20…370 ở 390 (`r2-students-390`) |
| A-22 | `comments/CommentsPanel.module.css` | **Mới.** Footer nhận xét `bottom` → `--sticky-bottom`, `z-index` → `--z-sticky`; toast "Sẽ gửi khi có mạng" `bottom` → `--sticky-bottom + 72px`, z → `--z-toast`; scrim xác nhận z 9 → `--z-overlay` (9 thấp hơn thanh tab z 20, hộp thoại nằm dưới tab); nút disabled chữ `--color-muted` thay `--color-placeholder` (4,4:1 → 6,7:1) | Test + build |
| A-23 | `homework/HomeworkPanel.module.css`, `classes/dialogs.module.css`, `scores/scores.module.css`, `classes/editClassSchedule.module.css` | **Mới.** z-index tự do → thang: overlay 40 → `--z-overlay`; scrim 8 → `--z-overlay`, menu 9 → `--z-menu`; ô dính bảng 1 → `--z-raised`; header/footer dính 2 → `--z-sticky` | grep không còn z-index số trong file A (trừ `pwa`, của C) |
| A-24 | `class-space/sessions.module.css`, `schedule/schedule.module.css` | **Mới.** Bỏ `env(safe-area-inset-bottom)` cộng thêm vào đệm đáy trang (tab dưới `--tabbar-total` đã gồm safe-area): sessions `.tab` bỏ, schedule `.page` → `--space-24` | |
| A-25 | `schedule/schedule.module.css` | **Mới.** Chip lọc lớp ở `/lich` lệch 2px (x=22): thêm lề âm `--space-2` để bù đệm vòng focus; chip x=20 | `r2-schedule-375` |
| Token | 15 file css A (không `*Desktop*`, không `class-space/desktop.module.css`) | Thay 593 giá trị `px` khớp token: `gap/padding/margin` (2/4/8/12/16/20/24/32/48 → `--space-*`), `font-size` (12/13/14/16/18/22/26 → `--text-*`), `border-radius` (10/12/16/20/999 → `--radius-*`). Không đổi giá trị hiển thị: ảnh `sessions-390/375`, `session-390/375`, `schedule-375` trước và sau thay trùng từng byte. Số lẻ (10, 14, 6, 5, 3…) giữ nguyên | `cmp` ảnh + typecheck + test |

## Màn thêm đã mở tay ở 390 và 375 (A-2x)
Học sinh, bài kiểm tra (danh sách, nhập điểm, tạo bài), điểm, báo cáo, buổi học 3 tab (điểm danh, nhận xét, bài tập về nhà). Ngoài các mục A-21…A-25 ở trên không thấy thêm lỗi lề hoặc vùng bấm (nút ⋯ 44, FAB 56, ô điểm 44).

## Chưa sửa / ghi lại
- A-09/T-09 gạch chỉ báo tab lớp bắt đầu x=12, chữ x=20: là padding tab có chủ ý (gạch phủ cả ô tab), Thấp, giữ.
- A-10: ở ≤360 hàng tab lớp vẫn cuộn ngang, không có mép mờ gợi ý (Thấp).
- Thẻ báo cáo học sinh "Đã phát hành": nội dung chỉ chiếm nửa trên, còn khoảng trống ~60px dưới (min-height của hàng). Thấp, chưa rõ có chủ ý, giữ.
- Hàng điểm danh: mép trái bo có vệt hồng nhạt của lớp vuốt (swipe) lộ qua bo góc. Thấp, ảnh `r2-session-375-bot`.
- Dữ liệu `demo-test` của bộ chụp có điểm 12,1…12,7 sai bước 0,5 nên màn nhập điểm luôn hiện 6 lỗi và nút Lưu tắt. Đây là fixture, không phải lỗi UI.
- **B-08**: không tồn tại trong `findings-B.md` (chỉ có B-01, B-02, và mục phụ thuộc T-01). Chưa làm. Cần lead cho biết nội dung. Kiểm nhanh ở 1440: Học sinh và Tạo lớp hiển thị đúng (lề, nút, cột), không thấy lỗi.
- Còn giá trị `px` lẻ trong file A (10, 14, 6, 5) và breakpoint khác 1024 trong css features: chưa quét hết; không đổi hình.

## Cần team khác
- T (`src/shared`): `PageHeader` (nút lùi nền trắng tile trên "Điểm số"/"Tạo bài kiểm tra") có glyph lùi x≈42 (ước từ ảnh; header lớp x≈20). Có thể do thiết kế (nút nền trắng), báo để T/lead quyết.
- B: không có.

## Kiểm
- `npm run typecheck` xanh.
- `npm test`: 35 file pass, 1 skipped; 282 test pass, 1 skipped.
- `npm run build` exit 0 (có `check-bundle`).
- Ảnh: `plans/20261021-mvp/web/shots/ui-audit/after/A/r2-*.png` (12 ảnh).
- Chưa kiểm trên iPhone thật (safe-area, `100dvh`).

# Vòng 2 (mục "Cần team A" của fixes-B)

Kiểm ở 1440×900 và 1024×768; mobile 390 cho các màn đụng tới (thêm buổi lẻ, tạo bài kiểm tra). Ảnh: `after/A/v2-*.png`.

| ID | File | Thay đổi | Kiểm |
|---|---|---|---|
| B-26 | `classes/dialogs.module.css` | `.actions` desktop: `flex-direction: row-reverse; justify-content: flex-start` (nút ngang, căn phải, nút phụ nằm trái nút chính; mobile vẫn xếp dọc). Scrim đã phủ cả sidebar sau sửa gốc của T | `v2-r-cancel-1440` |
| B-27 | `class-space/AddSessionModal.tsx`, `sessions.module.css` | Nút chuyển vào prop `footer` của Sheet (submit dùng `form={id}`): "Đóng" trái, "Lưu buổi học" phải, căn phải trên desktop. "Đóng" ở footer chỉ hiện ≥1024 (mobile đã có "Đóng" ở đầu sheet, footer chỉ còn nút chính tràn ngang). Bỏ `.formActions` | `v2-r-add-1440`, `v2-m-add` |
| B-28 | `scores/scores.module.css` | Desktop: `.columns`, `.testCard`, `.desktopSaveRow` cùng `max-width: 720px` như `.studentList`, tiêu đề cột "Điểm" nay nằm trên ô nhập. `.columns` padding phải 4 → `--space-12` (khớp padding hàng, cũng sửa lệch 8px ở mobile). Không dùng `ScoreGridDesktop` vì đây là màn nhập điểm một bài, không phải bảng cả lớp. Xoá luật `.saveBar` mồ côi | `v2-r-test-1440`. Ghi chú: nút ⋯ của `PageHeader` (shared) vẫn ở mép phải vùng nội dung, ngoài cột 720 |
| B-29 | `scores/scores.module.css` | Desktop: `.formPage` ≤ 640 căn giữa, `.formPage > .form` là thẻ trắng đệm 20; `.actions` `row-reverse` căn phải ("Huỷ" trái nút chính). Mobile giữ nút chính tràn ngang | `v2-r-newtest-1440`, mobile 390 không đổi |
| B-30 | `reports/ReportsPage.module.css` | Bản desktop dùng `.desktopRow` (không phải `.studentRow`) với `padding: 12px 0`, nên viền hàng chọn sát chữ: nay `padding: var(--space-12)`. Tiêu đề "Sẵn sàng 3/8 học sinh": `white-space: nowrap` + `flex-wrap: wrap` (pill "5 thiếu dữ liệu" xuống dòng dưới thay vì bẻ chữ tiêu đề) | `v2-r-reports-1440`, `v2-r-reports-1024` |
| B-31 | `schedule/schedule.module.css` | Cột nhãn đã `nowrap` ở vòng 1 ("Thứ Bảy"/"Thứ Sáu" một dòng). Desktop `.page` `margin-inline: 0` để danh sách thẳng lề trái với tiêu đề (rules §1) thay vì căn giữa 720px. Đây là chọn theo rules, cần lead xác nhận nếu muốn căn giữa | `v2-r-sched-1440` |
| B-32 | `comments/CommentsDesktop.module.css` (**file của B**; `TicketEditor` dùng file này, không phải `CommentsPanel.module.css`) | `< 1280px`: `.templateBox` xếp cột, mascot trên chữ; câu mẫu rộng đủ (6 dòng → 4) | `v2-r-cmt-1024` |

Ghi chú cho lead: `Sheet` mặc định có nút "Đóng" ở đầu, footer của AddSessionModal vẫn có thêm "Đóng" trên desktop theo rules §2; nếu muốn bỏ nút đầu, đổi ở `src/shared/ui/Sheet.tsx` (của T).

Kiểm: `npm run typecheck` xanh; `npm test` 37 file pass, 1 skipped, 285 test pass, 1 skipped; `npm run build` exit 0.

# Vòng 3 (lỗi lưu, TestScoresPage desktop)

Gốc: trên desktop `TestScoresPage` dùng `.desktopSaveRow` (flex một hàng, không phải `ActionFooter`) chứa banner lỗi, dòng "Chưa có thay đổi để lưu" và nút; banner co còn ~170px nên chữ vỡ từng chữ, nút `width:100%` bị kéo dài.

| File | Thay đổi |
|---|---|
| `scores/scores.module.css` | `.desktopSaveRow` `flex-wrap: wrap`; `.errorBanner` trong hàng `flex: 1 0 100%` (một dòng riêng phía trên); `.saveButton` trong hàng `width:auto; min-width: --button-min-w-desktop; padding 0 --space-24` (theo nội dung, căn phải). Mobile (ActionFooter) không đổi |
| `shared/ui/ui.module.css` (`.actionFooter`, desktop) | `flex-wrap: wrap; align-items: center`; phần tử `[role="alert"]` con trực tiếp `flex: 1 0 100%`, để mọi footer dùng ActionFooter không bị ép banner trên một hàng với nút |

Điểm danh và tạo lớp: không cùng mẫu. Điểm danh desktop đặt nút Lưu ở đầu trang (file B), không có banner trong footer (ảnh 1428 không lỗi); tạo lớp báo lỗi inline trong form, ảnh chụp bằng `--scenario save-error` ở 1440 hiện trang "Tất cả lớp" (bộ chụp không ở lại form), nên chỉ kiểm được bằng đọc mã: không dùng banner footer.

Chụp lại (`node scripts/ui-audit-capture.mjs --team A --phase after --scenario save-error --base http://127.0.0.1:5183`): `after/A/1440x900/v2/1426-test-scores-save-error-nhập điểm.png` (banner một dòng "Lỗi lưu, vui lòng thử lại" + "Thử lại", hàng dưới căn phải: dòng nhắc + nút "Lưu điểm" rộng theo nội dung) và `after/A/390x844/v2/1420-test-scores-save-error-nhập điểm.png` (mobile như cũ, banner + nhắc + nút tràn ngang trên tab).
Kiểm: typecheck xanh; test và build kết quả ở khối Status.
