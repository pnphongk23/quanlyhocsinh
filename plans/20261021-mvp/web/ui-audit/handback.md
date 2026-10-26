# Handback · Web UI audit + design token chung (2026-10-23)

Trạng thái: XONG (còn kiểm iPhone thật do người dùng).

## Kết quả
- Token: bản chuẩn `/Users/phamnhuphong/Git/quanlyhocsinh/design/tokens/` (không commit), bản dùng ở mvp-web `design/tokens/` cùng nội dung (`tokens.css`, `tokens.json`, `ios-mapping.md`, `README.md`). Web `src/shared/styles/tokens.css` khớp khối `:root`. Prototype `tokens.css` đã chép (chỉ thêm token).
- Commit trên `mvp-web` (a11a28d..f79d640, chưa push): 0c06a7c, 50e8be3, 162eef0, d2e5202, cdc7d79, 64f4f0d, a03c349, dec8265, 08a6423, b1014ba, f79d640.
- Báo cáo: `inventory.md`, `inventory-after.md`, `findings-{T,A,B,C}.md`, `fixes-{T,A,B,C}.md`, `compare.md`, `review-ui-r1.md`. Ảnh: `shots/ui-audit/{before,after}/` (local, dữ liệu giả); staging phụ huynh `after/staging/C/`.

## Gốc lỗi chính
- FAB/dialog đè nội dung: `.page` giữ `transform` sau animation (fill `both`) nên `position: fixed` neo theo trang. Sửa: fill `backwards` (web + prototype), FAB qua portal, chừa đáy `--fab-clearance`.
- Shell desktop vỡ khi lỗi lưu: CSS SaveStatus nạp sau thắng `display:none`. Sửa selector + cột lưới tường minh.
- Nút đáy dưới tab dưới: `ActionFooter` + `--sticky-bottom`, `--content-min-h`.
- Chọn vai 0/1/≥2 theo spec mục 4 (GL xác nhận).

## Kiểm chứng (lead tự chạy)
- Web tại b1014ba: typecheck 0; test 285 pass/1 skip; build 0; JS ban đầu 147 968 B gzip (≤ 200 000).
- Prototype: test 561/561; build 0; Chrome `/lop/6a/hoc-sinh` 390: `.page` transform none, FAB (314,708).
- Deploy: web `https://qlh-staging-web.pages.dev` (bản e089e7c6, commit b1014ba); prototype `https://05de59a5.quanlyhocsinh-proto.pages.dev`.
- Review tổng thể r1: Chặn 0, Cao 0, Vừa 1 (đã đóng: kịch bản lỗi lưu/offline thêm vào bộ chụp, lỗi footer tìm ra đã sửa b1014ba), Thấp 3.

## Còn lại / Thấp
- Chưa kiểm iPhone thật (safe-area, 100dvh, bàn phím PWA): cần người dùng thử Học sinh (FAB), Tạo lớp (nút đáy), Nhập điểm.
- Ảnh staging giáo viên: đăng nhập 200 nhưng script không tìm được link lớp; dừng theo quy tắc, dùng ảnh local A/B.
- Thấp ghi lại: nút ⋯ màn nhập điểm desktop ngoài cột 720; Sheet thêm buổi desktop có 2 nút Đóng; mũi tên nút lùi trong tile trắng (thiết kế đã duyệt); C-11, C-12, C-14; vài test chỉ khớp chuỗi CSS.
- Lưu ý vận hành: API staging chỉ cho CORS `https://qlh-staging-web.pages.dev` (đúng thiết kế); chụp/kiểm staging phải dùng domain chính, không dùng URL theo mã deploy.

## Cập nhật sau (2026-10-23)
- Đã deploy thêm bản vá menu ⋯ (z-index, `npm run test:click`), đợt trạng thái nút lưu (`npm run test:save`; xem `save-states-plan.md`, `ui-save-check-results.md`) và gỡ "khôi phục buổi"; prototype đồng bộ (https://2db96972.quanlyhocsinh-proto.pages.dev).
- Staging web hiện do GL mới (122e9fde) deploy từ f31150e (gồm de3b6d4..f31150e của lead Data), thay cho bản f1d173f của mảng này.
- Báo cáo cho GL 122e9fde. Mảng ghi nhận XONG; chờ kết quả người dùng thử iPhone thật.
