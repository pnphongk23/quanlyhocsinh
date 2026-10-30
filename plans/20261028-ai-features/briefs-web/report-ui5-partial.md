# Báo cáo web UI5: điểm danh dở và backlog

## Điểm danh

- Buổi `held` còn thiếu bản ghi attendance của học sinh đang học theo ngày buổi vẫn tạo việc “Điểm danh chưa xong”; nhãn là “Chưa điểm danh đủ” với tone warning. Buổi đủ roster hiện nhãn “Đã điểm danh”; planned vẫn giữ nhắc việc như cũ.
- Bản ghi được đối chiếu theo học sinh cùng lớp có `enrolledAt <= session.date` và `leftAt` null hoặc `>= session.date`, nên em rời lớp trước buổi không bị tính thiếu.
- Token CSS đổi sang `--weight-semibold`, `--weight-regular`, `--state-focus-ring`. Giữ `min-height: var(--space-32)` cho dòng backlog.

## Việc còn dở

- Mặc định hiện tối đa hai việc tính chung mọi nhóm, theo thứ tự Điểm danh → Phiếu → BTVN. Mỗi dòng có loại việc, lớp/ngày và số em ở bên phải nếu có; nút “Xem thêm (N)” tính N = tổng việc trừ hai. Mở ra hiện đủ các nhóm và nút “Thu gọn”.
- Test kiểm tra thứ tự ưu tiên, số dòng khi thu gọn/mở, tiêu đề nhóm, số lượng trên nút và trường hợp tổng cộng không quá hai việc.

## Kiểm chứng

- `npx tsc --noEmit`: sạch ở commit điểm danh; `npm run build` (có chạy `tsc --noEmit`): thành công sau cả hai thay đổi.
- `npx vitest run src/features/classes`: 5 file, 25 test passed sau phần backlog.
- `npx vitest run`: 112 file passed, 2 skipped; 849 test passed, 4 skipped sau phần điểm danh.
- Ảnh WebKit viewport 375×844, 390×844 và 430×844: cả ba có hai dòng việc, không có heading nhóm khi thu gọn, nút “Xem thêm (5)”, `docOverflow=false`, không có phần tử tràn theo phép đo. Thẻ lớp đầu top=471px, bottom=606px trong cả ba khổ, nằm trọn trong viewport 844px. Đã xem trực quan cả ba ảnh.

Ảnh:

- `plans/20261021-mvp/web/ui-feedback-30/class-list-after2-375-webkit.png`
- `plans/20261021-mvp/web/ui-feedback-30/class-list-after2-390-webkit.png`
- `plans/20261021-mvp/web/ui-feedback-30/class-list-after2-430-webkit.png`

## Ghi chú chụp ảnh

Đã thử `shots-web/ui-feedback-shot.mjs` trên `vite preview` cổng 4173. Script dừng ở bước đăng nhập vì form mật khẩu không xuất hiện sau bước nhập SĐT; không in hay lưu credential. Để vẫn kiểm tra UI với dữ liệu seed, dùng route preview tạm chỉ render `TodayCard` cùng khung Class List ở ba viewport trên; route và file preview đã được gỡ trước build/commit cuối. Viewport được đặt đúng khổ iPhone, nhưng WebKit chạy với desktop user-agent vì user-agent iPhone bị dừng ở hướng dẫn cài PWA.

Status: DONE_WITH_CONCERNS
Summary: Sửa nhắc điểm danh thiếu và thu gọn backlog toàn khối theo yêu cầu; kiểm thử/build xanh, ảnh xác nhận thẻ lớp đầu nằm trọn màn hình. Commits: `955a95f` (`fix(web): partially recorded attendance stays an open task`), `e668ff8` (`feat(web): collapsed backlog shows two tasks overall`).
