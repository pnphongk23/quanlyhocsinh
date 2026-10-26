# F-1 — Báo cáo sửa review r1

## Đã làm

- `GET /me`: 401 và 403 `account_disabled` xoá phiên; 403 quyền bị từ chối hoặc membership không còn active không hydrate cache membership đó. Membership khác còn active được chọn; nếu không còn, cache identity bị xoá và route quay về chọn vai trò/đăng nhập. Lỗi mạng/timeout/5xx giữ phiên offline.
- `sync/pull` và `sync/push`: 401 xoá phiên; 403/404 ẩn cache membership. Outbox không bị xoá; lệnh đang gửi bị từ chối được giữ ở trạng thái `rejected`, lệnh khi phiên hết hạn được giữ `pending`. `409 resync_required`/`snapshot_required` vẫn xoá cache và tải snapshot.
- Sửa lớp, thêm/sửa buổi lẻ, tạo/lưu trữ lớp, sửa lịch, thêm/sửa học sinh, huỷ buổi và lưu/phát hành báo cáo chỉ commit store sau khi REST thành công; modal sửa lớp/buổi lẻ giữ nguyên khi thất bại.
- Phiên chuyển sang `localStorage` để sống qua lần đóng/mở tab/PWA; phiên cũ trong `sessionStorage` được di trú một lần rồi xoá. Đăng xuất tiếp tục chờ máy chủ xác nhận và kiểm tra outbox trước khi xoá phiên.
- Thêm CSP cho app shell/manifest: giới hạn script cùng origin, API staging, Google Fonts; không có `innerHTML` trong `src`.

## Bảng thao tác ghi

| Thao tác | Offline qua outbox? | Chờ xác nhận đúng chưa? |
|---|---:|---:|
| Điểm danh, điểm, bài kiểm tra, BTVN, phiếu (kể cả gửi phiếu theo ngoại lệ đã chốt) | Có | Có; giữ lệnh tới khi có kết quả, lệnh bị từ chối được giữ lại |
| Tạo/sửa/lưu trữ lớp; đổi lịch | Không | Có; chỉ commit sau REST |
| Thêm/sửa buổi lẻ; huỷ buổi | Không | Có; chỉ commit sau REST |
| Thêm/sửa học sinh, đổi SĐT, đánh dấu nghỉ | Không | Có; chỉ commit sau REST |
| Lưu nhận xét báo cáo; phát hành | Không | Có; chỉ commit sau REST |
| Đăng xuất/đổi membership | Không | Có; chỉ đổi identity sau phản hồi máy chủ |

## Rủi ro

Token trong `localStorage` có thể bị JavaScript cùng origin đọc, tương đương IndexedDB. Giảm thiểu: không dùng `innerHTML`; CSP chặn script ngoài origin, chỉ cho phép API staging và nguồn Google Fonts cần thiết. CSP cần xác nhận trên Pages staging sau deploy. `localStorage` được chọn để giữ bước đọc khởi động đồng bộ với guard hiện tại, tránh đổi schema Dexie; guard vẫn đợi `initializeSession()` hoàn tất trước khi redirect.

## Kiểm chứng

- `npm run typecheck`: đạt.
- `npm test`: 24 file đạt, 1 file skip; 214 test đạt, 1 test skip.
- `VITE_API_BASE_URL=… npm run build`: đạt; JS đầu tiên gzip 146,257 byte (ngưỡng 200 KB).
- Test mới: khôi phục phiên sau reset module, xoá phiên, di trú `sessionStorage`, xử lý 401, membership inactive, giữ phiên offline; sync 403 ẩn cache và giữ lệnh `rejected`, 401 giữ lệnh `pending`.
- Commit: `563e3e5` (`fix(web): validate sessions and await network writes`).
- Staging: deploy thành công `https://9ca5eeda.qlh-staging-web.pages.dev`; cả URL deployment và `https://qlh-staging-web.pages.dev/` trả HTTP 200 cùng header CSP như cấu hình. Browser automation host không phản hồi, nên chưa xác minh lỗi CSP trong console hoặc đăng nhập còn sau khi tải lại tab; phần đó cần mở bằng trình duyệt có host hoạt động.
