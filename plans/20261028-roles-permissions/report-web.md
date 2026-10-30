# Báo cáo web: vai trò và phân quyền 1.1

Nhánh `mvp-web-roles` (worktree `mvp-web-roles`), commit `97615c3` + sửa sau review (xem cuối), tách từ c16d1f1. Không push, không deploy.

## Đã làm

- **API** (`src/data/api/{types,client}.ts`, `src/data/repositories/staff.ts`): `GET/POST /staff`, `PATCH/DELETE /staff/{id}`, `GET /roles/permissions`, `PUT /roles/{key}/permissions`, kiểu `StaffMember`, `class_ids` trên membership. Hàm `staffErrorMessage` đổi mã lỗi hợp đồng (`staff_exists`, `last_admin`, `role_not_editable`, `not_pending`, 422 theo trường) thành câu tiếng Việt.
- **Mục Nhân sự (chỉ Admin)** tại `/cai-dat/nhan-su`, link từ Cài đặt (mobile: dòng menu, desktop: thẻ). Người không phải Admin vào thẳng URL thấy `NoAccess` và không gọi API.
  - Danh sách: tên, SĐT đầy đủ, vai trò, lớp được giao, nhãn "Chờ đặt mật khẩu" / "Đã tắt quyền".
  - Thêm bằng SĐT (tên, Giáo viên/Trợ giảng, chọn lớp). Sửa: vai trò, lớp, tên (chỉ bản khai chờ), Tắt quyền/Bật lại (gửi `base_version`), Huỷ khai báo (DELETE bản khai chờ). Không cho tự tắt/sửa mình; hàng Admin chỉ xem và (với Admin khác) tắt quyền.
  - Ma trận quyền 2 vai trò × 5 nhóm × Không/Đọc/Sửa; "Lưu quyền" chỉ gửi nhóm đã đổi.
  - Cần mạng: ngoại tuyến thì khoá nút và hiện thông báo. Mobile dùng sheet, desktop dùng dialog, chỉ dùng token.
- **Đặt mật khẩu lần đầu trung tính**: `guardian_setup` giữ nguyên giá trị nhưng chữ không còn nói về con ("Đặt mật khẩu lần đầu để vào ứng dụng…"); lỗi `phone_not_declared` cũng trung tính. Sau đó vào `landingPathForSession`: ≥2 vai trò hoặc `active_membership_id` null → `/chon-vai-tro`; đúng 1 vai trò mà server trả null thì tự `PUT /session/membership`.
- **Chọn/đổi vai trò, thu hồi**: đã có sẵn (picker, Đổi vai trò, `invalidateActiveMembership` khi 403/404, lệnh chờ bị từ chối được giữ). Không phải đổi.
- **Audit ẩn/khoá nút theo quyền**: mọi màn lớp, học sinh, buổi, điểm danh, điểm, nhận xét, bài tập, báo cáo đã dùng `can()`/`useAccess()`; repository chặn bằng `requirePermission`. Staff chỉ thấy lớp được giao vì máy chủ chỉ đồng bộ lớp đó (`visibleClassIds` dựa trên store). Không phát hiện chỗ thiếu.

## Kiểm chứng

- `tsc --noEmit` sạch; vitest đầy đủ: 729 pass, 4 skip (trước 713). Test mới: `src/features/staff/staff.test.tsx` (mock API theo hợp đồng: không-Admin bị chặn, danh sách + ma trận, thêm, trùng số đã tắt, sửa/tắt/huỷ khai báo, last_admin, lưu quyền chỉ nhóm đổi, đặt mật khẩu lần đầu 2 vai trò → picker, 1 vai trò → tự chọn) và `staffModel.test.ts`.
- Chromium với API giả (không số thật): ảnh mobile 390 và desktop 1440 ở `shots-web/` (Cài đặt, Nhân sự, sửa, thêm), không tràn ngang. Script `capture-web.mjs`.
- Đã chạy với backend thật, xem mục live bên dưới.
- Không thấy test vitest flaky lần này.

## Chạy live trên staging (backend 1.1, Worker 421ef6af)

