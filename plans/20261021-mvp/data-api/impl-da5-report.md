# DA-5 · Web đồng bộ + phiên — báo cáo

Commit (nhánh `mvp-web`): `16204e9 feat(sync): non-blocking session check, parallel atomic snapshot and foreground-driven pulls`.

## Đã làm
- **H2** (`auth/session.ts`): `initializeSession` vẽ từ phiên + cache rồi trả ngay; `/me` chạy nền qua `checkSessionInBackground()` (một lượt tại một thời điểm, tối đa 1 lần/60 s; kích bởi mở app, `focus`, `pageshow`, `visibilitychange` visible). Số thế hệ `generation` tăng ở đăng nhập, đăng xuất, đổi vai, `updateMe`, `invalidateActiveMembership`; response `/me` thuộc thế hệ cũ bị bỏ (cả nhánh lỗi). 401/403 `account_disabled`/403/404 xử lý như trước. `activateMembershipCache` bỏ qua khi identity không đổi.
  - Chọn vai: `switchMembership` (`auth/index.ts`) vốn đã dùng response `PUT /session/membership` và không gọi `/me`; không cần nối thêm, không sửa file đó.
- **H3** (`sync.ts`): snapshot song song ≤ 4 thực thể, bắt đầu bằng xoá bảng thực thể + meta của identity (giữ outbox), cursor/epoch ghi một lần sau khi mọi thực thể xong, một thực thể lỗi ⇒ dừng các request còn lại, không ghi cursor; hydrate sau `class`, `student`, `class_session`. `stored()` (`db.ts`) nhận identity tường minh nên bản ghi không lẫn identity khi đổi giữa chừng.
- **H4** (`sync.ts`): `visibilitychange`(visible)/`pageshow`/`focus`/`online`; interval 60 s chỉ khi hiển thị. `syncNow` gọi lúc đang chạy ⇒ đặt cờ chạy thêm một vòng (cờ và `running` được xử lý trong cùng một tick nên không nuốt yêu cầu). Sự kiện nền khi đang chạy thì bỏ (vòng đang chạy pull sau đó). Hydrate chỉ khi pull có thay đổi hoặc outbox đổi. Lỗi mạng khi outbox rỗng không bật `error`.
- **H7-store** (`store.ts`): nhận xét lấy `classId` từ buổi.
- Sửa kèm: `createApiClient({ getToken })` trong `sync.ts` dùng hàm bọc lười; trước đó phụ thuộc thứ tự import vòng `sync` ↔ `session` và có thể nhận `getToken` là `undefined`.

## Test (file mới trong `src/test/`)
- `session-background-check.test.ts` (a, b): `/me` treo ⇒ `initializeSession` xong, điều hướng lặp = 0 request/0 hydrate; `/me` cũ về sau khi đổi vai không ghi đè; nền 401 và 403 `account_disabled` ⇒ xoá phiên, ẩn cache.
- `sync-snapshot.test.ts` (c): một thực thể lỗi ⇒ không có cursor, chạy lại đủ dữ liệu; thay đổi phát sinh trong lúc snapshot được pull lấy; bản ghi bị xoá trên máy chủ giữa hai lần thử không còn trong cache; outbox `rejected` còn sau snapshot; đồng thời ≤ 4.
- `sync-triggers.test.ts` (d): `visibilitychange`, `pageshow`, `focus`, tick 60 s kích pull, ẩn thì dừng, hiện lại thì kéo ngay; `syncNow` trong lúc chạy ⇒ thêm đúng 1 vòng; lỗi mạng outbox rỗng không bật lỗi, outbox có lệnh thì bật; hydrate chỉ khi có thay đổi.
- `sync-two-devices.test.ts` (e): máy chủ giả có change_log (`fixtures/fake-sync-server.ts`), mỗi thiết bị có IndexedDB riêng (`fixtures/device.ts`). A: thêm học sinh, buổi lẻ + huỷ buổi (ghi máy chủ như REST), điểm danh, bài kiểm tra + điểm, phiếu, BTVN (outbox thật qua `syncNow`). B thấy từng nhóm sau đúng 1 pull (`visibilitychange`, `focus`, tick 60 s). Ca phụ huynh: chỉ thấy dữ liệu của con, mọi hàng Dexie đúng identity, `classId` nhận xét lấy từ buổi.
- Sửa 2 test cũ theo hành vi mới (không yếu đi): `session-persistence` và `session-revocation` chờ `checkSessionInBackground()`; ca "initial GET /me bị từ chối" nay kiểm: vẽ cache ngay, sau 404 ẩn cache, sau xác nhận hiện vai khác.
- Không chạy được phiên bản đỏ trước khi sửa (test viết sau mã); các ca (c) và (e) kiểm hành vi mà mã cũ không có (cursor từng lượt, mất yêu cầu `syncNow`).

## Kiểm
- `npm run typecheck` xanh; `npx vitest run`: 364 passed, 1 skipped, ổn định 6 lần liên tiếp; `npm run build` xanh (gồm `check-bundle.mjs`).
- Cờ: lúc đầu có 2 test của DA-6/UI đỏ tạm (`rest-writes`, `reportsPreview`, `AddSessionModal`) — đã xanh ở lần chạy cuối, không sửa file của họ.

