# Báo cáo làm lại giao diện prototype giáo viên (redesign-brief.md)

Người thực hiện: Pi (worker chính — bước 1–7, 10–12) · Ngày: 2026-10-17
Phạm vi ghi: `design/prototype/` và tệp báo cáo này. Không git commit, không sửa `package.json`, `docs/`, `design/export/`, `plans/` (ngoài tệp này).
Bước 8 (Học sinh, Báo cáo) do worker D làm — chi tiết ở `reports/redesign-d.md`. Bước 9 (Lịch, Cài đặt) do worker E làm — chi tiết ở `reports/redesign-e.md`. Báo cáo này gộp cả ba, phần của D/E ghi rõ người làm.

## 1. Tóm tắt

Đã thay toàn bộ lớp trình bày của prototype giáo viên bằng một bộ token duy nhất (`tokens.css`), font Plus Jakarta Sans, card không viền bo 16px, chip thống kê bo 10px, pill trạng thái bo 999px, nút chính nền `#2F5BEA` (chữ trên nền xanh nhạt dùng `#1E43B8`), và khung desktop có nền canvas `#EAECF1` bao quanh khung app bo 16px với sidebar trắng 248px. Điều hướng đổi thành **3 mục chính: Lớp, Lịch, Cài đặt** (thanh tab dưới ở mobile, sidebar ở desktop); mỗi lớp là một không gian riêng có 5 tab con **Buổi học, Bài kiểm tra, Điểm, Học sinh, Báo cáo**, còn điểm danh và nhận xét nằm trong chi tiết buổi học (hai panel chuyển bằng segmented, giữ nguyên bản nháp). Điểm danh, nhập điểm, nhận xét, báo cáo được tách thành các panel/trang nhận `classId`/`sessionId` qua props, không viết lại logic nghiệp vụ; `ScoresPage.tsx` cũ được tách thành `TestScoresPage` (nhập điểm một bài) và `ScoreGridTab` (bảng điểm cả lớp, chỉ đọc). Đã bổ sung 3 hàm dữ liệu dùng chung (`listPlannedSessions`, `sessionNumber`, `classAttendanceRate`) kèm test. Bước 8–9 do worker D và E hoàn thành song song.

## 2. Kết quả lệnh

### `npm run typecheck`
```text
> quan-ly-hoc-sinh@0.1.0 typecheck
> tsc --noEmit

(không có lỗi)
```

### `npm run build`
```text
> quan-ly-hoc-sinh@0.1.0 build
> tsc --noEmit && vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 115 modules transformed.
dist/index.html                               1.01 kB │ gzip:   0.51 kB
dist/assets/ScoreGridTab-*.js                 2.09 kB │ gzip:   1.00 kB
dist/assets/TestScoresPage-*.js               4.46 kB │ gzip:   2.13 kB
dist/assets/SessionDetailPage-*.js           12.45 kB │ gzip:   4.78 kB
dist/assets/index-EqlL4Ra5.js               332.44 kB │ gzip: 107.29 kB
✓ built in 682ms
```
(Các chunk trang tải lười nằm trong `dist/assets/`; chunk chính 107,29 kB gzip, dưới ngân sách 200 kB ở architecture.md mục 6.)

### `npm test`
```text
 RUN  v4.1.12 /Users/phamnhuphong/Git/quanlyhocsinh/design/prototype

 Test Files  8 passed (8)
      Tests  30 passed (30)
   Duration  212ms
```
25 test cũ vẫn qua nguyên; thêm 3 test mới ở `src/data/repositories/repositories.test.ts` (bước 3) và 2 test của worker E (`scheduleModel.test.ts`). Không sửa test cũ để cho qua.

### A2 — không còn mã màu cứng ngoài `tokens.css`
```text
$ grep -rnE "#[0-9a-fA-F]{3,8}([^0-9a-zA-Z-]|$)" src --include='*.css' --include='*.tsx' | grep -v "src/shared/styles/tokens.css"
(không có dòng nào)
```
Kiểm thêm: `grep -rn "console\." src` → không có dòng nào (bất biến 11).

## 3. File thay đổi

Tất cả đường dẫn dưới `design/prototype/`.

**Sửa:** `index.html`; `src/shared/styles/tokens.css` (thay toàn bộ theo mục 2.5), `src/shared/styles/reset.css`; `src/shared/ui/{ui.module.css,Button,Card,Chip,Field,EmptyState,index}.tsx|css`; `src/shared/SaveStatus/{index.tsx,SaveStatus.module.css}`; `src/shared/format/index.ts`; `src/app/{TeacherShell.tsx,shell.module.css,router.tsx}`; `src/data/repositories/{sessions.ts,students.ts,repositories.test.ts}`; `src/features/auth/LoginPage.tsx`; `src/features/classes/{ClassListPage.tsx,classes.module.css,NewClassPage.tsx,classesForm.module.css}`; `src/features/scores/NewTestPage.tsx`.

