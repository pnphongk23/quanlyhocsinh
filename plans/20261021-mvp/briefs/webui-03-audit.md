# webui-03 · Audit theo ảnh (dùng chung cho team T, A, B, C)

Lead: Domain Lead Web UI audit. Prompt khởi tạo sẽ ghi rõ `TEAM=<T|A|B|C>`.

## Đọc
- `plans/20261021-mvp/web/ui-audit/plan.md` (phạm vi team, chẩn đoán đã có), `inventory.md` (mục team bạn + "Đo chồng lấn").
- Quy tắc: `/Users/phamnhuphong/Git/quanlyhocsinh/design/ux-v2/rules.md`, `changes.md`, `guardian-ia.md` (team C).
- Token: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/design/tokens/tokens.css`.
- Skill `design-ui-ux` (mục Audit + `references/interface-review.md`) và `app-design`.
- Ảnh: `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/before/<TEAM>/**`. Đọc TỪNG ảnh (Read tool hiển thị ảnh). Có thể so với prototype đã duyệt ở `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype-shots/` nếu cùng màn.

## Việc
Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/findings-<TEAM>.md`:
- Bảng: `ID | Màn (route) | Viewport | Ảnh | Vị trí | Vấn đề | Mức (Cao/Vừa/Thấp) | Đề xuất | Token liên quan`. ID dạng `<TEAM>-01`.
- Mức: **Cao** = che/đè nội dung hoặc nút, không bấm được, chữ bị cắt mất thông tin, lệch spec/quy tắc rõ ràng, vùng bấm < 44px mobile ở hành động chính; **Vừa** = lề/khoảng cách không theo token, lệch thẳng hàng giữa header/tab/thẻ, nút kéo dài trên desktop, phân cấp sai, thiếu trạng thái; **Thấp** = polish.
- Kiểm tối thiểu: FAB/tab dưới/safe-area che nội dung; lề ngang thống nhất `--page-x` (header, tab, thẻ cùng mép); khoảng cách theo thang 4/8; vùng bấm; tràn chữ/cắt chữ (tên dài tiếng Việt); nút desktop; nhất quán component (Card, Button, Pill, Sheet); trạng thái trống/lỗi; contrast nhìn thấy rõ.
- Mục cuối "Chuyển team khác": phát hiện nằm ngoài ranh giới file của team bạn (xem bảng ranh giới trong plan) — ghi team nhận.
- Mục "Không chắc": điều không kết luận được từ ảnh.

## Ràng buộc
- CHỈ đọc ảnh/tài liệu/mã và ghi file findings. KHÔNG sửa mã, không chạy dev server, không commit.
- Không chép SĐT thật vào báo cáo (ảnh dùng dữ liệu giả).
- Mỗi phát hiện phải trỏ đúng file ảnh; không đoán màn không có ảnh.

Kết thúc bằng:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: số phát hiện Cao/Vừa/Thấp
Concerns/Blockers: tuỳ chọn
```
