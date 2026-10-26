# Handback · Domain Lead Dữ liệu + API (brief 66)

## 2026-10-23 · Mốc 1: rà soát + đo (đang chạy)
- Đã báo lead Backend cũ `b5705550` và lead Web cũ `960975fb`: tôi tiếp quản `worker/` và `mvp-web/src/data/**`.
- Worker (claude/claude-sonnet-5-5, bypassPermissions, medium; theo brief 66):
  - DA-1 `2c2cd43a` rà mã → `inventory.md` (brief `briefs/data-api-01-inventory.md`)
  - DA-2 `de038dc9` đo staging + wrangler tail → `measure-before.md` (`data-api-02-measure.md`)
  - DA-3 `a15ff3b5` 2 thiết bị, workspace SĐT giả → `two-device-before.md` (`data-api-03-two-device.md`)
- Tiếp theo: `diagnosis.md` → `plan.md` → review codex luna → báo GL trước khi sửa mã.

## Ràng buộc GL (2026-10-23): thay đổi hợp đồng API ⇒ báo iOS
- `plan.md` phải có mục "Ảnh hưởng iOS": từng thay đổi (endpoint, request/response, mã lỗi, lệnh sync, thứ tự đồng bộ) + tương thích ngược hay không. Ưu tiên thêm mới tương thích ngược; phá vỡ thì giữ đường cũ tới khi iOS chuyển.
- Khi deploy staging bản đổi hợp đồng: ghi `data-api/contract-changes.md` (ngày, endpoint, trước/sau, ví dụ JSON, việc iOS phải làm) và báo GL (GL chuyển lead iOS `7085080b`).

## DA-1 xong (DONE_WITH_CONCERNS) → `inventory.md`
Lead tự kiểm: loader gác route `src/app/routes.tsx:31` chạy `initializeSession()` mỗi lần điều hướng (cả đổi `?tab=`); `store.ts:36` nạp comments với `classId:""`; `sync.ts:79` ghi cursor của header ngay trong trang snapshot đầu — đúng như báo cáo. Chờ DA-2 (đo) và DA-3 (2 thiết bị).
- GL chuyển lỗi `changePassword` (POST ok + `/me` lỗi ⇒ UI báo lỗi): đã thêm vào `inventory.md`, phải có trong `plan.md` kèm test.

## DA-2 xong vòng 1 (DONE_WITH_CONCERNS) → `measure-before.md`
- Chuyển tab buổi học: mỗi lần gọi `GET /me` + `GET /sync/pull` chặn hiển thị; 4G 330–360 ms (thường 120–130). Mở lớp/buổi từ IndexedDB 6–90 ms. Mở app có phiên chờ `/me`: 356 ms / 853 ms (4G). CPU Worker 3–16 ms mọi endpoint; wall `/me` ~130 ms, `pull` ~70 ms, mỗi trang snapshot ~850 ms (chờ D1, không phải CPU).
- Thiếu: chọn vai trò (giáo viên demo chỉ 1 vai), waterfall snapshot phía client, thời gian D1. Đã giao DA-2 đo bổ sung bằng tài khoản Multi-role + `d1 insights`.
- GL chuyển thêm: (a) "khôi phục buổi" chỉ cục bộ, ngoài spec ⇒ gỡ ở lớp dữ liệu + báo lead UI gỡ nút; (b) `createStudent` không chống trùng ⇒ idempotency cho ghi REST. Đã thêm `inventory.md`, sẽ vào `plan.md` kèm test.

## DA-2 xong (đo bổ sung) + lead tự phân tích tail
- Chọn vai (4G, multi-role, cache trống): trang đầu 2,3 s nhưng đồng bộ xong 19,1 s: 15 request TUẦN TỰ (PUT membership, `/me` ×2, snapshot đầu, 11 snapshot thực thể ~30 B mỗi cái, pull), ~1,3 s mỗi request.
- D1 `qlh-staging-db` chạy ở APAC (`wrangler d1 info`), SQL 0,07–0,65 ms/câu (`d1 insights`).
- Lead tổng hợp `tail*.jsonl` theo colo: cùng endpoint, Worker chạy ở HKG nhanh (`/me` 62 ms, snapshot 39 ms, pull 54 ms), ở SIN `/me` 266 / pull 209, nhưng phần lớn request từ máy đo bị đưa sang MRS/CDG/LAX: `/me` 887 ms, pull 717, snapshot 704 (n: MRS `/me` 60, pull 47). ⇒ Worker chạy xa D1, mỗi lượt D1 (4–5 lượt/request) đi vòng liên lục địa.