**Tạo:** `src/shared/ui/{LinkButton,Pill,Segmented,PageHeader,Icon}.tsx`, `src/shared/ui/buttonClass.ts` (hàm ghép class dùng chung cho `Button`/`LinkButton`), `src/shared/hooks/useOnline.ts`; `src/app/RedirectTo.tsx`; `src/features/auth/auth.module.css`; `src/features/classes/{WeekdayPicker.tsx,EditClassModal.tsx}`; `src/features/class-space/{ClassSpaceLayout.tsx,classSpace.module.css,SessionsTab.tsx,SessionDetailPage.tsx,TestsTab.tsx,ScoreGridTab.tsx}`; `src/features/scores/{TestScoresPage.tsx,scores.module.css}`.

**Đổi tên rồi sửa:** `src/features/attendance/AttendancePage.tsx` → `AttendancePanel.tsx`, `AttendancePage.module.css` → `AttendancePanel.module.css`; `src/features/comments/CommentsPage.tsx` → `CommentsPanel.tsx`, `CommentsPage.module.css` → `CommentsPanel.module.css`.
*Lưu ý:* dùng `mv` chứ không `git mv` được, vì `design/prototype/**` chưa được git theo dõi (`git ls-files design/prototype` = 0 tệp) nên không có lịch sử để giữ. Đây là khác biệt so với brief mục 9.

**Xoá:** `src/features/scores/ScoresPage.tsx`, `src/features/scores/ScoresPage.module.css` (nội dung chuyển sang `TestScoresPage`, `ScoreGridTab`, `scores.module.css`); `src/app/StubPage.tsx` (không còn route dùng); `src/shared/ui/Input.tsx` (file re-export 1 dòng đã chết từ trước, không tệp nào import — dọn theo bước 10).

**Không cần sửa mã:** `src/shared/ui/Modal.tsx` và `Sheet.tsx` — brief liệt kê là "Sửa" nhưng chỉ cần đổi kiểu, mà `ui.module.css` đã lo hết (bỏ viền, bo 16px, `::backdrop` dùng `--color-scrim`, nút Đóng đã là `variant="secondary"`).

**Ngoài phần của tôi (worker D, E):** `src/features/students/**`, `src/features/reports/**` (D); `src/features/schedule/**`, `src/features/settings/**` (E). Tôi không sửa các thư mục này.

**Giữ nguyên theo brief:** `src/data/{types,store,outbox,seed,logic}.ts`, `src/data/repositories/*` ngoài 3 hàm thêm ở mục 3.5 (`listPlannedSessions`/`sessionNumber` ở `sessions.ts`, `classAttendanceRate` ở `students.ts`), `src/features/scores/scoreDrafts.ts` (+ test), `src/features/attendance/sessionRoster.ts` (+ test), `src/features/reports/reportModel.ts` (+ test), `src/features/classes/classes.test.ts`, `public/`. Không sửa `package.json`.

## 4. Bảng đối chiếu thiết kế

