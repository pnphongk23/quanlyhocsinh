# W-6 — staging phụ huynh, Lighthouse mobile và bundle

Ngày kiểm: 2026-10-23 · Worktree `mvp-web` · Staging: `https://qlh-staging-web.pages.dev`

## Kết quả kiểm tra

| Phần | Kết quả và bằng chứng |
|---|---|
| Đăng ký phụ huynh chưa có con | Form phụ huynh đúng chuỗi trong brief. POST đăng ký staging trả `429 rate_limited`; không thể xác nhận màn chưa có con, đổi mật khẩu và đăng nhập lại. Đã dừng thử đăng ký theo giới hạn của brief. Không lưu thông tin tài khoản vào repo/báo cáo. |
| Phụ huynh có hai con | Đăng nhập demo thành công. Đã kiểm Tổng quan, Điểm danh tháng, Điểm, Nhận xét, một Phiếu buổi học, BTVN và Báo cáo tháng ở 390×844 và 1360×934 ([Tổng quan](shots/w6/overview-sync-390.png), [Điểm danh](shots/w6/attendance-sync-390.png), [Điểm](shots/w6/scores-sync-390.png), [Nhận xét](shots/w6/comments-sync-390.png), [Phiếu](shots/w6/ticket-detail-390.png), [BTVN](shots/w6/homework-sync-390.png), [Báo cáo](shots/w6/reports-sync-390.png)). Đổi giữa hai con; báo cáo tháng chỉ hiện ở hồ sơ có bản phát hành, hồ sơ còn lại vẫn hiện trạng thái chưa phát hành ([con A](shots/w6/overview-child-a-390.png), [con B](shots/w6/child-b-report-390.png)). |
| Bản phát hành báo cáo cũ | Snapshot Dexie có 4 `report_publications`; màn Báo cáo tháng của con có bản mới nhất hiển thị đầy đủ và không vỡ khi mở cùng dữ liệu có bản cũ sai hình dạng trên staging. |
| In PDF | Nút “Tải PDF về máy” có trên báo cáo đã phát hành. Với `emulateMedia('print')`, nội dung báo cáo còn hiển thị; điều hướng và nút tải bị ẩn ([390](shots/w6/report-print-390.png), [1360](shots/w6/report-print-1360.png)). |
| Đổi vai trò và Dexie | Tài khoản Multi-role đổi phụ huynh ↔ quản trị viên bốn lượt ([chọn vai trò](shots/w6/multi-role-picker-390.png)). Màn phụ huynh không có liên kết lớp nhân sự; store đang hoạt động được hydrate theo membership. Ở lượt kiểm Dexie, membership phụ huynh có 1 lớp, 1 học sinh, 9 buổi; membership nhân sự không có entity cache trên tài khoản demo; quay lại phụ huynh vẫn chỉ thấy cache membership đó. Vì membership nhân sự demo không có dữ liệu nên chưa kiểm được cách ly với dữ liệu lớp thực. |
| Đăng xuất | Với demo phụ huynh có cache: phiên trong localStorage bị xóa, store đang hiển thị rỗng; các hàng Dexie vẫn còn trong IndexedDB nhưng không còn session để truy cập, tức cache được khóa thay vì xóa ([ảnh](shots/w6/multi-role-logout-390.png)). |
| Offline | Sau khi tải cache, tắt mạng và tải lại `/ph/btvn`: app shell mở, đề và kết quả BTVN đọc được từ Dexie (`navigator.onLine=false`). Bật mạng lại, `/sync/pull` chạy và nội dung vẫn đọc được ([ảnh](shots/w6/offline-homework-390.png)). Không thấy nhãn “cập nhật lúc …” trên màn đã kiểm. |
| PWA | Service worker có controller và đang điều khiển trang. Lighthouse 13 đã bỏ category PWA nên không có điểm PWA trong bảng dưới. |

## Lighthouse mobile

Đo `/dang-nhap` bằng Lighthouse 13, mobile emulation, Slow 4G (RTT 150 ms, 1.6 Mbps), CPU slowdown 4×. Hai lượt sau khi deploy cho kết quả Performance 74–78 do sai khác tải font/mạng; dùng lượt profile mới làm số chính.

