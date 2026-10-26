# Bug phát hiện khi chạy QA web

## Web

### WEB-002 · Không tạo được lớp chỉ học Chủ nhật — Đã sửa trên staging
- Trước sửa: chỉ chọn `CN`, giờ `18:00` khiến web hiện `validation_error`; tái hiện bằng Playwright headless, ảnh: `plans/20261021-mvp/qa/runs/2026-10-24/web/class-sunday-validation.png`.
- Sau deploy bundle `index-dIoNJYXu.js`: flow Playwright dùng Chromium/profile mới và chặn service worker tạo lớp thành công; trang Buổi học hiện `Buổi 1 · Chủ Nhật, 25 tháng 10 · 18:00` cùng lịch lặp Chủ nhật. Ảnh sau deploy: `plans/20261021-mvp/qa/runs/2026-10-24/web/class-sunday-validation-postfix.png`; TC-CLS-017 pass; JUnit: `plans/20261021-mvp/qa/runs/2026-10-24/web/sunday-class-validation-junit.xml`.
- Trạng thái: đã xác nhận sửa trên staging; chưa kiểm tra các Chủ nhật lặp tiếp theo vì màn này chỉ sinh/hiện buổi gần nhất trong lượt kiểm tra.

### WEB-003 · Buổi hôm nay bị khoá điểm danh theo UTC — Đã sửa trên staging
- Tái hiện: trên staging web với timezone `Asia/Ho_Chi_Minh`, tạo lớp T2 và buổi lẻ ngày 25/10/2026 (hôm nay theo giờ thiết bị), mở tab Điểm danh.
- Kết quả thật: hiện “Chỉ điểm danh được từ ngày học (25/10) trở đi. Bây giờ bạn chỉ xem hoặc huỷ buổi.”; bốn trạng thái bị khoá. JUnit xác nhận selector `getByRole(group, { name: Trạng thái của … }).getByRole(button, { name: Có mặt })` đã tìm đúng nút nhưng nút `disabled` (`aria-pressed=true`); đây là khóa từ app, không phải selector. Đã lặp lại hai lượt; ảnh: `plans/20261021-mvp/qa/runs/2026-10-24/web/attendance-four-states-failure.png`.
- Kết quả mong đợi: từ ngày học trở đi giáo viên chỉnh và lưu được điểm danh; TC-ATT-001/002.
- Bằng chứng chạy: `plans/20261021-mvp/qa/runs/2026-10-24/web/attendance-four-states-junit.xml`; hai testcase thất bại ở lần chọn trạng thái đầu, cùng DOM evidence.
- Khoanh vùng read-only: `SessionDetailPage.tsx` so sánh với `new Date().toISOString().slice(0, 10)` (UTC), còn `shared/format/index.ts` lấy ngày địa phương. Tại 01:19 +07, UTC vẫn là 24/10 nên buổi 25/10 bị coi là tương lai. Không sửa app trong lượt QA này.
- Chạy lại lúc 10:39 ICT ngày 25/10/2026: TC-ATT-001/002 pass ngoài khung 0–7 giờ VN; bug vẫn mở vì bản sửa chưa deploy và lỗi không tái hiện ở thời điểm này.
- Chạy lại trên bundle `assets/index-DHOAdBrF.js` lúc 10:44 ICT ngày 25/10/2026, Chromium mới và service worker bị chặn: TC-ATT-001/002 pass, cho phép sửa và lưu đủ trạng thái ở buổi hôm nay. Trạng thái: đã sửa trên staging; JUnit mới: `plans/20261021-mvp/qa/runs/2026-10-25/web/attendance-four-states-junit.xml`.

- Giới hạn kiểm: chưa kiểm biên UTC/ICT (00:00–07:00 giờ VN) sau bản sửa; cần chạy lại ATT-001/002 trong khung này khi có thể.

