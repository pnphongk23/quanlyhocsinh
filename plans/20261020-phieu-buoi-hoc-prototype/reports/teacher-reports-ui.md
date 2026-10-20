# Lính D2 — Báo cáo tháng phía giáo viên (duyệt & phát hành, xem trước, bản web)

Cập nhật: 2026-10-20 · Phạm vi sửa: `design/prototype/src/features/reports/*`
(`ReportsPage.tsx`, `ReportsPage.module.css`, mới `ReviewStatus`/`ReportPreview`/test). Không sửa
`reportModel.ts`, `src/data/**`, `src/app/**`, `src/shared/**`, các feature khác, `src/roles`.

## 1. Đã làm

### 1.1 Duyệt & phát hành báo cáo (ảnh 13 mobile, ảnh 26 web)

- Bỏ khối "Nhận xét đã gửi" và nút "Nhận xét"/"Xem trước bản in" cũ. Không còn chuỗi `Vắng thi`
  (điểm chỉ có "Chưa có điểm", không tính vào trung bình, không hiện trung bình lớp).
- Dòng tóm tắt theo ảnh 13: `<n>/<tổng> sẵn sàng · <n> thiếu dữ liệu · <n> đã phát hành`
  (`reviewSummary`). Bản web theo ảnh 26: `Sẵn sàng n/tổng học sinh` + pill `n thiếu dữ liệu`.