Bản build local `mvp-web-roles` 21ac772 (không deploy Pages), Chromium qua proxy Playwright (staging chỉ cho origin web của nó). Script `live-web.mjs`, ảnh `shots-live/` (SĐT được che trong DOM trước khi chụp; chỉ có số giả). Kết quả: mọi mục chức năng pass; hai mục script đánh fail là lệch hợp đồng của BE (mã lỗi, bên dưới) và một mục dọn dẹp chưa làm được. Chạy thành hai lượt (phần staff, rồi phần chéo workspace) vì bị rate limit đăng ký.

Pass:
- Admin thêm trợ giảng bằng SĐT mới (số giả) gán 1 lớp: bản khai `pending` có đúng `class_ids`.
- Đăng xuất, SĐT đó vào màn "Đặt mật khẩu" trung tính (không nhắc con/phụ huynh), đặt mật khẩu xong tự vào `/lop` (một vai, `PUT /session/membership` tự gọi). Bản khai thành `member/active` giữ lớp.
- `GET /me`: có `class_ids`, quyền mặc định Trợ giảng đúng (điểm danh/nhận xét sửa, lớp/học sinh/điểm đọc). UI chỉ thấy "1 lớp đang mở", không có nút tạo/sửa lớp; `POST /classes` 403.
- Sync cursor thật: `attendance.set` applied; `pull` từ cursor snapshot (9289→9291, 9296→9298) trả đúng dòng điểm danh; pull tiếp từ cursor mới rỗng, `has_more=false`. `score.set` trả `rejected/forbidden`; màn điểm không có ô sửa được.
- Admin vô hiệu hoá → lần gọi kế tiếp bị từ chối, UI về `/dang-nhap`; bật lại → đăng nhập lại vào `/lop` bình thường.
- Chéo workspace: workspace B thêm số của Admin A làm trợ giảng (membership `active` ngay). A đăng nhập → `/chon-vai-tro` có "Quản trị viên" và "Trợ giảng"; chọn Trợ giảng thì chỉ thấy lớp của B, Cài đặt không có mục Nhân sự; "Đổi vai trò" quay lại Quản trị viên thấy lại lớp A và mục Nhân sự.

Lệch so với hợp đồng (cho BE, web đã xử lý được cả hai):
1. Membership duy nhất bị vô hiệu: `GET /classes` trả `403 account_disabled`, hợp đồng nói `403 forbidden` + `details.reason = "membership_required"`. Web xoá phiên và về đăng nhập, đúng ý đồ cho tài khoản chỉ có một vai; chưa kiểm khi tài khoản còn vai khác.
2. `POST /sync/push` của membership bị vô hiệu trả `404`, hợp đồng nói `403`. Web coi 403 và 404 như nhau (giữ lệnh, `invalidateActiveMembership`).
3. `POST /auth/register` với dữ liệu rác trả `500` thay vì 422 (chỉ thấy khi thử `phone: "abc"`).
Ngoài ra: đăng ký bị rate limit chung (429, ~58 phút) sau vài lần đăng ký liên tiếp, gồm cả `register-guardian`.

Dọn dẹp chưa xong hoàn toàn:
- Nhân sự thử trong workspace smoke A đã vô hiệu hoá hết (script tự dọn; không xoá được thành viên đã có tài khoản).
- Tài khoản smoke A vẫn còn membership "Trợ giảng" ở workspace thử B ("Không gian thử B"). Người thêm là Admin B (SĐT giả, mật khẩu ngẫu nhiên đã mất), A không tự rời được, nên đăng nhập smoke giờ qua `/chon-vai-tro`. Cần BE/GL vô hiệu hoá membership này (D1) hoặc chấp nhận bước chọn vai trò trong smoke. Có thể bổ sung "tự rời workspace" ở 1.2.
- Bản ghi điểm danh `present` của 1 học sinh ở 1 buổi lớp smoke (do kiểm sync) vẫn còn.
- Workspace thử B và vài tài khoản giả tồn tại trên staging.

### Tái hiện register 500

Không tái hiện được; đây là toàn bộ bằng chứng còn lại (chỉ từ lệnh đã chạy, không gọi lại staging).

