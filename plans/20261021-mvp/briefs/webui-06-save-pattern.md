# webui-06 · Mẫu chung cho trạng thái nút lưu (Team T)

Đọc: `plans/20261021-mvp/web/ui-audit/save-states-plan.md` (yêu cầu 1–5, ranh giới), `docs/spec.md` mục 5.3 (dòng Offline) và bảng quyền mục 4 (cảnh báo rời màn). Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`.

## Việc
1. Đọc cách màn nhập điểm (`features/scores/TestScoresPage.tsx`, `scoreDrafts.ts`, `UnsavedChangesDialog.tsx`) và chi tiết buổi (`features/class-space/SessionDetailPage.tsx`) đang theo dõi thay đổi + `useBlocker`; đọc các repository ghi (chỉ đọc `src/data/**`) để biết hàm lưu đồng bộ hay Promise.
2. Làm trong `src/shared`:
   - `hooks/useSaveAction.ts` theo plan (re-entry guard bằng ref; `saving` cả với save đồng bộ — khoá tới hết tick/microtask; thành công → baseline = value; lỗi → giữ dirty; `isEqual` mặc định so sâu đơn giản cho object/array/primitive).
   - `hooks/useLeaveGuard.ts` (`useBlocker` + `beforeunload`) + chuyển `UnsavedChangesDialog` vào `shared/ui` (giữ file cũ re-export).
   - `Button` thêm `loading`; `ActionFooter` thêm `hint` (dòng lý do disabled, `aria-describedby`).
   - Không thêm chip/trạng thái "Đã lưu".
3. Test: hook (dirty/valid/canSave, bấm 2 lần chỉ gọi save 1 lần, Promise chờ, thành công về disabled, lỗi giữ dirty), leave guard (chặn khi dirty, cho qua khi sạch), Button loading.
4. Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/fixes-save-T.md`: API + ví dụ dùng (form đơn, danh sách nhiều hàng như điểm danh/điểm, sheet/modal), chú ý cho từng team.

## Ràng buộc
- Chỉ sửa `src/shared/**`, `src/app/**`, `features/scores/UnsavedChangesDialog.tsx` (thành re-export). KHÔNG sửa `src/data/**`, không sửa màn của A/B/C (họ áp mẫu sau). Nếu mẫu cần repository trả Promise/kết quả mà hiện không có → ghi rõ, không tự đổi.
- typecheck/test/build xanh. Không commit. Kết thúc bằng khối Status.
