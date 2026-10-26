# V-2 · Đo sau sửa (web + API)

Ngày đo: 2026-10-23. Chỉ đo staging; không sửa mã sản phẩm, không commit, không deploy.

## Đối chiếu deployment

- Web `https://qlh-staging-web.pages.dev` hiện trả build `f31150e`, Pages deploy `0b11361d`, entry `/assets/index-B8MD-40o.js`, khớp cập nhật của lead.
- `wrangler deployments list --name qlh-staging-api` cho version đang phục vụ `6f2338f6-acab-4596-be93-c162bb590d39`, khớp brief.
- `worker/wrangler.jsonc` cấu hình staging placement `gcp:asia-east2`. Tail không cung cấp số `cf-placement` đã đối chiếu riêng.

## Cách đo

- Kịch bản `measure.mjs`: Chrome headless, profile có phiên/cache sẵn, 3 mẫu cho mỗi mạng; 4G giả lập 150 ms, 9/1.5 Mbps. Tính trung vị từ 3 mẫu.
- Kịch bản multi-role dùng context mới và 4G. Có một lần chọn vai thành công; lần chuyển vai tiếp theo không hoàn tất do selector không tìm được thẻ vai trò. Do đó số cold snapshot bên dưới là một mẫu, không phải trung vị.
- Tài khoản workspace mới dùng cho hai thiết bị chỉ có một membership; bỏ qua đo đổi vai warm như hướng dẫn.
- Snapshot concurrency được đo riêng bằng CDP `Network.requestWillBeSent`/`Network.loadingFinished`, chỉ tính GET `/v1/sync/snapshot/*`; OPTIONS không được tính.
- Tail lọc theo User-Agent riêng của phép đo. Trung vị endpoint chỉ tính phản hồi HTTP 200; loại 204 rỗng/no-op.

## Kết quả

| Chỉ số | Trước | Sau | Mục tiêu | Kết quả |
|---|---:|---:|---:|---|
| Chuyển sang tab Nhận xét (4G) | 362 ms, 2 request | 10.8 ms, 0 request (3 mẫu) | <100 ms, 0 request chặn | Đạt |
| Chuyển sang tab BTVN (4G) | 330 ms, 2 request | 11.9 ms, 0 request (3 mẫu) | <100 ms, 0 request chặn | Đạt |
| Quay lại Điểm danh (4G) | 363 ms, 2 request | 13.3 ms, 0 request (3 mẫu) | <100 ms, 0 request chặn | Đạt |
| Mở app có phiên, trang đầu (4G) | 853 ms, 1 `/me` | 298 ms, 0 request trung vị (3 mẫu) | <300 ms, `/me` nền | Đạt sát ngưỡng; một mẫu 1,362 ms có 2 request |
| Chọn vai cold → nội dung đầu | 19.1 s tới mạng yên; 2.3 s tới nội dung | 427 ms tới nội dung; 1,949 ms tới mạng yên (1 mẫu) | <1 s; dữ liệu đủ <3 s | Mẫu đạt; chưa đủ số lần đo, chưa kiểm xong chuyển vai lần hai |
| Worker `/me`, wall (200) | 131 ms median | 91 ms median, n=16 | <100 ms | Đạt |
| Worker `sync/pull`, wall (200) | 70 ms median | 71 ms median, n=20 | <100 ms | Đạt |
| Worker CPU median `/me` / `pull` | 3 / 3 ms | 6 / 5 ms | — | Quan sát |

Các bước mở lớp, mở buổi và chuyển tab đều lấy dữ liệu từ cache; trung vị chuyển tab không phát sinh request. Thời gian client 4G tới response của `/me` và `pull` biến động giữa các lượt, nên bảng server wall lấy riêng từ tail.

Đo đồng thời snapshot trong lần đăng nhập của tài khoản hai thiết bị mới: mỗi context tải 11 GET `/v1/sync/snapshot/*`; đỉnh đang hoạt động là 4 ở A và 4 ở B. Bộ đếm bắt đầu từ `Network.requestWillBeSent`, kết thúc khi nhận `Network.loadingFinished` (hoặc `loadingFailed`), bỏ OPTIONS. Đây là số đo từ CDP, không suy ra từ Resource Timing.

