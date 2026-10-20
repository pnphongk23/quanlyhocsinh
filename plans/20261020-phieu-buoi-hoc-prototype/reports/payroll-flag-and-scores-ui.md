# Ẩn Lương bằng cờ tính năng + bỏ trạng thái Vắng thi ở UI điểm

Trạng thái: xong phần trong vùng file được giao · Cập nhật: 2026-10-20

## 1. Ẩn Lương bằng một cờ tính năng

- Cờ đặt một chỗ: `design/prototype/src/shared/features.ts` — `features.payroll = false`.
- `src/app/TeacherShell.tsx` (`desktopNav`): mục "Lương" (Admin) và "Lương của tôi" (nhân sự) chỉ được thêm khi cờ bật. Lịch dạy (`/lich-day`) không phụ thuộc cờ, vẫn còn.
- `src/features/settings/SettingsPage.tsx`: thẻ "Lương" (Admin) và "Lương của tôi" (nhân sự) bị bỏ khi cờ tắt; "Lịch dạy" vẫn còn.
- `src/app/routes.tsx` (mới): bảng route tách khỏi `router.tsx`. Các route `/luong*` nằm trong một mảng `payrollRoutes` chọn theo cờ:
  - cờ bật: `/luong` → `PayrollPage`, `/luong/:memberId` → `PayrollDetailPage` (giữ nguyên như trước);
  - cờ tắt: `/luong` và `/luong/*` dùng `loader: () => redirect("/lop")` nên mọi đường dẫn `/luong*` (kể cả con) về trang chính trước khi render.
- `src/app/router.tsx`: chỉ còn `createBrowserRouter(routes)` và re-export `routes`.
- Code + test payroll (`features/payroll`, `data/payroll*`, `data/repositories/*payroll*`, `data/repositories/staffTuition*`) **không sửa**, test vẫn chạy.
- Không còn file nào khác chứa link `/luong`: đã dò bằng `srcwalk discover '/luong'` + `discover 'luong,Lương'`; các chỗ còn lại là trong chính `features/payroll` (nút quay lại `/luong` của PayrollDetailPage), bảng route và test.
- Test mới `src/app/payrollFlag.test.tsx`: cờ tắt, `desktopNav` của Admin và của nhân sự không có `/luong`, Cài đặt không có `/luong`/chữ "Lương" nhưng còn "Lịch dạy", và `createMemoryRouter(routes)` với `/luong`, `/luong/member-minh`, `/luong/member-minh/sua` đều kết thúc ở `/lop`.
- Test cũ cập nhật: `src/features/staffing/shellNav.test.ts` (bỏ "Lương"/"Lương của tôi" khỏi danh sách kỳ vọng, thêm assert không có link `/luong`). `render.smoke.test.tsx` không kỳ vọng Lương nên không phải sửa.

## 2. Bỏ trạng thái "Vắng thi" ở UI điểm

Chỉ sửa UI, không sửa `src/data/**`.

- `features/scores/scoreReport.ts`: `StudentScoreRow` chỉ còn `{ test, value }` (null = chưa có điểm); bỏ `state: "scored" | "absent" | "missing"`, bỏ `lastDelta`, giữ `latestDelta` (bài gần nhất theo ngày so với bài có điểm liền trước, null khi bài gần nhất chưa có điểm); `ScoreProgress` chỉ còn `scored`/`missing`; lý do "Cần chú ý" đổi sang chữ của ảnh: `Trung bình 4.3, dưới 5`, `Bài gần nhất giảm 2.5 điểm`, `2 bài chưa có điểm`.
- `features/scores/TestScoresPage.tsx` (ảnh 17): bỏ cột/ô công tắc "Vắng thi"; mỗi em chỉ có ô điểm hoặc "Chưa có điểm"; em vắng buổi kiểm tra cũng chỉ là "Chưa có điểm"; bỏ `absent` khỏi bản nháp (`scoreDrafts.ts`) và khỏi lần lưu điểm.
- `features/class-space/ScoreGridTab.tsx` (bảng điểm web): bỏ nhánh "Vắng thi", ô trống ghi "Chưa có điểm", ghi chú dưới bảng "bài chưa có điểm không tính".
- `features/scores/ScoreReportPage.tsx` (ảnh 22–25): thêm câu quy tắc "Gồm em có: trung bình dưới 5; hoặc bài gần nhất giảm từ 2 điểm trở lên so với bài có điểm trước đó; hoặc từ 2 bài chưa có điểm." dưới tiêu đề "Cần chú ý" và dưới bảng điểm web; mỗi lý do một dòng (đỏ); pill đếm vàng khi có em, xanh khi 0; tiến độ nhập điểm chỉ còn "7 có điểm · 1 chưa có điểm"; bỏ ghi chú dải điểm và meta "N bài" (ảnh không có); bỏ "vắng thi" khỏi cột chênh lệch (null hiện "–" như ảnh).
- `features/scores/StudentScoreReportPage.tsx` (báo cáo một em): biểu đồ chỉ còn "Chưa" cho bài chưa có điểm, danh sách bài hiện pill "Chưa có điểm" (không còn "Vắng thi"); vẫn "Chưa có bài gần nhất để so sánh" khi bài gần nhất chưa có điểm.
- CSS: `scores.module.css` bỏ `.colAbsent`, `.absentBox`, `.toggle*`, `.notice`; `scoreReport.module.css` bỏ `.barAbsent`, thêm `.attentionRule`, `.tableNote`, `.tableColumn`, căn giữa các cột số của bảng.
- Không hiện trung bình lớp hay trung bình từng bài (không đổi so với trước; test render có assert).
- Test: `scoreReport.test.ts` viết lại theo quy tắc mới — có test riêng cho 3 điều kiện "Cần chú ý", test mốc giảm dưới 2 điểm / bài gần nhất chưa có điểm thì không tính, test một em nhiều lý do (thứ tự TB → giảm → chưa có điểm), test "không có bản ghi điểm" và "bản ghi điểm rỗng" cho kết quả như nhau (tức không còn khái niệm Vắng thi), test shape `progress` không còn `absent`. Thêm `scoreReportRender.test.tsx` (mới) kiểm tra chữ trên màn: câu quy tắc, lý do "Bài gần nhất giảm 4.0 điểm", trạng thái "Hiện chưa có học sinh nào cần chú ý.", không còn chuỗi "vắng thi"/"chưa nhập", màn nhập điểm không còn `role="switch"`.

