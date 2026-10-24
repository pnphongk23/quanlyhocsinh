# ux-04 · Báo cáo

## Thay đổi (đều trong `design/prototype/`)
- `src/data/scoreFormat.ts`: `formatScore(value: number | null)` là hàm chuẩn duy nhất. Bỏ ".0", số lẻ dùng dấu phẩy, `null` → "Chưa có điểm". `parseHalfScore` giữ nguyên (nhận "7,5" và "7.5").
- `src/shared/format/index.ts`: `formatScore` chỉ còn re-export từ `data/scoreFormat` (bản Intl `toFixed`-kiểu 1 chữ số đã bỏ).
- `src/features/scores/scoreReport.ts`: xoá `formatScoreDot`. `StudentScoreReportPage.tsx` dùng `formatScore`.
- `src/features/reports/latestTest.ts`: `trimNumber` = alias `formatScore` (giữ export vì `desktopComments.test.ts` dùng); `latestTestLabel` gọi `formatScore`. `ReportPreview.tsx` dùng `formatScore`.
- `src/roles/guardian/guardianFormat.ts`: `scoreText` = `formatScore`. `GuardianReportPage.tsx`: bỏ `toFixed(1)`.
- `ScoreGridTab.tsx`, `TestScoresPage.tsx`, `ScoreGridDesktop.tsx`: không cần đổi (đã gọi `formatScore`).

## Test
- Sửa test đang khẳng định hành vi cũ ("8.0/10", "10.0/10", "9.0/10", "6.0") → "8/10", "10/10", "9/10", ">6<" + không có `\d.0`: `reportsPreview.test.tsx`, `guardianRender.test.tsx`, `scoreReportRender.test.tsx`.
- Thêm ca vào `desktopScores.test.ts`: 10→"10", 0→"0", 0.5→"0,5", 7.5→"7,5", 14.5→"14,5", null→"Chưa có điểm".
- Test render phụ huynh (`guardianRender.test.tsx`, Báo cáo tháng và Điểm số) giờ khẳng định có "10/10"; ảnh `m-ph-ph_diem.png` xác nhận không còn "10.0". Chưa thêm assertion `not.toContain("10.0")` riêng.

## Kiểm
- `npm test`: 56 file, 546 test xanh (baseline 540; chênh lệch do thay đổi của worker khác, tôi không thêm test mới nào, chỉ thêm assertion).
- `npm run build`: xanh.
- Rà `toFixed|formatScore|scoreText|.0/` trong `src/` (trừ `features/classes/**`): không còn chỗ hiện điểm nào dùng `toFixed(1)`. srcwalk lỗi binary nên dùng grep.

## Ảnh
`design/prototype-shots/ux-v2/after/final/`: `d-ph-ph`, `m-ph-ph`, `d-ph-ph_diem`, `m-ph-ph_diem`, `d-gv-lop_6a_diem`, `d-ph-ph_bao-cao` (cổng 5195, đã tắt server). Đã xem `m-ph-ph_diem.png`: "10/10", "9/10", "8/10". Các ảnh còn lại chưa xem từng tấm.

## Việc còn lại
Không.

## Cho web/iOS
Điểm bước 0,5. Hiển thị: bỏ ".0", số lẻ dùng dấu phẩy: 10 → "10", 7,5 → "7,5", "10/10", "7,5/15". Không bao giờ "10.0" hay "7.5". Ô nhập nhận cả "7,5" và "7.5". Áp dụng cho giáo viên, phụ huynh, báo cáo và PDF xem trước.