- Thời điểm: khoảng 12:06 (+07) ngày 28/10/2026 (~05:06Z), ngay sau khi hết rate limit 429 (retry-after 3487s nhận lúc ~11:06).
- Request: `POST https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1/auth/register`, một lệnh curl, header `content-type: application/json`, không có `Authorization`.
- Body đã gửi: `{"phone":"abc","password":"[redacted]","display_name":"x","workspace_name":"x"}` (cả bốn field là chuỗi, không có `email`; mật khẩu là chuỗi 1 ký tự). Không có SĐT thật.
- Status: `500`. Lệnh chạy với `-o /dev/null -w "%{http_code}"` nên **không lưu body response và không có `request_id`** của lần này.
- Lần cuối trước đó cùng endpoint (~11:06, body hợp lệ cùng cấu trúc) trả `429` `rate_limited` với `request_id` riêng; request hợp lệ sau đó (`phone` giả đúng định dạng) trả 201.
- Có thể lần 500 trùng thời điểm hạn mức vừa hết; chưa loại trừ được. Cần gọi lại đúng body trên (có `-i`) để lấy `request_id` nếu BE muốn điều tra.

## Deploy web 1.1 lên staging chính

- Nguồn: `mvp-web-roles` d0c1bd9. `git log mvp-web-roles..mvp-web` chỉ còn ed00762 (sửa 429), chính là d0c1bd9 đã cherry-pick; có `public/privacy.html`, `public/support.html` và c16d1f1. tsc sạch, vitest 734 pass (4 skip), build đạt với `VITE_API_BASE_URL` trỏ API staging.
- Deployment mới (Production, branch main): `d5f56343-dc52-44b0-ba16-a7cf5ebb7db4`. Deployment cũ để rollback: `6b088f5e-1c84-46e8-ab43-d5f1bf778800` (339a2b8).
- Smoke trên https://qlh-staging-web.pages.dev (không dùng staging-appreview, không gọi register, không thêm nhân sự): `/` 200 "Quản lý lớp tiếng Anh"; `/privacy` 200 "Chính sách quyền riêng tư"; `/support` 200 "Hỗ trợ người dùng". Đăng nhập tài khoản smoke Admin vào `/lop` (không qua chọn vai trò); Cài đặt có mục Nhân sự; `/cai-dat/nhan-su` mở được danh sách, nút "Thêm nhân sự" và ma trận quyền. Ảnh mobile 390 (SĐT che): `shots-live/deploy-smoke-nhan-su-390.png`, script `smoke-deploy.mjs`.

## Hạn chế

- Hàng Admin không đổi vai trò (hạ Admin) trên UI dù hợp đồng cho phép; chưa có trong phạm vi nên bỏ.

## Review cuối (codex gpt-6.1-sol, chỉ đọc)

Route guard Admin, ẩn/khoá theo quyền, `active_membership_id` null và tự `PUT /session/membership` (không vòng lặp, một vai gọi đúng một lần, nhiều vai không tự chọn), không lộ SĐT ra log/URL/toast: không có finding. 4 finding khác, đã sửa hết:

- P2 mất quyền giữa chừng (403 từ API nhân sự) vẫn giữ danh sách SĐT và editor: nay bỏ dữ liệu, đóng editor, báo lỗi và làm mới phiên (`/me`).
- P2 danh sách không gắn với membership: nay tải lại và bỏ dữ liệu cũ khi đổi membership, bỏ response của membership cũ.
- P2 phản hồi lưu quyền ghi đè chỉnh sửa đang làm: khoá các ô khi đang lưu.
- P3 editor vẫn ghi được khi ngoại tuyến: truyền `online`, khoá nút và chặn handler.
- Test thêm 3 ca (403, đổi membership, khoá ma trận). tsc sạch, 729 pass.

Status: DONE_WITH_CONCERNS
Summary: Web 1.1 xong, tsc + 729 test pass, chạy live staging pass toàn bộ kịch bản (sync cursor thật, vô hiệu/bật lại, chéo workspace).
Concerns/Blockers: 3 chỗ BE lệch hợp đồng (403 account_disabled, push 404, register 500); tài khoản smoke còn membership Trợ giảng ở workspace thử B cần BE vô hiệu hoá; chưa có đổi vai trò cho hàng Admin.

## Deploy web bản 1.2 (nhận xét theo tiêu chí, nhập từ ghi chú, nhập danh sách, quyền Gửi nhận xét) lên staging

