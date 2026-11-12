# Mock responsive QL-004 (Pha 1)

Ảnh mẫu để chủ duyệt bố cục 3 mốc trước khi code màn thật. **Chỉ 2 luồng**: Cài đặt (gồm Bộ tiêu chí nhận xét) và Điểm danh. Không phải app thật, không gọi API.

- `index.html`: mock tĩnh, mỗi màn một `?screen=` — `settings`, `password`, `email`, `criteria`, `criteria-editing`, `criteria-empty`, `criteria-long`, `attendance`, `attendance-long`, `attendance-done`.
- `mock.css`: chỉ dùng biến trong `../tokens/tokens.css` (link trực tiếp, không chép giá trị). Chỉ số px được phép: `1px` viền và mốc khổ trong `@media` (640/1024).
- `capture.mjs`: chụp mỗi màn × 390×844, 834×1112, 1440×900 vào `/tmp/qlh-evidence/ql-004/mock` (đặt `QLH_EVIDENCE_DIR` để đổi gốc), đo tràn ngang, lệch lề trái, vùng bấm, cỡ chữ ô nhập, chữ bị cắt, khung điều hướng.
- `tokens-check.mjs`: so `design/tokens/tokens.css` với `tokens.json` (mobile + tablet + desktop).
- `compare.py`: ghép 3 khổ của một màn (390 | 834 | 1440, cách 40px, nền xám, cao ≤1400, JPEG q80) vào `compare/<màn>.jpg` để soi cạnh nhau.

```bash
node design/responsive-mock/capture.mjs        # 30 ảnh + số đo, exit 0 = đạt
node design/responsive-mock/tokens-check.mjs   # tokens.css == tokens.json
python3 design/responsive-mock/compare.py      # ảnh so sánh 3 khổ cho 3 màn điểm danh
```

Mở nhanh trong trình duyệt: `design/responsive-mock/index.html?screen=criteria` (mốc đổi theo bề rộng cửa sổ). Ảnh không commit.
