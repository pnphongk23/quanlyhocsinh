# Worker A — Nhập điểm và Tạo bài kiểm tra (mobile + web)

Ngày: 2026-10-18 · Không commit.

## Màn đã làm (reference ↔ route)

| Reference | Route prototype | File sửa |
|---|---|---|
| 19-gv-tao-bai-kiem-tra.html | `/lop/:classId/bai-kiem-tra/moi` (và `/lop/:classId/diem/bai-moi` → redirect) | `src/features/scores/NewTestPage.tsx` |
| 20-gv-nhap-diem.html | `/lop/:classId/bai-kiem-tra/:testId` | `src/features/scores/TestScoresPage.tsx` |
| 21-gv-nhap-diem-ban-phim.html | cùng route, ô đang focus | như trên (CSS `.studentRow:focus-within`, `.scoreInput:focus`) |
| 22-gv-nhap-diem-loi-gia-tri.html | cùng route, điểm ngoài 0–10 | như trên (`.studentRowInvalid`, `.rowError`, `.saveReason`) |
| 75-trang-thai-rong-chua-co-bai-kiem-tra.html | `/lop/:classId/bai-kiem-tra` và `/lop/:classId/diem` khi chưa có bài | `src/features/class-space/TestsTab.tsx`, `ScoreGridTab.tsx` (khối `.emptyScore` trong `scores.module.css`) |
| 81-trang-thai-nut-bi-vo-hieu-hoa.html | nút "Lưu điểm" khi chưa có thay đổi | `TestScoresPage.tsx` (`.saveButton:disabled`, `.saveReasonMuted`) |
| 78-trang-thai-loi-luu.html | cùng route, khi lưu lỗi | `TestScoresPage.tsx` (`.errorBanner` + nút "Thử lại") |
| 80-trang-thai-chua-luu-hoi-khi-roi-man.html | cùng route, khi rời màn còn nháp | `src/features/scores/UnsavedChangesDialog.tsx` (mới) |
| 90-web-bang-diem.html | `/lop/:classId/diem` (desktop) | `src/features/class-space/ScoreGridTab.tsx` |
| 20 (thẻ bài kiểm tra) | tab "Bài kiểm tra" `/lop/:classId/bai-kiem-tra` | `TestsTab.tsx` |

File mới: `src/features/scores/ScoreIcons.tsx` (icon biểu đồ của 75, icon cảnh báo của 22 — không thêm vào `src/shared/ui/Icon.tsx` vì file đó dùng chung), `src/features/scores/UnsavedChangesDialog.tsx`.

Không tạo module CSS riêng cho `TestsTab`/`ScoreGridTab`: hai file này đang dùng `src/features/scores/scores.module.css` (nằm trong danh sách "Được sửa"), không dùng `classSpace.module.css`, nên giữ nguyên chỗ import cho ít thay đổi.

## Số đo đã bám (từ reference)

**Nhập điểm (20/21/22)** — thẻ bài: nền trắng, bo 16, padding `12px 16px`, tên bài 18/700, meta 14 muted, "Đổi bài" 15/600 `--color-primary-ink` + chevron 18. Hàng cột tiêu đề 13 muted, `Điểm` rộng 64, `Vắng thi` rộng 56, lệch lên `-4px`. Hàng học sinh: nền trắng bo 12, `min-height 56`, padding `6px 4px 6px 12px`, gap 8, tên 16/500. Ô điểm `64×44`, bo 12, 17/700, nền `--color-bg`; ô trống: viền `1.5px dashed --color-input-border-strong`, chữ "–"; focus: viền `1.5px --color-primary`, chữ `--color-primary-ink`, hàng có `outline 2px` lệch -2. Vắng thi: ô `64×44` nền `--color-neutral-soft` chữ 13/600 muted + công tắc `48×28` (núm 22) đổi từ `--color-input-border` sang `--color-primary`. Lỗi: hàng outline 2px `--color-error`, ô viền/chữ đỏ, dòng lỗi 13/600 kèm icon, dòng "Sửa 1 ô lỗi để lưu điểm" 13/600 đỏ phía trên nút. Nút lưu 52px bo 12 16/600, khi vô hiệu nền `--color-input-border` chữ muted, kèm lý do "Chưa có thay đổi để lưu" 14 muted.

