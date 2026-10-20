# Lính D1 — Giao diện phụ huynh (mới)

Cập nhật: 2026-10-20 · Phạm vi sửa: `design/prototype/src/roles/guardian/**` (mới),
`src/app/routes.tsx`, `src/features/auth/RolePickerPage.tsx`, test mới. Không sửa
`src/data/**`, `src/shared/**`, `src/app/router.tsx`, các `src/features` khác.

Cơ sở: `docs/spec.md` mục 2, 3, 4 (Nhận xét và báo cáo, BTVN, Báo cáo), 5.2, 5.3;
`docs/architecture.md` mục 3–4 (roles/guardian tách chunk; phụ huynh chỉ đọc con được
liên kết, chỉ thấy nội dung đã gửi/đã phát hành); API đọc sẵn có trong
`src/data/repositories/guardian.ts` + `src/features/reports/reportModel.ts` (Lính A2);
ảnh chuẩn `plans/design-review/2026-10-19-phieu-buoi-hoc/final/` và chữ gốc trong
`.../source/final/project-final.dc.html`.

## 1. Bảng màn → route → component

| Màn (ảnh) | Route | Component | Dữ liệu dùng |
|---|---|---|---|
| PH · Tổng quan (15) | `/ph` | `GuardianOverviewPage` | `getChildOverview`, `useAccess` (ẩn nhóm bị tắt) |
| PH · Điểm danh (tối giản, 109 cũ) | `/ph/diem-danh` | `GuardianAttendancePage` | `childAttendanceMonth` (hàm đọc riêng, `getStore`) |
| PH · Điểm số (tối giản, 110 cũ) | `/ph/diem-so` | `GuardianScoresPage` | `childScoresMonth` (hàm đọc riêng, `getStore`) |
| PH · Nhận xét (14) | `/ph/nhan-xet` | `GuardianCommentsPage` | `listChildTickets` |
| PH · Phiếu buổi học (08) | `/ph/nhan-xet/:sessionId` | `GuardianTicketPage` | `getChildTicket`, `getChildHomework`, `childTeacherName` |
| PH · BTVN của con (09, 34, 35) | `/ph/btvn`, `/ph/btvn/:sessionId` | `GuardianHomeworkPage` | `getChildHomework` (mới nhất trước) |
| PH · Báo cáo tháng (10) | `/ph/bao-cao` | `GuardianReportPage` | `getChildMonthlyReport` + `publishedReportMonths` |

Khung chung: `GuardianShell` (thanh tab dưới 5 mục **Tổng quan · Điểm danh · Điểm số ·
Nhận xét · Báo cáo**, tab Nhận xét sáng cả ở Phiếu buổi học và BTVN như ảnh 08/09/34/35),
`GuardianProvider` (con đang chọn + `sessionStorage`), `guardianUi` (chip chọn con, sao,
tháng), `GuardianIcon` (bộ icon riêng, không sửa `src/shared`).

Chi tiết theo ảnh:

- **15**: tiêu đề `Lớp … · Tháng 10`, chip chọn con (GB Gia Bảo / BN Bảo Ngọc), hai thẻ
  `Đi học` và `Điểm trung bình` (kèm `▲/▼ … so với tháng 9`), khối **Điều cô muốn chia sẻ**
  chỉ khi `teacherNote` khác `null`, **Nhận xét mới nhất** (sao + câu mẫu + ghi chú, bấm mở
  phiếu), **Điểm gần đây** + `Xem tất cả` → `/ph/diem-so`. Số liệu tính thật, không có TB lớp.
- **14**: danh sách phiếu mới nhất trước; thẻ đầu có viền xanh + nhãn `Mới`; mỗi thẻ: `Buổi N ·
  <ngày> tháng <tháng>`, sao, câu mẫu, ghi chú, `Kết quả BTVN buổi N` với pill
  `Luyện từ vựng · Hoàn thành tốt` / `Bài tập · Hoàn thành` / `… · Chưa chấm`.
- **08**: header `Buổi N · Thứ Sáu 16/10` + nút quay lại, thẻ `Nhận xét của <GV chính>`, sao,
  câu mẫu, ghi chú; thẻ `Kết quả BTVN buổi N · <ngày>` (pill kết quả, phần chưa chấm hiện
  `Chưa chấm` + `Cô chấm xong là hiện ngay.`); thẻ `BTVN mới · <buổi chấm>` + đề từng phần.
