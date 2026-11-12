# Đề xuất sửa playbook (từ bài học QL-004)

TL không được sửa `~/.claude/paseo-ops/*.md` (role-guard chặn). Nhờ PM/chủ áp nguyên văn.
Trạng thái: đã áp vào `tech-lead.md` và `dev.md` ngày 2026-11-12 (CEO).

## `tech-lead.md` › Kiểm chứng

Thay gạch đầu dòng "Thay đổi UI" bằng:

```
- **Thay đổi UI**: chụp ảnh màn hình thật (simulator/trình duyệt) cho từng trạng thái bị đổi, so với design/spec/feedback của chủ, tự soi lỗi layout (lệch, tràn, hở, chữ cắt, sai token). Lưu ảnh ở nơi project quy định (project cấm commit ảnh thì để ngoài repo, ví dụ qlh: `/tmp/qlh-evidence/<goal>/`), dẫn đường vào handback. Không có ảnh thì chưa DONE.
- **Ảnh và gate hình học XANH không chứng minh hành vi.** Khi chuyển khung/refactor màn (không chỉ đổi style), brief phải có danh sách hành vi hiện có cần giữ, và Dev phải thao tác thật từng cái trên trình duyệt + có test:
  lưu lỗi (không rời màn, nháp còn) · nháp chưa lưu qua đổi khổ/điều hướng · tải lại (kéo, nút) · đang tải / lỗi / offline / không có dữ liệu là 4 trạng thái khác nhau · dialog/sheet: focus vào, giữ focus, Escape, trả focus · menu/popover trong vùng cuộn không bị cắt · bàn phím.
  TL nghiệm thu bằng cách tự tái hiện vài kịch bản này, không chỉ đọc số gate. (QL-004: G1/G2 xanh 45/45 nhưng reviewer vẫn bắt 6 lỗi MAJOR đều thuộc nhóm trên.)
- Goal có "màn mẫu" để nhân rộng: cho Reviewer độc lập soi màn mẫu (cả hành vi) TRƯỚC khi giao các màn còn lại, để lỗi không bị nhân bản.
- Mỗi lỗi reviewer/TL bắt được mà gate sót: thêm phép đo hoặc test vào gate (chỉ làm chặt, kèm kiểm ngược đỏ đúng) trong cùng goal.
```

Lý do sửa cả câu lưu ảnh: bản cũ bảo lưu vào `plans/<goal>/shots/`, trái quy định qlh (ảnh QA không commit).

## `dev.md` › Kiểm chứng

Thêm sau gạch "Đổi UI":

```
- **Chuyển khung / refactor màn**: trước khi sửa, liệt kê hành vi hiện có của màn (lưu + lưu lỗi, nháp chưa lưu, tải lại, đang tải/lỗi/offline/không có, focus + Escape của dialog/sheet, menu trong vùng cuộn, bàn phím). Sau khi sửa, thao tác thật từng cái trên trình duyệt và có test; ghi kết quả từng mục vào handback. Ảnh đẹp + gate xanh chưa đủ.
```