### Quyết định cần lead biết

- **"Bài gần nhất" dùng `latestDelta` cho cả hiển thị và quy tắc "Cần chú ý".** Ảnh 23/25 cho Đặng Quốc Huy "–" ở cột "Bài gần nhất" (em có 2/4 bài, bài gần nhất chưa có điểm) và không có lý do giảm điểm, nên em có bài gần nhất chưa có điểm thì không xét lý do "giảm". Hệ quả: một em có bài có điểm cuối cùng bị giảm ≥ 2 nhưng bài mới nhất chưa có điểm sẽ không vào "Cần chú ý" (trước đây có, dưới chữ "điểm giảm mạnh"). Nếu lead muốn xét cả trường hợp đó thì chỉ cần đổi một điều kiện trong `classScoreReport`.
- **Tách `src/app/routes.tsx` khỏi `router.tsx`.** `router.tsx` tạo `createBrowserRouter` ngay khi import nên không import được trong test (môi trường vitest là node, không có `document`). Bảng route chuyển sang `routes.tsx`, `router.tsx` re-export `routes`. Lính sau thêm route phụ huynh thì thêm ở `routes.tsx` (đã ghi chú trong `router.tsx`).
- **`saveScore` được ép kiểu** trong `TestScoresPage.tsx` (`as Parameters<typeof saveScore>[0]`) vì A đã bỏ `absent` khỏi `Score` trong lúc tôi đang sửa; ép kiểu để file chạy được cả trước và sau thay đổi đó, có ghi chú ngay tại chỗ.

## 3. Kiểm chứng

Trong `design/prototype`:

- `npx vitest run src/features/scores src/features/staffing src/features/settings src/data/payroll` → **9 file, 78 test pass**. Chạy thêm đợt có cờ: `npx vitest run src/features/scores src/features/staffing src/features/settings src/data/payroll src/app` → 10 file, 85 test pass.
- `npx vitest run` (toàn bộ) → 36 file / 333 test pass.
- `npx tsc --noEmit` → **không còn lỗi trong file tôi sửa**. Còn 19 lỗi thuộc file ngoài vùng được giao, do thay đổi `Score`/`Comment` của A đang dở: `src/features/class-space/TestsTab.tsx` (1), `src/features/comments/CommentsPanel.tsx` (8), `src/features/reports/ReportsPage.tsx` (4), `src/features/reports/reportModel.ts` (1), `src/features/reports/reportModel.test.ts` (5). `TestsTab.tsx:67` (`score.absent`) là chỗ cần sửa để hết lỗi nhưng file này không thuộc vùng tôi được sửa (chỉ `class-space/ScoreGridTab.tsx`).
- `npx vite build` **chưa chạy được** vì lý do ngoài vùng: `CommentsPanel.tsx` đang import `saveComment`/`sendComment` không còn tồn tại trong `data/repositories/comments` → rollup lỗi "is not exported". Không phải do thay đổi của tôi.
- Chụp thử bằng Chrome headless với dev server (`npx vite --port 5199`), dữ liệu seed; ảnh lưu ở `reports/shots/`:
  - `nhap-diem-500px.png` ← ảnh 17 · `bao-cao-diem-lop-500px.png` ← ảnh 22/23 · `bao-cao-diem-hoc-sinh-500px.png` ← ảnh 243–246 · `web-bao-cao-diem-lop-1400px.png` ← ảnh 25.
  - `/luong` và `/luong/member-minh` khi mở thẳng đều dừng ở trang "Lớp của tôi" (kiểm bằng `--dump-dom`), Cài đặt chỉ còn "Lịch dạy"/"Học phí", sidebar desktop không còn "Lương".
  - Chrome headless có cửa sổ tối thiểu ~500 px nên ảnh mobile chụp ở 500 px, không phải 390 px như ảnh chuẩn → khoảng đệm ngang rộng hơn ảnh một chút.

