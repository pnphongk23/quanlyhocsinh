# Báo cáo: Bài kiểm tra — thang điểm riêng, sửa/xoá (lưu trữ), bỏ điểm trung bình

Domain Lead (mission `scores-tests-scale`) · 2026-10-20 · repo `/Users/phamnhuphong/Git/quanlyhocsinh`
Phạm vi làm: `design/prototype/` + `docs/`. **Chưa commit, chưa push, chưa deploy.**

**Status: DONE_WITH_CONCERNS** — mọi acceptance tự chạy lại đều xanh; hai điểm cần General Lead xác nhận về mặt thiết kế được liệt kê ở mục 7.

## 1. Cách chia việc (4 Lính + 1 follow-up)

| Slice | Lính (persona) | Nội dung |
|---|---|---|
| A | Triệu Vân `229fd4d7` | Tầng dữ liệu: `Test.max: number`, `archived`, `createTest`/`updateTest`/`deleteTest`, validate điểm theo max, test dữ liệu |
| B | Hoàng Trung `6f9327d9` | UI bài kiểm tra: ô điểm tối đa, sửa bài, xoá/lưu trữ, bảng điểm bỏ cột TB |
| C | Mã Siêu `9e34b86e` | Bỏ điểm trung bình ở báo cáo điểm, báo cáo tháng, app phụ huynh; quy tắc "Cần chú ý" mới; chênh lệch theo % thang |
| D | Trương Phi `379763b7` | `docs/spec.md`, `docs/architecture.md` |
| C (follow-up) | Mã Siêu `9e34b86e` | Lọc bài lưu trữ khỏi báo cáo/phụ huynh (lỗi tôi tìm thấy khi review) |

Slice A do Lead trước đã spawn vẫn đang chạy khi tôi nhận mission; tôi **không tạo trùng**, chờ nó xong rồi kiểm chứng. Không có hai worker nào sửa cùng file. Tôi tự tay: dọn 3 helper chết trong `roles/guardian/guardianFormat.ts`, chạy lại toàn bộ acceptance, xem thử bản chạy thật.

## 2. Thay đổi theo file

**Tầng dữ liệu (`design/prototype/src/data/`)**
- `types.ts`: `Test.max` từ literal `10` → `number`; thêm `archived?: boolean` (thiếu trường = chưa lưu trữ, nên localStorage cũ vẫn hợp lệ).
- `repositories/tests.ts`: `DEFAULT_TEST_MAX=15`, `TEST_MAX_MIN/MAX=1/1000`, `validateTestMax` (lỗi "Thang điểm phải là số nguyên từ 1 đến 1000."), `createTest` nhận `max?`, `updateTest(id,{name?,date?,max?})` chặn hạ max dưới điểm cao nhất đã nhập (kể cả điểm 0), `deleteTest(id) → "deleted" | "archived"`, `listTests` bỏ bài lưu trữ.
- `repositories/scores.ts`: validate `0..test.max`, chặn nhập điểm vào bài đã lưu trữ.
- `logic.ts`, `repositories/students.ts`, `shared/format/index.ts`: xoá chết `averageScore`, `studentAverage` và export tương ứng.
- `seed.ts`: giữ `max: 10` (không migrate), chỉ thêm `archived: false`.
- `reportModel.ts`: bỏ `average`, lọc `test.archived !== true` (nên bài lưu trữ không vào `tests`, `gradedTestCount`, `missing`).
- `repositories/guardian.ts`: bỏ `average`, `previousMonthAverage`, `averageChange`, helper `previousMonth`; `studentReportData` + `recentScores` lọc bài lưu trữ.

**UI bài kiểm tra (`src/features/`)**
- `scores/NewTestPage.tsx`: ô "Điểm tối đa" mặc định 15 (1..1000), truyền `max` vào `createTest`, hint mới (bỏ "thang 10"/"trung bình cộng").
- `scores/TestScoresPage.tsx`: bỏ `MAX_SCORE=10`, dùng `test.max`; export `isInvalidDraft(draft, max)`; thêm "Sửa bài" (`EditTestModal`: tên/ngày/điểm tối đa, lỗi repo hiện nguyên văn) và "Xoá bài" (`ConfirmDialog` nói rõ lưu trữ vs xoá hẳn, nút tương ứng + "Giữ bài"); xoá/lưu trữ xong quay về danh sách.
- `class-space/TestsTab.tsx`: "Thang {test.max} điểm".
- `class-space/ScoreGridTab.tsx`: bỏ hẳn cột "Trung bình" + import `averageScore`; header mỗi bài "… · thang {test.max}"; chú thích bỏ "0 đến 10" và câu trung bình.
- `classes/NewClassPage.tsx`: "Điểm theo thang 10 cho mọi bài kiểm tra" → "Mỗi bài kiểm tra có thang điểm riêng, mặc định 15; sửa được khi tạo bài."
- `scores/scores.module.css`: bỏ `.averageCell/.averageEmpty`, thêm `.testActions` (wrap, đủ chỗ 390px); `scores/scoreReport.module.css`: bỏ style khối phân bố/ô TB.