## Waterfall và giới hạn

Ở lần chọn vai cold thành công, có 15 request API: PUT membership, GET `/me`, đầu snapshot, 11 trang snapshot theo thực thể và pull. Các trang snapshot khởi chạy chồng lấn. Resource Timing cho thấy tối đa 7 span, nhưng bộ đếm CDP độc lập trên hai context đăng nhập ghi nhận đỉnh đúng 4 GET snapshot đang hoạt động ở mỗi context.

Script đổi vai đã được chỉnh trong `/tmp` theo luồng `Cài đặt → Đổi vai trò → /chon-vai-tro`. Một lần chạy thành công chọn vai Quản trị viên; lần tiếp theo không tìm được nút thẻ vai trò ở `/chon-vai-tro`, vì vậy không đo được lần đổi vai warm. Các kết quả thô nằm trong `/tmp/qlh-data-api/measure/results-after.json`, `results-multirole-after.json`, `results-multirole-after-retry.json`; chúng không chứa SĐT hay nội dung nhận xét.

## Mục tiêu chưa xác nhận

- Chuyển vai lần hai với cache nóng: chưa đo được.
- Không trùng khi REST được gửi lại: chưa đo qua staging ở lượt này; kiểm tra đỏ hồi quy trên revision cũ được ghi tại `verify-v2-red.md`.
- Placement thực tế theo `cf-placement`: chưa thu được.

## Bổ sung

### Mẫu mở app 1.362 ms

Mẫu ngoại lệ là 4G run 2, bước `1b-open-app-first-page`: trong cửa sổ đo có đúng 2 request API, GET `/v1/sync/pull` (200, 1,276 ms; TTFB 153 ms; 109 B) và GET `/v1/me` (200, 1,304 ms; TTFB 153 ms; 652 B). Đây là phiên đã đăng nhập trên persistent profile. Từ luồng mã, trang đầu được render từ cache; `pageshow`/foreground kích hoạt pull nền, còn khởi tạo session gọi `/me` kiểu fire-and-forget. Vì vậy hai request chạy trong cùng khoảng đo nhưng không được await để chặn nội dung đầu tiên. Đây là suy luận dựa trên source và tương quan thời gian request; phép đo UI chỉ cho thấy chúng hoàn tất gần cuối cửa sổ 1.362 ms, không chứng minh quan hệ nhân quả từng mili giây.

### Tải snapshot và vai trò

Đếm đồng thời dùng CDP `Network.requestWillBeSent` bắt đầu và `Network.loadingFinished`/`loadingFailed` kết thúc, lọc GET `/sync/snapshot/*`, loại OPTIONS. Lượt hai thiết bị cho đỉnh 4 request GET cùng hoạt động ở mỗi context; đây là phép đếm sự kiện CDP, không phải Resource Timing. Tài khoản một vai không hỗ trợ thử warm switch nên được bỏ qua.

Thử multi-role bổ sung có 4 context mới; cả 4 POST `/auth/login` và GET `/me` trả 200. Không context nào phát `PUT /session/membership` hoặc GET snapshot vì locator `main .roleList button` không khớp DOM: `roleList` là CSS-module class. Bốn bước chọn vai lỗi `staff_card_missing`; thời gian tới picker khoảng 1.4 s không được tính là cold-to-content. Warm-cycle ghi lỗi/timeout hoặc context đóng, không có request đổi membership, vì vậy không tính là phép đo. Đã sửa selector trong script tạm thành `main button`, nhưng không chạy lại vì đã dùng đủ 4 lượt đăng nhập được phép cho tài khoản mới. Không ghi label vai trò/tên học sinh/PII vào artifact.