## Rủi ro / còn lại
- Người bị thu hồi quyền thấy cache thêm ~1 RTT khi mở app (đúng kế hoạch).
- Chưa đo số liệu mục tiêu trên staging (theo chỉ đạo lead: không chạy trình duyệt/staging).

## Bổ sung: seed script duyệt giao diện
Seed của `scripts/ui-click-check.mjs`, `ui-save-check.mjs`, `ui-audit-capture.mjs` mở `qlh-web` version 1, trong khi Dexie `version(1)` tương ứng IndexedDB version 10 ⇒ `VersionError` khi DB đã được app tạo. Đổi sang mở version 10 (chỉ phần seed). `db.ts` không đổi version. Kết quả (chỉ đọc pass/fail dạng chữ): `test:save` PASS 137/FAIL 0; `test:click` 21/0 ở lần chạy cuối (một lần trước đó 20/1 do "Element is not attached to the DOM" ở ca Xoá, chạy lại xanh, có vẻ chập chờn). typecheck, `npm test` (364 pass), build xanh.

## Bổ sung: giữ trạng thái giao diện + hết nháy "Chưa có bài kiểm tra"
1. `hydrateStore` giờ chỉ thay phần dữ liệu từ Dexie (+ `activeMemberId`, `pending`), giữ phần còn lại của store (`currentClassId`…) nếu cùng identity; `currentClassId` chỉ bị bỏ khi lớp đó không còn trong dữ liệu. Đổi identity ⇒ trạng thái giao diện về rỗng. Lead báo lead UI gỡ vá tạm trong StaffShell.
2. Chẩn đoán gốc mục 2 (dựng bằng `store-continuity.test.ts`, ghi mọi trạng thái trung gian của store): `pull` thường không gây rỗng. Nguồn là **snapshot khi cache đã có dữ liệu** (409 `resync_required`/`snapshot_required`, hoặc cache còn dở không có cursor): `snapshot` xoá mọi bảng của identity rồi ghi dần và hydrate sau `class`/`student`/`class_session`; lúc đó `tests`, `scores`… còn rỗng ⇒ store có trạng thái trung gian thiếu dữ liệu (test đỏ: `scores: 0`). Sửa: khi đã có dữ liệu cục bộ, snapshot tải hết vào bộ nhớ rồi xoá+ghi+cursor trong MỘT transaction, rồi mới hydrate (lỗi giữa chừng thì cache cũ còn nguyên); khi cache trống mới ghi/hydrate dần như trước. `hydrateStore` đọc 12 bảng trong một transaction đọc nhất quán, nên không đọc lẫn giữa hai lần ghi.
Test mới: `store-continuity.test.ts` (giữ lớp đang chọn; không có trạng thái trung gian thiếu `tests`/`scores`… khi dữ liệu không đổi, cả resync 409 lẫn pull thường). Kiểm: typecheck, `npx vitest run` 433 pass/1 skip (3 lần liên tiếp), build xanh.

## Bổ sung: hydrate chồng nhau (đường cache trống)
`hydrateStore` chỉ bỏ kết quả khi identity đổi, nên lần gọi cũ hơn cùng identity kết thúc sau có thể ghi đè lần mới (store lùi về thiếu `tests`). Thêm bộ đếm `hydrateSeq`: mỗi lần gọi lấy số, chỉ áp kết quả nếu vẫn là lần mới nhất đã bắt đầu. Test `store-continuity.test.ts` ("ignores an older hydration…") ép hai hydrate chồng nhau kết thúc ngược thứ tự: đỏ khi bỏ kiểm tra, xanh khi có. typecheck, vitest (3 lần), build xanh.

## Bổ sung: giảm thời gian chờ đẩy lệnh
`scheduleSync()` (không tham số) đổi từ debounce 2000 ms đặt lại mỗi lệnh sang trailing `SYNC_TRAILING_MS = 400` + `SYNC_MAX_WAIT_MS = 1000` tính từ lệnh đầu tiên chưa đẩy. `scheduleSync(n)` có tham số vẫn đẩy sau n ms. Một request push bay tại một thời điểm (đã có từ cờ `again`): lệnh đến lúc đó chạy thêm một vòng sau khi xong; mỗi push vẫn gom ≤ 50 lệnh pending, gộp theo `cell_key`; vẫn kéo ngay sau push. Test: `sync-schedule.test.ts` (trailing, max wait, single-flight, gộp `cell_key`; cả 4 đỏ với timing cũ, xanh với timing mới). Offline-plan dòng kích hoạt đồng bộ đã cập nhật.

Đo (`sync-latency-measure.test.ts`, chạy `MEASURE_SYNC=1 npx vitest run src/test/sync-latency-measure.test.ts`; máy chủ giả trễ 150 ms/request; "trước" = mã ngay trước thay đổi này):
| Kịch bản | Thời gian lệnh cuối → push xong (trước → sau) | Push (trước → sau) | Push+pull (trước → sau) |
|---|---|---|---|
| 1 lần lưu | 2154 → 556 ms | 1 → 1 | 2 → 2 |
| 8 điểm cách 150 ms | 2158 → 251 ms | 1 → 2 | 2 → 4 |
| Điểm danh cả lớp 30 em | 2178 → 596 ms | 1 → 1 | 2 → 2 |
Đánh đổi: nhập liên tục > 1 giây thì push mỗi ≈ 1 giây (8 điểm trải 1,05 s ⇒ 2 push) thay vì một push sau khi ngừng.
