# Worker C — Chi tiết lớp, Buổi học, Danh sách lớp (mobile + web)

Ngày: 2026-10-18 · Không commit · Chỉ sửa file trong danh sách "Được sửa".

## Màn đã làm (reference ↔ route ↔ file)

| Reference | Route prototype | File sửa |
|---|---|---|
| 09-gv-lop-cua-toi.html | `/lop` (mobile) | `src/features/classes/ClassListPage.tsx`, `classes.module.css` |
| 10-gv-tao-lop-moi.html | `/lop/moi` | `src/features/classes/NewClassPage.tsx`, `classesForm.module.css` |
| 11-gv-chi-tiet-lop-buoi-hoc.html | `/lop/:classId/buoi-hoc` | `src/features/class-space/ClassSpaceLayout.tsx`, `classSpace.module.css`, `SessionsTab.tsx`, `sessions.module.css` |
| 12-gv-chi-tiet-lop-menu.html | menu "..." trong `/lop/:classId/*` | `src/features/classes/ClassOptionsMenu.tsx` (mới), `dialogs.module.css` (mới), `ClassSpaceLayout.tsx` |
| 16-gv-diem-danh.html | `/lop/:classId/buoi-hoc/:sessionId` (tab Điểm danh) | `src/features/class-space/SessionDetailPage.tsx`, `sessionDetail.module.css`, `src/features/attendance/AttendancePanel.tsx`, `AttendancePanel.module.css` |
| 17-gv-buoi-chua-toi-ngay-hoc.html | cùng route, buổi chưa tới ngày | `AttendancePanel.tsx` (`readOnly`), `SessionDetailPage.tsx` |
| 24-gv-nhan-xet.html, 25-gv-nhan-xet-gui-khi-mat-mang.html | cùng route, tab Nhận xét | `src/features/comments/CommentsPanel.tsx`, `CommentsPanel.module.css` |
| 53/54/55 (bài giảng trong buổi) | cùng route, khối "Bài giảng" + tấm chọn | `src/features/lectures/SessionLecturesPanel.tsx`, `sessionLectures.module.css` |
| 74/76 (rỗng) | lớp chưa có buổi học (`SessionsTab`), buổi bị huỷ (`SessionDetailPage`) | `sessions.module.css` (`.emptyBlock`), `sessionDetail.module.css` |
| 78-trang-thai-loi-luu.html | lỗi lưu điểm danh | `AttendancePanel.tsx/.module.css` (`.saveError` + "Thử lại") |
| 80-trang-thai-chua-luu-hoi-khi-roi-man.html | rời màn khi còn nháp điểm danh | `SessionDetailPage.tsx` + `src/features/classes/ConfirmDialog.tsx` (mới) |
| 82-trang-thai-hop-xac-nhan-nguy-hiem.html | huỷ buổi học | `ConfirmDialog.tsx` dùng ở `SessionsTab.tsx` và `SessionDetailPage.tsx` |
| 88-web-tat-ca-lop.html | `/lop` ở desktop | `classes.module.css` (thẻ 18/20, lưới 300px, ô tìm 240×48) |
| 89-web-diem-danh-lop.html | chi tiết buổi ở desktop | `AttendancePanel.tsx/.module.css` (2 cột, thẻ trắng, hàng có đường kẻ trên, nút trạng thái đặc 92×44) |
| 31-37 (tab Học sinh), 91-97 | tab "Học sinh"/"Báo cáo" của lớp | chỉ đổi khung chung ở `ClassSpaceLayout` + `classSpace.module.css`; nội dung `StudentsPage`/`ReportsPage` ngoài danh sách file được sửa nên **giữ nguyên** |

File mới: `src/features/classes/ClassOptionsMenu.tsx`, `src/features/classes/ConfirmDialog.tsx`, `src/features/classes/dialogs.module.css` (đặt trong thư mục feature được phép, không thêm vào `src/shared`).
Không sửa: `AddSessionModal.tsx` (chỉ ăn theo CSS `sessions.module.css`), `EditClassModal.tsx`, `EditClassSchedule.tsx`, `TestsTab.tsx`, `ScoreGridTab.tsx`, `src/shared/**`, `src/app/**`, `src/data/**`, `design/reference/**`.
Không thêm hàm nào vào `src/data/repositories/*`.

## Số đo đã bám (đọc trực tiếp từ `design/reference`)