**Báo cáo điểm + báo cáo tháng + phụ huynh**
- `scores/scoreReport.ts`: bỏ `average`, `trend`, `distribution`/`ScoreDistributionBand`/`DISTRIBUTION_LABELS`/`distributionLabel`; thêm `scorePercent`, `formatSignedPercent` ("+13%", "−7%" dùng U+2212, "0%"); `latestDelta` theo % thang; `ATTENTION_DROP_PERCENT=20`; lọc bài lưu trữ.
- `scores/ScoreReportPage.tsx`: bỏ `DistributionPanel`, cột TB (desktop + mobile), `averageCount`; rule "Cần chú ý" mới; "Bài gần nhất" dạng %.
- `scores/StudentScoreReportPage.tsx`: bỏ ô "Điểm trung bình"; biểu đồ chuẩn hoá 0–100% theo `test.max`; điểm từng bài dạng `value/test.max`.
- `reports/ReportsPage.tsx`, `reports/ReportPreview.tsx`: bỏ ô trung bình; ô thứ hai thành "Bài kiểm tra x/y bài · đã có điểm"; điểm từng bài `value/test.max`; footnote "Bài chưa có điểm cần chấm trước khi phát hành."
- `roles/guardian/GuardianOverviewPage.tsx`, `GuardianScoresPage.tsx`, `GuardianReportPage.tsx`, `guardianRead.ts`: bỏ trung bình/`averageChange`; Điểm số + Báo cáo tháng liệt kê `value/test.max`; lọc bài lưu trữ.
- `roles/guardian/guardianFormat.ts` (tôi dọn): xoá helper chết `monthName`, `previousMonthOf`, `scoreOverTen` (hard-code "/10").

**Docs**
- `docs/spec.md`: dòng "Cập nhật" thêm mốc 2026-10-20 đã chốt; mục 3 bỏ quy tắc 3.2 và đánh số lại (học sinh nghỉ → 3.2, học phí → 3.3; tham chiếu "quy tắc 3.4" đã đổi thành "3.3"); mục 4 Điểm thêm 3 bullet (điểm tối đa theo bài, sửa bài, xoá/lưu trữ) kèm "(đã chốt 2026-10-20)"; bỏ mọi chỗ nhắc trung bình ở "Nội dung báo cáo", "Báo cáo điểm", bảng 5.1/5.2/5.3; mục 8 "Bản đầu" đổi sang thang riêng mặc định 15 + sửa/xoá (lưu trữ); bỏ "thang điểm tuỳ chỉnh" ở "Chưa nên làm".
- `docs/architecture.md` mục 4 bullet "Điểm": `tests.max` (1..1000, mặc định 15), `tests.archived`, `scores` trong `0..tests.max`, quy tắc xoá/lưu trữ.

## 3. Kiểm chứng tôi tự chạy lại (không tin worker)

```
cd design/prototype
npm run typecheck   → sạch
npm test            → 49 file / 479 test pass
npm run build       → OK (dist, index 374 kB / 118.8 kB gzip)
```

- Test mới: 27 test trong `data/repositories/tests.test.ts`, `data/repositories/scores.test.ts`, `features/scores/testScoresPage.test.tsx`, `features/class-space/scoreGridTab.test.tsx`; cập nhật `logic.test.ts`, `classScopeRegression.test.ts`, `scoreReport.test.ts`, `scoreReportRender.test.tsx`, `reportModel.test.ts`, `reportsPreview.test.tsx`, `guardian.test.ts`, `guardianRender.test.tsx`.
- Phủ đúng acceptance: createTest mặc định 15 + nhận max tuỳ chỉnh + từ chối 0/1001/1.5/NaN; updateTest đổi tên/ngày/max và chặn hạ max dưới điểm đã nhập (bỏ qua ô "Chưa có điểm"); deleteTest xoá hẳn khi chưa có điểm, lưu trữ khi có điểm (kể cả 0) và giữ dữ liệu; bài lưu trữ biến mất khỏi `listTests`, bảng điểm, `scoreReport` (rows/progress/attention), `childScoresMonth`, `getChildOverview`, báo cáo tháng (kể cả "Thiếu điểm"); nhập điểm vượt max bị chặn; "Cần chú ý" đúng 2 quy tắc mới; chênh lệch "+10%"/"−40%" và chart 0–100%.
- Quét tĩnh: `MAX_SCORE` = 0 chỗ; `averageScore`/`studentAverage`/`averageCount`/`average:` = 0 chỗ; `averageChange` chỉ còn 1 chỗ trong test khẳng định KHÔNG còn trường đó. Chữ "trung bình" còn lại chỉ ở comment "không có trung bình (quy tắc 3.1)" và trong test khẳng định không còn — không có text UI. Không còn "/10", "thang 10", "0 đến 10" ngoài seed (seed giữ max 10 theo yêu cầu) và trong test.