- **09/34/35**: `Mới nhất` (thẻ viền xanh, nhãn `Mới`) rồi `Các buổi trước`; trạng thái buổi
  chấm: `Cô chấm ở buổi 9 · Thứ Hai 19/10`, `Buổi 9 · 16/10 đã hủy` (34),
  `Chưa có buổi chấm` + `Cô sẽ báo khi có buổi chấm` (35). Kết quả chấm chỉ hiện khi phiếu
  buổi chấm đã gửi.
- **10**: `Báo cáo tháng 10`, segmented `Tháng 10` / `3 tháng gần nhất`, hai thẻ Chuyên cần +
  Điểm trung bình, **Nhận xét theo sao** (thanh tỉ lệ 3/2/1 + `n buổi có phiếu` +
  `Tính trên các phiếu đã gửi.`), bảng **Bài tập về nhà** (`Phần / Tốt / Hoàn thành / Chưa`,
  chú thích `Tốt = Hoàn thành tốt · Chưa = Chưa hoàn thành`), chú thích cuối, nút
  `Tải PDF về máy`. Chỉ hiện khi báo cáo **đã phát hành**; cờ `Điểm có cập nhật, cần phát
  hành lại` khi `needsRepublish` (A2).
- **Điểm danh / Điểm số**: bố cục tối giản theo bản thiết kế cũ (`design/reference/109,110`):
  chọn tháng, 4 ô thống kê + trạng thái từng buổi (Điểm danh); trung bình của con + điểm
  từng bài theo tháng (Điểm số). Không hiện TB lớp (quy tắc 3.1), không có nút sửa/gửi.

Trạng thái rỗng / thiếu quyền: chưa liên kết con, chưa có phiếu, chưa có BTVN, chưa phát
hành báo cáo, nhóm quyền bị tắt (hiện thông báo của repository, không lộ dữ liệu), buổi
không thuộc con. Phụ huynh chỉ đọc: màn không có nút sửa, gửi, phát hành.

## 2. Định tuyến và chuyển hướng theo vai trò

`src/app/routes.tsx` (chỉ file này đổi, `router.tsx` giữ nguyên):

- `/ph` (loader chặn vai trò nhân sự) + các tuyến con như bảng trên; mọi màn phụ huynh tải
  lười (`lazy`) nên tách chunk riêng khỏi mã nhân sự.
- **Loader** (chạy trước render, kiểm chứng được bằng `createMemoryRouter`):
  `staffOnlyLoader` cho cây `/lop`, `/lich`, `/nhan-su`… → vai trò phụ huynh bị đẩy về `/ph`;
  `guardianOnlyLoader` cho `/ph` → vai trò nhân sự bị đẩy về `/lop`;
  `homeLoader` cho `*` → về trang đầu theo loại vai trò.
- Bảng `titles` trong `Loading`: thêm `/ph` → `Tổng quan`, `/ph/diem-danh`, `/ph/diem-so`,
  `/ph/nhan-xet`, `/ph/nhan-xet/:id` → `Phiếu buổi học`, `/ph/btvn(/:id)` → `Bài tập về nhà`,
  `/ph/bao-cao` → `Báo cáo tháng` (đã kiểm tra tiêu đề tab khi chạy thật).
- `src/roles/guardian/roleLanding.ts`: `landingPathFor(kind)` / `roleLandingPath()` dùng chung
  cho route `*`, loader và màn chọn vai trò.

`src/features/auth/RolePickerPage.tsx`: chọn vai trò phụ huynh → `/ph`, nhân sự → `/lop`;
tự chuyển khi chỉ còn một vai trò cũng theo loại vai trò. Nhãn tên vai trò (Admin / Giáo
viên / Phụ huynh) vốn đã hiện ở `role.name`; thêm dòng `Con: Trần Gia Bảo, Ngô Bảo Ngọc`
cho dòng phụ huynh để phân biệt với hai membership trùng tên người dùng. Không đổi hành vi
khác của màn (đăng xuất, thông báo thu hồi vai trò, danh sách).

## 3. Hàm đọc đặt trong `src/roles/guardian` (chỉ đọc)

`guardianRead.ts` chỉ dùng cho hai màn tối giản chưa có API trong `src/data`:

- `childAttendanceMonth(studentId, month)` → buổi đã diễn ra trong tháng + trạng thái, ghi chú,
  giờ muộn; đếm có mặt / muộn / có phép / vắng.
