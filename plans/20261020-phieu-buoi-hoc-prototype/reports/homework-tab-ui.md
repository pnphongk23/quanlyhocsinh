# Lính C — Tab Bài tập về nhà (BTVN) · báo cáo

Cập nhật: 2026-10-20 (bổ sung nút "Thêm buổi vào lịch" ảnh 58) · Phạm vi: `design/prototype/src/features/homework/**` (mới). Không sửa `src/data`, `src/app`, `src/shared`, `features/class-space`, `features/comments`.

## 1. File đã tạo

| File | Nội dung |
|---|---|
| `src/features/homework/HomeworkPanel.tsx` | `export default function HomeworkPanel({ session, initialView? })` — hai phần Bài tập buổi trước / Bài tập hôm nay, chấm theo phần, giao/sửa/xoá phần, thanh quay lại nhận xét, CTA "Thêm buổi vào lịch" (ảnh 58), trạng thái buổi hủy. Có export thêm `AddGradingSessionSheet` để test phần nối modal. |
| `src/features/homework/HomeworkPanel.module.css` | Bố cục + màu theo token, khớp ảnh 50–59, 62; nút bút 44×44; sheet trượt dưới. |
| `src/features/homework/homeworkModel.ts` | Hàm thuần: đổi mức chấm (chạm lại = bỏ), nhãn "còn n loại"/"3/4 phần"/"Đã chấm n/10", quy tắc xoá, đọc `?part=`, query quay lại nhận xét, câu chữ trạng thái 55/56. |
| `src/features/homework/homeworkModel.test.ts` | 8 test logic thuần. |
| `src/features/homework/HomeworkPanel.test.tsx` | 16 test render thật (SSR + MemoryRouter): trạng thái 50, 55, 56, 57, 58, 59, 62, đủ 4 loại, buổi hủy, nút "Thêm buổi vào lịch" và modal thêm buổi lẻ. |
| `src/features/homework/homeworkActions.test.ts` | 8 test hành vi qua repository: chấm, bỏ chấm, đánh dấu cả lớp, chặn xoá phần đã chấm, xoá phần chưa chấm, sửa phần đã chấm, thêm buổi lẻ làm trạng thái buổi chấm tự cập nhật, chặn tiêu đề trống/trùng loại. |

`initialView?: "previous" | "today"` là prop tuỳ chọn chỉ để test/SSR mở thẳng phần "Bài tập hôm nay"; Lính B chỉ cần `HomeworkPanel({ session })` như đã thoả thuận, mặc định mở "Bài tập buổi trước".

## 2. Đã làm theo yêu cầu

