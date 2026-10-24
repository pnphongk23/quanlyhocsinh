# fixes-save-B: nút lưu/gửi/tạo, desktop giáo viên (2026-10-23)

Áp mẫu chung `useSaveAction`, `useLeaveGuard`, `Button loading`, `UnsavedChangesDialog` (xem `fixes-save-T.md`). Không sửa `src/data/**`, `src/shared/**`. Không thêm chip "Đã lưu".

## Theo ID
| ID | File | Thay đổi | Kiểm |
|---|---|---|---|
| B-S01 | `scores/ScoreGridDesktop.tsx` | `baseline` = điểm đã lưu mọi ô, `value` = baseline + nháp. Nút `disabled={!canSave}`. Ô sai bước 0,5 hoặc > điểm tối đa: nút tắt, dòng "Sửa N ô lỗi để lưu điểm", ô `aria-invalid`. Chỉ ghi ô đã đổi (không còn lưu một phần rồi báo lỗi). Gõ rồi sửa lại đúng giá trị cũ thì hết dirty. `useLeaveGuard` + `UnsavedChangesDialog`. Bỏ thông báo "Đã lưu N ô điểm" và "Không có thay đổi cần lưu" | Test (3) + trình duyệt: ban đầu tắt, sửa thì bật, rời sang tab Học sinh hiện hộp "Điểm chưa lưu", lưu xong tắt, không có chữ "Đã lưu" |
| B-S02 | `attendance/AttendanceDesktop.tsx`, `class-space/SessionDetailDesktop.tsx`, `class-space/SessionDetailPage.tsx` | Nút lưu theo `useSaveAction`; `onDirtyChange` chỉ tính ô người dùng đã sửa. Ba tab cùng gắn sẵn và chỉ ẩn bằng `hidden` (như mobile) nên đổi tab không mất nháp. Chặn rời màn bằng `useLeaveGuard` + `UnsavedChangesDialog` chung (thay `useBlocker` + `ConfirmDialog` tự viết; hộp thoại này phủ cả sidebar), hợp dirty của điểm danh và BTVN, "Lưu" gọi cả hai, lỗi thì không rời. Bỏ "Đã lưu điểm danh buổi…" | Test: lưu một lần dù bấm hai lần; đổi tab rồi quay lại vẫn giữ "Vắng" và dirty. Trình duyệt: sửa, đổi tab qua lại giữ nguyên, bấm sang "Lớp 6A" hiện hộp, "Lưu" xong mới đi |
| B-S03 | `homework/HomeworkDesktop.tsx` | Chấm: `useSaveAction` (nút tắt khi chưa đổi, về tắt sau lưu), nối `onDirtyChange`, `saveRef`; bỏ `setDrafts({})` khi đổi phần (trước đó mất nháp im lặng); bỏ "Đã lưu kết quả chấm…" và "Đã lưu bài tập". Soạn phần (`SectionForm`): `useSaveAction` (tiêu đề bắt buộc), nút "Lưu bài tập" ở đầu tab và "Lưu phần" cùng theo `canSave`. Sửa phần khác, Hủy, hoặc chuyển "Bài tập buổi trước" khi đang soạn dở thì hỏi (Lưu / Bỏ thay đổi / Ở lại) | Test: tắt → bật → lưu → tắt, báo dirty true rồi false |
| B-S04 | `students/StudentsDesktop.tsx` | Tách `AddStudentModal`: `useSaveAction` (tên bắt buộc), nút `loading` + `disabled`, bấm lần 2 không gọi. Đóng khi còn nhập dở thì hỏi | Test: `createStudent` chờ mạng, bấm Lưu hai lần + submit form, chỉ gọi 1 lần, nút `aria-busy` |
| B-S05 | `students/StudentsDesktop.tsx` | `PhoneModal`: `baseline` = SĐT hiện tại, nhập có kiểm soát, `validate` theo cùng mẫu với repository ("Số điện thoại không hợp lệ."), `loading`, hỏi khi đóng dở | Typecheck/test; chưa có test riêng |
| B-S06 | `students/StudentsDesktop.tsx` | `LeaveStudentModal`: khoá re-entry bằng ref, nút `loading`, lỗi hiện trong hộp (trước đó chỉ hiện ở trang phía sau) | |
| B-S07 | `scores/TestsDesktop.tsx` | `TestFormModal`: `useSaveAction` (tên không rỗng, ngày, điểm tối đa nguyên 1..1000; sửa thì phải có thay đổi), hỏi khi đóng dở. Bỏ `defaultValue`/FormData | Test: Tạo bài tắt khi thiếu tên hoặc max = 0, bật khi hợp lệ |
| B-S08 | — | Không lỗi | |
| B-S09 | `homework/HomeworkDesktop.tsx` | Xem B-S03 (`SectionForm`) | |
| B-S10 | `comments/CommentsDesktop.tsx` | **Đã xác nhận bằng mã**: `sendSessionTickets` chỉ bỏ qua phiếu `sent`, phiếu `sendQueued` vẫn được xếp thêm một lệnh `slip.send`. Desktop chỉ gửi phiếu `status === "draft"`; nhãn/đếm nút theo đó. Gửi xong các phiếu thành `queued`, đếm về 0, nút tắt | Test: 3 phiếu có sao, 1 đang queued → nút "(2)", repository nhận đúng 2 em |
| B-S11 | `class-space/SessionsDesktop.tsx` | `cancel` khoá bằng ref (repository: `cancelSession` gọi mạng `POST /sessions/:id/cancel`, hai lần song song là hai request) | Đọc mã; không test riêng |
| B-S12 | `class-space/SessionDetailPage.tsx` | Phát hiện thật: `restore` gọi `setSessionStatus` (async) mà không `await` nên lỗi không bao giờ vào `catch`. Đã `await` + khoá ref | |
| B-S13 | `class-space/ClassDesktopHeader.tsx` | Mục "Lưu trữ lớp" mở hộp xác nhận (`features/classes/ConfirmDialog`, không sửa file của A): tiêu đề "Lưu trữ lớp {tên}?", nội dung "Lớp sẽ ẩn khỏi danh sách. Dữ liệu điểm danh, điểm, nhận xét vẫn được giữ.", nút "Lưu trữ" (nguy hiểm, `busy` khi chờ mạng, khoá ref) và "Huỷ". Lỗi mạng: đóng hộp, hiện lỗi dưới header | Test `classDesktopHeaderArchive.test.tsx` (3): Huỷ không gọi; bấm hai lần chỉ gọi một lần; lỗi mạng. Ảnh `archive-confirm-1440.png` |