- `childScoresMonth(studentId, month)` → điểm từng bài + trung bình **của con**.
- `childMonths`, `defaultChildMonth`, `childSessions`, `childTeacherName`,
  `publishedReportMonths`.

Mọi hàm đi qua `listMyChildren()` của `src/data/repositories/guardian.ts` trước khi đọc
`getStore()`: học sinh không thuộc con được liên kết thì ném
`"Bạn không có quyền truy cập học sinh này."`; nhóm Điểm danh/Điểm bị Admin tắt thì
`requirePermission` chặn như repository. Không có hàm ghi nào.

## 4. Kiểm chứng

Chạy trong `design/prototype`:

- `npx vitest run src/roles` → **2 file, 22 test pass** (phụ huynh).
- `npx vitest run src/roles src/app src/features/auth` → **3 file, 29 test pass**.
- `npx vitest run` (toàn bộ) → **45 file, 440 test pass**.
- `npx tsc --noEmit` → **0 lỗi** tại thời điểm chạy (lỗi tạm của Lính khác ở
  `features/reports/ReportsPage.tsx` đã được sửa trong lúc làm).
- `npx vite build` → OK; các chunk phụ huynh tách riêng: `GuardianShell`, `GuardianOverviewPage`,
  `GuardianCommentsPage`, `GuardianTicketPage`, `GuardianHomeworkPage`, `GuardianAttendancePage`,
  `GuardianScoresPage`, `GuardianReportPage`, `GuardianIcon`, `GuardianHomeworkSections`,
  `guardianRead`, `guardianUi`.
- Dev server `npx vite --port 5193`, khung 390×844 (Playwright/Chromium), đăng nhập sẵn (seed),
  `/chon-vai-tro` → chọn **Phụ huynh**, đi qua từng màn; ảnh chụp ở `/tmp/guardian-shots/`:
  `15-tong-quan-final.png`, `14-nhan-xet.png`, `08-phieu-buoi-hoc.png`, `09-btvn.png`,
  `34-buoi-cham-bi-huy.png`, `35-chua-co-buoi-cham.png`, `10-bao-cao.png`,
  `109-diem-danh.png`, `110-diem-so.png`, `00-chon-vai-tro.png`, `desktop-tong-quan.png`.
  Không có lỗi console/pageerror. Đã kiểm tra thêm: đổi chip sang Bảo Ngọc (ẩn lời cô, số
  liệu 4/4), tải lại trang vẫn nhớ con đang chọn, Admin mở `/ph/btvn` → `/lop`, Admin mở
  đường dẫn lạ → `/lop`, desktop cột giữa rộng 480px.

Test mới (chỉ dùng `renderToStaticMarkup` như các test sẵn có, không thêm thư viện):

- `src/roles/guardian/guardianRender.test.tsx` (17 test): chữ then chốt từng màn; phiếu mới
  nhất trước; `Mới`; kết quả BTVN đã gửi/chưa gửi; `Chưa chấm` + lời nhắc khi phiếu buổi chấm
  đã gửi mà chưa chấm; trạng thái 34 (buổi chấm bị hủy) và 35 (chưa có buổi chấm); báo cáo
  đã/chưa phát hành + cờ phát hành lại; Điểm danh/Điểm số không có TB lớp; phụ huynh không
  đọc được em khác (`ielts-student-0`) và không thấy ghi chú của em khác; nhóm Điểm bị tắt
  thì ẩn điểm; ẩn khối lời cô khi `teacherNote` null.
- `src/roles/guardian/guardianRouting.test.tsx` (5 test): `landingPathFor`/`roleLandingPath`;
  loader chặn chéo (`/lop`, `/lop/:classId/buoi-hoc/:id`, `/lich`, `/nhan-su` → `/ph` khi vai
  trò phụ huynh; `/ph`, `/ph/btvn/:id`, `/ph/bao-cao` → `/lop` khi vai trò nhân sự); `*` theo
  vai trò; màn chọn vai trò hiện đủ Admin / Giáo viên / Phụ huynh + `Con: …`.

## 5. Chỗ còn lệch ảnh (đã cân nhắc, không tự đổi nghiệp vụ)

1. **15**: ảnh có nút tròn "PH" (cài đặt tài khoản) ở góc phải; bản này bỏ vì chưa có màn cài
   đặt của phụ huynh trong phạm vi bản đầu (không làm nút rỗng).
2. **10**: ảnh có segmented `Tháng 10 | 3 tháng gần nhất`; mục `3 tháng gần nhất` để
   **vô hiệu hoá** vì báo cáo 3 tháng thuộc "Làm sau" của spec mục 8 và chưa có API đọc.