| Màn | Người làm | Kết quả | Lệch và lý do |
|---|---|---|---|
| Đăng nhập `/dang-nhap` | Pi | Khớp (kiểu của `Login.dc.html`, bỏ nội dung phụ huynh) | Theo brief 4.1: chữ "Lớp của cô Lan" thay vì "Lớp tiếng Anh cô Lan" của design; dùng **Email** theo G9; bỏ "Quên mật khẩu?", "Có mã mời từ cô". Logo 56px, ô nhập 54px, nút 54px, mắt 44×44 đều đúng design |
| Lớp `/lop` | Pi | Khớp (mobile theo `ClassList.dc.html`, desktop theo `WebClasses.dc.html`) | Bỏ chip "TB" và "18:30 – 20:00 · Buổi 18/24" → chỉ giờ bắt đầu + "Đã học N buổi" (**G3**); giữ chip "Chuyên cần" (**G4**); "Sửa lớp"/"Lưu trữ" chuyển vào menu ⋯ (**G6**); 2 nút trong thẻ theo design web |
| Tạo lớp `/lop/moi` | Pi | Khớp `NewClass.dc.html` | Một ô "Giờ bắt đầu" thay vì Bắt đầu/Kết thúc (**G3**); segmented chỉ còn 1 mục "10 điểm" + chữ "Thang điểm cố định 10." (spec mục 3, bỏ "100 điểm"/"A–F"); bỏ khối "Thêm học sinh vào lớp" (thuộc "làm sau") |
| Buổi học `/lop/:classId/buoi-hoc` | Pi | Khớp (2 nhóm có nhãn) | Không có màn này trong design riêng; dùng hàng 14px + pill theo bảng 4.5 của brief |
| Chi tiết buổi `/lop/:classId/buoi-hoc/:sessionId` | Pi | Khớp `Main.dc.html` + `Comments.dc.html` khi ghép lại | Gộp điểm danh và nhận xét vào một màn bằng segmented (brief 4.6); "Hủy buổi" 1 chạm không hỏi lại (**G10**); desktop dùng nút đổi vòng trạng thái thay cho `<select>` của bản cũ (brief yêu cầu) |
| Bài kiểm tra `/lop/:classId/bai-kiem-tra` | Pi | Khớp yêu cầu người dùng (brief 4.7) | Design không có màn danh sách bài (bản mobile dùng ô chọn bài); brief 4.7 yêu cầu danh sách mới nhất trước, nên theo brief |
| Tạo bài `/lop/:classId/bai-kiem-tra/moi` | Pi | Khớp `NewTest.dc.html` | **Bỏ hoàn toàn khối "Hệ số khi tính trung bình"** (spec mục 3, brief 7.1); hộp thông tin bỏ câu về phụ huynh; segmented 1 mục 10 điểm |
| Nhập điểm `/lop/:classId/bai-kiem-tra/:testId` | Pi | Khớp `Scores.dc.html` | Thêm **nút bật/tắt "Vắng thi"** trên từng hàng theo brief 4.9 (design mobile chỉ hiện pill vắng thi, không có nút); hàng có `outline` 2px khi ô điểm đang focus (đúng design) |
| Điểm `/lop/:classId/diem` | Pi | Khớp `WebScores.dc.html` (dạng bảng) | **Chỉ đọc** (**G5**); tiêu đề cột bài ghi "9/10 · thang 10", **không ghi hệ số**; không có hàng "TB lớp" (spec 3.1); cột Trung bình chỉ của từng học sinh |
| Học sinh `/lop/:classId/hoc-sinh` | Worker D | Khớp `Students.dc.html` / `WebStudents.dc.html` | Bỏ mọi thứ mời phụ huynh (**G8** giữ SĐT phụ huynh làm hồ sơ). Xem `reports/redesign-d.md` |
| Báo cáo `/lop/:classId/bao-cao` | Worker D | Khớp `ReportReview.dc.html` / `WebReports.dc.html` | Bỏ "3 tháng gần nhất", nhận xét tổng hợp và gợi ý AI (**G7**) |
| Lịch `/lich` | Worker E | Khớp brief 4.13 | Có nhóm "Chưa điểm danh" trên đầu (**G11**); không làm lịch tuần/dời buổi/học bù (spec "làm sau") |
| Cài đặt `/cai-dat` | Worker E | Khớp `Settings.dc.html` (kiểu) | Không có nút quay lại (mục chính); giữ chặn đăng xuất (bất biến 4) |
| Thanh tab dưới (mobile) | Pi | Khớp kiểu thanh tab trong `Main.dc.html` | Design có 5 mục, brief 5.1 yêu cầu **3 mục Lớp/Lịch/Cài đặt**; giữ đúng kiểu: nhãn 12px/600, icon 22px, mục đang chọn màu `#2F5BEA` + vạch trên 3px |
| Sidebar (desktop) | Pi | Khớp `WebClasses.dc.html` + khung canvas của ảnh thiết kế | Design web có 4 mục (Tất cả lớp/Học sinh/Báo cáo/Cài đặt), brief 5.1 yêu cầu 3 mục; thêm khung bo 16px trên nền `#EAECF1` (**G2**) và trạng thái chung ở đáy sidebar |

## 5. Kiểm bằng trình duyệt

Công cụ: Chromium 147 qua Playwright của Python (đã có sẵn trên máy), chạy `npm run dev -- --port 5199`. Không thêm gói nào vào `package.json`.

### 5.1 Duyệt route × khung

Cả 17 route dưới đây đã mở ở **390×900** và **1280×900**: không lỗi console, `document.documentElement.scrollWidth <= innerWidth`, không vi phạm vùng chạm. Tổng: **17 route × 2 khung = 34 lượt mở, 0 vấn đề, 0 vi phạm vùng chạm**.

| Route | 390px | 1280px | Ghi chú |
|---|---|---|---|
| `/dang-nhap` | OK, không tràn, 0 vi phạm | OK, body `rgb(234,236,241)` | mở bằng ngữ cảnh trình duyệt mới (chưa đăng nhập) |
| `/lop` | OK | OK | |
| `/lop/moi` | OK | OK | |
| `/lop/6a/buoi-hoc` | OK | OK | |
| `/lop/6a/buoi-hoc/6a-session-8` (sắp tới) | OK | OK | nút "Hủy buổi" hiện |
| `/lop/6a/buoi-hoc/6a-session-7` (đã diễn ra) | OK | OK | |
| `/lop/6a/bai-kiem-tra` | OK | OK | |
| `/lop/6a/bai-kiem-tra/moi` | OK | OK | |
| `/lop/6a/bai-kiem-tra/6a-test-0` | OK | OK | |
| `/lop/6a/diem` | OK, bảng cuộn trong khung | OK | trang không tràn ngang |
| `/lop/6a/hoc-sinh` | OK | OK | worker D |
| `/lop/6a/bao-cao` | OK | OK | worker D |
| `/lich` | OK | OK | worker E |
| `/cai-dat` | OK | OK | worker E |
| `/lop/6a/diem-danh` (cũ) | → `/lop/6a/buoi-hoc` | → `/lop/6a/buoi-hoc` | A9 |
| `/lop/6a/nhan-xet` (cũ) | → `/lop/6a/buoi-hoc` | → `/lop/6a/buoi-hoc` | A9 |
| `/lop/6a/diem/bai-moi` (cũ) | → `/lop/6a/bai-kiem-tra/moi` | → `/lop/6a/bai-kiem-tra/moi` | A9, không rơi vào `/diem` |