**Khung chi tiết lớp (11/12)** — đầu màn trắng đệm `12px 12px 4px`, nút back và "..." 44×44 nền trong suốt bo 12, tên lớp 22/700 `-0.01em`; hàng tab cao 48, chữ 13/600, tab đang chọn màu `--color-primary` + gạch chân 3px, tab thường `--color-muted`, đường kẻ dưới `--color-border`. Menu "..." rộng 220, bo 12, viền `--color-border`, đệm 4, mục cao 48 bo 8 chữ 15/600 + icon 18, lớp phủ `--color-scrim`.

**Tab Buổi học (11)** — nhãn nhóm 14/600 muted đệm `0 4px`; thẻ buổi hiện tại trắng bo 16 đệm 16 khe 12, tiêu đề `Buổi N · <thứ, ngày>` 18/700, meta 14 muted, nút chính 52 bo 12 chữ 16/600; hàng buổi đã qua trắng bo 12 `min-height 56` đệm `8px 8px 8px 16px`, tiêu đề 16/600, meta 14 muted, mũi tên rộng 44; thẻ "Thư viện bài giảng" nền `--color-primary-soft` chữ `--color-primary-ink` bo 12 cao 52 đệm `0 8px 0 16px` chữ 15/600; FAB 56.

**Điểm danh (16/17/78/89)** — hàng tóm tắt `<b>N</b> vắng mặt` 14 + "Tất cả có mặt" cao 44 đệm `0 12` nền nhạt chữ xanh đậm 14/600; dòng "Vuốt phải: vắng · Vuốt trái: muộn" 13 muted; hàng học sinh trắng bo 12 `min-height 56` đệm `6px 8px 6px 12px`, avatar 36 tròn, tên 16/500, nút trạng thái `min-width 96` cao 44 chứa pill `4px 12px` bo 999 chữ 13/600 (Có mặt/Muộn/Có phép/Vắng đúng token); nền vuốt: nửa trái đỏ "Vắng" đệm trái 20, nửa phải `--color-warning-soft` "Muộn" đệm phải 20, chữ 14/700; buổi chưa tới ngày: băng nhắc nền nhạt bo 12 đệm `12px 16px` 14/1.45 kèm icon khoá 18, hàng mờ 0.6, pill "–", nút "Điểm danh" xám `--color-input-border` chữ muted; lỗi lưu: băng `--color-error-soft` bo 12 `min-height 52` đệm `0 8px 0 16px` 14/600 + icon cảnh báo 18 + "Thử lại" 44 nền `--color-error` chữ trắng; nút lưu 52. Web (89): thẻ trắng đệm `18px 20px`, đầu thẻ tiêu đề 17/700 + tóm tắt 4 trạng thái 14 muted (số `--color-text`), hàng `padding 8px 0` + đường kẻ trên `--color-divider`, nút trạng thái đặc `92×44` bo 12 chữ 14/600, cột phụ `min-width 280`.

**Nhận xét (24/25)** — pill lọc cao 44 đệm `0 16` bo 999 14/600 (chọn: nền `--color-primary` chữ trắng); thẻ trắng bo 16 đệm `12px 16px` khe 8, tên 16/600 + pill trạng thái 13/600 `5px 10px`; nội dung 15/1.55; ô nhập nền `--color-bg` bo 12 đệm 12 `min-height 64` 15/1.55; gợi ý 13 muted; câu mẫu nền nhạt bo 999 đệm `8px 14px` 14/600; nút cuối màn 52. Băng "Sẽ gửi khi có mạng" (25): nền `--color-text`, chữ trắng, bo 12, `min-height 48`, đệm `0 16`, chữ 14.

**Bài giảng trong buổi (53/54/55)** — thẻ trắng bo 16 đệm 16 khe 12; đầu thẻ tiêu đề 16/700 + "Gắn bài giảng" cao 44 đệm `0 14` nền nhạt chữ xanh đậm 14/600 + icon +16; hàng nền `--color-bg` bo 12 đệm `6px 4px 6px 8px` `min-height 56`, icon dẫn 28 (xám `#8A93A0` — không có token, ghi chú trong CSS), tiêu đề 15/600, meta 13 muted, nút gỡ 44×44; khối rỗng `--color-bg` bo 12 đệm `12px 16px` 14/1.5. Tấm chọn: hàng `min-height 60` bo 12 đệm `8px 12px`, hàng đang chọn nền `--color-primary-soft`, ô tick 24×24 bo 8 (chọn: nền `--color-primary` + dấu; chưa: viền 2px `--color-input-border-strong`), meta 13, nút 52 cách trên 8.