## 2026-10-23 14:00 · Mốc 2: chẩn đoán + kế hoạch + review xong, CHỜ GL xác nhận trước khi sửa mã
- DA-3 xong: `two-device-before.md` (B chỉ thấy khi pull: tick 120 s/focus/reload; nav và `visibilitychange` không kéo). Heartbeat `5e1d9020` đã xoá.
- `diagnosis.md`, `plan.md` (H1–H7, Ảnh hưởng iOS, chia DA-4/5/6), review codex luna `877c0857` 2 vòng APPROVE_WITH_CHANGES, mọi REQUIRED đã nhận (`review-plan-r1.md`).

## 2026-10-23 · Mốc 3: GL duyệt plan, đang thực hiện
- GL duyệt H1–H7 + 3 điểm (gỡ khôi phục buổi — GL báo lead UI gỡ nút; pull 60 s chỉ khi hiển thị; `/me` nền).
- Worker (claude-sonnet-5-5, bypassPermissions, medium): DA-4 `4b5150c9` backend H1+H6+deploy+contract-changes (`briefs/data-api-11-backend.md`); DA-5 `719406ba` web sync/phiên H2/H3/H4/H7-store (`data-api-12-web-sync.md`); DA-6 `ee8719c8` web repositories H5/H6-web/H7 (`data-api-13-web-repos.md`). Chung: `data-api-10-impl-common.md`.
- Heartbeat dự phòng `data-api-impl-fallback` 30 phút.
- 16:24 worker chạy lại sau khi hết hạn mức phiên (dừng ~07:20–16:20). Người dùng yêu cầu tiết kiệm: kiểm chứng (đo, trình duyệt, ảnh, smoke dài) giao `codex/gpt-6-luna`; sonnet chỉ sửa mã + test đơn vị. DA-4 bỏ bước đo colo (chuyển cho verify luna).
- DA-6 xong (DONE_WITH_CONCERNS): commit `de3b6d4`, `impl-da6-report.md`; typecheck/build xanh, 47 file / 350 test (+7 trong `src/test/rest-writes.test.ts`). Chưa có bước đỏ ⇒ giao verify luna chạy test mới trên `de3b6d4^` (worktree tạm) để chứng minh đỏ. Máy chủ cũ bỏ qua `id` (an toàn). `saveReport` nháp chỉ bộ nhớ tới khi lưu nhận xét/phát hành.
- DA-4 xong (DONE_WITH_CONCERNS): commit `e9c8a5c`, staging `62494ada-c660-40e0-9ec0-9b71750e24d5`; test mới đỏ 10/14 trên mã cũ → xanh 14/14; 136/136; smoke staging H6 đạt. `contract-changes.md` + api-spec 5.1–5.3, 6.3 đã ghi. Plan sửa 400→422 `validation_error`. Giao thêm: chuẩn hoá `id` chữ thường (iOS UUID chữ hoa). Smart Placement CHƯA đo (giao verify luna).
- DA-4 thêm: chuẩn hoá `id` chữ thường, commit `2380c43`, staging `d2a6b1fd-a144-4ba2-85c6-81a69836959a`, 137/137. Hợp đồng H6 cuối ở `contract-changes.md` → báo GL chuyển lead iOS.
- V-1 `d8ad3df9` (codex luna high): đo Smart Placement trước/sau theo colo + chứng minh đỏ test DA-6 (`briefs/data-api-20-verify-backend.md`).
- GL/lead UI: Dexie v10 (DA-5) làm hỏng seed `test:click`/`test:save` và `sync-triggers.test.ts`; đã giao DA-5 sửa seed trong `scripts/` + chạy xanh 5 lệnh trước commit. Lead UI đã deploy web `f1d173f` (không gồm `de3b6d4`); deploy web tới phải dựng trên HEAD có cả hai và phối hợp GL trước.
- V-1 (luna) `verify-v1.md`: Smart Placement `SUCCESS` nhưng request vẫn `local-<edge>`: edge HKG `/me` 75 ms, edge LAX 855 ms (không cải thiện). DA-6 7/7 đỏ trên mã cũ; 2 test yếu ⇒ trả DA-6 sửa.
- Lead đổi sang placement hint `gcp:asia-east2` (commit `d2b9c63`, staging `6f2338f6-acab-4596-be93-c162bb590d39`); `/health` edge LAX/SIN ⇒ `cf-placement: remote-HKG`. V-1 đo lại.
- 17:00 DA-5 xong: `16204e9`, `fdca18f`; DA-6 sửa test `aa82aef`. Lead tự kiểm mvp-web HEAD `aa82aef`: typecheck 0, vitest 51 file / 364 đạt (1 bỏ qua), build xanh. `test:save` 137/0, `test:click` 21/0 (một lần 20/1 chập chờn, theo DA-5). Lưu ý: `f1d173f` (bản lead UI đã deploy) không phải tổ tiên của HEAD — hỏi GL trước khi deploy web.
- V-1 sau region hint: edge LAX server wall `/me` 859→78 ms, `pull` 699→56,5 ms (`remote-HKG`); client qua LAX vẫn ~840 ms (đường mạng Free). GL: giữ `gcp:asia-east2`.
- GL đồng ý deploy web: lead build `VITE_API_BASE_URL=…/v1 npm run build` ở mvp-web `aa82aef` (chứa `ff66e1c` + `3352c37`), `wrangler pages deploy` ⇒ `https://9aaf8521.qlh-staging-web.pages.dev`; `qlh-staging-web.pages.dev` phục vụ `index-CfpMkRY0.js` = dist.
- V-2 (luna) đo lại + 2 thiết bị + bước đỏ còn thiếu (`briefs/data-api-21-verify-after.md`).
- Review tổng thể r1 `61191cbf`: 2 REQUIRED + 1 OPTIONAL, nhận hết, giao DA-5/DA-6 sửa (`review-overall-r1.md`).
- DA-6 sửa REQUIRED 2: commit `d6cc676` (lỗi ghi Dexie ⇒ trạng thái lỗi + `await syncNow()` khôi phục), 366 test. Chờ DA-5 (REQUIRED 1 + OPTIONAL).
- DA-5 sửa REQUIRED 1 + OPTIONAL: commit `f31150e` (test đỏ→xanh). Lead tự kiểm HEAD `f31150e`: typecheck 0, 52 file / 368 đạt, build xanh. Chờ V-2 đo xong mới deploy lại web (tránh đổi bản giữa lúc đo).
- GL nghi r1 mỏng. Lead kiểm activity `61191cbf`: ~30 lệnh, đọc đủ diff backend+web và file db/repositories, nhưng báo cáo không đi qua H1–H7 và không nêu kết luận backend. Vòng 2 (cuối) giao reviewer MỚI `6480fc6f` (luna high) với brief bắt buộc liệt kê file đã đọc + bảng H1–H7 + chạy test (`briefs/data-api-31-review-overall-r2.md`), phạm vi đến `f31150e`.
- V-2 xong (DONE_WITH_CONCERNS): `measure-after.md` (tab 4G 362→10,8 ms 0 request; mở app 853→298 ms; chọn vai cold 427 ms tới nội dung, 1,9 s mạng yên (từ 19,1 s); Worker `/me` 91, `pull` 71 ms); `verify-v2-red.md` (DA-5 14/21 đỏ trên `3352c37` đúng lỗi cũ; 2 test DA-6 đỏ trên `ff66e1c`); 2 thiết bị CHƯA đo (context đóng, hết lượt đăng nhập). Lead deploy web `f31150e` (`0b11361d`, entry `index-B8MD-40o.js` khớp). Giao V-2 chạy lại 2 thiết bị bằng workspace giả mới + đếm đồng thời snapshot bằng CDP.
- Review tổng thể r2 `6480fc6f`: APPROVE_WITH_CHANGES, chỉ lệch docs H1 ⇒ lead đã sửa plan/contract. Review đóng.