- Mỗi dòng học sinh: tên, dòng lý do (`missing` nối bằng ` · `, ví dụ "Thiếu điểm Nói · Thiếu nhận
  xét chung"), pill trạng thái `reportSlot`:
  - còn thiếu dữ liệu → `Thiếu dữ liệu` (warning),
  - `ready` + `Report.needsRepublish` → `Cần phát hành lại` (primary, ghi chú
    "Điểm có cập nhật, cần phát hành lại"),
  - `ready` + `status: published` → `Đã phát hành · dd/MM` (từ `publishedAt`),
  - `ready` + có bản ghi nháp → `Nháp`, chưa có bản ghi → `Sẵn sàng`.
- Ô "Nhận xét chung của tháng": `textarea` (điền sẵn `Report.generalComment`), lưu qua
  `saveReportComment` (tạo bản ghi bằng `saveReport` nếu chưa có) khi rời ô, lưu được khi mất mạng.
  Nút "Dùng gợi ý làm bản nháp" đổ `MonthlyStudentReport.suggestion` (chính là
  `buildStarSuggestion`) vào ô và lưu ngay; ẩn khi tháng chưa có phiếu đã gửi (`suggestion === null`).
  Gợi ý hiện dưới dạng placeholder của ô nhận xét, đúng câu trong HTML gốc:
  "Gợi ý theo số buổi 3/2/1 sao của tháng: Tháng này con có … buổi 3 sao, … buổi 2 sao, … buổi 1 sao."
- Phát hành: nút hàng loạt `Phát hành <n> báo cáo` (`publishReady` cũ viết lại thành
  `publishAll`, chỉ phát hành em `publishable`), và nút phát hành/phát hành lại của riêng em đang
  chọn trong bản xem trước. Dùng `publishReport` nên vẫn cần mạng; mất mạng hiện
  "Thao tác này cần có mạng." (lỗi thao tác, không gắn nhãn "Lỗi lưu").
- Quyền: `access.can("comments_reports", "read")` mới vào màn, `…, "write"` mới thấy ô nhận xét,
  nút gợi ý và nút phát hành (role chỉ đọc vẫn xem được danh sách + bản xem trước).

### 1.2 Báo cáo tháng · Xem trước (ảnh 07)

`ReportPreview.tsx`, mỗi nhóm là một thẻ trắng như ảnh:

- Tiêu đề `Báo cáo tháng 10`, phụ đề `Xem trước · <tên em> · <tên lớp>`, nút quay lại.
- Chuyên cần (`n/n buổi` + "1 muộn · 1 có phép · n vắng", chỉ nêu mục khác 0) và Điểm trung bình
  (`7.2/10` dấu chấm, "n bài kiểm tra"; chưa có điểm nào → "Chưa có điểm").
- `Nhận xét theo sao` + `n buổi có phiếu` + "Tính trên các phiếu đã gửi." + 3 dòng sao
  (3/2/1) với thanh tỉ lệ theo số buổi lớn nhất và số buổi mỗi mức (ảnh 07).
- `Bài tập về nhà` + "Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành" + bảng `Phần | Tốt |
  Hoàn thành | Chưa` theo từng loại phần (`homework` của model, đã lọc theo phiếu đã gửi/đã chấm),
  chú thích "Chỉ tính kết quả đã gửi, không tính phần Chưa chấm. Không quy ra điểm."
- `Điểm từng bài` (tên bài + ngày + điểm/"Chưa có điểm") và ghi chú "Chưa có điểm không tính vào
  trung bình."; `Nhận xét chung` (nội dung đang sửa, cập nhật ngay trong bản xem trước).
- Nút `Phát hành` / `Phát hành lại` (khoá khi còn thiếu dữ liệu) + `In báo cáo` (dùng CSS `@media
  print` cũ, đã chuyển sang `.preview`).

### 1.3 Bố cục theo thiết bị

- Mobile (ảnh 13): ô `Chọn tháng` (select tiếng Việt "Tháng 10, 2026"), dòng tóm tắt, mỗi em một thẻ;
  chạm vào em mở rộng ngay trong thẻ (chuyên cần/trung bình, ô nhận xét chung, gợi ý, `Xem trước`),
  cuối danh sách là nút `Phát hành <n> báo cáo` + ghi chú "Phụ huynh chỉ thấy báo cáo sau khi bạn
  phát hành." Bấm `Xem trước` thay cả màn bằng bản xem trước (ảnh 07).
- Desktop (ảnh 26, `useIsDesktop`): `PageHeader` (eyebrow tên lớp, tiêu đề "Báo cáo", chọn tháng +
  chọn lớp) và hai cột: danh sách (một thẻ trắng, dòng có viền ngăn) và panel chi tiết
  `<tên em> · Tháng 10` gồm chuyên cần/trung bình, ô nhận xét chung, `Xem trước PDF` +
  `Phát hành <n> báo cáo`, ghi chú. Bản xem trước mở bên dưới hai cột.

## 2. Kiểm chứng

Trong `design/prototype`:

- `npx vitest run src/features/reports` → **3 file, 24 test pass** (0 fail), gồm:
  - `reportModel.test.ts` (giữ nguyên, 0 sửa),
  - `reviewStatus.test.ts` (mới, 5 test: nhãn/tone/detail từng trạng thái, đếm tổng hợp, nhãn tháng),
  - `reportsPreview.test.tsx` (mới, 8 test render tĩnh: khối sao + `n buổi có phiếu` + "Tính trên
    các phiếu đã gửi.", bảng BTVN + chú thích "không quy ra điểm", `Chưa có điểm`, `Nhận xét chung`,
    gợi ý `buildStarSuggestion` + `Dùng gợi ý làm bản nháp`, không còn nút `Nhận xét`, không có
    `Vắng thi`/`Trung bình lớp`, role chỉ đọc không thấy nút sửa/phát hành, role không có nhóm quyền
    bị chặn, `saveReportComment` làm em đó hết thiếu dữ liệu, `publishReport` ghi `publishedAt` và
    render lại nhãn "Đã phát hành · dd/MM").
- `npx vitest run` (toàn bộ) → **45 file, 440 test pass**.
- `npx tsc --noEmit` → **0 lỗi** (toàn dự án, không chỉ file đã sửa).
- Dev server `npx vite --port 5194`, route `/lop/6a/bao-cao` (seed mặc định, không cần đặt lại):
  chụp và so ảnh **07** (390px, bản xem trước), **13** (390px, danh sách + thẻ mở rộng),
  **26** (1440px, hai cột) bằng Playwright/Chrome. Không có lỗi console/warning.
- Luồng đã bấm thử: chọn em có phiếu → `Dùng gợi ý làm bản nháp` (điền + lưu, hiện "Đã lưu nhận xét
  chung."), nhập nhận xét rồi rời ô (dòng tóm tắt 1/10 → 2/10, nút `Phát hành 1 báo cáo` bật), bấm
  phát hành (hiện "Đã phát hành 1 báo cáo.", dòng đổi thành `Đã phát hành · 20/10`), mất mạng thì
  lưu nhận xét vẫn được còn phát hành báo "Thao tác này cần có mạng." In thử `@media print` chỉ còn
  bản báo cáo, không tràn ngang.
- Không có `console.log`/log SĐT/nội dung nhận xét trong các file đã sửa.

## 3. Chỗ còn lệch ảnh (và lý do)

1. **Kỳ "3 tháng gần nhất" chưa làm.** Ảnh 13/26 có segmented `Tháng 10 | 3 tháng gần nhất`, nhưng
   `Report.month` chỉ nhận `YYYY-MM` (`saveReport` kiểm regex) và `reportModel` chỉ dựng báo cáo một
   tháng, nên không thể lưu/phát hành báo cáo 3 tháng bằng API hiện có. Màn dùng ô `Chọn tháng`
   (select tiếng Việt) thay segmented. **Cần lead chốt**: có mở rộng dữ liệu cho kỳ 3 tháng không,
   hay bỏ hẳn kỳ này ở bản đầu?
2. **Số liệu mẫu khác ảnh** (không phải lỗi UI): seed chỉ điền `generalComment` cho
   `6a-student-1` nên màn duyệt hiện `1/10 sẵn sàng · 9 thiếu dữ liệu · 1 đã phát hành`, ảnh 13 là
   `7/10 · 3 · 1`; tương tự số buổi/điểm là số thật của seed (3/4 buổi, 9.0/10) chứ không phải
   8/9 buổi, 7.2/10. Muốn khớp ảnh thì phải sửa `src/data/seed.ts` (ngoài phạm vi của tôi).
3. **Ảnh 07 không có danh sách điểm từng bài và nhận xét chung** (chỉ có chuyên cần, sao, BTVN).
   Spec mục 4 liệt kê "điểm từng bài, trung bình, … nhận xét chung" là nội dung báo cáo và yêu cầu
   của lead nêu rõ hai phần này, nên tôi giữ lại (spec thắng ảnh).
4. **Lý do "cần phát hành lại"**: ảnh 13 ghi tên bài ("Điểm Unit 5 vừa cập nhật"). Tầng dữ liệu chỉ
   trả cờ `Report.needsRepublish`, không cho biết bài nào vừa sửa, nên UI ghi đúng câu của spec:
   "Điểm có cập nhật, cần phát hành lại".
5. **Nút "Xem trước" trên mobile** (trong thẻ đang mở) không có trong ảnh 13 — thêm để vào được màn
   ảnh 07; desktop dùng nhãn `Xem trước PDF` như ảnh 26 nhưng chỉ mở bản xem trước trên màn hình
   (chưa sinh tệp PDF — PDF là việc của giai đoạn sau theo architecture) và có thêm nút `In báo cáo`.
6. **Chi tiết nhỏ khác ảnh**: ô chọn lớp đặt ở góc phải header desktop (ảnh 26 đặt trong sidebar);
   pill "Đã phát hành · dd/MM" dùng ngày thật của seed (12/10) thay vì chữ mẫu; nội dung ô nhận xét
   lưu khi rời ô (ảnh không có nút Lưu) nên không có nút lưu riêng; khi tháng chưa có phiếu đã gửi
   thì ô gợi ý/`Dùng gợi ý làm bản nháp` ẩn (reportModel trả `suggestion: null`).

## 4. Ghi chú kỹ thuật

- File mới: `reviewStatus.ts` (thuần, không đụng store: `reportSlot`, `reviewSummary`,
  `publishAllLabel`, nhãn tháng), `ReportPreview.tsx` (bản xem trước dùng chung mobile/desktop),
  `reviewStatus.test.ts`, `reportsPreview.test.tsx`.
- `formatScoreDot` lấy từ `features/scores/scoreReport` (đọc, không sửa) để điểm hiện dấu chấm như
  ảnh; ngày phát hành format tại chỗ vì `formatDayMonth` của `shared/format` chỉ nhận `YYYY-MM-DD`.
- `reportModel.ts` giữ nguyên; không cần thêm API dữ liệu nào ngoài `saveReport`,
  `saveReportComment`, `publishReport` đã có.