### Chỗ còn lệch ảnh

1. **Sidebar web vẫn còn "Cài đặt"** và **không còn "Lương"**: ảnh 25 có "Lương"; đây là chủ ý theo yêu cầu ẩn Lương. "Cài đặt" là mục có sẵn của prototype, không nằm trong yêu cầu này.
2. **Đầu màn nhập điểm**: ảnh 17 có chip chọn lớp "IELTS Foundation" + nút "+ Bài mới" ở một hàng riêng; prototype dùng nút quay lại + tên lớp (eyebrow) rồi "+ Bài mới" bên phải tiêu đề — khác shell sẵn có, không sửa trong lượt này (không thuộc phần Vắng thi).
3. **Dữ liệu khác ảnh** (9 học sinh, 4 bài "Từ vựng/Ngữ pháp/Nghe/Nói", điểm khác) nên số trong ảnh chụp khác ảnh chuẩn; kết cấu/nhãn/trạng thái thì khớp.
4. Ảnh 22/24 không có ghi chú dưới dải điểm và không có meta "N bài" — đã bỏ cho khớp; ảnh 24 (0 em cần chú ý) chỉ kiểm bằng test chữ chứ không chụp.
5. Chưa đối chiếu được bằng mắt trạng thái "Không ai cần chú ý" trên trình duyệt (phải sửa dữ liệu seed); đã có test render khẳng định đúng câu "Hiện chưa có học sinh nào cần chú ý.".

## 4. File đã sửa/thêm

Thêm:
- `design/prototype/src/shared/features.ts`
- `design/prototype/src/app/routes.tsx` (tách từ `router.tsx`)
- `design/prototype/src/app/payrollFlag.test.tsx`
- `design/prototype/src/features/scores/scoreReportRender.test.tsx`
- `plans/20261020-phieu-buoi-hoc-prototype/reports/shots/*.png`

Sửa:
- `design/prototype/src/app/router.tsx`
- `design/prototype/src/app/TeacherShell.tsx`
- `design/prototype/src/features/settings/SettingsPage.tsx`
- `design/prototype/src/features/staffing/shellNav.test.ts`
- `design/prototype/src/features/scores/TestScoresPage.tsx`
- `design/prototype/src/features/scores/scoreDrafts.ts`
- `design/prototype/src/features/scores/scoreDrafts.test.ts`
- `design/prototype/src/features/scores/scoreReport.ts`
- `design/prototype/src/features/scores/scoreReport.test.ts`
- `design/prototype/src/features/scores/ScoreReportPage.tsx`
- `design/prototype/src/features/scores/StudentScoreReportPage.tsx`
- `design/prototype/src/features/scores/scores.module.css`
- `design/prototype/src/features/scores/scoreReport.module.css`
- `design/prototype/src/features/class-space/ScoreGridTab.tsx`

Không sửa: `src/data/**`, `NewTestPage.tsx`, `SessionDetailPage.tsx`, `CommentsPanel.tsx`, `ReportsPage.tsx`, `reportModel.ts`, `render.smoke.test.tsx` (không kỳ vọng Lương). Không commit/push/deploy.

## 5. Bổ sung sau review của lead (2026-10-20)

- `src/features/class-space/TestsTab.tsx` (~dòng 67): bỏ `score.absent`, số em "chưa có điểm" của mỗi bài chỉ tính `score.value !== null`, nên chỉ còn hai trạng thái "có điểm" / "Chưa có điểm". Không sửa file nào khác.
- Kiểm chứng: `npx tsc --noEmit` không còn lỗi ở `TestsTab.tsx`. `npx vitest run src/features/class-space` báo "No test files found" (thư mục này không có test nào, cũng không có test riêng cho `TestsTab`), nên tôi kiểm bằng một test tạm rồi xoá ngay: render `TestsTab` với dữ liệu seed → bài `6a-test-3` hiện "Còn 2 em chưa có điểm", 3 bài còn lại "Đủ điểm"; đặt toàn bộ điểm bài `6a-test-0` thành `null` → "Còn 9 em chưa có điểm" (9 học sinh đang học).
- Chạy lại: `npx vitest run src/features/scores src/features/staffing src/features/settings src/data/payroll src/app` → 10 file / 85 test pass; toàn bộ `npx vitest run` → 36 file / 338 test pass.
- Lỗi `tsc` còn lại lúc này (đều ngoài vùng tôi): `src/data/seed.ts` (1, thiếu `generalComment`/`publishedAt`) và `src/features/reports/ReportsPage.tsx` (9) do đợt đổi kiểu `Report` của Lính khác.