## 2026-10-23 · Mốc 4: hoàn tất (staging), chờ GL
- V-2 (luna) `two-device-after.md` trên web `f31150e`: B thấy ngay ở `visibilitychange`/focus/reload (trước: chỉ focus/reload/tick 120 s); idle: 22–67 s phần lớn, 3 thao tác đầu chuỗi 71–79 s tính từ lúc ghi (tick 60 s; chưa rõ vì sao vượt 60 s — nghi trình duyệt hạ tần timer ở context đo). Pull đang chạy + `visibilitychange` ⇒ thêm 1 vòng (CDP). Snapshot đỉnh 4 GET đồng thời (CDP, bỏ OPTIONS). Chưa xác minh trên staging: điểm danh (locator script timeout; đường outbox có test đơn vị qua repository thật), nhận xét chung báo cáo (B có `report` upsert nhưng predicate script không khớp).
- Review tổng thể đóng (2 vòng). Docs: `plan.md` H1, `contract-changes.md`, `backend/offline-plan.md` (kích hoạt đồng bộ, snapshot, `/me` nền), `api-spec.md` 5.1–5.3/6.3 (DA-4).
- Commit: backend `e9c8a5c` `2380c43` `d2b9c63` (staging `6f2338f6-…`); web `de3b6d4` `16204e9` `fdca18f` `aa82aef` `d6cc676` `f31150e` (staging `0b11361d`). Chưa push/merge. Heartbeat đã xoá.
- GL hỏi 5 điểm hở. (5) đã xong: r2 reviewer mới `6480fc6f` có bảng H1–H7 + danh sách file. (1)(2)(3)(4) giao V-2 `c462f47e` đo bổ sung (idle có log pull CDP + visibility, điểm danh, nhận xét chung, đa vai trò tự tạo bằng SĐT phụ huynh = SĐT giáo viên, giải thích mẫu 1,36 s).
- V-2 bổ sung: (1) idle 3 vòng (2 Chrome riêng, B visible+focus): pull đều 56,9/60/60 s, B thấy ≤ 59,75 s sau 2xx, không pull bỏ sót ⇒ đạt ≤ 60 s, số 71–79 s cũ do pha timer + cách đo, không sửa mã. (4) mẫu 1.362 ms: `/me` + `pull` nền (không await), không chặn. (2)(3) chưa đo (locator CSS module, hết 4 lượt đăng nhập) ⇒ giao lượt cuối với workspace giả mới.
- V-2 NEEDS_CONTEXT: hết hạn mức đăng ký 5/giờ (lần cuối 11:04 UTC); không đăng ký/đăng nhập thêm. Heartbeat 1 lần 19:10 (giờ VN) để chạy lượt cuối (2)(3). Hỏi GL: cho dùng lại tài khoản giả cũ (quy tắc ≤ 2 lần đăng nhập/tài khoản chỉ để bảo vệ tài khoản demo) để chạy ngay?
- GL cho phép đăng nhập thêm tài khoản GIẢ hôm nay (dừng nếu 429, không dùng demo). Giao V-2 lượt cuối: điểm danh + nhận xét chung 2 thiết bị; đa vai trò cold 3 + warm 3. Heartbeat 19:10 `85083fc7` huỷ khi xong.
- V-2 lượt cuối (DONE): điểm danh `applied`, B thấy sau `visibilitychange` 212 ms (2,5 s từ lúc A lưu); nhận xét chung B thấy 421 ms. Chọn vai giáo viên cold 3/3: nội dung 356–363 ms, dữ liệu xong 1,86–1,91 s (đạt < 1 s / < 3 s). Đổi vai warm: lần đầu sang phụ huynh (membership chưa có cache) 2,2 s tới nội dung / 3,4 s mạng yên, 13 request; các lần sau ~0,5 s, 2 request. Heartbeat `85083fc7` đã xoá. Còn hở: vai phụ huynh lần đầu 2,2 s > 1 s.
- GL đổi: GL mới `122e9fde-ee5d-4862-8586-c25365e6a20b` (báo cáo qua send_agent_prompt). Đã gửi tóm tắt trạng thái + việc còn hở.
- GL mới `122e9fde` tự kiểm (backend 137/137, web 368, build = index-B8MD-40o.js staging) và ghi nhận mảng Data+API XONG staging. Vai phụ huynh lần đầu 2,2 s: chờ người dùng quyết. Push/merge: chờ người dùng.
- 2026-10-24 GL giao (từ lead UI 8237ac1e, F8): tạo/sửa lớp REST ok + cache Dexie lỗi ⇒ UI lỗi chung ⇒ thử lại dễ trùng. Giao DA-6 `ee8719c8` (sonnet): test đỏ, REST 2xx = thành công, cache lỗi xử lý nền + pull bù, thử lại dùng cùng id. Chỉ src/data/**; báo GL trước deploy.
- F8 xong: `d04c9e9` (REST 2xx = thành công; `error` chỉ khi kéo bù không khôi phục cache; thử lại mất phản hồi dùng cùng id). Lead kiểm typecheck 0, rest-writes 12/12; DA-6: 372 test + build xanh. Đã báo GL mới; chưa deploy.
- GL chấp nhận `d04c9e9`; không deploy riêng — deploy gộp cùng lane UI 24/10 khi lead UI xin. Data lane idle.
- 2026-10-24 GL giao 3 mục (lead UI 8237ac1e; staging web 1f26626 gồm d04c9e9): (1) saveHomeworkSection nuốt lỗi persistCommand ⇒ DA-6; (2) hydrateStore reset currentClassId ⇒ DA-5; (3) bảng điểm nháy tests rỗng ~20 ms ⇒ DA-5 chẩn đoán bằng test rồi sửa. Không deploy.
- Mục 1: `e09ca83` `saveHomeworkSectionDurable` (ném lỗi, hoàn bộ nhớ); lead UI phải đổi HomeworkPanel.tsx:624, HomeworkDesktop.tsx:723. 7 hàm khác cùng mẫu nuốt lỗi chờ GL quyết. Đã báo GL.
- GL quyết đồng nhất: DA-6 thêm `…Durable` cho 9 hàm; báo GL + lead UI 8237ac1e danh sách; sau khi UI chuyển hết chỗ gọi ⇒ xoá bản đồng bộ cũ cùng đợt.
- Mục 2+3: DA-5 `60fd9ac` (hydrate giữ currentClassId; snapshot khi đã có cache: tải hết rồi xoá+ghi+cursor trong 1 transaction, hydrate sau commit; hydrate đọc 12 bảng trong 1 transaction). 433 test. Lead thấy thêm: `store.ts:32` không bỏ kết quả hydrate cũ cùng identity ⇒ đường cache trống có thể lùi store ⇒ giao DA-5 thêm số thứ tự hydrate + test.
- DA-5 `001425d`: số thứ tự hydrate (bỏ kết quả cũ), test đỏ→xanh, vitest 434. typecheck/build đỏ tạm do `comments.ts` (DA-6 đang sửa, chưa commit) mà features import `flushQueuedTickets` ⇒ chạy lại build sau khi DA-6 xong.
- DA-6 `6ff3552`: 9 hàm `…Durable` (repositories/durable.ts), 445 test, build xanh. Thiếu `saveAttendanceBatch` (UI dùng cho điểm danh chính) và `setHomeworkGradeForAll` ⇒ giao thêm `…Durable`.
- DA-6 `872880c`: thêm saveAttendanceBatchDurable, setHomeworkGradeForAllDurable. Lead kiểm HEAD `872880c`: tc 0, 61 file / 448, build xanh. Đã báo GL (bảng 12 hàm `…Durable`, gỡ vá StaffShell, đo lại bảng điểm sau deploy). Chờ lead UI chuyển chỗ gọi ⇒ xoá hàm đồng bộ cũ.
- GL (người dùng chọn): giảm độ trễ push (trailing ~400 ms + maxWait 1 s, single-flight, gom 1 push, cell_key). Giao DA-5 + đo trước/sau bằng test máy chủ giả 150 ms (không dùng luna trình duyệt để tiết kiệm; GL cho phép đo bằng test).
- DA-5 `d751bd1`: trailing 400 ms + maxWait 1 s; đo test máy chủ giả 150 ms: 1 lần lưu 2154→556 ms (1 push), 8 điểm cách 150 ms 2158→251 ms (push 1→2), điểm danh 30 em 2178→596 ms (1 push). sync-schedule 4 test đỏ trên timing cũ → xanh. Lead kiểm: sync-schedule xanh; routes.test đỏ 1 ca — cây có thay đổi chưa commit của lead UI ở src/app/routes.tsx, shell.module.css (không thuộc data). Không kiểm được trên bản sạch (hook chặn symlink node_modules).
- Lead UI 8237ac1e: mọi call site đã sang `…Durable` (`29f099f`), đã gỡ vá StaffShell. Giao DA-6 xoá 12 hàm đồng bộ cũ + chuyển test src/test sang Durable.
- GL nhắc quy tắc contract-changes. Đợt 24/10 chỉ client web, backend vẫn `d2b9c63` ⇒ không đổi hợp đồng (lead đồng ý). Ghi chú cho iOS (không bắt buộc): offline-plan đổi khuyến nghị đẩy outbox từ ≈ 2 s sang 400 ms yên / tối đa 1 s.
- DA-6 `fc9f158`: xoá 12 hàm cũ. HEAD đỏ (typecheck/build + 5 test) do 4 file test UI còn import tên cũ ⇒ đã nhắn lead UI + GL (đề nghị Data sửa nếu được phép). Không deploy tới khi xanh.
- GL: lane UI tự sửa 4 file test; Data chờ, không đổi.
- Lead UI `c6f67c2` sửa 4 file test. Lead kiểm HEAD: tc 0, 64 file / 469 đạt (4 skip), build xanh. Báo GL: data 24/10 xong, chờ deploy gộp.
- GL 24/10: thêm cấm ps/pgrep -fl/-a/lsof vào brief chung.
- 24/10 khôi phục ô điểm demo: 6A · 'Kiểm tra 15 phút (demo)' · Minh Anh: 8→14 (gốc 14, từ score_history), version 5, history #10, change_log 1454. needs_republish báo cáo 10 đã =1 từ 22/10, giữ nguyên.