3. **10**: nút `Tải PDF về máy` gọi `window.print()` (trình duyệt → Lưu thành PDF), giống cách
   màn Báo cáo của giáo viên đang làm; chưa sinh tệp PDF thật (ngoài phạm vi prototype).
4. **34/35**: ảnh là toàn màn BTVN, không có nút quay lại. Bản này `/ph/btvn` khớp ảnh; khi mở
   sâu theo buổi `/ph/btvn/:sessionId` có thêm nút quay lại để về danh sách.
5. **Số buổi**: dữ liệu mẫu lớp 6A nên nhãn là `Buổi 8 · 14/10`, `Buổi 7 · 12/10`… (ảnh dùng
   lớp IELTS Foundation, `Buổi 18`). Ngoài ra buổi bù bị hủy 16/10 được `sessionNumber()` đếm
   trong danh sách đầy đủ nên cũng ra "Buổi 9" trùng với buổi chấm 19/10 ("Cô chấm ở buổi 9");
   đây là hành vi của hàm dữ liệu sẵn có, tôi không sửa `src/data`.
6. **08**: dòng kết quả BTVN không lặp lại mô tả (giống ảnh); mô tả chỉ ở "BTVN mới" và thẻ
   "Mới nhất" của màn BTVN.
7. **Điểm danh**: dữ liệu chỉ có `lateAt` (giờ) nên hiện `Đến muộn 18:10`, không có "15 phút"
   như ảnh (bản thiết kế cũ). Ghi chú buổi hiện `Ghi chú: …`.
8. **Điểm số**: không có khối "Xu hướng 3 bài gần nhất", "Mức Khá" hay "Cô ghi chú" của bản
   thiết kế cũ vì dữ liệu/spec bản đầu không có; giữ điểm từng bài và trung bình của con.
9. Thẻ "Điểm gần đây" ở 15 hiện tối đa 3 bài mới nhất (như ảnh); danh sách đầy đủ ở tab Điểm số.
10. Chip chọn con chỉ đặt ở màn Tổng quan (như ảnh 15); các màn khác hiện tên con ở eyebrow.
    Chip sắp theo thứ tự liên kết `Member.studentIds` (Gia Bảo trước) thay vì thứ tự tên của
    repository, để khớp ảnh và mở mặc định đúng con có đủ dữ liệu mẫu.

## 6. Ghi chú cho lead

- `guardianRead.ts` đọc `getStore()` trực tiếp trong `src/roles` (đúng chỉ đạo của brief cho
  hai màn tối giản). Nếu muốn thuần kiến trúc "UI chỉ đi qua `data/repositories`", nên chuyển
  `childAttendanceMonth`/`childScoresMonth` vào `src/data/repositories/guardian.ts` ở vòng sau.
- Chưa commit/push/deploy. Tệp đã đổi: `src/roles/guardian/**` (mới),
  `src/app/routes.tsx`, `src/features/auth/RolePickerPage.tsx`.

---

Status: DONE_WITH_CONCERNS

Summary: Đã dựng mới toàn bộ khu phụ huynh (`src/roles/guardian`, tách chunk) gồm Tổng quan,
Nhận xét, Phiếu buổi học, BTVN của con (kể cả trạng thái buổi chấm bị hủy / chưa có buổi
chấm), Báo cáo tháng và hai màn Điểm danh/Điểm số tối giản, cộng định tuyến `/ph` có chặn
chéo theo vai trò, tiêu đề tab và màn chọn vai trò; `vitest` 22/22 test phụ huynh (29/29 cho `src/roles src/app src/features/auth`,
440 toàn bộ) và `tsc` sạch, đã đi thử 390px trên dev server và so với ảnh 15/14/08/09/34/35/10.

Concerns/Blockers:
1. Báo cáo 3 tháng gần nhất (ảnh 10) để vô hiệu hoá vì thuộc "Làm sau" của spec mục 8 và chưa
   có API đọc — cần lead xác nhận nếu muốn mở.
2. Nút "Tải PDF về máy" dùng `window.print()` (Lưu thành PDF của trình duyệt), chưa sinh PDF thật.
3. Buổi bù bị hủy 16/10 bị đánh số trùng "Buổi 9" với buổi chấm 19/10 do `sessionNumber()`
   trong `src/data` (không sửa được theo vùng file); nên cân nhắc sửa hàm dữ liệu.