- Ngày: 2026-10-30. Nhánh `mvp-web`, commit `a969be7`. Build với `VITE_API_BASE_URL` staging, `wrangler pages deploy dist --project-name qlh-staging-web --branch main`.
- Deployment mới (Production): `862e3631-ff48-4f71-8f54-9999157a05dc` (https://862e3631.qlh-staging-web.pages.dev).
- Rollback: `d5f56343-dc52-44b0-ba16-a7cf5ebb7db4` (web 1.1, commit d0c1bd9). Trước đó nữa: `6b088f5e-1c84-46e8-ab43-d5f1bf778800`.
- Kiểm trước deploy: tsc sạch, vitest 807 pass (4 skip), build + check-bundle pass.
- Smoke sau deploy (`plans/20261028-ai-features/smoke-deploy-12.mjs`, tài khoản QA web admin sẵn có, chỉ đọc, không bấm Lưu/Thêm/Gửi): `/`, `/privacy`, `/support` đều 200. Chromium và WebKit (iPhone 13 390 và 1440): đăng nhập, tab Nhận xét → "Theo tiêu chí", "Nhập từ ghi chú" tới xem trước, "Nhập danh sách" tới xem trước, Cài đặt → Nhân sự có hàng "Gửi nhận xét". Ảnh trong `shots-web/deploy-smoke/`.
- Console: Chromium 0 lỗi. WebKit 4 lỗi cùng loại "due to access control checks" cho `GET /v1/sync/snapshot` và `/v1/sync/pull` (khi điều hướng trang). OPTIONS preflight tới API trả 204 với `access-control-allow-origin` đúng origin, dữ liệu vẫn hiện đủ trong ảnh; nhiều khả năng là fetch bị huỷ khi `page.goto` (WebKit báo huỷ cross-origin là lỗi access control), chưa xác nhận trên Safari iOS thật.

## Deploy màn phụ huynh (lịch học của con) lên staging

- Commit mvp-web: `c75ebe3` (Buổi sắp tới + Lịch học của con), `dec7402` (trang chủ giới hạn 3 buổi gần nhất). Chưa push.
- Deployment mới (Production): `63de3ecc-1579-453e-8084-9a990d090877` (https://63de3ecc.qlh-staging-web.pages.dev), alias https://qlh-staging-web.pages.dev.
- Rollback: `862e3631-ff48-4f71-8f54-9999157a05dc` (bản web 1.2), trước đó `d5f56343-dc52-44b0-ba16-a7cf5ebb7db4`.
- Kiểm trước deploy: tsc sạch, vitest toàn bộ 814 qua/4 bỏ qua, build OK; test giới hạn 3 buổi fail khi nới giới hạn.
- Smoke trên alias chính (tài khoản QA phụ huynh, `shots-web/guardian-shots.mjs`, ảnh `plans/20261021-mvp/web/guardian-schedule/`): trang chủ đúng 3 buổi + "Tất cả", `/ph/lich` Tháng/Ngày, tháng ngoài cửa sổ gọi `GET /calendar`. Console lỗi: 0 ở cả Chromium và WebKit.
- Log mạng WebKit trên alias: không có response ≥400; các request `requestfailed` đều `errorText = "cancelled"` (`/sync/snapshot/{class,class_session,attendance,student}` khi script `page.goto` chuyển trang giữa lúc đang tải, và `/calendar` khi chuyển tháng nhanh bị huỷ bằng AbortController). Chromium tương ứng `net::ERR_ABORTED`. Không có lỗi CORS/access control trong lượt này.

## Lời chào theo tên người đăng nhập (trang Lớp) + đồng bộ token

- Lỗi: `ClassListPage` ghi cứng "Xin chào, cô Lan" và avatar "CL" (sót từ prototype). Sửa: lời chào "Xin chào, {display_name}" (không thêm cô/thầy; không có tên thì "Xin chào"), avatar lấy chữ cái đầu hai từ cuối của tên (cùng hàm với Cài đặt, đưa vào `src/shared/personName.ts`), không có tên thì biểu tượng.
- Quét `src/` (bỏ test/fixture/comment): không còn dữ liệu mẫu hiện ra UI thật. Còn lại chỉ là placeholder gợi ý trong ô nhập ("Cô Lan", "Lớp của cô Lan" ở đăng ký; "1. Nguyễn Thị An 0912 345 678" ở nhập danh sách) và `src/data/seed.ts` chỉ re-export fixture cho test, không được import từ code chạy thật.
- Commit mvp-web: `c763869` (đồng bộ 4 token), `5460d55` (lời chào). Chưa push.
- Kiểm trước deploy: tsc sạch, vitest 817 qua/4 bỏ qua, build OK.
- Deployment mới (Production): `0af926de-3829-400d-8640-54dc66719086` (https://0af926de.qlh-staging-web.pages.dev). Rollback: `63de3ecc-1579-453e-8084-9a990d090877`, trước đó `862e3631-ff48-4f71-8f54-9999157a05dc`.
- Ảnh trước/sau mobile 390 (tài khoản QA smoke): `plans/20261021-mvp/web/greeting/classes-before-390.png` (staging cũ: "Xin chào, cô Lan", "CL"), `classes-after-390.png` (preview local), `classes-live-after-390.png` (alias sau deploy: "Xin chào, {tên QA}").

## Tạm ẩn "Nhập từ ghi chú" và sửa thanh nút tràn (tab Nhận xét)

- Ẩn bằng cờ `FEATURE_NOTES_IMPORT = false` ở `src/shared/featureFlags.ts`; nút ở thanh dưới mobile (`CommentsPanel`) và thanh tab desktop (`CommentsDesktop`) chỉ hiện khi cờ bật. Mã `NotesImportDialog`, parser và test của B giữ nguyên (test B mock cờ = true; test mới xác nhận cờ tắt thì không có lối vào dù có quyền sửa).
- Lỗi tràn: ở 375/390 nút "Gửi phiếu cả lớp" bị cắt mép phải (nút thứ 3 right=558 > viewport). Sau khi ẩn vẫn còn tràn (2 nút right=399). Sửa `.footer` (`flex-wrap: wrap`, nút `flex: 1 1 auto; min-width: 0`): 2 nút xếp hàng dọc vừa khung ở 375/390/430, không nút nào bị cắt; khi không có quyền gửi chỉ còn nút "Gán tất cả mặc định" đủ rộng. Desktop không đổi (khối `@media` riêng).
- Commit mvp-web `41df522`. tsc sạch, vitest 819 qua/4 bỏ qua, build OK. Ảnh trước/sau: `plans/20261021-mvp/web/notes-import-hidden/comments-{before,after,live-after}-{375,390,430}.png`.
- Deployment mới (Production): `9ae26a9d-0980-4e70-807b-c98bd73c5924`. Rollback: `0af926de-3829-400d-8640-54dc66719086`, trước đó `63de3ecc-1579-453e-8084-9a990d090877`.

## Hồ sơ Cài đặt khi nhân sự chưa có tên (deploy staging)

- Commit mvp-web `f2c354e`: tiêu đề hồ sơ không còn "Chưa đăng nhập" khi đã có phiên (dùng "Chưa đặt tên"); avatar dùng `initialsOf`, không có tên thì hiện icon người (không "GV"); nhân sự không phải Admin thấy hàng tên chỉ xem kèm ghi chú "Admin đặt tên cho bạn".
- Kiểm chứng: tsc OK, vitest 822 passed / 4 skipped, build OK. Ảnh 390 trước/sau (giả lập display_name rỗng): `plans/20261021-mvp/web/settings-empty-name/`.
- Deployment: `22da9b3a-ce2b-4716-905c-8d31fe337334` (qlh-staging-web, main). Rollback: `9ae26a9d-0980-4e70-807b-c98bd73c5924`.
- Cài đặt hiện chưa có đường tự sửa tên cho bất kỳ vai trò nào (chỉ xem).

## Admin sửa tên nhân sự (deploy staging)

- Commit mvp-web `bd5d7db`: ô "Tên hiển thị" mở cho Admin với mọi nhân sự (kể cả chính mình, dòng Admin chỉ sửa tên); gửi `display_name` + `base_version` khi đổi; 422 hiện tại ô (rỗng / tối đa 100), 409 như lỗi version cũ; Admin tự đổi tên thì refetch `GET /me` để Cài đặt/lời chào đổi theo; `display_name` null (chưa có tên) không còn làm vỡ màn hình.
- Kiểm chứng: tsc OK, vitest 826 passed / 4 skipped, build OK. Smoke staging bằng QA admin: PATCH tự đổi tên rồi đổi lại đều 200, Cài đặt hiện đúng tên. Ảnh 390: `plans/20261021-mvp/web/staff-name-edit/`.
- Deployment: `06509c13-fd54-48e1-9914-72b6b9080597`. Rollback: `22da9b3a-ce2b-4716-905c-8d31fe337334`.
