# DA-6 · Web: repositories (H5, H6-web, H7-changePassword)

Đọc `data-api-10-impl-common.md` trước. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`).

## File được sửa
`src/data/repositories/*.ts`, `src/data/auth/index.ts`, `src/data/api/*.ts`, `src/data/outbox.ts`, test mới/sửa cho các file này (đặt cạnh file hoặc `src/test/<tên-mới>.test.ts`). KHÔNG sửa `src/data/{sync,store,db}.ts`, `src/data/auth/session.ts` (DA-5 đang sửa), không sửa UI (`src/app`, `src/features`, `src/roles`, `src/shared`). Dùng `syncNow()`/`scheduleSync(delay)` đã export từ `sync.ts`.

## Việc (đúng `plan.md` H5, H6 phần web, H7 phần đổi mật khẩu)
- H5: mọi ghi REST thành công (lớp tạo/sửa, học sinh tạo/sửa, buổi lẻ tạo/sửa, huỷ buổi, báo cáo lưu/phát hành) ⇒ `await` ghi bản ghi trả về vào Dexie đúng hình dạng/khoá như `pull` lưu (xem `sync.ts` `stored()`/`keyParts` — chỉ đọc, nếu cần export thì báo NEEDS_CONTEXT), rồi cập nhật bộ nhớ, rồi `scheduleSync(0)`. Đổi lịch lớp: bỏ dựng buổi bằng `crypto.randomUUID()`; sau `PATCH` gọi `syncNow()`. Gỡ "khôi phục buổi": `setSessionStatus` chỉ nhận `cancelled` (kiểu + runtime); giữ export cũ nếu UI còn import để build không gãy (lead UI sẽ gỡ nút) — ghi rõ trong báo cáo chỗ UI còn gọi.
- H6-web: `createClass`, `createStudent`, tạo buổi lẻ gửi `id` UUID sinh một lần cho mỗi thao tác tạo, giữ qua các lần thử lại của cùng thao tác; 200 coi như tạo thành công; `409 id_conflict` ném lỗi tiếng Việt. Kiểm máy chủ cũ (chưa deploy H6) có từ chối trường lạ `id` không (đọc validation `worker/src/routes/{classes,students,sessions}.ts` trong `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend`); ghi kết quả vào báo cáo.
- H7: `changePassword` thành công khi POST thành công; `GET /me` sau đó chạy nền, lỗi không ném ra.
- Test: ghi REST còn sau `hydrateStore()`; đổi lịch không tạo buổi cục bộ; tạo học sinh gửi lại dùng cùng `id`, 200 ⇒ thành công, không trùng trong store; đổi mật khẩu với `/me` lỗi vẫn thành công; huỷ buổi vẫn gọi API.
- `npm run typecheck`, `npm test`, `npm run build` xanh. Test của DA-5 đỏ tạm thì ghi rõ, không sửa file của họ.
- Commit file của bạn. Báo cáo `data-api/impl-da6-report.md`.
