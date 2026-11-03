# Web UX: tiêu chí 3 mức, "Hôm nay học", kỹ năng chấm thêm (thử nghiệm)

Ngày 2026-11-04 · Nguồn: `plans/20261104-criteria-levels/requirements.md`, hợp đồng máy chủ `contract.md`
(mục 1, 4, 5). Chỉ làm sau cờ `VITE_CRITERIA_LEVELS`; cờ tắt giữ nguyên giao diện hiện tại.
Mọi giá trị dùng token trong `design/tokens/`; token mới phải thêm vào `tokens.css` + `tokens.json`
và bản chép `src/shared/styles/tokens.css` trước khi dùng.

## 1. Sheet/bảng phiếu một em

- Mobile (< 1024px): `Sheet` toàn màn hiện có; thân sheet cuộn, thanh hành động vẫn ghim đáy với
  `--sticky-bottom` + `--page-bottom`, chừa `--safe-bottom`. Đầu sheet: tên em (2 dòng tối đa, cắt "…"),
  avatar như danh sách, `Pill` trạng thái phiếu.
- Desktop (≥ 1024px): hai cột như hiện tại — danh sách 400px, khung soạn phiếu bên phải co giãn; chế độ
  "Theo tiêu chí" (chỉ khi cờ tắt) mới dùng panel 380px sticky `top: var(--space-24)`. Form giữ `--form-max`.
- Khung sao + Mít (giữ nguyên khối hiện có): Mít dáng `sao-0…sao-5` cỡ `--empty-mascot-compact`, hàng 5 sao
  `--comment-star-size`, dòng "N/5 sao" (`--text-base`, `--weight-bold`). Sao = số tiêu chí mức Tốt;
  kỹ năng không tính sao.
- 5 hàng tiêu chí, thứ tự cố định `focus, participation, mastery, notes, homework`:
  - mỗi hàng `display:grid; grid-template-columns: var(--level-row-icon-size) minmax(0,1fr) auto;
    gap: var(--space-12); align-items:center; padding: var(--space-8) 0;`
  - icon `--level-row-icon-size` (`color: var(--color-muted)`; tiêu chí đang Cần cố gắng vẫn dùng
    `--color-muted`, không tô màu cảnh báo), tên `--text-md`, `--weight-semibold`, chữ dài xuống dòng.
  - `LevelSegmented` 3 mức (Tốt · Đạt · Cần cố gắng) chiếm cột phải, tối thiểu 3 × `--tap` vùng chạm;
    mobile hẹp 375px cho hàng cao 2 dòng (tên trên, segmented dưới) bằng `flex-wrap`/`grid` —
    segmented không bị bóp dưới 3 × 44px.
  - Hàng `homework` có nhãn phụ "Theo chấm BTVN" / "Buổi trước chưa có BTVN" (`--text-xs`, `--color-muted`)
    như hiện tại; chạm tay thì giữ lựa chọn tay.
- Nhóm "Kiến thức hôm nay" chỉ hiện khi buổi có ít nhất một kỹ năng bật "Chấm riêng":
  tiêu đề nhóm `--text-lg` + `--weight-semibold`, mỗi kỹ năng một hàng cùng bố cục 5 hàng tiêu chí,
  mặc định Đạt. 0 kỹ năng: không render nhóm (không để khoảng trống). 2 kỹ năng: hai hàng, không đổi
  bố cục khác.
- Ô nhận xét (giữ nguyên): câu tự sinh là `textarea` sửa tay được, giáo viên gõ thêm ở ô riêng bên dưới;
  đổi mức / đổi chip / chấm lại BTVN chỉ sinh lại câu và giữ phần gõ thêm. Phiếu đã gửi không tự sinh lại.
- Phiếu cũ (không `levels`): 5 hàng chỉ đọc hiện nhãn Đạt/Chưa đạt theo bit (không segmented); phiếu
  thang 3 sao giữ "x/3 sao" + câu đã lưu, không quy đổi, không sửa tiêu chí.

## 2. Đầu tab Nhận xét

- Hàng chip "Hôm nay học" (chọn nhiều, lưu theo buổi, mặc định không chọn):
  Từ vựng · Mẫu câu/Ngữ pháp · Nghe · Nói · Đọc · Viết. Dùng `Chip` hiện có (`--radius-chip`,
  `--tap`, `--text-control`; chọn = `--state-selected-bg` + `--state-selected-fg`, không viền), xuống nhiều
  dòng khi hẹp (`flex-wrap: wrap`, `gap: var(--space-8)`); không cuộn ngang, không cắt chip.
- Mỗi chip đã chọn có công tắc "Chấm riêng" ngay dưới hàng chip: một hàng `--text-sm`, công tắc dùng
  token trạng thái chọn (`--state-selected-bg`/`--state-selected-fg`), vùng chạm `--tap`. Công tắc chỉ
  hiện cho chip đang chọn; tắt công tắc/bỏ chip không xoá dữ liệu mức đã lưu. Khoá toàn bộ hàng chip khi
  buổi chưa điểm danh xong là **quyết định sản phẩm** (contract 3.2 không buộc), giữ khoá để phiếu không
  soạn trên danh sách chưa chốt.
- Hàng hành động hiện có ("Gán tất cả mặc định" kiểu nút phụ + "Gửi phiếu cả lớp") giữ nguyên vị trí;
  cờ bật thì bỏ segmented "Theo học sinh / Theo tiêu chí" — chỉ còn danh sách theo học sinh
  (mã `CriteriaMode` giữ nguyên, không render).
