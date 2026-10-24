# Chẩn đoán gốc · chậm và mất đồng bộ (web staging, 2026-10-23)

Nguồn bằng chứng: `inventory.md` (DA-1, đọc mã; web HEAD `f79d640`, backend `8fac5d6`), `measure-before.md` (DA-2, đo staging), `two-device-before.md` (DA-3, 2 thiết bị), `wrangler d1 info`/`d1 insights`, `/tmp/qlh-data-api/tail*.jsonl` (lead tổng hợp theo colo). Lead đã tự đọc lại `src/app/routes.tsx:31`, `src/data/store.ts:36`, `src/data/sync.ts:69-85`, `src/data/auth/index.ts:24-27`.

## A. Vì sao chậm

| # | Nguyên nhân gốc | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| A1 | **Giả thuyết mạnh (xác nhận bằng số sau H1): Worker chạy xa D1.** D1 ở APAC; nhiều request từ máy đo (Việt Nam) được xử lý ở MRS/CDG/LAX. Mỗi request đi D1 4–5 lượt tuần tự (xác thực 3 lượt + dữ liệu), mỗi lượt là một vòng liên lục địa. SQL chỉ 0,07–0,65 ms/câu, CPU 3–16 ms. | Tail theo colo, wall trung vị: `/me` HKG 62 ms · SIN 266 · MRS 887 (n=60) · LAX 859; `pull` HKG 54 · MRS 717; `snapshot` HKG 39 · MRS 704. `d1 info`: `running_in_region APAC`. | Mọi request ×10–15 lần ở colo xa. Chưa đếm câu D1 từng request; Smart Placement chỉ chọn colo Worker từng chạy, có thể không cải thiện nếu traffic ít — đo lại tail theo colo sau H1. |
| A2 | **Loader gác route chạy lại mỗi lần điều hướng, kể cả đổi `?tab=`**: `await initializeSession()` → `GET /me` chặn, hydrate toàn Dexie 2 lần, `GET /sync/pull`. | `routes.tsx:31-32`; DA-2: mỗi lần đổi tab buổi học 2 request, tab hiện 330–360 ms (4G) ≈ thời gian `/me` 353 ms; quay lại danh sách buổi 3–7 request. | Chuyển tab Điểm danh/Nhận xét/BTVN bị chặn bởi mạng dù dữ liệu đã ở cache. |
| A3 | **Snapshot lần đầu = 13 request tuần tự** (1 header + 11 thực thể + pull), mỗi trang tính lại `meta`; hydrate chỉ ở cuối, không có trạng thái đang tải. | `sync.ts:69-85`; DA-2 (4G, workspace gần trống): chọn vai → trang đầu 2,3 s nhưng dữ liệu xong ở 19,1 s, ~1,3 s/request, response ~30 B. | "Chọn vai trò chậm", trang trống/thiếu dữ liệu hàng chục giây ở lần đầu/đổi vai. |
| A4 | **`GET /me` lặp và chặn**: mở app có phiên vẫn chờ `/me` trước khi vẽ (356 ms thường / 853 ms 4G); chọn vai gọi `PUT /session/membership` rồi `/me` thêm lần nữa. | DA-2 kịch bản 1b, 4b; `session.ts:74-111`. | Mở app, chọn vai chậm thêm 1–2 RTT. |
| A5 | `push` tuyến tính theo số lệnh (~2–4 lượt D1/lệnh); `pull` luôn chạy 11 câu JOIN kể cả khi trang rỗng. | `db/sync.ts:106-112,258-300`; `sync-read.ts:104-113`. | Phụ, khuếch đại bởi A1 (điểm danh 30 em ≈ 120 lượt). Chưa đo. |

Không phải nguyên nhân: CPU Worker (3–16 ms), tốc độ SQL, render (đọc cache 6–90 ms).

## B. Vì sao thiết bị B không thấy thay đổi của A