Ghi chú về "tràn ngang": script dò phần tử thò ra ngoài màn hình có báo các tab con (`subTab`) và `<table>` của bảng điểm. Đó là **chủ ý**: hai vùng này là khung cuộn ngang riêng (`overflow-x:auto`), phần tử kế tiếp lộ ra để gợi ý còn nội dung — đúng yêu cầu A8 ("riêng bảng điểm được cuộn ngang trong khung của nó") và chuẩn "hint at hidden content". Bản thân trang không tràn ngang (`scrollWidth = innerWidth` ở mọi route).

### 5.2 A3–A6 — số đo `getComputedStyle`

| # | Đo | 390px | 1280px |
|---|---|---|---|
| A3 | `body` nền | `rgb(246, 247, 249)` | `rgb(234, 236, 241)` |
| A3 | nền khung app | — (không có khung ở mobile) | `rgb(246, 247, 249)` |
| A3 | nền sidebar | — | `rgb(255, 255, 255)` |
| A4 | nút "+ Tạo lớp mới" | `rgb(47, 91, 234)` | `rgb(47, 91, 234)` |
| A4 | tab con đang chọn | nền `rgb(47, 91, 234)`, chữ `rgb(255, 255, 255)` | nền `rgb(47, 91, 234)` |
| A4 | nút "Lưu điểm danh" | `rgb(47, 91, 234)` | `rgb(47, 91, 234)` |
| A4 | nút "Lưu điểm" | `rgb(47, 91, 234)` | `rgb(47, 91, 234)` |
| A4 | tab dưới đang chọn | chữ + vạch `rgb(47, 91, 234)` | — (desktop dùng sidebar) |
| A5 | `body` fontFamily | `"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif` | giống |
| A5 | `document.fonts.check('16px "Plus Jakarta Sans"')` | `true` | `true` |
| A6 | card | bo `16px`, viền `0px`, đệm `14px 16px` | bo `16px`, viền `0px`, đệm `18px 20px` |
| A6 | chip thống kê | bo `10px`, nền `rgb(246, 247, 249)`, chữ `14px` | giống |
| A6 | pill trạng thái | bo `999px`, chữ `13px` | giống |

### 5.3 A10 — đầu ra script đo vùng chạm

Script ở mục 6 bước 12 của brief, chạy trên **mỗi route ở cả hai khung**:

```text
[]      # /dang-nhap, /lop, /lop/moi, /lop/6a/buoi-hoc, /lop/6a/buoi-hoc/6a-session-7,
        # /lop/6a/buoi-hoc/6a-session-8, /lop/6a/bai-kiem-tra, /lop/6a/bai-kiem-tra/moi,
        # /lop/6a/bai-kiem-tra/6a-test-0, /lop/6a/diem, /lop/6a/hoc-sinh, /lop/6a/bao-cao,
        # /lich, /cai-dat  (390px và 1280px)
```
Không có vi phạm nào; không phải dùng tới hai ngoại lệ mà brief cho phép. Trong lần đo đầu, 4 liên kết tiêu đề cột bài ở `/lop/6a/diem` cao 41px → đã sửa (`.testLink { min-height: var(--tap) }`) và đo lại: `[]`.

### 5.4 Kiểm bằng thao tác thật (không chỉ đọc mã)

Bộ kiểm tự động 33 điểm (22 ở `interact.py` + 11 ở `invariants.py`), tất cả đạt; bảng dưới là các điểm chính, cộng 2 lượt kiểm riêng cho bất biến 9/10 trên trang Báo cáo và một lượt thử tạo lớp/sửa lớp/đổi lớp:

| Kiểm | Kết quả |
|---|---|
| Đổi trạng thái điểm danh bằng nút (vòng Có mặt → Muộn → Có phép → Vắng) | PASS |
| `SaveStatus` hiện "Chưa lưu" ngay khi sửa | PASS |
| Chuyển sang tab "Nhận xét" rồi quay lại: bản nháp điểm danh còn nguyên | PASS |
| Lưu điểm danh, tải lại trang: trạng thái vẫn đúng | PASS |
| Nhập điểm + bật "Vắng thi", lưu, tải lại: cả hai còn đúng | PASS |
| Tab Điểm hiện điểm vừa nhập (`9,5`) và pill "Vắng thi" | PASS |
| Rời trang khi còn bản nháp: hộp thoại "Bạn có thay đổi chưa lưu. Rời đi và bỏ thay đổi?" | PASS |
| Chọn "ở lại": vẫn ở trang, bản nháp còn; lưu: chỉ lớp 6a đổi, 40 điểm lớp IELTS nguyên vẹn | PASS |
| "Hủy buổi" → quay về danh sách, buổi hiện nhãn "Đã hủy", mở lại thì không cho điểm danh | PASS |
| Nhận xét: đổi học sinh khi đang soạn không mất chữ; lưu nháp báo thành công | PASS |
| Chặn đăng xuất khi còn thay đổi chờ (nút disabled + nêu lý do) | PASS (đã kiểm lại trên `SettingsPage` mới của worker E) |
| Phát hành báo cáo khi mất mạng (chọn Lê Khánh Chi, `ctx.set_offline(True)`, bấm "Phát hành") | PASS — hiện "Thao tác này cần có mạng." |
| Sửa điểm sau khi báo cáo đã phát hành (Trần Gia Bảo, bài Ngữ pháp 5/10, lưu 4.5) | PASS — danh sách hiện "Điểm có cập nhật, cần phát hành lại" và nút "Phát hành lại" bật |
| Tạo lớp mới (T7) → về `/lop`, thẻ hôm nay hiện đúng, "1 việc cần làm", nút "Điểm danh hôm nay" → chi tiết "Buổi 1 · Thứ Bảy, 17 tháng 10" | PASS |
| Mở lớp → menu ⋯ → "Sửa lớp" → lưu → tiêu đề đổi theo tên mới | PASS |
| Bộ chuyển lớp nhanh: chọn lớp khác thì giữ nguyên tab đang xem (`/lop/{id}/buoi-hoc`) | PASS |