**Tạo bài kiểm tra (19)** — nhãn 14/600, ô nhập cao 52 bo 12 đệm `0 16` chữ 16, cách nhãn 8, cách giữa các trường 16; dòng gợi ý "Điểm theo thang 10. Trung bình là trung bình cộng đơn giản." 14 muted/1.5; nút chính 52 và "Huỷ" 48 nằm sát đáy màn, gap 8.

**Bảng điểm (90)** — `th` 13/600 muted đệm 8, `td` 15 đệm `6px 8px`, đường kẻ `--color-divider`, cột cuối "Trung bình", ô trống = hộp viền đứt 64×44 bo 8 + "Chưa nhập" 12/600 `--color-warning`, vắng thi = pill neutral, ghi chú chân bảng 13 muted. Nút "+ Bài kiểm tra mới" trên desktop 48px/15.

Mọi màu của design đều có token trong `tokens.css`, không phải dùng hex cục bộ.

## Chỗ còn lệch design và vì sao

1. **Bảng điểm web (90) vẫn chỉ để xem.** Design vẽ ô điểm sửa được ngay trong bảng, thêm cột "Vắng thi" cho bài đang sửa và nút "Lưu điểm" cạnh "+ Bài kiểm tra mới". Tôi không thêm: đó là hành vi mới (design không nói bài nào là "bài đang sửa") và brief yêu cầu "bố cục đổi, logic giữ"; sửa điểm hiện đi qua màn nhập điểm của từng bài. Vì vậy không có cột "Vắng thi", không có nút "Lưu điểm" trên lưới, ô trống chỉ hiển thị (không phải input).
2. **Không có màn design cho lưới điểm trên mobile.** Design 90 là bản web. Ở 390px tôi giữ bảng cuộn ngang trong thẻ (như trước), chỉ đổi chữ/số đo theo 90.
3. **Bàn phím số (21) không làm.** Thanh "Vắng thi · tên · Tiếp" của design gắn với bàn phím số tự vẽ; prototype dùng bàn phím hệ thống (`inputMode="decimal"`), không điều khiển được. Chỉ lấy trạng thái focus (viền, màu, outline hàng).
4. **Tiêu đề màn nhập điểm.** Design 20 không có nút quay lại, có nút chọn lớp và h1 "Điểm số" ở hàng riêng. Prototype dùng `PageHeader` (không được sửa) nên thành: nút quay lại + tên lớp + h1 "Điểm số" cùng hàng, "+ Bài mới" bên phải. Tôi bỏ tên bài khỏi h1 và đưa vào thẻ bài kiểm tra kèm "Đổi bài" đúng như design.
5. **Bỏ thẻ tiến độ "Đã nhập x/y · Còn n em chưa có điểm"** trong màn nhập điểm: design 20 không có; thông tin "chưa có điểm" nay nằm ngay dưới tên học sinh (như design) và pill "Còn n em chưa có điểm" vẫn còn ở danh sách bài kiểm tra.
6. **Bỏ "Segmented thang điểm" trong màn tạo bài**: design 19 thay bằng dòng gợi ý "Điểm theo thang 10…", đúng spec 8 (thang điểm cố định 10, không hệ số).
7. **Bỏ dòng "Đã lưu điểm lớp X"** sau khi lưu: theo brief mục 5 và spec 5.3 (chỉ hiện lỗi lưu/đồng bộ). Việc lưu vẫn thấy được qua giá trị trong ô.
8. **Giữ `SaveStatus` của shell (pill "Lỗi lưu — vui lòng thử lại")** vì là file dùng chung; màn nhập điểm có thêm băng lỗi riêng theo design 78. Khi lỗi, hai chỗ cùng báo (chấp nhận được, không sửa được file chung).
9. **Còn giữ thông báo "Còn bản nháp chưa lưu của lớp X…"** khi còn nháp ở lớp khác. Đây là cảnh báo mất dữ liệu khi chuyển lớp, không phải chip trạng thái đồng bộ; nếu orchestrator muốn bỏ hẳn theo brief mục 5 thì nói, sửa 1 khối.
10. **Thẻ bài kiểm tra trong danh sách** vẫn giữ pill "Còn n em chưa có điểm"/"Đủ điểm" (design không vẽ màn danh sách) nhưng đã đổi sang kiểu thẻ của design (bo 16, padding `12px 16px`, tên 18/700).
11. **Cảnh báo rời màn đổi từ `window.confirm` sang hộp thoại 3 nút** của design 80; "Bỏ thay đổi" nay xoá nháp của bài đang sửa (trước đây nháp còn lại sau khi rời màn).