## 4. Xem thử bản chạy thật (390px)

Cách làm: `npm run build` + `npx vite preview --port 4199`, rồi điều khiển Chrome headless qua CDP với `Emulation.setDeviceMetricsOverride 390×844` (Paseo browser mở được lúc đầu nhưng host treo giữa chừng, xem mục 7). Đã tắt preview server và Chrome sau khi xong.

Ảnh trong `plans/20261020-phieu-buoi-hoc-prototype/reports/shots/`:

- `01-bang-diem.png` — bảng điểm lớp: **không còn cột "Trung bình"**, header từng bài "30/9 · thang 10", chú thích "Nhập 7,5 hoặc 7.5." (không còn "0 đến 10"/trung bình); bảng cuộn ngang trong card, không tràn trang (`scrollWidth = 390`).
- `06-hop-xac-nhan-luu-tru.png` — hộp xác nhận trên bài **đã có điểm**: "Lưu trữ bài kiểm tra?" + "Bài đã có điểm nên sẽ được lưu trữ; điểm đã nhập vẫn giữ, bài ẩn khỏi bảng điểm và báo cáo." + nút "Lưu trữ bài"/"Giữ bài"; hai nút "Sửa bài"/"Xoá bài" nằm gọn một hàng dưới thẻ bài.
- Lưu trữ thật: xác nhận → về `/lop/6a/bai-kiem-tra`, bài "Từ vựng" biến mất khỏi danh sách; `07-bang-diem-sau-luu-tru.png` chỉ còn cột Ngữ pháp/Nghe/Nói; `/lop/6a/bao-cao-diem` không còn nhắc bài đó.
- Bài **chưa có điểm**: hộp xác nhận "Xoá bài kiểm tra?" + "Bài chưa có điểm nào nên sẽ bị xoá hẳn." (kiểm ở phiên Paseo browser trước đó).
- Tạo bài mới: ô "Điểm tối đa" mặc định `15`, `min=1 max=1000`; tạo xong thẻ bài hiện "Ngày 20 tháng 10 · **Thang 15 điểm**"; danh sách bài hiện "Thang 15 điểm" cho bài mới, "Thang 10 điểm" cho bài seed.
- `02-bao-cao-diem-lop.png` — báo cáo điểm lớp: không còn khối phân bố, "Cần chú ý" ghi "bài gần nhất giảm từ 20% thang trở lên…; hoặc từ 2 bài chưa có điểm", lý do "Bài gần nhất giảm 40% so với bài trước", hàng học sinh "4/4 bài có điểm" (không có TB).
- `03-bao-cao-diem-hoc-sinh.png` — "Bài gần nhất +10%", biểu đồ 60%→90% (0–100% thang), mỗi bài "9.0/10", không có ô Điểm trung bình.
- `04-bao-cao-thang.png` — báo cáo tháng GV: ô "Bài kiểm tra 3/3 bài · đã có điểm", không có trung bình.
- `11-xem-truoc-bao-cao-thang.png` — bản xem trước: "Chuyên cần", "3/3 bài", khối "Điểm từng bài" (7.0/10, 8.0/10, 9.0/10), không có trung bình.
- `09-ph-diem-so.png` — app phụ huynh (vai trò "Phụ huynh" của Cô Lan, chọn ở `/chon-vai-tro`): "Điểm từng bài · 3 bài có điểm", "10.0/10", "9.0/10", "8.0/10", không còn thẻ "Điểm trung bình".
- `10-ph-bao-cao.png` — phụ huynh báo cáo tháng: "3/3 bài đã có điểm" (không TB) + khối "Điểm từng bài" mới.
- Mọi trang kiểm ở 390px đều `scrollWidth === 390` (không tràn ngang) và `document.body.innerText` không khớp `/trung bình|\bTB\b/i`.

