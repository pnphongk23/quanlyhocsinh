# webui-08 · Audit trạng thái nút lưu (dùng chung cho A, B, C)

Prompt ghi `TEAM=<A|B|C>`. Đọc: `plans/20261021-mvp/web/ui-audit/save-states-plan.md` (yêu cầu 1–4), `plan.md` (ranh giới file team), `save-actions-inventory.md`, `fixes-save-T.md` (mẫu chung đã có: useSaveAction, useLeaveGuard, Button loading, ActionFooter hint). Ảnh: `plans/20261021-mvp/web/shots/ui-audit/save-states/before/<TEAM>/**` (chưa đủ cho mọi hành động).

## Việc
Với MỌI hành động lưu/gửi/tạo/phát hành/đổi thuộc ranh giới file team (kể cả hành động inventory sót — tự tìm trong mã `src/features/**`, `src/roles/**` của team), đánh giá bằng mã nguồn (đọc component: `disabled`, handler, có so với dữ liệu gốc không, có guard bấm 2 lần không, sau lưu có reset baseline không, có useBlocker/beforeunload không) và ảnh nếu có:
Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/findings-save-<TEAM>.md`: bảng `ID | Màn/route | Hành động | File:dòng | Cần mạng? | Y1 disabled khi chưa sửa | Y1 disabled khi không hợp lệ | Y2 chặn bấm 2 lần / đang xử lý | Y3 sau lưu về disabled | Y4 cảnh báo rời màn | Y4 không chip "Đã lưu" | Mức | Đề xuất áp mẫu (baseline là gì, validate là gì)`. Ô ghi `Đạt / Thiếu / Không áp dụng` + bằng chứng (dòng mã hoặc ảnh).
Mức: Cao = có thể ghi trùng/gửi 2 lần hoặc mất dữ liệu khi rời màn; Vừa = nút bật khi chưa sửa/không hợp lệ, không về disabled; Thấp = thiếu gợi ý lý do.
Hành động xoá/huỷ có hộp xác nhận: chỉ đánh giá Y2. Đăng nhập/đăng ký: Y1 theo "hợp lệ" (ô trống), không theo "đã sửa".

Chỉ đọc + ghi file findings. Không sửa mã, không commit. Kết thúc: `Status: …` + số mục theo mức.