## 6. Bất biến 7.3

| # | Bất biến | Đã thử bằng gì | Kết quả |
|---|---|---|---|
| 1 | 4 trạng thái; Muộn tính là đi học; Có phép không trừ chuyên cần; sửa sau lưu có `changeLogs` | Test `logic.test.ts` ("có phép không bị trừ, muộn là có đi học"); test `repositories.test.ts` ("sửa điểm danh ghi giá trị trước và sau"); thao tác đổi vòng + lưu + tải lại trong trình duyệt | Đạt |
| 2 | Cảnh báo vắng 2 buổi liên tiếp hiện trong màn điểm danh | Trình duyệt `/lop/6a/buoi-hoc/6a-session-7` → thẻ "Cần chú ý": "Nguyễn Minh Anh vắng ít nhất 2 buổi liên tiếp." | Đạt |
| 3 | Trạng thái lưu luôn hiện trên mọi màn có dữ liệu sửa được | Đo DOM 8 màn (tạo lớp, chi tiết buổi ×2 panel, tạo bài, nhập điểm, báo cáo, học sinh, sửa lớp trong modal, thêm học sinh trong modal): màn nào cũng có pill trạng thái trong vùng nội dung hoặc trong hộp thoại, cộng pill toàn cục ở shell | Đạt |
| 4 | Chặn đăng xuất khi còn thay đổi chưa đồng bộ | Tạo hàng đợi bằng cách lưu điểm rồi mở `/cai-dat`: nút Đăng xuất `disabled=true`, có khối nêu lý do; `logout()` vẫn ném lỗi (test cũ "offline giữ hàng đợi, chặn đăng xuất") | Đạt |
| 5 | Học sinh nghỉ giữ lịch sử, không xoá điểm/điểm danh | Trình duyệt: bấm "Đánh dấu nghỉ" → xác nhận → `status:"left"`, `leftAt:"2026-10-17"`, số bản ghi điểm danh 156→156 và điểm 80→80, em đó vẫn hiện với nhãn "Đã nghỉ"; test cũ "nghỉ học giữ điểm và điểm danh" | Đạt |
| 6 | Danh sách điểm danh theo ngày của buổi; thêm học sinh hôm nay rồi lưu buổi cũ không lỗi | Trình duyệt: thêm "Học Sinh Mới" (vào lớp 2026-10-17) → buổi 14/10 chỉ còn 9 hàng → "Tất cả có mặt" → "Lưu điểm danh": không có `role=alert`; test `sessionRoster.test.ts` | Đạt |
| 7 | Bản nháp điểm theo lớp: sửa lớp A chưa lưu, sang lớp B bấm Lưu không ghi điểm của A vào B | Test `scoreDrafts.test.ts` (giữ nguyên, không viết lại); trình duyệt: hành vi rời trang có xác nhận, và khi lưu lớp 6a thì 40 điểm của lớp IELTS không đổi; `entriesForClassTests`/`clearClassTestDrafts` được dùng đúng như bản đã sửa lỗi | Đạt |
| 8 | Chuyển học sinh trong tab Nhận xét khi đang soạn không mất chữ; chỉ xoá bản nháp đã nhớ khi lưu thành công | Trình duyệt: soạn "Em cần luyện nghe thêm." → sang Lê Khánh Chi → quay lại Nguyễn Minh Anh: chữ còn nguyên → Lưu nháp báo "Đã lưu nhận xét nháp trên máy." | Đạt |
| 9 | "Gửi nhận xét" và "Phát hành báo cáo" cần mạng, mất mạng thì báo rõ | Trình duyệt: bật "Mô phỏng mất mạng" → "Lưu và gửi" → báo "Đã lưu nháp trên máy; hãy bấm gửi khi có mạng." và nhận xét giữ `status:"draft"`. Trình duyệt (ngắt mạng thật bằng `context.set_offline(True)`): bấm "Phát hành" ở `/lop/6a/bao-cao` → hiện "Thao tác này cần có mạng." | Đạt |
| 10 | Sửa điểm sau khi báo cáo tháng đã phát hành → ghi "Điểm có cập nhật, cần phát hành lại" | Trình duyệt: chọn Trần Gia Bảo (báo cáo tháng 10 đã phát hành) → sửa điểm bài Ngữ pháp 5/10 thành 4.5 → lưu → mở lại Báo cáo: danh sách ghi "Điểm có cập nhật, cần phát hành lại" và nút "Phát hành lại" bật (`disabled=false`). Test cũ `repositories.test.ts` cũng phủ cờ `needsRepublish` | Đạt |
| 11 | Không ghi SĐT hay nội dung nhận xét vào log | `grep -rn "console\." src` → không có dòng nào; không có `console.log/error` nào trong mã | Đạt |