### WEB-004 · Liên kết phụ huynh thêm muộn không tải được trên web — Đã sửa trên staging
- Tái hiện: với SĐT hợp lệ 10 chữ số bắt đầu bằng 0, phụ huynh đăng ký trước và thấy trạng thái chưa liên kết; giáo viên thêm học sinh, lưu đúng SĐT đó, rồi phụ huynh tải lại trang.
- Kết quả thật: trang phụ huynh báo “Bạn không có quyền thực hiện thao tác này” và không hiện học sinh; không có selector timeout ở bước cập nhật phía giáo viên.
- Kết quả mong đợi: phụ huynh thấy học sinh được liên kết sau khi giáo viên khai số; TC-AUTH-009 fail; JUnit `plans/20261021-mvp/qa/runs/2026-10-24/web/guardian-late-link-junit.xml`. Cần kiểm tra endpoint/query liên kết muộn; không sửa app trong lượt QA.
- Chạy lại trên bundle `assets/index-DHOAdBrF.js` lúc 10:43 ICT ngày 25/10/2026, Chromium mới và service worker bị chặn: phụ huynh đăng ký trước, giáo viên thêm học sinh với số khớp, phụ huynh tải lại và thấy học sinh. TC-AUTH-009 pass; JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/guardian-late-link-junit.xml`. Trạng thái: đã sửa trên staging.


### WEB-005 · Lỗi chunk sau deploy/SW — Đã sửa trên staging (bundle BhzpF4oY)
- Kiểm tra Chromium headless với profile/context sạch, service worker bật tự nhiên. Bundle xác nhận `assets/index-BhzpF4oY.js`; SW active và controlling. Mở lần lượt `/`, `/lop`, bảng điểm lớp smoke và chi tiết bài kiểm tra từ UI; detail không hiện “Không thể mở màn hình”. Hai normal reload pass, không có lỗi chunk/dynamic import.
- Sau khi online làm ấm cache asset, reload offline ở cả bốn route đều mở app shell; reconnect và reload online từng route đều phục hồi, bundle BhzpF4oY. Có request API `/v1/me` và `/v1/sync/pull` thất bại do offline như dự kiến; không có request asset `/assets/*` lỗi. Kết quả 12/12 pass; JUnit/JSON: `plans/20261021-mvp/qa/runs/2026-10-25/web/sw-deploy-recovery-junit.xml`, `sw-deploy-recovery.json`.
- Lượt trước bundle `index-DMd61nmq.js` còn lỗi offline; ảnh đã lưu riêng tại `sw-deploy-recovery-DMd61nmq-offline-failure.png`. Staging hiện không còn bundle `Cp4GJ8XB`, nên chưa kiểm đường nâng cấp từ SW cũ; cần người dùng xác nhận trên trình duyệt giữ SW cũ.

### WEB-006 · Nút Lưu điểm desktop che hàng cuối — Đã sửa trên staging (bundle C8aXCZci)
- Tạo qua UI workspace smoke lớp `QA-2860a5-Scores-Sticky` với 10 học sinh và bài kiểm tra QA, bundle `index-BhzpF4oY.js`.
- Desktop 1440×900: nút `Lưu điểm` ghim trong viewport và lưu được, nhưng phủ lên dòng cuối: nút y=812..864, dòng cuối y=848.75..906.25. Mục tiêu là nút vẫn bấm được khi cuộn mà không che dòng cuối. JUnit/geometry: `plans/20261021-mvp/qa/runs/2026-10-25/web/scores-save-sticky-recheck-junit.xml`, JSON: `scores-save-sticky-recheck.json`; ảnh: `scores-save-sticky-desktop-recheck.png`.
- Mobile 390×844: nút trong viewport và bấm lưu được; dòng cuối kết thúc tại y=687.94, nút bắt đầu y=703.94, không che hàng; ảnh `scores-save-sticky-mobile-recheck.png`.
- Chạy lại trên bundle `assets/index-C8aXCZci.js`, Chromium profile sạch. Đã cuộn hết vùng nội dung thực (`.staffContent` trên desktop; trang trên mobile): desktop 1440×900, `scrollTop=235`, dòng cuối y=652.75..710.25, nút y=812..864; mobile 390×844, dòng cuối y=630.44..687.94, nút y=703.94..755.94. Nút đang bật và hàng cuối không bị che ở cả hai kích thước; không lưu thay đổi thử.
 - JUnit/JSON: `plans/20261021-mvp/qa/runs/2026-10-25/web/brief90-regression-junit.xml`, `brief90-regression.json`. Đã xác nhận sửa trên staging; chưa kiểm bundle cũ hơn.

### WEB-008 · Gửi phiếu cả lớp tính cả học sinh vắng — Đã đóng (lỗi flow QA)
- Tái hiện hai lượt trên bundle `index-C48oeJFZ.js`, Chromium headless, workspace smoke: tạo lớp và hai HS QA, lưu điểm danh một HS ở trạng thái Vắng, mở Nhận xét và chọn Gửi phiếu cả lớp.
- Kết quả thật: hộp xác nhận hiển thị 2 phiếu sẽ gửi và 0 em chưa chọn sao; flow đã bấm Quay lại nên phiếu không được gửi.
- Kết quả mong đợi: HS Vắng bị loại khỏi đợt gửi; với hai HS (một Vắng) hộp xác nhận phải là 1 phiếu gửi và 1 em bỏ qua. TC-CMT-003/006.
- Bằng chứng lượt hai: `plans/20261021-mvp/qa/runs/2026-10-25/web/brief91-teacher-smoke-junit.xml` ghi `Send/skipped counts=2/0`; lượt một: `brief91-teacher-smoke-run1-junit.xml` cũng fail. Mã nguồn web `src/features/comments/CommentsDesktop.tsx` tạo danh sách gửi theo `comment !== null || attended`, không lọc rõ trạng thái Vắng.
- Đối chiếu lại theo fixture sạch trên bundle `index-l7_C4kqA.js`: tạo hai lớp/buổi QA mới, mỗi lượt đúng một HS Có mặt và một HS Vắng; lưu trạng thái, không mở dòng nhận xét/phiếu và không nhập câu hoặc ghi chú trước hộp xác nhận. Cả hai lượt đều hiện 1 phiếu / 1 em chưa chọn sao; bấm Quay lại, không gửi. Ảnh và JUnit/JSON: `plans/20261021-mvp/qa/runs/2026-10-25/web/web008-confirm-1.png`, `web008-confirm-2.png`, `web008-clean-recheck-junit.xml`, `web008-clean-recheck.json`.
- Kết luận: không tái hiện lỗi app. Hai lượt fail trước bị gây nhiễu bởi flow đã mở dòng đầu và sửa câu/ghi chú trước khi đếm; đã sửa thứ tự trong `qa/maestro/web/brief91-teacher-smoke.mjs` để quan sát hộp xác nhận trước mọi chỉnh sửa nhận xét. Không sửa mã app.


_Ghi chú: số WEB-007 không dùng (bỏ trống do lượt chẩn đoán bị huỷ trước khi xác nhận lỗi)._

### WEB-009 · Phiếu soạn lúc mất mạng báo "Máy chủ từ chối thay đổi này" khi có mạng lại — Đã đóng (web dec979e, bundle index-DXfBbe1w.js: comments-offline-send pass)
- Tái hiện: bundle `index-B6wJhugF.js` (staging 0af16c17), Chromium headless, `qa/maestro/web/comments-offline-send.mjs`: lớp/HS QA mới, mất mạng, bỏ tích "Không mất trật tự" + gõ `QA-Web-offline-note`, bật mạng lại. Nhận lần lượt 3 lượt, lần nào cũng vậy.
- Kết quả thật: banner "Nhận xét chưa lưu được: Máy chủ từ chối thay đổi này." (Thử lại / Bỏ thay đổi), góc trái "Lỗi lưu"; phiếu vẫn "Chưa gửi" sau khi bấm Gửi 1 phiếu. Chưa phân biệt lỗi do hợp đồng backend mới chưa deploy hay do web.
- Mong đợi: đồng bộ khi có mạng (TC-CMT-012, spec dòng 191).
- Ảnh: `plans/20261021-mvp/qa/runs/2026-10-25/web/comments-offline-send-failure.png`.
- Ghi chú: ảnh Mít trong ảnh lỗi bị vỡ khi đang offline (ảnh chưa nằm trong cache); online thì Mít 0–5 đều tải được (TC-CMT-016 pass).

### IOS-001 · Hộp xác nhận gửi phiếu không đóng sau khi gửi — Đã đóng (kiểm lại trên fc37088: gửi 3 phiếu, nút Đã lưu rồi hộp tự đóng, 3 phiếu "Đã gửi"; ảnh qa-b96/33..37). Còn lệch nhỏ: trong lúc "Đã lưu" hộp đổi thành "0 phiếu sẽ gửi"
- Tái hiện: lớp QA, buổi hôm nay, tab Nhận xét → Gửi phiếu cả lớp → xác nhận. Phiếu được gửi (thẻ HS chuyển "Đã gửi"), nhưng hộp xác nhận vẫn hiện, chuyển sang "0 phiếu" + "Đã lưu" thay vì đóng.
- Mong đợi: hộp đóng ngay sau khi gửi xong. TC-CMT-003/006.
- Mức độ: trung bình (dễ bấm gửi lần nữa gây hiểu nhầm). Ảnh: `plans/20261021-mvp/ios/ux-v3-mobile-fix/shots/qa-slip/32-*.png`.

### IOS-002 · Lời nhắc trong hộp xác nhận gửi vẫn ghi "câu mẫu, ghi chú" — Đã đóng (fc37088: "gồm sao và nhận xét và kết quả BTVN", ảnh qa-b96/32)
- Spec chốt ô nhận xét gộp một trường; chữ trong hộp xác nhận gửi vẫn nói "câu mẫu, ghi chú" như hai phần riêng.
- Mức độ: thấp (chữ). Ảnh: cùng thư mục shots/qa-slip (31/31b).

### WEB-010 · Phiếu đã gửi hiện lại "Chưa gửi", mất BTVN sau khi chấm lại BTVN — Đã đóng (lỗi flow QA, bundle index-BdRqyODg.js)
- Báo lỗi ban đầu (bundle `index-CNZPcz5i.js`, 2/3 lượt `slip-homework-regrade.mjs` FAIL) là do flow đọc phiếu khi editor của em trước còn hiện một nhịp sau khi chuyển em, không phải dữ liệu bị đổi. Chu Du thêm bước chờ tiêu đề h2 đúng tên em trong `openSlip` (đã nhận vào cả `slip-homework-regrade.mjs` và `brief96-web.mjs`).
- Chạy lại trên `index-BdRqyODg.js`: regrade 2/2 PASS (CMT-013/014), `brief96-web.mjs` CMT-020 PASS 5 lần liên tiếp, phiếu đã gửi giữ nguyên "Đã gửi" 5 sao.
- Hiện tượng còn lại (không phải lỗi dữ liệu): sau khi chuyển em, editor của em trước còn hiện một nhịp ngắn.

### WEB-011 · Hộp xác nhận Gửi phiếu cả lớp trên web còn ghi "câu mẫu, ghi chú" — Mở (thấp, bundle `index-BdRqyODg.js`)
- `brief96-web.mjs` CMT-021: hộp "Gửi phiếu … ?" (nút "Gửi 3 phiếu") vẫn có chữ "câu mẫu, ghi chú"; spec chốt một ô nhận xét gộp, câu do app sinh. Nguồn: `src/features/comments/SendTicketsDialog.tsx:80`. Cùng loại với IOS-002.

### API-001 · phone-check không trả 429 sau 12 lần / 35 lần — Đã đóng (không phải lỗi)
- Giới hạn đã đổi theo yêu cầu người dùng thành 50 lần/SĐT và 100 lần/IP mỗi 15 phút (`contract-changes.md` commit `0e5629d`, Worker `f8cb4ce5`). Lượt thử 12 lần cùng số và 35 số khác nhau đều dưới ngưỡng mới. Testcase TC-AUTH-026 và `brief96-http.mjs` đã sửa theo ngưỡng 50/100.

## IOS-003 — Đăng nhập bước 2: bàn phím che nút, ô mật khẩu ẩn không hiện dấu chấm — Đã đóng (34cd1ac)
- Phím Return trên ô mật khẩu giờ đăng nhập (e6da45d): chạy Maestro `pressKey: Enter` vào được app. Nút "Đăng nhập" không còn nháy "✓ Đã lưu" (fc37088).
- Ô mật khẩu không hiện dấu chấm trên ảnh chụp: iOS không vẽ SecureField vào ảnh chụp, không phải lỗi app.
- Lưu ý QA: không chụp ảnh khi bật mắt (đã xóa 2 ảnh lộ mật khẩu).

## IOS-004 — Thêm/sửa buổi lẻ báo "Lỗi lưu - vui lòng thử lại" (người dùng báo) — Chưa tái hiện
- Lượt 0593443: chưa chạy được TC-CLS-009 / TC-CLS-018 trên iOS. Menu "…" của màn buổi chỉ có "Huỷ buổi", thông tin buổi không có nút sửa; chi tiết lớp (nơi thêm/sửa buổi lẻ) không với tới được qua Maestro vì danh sách lớp nằm dưới hàng trăm thẻ "Điểm danh chưa xong" ở tab Lớp (ảnh qa-b97/33).
- Cần: id/nhãn truy cập của hàng lớp hoặc đường vào chi tiết lớp từ Lịch, rồi chạy TC-CLS-009 và TC-CLS-018 (lớp `AAA-97I-w1`).

## Brief 97 trên iOS (0593443) — ghi chú
- CMT-024, CMT-022 (gán), CMT-021, CMT-025 PASS (ảnh qa-b97/10..23). Sau "Gửi 3 phiếu" nút quay >12 s mới đóng hộp (chậm, vẫn gửi đủ 3 phiếu "Đã gửi" không giờ). Nút "Gán tất cả mặc định" xám khi không còn phiếu để gán.
- CMT-026 (một phiếu mở tay) chưa chạy trên iOS.
