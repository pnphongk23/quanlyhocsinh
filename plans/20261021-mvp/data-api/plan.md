# Kế hoạch sửa · Dữ liệu + API (brief 66)

Chẩn đoán: `diagnosis.md`. Nguyên tắc: đơn giản nhất mà hiệu quả nhất; **giữ thiết kế hiện có** (một nguồn đọc Dexie → bộ nhớ, ghi offline qua outbox, pull theo cursor) vì nó đúng hướng, chỉ sửa các điểm gãy. Giữ quyết định đã chốt: Worker + D1, lệnh tới sau thắng, offline 5 thao tác (điểm danh, điểm, bài kiểm tra, phiếu, BTVN), thao tác khác cần mạng, chỉ hiện lỗi.

## Chỉ số mục tiêu (đo lại bằng script DA-2/DA-3)
| Chỉ số | Trước | Mục tiêu |
|---|---|---|
| Chuyển tab buổi học | 330–360 ms (4G), 2 request chặn | < 100 ms, 0 request chặn |
| Chọn vai trò → trang đầu có dữ liệu (4G, cache trống) | 19,1 s | < 1 s tới trang đầu; dữ liệu đủ < 3 s |
| Mở app có phiên (4G) | 853 ms chờ `/me` | vẽ từ cache < 300 ms, `/me` chạy nền |
| Wall máy chủ `/me`, `pull` (trung vị) | 266–887 ms (SIN/MRS) | < 100 ms |
| Thiết bị B thấy thay đổi của A | ≤ 120 s khi focus, không giới hạn khi nền | ≤ 1 lần đồng bộ: mở app / quay lại app (focus, `visibilitychange`) / ≤ 60 s |
| Ghi REST bị gửi lại | có thể tạo trùng | không trùng |

## Hạng mục

### H1 · Backend: Worker chạy gần D1 (A1) — `worker/wrangler.jsonc`
**Đã chốt sau đo (2026-10-23, GL duyệt):** Smart Placement thử trước cho kết quả `SUCCESS` nhưng request vẫn `local-<edge xa>` (LAX `/me` 855 ms) ⇒ chuyển sang `placement.region = "gcp:asia-east2"` (commit `d2b9c63`): edge LAX/SEA ⇒ `remote-HKG`, wall `/me` 859→78 ms (`verify-v1.md`). Đoạn dưới là phương án ban đầu.
Bật `"placement": { "mode": "smart" }` (cả env staging). Có ở mọi gói, kể cả Free (docs Cloudflare "Placement"). Smart Placement cần vài phút học lưu lượng: đo lại sau khi có traffic. Nếu không cải thiện rõ: thử `placement.region` gần D1 APAC (`gcp:asia-southeast1`) — đo cả hai, giữ cái tốt hơn. Không đổi hợp đồng.

### H2 · Web: kiểm phiên không chặn điều hướng (A2, A4) — `src/data/auth/session.ts`
- `initializeSession()` **không bao giờ chờ mạng khi đã có phiên lưu**: kể cả lần đầu sau khi tải app, nó trả ngay theo phiên + cache cục bộ (loader `routes.tsx:30-38` vẫn `await` nhưng không còn chờ `/me`). `GET /me` chạy nền: một lần mỗi lần tải app và khi app quay lại (focus/`visibilitychange` visible, tối đa 1 lần/60 s); chỉ có **một** lượt kiểm tra nền tại một thời điểm được phép cập nhật/thu hồi phiên. Không có phiên lưu ⇒ như cũ (về đăng nhập).
- Response `/me` cũ không được ghi đè lựa chọn mới: gắn số thế hệ (tăng khi đổi vai/đăng xuất/đăng nhập); response thuộc thế hệ cũ bị bỏ.
- Mở app có phiên lưu sẵn: vẽ ngay từ cache, `/me` chạy nền; kết quả 401/403/404/`account_disabled` vẫn xử lý như hiện tại (xoá phiên/ẩn cache rồi điều hướng). Thu hồi quyền vẫn có hiệu lực ở lần mở app/đồng bộ kế tiếp như spec mục 4; `pull` (409/403) cũng bắt được.
- `activateMembershipCache`: bỏ qua hydrate + sync nếu identity không đổi (hết hydrate 2 lần mỗi điều hướng).
- Chọn vai trò: dùng response `PUT /session/membership` (+ `me` đã có) thay vì gọi lại `/me`.
- Không sửa `src/app/routes.tsx` (loader vẫn gọi `initializeSession`, nhưng giờ là no-op). Nếu RR vẫn trì hoãn commit tab, đề nghị lead UI thêm `shouldRevalidate` (chỉ khi đo thấy cần).