## Đọc repository (chỉ đọc)
- `createStudent`: `POST` mạng, không dedupe → bấm hai lần sẽ tạo hai học sinh (đã chặn ở UI).
- `updateStudentPhone`, `markStudentLeft`, `archiveClass`, `cancelSession`: `PATCH/POST` mạng, không idempotency key; lần chạy sau của `cancelSession` bị chặn bởi kiểm tra trạng thái nhưng hai lần song song vẫn gọi hai request.
- `setSessionStatus(id, "planned")` (khôi phục buổi): chỉ đổi trạng thái cục bộ, không gọi API (khác huỷ buổi). Có thể mất khi đồng bộ lại: hỏi lead Data+API.
- `saveScore` dùng id `${bài}:${em}`; điểm seed test (`createSeed`) dùng id khác nên test phải chuẩn hoá (đã làm trong test mới).

## Cần quyết định / báo lead
1. `Modal` (shared) chỉ gọi `onClose` sau animation ra, nên khi form dirty và tôi chặn đóng thì hộp thoại chớp mờ rồi hiện lại cùng hộp "chưa lưu". Gọn hơn nếu T thêm prop `beforeClose`/`dirty` cho `Modal` và `Sheet`.
2. B-S13: đã thêm hộp xác nhận theo duyệt của GL (xem bảng dưới).
3. Mục chuyển A không sửa: AddSessionModal, EditClassModal, EditClassSchedule; mobile `HomeworkPanel` không báo dirty khi rời màn.
4. `comments/CommentTicketSheet.tsx` (A) đang render `UnsavedChangesDialog` luôn gắn trong DOM, làm `sessionDetailTabs.test.tsx` ("sheet chỉ xem không có nút Lưu") hỏng. Không phải thay đổi của B; nên bọc `{open && …}` như ở các file của B.
5. `SessionDetailPage.tsx` đã được prettier định dạng lại toàn file (file gốc thụt lề lệch) nên diff dài, nội dung đổi nằm ở: import, `dirty`, `useLeaveGuard`, `cancel`/`restore`, `unsavedDialog`, props của `SessionDetailDesktop`.

## Khác biệt so với tài liệu/luồng cũ
| Mục | Trước | Sau | Nguồn |
|---|---|---|---|
| Lưu trữ lớp (desktop, menu ⋯ của header) | Chọn là lưu trữ ngay, không hỏi | Hỏi xác nhận (Lưu trữ / Huỷ), chặn bấm hai lần | GL duyệt |

## Lỗi mới phát hiện (ngoài ranh giới B, cần A)
- `features/classes/dialogs.module.css`: `ClassOptionsMenu` dùng lại `.scrim` (`z-index: var(--z-overlay)` = 100) còn `.menu` là `var(--z-menu)` = 40, nên lớp phủ che menu và chuột không bấm được mục nào trong menu ⋯ ở desktop (Playwright: `<div class="_scrim…"> intercepts pointer events` khi bấm "Lưu trữ lớp"). Menu cũng bị làm mờ. Gợi ý: `.menu` cao hơn `.scrim` (ví dụ `calc(var(--z-overlay) + 1)`) hoặc scrim riêng cho menu, trong suốt, thấp hơn `--z-menu`. Ảnh hưởng mọi menu dùng `ClassOptionsMenu` (Sửa lớp, Sửa lịch, Lưu trữ, Hủy buổi, menu hàng học sinh). Bàn phím (Tab/Enter) và bấm bằng script vẫn chạy.

## Test và kiểm
- Test mới `src/features/class-space/saveStatesDesktop.test.tsx` (9): lưới điểm (3), điểm danh (2), thêm học sinh chặn trùng, gửi phiếu bỏ queued, BTVN chấm, form bài kiểm tra.
- `desktopRender.test.tsx`: render trong `createMemoryRouter` + `RouterProvider` (vì `useBlocker` cần data router).
- Vòng bổ sung (hộp xác nhận lưu trữ): `npm run typecheck` xanh; `npx vitest run src/features/class-space`: 7 file, 57 test pass.
- Vòng đầu: `npm run typecheck` xanh. `npm test`: 41 file pass, 1 file fail (`sessionDetailTabs.test.tsx`, mục 4, lỗi của file A), 314 test pass, 1 fail. `npm run build` exit 0.
- Trình duyệt (1440×900, cổng 5184, dữ liệu giả): lưới điểm và điểm danh như bảng trên. Ảnh: `shots/ui-audit/save-states/after/B/{grid-dirty,grid-leave-guard,session-leave-guard}-1440.png`.
- Chưa kiểm trên mạng thật (các modal học sinh dùng `createStudent` mock trong test); chưa kiểm iPhone.

Status: DONE_WITH_CONCERNS
