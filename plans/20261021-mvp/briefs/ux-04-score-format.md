# ux-04 · Định dạng điểm thống nhất

Đọc `ux-00-common.md`. Dev server cổng 5195. Ảnh: `design/prototype-shots/ux-v2/after/final/` (ghi đè ảnh có điểm: `d-ph-ph.png`, `m-ph-ph.png`, `d-ph-ph_diem.png`, `m-ph-ph_diem.png`, `d-gv-lop_6a_diem.png`, `d-ph-ph_bao-cao.png`).

## Quy tắc (GL/người dùng)
Điểm bước 0,5 (spec). Hiển thị: bỏ ".0", số lẻ dùng dấu phẩy. `10` → "10", `7.5` → "7,5", `10/10`, `7,5/15`. Không bao giờ "10.0" hay "7.5". Ô nhập vẫn nhận cả "7,5" và "7.5" (giữ parse hiện có).

## Phạm vi file
`src/shared/format/**`, `src/data/scoreFormat.ts` (+ test của nó), `src/features/scores/**`, `src/features/reports/**`, `src/features/class-space/ScoreGridTab.tsx`, `src/roles/guardian/guardianFormat.ts` và các file `src/roles/guardian/**` chỉ khi cần đổi lời gọi. KHÔNG sửa `src/features/classes/**` (worker ux-05).

## Việc
1. Một hàm chuẩn duy nhất (giữ `formatScore` ở `data/scoreFormat.ts` hoặc shared/format, chọn một, cái kia re-export), bỏ các bản sao: `formatScoreDot` (scoreReport.ts), `toFixed(1)` ở guardianFormat.ts, chỗ tự format ở reports/latestTest.ts. Rà toàn `src/` (`toFixed`, `.0/`, `String(value)` cạnh điểm) cho mọi chỗ hiện điểm giáo viên + phụ huynh + báo cáo/PDF xem trước.
2. Test: bảng ca 10→"10", 7.5→"7,5", 0→"0", 0.5→"0,5", 14.5→"14,5", null theo hành vi hiện có; test render ít nhất một màn phụ huynh có "10/10" và không có "10.0".
3. `npm test` + build xanh; chụp lại ảnh liệt kê trên (dùng `/tmp/ux-shots/shoot.py` đổi cổng). Báo cáo `ux-04-score-format.report.md`.