## Spec vs design

- Design không có chip trạng thái đồng bộ ở các màn này — khớp spec 5.3, không cần sửa spec.
- Spec 3.1 "không hiển thị điểm trung bình lớp": lưới chỉ có cột "Trung bình" theo từng học sinh, không có TB lớp, không hệ số. Không sửa spec.
- Design 8 (mục 8 spec) đã bỏ hệ số ở màn tạo bài và bảng điểm web — khớp.

## Lệnh đã chạy và kết quả

- `npm run typecheck` → xanh (không lỗi).
- `npm test` → 15 file, 93 test pass.
- `npm run build` → thành công (`index-*.js` 340 kB / 109 kB gzip).
- Kiểm bằng mắt: chạy `npm run dev -- --port 5178`, chụp ảnh bằng Chrome headless qua CDP (`Emulation.setDeviceMetricsOverride` 390×844 DPR 2 và 1360×860) rồi đối chiếu cạnh nhau với `design/reference` phục vụ bằng `python3 -m http.server 8767`:
  - nhập điểm thường (`/lop/6a/bai-kiem-tra/6a-test-3`) ↔ 20: khớp thẻ bài, hàng cột, hàng học sinh, ô điểm, công tắc, nút lưu dính đáy.
  - ô focus ↔ 21: khớp outline 2px xanh + ô viền xanh chữ `--color-primary-ink`.
  - điểm 11 ↔ 22: khớp hàng viền đỏ, dòng "Điểm từ 0 đến 10", nút lưu xám + "Sửa 1 ô lỗi để lưu điểm".
  - rời màn còn nháp ↔ 80: khớp hộp thoại 3 nút (Lưu / Bỏ thay đổi / Ở lại).
  - trạng thái rỗng ↔ 75: khớp vòng tròn 72, tiêu đề 20/700, mô tả, nút 52; đã căn giữa khoảng trống.
  - lỗi lưu ↔ 78: khớp băng nền `--color-error-soft`, chữ lỗi, nút "Thử lại" (tạo lỗi bằng cách làm đầy localStorage để `setItem` ném `QuotaExceededError`); nháp được giữ, nút lưu vẫn bật.
  - lưu thành công: nháp được xoá, nút trở lại vô hiệu + "Chưa có thay đổi để lưu", không hiện "Đã lưu".
  - bảng điểm web ↔ 90 (1360×860): khớp cột/hàng/tiêu đề bảng, "Vắng thi", ô đứt + "Chưa nhập", cột "Trung bình", ghi chú chân bảng.
  - tạo bài kiểm tra ↔ 19 (390×844): khớp nhãn/ô nhập/dòng gợi ý, nút chính + "Huỷ" sát đáy.
- Đã dừng dev server và server design, xoá profile Chrome tạm. Không commit. `git status` cho thấy chỉ các file trong phạm vi được sửa (design/prototype vốn không được git theo dõi).

## Chưa kiểm

- Chưa kiểm bằng mắt màn nhập điểm ở chế độ desktop (design không có màn riêng; giữ danh sách như cũ, chỉ đổi số đo) và bàn phím số của 21 (mục 3 ở trên).
- Chưa kiểm trạng thái "chỉ có quyền đọc" (`canWrite=false`) bằng mắt: CSS dùng lại `.draftNotice`, nút lưu ẩn như trước.
- Chưa kiểm màn lưới điểm mobile khi lớp có nhiều bài (cuộn ngang trong thẻ): chỉ suy ra từ CSS `min-width: 640px` + `overflow-x: auto` như trước.

Status: DONE_WITH_CONCERNS
Summary: Đã làm lại màn nhập điểm, tạo bài kiểm tra, danh sách bài, lưới điểm web và các trạng thái rỗng/lỗi/nút vô hiệu/hỏi khi rời màn theo đúng số đo `design/reference` (19, 20, 21, 22, 75, 78, 80, 81, 90), typecheck/test/build đều xanh và đã đối chiếu bằng ảnh chụp 390×844 và 1360×860; còn lệch có chủ ý: lưới điểm web vẫn chỉ để xem (không sửa điểm tại chỗ như design 90) và không làm bàn phím số của design 21.