### H3 · Web: snapshot nhanh và an toàn (A3, B5) — `src/data/sync.ts`
- Tải các thực thể **song song** (giới hạn 4 request cùng lúc), mỗi thực thể vẫn phân trang tuần tự; không đổi hợp đồng.
- Ghi `meta{cursor,epoch}` **chỉ sau khi mọi thực thể tải xong** (một transaction cuối); đứt giữa chừng ⇒ lần sau snapshot lại từ đầu.
- Một request thực thể lỗi ⇒ cả lần snapshot thất bại, không ghi cursor. **Mỗi lần snapshot bắt đầu bằng xoá mọi bảng thực thể của identity** (giữ `outbox`; `syncNow` đã push lệnh chờ trước khi pull/snapshot), nên dữ liệu của lần tải dở không bao giờ sót lại (kể cả bản ghi đã bị xoá trên máy chủ giữa hai lần thử).
- Hydrate bộ nhớ sau từng thực thể xong (`class`, `student`, `class_session` trước) để trang đầu có dữ liệu sớm.

### H4 · Web: kéo dữ liệu đúng lúc (B1, B2) — `src/data/sync.ts`
- Trình kích hoạt: mở app, `focus`, `visibilitychange` → visible, `pageshow` (bfcache/iOS), `online`, định kỳ **60 s** khi trang hiển thị (dừng khi ẩn), sau mỗi push, sau mỗi ghi REST thành công.
- `syncNow` khi đang chạy: đặt cờ `again`, chạy thêm một vòng sau khi xong (không nuốt yêu cầu).
- `hydrateStore` chỉ khi pull có thay đổi hoặc outbox đổi.
- Lỗi mạng trong pull định kỳ không bật trạng thái "lỗi lưu" khi outbox rỗng (chỉ hiện lỗi khi lưu/đồng bộ lệnh thật sự lỗi).

### H5 · Web: ghi REST đi qua cache bền (B3, B4) — `src/data/repositories/{classes,students,sessions,reports}.ts`
- Mọi ghi REST thành công: `await` ghi bản ghi trả về vào Dexie (cùng hình dạng `pull`) rồi cập nhật bộ nhớ, rồi `scheduleSync(0)`. Không còn dữ liệu chỉ trong bộ nhớ.
- Đổi lịch lớp: **không** tự dựng buổi bằng UUID cục bộ; sau `PATCH` gọi `syncNow()` để lấy buổi do máy chủ sinh (cần mạng sẵn, đúng spec).
- **Gỡ "khôi phục buổi"** khỏi lớp dữ liệu (spec mục 2/7 và api-spec không có thao tác này): `setSessionStatus` chỉ còn `cancelled`. Báo GL để lead UI gỡ nút (`SessionDetailPage.tsx:112`).

