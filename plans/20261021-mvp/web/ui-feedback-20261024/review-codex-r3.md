# Review r3 — UI feedback 24/10

Candidate: `mvp-web` HEAD `6f12651884524081ae90d3b43b4b80480c7e7da4`; diff `1c60cc9..6f12651`, hẹp theo phạm vi được giao.

| Mức | F liên quan | File:dòng | Mô tả | Bằng chứng | Đề xuất sửa |
|---|---|---|---|---|---|
| Cao (REQUIRED) | Hệ trạng thái lưu / rời màn | `src/shared/hooks/useSavedPeek.ts:63-70`; `src/shared/hooks/useUnsavedCloseGuard.ts:52-55`; `src/shared/ui/UnsavedChangesDialog.tsx:70-75` | Khi lưu vẫn pending, nút “Ở lại” và Esc vẫn gọi `leave.cancel()`; lúc này chưa có peek để hủy. Khi `save()` resolve thành công, `run()` không kiểm tra lần hủy, đặt `done` rồi bắt đầu peek và gọi `proceed()` sau 800 ms. Người dùng chọn ở lại nhưng vẫn bị đóng/điều hướng. Test hiện có chỉ chọn ở lại sau khi `advance(400)` nên không bắt được thứ tự này. | Trích mã các dòng nêu trên; `useSavedPeek.test.tsx:136-145` xác nhận test chỉ hủy sau trạng thái đã lưu. | Vô hiệu hóa continuation của lần `run` hiện tại khi cancel (token/generation và kiểm tra sau `await save()`); thêm kiểm tra cho “Ở lại”/Esc trong lúc save pending, resolve save thành công rồi xác nhận không proceed. |

R2 đã đóng trong phạm vi này: `useSavedPeek` thay peek cũ bằng cách resolve `false`, hủy timer khi cancel và cleanup khi unmount (`useSavedPeek.ts:16-35`); các modal/sheet kiểm soát đường đóng tay qua `closeNow` gọi cancel (ví dụ `AddSessionModal.tsx:65-69,92-95`). Lưu-rồi-rời hiển thị `done` trước khi proceed; lỗi `false` không set done/proceed (`useSavedPeek.ts:63-74`, `guardedClose.test.tsx:115-127`, `useSavedPeek.test.tsx:124-155`). `HomeworkDesktop` dùng `submitForm(false)` để chỉ lưu, còn `leave.run` quản lý peek/proceed (`HomeworkDesktop.tsx:610-623,739-751`). Double submit được khóa ở `useSaveAction.ts:97-100`.

Kiểm tra: `npm run typecheck` — đạt; `npm test` — 58 file passed, 1 skipped; 424 tests passed, 1 skipped.

Kết luận: còn mục Cao ở trên; chưa thể ghi “Không còn Chặn/Cao”.

## Xác nhận sau sửa (1f26626)

Candidate `1f266266a2f03ac69712f97cef84fa3ca3cffb20`; diff `6f12651..1f26626`.

Mục Cao r3 đã đóng: `useSaveAndLeave` tăng generation khi cancel và mỗi run mới, rồi kiểm tra generation sau khi save hoàn tất và sau peek (`useSavedPeek.ts:53-76`); cancel trong lúc save pending không thể hiện “Đã lưu” hoặc gọi proceed. Dialog khóa “Ở lại” khi `saving`/`done` và chặn Esc ở hai trạng thái đó (`UnsavedChangesDialog.tsx:44-47,71-76`). Test mới kiểm tra cancel trong lúc save pending, run thay run cũ, cùng nút ở lại/Esc (`useSavedPeek.test.tsx:147-207`). Không thấy Chặn/Cao mới trong diff hẹp này.

Kiểm tra: `npm test` — 58 file passed, 1 skipped; 427 tests passed, 1 skipped.

Kết luận: Không còn Chặn/Cao.