**Danh sách lớp (09/88)** — đầu màn "Xin chào, cô Lan" 14 muted + h1 26/700 + avatar 44 tròn nền nhạt; thẻ "Hôm nay" nền `--color-primary` bo 16 đệm `12px 16px` khe 12, dòng trên 14, tên 18/700, nút "Điểm danh" 44 đệm `0 14` nền trắng chữ `--color-primary-ink` 14/600; thẻ lớp trắng bo 16 đệm 16, tên 18/700, chip nền `--color-bg` bo 8 đệm `8px 10px` chữ 14; FAB 56; web: lưới `repeat(auto-fill,minmax(300px,1fr))` khe 16, thẻ đệm `18px 20px`, tên 20/700.

**Tạo lớp (10)** — nút back 44 nền trắng bo 12 + h1 22/700; nội dung khe 16, nhãn 14/600 cách ô 8, ô cao 52 bo 12 đệm `0 16` chữ 16; 7 ô ngày cao 44 bo 12 14/600; ghi chú 14/1.5 muted; nút "Tạo lớp" 52 sát đáy màn.

**Hộp thoại (82/80)** — hộp trắng bo 16 đệm 24 khe 16, tiêu đề 20/700, lời nhắn 16/1.5 muted, nút cao 52 xếp dọc khe 8 (nguy hiểm/huỷ = `--color-error-soft` + `--color-error`, giữ = `--color-neutral-soft`).

## Chỗ còn lệch design và vì sao