Đã chuẩn bị lại locator điểm danh (đổi trạng thái một học sinh mặc định có mặt trước khi lưu) và predicate báo cáo theo `general_comment`/`generalComment` không rỗng. Không thực hiện lần chạy xác nhận attendance/report bổ sung do đã hết lượt đăng nhập staging được phép cho tài khoản mới; giữ trạng thái các phép đo đó là chưa xác minh.

## Bổ sung 2

Không tạo workspace mới ở lượt cuối. Lượt trước ghi nhận đã dùng 5/5 lượt đăng ký `register:ip`/giờ; lần thành công gần nhất là 11:04 UTC và lần kiểm tra này lúc 11:16 UTC vẫn trong cửa sổ một giờ. Không có API chỉ đọc để xác nhận bộ đếm hiện tại sau khi các lượt cũ hết hạn, nên không gửi thêm request đăng ký. Do đó không có login đầu để dò DOM picker trong browser hoặc giữ context đo; không có lượt đăng nhập mới nào được dùng.

Kiểm source `RolePickerPage` cho thấy `roleList`/`roleCard` là class CSS Modules, nên selector literal `.roleList` không ổn định. Script tạm đã đổi sang `main button` và qua `node --check`; đây là kiểm tra source/syntax, không phải xác nhận DOM runtime. Multi-role cold/warm và attendance/comment hai thiết bị vẫn chờ lượt đăng ký hợp lệ.

## Bổ sung 3

Dùng workspace/tài khoản giả đã có; không đăng ký mới. Script tạm qua `node --check` trước khi chạy. Đầu tiên script dò cache IndexedDB theo tên dự kiến và dừng trước REST do tên DB không khớp; sau đó chuyển sang lấy token trong bộ nhớ từ response login và lấy lớp bằng REST. Token/định danh không ghi ra artifact. REST thêm liên kết học sinh trả 201; `GET /me` trả 200, xác nhận 2 membership (1 phụ huynh). Không gặp HTTP 429.

### Chọn vai cold, 4G

Mỗi mẫu là browser process/context mới; sau đăng nhập chọn vai nhân sự và đo đến nội dung trang đầu, sau đó chờ các API request yên. Mỗi mẫu có 15 request API không phải OPTIONS: `PUT /session/membership`, `GET /me`, 1 snapshot đầu, 11 snapshot theo thực thể và `GET /sync/pull`; tất cả trả 200. Các request snapshot chạy chồng lấn.

| Mẫu | Login → picker | Chọn vai → nội dung | Chọn vai → mạng yên/dữ liệu tải xong | Login → nội dung | Request API |
|---|---:|---:|---:|---:|---:|
| 1 | 885 ms | 363 ms | 1.866 ms | 1.248 ms | 15 |
| 2 | 845 ms | 356 ms | 1.910 ms | 1.201 ms | 15 |
| 3 | 916 ms | 363 ms | 1.861 ms | 1.279 ms | 15 |

| Mục tiêu plan | Số đo | Đối chiếu |
|---|---|---|
| Chọn vai → trang đầu <1 s | 356–363 ms, 3/3 mẫu | Đạt |
| Dữ liệu đủ <3 s | 1.861–1.910 ms, 3/3 mẫu | Đạt |

### Đổi vai warm, cùng phiên

Đo ba vòng phụ huynh ↔ nhân sự trong context cold mẫu 1. Request API không gồm OPTIONS.

| Vòng | Chuyển tới phụ huynh: nội dung / mạng yên / request | Chuyển lại nhân sự: nội dung / mạng yên / request |
|---|---|---|
| 1 | 2.209 / 3.395 ms / 13 | 1.067 / 1.792 ms / 2 |
| 2 | 496 / 1.222 ms / 2 | 491 / 1.217 ms / 2 |
| 3 | 508 / 1.236 ms / 2 | 501 / 1.228 ms / 2 |

Lần đổi phụ huynh đầu cần 13 request do tải snapshot cho membership phụ huynh mới được liên kết; các lần đổi sau dùng cache và chỉ có PUT membership cùng pull. Chỉ tiêu <1 s / <3 s nêu trên áp dụng cho chọn vai cold; số warm được báo cáo riêng.