- "Gán tất cả mặc định": 5 tiêu chí về mặc định (BTVN theo chấm), kỹ năng đang bật về Đạt, câu sinh lại,
  giữ phần gõ thêm; bỏ qua em Vắng và phiếu đã gửi (như hiện tại).

## 3. Danh sách em (tab Nhận xét)

- Giữ hàng sao 5 sao; thêm dòng tóm tắt `--text-xs`, `--color-muted` "N mục cần cố gắng" chỉ khi N > 0
  (đếm tiêu chí + kỹ năng đang bật ở mức Cần cố gắng). Không thêm badge/chi tiết khác.
- Em chưa có phiếu: "Chưa nhận xét", không sao. Dòng BTVN buổi trước giữ nguyên.
- Nhãn trạng thái phiếu ("Đã gửi"/"Chờ mạng"/"Chưa gửi") giữ nguyên chỗ, không đè tên (rules.md mục 5).

## 4. Màn phụ huynh

- Mỗi phiếu đã gửi: "Hôm nay học: …" (`--text-sm`, `--color-muted`) nếu buổi có chip; rồi 5 dòng tiêu chí
  dạng nhãn + mức (chỉ đọc; dùng `Pill`/chữ, không segmented), kỹ năng đã chấm thêm nếu có, sau cùng đoạn
  nhận xét như hiện tại. Sao vẫn hiện x/5; kỹ năng không ảnh hưởng sao.
- Buổi không có BTVN: không hiện dòng BTVN. Phiếu cũ: chỉ sao + đoạn nhận xét như hiện tại.
- Bố cục `--guardian-max`, mobile 375/390 chừa `--safe-*`; chữ dài xuống dòng, không cắt dấu tiếng Việt.

## 5. Báo cáo tháng

- Thêm hai khối trong báo cáo (chỉ khi snapshot có dữ liệu, đếm trên phiếu ĐÃ GỬI):
  - "Theo tiêu chí": 5 hàng `Tên tiêu chí` + `N 🌟 · N 👍 · N 💪` (số, không phần trăm, không trung bình).
  - "Theo kỹ năng": mỗi kỹ năng có chấm `Nói: 3 🌟 · 2 👍 trong 5 buổi có chấm`.
- Bảng đếm sao hiện có giữ nguyên bên trên. Khối mới dùng `--card-pad`, `--text-sm`, `--color-muted`;
  desktop cùng lưới thẻ hiện có, mobile xếp dọc; không thêm biểu đồ.

## 6. Trạng thái và kích thước kiểm

- Mobile 375 và 390 (safe-area trên/dưới): segmented không tràn, chip xuống nhiều dòng, sheet cuộn được,
  bàn phím mở không che segmented/ô nhận xét (ô nhập `--text-base` để iOS không zoom).
- Desktop 1440: danh sách 400px + khung soạn co giãn (chế độ tiêu chí cũ: panel 380px sticky), hàng tiêu chí
  một dòng, segmented đủ 3 vùng chạm; nút theo nội dung.
- Chữ dài: tên em, tên tiêu chí, nhận xét dài — xuống dòng, không cắt chữ, không đẩy segmented ra ngoài.
- 0 kỹ năng (không có nhóm "Kiến thức hôm nay") và 2 kỹ năng (2 hàng).
- Phiếu cũ đạt/chưa đạt và phiếu thang 3 sao: đọc đúng, không hiện segmented, không đổi số sao.
- Disabled (thiếu quyền / điểm danh chưa xong / phiếu cũ): segmented dùng `--state-disabled-opacity`,
  `aria-disabled`, không đổi giá trị; trạng thái lưu/loading/lỗi giữ `SaveStatus` hiện có.

## 7. Token

- Đã có, dùng nguyên: `--tap`, `--text-xs/sm/md/base/lg/control`, `--weight-semibold/bold`,
  `--space-4/8/12/16/20/24/32`, `--radius-chip/control/card`, `--color-*`, `--state-selected-*`,
  `--state-focus-ring`, `--state-disabled-opacity`, `--comment-star-size`, `--empty-mascot-compact`,
  `--dur-press`, `--page-x`, `--form-max`, `--guardian-max`, `--safe-*`, `--sticky-*`.
- Cần thêm (đã thêm cùng thay đổi này): `--level-row-icon-size: 20px` — icon tiêu chí/kỹ năng trong
  hàng 5 tiêu chí (không dùng cỡ tick 20px/12px của phiếu cũ để tránh lẫn nghĩa).
- Không thêm màu/cỡ chữ mới; icon mức lấy từ bộ icon thiết kế khi có, chưa có thì chỉ dùng nhãn chữ.

## 8. Việc còn mở

- **Icon 3 mức/tiêu chí:** bộ icon thiết kế chưa có icon cho Tốt/Đạt/Cần cố gắng và cho 5 tiêu chí, nên hàng
  tiêu chí hiện chỉ có chữ. Đã chừa token `--level-row-icon-size`; khi có bộ icon chính thức thì gắn vào
  `LevelSegmented`/hàng tiêu chí, không đổi bố cục.
- **Timeline "Nhận xét của cô" (phụ huynh):** mới hiện câu + ghi chú như cũ; danh sách tiêu chí/mức và
  "Hôm nay học" mới có ở màn chi tiết buổi. Cần chốt có thêm bản rút gọn vào thẻ timeline hay không.
