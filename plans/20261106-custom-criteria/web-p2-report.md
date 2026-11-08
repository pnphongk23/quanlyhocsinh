# Web P2 report

**Trạng thái: xong.**

## Đã làm

- Tích hợp bộ tiêu chí tùy chỉnh vào phiếu, danh sách, mặc định giao bài và luồng lưu/gửi offline; bổ sung payload mức tiêu chí, hỗ trợ dữ liệu cũ và ngăn ghi `session.lesson.set` khi bật P2.
- Bổ sung UI tiêu chí tùy chỉnh, model và kiểm thử offline. Ngoại lệ GL đã chốt: nếu bộ chỉ có BTVN mà buổi trước không giao, giữ tiêu chí ở mức mặc định như chỉnh tay, N=1, dòng phụ “Buổi trước không giao BTVN”. Quy tắc ở hàm thuần riêng và có test.
- Bỏ hẳn hàng chip “Hôm nay học” và công tắc “Chấm riêng” khi cờ bật: xoá `LessonTopicsBar` (component, css, test) vì không còn nơi import; sửa lại chú thích cờ ở `src/app/featureFlags.ts`. Không đụng `src/roles/guardian/`, không đổi hành vi khác.
- Cập nhật tài liệu kiến trúc và spec draft.
- Sửa lỗi đúng dữ liệu: panel desktop (`TicketEditor`) và sheet mobile (`CommentTicketSheet`) mở trước khi phiếu về kịp thì dựng nháp từ mức mặc định; nay khi phiếu về mà người dùng chưa sửa gì (không có nháp trong sessionStorage) thì dựng lại nháp từ bản chụp đã lưu (giữ `criteria_levels`, `hw_manual`, ghi chú). Đã sửa tay thì giữ nguyên nháp.
- Sửa hàng danh sách em trên desktop: `min-height` theo token (`--space-48`) thay chiều cao cố định, để dòng “N mục cần cố gắng” không bị cắt.

## Kiểm chứng

- `npm test -- --maxWorkers=2`: đạt, 147 file passed, 2 skipped (149); 1090 test passed, 4 skipped (1094). Test mới `TicketEditor.lateSlip.test.tsx` (2 ca: phiếu về muộn nạp lại 4/8, đã sửa tay thì giữ nháp) — ca 1 đã kiểm là FAIL trước khi sửa, PASS sau khi sửa.
- `npm run build`: đạt, gồm `tsc --noEmit`, Vite build và `check-bundle` staging.
- `git diff --check`: đạt.
- Ảnh + kiểm DOM bằng Playwright Chromium với dev server local, cờ `VITE_CRITERIA_LEVELS=1`, fake `GET /v1/sync/snapshot*`, `GET /v1/sync/pull`, `GET /v1/criteria-set` (không đăng nhập dev/staging). Ảnh ở `/tmp/qlh-evidence/custom-criteria-web/` (không commit), số liệu DOM ở `p2-dom-checks.json` cùng thư mục.

## Ảnh (390 = mobile, 1440 = desktop)

| Ca | 390 | 1440 |
|---|---|---|
| Phiếu N=6 (bộ cô Thu), 4/6 | `p2-slip6-390.png` (+ `-bottom`) | `p2-slip6-1440.png` (+ `-bottom`) |
| Phiếu N=1, 1/1 | `p2-slip1-390.png` | `p2-slip1-1440.png` |
| Phiếu N=8, 4/8 (danh sách và panel cùng 4/8) | `p2-slip8-390.png` (+ `-mid`, `-bottom`) | `p2-slip8-1440.png` (+ `-mid`, `-bottom`) |
| Bộ chỉ BTVN, buổi trước không giao BTVN (N=1, có dòng phụ) | `p2-slip-hw-noprev-390.png` (+ `-bottom`) | `p2-slip-hw-noprev-1440.png` (+ `-bottom`) |
| Danh sách em (“1 mục cần cố gắng”, phiếu cũ hiện như cũ) | `p2-list-390.png` | `p2-list-1440.png` |
| Phiếu cũ (thang 5, 4/5 tiêu chí đạt) | `p2-legacy-390.png` | `p2-legacy-1440.png` |
| P1 Cài đặt → Bộ tiêu chí (nhãn “Làm bài tập về nhà” + “Theo chấm BTVN”) | `p1-settings-390.png` | — |

Kiểm DOM trên mọi ảnh phiếu/danh sách: không có chuỗi “Chấm riêng”, không có “Hôm nay học”. Số hàng tiêu chí và điểm sao đúng dữ liệu: N=6 → 6 hàng `4/6`; N=1 → 1 hàng `1/1`; N=8 → 8 hàng `4/8` (cả 390 và 1440); bộ chỉ BTVN không có BTVN buổi trước → 1 hàng `1/1` + “Buổi trước không giao BTVN”; phiếu cũ thang 5 → `4/5 sao`, 5 ô tick kiểu cũ.

## Sửa theo review R1

- `planRegradedSlip` có nhánh cho phiếu `criteria_levels`: chấm lại BTVN cập nhật mức tiêu chí BTVN trong bản chụp (trừ khi chỉnh tay), dựng lại câu theo bộ hiện hành, giữ phần gõ thêm và gửi `slip.set` với `criteria_levels` (không `criteria`).
- `TicketEditor`/`CommentTicketSheet`: `levelMode` loại trừ `customMode`, mọi effect/đường ghi `levels`/`skill_levels` cũ không chạy cho phiếu theo bộ tiêu chí.
- Gán tất cả mặc định: tách phần gõ thêm trong ô nhận xét nhờ `text` trong bản chụp rồi nối lại sau câu mặc định.
- Bộ chỉ có tiêu chí BTVN, buổi trước không giao BTVN: reconcile giữ mức chọn tay khi `hw_manual`; test cũ khẳng định hành vi sai đã sửa.
- `useCriteriaSet` theo dõi hàng cache trong Dexie (`liveQuery` + hook ghi của bảng, không đọc định kỳ) nên màn đang mở nhận bộ mới ngay.
- Test tái hiện đặt trong repo: `src/data/repositories/comments.regrade.test.ts`, `src/features/comments/TicketEditor.legacyLevels.test.tsx`, `src/features/comments/useCriteriaSet.test.tsx`, ca cập nhật ở `customCriteriaModel.test.ts` — tất cả FAIL trước khi sửa, PASS sau. Bộ tái hiện của reviewer cũng 5/5 PASS.
- `npm test -- --maxWorkers=2`: 150 file passed, 2 skipped; 1094 test passed, 4 skipped. `npm run build` và `git diff --check` đạt. Ảnh `p2-slip6-1440`, `p2-list-1440` chụp lại không đổi giao diện.

## Ghi chú soát ảnh

- Phiếu cũ: fixture cũ sai (`scale: 3` kèm `criteria` 5 bit nên ra “4/3 sao”); dữ liệu thật của phiếu cũ thang 5 là `scale: 5` + 4/5 bit + `stars: 4`, đã sửa fixture và chụp lại. Code không sai: nhánh này giống `develop`.
- Hàng danh sách em 390 vốn đã cao theo nội dung; lỗi cắt dòng chỉ ở panel desktop, đã sửa CSS bằng token.
