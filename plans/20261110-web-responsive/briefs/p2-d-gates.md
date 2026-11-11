# Packet P2-D · gate G1 + G2 (chạy sau B và C)

Đọc trước `briefs/p2-common.md` và plan mục 4 (định nghĩa gate, gồm định nghĩa "vùng trống trong khối").

## Write-set
- mới `src/test/layoutGate.test.ts` (G1), `src/test/layoutAllowlist.ts`, `scripts/layout-gate.mjs` (G2) + fixture dữ liệu `scripts/layout-gate-fixtures/**`, `package.json` (thêm `"test:layout"`), `.github/workflows/*` KHÔNG sửa.
- Tái dùng phép đo đã có trong `design/responsive-mock/capture.mjs` (tràn ngang, lề trái, vùng bấm, chữ cắt, cột thẳng, sheet bị đè, vùng trống trong khối `[data-measure="block"]`) — tách thành module dùng chung nếu hợp lý.

## G1 (vitest, trong `npm test`)
Fail khi, ngoài `src/shared/layout/**` + `src/shared/styles/tokens.css`:
(a) `@media` có `min-width|max-width|width` (đọc mọi `.css` trong `src/`);
(b) import/gọi `useIsDesktop` hoặc `matchMedia(` theo bề rộng;
(c) ghi cứng màu (`#hex`, `rgb(`, `hsl(`) hoặc `font-size|padding|margin|gap|top|left|right|bottom|width|height` bằng số px/rem ngoài `var(--…)` (cho phép `0`, `1px`/`2px` viền, `%`, `fr`, `auto`, `100dvh`); (d) route của 2 luồng không render qua `PageShell`/mẫu trang (kiểm bằng render test hoặc quét import).
Allowlist `src/test/layoutAllowlist.ts`: danh sách file + số vi phạm hiện tại cho từng luật; test fail nếu vi phạm mới xuất hiện HOẶC số đếm tăng; in nhắc giảm số khi số thực tế nhỏ hơn (để allowlist chỉ thu nhỏ). File của 2 luồng KHÔNG được có trong allowlist sau Pha 3 (để sẵn chú thích).
Tự kiểm ngược: thêm tạm một `@media (min-width: 1024px)` vào một file feature → G1 đỏ; gỡ → xanh. Ghi kết quả.

## G2 (`npm run test:layout`, Playwright local, `vite preview` hoặc dev server local, dữ liệu `page.route("**/v1/**")`)
Route: `/cai-dat`, `/cai-dat/doi-mat-khau`, email, `/cai-dat/bo-tieu-chi` (thường, đang sửa, rỗng, tên dài, 8 tiêu chí), chi tiết buổi tab Điểm danh (ngắn 6 em, dài 30 em, tên dài, chưa điểm danh, đã lưu, đang tải, lỗi). Khổ 390×844, 834×1112, 1440×900. Đo theo plan mục 4; nav đúng mốc. Ảnh mọi trạng thái × 3 khổ → `/tmp/qlh-evidence/ql-004/gate/<route>/<state>-<w>.png`; thiếu khổ = fail. Exit ≠ 0 khi có vi phạm; in bảng.
Ở Pha 2, màn 2 luồng chưa chuyển nên G2 được phép đỏ: chạy và nộp báo cáo baseline (vi phạm nào, ở đâu) — đây là bằng chứng "gate bắt được lỗi cũ" cho lessons.md.

## Nghiệm thu
`npm test` xanh (G1 xanh với allowlist), kiểm ngược G1 đỏ đúng, `npm run test:layout` chạy hết và in baseline, `npm run build` 0 fail.