## 5. Quyết định đã áp (do General Lead đặt, làm đúng)

- "Cần chú ý" còn 2 lý do: (a) từ 2 bài chưa có điểm; (b) bài gần nhất giảm ≥ 20% thang so với bài có điểm trước đó. Bỏ lý do "TB dưới 5", bỏ hẳn khối phân bố dải trung bình; các khối khác giữ.
- `latestDelta` = `round((score/max − prevScore/prevMax) × 100)`, hiển thị "+13%"/"−7%" (dấu trừ U+2212), "0%" khi không đổi; ngưỡng chú ý ≤ −20; biểu đồ xu hướng chuẩn hoá 0–100% theo `test.max`.
- Báo cáo tháng/phụ huynh vẫn liệt kê điểm từng bài dạng `value/max`, chỉ bỏ ô trung bình (`GuardianReportPage` được thêm khối "Điểm từng bài" để thoả yêu cầu này).
- Điểm tối đa: số nguyên 1..1000, mặc định 15, sửa được ở form tạo bài và form sửa bài; seed giữ 10, không migrate.
- Xoá bài: quyết định "có điểm hay chưa" dựa trên **có ít nhất một `Score.value !== null`** (điểm 0 vẫn tính là có điểm → lưu trữ).

## 6. Quyết định của tôi trong phạm vi được giao

- Vị trí sửa/xoá: đặt ở màn chi tiết bài (`TestScoresPage`), ngay dưới thẻ bài; `TestsTab` chỉ hiện thang điểm (tránh 2 nơi có form sửa và tránh chen chúc header ở 390px).
- Hộp xác nhận dùng `ConfirmDialog` sẵn có; nút hành động đổi nhãn theo kết quả ("Lưu trữ bài" / "Xoá bài"), luôn có "Giữ bài" để đóng.
- Sau khi xoá/lưu trữ: dọn nháp của bài rồi mới điều hướng, để hộp "còn thay đổi chưa lưu" không chặn việc quay về danh sách.
- Bỏ chữ "0 đến 10" ở chú thích bảng điểm; giữ mẹo "Nhập 7,5 hoặc 7.5."

## 7. Chỗ lệch / rủi ro / cần General Lead xác nhận

1. **Ô thứ hai ở báo cáo tháng** (ReportsPage/ReportPreview/GuardianReportPage) trước là "Điểm trung bình"; nay thay bằng "Bài kiểm tra x/y bài · đã có điểm" thay vì bỏ trống nửa lưới 2 cột. Hợp lý về bố cục nhưng là lựa chọn thiết kế — cần duyệt.
2. **`GuardianReportPage` được thêm khối "Điểm từng bài"** (trước đây màn này không liệt kê điểm). Đây là cách duy nhất để thoả "báo cáo tháng/phụ huynh vẫn liệt kê điểm từng bài". Nếu muốn giữ nguyên màn phụ huynh thì bỏ khối này.
3. **Nhãn biểu đồ xu hướng đổi từ điểm thô sang %** (60%/70%/80%/90%) vì trục đã chuẩn hoá theo `test.max`; nếu design muốn hiện điểm thô thì phải quyết lại cách so sánh giữa các bài khác thang.
4. **Paseo browser host treo giữa phiên** (screenshot không bao giờ paint, `resize` không đổi `innerWidth`, sau đó mọi lệnh timeout). Tôi chuyển sang Chrome headless + CDP và đã kiểm đủ 390px như mục 4. PinchTab CLI có trong máy nhưng thiếu binary (`~/.pinchtab/bin/pinchtab-darwin-arm64`) nên không dùng.
5. Không có thông báo "đã lưu trữ" sau khi xoá (thiết kế chưa quy định) — hiện chỉ quay về danh sách; nếu cần toast thì phải bổ sung design.
6. Ở 390px, bảng điểm rộng hơn khung và **cuộn ngang trong card** (hành vi có sẵn từ trước, không phải thay đổi của mission này).
7. `docs/spec.md` mục 10 vẫn còn dòng "Bỏ 'TB lớp' khỏi màn Điểm số phụ huynh" — giữ nguyên theo yêu cầu "không đụng phần ngoài phạm vi"; đây là việc đã xong nên có thể dọn ở lần sửa docs sau.

## 8. Việc General Lead cần làm

- Review + commit (tôi không commit/push/deploy). File thay đổi: 49 mục trong `git status` (33 modified, 4 test mới, 2 docs).
- Nếu chốt khác ở mục 7.1/7.2/7.3 thì nhắn lại, tôi sẽ điều phối sửa.