### H6 · Chống trùng ghi REST tạo mới (C2) — backend + web
- Backend: `POST /classes`, `POST /classes/{id}/students`, `POST /classes/{id}/sessions` nhận **`id` tuỳ chọn** (UUID do client sinh; sai định dạng ⇒ `422 validation_error` (quy ước hiện có)). Thứ tự xử lý: (1) xác thực + kiểm quyền + phạm vi + cha (lớp tồn tại, thuộc workspace, người gọi được vào lớp) **như hiện tại, trước mọi tra `id`**; (2) có `id` và bản ghi cùng bảng đã tồn tại **cùng workspace và cùng cha** (lớp: cùng workspace; học sinh/buổi: cùng `class_id`) ⇒ **200** bản ghi hiện có, không ghi gì (không `change_log`, không lịch sử, không thông báo); (3) `id` đã tồn tại ở bất kỳ nơi nào khác (workspace khác, lớp khác, hoặc bảng khác dùng chung không gian UUID) ⇒ `409 id_conflict` và **không** tiết lộ nơi tồn tại; (4) chưa có ⇒ tạo với `id` đó, 201. Ghi đồng thời cùng `id` ⇒ `PRIMARY KEY` chặn bản thứ hai, bắt lỗi ràng buộc rồi xử lý như (2)/(3). Không gửi `id` ⇒ như cũ (máy chủ sinh, 201, cùng hình dạng).
- Test backend: gửi 2 lần cùng `id` ⇒ 1 bản ghi, lần 2 trả 200 cùng thân, `change_log`/lịch sử không tăng; cùng `id` ở workspace khác ⇒ 409 không lộ dữ liệu; cùng `id` học sinh ở lớp khác cùng workspace ⇒ 409; người đã bị thu hồi quyền gửi lại `id` cũ ⇒ 403/404 như hiện tại (không 200); không gửi `id` ⇒ response giống hệt hiện hành (test cũ giữ nguyên).
- Web: sinh `id` một lần cho mỗi thao tác tạo (giữ qua các lần thử lại của cùng form).

### H7 · Lỗi nhỏ lớp dữ liệu (B6, C1)
- `store.ts`: nhận xét lấy `classId` từ buổi (`session_id` → `class_id`) khi hydrate.
- `changePassword`: thành công khi POST thành công; `GET /me` sau đó chạy nền, lỗi chỉ ghi nhận và thử lại ở lần `initializeSession` kế; không ném lỗi ra UI.