### 6.1 Chuẩn chất lượng giao diện (ui-quality-addendum.md)

Đã đọc `ui-quality-addendum.md` cùng các module `better-layout`, `better-accessibility`, `better-typography`, `interaction-and-states`. Áp dụng cho phần của tôi:

- **Mục tiêu mỗi màn / một hành động chính**: Lớp → mở lớp hoặc điểm danh buổi hôm nay; Buổi học → mở buổi cần điểm danh; Chi tiết buổi → lưu điểm danh; Bài kiểm tra → mở bài để nhập điểm; Nhập điểm → Lưu điểm; Tạo lớp/Tạo bài → nút `lg` nằm trong `stickyBar` ở nửa dưới màn hình.
- **Phủ trạng thái**: đang tải (Suspense + spinner cho chunk tải lười), rỗng (đều có câu hướng dẫn việc kế tiếp: "Lớp chưa có buổi học nào" + "Buổi học được tạo tự động theo lịch học của lớp.", "Chưa có bài kiểm tra" + nút tạo), lỗi lưu giữ nguyên dữ liệu đã nhập (`role=alert`), chưa lưu/đã lưu trên máy/đã đồng bộ, **ngoại tuyến** (mới thêm pill "Ngoại tuyến" toàn cục ở shell, có `title` giải thích), nội dung dài (tên lớp/bài cắt bằng ellipsis, nhận xét xem nhanh cắt 2 dòng), disabled kèm lý do ("Chưa có buổi sắp tới" nói luôn lý do).
- **Vùng chạm ≥44px, một tay, safe-area**: đo bằng script; `stickyBar` và thanh tab dưới dùng `env(safe-area-inset-bottom)`.
- **Back nhất quán**: nút quay lại 44×44 ở mọi trang con; chỉ chặn Back khi còn bản nháp (chi tiết buổi, nhập điểm) và hỏi xác nhận.
- **Focus / bàn phím / tên truy cập**: `:focus-visible` toàn cục 3px; segmented dùng `role="tablist"/"tab"` + `aria-selected`, thêm **roving tabindex và phím mũi tên/Home/End**; hộp thoại là `<dialog showModal>` (tự khoá focus và Escape); mọi nút chỉ có icon đều có `aria-label`; ô điểm có `aria-label="Điểm {tên}"`; nút trạng thái điểm danh có `aria-label="{tên}: {trạng thái}. Bấm để đổi"`; đăng xuất dùng `aria-describedby` cho lý do.
- **Chữ**: nội dung ≥14px, 13px chỉ dùng cho pill/nhãn phụ/ghi chú (đúng bảng chữ của brief); thêm `font-variant-numeric: tabular-nums` cho điểm, số buổi, chuyên cần, đếm điểm danh và bảng điểm; `line-height` không đơn vị.
- **Màu chỉ từ token**: A2 sạch.
- **Nhãn nút là động từ**: "Lưu điểm danh", "Lưu điểm", "Tạo lớp", "Lưu thay đổi", "Hủy buổi".
- **Mobile 390 trước, không cuộn ngang trang, bảng rộng cuộn trong khung**: đã đo.
- **Chuyển động**: không thêm hiệu ứng nào; `prefers-reduced-motion` vẫn giữ trong `reset.css`.

## 7. Giả định

### 7.1 Giả định G1–G14 của brief

