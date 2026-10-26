# fixes-save-A: trạng thái nút lưu/gửi/tạo, team A

Mẫu dùng: `useSaveAction`, `useLeaveGuard`, `useUnsavedCloseGuard` (+ `beforeClose` của Modal/Sheet), `UnsavedChangesDialog` chung, `Button loading`, `ActionFooter hint` (đều ở `src/shared`). Không tạo hook dùng chung mới trong features (hai hook tạm `useDirtyClose`, `useBusyAction` đã xoá). Không sửa `src/data/**`, `src/shared/**`, `SessionDetailPage.tsx`, file `*Desktop*`.

## Quy tắc áp dụng
- Nút lưu `disabled={!action.canSave}` (chưa sửa hoặc không hợp lệ thì tắt); lưu xong về disabled; không có thông báo "Đã lưu".
- Chặn bấm 2 lần: `useSaveAction.submit` khoá bằng ref. Hành động xác nhận không có dữ liệu nhập (đánh dấu nghỉ, huỷ buổi, gửi phiếu, lưu trữ lớp) cũng dùng `useSaveAction` với `baseline: null`, `value` = id đối tượng.
- `loading` chỉ cho lưu cần máy chủ: tạo lớp, sửa lớp, sửa lịch, thêm học sinh, sửa/thêm buổi lẻ, phát hành báo cáo (một em, tất cả), gửi phiếu cả lớp.
- Modal/Sheet: `beforeClose={guard.beforeClose}` + `<UnsavedChangesDialog {...guard.dialogProps} />`. Sạch thì đóng ngay, dở thì hỏi (Lưu / Bỏ thay đổi / Ở lại), đang lưu thì không đóng. Màn trang (tạo lớp, tạo bài) dùng `useLeaveGuard` (điều hướng trong app và `beforeunload`).

## Bảng theo ID (findings-save-A, findings-save-B "chuyển A")
| ID | File | Thay đổi |
|---|---|---|
| S-A-01 tạo lớp | `classes/NewClassPage.tsx` | `useSaveAction` (value tên/ngày/giờ, validate), nút disabled + `loading`, `hint` "Nhập tên lớp và chọn ngày học để tạo lớp", `useLeaveGuard` + `UnsavedChangesDialog`; điều hướng sau khi state "đã lưu" render để không bị chặn bởi chính màn |
| S-A-02 sửa lớp | `classes/EditClassModal.tsx` | baseline = tên lớp, validate tên không rỗng, disabled/`loading`, `beforeClose` hỏi khi sửa dở; "Sửa lịch học" hỏi trước nếu đang sửa dở |
| S-A-03 sửa lịch | `classes/EditClassSchedule.tsx` | `useSaveAction` (isEqual so lịch kiểu tập hợp ngày, vẫn lưu được khi lịch trùng nhưng còn buổi cần sinh/xoá), `loading`; thay `window.confirm` bằng `UnsavedChangesDialog` chung (`guard.beforeClose()` trong `close`, Esc cũng qua đó) |
| S-A-04 thêm học sinh | `students/AddStudentModal.tsx` (**mới, của A**, tách ra khỏi `StudentsPage.tsx`), `StudentsPage.tsx` | form có state (trước đây FormData không điều khiển), validate tên, nút trong `footer` của Modal (`form=`) disabled + `loading`, `beforeClose` |
| S-A-05 đánh dấu nghỉ | `students/StudentsPage.tsx` | xác nhận khoá bằng `useSaveAction<string|null>` |
| S-A-06 buổi lẻ | `class-space/AddSessionModal.tsx` | `useSaveAction` (tạo: baseline rỗng nên lưu được ngay khi hợp lệ; sửa: baseline = buổi), validate ngày ≥ hôm nay + giờ, `loading` (PATCH chờ máy chủ, lỗi máy chủ ném ra để giữ modal), `beforeClose` (dirty = khác giá trị khởi tạo). Test `AddSessionModal.test.tsx` đổi: sửa ghi chú trước khi lưu, kiểm `aria-busy` thay chữ "Đang lưu…" |
| S-A-07 huỷ buổi | `class-space/SessionsTab.tsx`, `classes/ConfirmDialog.tsx` | `ConfirmAction.busy` (khoá nút); `useSaveAction<string|null>` theo id buổi |
| S-A-08 điểm danh | `attendance/AttendancePanel.tsx` | `useSaveAction` (baseline = bản ghi trong store, value = hàng đang chọn), nút `disabled={viewOnly || !canSave}` + `ActionFooter hint` "Chưa có thay đổi để lưu"; `onDirtyChange` và `saveRef` giữ API cho `SessionDetailPage` (điều hướng/đổi tab do `SessionDetailPage` của B xử lý) |
| S-A-09 điểm | `scores/TestScoresPage.tsx` | `useSaveAction` (baseline = điểm trong store, value = bản nháp, validate = không có ô lỗi), `useLeaveGuard` thay `useBlocker` (có `beforeunload`), "Sửa N ô lỗi" lấy từ `canSave` |
| S-A-10 sửa bài | `scores/TestScoresPage.tsx` (`EditTestModal`) | `useSaveAction` (validate tên, ngày, thang nguyên 1–1000), disabled, `beforeClose` |
| S-A-11 tạo bài | `scores/NewTestPage.tsx`, `scores.module.css` | `useSaveAction`, `useLeaveGuard`, nút trong `ActionFooter`, disabled khi chưa hợp lệ |
| S-A-12 xoá/lưu trữ bài | `scores/TestScoresPage.tsx` | khoá ref cho `remove`, bắt lỗi `deleteTest` |
| S-A-13 gửi phiếu | `comments/CommentsPanel.tsx`, `SendTicketsDialog.tsx` | `useSaveAction` theo danh sách em sẽ gửi, `busy` → nút `disabled` + `loading` |
| S-A-14 phiếu nhận xét | `comments/CommentTicketSheet.tsx` | `useSaveAction` (baseline = phiếu đã lưu), nút Lưu disabled khi chưa sửa, `beforeClose`; "Bỏ thay đổi" xoá nháp `sessionStorage`. Đổi chữ gợi ý nháp: "Bấm Lưu để giữ sao và ghi chú." (cũ: "…được giữ khi bạn đóng sheet", không còn đúng vì đóng khi dở nay hỏi) |
| S-A-15 tự lưu sao | `comments/TicketEditor.tsx` | bỏ dòng "Đã lưu phiếu · phụ huynh thấy thay đổi ngay" (spec 5.3) |
| S-A-16 BTVN | `homework/HomeworkPanel.tsx` | `SectionEditor`: `useSaveAction` (validate loại + tiêu đề), nút disabled + gợi ý, overlay/Esc qua `guard.beforeClose()`; **thêm prop `onDirtyChange` cho `HomeworkPanel`** |
| S-A-17, S-A-18 phát hành | `reports/ReportsPage.tsx`, `ReportPreview.tsx` | khoá một lần phát hành tại một thời điểm (ref + state `publishing`), `loading` ở nút "Phát hành"/"Phát hành tất cả", các nút khác khoá trong lúc gửi |
| S-A-19 nhận xét chung | `reports/ReportsPage.tsx` | bỏ "Đã lưu nhận xét chung."; chặn lưu trùng cùng giá trị (blur + gợi ý); `useLeaveGuard` khi nhận xét gõ dở chưa blur (dirty = bản nháp khác bản đã lưu) |
| Lưu trữ lớp (**GL duyệt**) | `classes/ArchiveClassDialog.tsx` (**mới**), `class-space/ClassSpaceLayout.tsx` | hộp xác nhận bằng `ConfirmDialog`: tiêu đề "Lưu trữ lớp {tên}?", nội dung "Lớp sẽ ẩn khỏi danh sách. Dữ liệu điểm danh, điểm, nhận xét vẫn được giữ.", nút "Lưu trữ" (nguy hiểm) và "Huỷ", khoá bấm 2 lần bằng `useSaveAction` |

