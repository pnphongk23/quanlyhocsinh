# V-2 · Kiểm tra đỏ trên revision cũ

Ngày chạy: 2026-10-23. Tất cả test chạy trong worktree tạm detached; test và fixture được chép từ revision nêu dưới, `node_modules` dùng symlink. Các worktree tạm đã được gỡ sau khi chạy; không commit.

## DA-5 trên `3352c37`

Đã chạy 6 file: `session-background-check.test.ts`, `session-persistence.test.ts`, `session-revocation.test.ts`, `sync-snapshot.test.ts`, `sync-triggers.test.ts`, `sync-two-devices.test.ts` — **21 test: 7 đạt, 14 lỗi**.

Các lỗi phù hợp với hành vi cũ mà DA-5 sửa:

- Kiểm phiên nền: hai kịch bản timeout khi `/me` bị giữ vì đường khởi tạo cũ chờ request; các kịch bản khác báo `checkSessionInBackground` chưa tồn tại.
- Snapshot: cursor được ghi dù một thực thể lỗi; đo được peak 1 request nên không có song song.
- Trigger: không pull khi trang hiện lại; các lần gọi đồng thời không xếp lượt tiếp theo; pull lỗi khi outbox rỗng vẫn đổi trạng thái lưu; hydrate vẫn đọc bảng khi pull không đổi dữ liệu.
- Hai thiết bị: B không nhận thay đổi sau `visibilitychange`.
- Thu hồi phiên: một kịch bản timeout khi chờ xác nhận nền.

Không có lỗi import hoặc thiếu fixture. Các lỗi quan sát được là assertion hành vi cũ hoặc timeout do đường cũ chờ `/me`, không phải lỗi setup/import.

## Hai test đổi tại `aa82aef` trên `ff66e1c`

Chạy đúng hai test đã sửa trong `src/test/rest-writes.test.ts`: **2 lỗi, 0 đạt** (5 test khác được skip trong lượt xác nhận có chọn lọc).

- `keeps a created student after hydrateStore and reuses the id on retry`: đỏ vì payload cũ không có UUID; `ids[0]` là `undefined`.
- `only accepts cancelling in setSessionStatus`: đỏ vì mã cũ cho phép `planned` sau `cancelled`, thay vì reject.

Không có lỗi import/setup trong hai test này. Đây là kết quả đỏ mong đợi trên revision trước phần sửa; lượt này không chạy test trên revision hiện tại.