| # | Đã dùng? | Ghi chú / cách đảo ngược |
|---|---|---|
| G1 | Có | Báo cáo là tab con thứ năm của không gian lớp. Đảo ngược: đổi `tabs` trong `ClassSpaceLayout.tsx` và bảng route, không đụng logic |
| G2 | Có | Khung canvas desktop nằm gọn trong MỘT khối `@media (min-width:1024px)` ở `shell.module.css` (`.desktop`), cộng `html, body { background: var(--color-canvas) }` trong `reset.css`. Đảo ngược: xoá đúng hai chỗ đó |
| G3 | Có | Thẻ lớp: `formatClassSchedule(klass) + " · Đã học N buổi"`; form chỉ có "Giờ bắt đầu" |
| G4 | Có | Giữ chip "Chuyên cần x%" (từ `classAttendanceRate`), bỏ chip "TB" |
| G5 | Có | Tab Điểm chỉ đọc; nhập điểm ở Bài kiểm tra → bấm bài |
| G6 | Có | "Sửa lớp" và "Lưu trữ lớp" trong ngăn kéo "Tuỳ chọn lớp" (nút ⋯). Lỗi `requireOnline` khi lưu trữ hiện ngay trong ngăn kéo |
| G7 | Có (worker D) | Bỏ báo cáo 3 tháng, nhận xét tổng hợp, gợi ý AI |
| G8 | Có (worker D) | Giữ SĐT phụ huynh đầy đủ, không gửi lời mời |
| G9 | Có | Đăng nhập bằng Email (giữ prototype), không đổi `auth.ts` |
| G10 | Có | "Hủy buổi" một chạm, không hỏi xác nhận |
| G11 | Có (worker E) | Lịch có nhóm "Chưa điểm danh" trên đầu danh sách 14 ngày |
| G12 | Có | Nhãn tab con là "Điểm" |
| G13 | Có | "Lớp của cô Lan" (sidebar, đăng nhập) và "Xin chào, cô Lan" (danh sách lớp) |
| G14 | Có | Không đọc tệp gộp `Tat ca man hinh.dc.html`. *Minh bạch thêm:* tôi có đọc 9 tệp `.dc.html` riêng (ClassList, WebClasses, Login, NewClass, Main, Comments, NewTest, Scores, WebScores) để lấy đúng số đo/khoảng cách ở các chỗ brief mô tả ngắn — brief không cấm việc này, chỉ dặn 15 tệp riêng là đủ |

### 7.2 Giả định mới (phát sinh trong lúc làm)

| # | Giả định | Lý do | Cách đảo ngược |
|---|---|---|---|
| N1 | `Modal.tsx`/`Sheet.tsx` không cần sửa mã, chỉ đổi kiểu qua `ui.module.css` | Nút Đóng đã là `variant="secondary"`, hộp thoại chỉ thiếu bỏ viền/bo/`::backdrop` — tất cả nằm ở CSS dùng chung | Không cần đảo |
| N2 | `PageHeader` nhận thêm slot tuỳ chọn `overlay` cho bộ chuyển lớp | Brief muốn `<select>` phủ kín khối tiêu đề nhưng không được nằm trong `<h1>`; để trong `h1` thì `textContent` của tiêu đề chứa cả danh sách lớp (hại trình đọc màn hình) | Bỏ `overlay`, truyền select vào `title` (quay lại lỗi cũ) hoặc viết header riêng cho không gian lớp |
| N3 | `stickyBar` dùng `position: sticky` (đáy = chiều cao thanh tab) chứ không `fixed` | Nút chính vẫn luôn trong tầm ngón tay khi cuộn, mà nội dung cuối trang không bị thanh che; nếu dùng `fixed` phải nới `padding-bottom` của shell và dễ đè lên nội dung | Đổi sang `position: fixed` + tăng đệm đáy của `.mobile` trong `shell.module.css` |
| N4 | Thêm 2 hàm dùng chung ngoài mục 3.5: `formatDayMonthLong` (nhãn "Ngày 9 tháng 10") và hook `useOnline` | Nhãn ngày của design không có trong danh sách hàm của brief; trạng thái ngoại tuyến cần cho chuẩn chất lượng | Xoá 2 hàm nếu không muốn mở rộng `shared/format` và `shared/hooks` |
| N5 | Trang danh sách lớp không còn khối báo lỗi repository | Mọi thao tác ghi (sửa lớp, lưu trữ) đã chuyển sang ngăn kéo ở không gian lớp, nơi lỗi được hiện tại chỗ; ở trang danh sách không còn hàm repository nào có thể ném lỗi | Thêm lại `role=alert` nếu sau này trang này có thao tác ghi |
| N6 | `sessionNumber` của buổi **đã hủy** đếm theo vị trí trong toàn bộ buổi của lớp | "Đếm các buổi không bị hủy" không cho buổi đã hủy một số thứ tự; buổi hủy vẫn cần con số để hiện trên danh sách | Đổi nhánh `session.status === "cancelled"` trong `src/data/repositories/sessions.ts` |
| N7 | Hàng nhập điểm có nút bật/tắt "Vắng thi" riêng, và ô điểm được thay bằng chữ "Vắng thi" khi bật | Brief 4.9 yêu cầu nút bật vắng thi; design mobile chỉ có pill | Bỏ nút, chỉ giữ pill như design (mất khả năng bật vắng thi khi chưa nhập điểm) |
| N8 | `Segmented` có thêm `disabled` (chỉ `aria-disabled`, không dùng thuộc tính `disabled` để không bị mờ) + điều hướng bằng phím mũi tên | Mục "10 điểm" là thang cố định, cần hiện nhưng không đổi được; tablist cần hành vi bàn phím theo APG | Bỏ prop `disabled` và `onKeyDown` trong `src/shared/ui/Segmented.tsx` |
| N9 | Thêm pill "Ngoại tuyến" toàn cục ở shell | Addendum yêu cầu phủ trạng thái ngoại tuyến; làm một chỗ cho mọi màn thay vì từng màn | Xoá nhánh `online ? … : offline` trong `GlobalStatus` (`TeacherShell.tsx`) và `useOnline.ts` |
| N10 | `WeekdayPicker` là component dùng chung cho Tạo lớp và Sửa lớp | Brief yêu cầu tách component này (4.4) | Không cần đảo |
| N11 | Thêm `<meta name="mobile-web-app-capable">` vào `index.html` | Chromium cảnh báo `apple-mobile-web-app-capable` đã deprecated (worker D cũng gặp cảnh báo này) | Xoá dòng meta đó |

