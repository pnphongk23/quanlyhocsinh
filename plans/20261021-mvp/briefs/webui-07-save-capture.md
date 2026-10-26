# webui-07 · Kiểm kê + chụp trạng thái nút lưu (T-shot)

Đọc `plans/20261021-mvp/web/ui-audit/save-states-plan.md`. Worktree mvp-web, cổng 5181, dữ liệu giả (không staging).

## Việc
1. Kiểm kê MỌI hành động lưu/gửi/tạo/phát hành/đổi/xoá-có-xác-nhận của giáo viên (mobile + desktop), phụ huynh, tài khoản, từ mã (`src/features/**`, `src/roles/**`) và UI. Ghi `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/save-actions-inventory.md`: `ID | Team (A/B/C theo ranh giới file trong plan.md) | Màn/route | Hành động (nhãn nút) | File:dòng | Cần mạng? | Hiện trạng: disabled khi chưa sửa? khi không hợp lệ? chặn bấm 2 lần? sau lưu về disabled? cảnh báo rời màn?` (đo bằng trình duyệt, không đoán).
2. Bộ chụp: thêm `--scenario save-states`. Mỗi hành động chụp: (a) vừa mở, chưa sửa; (b) sau khi sửa hợp lệ; (c) không hợp lệ (nếu có ràng buộc); (d) đang lưu — mock API chậm 3 s cho hành động cần mạng, và bấm nhanh 2 lần rồi đếm số request/lệnh ghi; (e) ngay sau lưu thành công; (f) thử rời màn khi đang dở (ảnh hộp thoại hoặc ghi "không có cảnh báo"). 390×844 và 1440×900. Lưu `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/shots/ui-audit/save-states/before/<team>/<viewport>/`.
3. Số request/lệnh ghi khi bấm 2 lần: đếm request mạng và (cho ghi offline) số lệnh outbox bằng đọc IndexedDB/hook test — chỉ đọc, không sửa `src/**`.
Không sửa `src/**`, không commit. Kết thúc bằng khối Status.