| # | Nguyên nhân gốc | Bằng chứng | Ảnh hưởng |
|---|---|---|---|
| B1 | **Không kéo khi mở màn / khi app trở lại**: chỉ `focus` (không bắn lại khi cửa sổ vốn đang focus), `online`, interval 120 s, loader. Không `visibilitychange`/`pageshow` ⇒ PWA iOS chạy nền có thể không bao giờ kéo khi mở lại. | `sync.ts:186-190`; inventory 3.2, 3.3 | B thấy sau ≤ 120 s khi tab mở, không giới hạn khi nền. |
| B2 | **`syncNow` nuốt yêu cầu đến sau** (`if (running) return running`), không chạy lại khi xong. | `sync.ts:130` | Thay đổi tới giữa lúc pull bị lỡ thêm một chu kỳ. |
| B3 | **Ghi REST (lớp, buổi, huỷ, đổi lịch, báo cáo) chỉ vào bộ nhớ**, `hydrateStore` sau đó ghi đè bằng Dexie ⇒ bản ghi vừa tạo chớp tắt/biến mất tới khi pull mang về. Thêm học sinh ghi Dexie fire-and-forget. | `classes.ts:19`, `sessions.ts:22,29,92`, `reports.ts:9-10`, `students.ts:9` vs `store.ts:21-40` | Chính máy A cũng có lúc "mất" dữ liệu vừa tạo. |
| B4 | **Dữ liệu cục bộ lệch máy chủ**: đổi lịch dựng buổi bằng `crypto.randomUUID()` (id khác máy chủ, cửa sổ 28 vs 56 ngày); "khôi phục buổi" chỉ cục bộ (spec không có thao tác này). | `sessions.ts:78-92` | Buổi "ma", điểm danh trên đó bị `rejected`; khôi phục mất sau đồng bộ. |
| B5 | **Snapshot ghi `cursor` từ trang đầu** ⇒ đứt giữa chừng thì các thực thể chưa tải thiếu vĩnh viễn (tới khi `epoch` đổi). | `sync.ts:79` | Một thiết bị có thể thiếu hẳn một loại dữ liệu. |
| B6 | **Nhận xét nạp từ Dexie với `classId:""`** ⇒ `listComments(classId)` rỗng sau tải lại. | `store.ts:36`; `ReportsPage.tsx:108`, `reportModel.ts:160` | Báo cáo tháng 0 sao/0 phiếu, trạng thái phiếu desktop sai. |

**Bằng chứng 2 thiết bị (DA-3, `two-device-before.md`, 4 vòng, workspace SĐT giả, 16 thao tác: lớp, học sinh, buổi, điểm danh, phiếu, bài kiểm tra, điểm, BTVN, báo cáo):** mọi thao tác của A ghi thành công (REST 2xx hoặc `applied`) và mọi loại dữ liệu đi cùng một đường `sync/pull` — **không mất dữ liệu ở máy chủ**. B chỉ thấy khi có `pull`: tick 120 s (độ trễ thực 32–120 s), `focus`, reload. **Chuyển trang trong app và `visibilitychange` không kéo** (B không thấy gì sau 8–12 s) ⇒ xác nhận B1 là gốc của "thiết bị B không thấy": trên iPhone/PWA quay lại app không phát `focus` cửa sổ ổn định, người dùng gần như chỉ thấy sau reload. Quan sát phụ (chưa lặp có kiểm soát): mở đường dẫn sâu lúc snapshot đang tải hiện "Không tìm thấy lớp" (A3); sau khi tạo buổi lẻ danh sách buổi chỉ hiện buổi đó tới khi tải lại (B3).

## C. Lỗi khác cùng lớp dữ liệu (GL/lead UI chuyển)
- C1 `changePassword` chờ `GET /me` sau POST ⇒ `/me` lỗi thì báo lỗi dù mật khẩu đã đổi (`auth/index.ts:24-27`).
- C2 `createStudent` (và các ghi REST khác) không có khoá chống trùng ⇒ gửi lại có thể tạo 2 bản ghi.
- C3 = B4 "khôi phục buổi" ngoài spec.

## Kết luận
Thiết kế đúng hướng (một nguồn đọc Dexie → bộ nhớ, ghi offline qua outbox, pull theo cursor) nhưng (1) hạ tầng: Worker không đặt gần D1; (2) cài đặt: kiểm phiên chặn mạng mỗi lần điều hướng, snapshot nhiều request tuần tự, trình kích hoạt pull thiếu; (3) nhóm ghi REST không đi qua cache bền và không chống trùng. Không cần đập lớp dữ liệu; cần sửa các điểm trên.