1. **Hai phần** dùng `homeworkContext(state, session.id)`: mặc định "Bài tập buổi trước"; nút/segment chuyển "Bài tập hôm nay".
2. **Chấm buổi trước**: chip chọn phần theo loại (icon T/sách/mic/bút), tiêu đề phần, "`n/total` em đã chấm" + "`n` còn Chưa chấm", nút "Đánh dấu cả lớp: Hoàn thành" (`setHomeworkGradeForAll(..., "done")`), 3 mức `setHomeworkGrade` (chạm lại mức đang chọn → `null` → "Chưa chấm"), chip "Chưa chấm", nhãn "Vắng buổi giao bài" (vắng **hoặc** có phép ở buổi giao bài, vẫn chấm được), chỉ các em đang học ở buổi chấm (lấy từ `previous.rows`).
3. **Giao hôm nay**: danh sách phần, "Một lần cho cả lớp · `n`/4 phần · chấm ở buổi X" / "Chưa có buổi chấm", pill "Đã lưu · phụ huynh đã thấy", nút "+ Thêm phần · còn n loại" (ẩn khi đủ 4 loại), form thêm/sửa tiêu đề (bắt buộc, lỗi lấy từ repository) + mô tả (không bắt buộc), không có tệp, `saveHomeworkSection` / `deleteHomeworkSection`; sheet sửa hiện "Đã chấm n/total" hoặc "Chưa chấm", phần đã chấm thì nút "Xoá phần" bị khoá + lý do "Đã chấm cho n em nên không xoá được. Vẫn sửa được tiêu đề và mô tả.", phần chưa chấm xoá được và có hộp xác nhận trong sheet (Huỷ / Xoá phần). Bút sửa có vùng chạm 44×44.
4. **Thanh "Quay lại nhận xét …"**: có `?from=<studentId>` thì hiện tên em, bấm chuyển sang `?tab=nhan-xet&student=<studentId>`, giữ các tham số khác, bỏ `from`/`part`. `?part=<HomeworkKind>` chọn sẵn phần (giá trị lạ bị bỏ qua).
5. **Buổi đã hủy**: chỉ hiện thông báo gọn "Buổi học đã hủy nên không giao hoặc chấm bài tập."; mọi lỗi repository hiện nguyên văn tiếng Việt trong `role="alert"`; không có `console.log` (đã grep).
6. **Quyền**: đọc `comments_reports`/`read` mới xem; thiếu `write` thì ẩn thêm/sửa/CTA thêm buổi, khoá nút chấm, hiện dòng "Bạn chỉ có quyền xem…". Thao tác ghi đều qua `useSaveStatus` (markUnsaved/clearStatus/setStatus("error")) và repository `commit()` nên lưu offline như soạn nhận xét.
7. **"Thêm buổi vào lịch" (ảnh 58, bổ sung theo yêu cầu lead)**: hiện ngay dưới thẻ "BTVN giao hôm nay" khi `today.grading.state === "none"` và có quyền ghi. Bấm mở đúng modal thêm buổi lẻ sẵn có: `import AddSessionModal from "../class-space/AddSessionModal"` (chỉ import, không sửa file class-space), truyền `classId={session.classId}`, `classTime={getSessionClass(session.id)?.time ?? session.time ?? ""}` (giờ của lớp), `onClose`. Sau khi lưu, `createExtraSession` ghi qua `commit()` → store phát lại → `homeworkContext` được tính lại: băng cảnh báo và nút biến mất, dòng phụ đổi thành "chấm ở buổi N" mà không cần reload.

## 3. Hai quyết định lead đã chốt (2026-10-20)

1. **Băng 57 — số buổi hủy ghi theo ngày, không ghi số buổi.** `sessionNumber()` của app bỏ qua buổi hủy nên số của buổi hủy và buổi chấm có thể trùng (seed: buổi hủy 16/10 và buổi chấm 19/10 đều là "buổi 9"). Băng hiện tại ghi: "Buổi 16/10 đã bị hủy. BTVN buổi 8 chấm ở buổi 9 · Thứ Hai 19/10. Phụ huynh thấy thay đổi này." — đúng chốt "ghi theo ngày"; không đổi `sessionNumber` toàn app.
2. **Chip chọn phần chỉ cho phần đã giao.** Ảnh mock vẽ đủ 4 chip dù BTVN buổi trước của mock chỉ có 2 phần; đã chốt giữ cách chỉ vẽ chip cho `previous.sections` thật, tránh chọn một phần không tồn tại (không có tiêu đề/số chấm).

## 4. Kiểm chứng

Trong `design/prototype`:

- `npx vitest run src/features/homework` → **3 file, 32 test pass**.
- `npx tsc --noEmit` → **0 lỗi trong `src/features/homework`**. Còn lỗi ở `src/features/reports/ReportsPage.tsx` và `src/data/seed.ts` (Report thiếu `generalComment`/`publishedAt`) — file của Lính khác, ngoài phạm vi.
- Chạy toàn bộ lúc 07:20 → 36 file / 338 test pass. Lần chạy lại lúc 07:22–07:25 thấy Lính B đang thêm test còn đỏ trong `features/comments/*`, `class-space/sessionDetailTabs.test.tsx` (không liên quan `features/homework`).
- Mở thử route thật (Lính B đã nối `?tab=btvn` → `HomeworkPanel`): `npx vite --port 5192`, Chrome headless 390×844 (DPR 2):
  - `/lop/6a/buoi-hoc/6a-session-7?tab=btvn` → ảnh 50 (mặc định buổi trước)
  - `/lop/6a/buoi-hoc/6a-session-7?tab=btvn&from=6a-student-1` → ảnh 62
  - `/lop/6a/buoi-hoc/6a-session-0?tab=btvn` → ảnh 55; `/lop/6a/buoi-hoc/6a-session-1?tab=btvn` → ảnh 56
  - `/lop/ielts/buoi-hoc/ielts-session-8?tab=btvn` + bấm "Bài tập hôm nay" → ảnh 58, thấy nút "Thêm buổi vào lịch"
  - Bấm nút → modal "Thêm buổi lẻ" của tab Buổi học mở đúng (ngày mặc định hôm nay, giờ mặc định 19:30 = giờ lớp IELTS); đổi ngày sang 22/10 và bấm "Lưu buổi học" → băng cảnh báo và nút biến mất, dòng phụ đổi thành "chấm ở buổi 10", không reload.
  - Ảnh 51/57: `/lop/6a/buoi-hoc/6a-session-7` bấm "Bài tập hôm nay"; ảnh 52/53/54: mở sheet thêm/sửa.
  - Đã bấm thử trong trình duyệt: chấm 1 em (8/9 → 9/9, bỏ chấm 9/9 → 8/9), "Đánh dấu cả lớp" (9/9), thêm phần "Đọc truyện The Lost Key" (4/4 phần, nút thêm biến mất), xoá phần chưa chấm (hộp xác nhận rồi xoá), sửa phần đã chấm (nút xoá disabled + lý do "Đã chấm cho 8 em…"), thanh quay lại đổi URL thành `?tab=nhan-xet&student=6a-student-1` và giữ tham số khác.
- Dọn file preview tạm và server thử sau khi chụp; chỉ còn 6 file trong `src/features/homework`.

## 5. So ảnh 50–59, 62 — chỗ còn lệch

1. **Avatar**: dùng quy ước sẵn có của app (hai từ cuối) nên "Lê Khánh Chi" là **KC**, ảnh mock ghi **LC** (các em khác khớp: MA, GB, ĐD). Giữ theo app vì Điểm danh/Nhận xét cũng vậy.
2. **Số liệu**: tính thật từ seed nên hiện **8/9** và **7/9** (lớp 10 em nhưng 1 em đã rời lớp trước buổi), không phải 8/10 như ảnh mock. Đúng nguyên tắc "prototype tính số đếm thật".
3. **Sheet 52/53/54**: bám source (nền field `#F6F7F9` không viền, nhãn 13–14px, pill "Đã chấm n/total", nút xoá đỏ/nhạt, dòng "✓ Phụ huynh thấy ngay khi lưu"). Hộp xác nhận xoá là bổ sung theo yêu cầu, ảnh không có.
4. **Ngoài panel (không sửa)**: route thật hiện thêm thẻ "Người dạy" phía trên và "Bài giảng" phía dưới tab BTVN; ảnh 50–59/60 không có hai thẻ này. Thuộc `SessionDetailPage`/layout của Lính B, nên báo để lead/Lính B xử lý.
5. **Read-only**: thêm dòng "Bạn chỉ có quyền xem bài tập về nhà của buổi này." (ảnh không có trạng thái này; theo quyền `comments_reports`).
6. **Phần chưa chấm đủ**: khi đã chấm 9/9, dòng phụ hiện "0 còn Chưa chấm" (ảnh không có trạng thái đủ); có thể ẩn khi bằng 0 nếu lead muốn.

Không commit/push/deploy.