1. **Gộp 3 màn của design vào một route.** Brief chốt route `/lop/:classId/buoi-hoc/:sessionId` là "chi tiết buổi, điểm danh"; design tách màn Buổi (53: thẻ Điểm danh + thẻ Bài giảng), màn Điểm danh (16/17) và màn Nhận xét (24/25). Tôi giữ 2 tab Điểm danh/Nhận xét trong cùng màn và đặt khối Bài giảng ngay dưới nội dung tab, theo đúng yêu cầu "phần bài giảng trong chi tiết buổi".
2. **Buổi bị huỷ**: design 76 có thẻ ngày kèm 2 mũi tên chuyển buổi trước/sau. Prototype không có hành vi chuyển buổi trong màn chi tiết nên tôi bỏ mũi tên, giữ thẻ ngày + khối rỗng + 2 nút. Nút "Khôi phục buổi học" tôi **có làm**, dùng hàm sẵn có `setSessionStatus(id, "planned")` (không thêm hàm mới). Đây là một bổ sung về hành vi so với prototype cũ (design 76 và 82 đều hứa "khôi phục được"): đề nghị bổ sung "khôi phục buổi đã huỷ" vào spec mục 8 "Bản đầu" (hiện spec chỉ ghi "hủy buổi bằng 1 nút").
3. **Giờ kết thúc**: design 10 có 2 ô "Bắt đầu"/"Kết thúc"; dữ liệu chỉ có một trường `time` (`src/data/**` không được sửa) nên màn Tạo lớp chỉ có "Giờ bắt đầu".
4. **"Thêm học sinh vào lớp" ở design 10** ("Nhập tay từng em" / "Chọn từ lớp khác"): prototype thêm học sinh trong tab Học sinh của lớp sau khi tạo. Tôi giữ đúng vị trí/kiểu chữ của khối nhưng chỉ để lời nhắn dẫn sang tab Học sinh, không dựng 2 hàng bấm được mà không có màn đích.
5. **Nút "Huỷ" ở màn Tạo lớp bị bỏ** (design 10 chỉ có "Tạo lớp"); nút back ở đầu màn vẫn là đường thoát. Ô "Thang điểm" (segmented bị vô hiệu) được thay bằng đúng dòng ghi chú của design: "Điểm theo thang 10 cho mọi bài kiểm tra."
6. **Danh sách lớp mobile**: thay thanh dưới "+ Tạo lớp mới" bằng FAB 56 của design 09.
7. **Hàng buổi đã qua**: design 11 không vẽ pill trạng thái và không có tóm tắt điểm danh. Tôi bỏ tóm tắt "N có mặt · N vắng" và bỏ nhóm theo tháng (design để danh sách phẳng), nhưng giữ: pill "Đã huỷ" (theo design 76) và thêm "· Chưa điểm danh" vào dòng meta cho buổi đã qua mà chưa điểm danh. Vẫn giữ khối "Sắp tới (N buổi)" (design không có chỗ cho các buổi tương lai khác) và 2 nút "Sửa buổi lẻ / Hủy buổi" cho buổi lẻ đang chờ.
8. **Pill "–" ở buổi chưa tới ngày**: design 17 tô pill này bằng màu "có mặt" (xanh lá) dù nội dung là "–"; tôi để màu neutral `--color-neutral-soft` cho đúng nghĩa "chưa có trạng thái" (coi như lỗi nhỏ của design, không tự sửa design).
9. **Ô "Đến lúc" và "Ghi chú"** khi trạng thái Muộn (hành vi sẵn có của prototype, spec ghi "ghi chú giờ đến muộn" là ✗ trong design) vẫn nằm trong hàng học sinh, nên hàng đó cao hơn và avatar bị canh giữa theo khối 2 dòng; design 16 vẽ hàng một dòng.
10. **Nút lưu của điểm danh/nhận xét dùng `position: sticky` trong panel**, không cố định theo màn hình như design 16/17/24. Vì 3 màn của design nay nằm trong một màn có thêm khối Bài giảng, nếu cố định thì nút sẽ che khối Bài giảng; sticky giữ nút ngay dưới danh sách và tự nhường chỗ khi cuộn xuống bài giảng.
11. **Web 89**: không làm thẻ "Các buổi gần đây" (spec 8 xếp "Màn lịch sử điểm danh" vào "Làm sau"); 2 nút "Tất cả có mặt"/"Lưu điểm danh" vẫn nằm ở hàng trên thẻ thay vì đầu trang vì cần hàm `save()` của panel (đầu trang thuộc `SessionDetailPage`). Bỏ avatar ở hàng trên web đúng như design 89.
12. **Tab của lớp trên desktop** vẫn nằm trong vùng nội dung, không đưa vào thanh bên như web 88/89: `src/app/TeacherShell` (không được sửa) chỉ có 3 mục và brief đã chốt giữ 3 tab của shell.
13. **Thẻ "Cần chú ý"** giữ ở cả mobile (design 16 không vẽ) vì spec 4 bắt buộc cảnh báo vắng 2 buổi; dòng "Muộn tính là có đi học · Có phép không bị trừ chuyên cần" chỉ hiện trên desktop.
14. **Menu "..." (12)**: design chỉ vẽ 1 mục "Sửa lịch học"; tôi giữ đủ "Sửa lớp", "Sửa lịch học", "Lưu trữ lớp" (spec 8 yêu cầu tạo/sửa/lưu trữ lớp) theo đúng kiểu mục của design. Lớp đã lưu trữ thì menu chỉ hiện ghi chú "Lớp này đã lưu trữ." như trước.
15. **Đồng bộ chạy ngầm (quyết định 5 của brief)**: đã bỏ "Đã lưu nhận xét nháp trên máy." và dòng "N nhận xét chưa gửi". Giữ "Sẽ gửi khi có mạng" của design 25 vì đó là thông báo hành động chờ gửi (không phải chip trạng thái lưu/đồng bộ) và giữ "Đã gửi nhận xét cho phụ huynh." khi gửi thành công. **Đây là chỗ design 25 và spec 5.3 có thể đọc ngược nhau; tôi không tự sửa spec, chỉ ghi lại.** Nút "Mô phỏng mất mạng" (công cụ của prototype để tới được màn 25) vẫn giữ, thu nhỏ thành chữ 13/600 muted.
16. **Khung tab "Học sinh"/"Báo cáo"**: chỉ đổi khung (đầu màn trắng, hàng tab 13/600 gạch chân) theo 11/31; nội dung 2 tab vẫn dùng bố cục cũ vì `StudentsPage.tsx`/`ReportsPage.tsx` (`src/features/students/**`, `reports/**`) không nằm trong danh sách "Được sửa", nên chưa khớp 31-37 và 91-97.
17. **Sửa lịch học** (không có màn design tương ứng) ăn theo `classesForm.module.css` đã chỉnh: form chuyển từ grid sang flex column, `.stickyBar` không còn `position: sticky`. Ảnh chụp cho thấy vẫn đúng bố cục.
18. **Thẻ bị chọn trong Nhận xét** không còn viền xanh (design 24 không có); trạng thái "đang soạn" thể hiện bằng pill + phần soạn mở rộng.