| Hạng mục | Điểm / số đo |
|---|---:|
| Performance | 78/100 (dao động 74–78) |
| Accessibility | 100/100 |
| Best Practices | 100/100 |
| SEO | 91/100 |
| LCP | 3.9 s (lượt còn lại 4.4 s) |
| TBT | 0 ms |
| CLS | 0 |
| Chuyển tải màn đầu, lượt lạnh ban đầu | 284,268 B tổng; JavaScript 155,322 B, CSS 9,213 B, font 75,604 B, mascot WebP 28,779 B |

LCP còn chậm trong điều kiện mạng/CPU giả lập; Lighthouse nêu render-blocking tài nguyên font Google/CSS (tiết kiệm 1.44 s ở lượt cuối). SEO còn báo `robots.txt` sai với 25 lỗi vì staging trả HTML tại `/robots.txt`; không đổi chính sách index/crawl trong phạm vi W-6. Lighthouse dùng profile riêng nên không giữ phiên đăng nhập để đo `/ph` và `/lop` sau đăng nhập. Category PWA không còn trong Lighthouse 13.

## Bundle

Lệnh: `VITE_API_BASE_URL=https://qlh-staging-api.tolaphamnhuphong.workers.dev/v1 npm run build`.

| Phạm vi tải JavaScript | Gzip | Ngân sách 200 KB |
|---|---:|---:|
| Ban đầu | 146,240 B | Đạt |
| Tới màn đầu nhân sự | 158,644 B | Đạt |
| Tới màn đầu phụ huynh | 165,853 B | Đạt |

CSS gzip: đầu trang 2,799 B; cùng route đầu nhân sự 5,603 B; phụ huynh 7,133 B. Mascot tải riêng khỏi JS. Build có cảnh báo Vite về `api/client.ts` và `sync.ts` vừa được import tĩnh vừa được import động.

## Thay đổi và triển khai

- Lighthouse phát hiện thiếu meta description. Đã thêm mô tả không hiển thị vào [index.html](../../../index.html); `lang="vi"`, viewport và `display=swap` đã có sẵn.
- Không sửa màn phụ huynh hoặc desktop. UI hiện tại còn thanh 5 tab và bố cục desktop cũ; ghi nhận làm lại theo prototype `plans/20261021-mvp/design/ux-v2/` khi UX bàn giao.
- Deploy Pages staging thành công bằng Wrangler ([preview](https://250065e0.qlh-staging-web.pages.dev)); kiểm tra cả URL staging chính và preview đều trả meta description mới. Không deploy môi trường khác.

## Kiểm chứng

- `npm run typecheck` — đạt.
- `npm test` — 25 file: 24 đạt, 1 bỏ qua; 214 test đạt, 1 bỏ qua. Lượt suite đầu có một lỗi dao động ở route guardian; test riêng đạt 5/5 và chạy lại toàn suite đạt.
- `npm run build` — đạt (được chạy với `VITE_API_BASE_URL` trỏ staging), gồm typecheck và `check-bundle`.
- Đăng nhập và dữ liệu staging kiểm tra bằng Chrome/Puppeteer. Tất cả ảnh đã che số điện thoại; tài khoản, SĐT và token không ghi vào báo cáo.

## Ảnh staging

Ảnh 390×844 và 1360×934 nằm trong [`shots/w6/`](shots/w6/): Tổng quan, Điểm danh, Điểm, Nhận xét, Phiếu buổi học, BTVN, Báo cáo, chuyển con và xem trước in; ảnh offline và đổi vai trò ở kích thước tương ứng có sẵn. Màn đăng ký chưa có con không chụp được vì staging trả `429 rate_limited`.

Status: DONE_WITH_CONCERNS

Luồng xem dữ liệu, in báo cáo, đổi vai trò và cache offline đã được kiểm tra trên staging; meta description đã sửa và deploy. Cần backend mở lại giới hạn đăng ký để kiểm nốt luồng chưa có con, còn dữ liệu nhân sự Multi-role demo cần được seed để chứng minh cách ly với dữ liệu lớp thật.