## Cho B dùng lại
- **`ArchiveClassDialog`** (`src/features/classes/ArchiveClassDialog.tsx`): `<ArchiveClassDialog open classId className onClose onArchived? />`. B thay `archiveClass(classId)` trực tiếp ở `ClassDesktopHeader.tsx` bằng mở hộp này (state `open` ở header).
- **`ConfirmAction.busy`** (`classes/ConfirmDialog.tsx`): khoá nút trong hộp xác nhận.
- **`HomeworkPanel` `onDirtyChange`**: `SessionDetailPage.tsx:328` hiện là `<HomeworkPanel session={session} />`; B cần thêm `onDirtyChange={setHomeworkDirty}` để dirty BTVN mobile vào `dirty` của trang (tôi không sửa file đó).

## Cần T
- Không còn thiếu API. `useUnsavedCloseGuard`/`beforeClose` đủ cho Modal/Sheet. Hai chỗ không phải Modal/Sheet dùng `guard.beforeClose()` trực tiếp: `EditClassSchedule` (dialog tự dựng) và overlay của `HomeworkPanel` `SectionEditor`.
- `UnsavedChangesDialog` luôn render `<dialog>` kể cả khi `open=false`; tôi mount có điều kiện ở chỗ cần (CommentTicketSheet đã sửa để không còn `>Lưu<` trong DOM của test chỉ xem).

## Kiểm
- Test mới `classes/saveStates.test.tsx` (7): thêm học sinh (nút tắt khi chưa nhập, `submit` 2 lần chỉ gọi `createStudent` 1 lần, đóng dở thì hỏi và Bỏ thay đổi đóng, đóng sạch không hỏi), sửa lớp (tắt khi chưa sửa, `submit` 2 lần chỉ gọi `updateClass` 1 lần, tên rỗng tắt), lưu trữ lớp (đúng chữ GL duyệt, bấm 2 lần chỉ gọi `archiveClass` 1 lần, Huỷ không gọi).
- Playwright chuột thật ở 390: thêm học sinh (đóng dở hỏi, Ở lại giữ nhập, đóng sạch không hỏi), tạo lớp (rời dở hỏi, Ở lại, tạo xong điều hướng không bị chặn), menu ⋯ lớp mở được Sửa lớp, Sửa lịch học, Lưu trữ lớp (có hộp xác nhận). Nút Lưu tắt khi chưa sửa ở điểm danh, điểm, tạo lớp.
- `npm run typecheck` xanh. `npm test`: 44 file pass, 1 file fail, 336 test pass, 1 fail: `class-space/sessionDetailTabs.test.tsx` "buổi chưa tới ngày: sheet mở ở chế độ chỉ xem, không có nút Lưu": `SessionDetailPage.tsx` (của B) render `UnsavedChangesDialog` ("Chưa lưu thay đổi", nút "Lưu") ngay cả khi `open=false`, nên HTML chứa `>Lưu<`. Không do file của A. `npm run build` exit 0.
- Chưa kiểm trên iPhone thật.