### Ngoài phạm vi (ghi lại, không làm lần này)
Gộp lượt D1 trong xác thực (3 lượt → 1 batch) và `pull` bỏ 11 câu khi trang rỗng: chỉ làm nếu sau H1 wall vẫn > 100 ms. Endpoint snapshot gộp một request: không cần nếu H1 + H3 đạt mục tiêu. Xem trước báo cáo tính ở client (inventory 4 #10): chưa đổi. Sửa `docs/architecture.md` mục 5 dòng "Xung đột" (vẫn tả cách cũ): đề nghị GL đồng bộ.

## Ảnh hưởng iOS
| Thay đổi | Hợp đồng? | Tương thích ngược | iOS phải làm |
|---|---|---|---|
| H1 Smart Placement | Không | Có | Không (chỉ nhanh hơn) |
| H6 `id` tuỳ chọn ở 3 POST tạo mới; trả 200 khi đã có; mã lỗi mới `409 id_conflict` | **Có (thêm mới)** | Có: không gửi `id` thì như cũ | Nên gửi UUID `id` cho tạo lớp/học sinh/buổi lẻ và coi 200 = đã tạo; xử lý `409 id_conflict` như lỗi |
| H4 đồng bộ định kỳ 60 s + khi quay lại app (thay 120 s trong `api-spec` 6.3) | Khuyến nghị tần suất (không phải hình dạng) | Có | Nên: pull khi app vào foreground và mỗi 60 s khi mở |
| H3 snapshot song song, cursor ghi cuối | Không (cách client dùng) | Có | Nên: chỉ lưu cursor sau khi tải xong mọi thực thể (cùng lỗi tiềm ẩn) |
| H5 bỏ "khôi phục buổi" | Không (chưa từng có endpoint) | — | Không có nút khôi phục buổi |
| H2, H7 | Không | — | Kiểm iOS có chờ `/me` sau đổi mật khẩu không (cùng lớp lỗi C1) |
Khi deploy staging H6: ghi `contract-changes.md` (ngày, endpoint, trước/sau, ví dụ JSON, việc iOS) và báo GL.

## Chia việc (worker claude/claude-sonnet-5-5, bypassPermissions, medium; tối đa 4, không chồng file)
| Gói | File sở hữu | Nội dung | Kiểm |
|---|---|---|---|
| DA-4 backend | `worker/**`, `plans/.../backend/api-spec.md` (mục POST tạo mới + 6.3) | H1, H6; deploy staging; `contract-changes.md` | test đỏ→xanh (gửi 2 lần cùng `id`), `npm run typecheck`, `npm test`; wall theo colo từ tail trước/sau |
| DA-5 web sync/phiên | `src/data/sync.ts`, `src/data/auth/session.ts`, `src/data/store.ts`, `src/data/db.ts`, test mới trong `src/test/` | H2, H3, H4, H7-store | test: (a) có phiên lưu ⇒ `initializeSession` xong không chờ `/me` (máy chủ giả treo `/me`), loader chạy lại khi đổi `?tab=` ⇒ 0 request; (b) `/me` cũ về sau khi đổi vai ⇒ không ghi đè vai mới; `/me` nền trả 401/403 ⇒ vẫn xoá phiên/ẩn cache như test hiện có; (c) snapshot: ngắt sau 1 thực thể ⇒ `meta.cursor/epoch` CHƯA có; chạy lại ⇒ đủ mọi thực thể + pull lấy thay đổi phát sinh trong lúc snapshot; song song có 1 request thực thể lỗi khi các request khác đã xong ⇒ không có cursor; bản ghi tải ở lần dở rồi bị xoá trên máy chủ trước lần thử lại ⇒ cache không còn bản ghi đó; lệnh outbox `rejected` còn giữ sau snapshot; (d) `visibilitychange`/`pageshow` kích pull; `syncNow` gọi trong lúc chạy ⇒ thêm 1 vòng; (e) **test 2 thiết bị**: 2 phiên (A, B) cùng user, cùng membership, Dexie tách theo phiên, máy chủ giả chung có `change_log`; A thực hiện: thêm học sinh (REST), tạo buổi lẻ + huỷ buổi (REST), điểm danh, điểm + tạo bài, phiếu, BTVN (outbox) ⇒ B thấy mỗi loại sau đúng 1 lần kích hoạt (`visibilitychange`, focus, hoặc tick 60 s); thêm 1 ca B là membership khác (phụ huynh) chỉ thấy dữ liệu của con, cache không lẫn identity |
| DA-6 web repositories | `src/data/repositories/*.ts`, `src/data/auth/index.ts`, `src/data/api/*.ts`, `src/data/outbox.ts` + test | H5, H6-web, H7-changePassword | test: ghi REST còn sau hydrate; đổi lịch không tạo buổi cục bộ; tạo học sinh gửi lại cùng `id`; đổi mật khẩu `/me` lỗi vẫn thành công |
DA-5 và DA-6 chạy song song (DA-6 chỉ gọi `scheduleSync`/`syncNow` đã export). DA-6 phụ thuộc hợp đồng H6 (viết theo plan; máy chủ cũ bỏ qua `id` nên không gãy).
Sau cùng: `npm run typecheck && npm test && npm run build` web; deploy web staging qua lead UI/GL (tránh đè); chạy lại script DA-2 (`measure.mjs`) và DA-3 (`two-device`), ghi `measure-after.md`, `two-device-after.md`, so trước/sau. Review tổng thể codex luna high (≤ 2 vòng). Cập nhật `api-spec.md` 6.3, `offline-plan.md`.

## Rủi ro
- Smart Placement có thể không chọn APAC nếu traffic thấp/lệch; có phương án `region`. Đo bằng tail theo colo.
- `/me` không chặn khi mở app: người bị thu hồi quyền thấy cache thêm ~1 RTT trước khi bị ẩn (spec cho phép "ẩn ở lần mở app/đồng bộ kế tiếp").
- Snapshot song song: tối đa 4 request đồng thời/1 người, an toàn với hạn mức 100k request/ngày Free.