Không gặp mâu thuẫn spec nào phải dừng lại; không có `NEEDS_CONTEXT`.

## 8. Điều không xác minh được và vì sao

1. **Nhóm "Chưa điểm danh" của màn Lịch**: dữ liệu mẫu chỉ có buổi `planned` ở 19/10 và 20/10, mà hôm nay là 17/10, nên chưa có buổi quá hạn để nhìn thấy nhóm này. Worker E ghi cùng giới hạn.
2. **Font khi không có mạng**: khi chặn `fonts.googleapis.com`/`fonts.gstatic.com`, trang vẫn chạy đúng (nền, bố cục, không lỗi console, không tràn ngang, 0 vi phạm vùng chạm) nhưng `document.fonts.check()` vẫn trả `true` vì họ font chưa được khai báo — nên số đo A5 chỉ đáng tin khi stylesheet Google Fonts tải được (lần đo chính có mạng: `true`, và ảnh chụp cho thấy đúng font).
3. **Một số luồng của D/E** (thêm học sinh, phát hành báo cáo) được D/E tự ghi là chưa thử tay trong báo cáo của họ; tôi đã thử lại hai luồng đó bằng trình duyệt (bất biến 5, 6, 9, 10 ở mục 6, gồm cả màn của D), nên phần liên quan tới A11 đã có bằng chứng. Những phần khác trong phạm vi D/E (ví dụ bố cục in của báo cáo, các trạng thái rỗng riêng của họ) tôi không tự kiểm lại.
4. **Trạng thái "đang tải"** của từng trang chỉ được kiểm ở mức khung (Suspense + spinner dùng chung khi tải chunk), không đo thời gian hiển thị thật trên mạng chậm.

## 9. Việc tồn đọng / rủi ro

1. **Font (bắt buộc ghi):** prototype tải Plus Jakarta Sans bằng 3 thẻ `<link>` trỏ Google Fonts trong `index.html`. Bản thật **phải tự host font** (đặt tệp `.woff2` trong `public/`) và để service worker precache font cùng khung app, theo `docs/architecture.md` mục 3 và mục 5 — vì SW chỉ precache khung app và font, và mạng ở lớp học hay chập chờn.
2. `stickyBar` là `sticky`, nên khi nội dung ngắn thì nút chính nằm ngay sau nội dung chứ không dán đáy màn hình như ảnh design (xem N3).
3. Tab con và bảng điểm cuộn ngang trong khung riêng; trên máy rất hẹp, người dùng phải vuốt ngang — đúng thiết kế nhưng là điểm cần theo dõi khi dùng thật.
4. `.cardHead` cắt tên lớp dài bằng ellipsis (design chỉ có tên ngắn). Với tên lớp rất dài, giáo viên chỉ thấy phần đầu ở thẻ lớp; tên đầy đủ vẫn có ở đầu không gian lớp.
5. Bản nháp điểm chỉ nằm trong bộ nhớ của trang (như bản cũ, `scoreDrafts` không ghi xuống localStorage), nên rời trang là mất, có hỏi xác nhận. Đây là hành vi cũ, không đổi trong brief.
6. Dữ liệu mẫu có ngày cố định (đến 20/10/2026): sau ngày đó màn Lịch sẽ rỗng cho tới khi tạo lớp mới (lớp mới sinh 28 ngày buổi). Worker E ghi cùng điều này.
7. `dist/` được sinh ra bởi `npm run build`; đã có trong `design/prototype/.gitignore` nên không lọt vào git.
8. Không xoá `.DS_Store` hay các tệp ngoài `design/prototype/` (ví dụ `design/*.dc.html` đang ở trạng thái đã xoá/khôi phục trong working tree) vì ngoài phạm vi cho phép.

Status: DONE
Summary: Toàn bộ giao diện giáo viên đã theo bộ token và bố cục thiết kế, điều hướng đổi thành Lớp/Lịch/Cài đặt với 5 tab con trong không gian lớp; A1–A11 đều có bằng chứng (lệnh, số đo `getComputedStyle`, script vùng chạm và thao tác thật trong trình duyệt ở cả 390px và 1280px), 11/11 bất biến đã thử.
Concerns/Blockers: Font đang tải từ Google Fonts chỉ để chạy prototype — bản thật phải tự host trong `public/` và để service worker precache (architecture.md mục 3, 5). Dữ liệu mẫu có ngày cố định tới 20/10/2026 nên màn Lịch sẽ rỗng sau ngày đó cho tới khi tạo lớp mới. Bố cục in của trang Báo cáo (phần worker D) và các trạng thái rỗng riêng của worker D/E không được tôi kiểm lại.
