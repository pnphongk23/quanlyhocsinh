# DA-5 · Web: đồng bộ + phiên (H2, H3, H4, H7-store)

Đọc `data-api-10-impl-common.md` trước. Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`).

## File được sửa
`src/data/sync.ts`, `src/data/auth/session.ts`, `src/data/store.ts`, `src/data/db.ts`, test mới/sửa trong `src/test/` (chỉ file test liên quan đồng bộ/phiên; KHÔNG sửa `src/app`, `src/features`, `src/roles`, `src/shared`). DA-6 đang sửa song song `src/data/repositories/*`, `src/data/auth/index.ts`, `src/data/api/*`, `src/data/outbox.ts` — không đụng các file đó. Nếu cần API mới từ `sync.ts` cho DA-6, giữ nguyên chữ ký `syncNow()`/`scheduleSync(delay)` đã export.

## Việc (đúng `plan.md` H2, H3, H4, H7 phần `store.ts`)
- H2: `initializeSession` không chờ mạng khi có phiên lưu (kể cả lần đầu); `/me` nền một lượt mỗi lần tải app và khi quay lại app (tối đa 1 lần/60 s); số thế hệ chống response cũ ghi đè (tăng khi đổi vai/đăng xuất/đăng nhập); lỗi 401/403/404/`account_disabled` xử lý như hiện tại; `activateMembershipCache` bỏ qua nếu identity không đổi; chọn vai dùng response `PUT /session/membership` thay vì gọi lại `/me` (nếu chọn vai nằm ở `auth/index.ts` thì chỉ cung cấp hàm trong `session.ts`, báo DA-6/lead cần nối; không sửa `auth/index.ts`).
- H3: snapshot song song ≤ 4 thực thể; bắt đầu bằng xoá mọi bảng thực thể của identity (giữ outbox); cursor/epoch ghi một lần sau khi mọi thực thể xong; một thực thể lỗi ⇒ không ghi cursor; hydrate dần (class, student, class_session trước).
- H4: kích hoạt `visibilitychange` (visible), `pageshow`, `focus`, `online`; interval 60 s chỉ khi `document.visibilityState === "visible"` (ẩn thì dừng, hiện lại thì kéo ngay); `syncNow` đang chạy ⇒ đặt cờ chạy thêm một vòng; hydrate chỉ khi pull có thay đổi hoặc outbox đổi; lỗi mạng khi outbox rỗng không bật trạng thái lỗi lưu.
- H7-store: nhận xét lấy `classId` từ buổi khi hydrate.
- Test (a)–(e) đúng `plan.md` bảng chia việc dòng DA-5, gồm **test 2 thiết bị** (máy chủ giả chung có change_log, 2 phiên, mọi loại dữ liệu liệt kê, ca phụ huynh). Dùng hạ tầng test sẵn có (`src/test/*`, fake-indexeddb nếu đã có).
- `npm run typecheck`, `npm test`, `npm run build` xanh (build kiểm bundle ≤ 200 KB). Nếu test của file DA-6 đỏ tạm do họ đang sửa, ghi rõ, không sửa file của họ.
- Commit file của bạn. Báo cáo `data-api/impl-da5-report.md`.