## Lệnh đã chạy và kết quả

```
npm run typecheck   # tsc --noEmit: sạch (chạy 4 lần, lần cuối sau mọi sửa đổi)
npm test           # 15 file / 93 test pass (không đổi test nào)
npm run build      # ✓ built in 1.41s
```

Kiểm bằng mắt (Playwright + Chromium có sẵn, `design/prototype` chạy dev ở cổng 5199, ảnh trong `/tmp/shots/`):

- 390×844: `/lop`, `/lop/moi`, `/lop/6a/buoi-hoc`, menu "...", `/lop/6a/buoi-hoc/6a-session-8` (buổi chưa tới ngày: băng khoá + hàng mờ + nút xám), `/lop/6a/buoi-hoc/6a-session-7` (điểm danh đủ 4 trạng thái, nhận xét, tấm chọn bài giảng, khối Bài giảng đã gắn), buổi bị huỷ (tạo bằng nút "Hủy buổi" thật rồi mở lại), trạng thái rỗng sau khi khôi phục, hộp xác nhận huỷ buổi, hộp "Điểm danh chưa lưu" 3 nút.
- 1360×860: `/lop`, `/lop/6a/buoi-hoc`, `/lop/6a/buoi-hoc/6a-session-7` (điểm danh 2 cột đúng 89), tab Nhận xét 2 cột.
- Tương tác thật đã kiểm: **vuốt trái trên hàng đầu → chuyển sang "Muộn"** (ảnh `50-swipe.png` cho thấy nền "Muộn" lộ ra khi kéo); **bấm back khi còn nháp → hiện hộp "Điểm danh chưa lưu" với Lưu / Bỏ thay đổi / Ở lại**; **"Khôi phục buổi học" đưa buổi về lại trạng thái chưa điểm danh**; nút "Tất cả có mặt" và "Lưu điểm danh" chạy không lỗi.

## Chỗ chưa kiểm

- Chưa kiểm bằng mắt trạng thái "chỉ có quyền đọc" của `CommentsPanel` ở desktop và `!canEdit` của điểm danh (chỉ suy ra từ nhánh `viewOnly` và ảnh buổi chưa tới ngày).
- Chưa kiểm bàn phím thật trên iPhone/Safari (chỉ Chromium headless): chưa biết thanh nút sticky có bị bàn phím che không.
- Chưa kiểm danh sách dài (nhiều buổi/tháng) và danh sách lớp đông để xem `justify-content: space-between` của hàng 5 tab có phải cuộn ngang trên máy nhỏ.
- Chưa kiểm một buổi lẻ (`6a-extra-session`) và buổi ít học sinh (danh sách rỗng) bằng mắt; logic giữ nguyên như trước.
- Buổi tương lai bị huỷ sẽ không còn xuất hiện trong tab Buổi học (hàm `splitSessions` trong `src/data/sessionGroups.ts` không có nhóm cho buổi huỷ ở tương lai) — lỗi sẵn có, không sửa được vì `src/data/**` nằm ngoài phạm vi.

Status: DONE_WITH_CONCERNS
Summary: Đã dựng lại danh sách lớp, tạo lớp, khung chi tiết lớp + menu "...", tab Buổi học, chi tiết buổi (điểm danh 4 trạng thái theo 16/17, nhận xét theo 24/25, bài giảng theo 53/54/55), các trạng thái rỗng/lỗi lưu/hỏi khi rời màn/hộp xác nhận huỷ (74/76/78/80/82) và bản web (88/89) bám số đo trong `design/reference`; typecheck, 93 test và build đều xanh, đã đối chiếu bằng ảnh chụp 390×844 và 1360×860 cùng vài tương tác thật (vuốt đánh dấu, hỏi khi rời màn, khôi phục buổi). Còn lệch có chủ ý: gộp màn của design vào một route chi tiết buổi, thiếu ô "Kết thúc" và 2 hàng "Thêm học sinh" của design 10 do dữ liệu/nghiệp vụ, bỏ mũi tên chuyển buổi ở 76, không làm thẻ "Các buổi gần đây" của web 89, và giữ thông báo "Sẽ gửi khi có mạng" của design 25 dù spec 5.3 chỉ cho hiện lỗi lưu/đồng bộ (đã ghi lại, không tự sửa spec).
