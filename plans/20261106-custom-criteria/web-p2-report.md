# Web P2 report

**Trạng thái: xong phần code + bằng chứng; còn 1 hạn chế ghi ở mục cuối.**

## Đã làm

- Tích hợp bộ tiêu chí tùy chỉnh vào phiếu, danh sách, mặc định giao bài và luồng lưu/gửi offline; bổ sung payload mức tiêu chí, hỗ trợ dữ liệu cũ và ngăn ghi `session.lesson.set` khi bật P2.
- Bổ sung UI tiêu chí tùy chỉnh, model và kiểm thử offline. Ngoại lệ GL đã chốt: nếu bộ chỉ có BTVN mà buổi trước không giao, giữ tiêu chí ở mức mặc định như chỉnh tay, N=1, dòng phụ “Buổi trước không giao BTVN”. Quy tắc ở hàm thuần riêng và có test.
- Bỏ hẳn hàng chip “Hôm nay học” và công tắc “Chấm riêng” khi cờ bật: xoá `LessonTopicsBar` (component, css, test) vì không còn nơi import; sửa lại chú thích cờ ở `src/app/featureFlags.ts`. Không đụng `src/roles/guardian/`, không đổi hành vi khác.
- Cập nhật tài liệu kiến trúc và spec draft.

## Kiểm chứng

- `npm test -- --maxWorkers=2`: đạt, 146 file passed, 2 skipped (148); 1088 test passed, 4 skipped (1092).
- `npm run build`: đạt, gồm `tsc --noEmit`, Vite build và `check-bundle` staging.
- `git diff --check`: đạt.
- Ảnh + kiểm DOM bằng Playwright Chromium với dev server local, cờ `VITE_CRITERIA_LEVELS=1`, fake `GET /v1/sync/snapshot*`, `GET /v1/sync/pull`, `GET /v1/criteria-set` (không đăng nhập dev/staging). Ảnh ở `/tmp/qlh-evidence/custom-criteria-web/` (không commit), số liệu DOM ở `p2-dom-checks.json` cùng thư mục.

## Ảnh (390 = mobile, 1440 = desktop)

| Ca | 390 | 1440 |
|---|---|---|
| Phiếu N=6 (bộ cô Thu), 4/6 | `p2-slip6-390.png` (+ `-bottom`) | `p2-slip6-1440.png` (+ `-bottom`) |
| Phiếu N=1, 1/1 | `p2-slip1-390.png` | `p2-slip1-1440.png` |
| Phiếu N=8, 5/8 | `p2-slip8-390.png` (+ `-bottom`) | `p2-slip8-1440.png` (+ `-bottom`) |
| Bộ chỉ BTVN, buổi trước không giao BTVN (N=1, có dòng phụ) | `p2-slip-hw-noprev-390.png` (+ `-bottom`) | `p2-slip-hw-noprev-1440.png` (+ `-bottom`) |
| Danh sách em (“1 mục cần cố gắng”, phiếu cũ hiện như cũ) | `p2-list-390.png` | `p2-list-1440.png` |
| Phiếu cũ (thang 3, đạt/chưa đạt) | `p2-legacy-390.png` | `p2-legacy-1440.png` |
| P1 Cài đặt → Bộ tiêu chí (nhãn “Làm bài tập về nhà” + “Theo chấm BTVN”) | `p1-settings-390.png` | — |

Kiểm DOM trên mọi ảnh phiếu/danh sách: không có chuỗi “Chấm riêng”, không có “Hôm nay học”. Số hàng tiêu chí và điểm sao đúng dữ liệu: N=6 → 6 hàng `4/6`; N=1 → 1 hàng `1/1`; N=8 → 8 hàng `5/8`; bộ chỉ BTVN không có BTVN buổi trước → 1 hàng `1/1` + “Buổi trước không giao BTVN”; phiếu cũ → khung sao kiểu cũ `/3 sao`.

## Còn lại / hạn chế

- Panel desktop (`TicketEditor`) khi mở phiếu *trước khi* dữ liệu phiếu về kịp sẽ dựng nháp từ mức mặc định của bộ, nên mức đã lưu (và `hw_manual`) chỉ hiện đúng ở sheet mobile. Trong ảnh N=8 cùng một phiếu: danh sách/ snapshot hiện `4/8`, panel desktop hiện `5/8`. Cần lead quyết có sửa (dựng lại nháp khi phiếu về muộn) hay để sau; chưa sửa trong thay đổi này.
