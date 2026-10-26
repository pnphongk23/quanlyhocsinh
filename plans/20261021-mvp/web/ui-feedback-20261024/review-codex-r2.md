# Review Codex r2 — UI feedback 24/10

Candidate: mvp-web `1c60cc9507a432caf1e147662766e320b17f9dc3`; prototype/design working snapshot hiện tại.
VERDICT: CHANGES_REQUIRED

| Mức | F | File:dòng | Bằng chứng | Hành động cần |
|---|---|---|---|---|
| Cao (REQUIRED) | F8: timeout sau đóng/unmount | `src/features/closeAfterSaved.ts:4-5`; `src/features/class-space/AddSessionModal.tsx:73-75,98-103`; `src/features/settings/ChangePasswordPage.tsx:48-50`; parent `SessionsTab.tsx:199-203` | Promise timeout không thể huỷ. Trong 800 ms “Đã lưu”, nút Đóng của sheet đã bật lại; đóng rồi mở sheet mới thì callback cũ gọi `onClose` và có thể đóng sheet mới. Tương tự, đổi mật khẩu rồi chuyển tab trước khi hết 800 ms vẫn bị `navigate("/cai-dat")` kéo ngược về Cài đặt. | Gắn peek với lifetime/ý định đóng của form; huỷ hoặc bỏ continuation khi unmount/đóng tay, và chặn điều hướng stale. |
| Cao (REQUIRED) | F8: lưu trong dialog “rời màn” | `src/features/classes/NewClassPage.tsx:128-132`; `src/features/scores/NewTestPage.tsx:161-165`; `src/shared/ui/UnsavedChangesDialog.tsx:8-12,48-55` | Nhánh “Lưu” của guard gọi `guard.proceed()` ngay sau `action.submit()`, không chờ `savedPeek`; dialog chỉ biểu diễn saving, không có done. Các test ở `saveSettle.test.tsx:89-108` chỉ kiểm luồng submit thường. | Cho nhánh save-and-leave hiện xác nhận thành công và chờ peek trước khi proceed. |

## Đã xác minh

- Hai mục r1 đóng ở luồng thường: success peek đã thêm; scan diff lane không còn kích thước/màu/font hardcode ngoài token.
- `desktop.module.css:548` dùng `max-width: 1439px` cho breakpoint 1440. Chấp nhận: đây là mốc viewport cho media query, không phải kích thước UI; custom property không dùng được trong điều kiện `@media`.
- Web typecheck pass; `npm test`: 57 file pass, 1 skip; 416 test pass, 1 skip. Prototype typecheck pass; 60 file, 573 test pass.
- Artifacts hiện tại: state web 87 PASS/0 FAIL mỗi lượt ×3; test:save 158/0; test:click 19/2 (hai locator lỗi có ở baseline). `git diff --check` pass; ba token files giống hệt thư mục chính.

Kết luận: còn hai mục Cao; không phát hiện Chặn.

Bất định: prototype/design là working tree chưa commit, không có hash snapshot riêng.
